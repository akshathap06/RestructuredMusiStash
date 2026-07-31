import { supabase } from '../../../lib/supabase';

export type CampaignType = 'album' | 'show' | 'tour' | 'project';
export type CampaignStatus = 'draft' | 'pending_review' | 'needs_changes' | 'approved' | 'live' | 'funded' | 'closed' | 'cancelled';
export type PaymentMethod = 'apple_pay' | 'card' | 'bank_transfer';

export interface FundingCampaign {
  id: string;
  artist_id: string;
  campaign_type: CampaignType;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  funding_goal: number;
  min_investment: number;
  share_price: number;
  total_shares: number;
  revenue_share_rate: number;
  revenue_sources: string[];
  status: CampaignStatus;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  deadline_days: number;
  shares_sold: number;
  amount_raised: number;
  investor_count: number;
  created_at: string;
  campaign_contracts?: any[];
}

export interface InvestorProfile {
  id: string;
  user_id: string;
  kyc_status: string;
  accredited_investor: boolean;
  annual_income: number | null;
  net_worth: number | null;
  investment_limit_remaining: number | null;
}

export interface SharePurchase {
  id: string;
  investor_id: string;
  campaign_id: string;
  shares_purchased: number;
  price_per_share: number;
  total_amount: number;
  payment_status: string;
  payment_method: PaymentMethod;
  purchased_at: string;
  resale_eligible_date: string;
  funding_campaigns?: FundingCampaign;
}

export interface RevenueDistribution {
  id: string;
  campaign_id: string;
  period_start: string;
  period_end: string;
  investor_share_amount: number;
  distribution_status: string;
  funding_campaigns?: { title: string };
}

class MobileCampaignService {
  async isInvestmentEnabled(): Promise<boolean> {
    const { data } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('flag_name', 'beta_investment_enabled')
      .maybeSingle();
    return data?.enabled ?? false;
  }

  async listLiveCampaigns(type?: CampaignType): Promise<FundingCampaign[]> {
    let query = supabase
      .from('funding_campaigns')
      .select('*, campaign_contracts(*)')
      .eq('status', 'live');

    if (type) query = query.eq('campaign_type', type);

    const { data } = await query.order('created_at', { ascending: false }).limit(50);
    return (data ?? []) as FundingCampaign[];
  }

  async getCampaign(id: string): Promise<FundingCampaign | null> {
    const { data } = await supabase
      .from('funding_campaigns')
      .select('*, campaign_contracts(*)')
      .eq('id', id)
      .single();
    return data as FundingCampaign | null;
  }

  async getOrCreateInvestorProfile(userId: string): Promise<InvestorProfile> {
    const { data } = await supabase
      .from('investor_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) return data as InvestorProfile;

    const { data: newP } = await supabase
      .from('investor_profiles')
      .insert({ user_id: userId })
      .select()
      .single();

    return newP as InvestorProfile;
  }

  async updateInvestorProfile(userId: string, updates: Partial<InvestorProfile>) {
    const { data } = await supabase
      .from('investor_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    return data as InvestorProfile;
  }

  async purchaseShares(
    campaignId: string,
    investorId: string,
    shares: number,
    paymentMethod: PaymentMethod,
  ) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'live') throw new Error('Campaign not accepting investments');

    const available = campaign.total_shares - campaign.shares_sold;
    if (shares > available) throw new Error(`Only ${available} shares available`);

    const total = campaign.share_price * shares;

    const { data: purchase, error } = await supabase
      .from('share_purchases')
      .insert({
        investor_id: investorId,
        campaign_id: campaignId,
        shares_purchased: shares,
        price_per_share: campaign.share_price,
        total_amount: total,
        payment_status: 'escrow',
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('funding_campaigns').update({
      shares_sold: campaign.shares_sold + shares,
      amount_raised: campaign.amount_raised + total,
      investor_count: campaign.investor_count + 1,
      ...(campaign.amount_raised + total >= campaign.funding_goal ? { status: 'funded' } : {}),
    }).eq('id', campaignId);

    return purchase;
  }

  async getPortfolio(userId: string) {
    const profile = await this.getOrCreateInvestorProfile(userId);

    const { data: purchases } = await supabase
      .from('share_purchases')
      .select('*, funding_campaigns(title, campaign_type, status, share_price, revenue_share_rate)')
      .eq('investor_id', profile.id)
      .order('purchased_at', { ascending: false });

    const { data: distributions } = await supabase
      .from('revenue_distributions')
      .select('*, funding_campaigns(title)')
      .eq('investor_id', profile.id)
      .order('period_end', { ascending: false });

    const pList = (purchases ?? []) as SharePurchase[];
    const dList = (distributions ?? []) as RevenueDistribution[];

    return {
      investor: profile,
      purchases: pList,
      distributions: dList,
      summary: {
        total_invested: pList.reduce((s, p) => s + p.total_amount, 0),
        total_earned: dList.filter(d => d.distribution_status === 'paid').reduce((s, d) => s + d.investor_share_amount, 0),
        active_campaigns: new Set(pList.filter(p => ['live', 'funded'].includes(p.funding_campaigns?.status ?? '')).map(p => p.campaign_id)).size,
        total_shares: pList.reduce((s, p) => s + p.shares_purchased, 0),
      },
    };
  }
}

export const mobileCampaignService = new MobileCampaignService();

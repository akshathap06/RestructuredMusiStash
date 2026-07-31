import { supabase } from '../../../lib/supabase';

export interface PaymentDistributionDetails {
  success: boolean;
  payment_id?: string;
  submission_id?: string;
  amount_paid?: number;
  provider_amount?: number;
  platform_fee?: number;
  stripe_fee?: number;
  provider_stripe_account?: string;
  provider_name?: string;
  provider_email?: string;
  business_name?: string;
  stripe_transfer_id?: string;
  transfer_status?: string;
  payment_status?: string;
  created_at?: string;
  error?: string;
}

export interface PaymentHistory {
  success: boolean;
  payments?: any[];
  total_count?: number;
  limit?: number;
  offset?: number;
  error?: string;
}

export interface RealPaymentResult {
  success: boolean;
  message?: string;
  payment_id?: string;
  submission_id?: string;
  amount_paid?: number;
  provider_amount?: number;
  platform_fee?: number;
  stripe_fee?: number;
  provider_stripe_account?: string;
  provider_name?: string;
  client_name?: string;
  processed_at?: string;
  error?: string;
}

class RealPaymentService {
  /**
   * Process a real payment and distribute funds
   */
  async processRealPayment(
    submissionId: string,
    paymentIntentId: string,
    amountPaid: number,
    stripeFee: number,
    platformFee: number,
    providerAmount: number
  ): Promise<RealPaymentResult> {
    try {
      const { data, error } = await supabase
        .rpc('process_real_payment', {
          submission_id: submissionId,
          payment_intent_id: paymentIntentId,
          amount_paid: amountPaid,
          stripe_fee: stripeFee,
          platform_fee: platformFee,
          provider_amount: providerAmount
        });

      if (error) {
        console.error('Error processing real payment:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as RealPaymentResult;
    } catch (error) {
      console.error('Error in processRealPayment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update provider earnings with Stripe transfer details
   */
  async updateProviderEarnings(
    paymentId: string,
    stripeTransferId: string,
    transferStatus: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('update_provider_earnings', {
          payment_id: paymentId,
          stripe_transfer_id: stripeTransferId,
          transfer_status: transferStatus
        });

      if (error) {
        console.error('Error updating provider earnings:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as { success: boolean; message?: string; error?: string };
    } catch (error) {
      console.error('Error in updateProviderEarnings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get payment distribution details for fund transfer
   */
  async getPaymentDistributionDetails(submissionId: string): Promise<PaymentDistributionDetails> {
    try {
      const { data, error } = await supabase
        .rpc('get_payment_distribution_details', {
          submission_id: submissionId
        });

      if (error) {
        console.error('Error getting payment distribution details:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as PaymentDistributionDetails;
    } catch (error) {
      console.error('Error in getPaymentDistributionDetails:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get provider's payment history
   */
  async getProviderPaymentHistory(
    providerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaymentHistory> {
    try {
      const { data, error } = await supabase
        .rpc('get_provider_payment_history', {
          provider_id: providerId,
          limit_count: limit,
          offset_count: offset
        });

      if (error) {
        console.error('Error getting provider payment history:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as PaymentHistory;
    } catch (error) {
      console.error('Error in getProviderPaymentHistory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate payment distribution
   */
  calculatePaymentDistribution(amount: number): {
    stripeFee: number;
    platformFee: number;
    providerAmount: number;
  } {
    // Stripe fee: 2.9% + $0.30 per transaction
    const stripeFee = (amount * 0.029) + 0.30;
    
    // Platform fee: 5% of the amount
    const platformFee = amount * 0.05;
    
    // Provider gets the remaining amount
    const providerAmount = amount - stripeFee - platformFee;
    
    return {
      stripeFee: Math.round(stripeFee * 100) / 100, // Round to 2 decimal places
      platformFee: Math.round(platformFee * 100) / 100,
      providerAmount: Math.round(providerAmount * 100) / 100
    };
  }

  /**
   * Create Stripe transfer to provider
   */
  async createStripeTransfer(
    amount: number,
    stripeAccountId: string,
    paymentId: string
  ): Promise<{ success: boolean; transferId?: string; error?: string }> {
    try {
      // Call Supabase Edge Function to create Stripe transfer
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dwbetxanfumneukrqodd.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/create-stripe-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          stripe_account_id: stripeAccountId,
          payment_id: paymentId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update provider earnings with transfer details
        await this.updateProviderEarnings(
          paymentId,
          result.transfer_id,
          'completed'
        );
        
        return {
          success: true,
          transferId: result.transfer_id
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to create Stripe transfer'
        };
      }
    } catch (error) {
      console.error('Error creating Stripe transfer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get provider's total earnings
   */
  async getProviderTotalEarnings(providerId: string): Promise<{
    success: boolean;
    total_earnings?: number;
    total_transfers?: number;
    pending_amount?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('provider_earnings')
        .select('amount, transfer_status')
        .eq('provider_id', providerId);

      if (error) {
        console.error('Error getting provider total earnings:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const totalEarnings = data
        ?.filter(earning => earning.transfer_status === 'completed')
        ?.reduce((sum, earning) => sum + (earning.amount || 0), 0) || 0;

      const totalTransfers = data?.length || 0;

      const pendingAmount = data
        ?.filter(earning => earning.transfer_status === 'pending')
        ?.reduce((sum, earning) => sum + (earning.amount || 0), 0) || 0;

      return {
        success: true,
        total_earnings: Math.round(totalEarnings * 100) / 100,
        total_transfers: totalTransfers,
        pending_amount: Math.round(pendingAmount * 100) / 100
      };
    } catch (error) {
      console.error('Error in getProviderTotalEarnings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const realPaymentService = new RealPaymentService();
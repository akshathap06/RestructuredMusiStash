import { supabase } from '../../../lib/supabase';

export interface SimplePaymentResult {
  success: boolean;
  message?: string;
  payment_id?: string;
  submission_id?: string;
  amount_paid?: number;
  provider_amount?: number;
  platform_fee?: number;
  stripe_fee?: number;
  provider_name?: string;
  client_name?: string;
  processed_at?: string;
  error?: string;
}

export interface PendingPayouts {
  success: boolean;
  pending_payouts?: any[];
  total_pending?: number;
  payout_count?: number;
  error?: string;
}

export interface PayoutRequest {
  success: boolean;
  message?: string;
  payout_id?: string;
  total_amount?: number;
  payout_count?: number;
  payout_method?: string;
  estimated_delivery?: string;
  error?: string;
}

class SimplePaymentService {
  /**
   * Process a simple payment (no Stripe Connect required)
   */
  async processSimplePayment(
    submissionId: string,
    paymentIntentId: string,
    amountPaid: number,
    clientId: string,
    providerId: string
  ): Promise<SimplePaymentResult> {
    try {
      const { data, error } = await supabase
        .rpc('process_simple_payment', {
          submission_id: submissionId,
          payment_intent_id: paymentIntentId,
          amount_paid: amountPaid,
          client_id: clientId,
          provider_id: providerId
        });

      if (error) {
        console.error('Error processing simple payment:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as SimplePaymentResult;
    } catch (error) {
      console.error('Error in processSimplePayment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get provider's pending payouts
   */
  async getProviderPendingPayouts(providerId: string): Promise<PendingPayouts> {
    try {
      const { data, error } = await supabase
        .rpc('get_provider_pending_payouts', {
          provider_id: providerId
        });

      if (error) {
        console.error('Error getting pending payouts:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as PendingPayouts;
    } catch (error) {
      console.error('Error in getProviderPendingPayouts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Request payout (simplified - no Stripe Connect)
   */
  async requestPayout(
    providerId: string,
    payoutMethod: string = 'bank_transfer'
  ): Promise<PayoutRequest> {
    try {
      const { data, error } = await supabase
        .rpc('request_payout', {
          provider_id: providerId,
          payout_method: payoutMethod
        });

      if (error) {
        console.error('Error requesting payout:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as PayoutRequest;
    } catch (error) {
      console.error('Error in requestPayout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate payment distribution (simplified)
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
      stripeFee: Math.round(stripeFee * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      providerAmount: Math.round(providerAmount * 100) / 100
    };
  }

  /**
   * Get provider's total earnings (simplified)
   */
  async getProviderTotalEarnings(providerId: string): Promise<{
    success: boolean;
    total_earnings?: number;
    pending_payouts?: number;
    total_payments?: number;
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
        ?.filter(earning => earning.transfer_status === 'payout_requested' || earning.transfer_status === 'completed')
        ?.reduce((sum, earning) => sum + (earning.amount || 0), 0) || 0;

      const pendingPayouts = data
        ?.filter(earning => earning.transfer_status === 'pending_payout')
        ?.reduce((sum, earning) => sum + (earning.amount || 0), 0) || 0;

      const totalPayments = data?.length || 0;

      return {
        success: true,
        total_earnings: Math.round(totalEarnings * 100) / 100,
        pending_payouts: Math.round(pendingPayouts * 100) / 100,
        total_payments: totalPayments
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

export const simplePaymentService = new SimplePaymentService();

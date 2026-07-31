import { supabase } from '../../../lib/supabase';

export interface StripeConnectAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  country: string;
  default_currency: string;
  business_profile?: {
    name?: string;
    url?: string;
    support_email?: string;
  };
}

export interface OnboardingResult {
  success: boolean;
  accountId?: string;
  onboardingUrl?: string;
  error?: string;
}

export interface AccountStatus {
  accountId: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

class StripeConnectService {
  /**
   * Create a Stripe Connect Express account for a service provider
   */
  async createConnectAccount(
    providerId: string,
    email: string,
    businessName: string,
    country: string = 'US'
  ): Promise<OnboardingResult> {
    try {
      // Validate inputs
      if (!providerId || !email || !businessName) {
        return {
          success: false,
          error: 'Missing required parameters: providerId, email, or businessName'
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      console.log(`[StripeConnect] Creating account for provider: ${providerId}`);
      
      // Call Supabase Edge Function to create Stripe Connect account
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          provider_id: providerId,
          email: email,
          business_name: businessName,
          country: country
        }
      });

      // Handle edge function errors
      if (error) {
        console.error('[StripeConnect] Edge function error:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to create Stripe Connect account';
        
        if (error.message?.includes('FunctionsHttpError')) {
          errorMessage = 'Stripe Connect service is currently unavailable. Please ensure:\n' +
            '1. Edge functions are deployed\n' +
            '2. STRIPE_SECRET_KEY is configured in Supabase\n' +
            '3. You have internet connectivity\n\n' +
            'Contact support if the issue persists.';
        } else if (error.message?.includes('not found')) {
          errorMessage = 'Stripe Connect service not found. Please contact support.';
        } else {
          errorMessage = error.message || errorMessage;
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      // Handle successful response
      if (data?.success) {
        console.log(`[StripeConnect] Account created: ${data.account_id}`);
        
        // Update service provider with Stripe account details
        const updateResult = await this.updateProviderStripeInfo(providerId, {
          stripe_account_id: data.account_id,
          stripe_onboarding_url: data.onboarding_url,
          stripe_account_status: 'pending'
        });

        if (!updateResult.success) {
          console.warn('[StripeConnect] Failed to update provider info in database:', updateResult.error);
          // Don't fail the whole operation, just log the warning
        }

        return {
          success: true,
          accountId: data.account_id,
          onboardingUrl: data.onboarding_url
        };
      } else {
        // Handle failure response from edge function
        const errorMsg = data?.error || 'Failed to create Connect account';
        console.error('[StripeConnect] Account creation failed:', errorMsg);
        
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      console.error('[StripeConnect] Unexpected error in createConnectAccount:', error);
      
      // Provide helpful error message
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for network errors
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get the onboarding URL for an existing Connect account
   */
  async getOnboardingUrl(accountId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('get-onboarding-url', {
        body: { account_id: accountId }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, url: data.url };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check the status of a Connect account
   */
  async checkAccountStatus(accountId: string): Promise<{ success: boolean; status?: AccountStatus; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status', {
        body: { account_id: accountId }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, status: data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update service provider's Stripe information in database
   */
  async updateProviderStripeInfo(
    providerId: string,
    updates: {
      stripe_account_id?: string;
      stripe_onboarding_complete?: boolean;
      stripe_charges_enabled?: boolean;
      stripe_payouts_enabled?: boolean;
      stripe_onboarding_url?: string;
      stripe_account_status?: string;
      can_accept_payments?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId);

      if (error) {
        console.error('Error updating provider Stripe info:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateProviderStripeInfo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service provider's Stripe account information
   */
  async getProviderStripeInfo(providerId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          stripe_account_id,
          stripe_onboarding_complete,
          stripe_charges_enabled,
          stripe_payouts_enabled,
          stripe_onboarding_url,
          stripe_account_status,
          can_accept_payments
        `)
        .eq('id', providerId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle webhook updates from Stripe Connect
   */
  async handleConnectWebhook(
    accountId: string,
    eventType: string,
    eventData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let updates: any = {};

      switch (eventType) {
        case 'account.updated':
          updates = {
            stripe_charges_enabled: eventData.charges_enabled,
            stripe_payouts_enabled: eventData.payouts_enabled,
            stripe_onboarding_complete: eventData.details_submitted,
            can_accept_payments: eventData.charges_enabled && eventData.payouts_enabled,
            stripe_account_status: eventData.charges_enabled && eventData.payouts_enabled 
              ? 'complete' 
              : eventData.details_submitted 
                ? 'restricted' 
                : 'pending'
          };
          break;

        case 'account.application.deauthorized':
          updates = {
            stripe_account_id: null,
            stripe_onboarding_complete: false,
            stripe_charges_enabled: false,
            stripe_payouts_enabled: false,
            stripe_account_status: 'not_started',
            can_accept_payments: false
          };
          break;

        default:
          console.log(`Unhandled webhook event: ${eventType}`);
          return { success: true };
      }

      // Update the service provider record
      const { error } = await supabase
        .from('service_providers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', accountId);

      if (error) {
        console.error('Error updating provider from webhook:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling Connect webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if service provider can accept payments
   */
  async canProviderAcceptPayments(providerId: string): Promise<{
    canAccept: boolean;
    reason?: string;
    onboardingUrl?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          stripe_account_id,
          stripe_onboarding_complete,
          stripe_charges_enabled,
          stripe_payouts_enabled,
          stripe_onboarding_url,
          can_accept_payments
        `)
        .eq('id', providerId)
        .single();

      if (error || !data) {
        return {
          canAccept: false,
          reason: 'Service provider not found'
        };
      }

      if (!data.stripe_account_id) {
        return {
          canAccept: false,
          reason: 'Stripe account not created. Please complete payment setup.'
        };
      }

      if (!data.can_accept_payments) {
        return {
          canAccept: false,
          reason: 'Payment setup incomplete. Please complete Stripe onboarding.',
          onboardingUrl: data.stripe_onboarding_url
        };
      }

      return { canAccept: true };
    } catch (error) {
      return {
        canAccept: false,
        reason: 'Error checking payment eligibility'
      };
    }
  }
}

export const stripeConnectService = new StripeConnectService();

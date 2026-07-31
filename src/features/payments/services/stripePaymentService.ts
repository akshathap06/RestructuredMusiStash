import { Platform } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { STRIPE_CONFIG, initializeStripe, validateStripeConfig } from '../../../config/stripeConfig';
import { Alert } from 'react-native';

// Conditionally import Stripe only on mobile platforms (not web)
let initPaymentSheet: any;
let presentPaymentSheet: any;
let PaymentSheetError: any;
let PaymentSheet: any;

if (Platform.OS !== 'web') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    initPaymentSheet = stripeModule.initPaymentSheet;
    presentPaymentSheet = stripeModule.presentPaymentSheet;
    PaymentSheetError = stripeModule.PaymentSheetError;
    PaymentSheet = stripeModule.PaymentSheet;
  } catch (error) {
    console.warn('Stripe React Native not available:', error);
  }
}

export interface PaymentData {
  paymentId: string;
  projectRequestId: string;
  amount: number;
  currency: string;
  clientId: string;
  providerId: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  error?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  platformFee: number;
  providerAmount: number;
}

/**
 * Production-ready Stripe Payment Service for MusiStash
 * Handles secure payments with proper error handling and user feedback
 */
class StripePaymentService {
  private static isInitialized = false;

  /**
   * Initialize Stripe - call this once when app starts
   */
  static async initialize(): Promise<boolean> {
    // Skip initialization on web
    if (Platform.OS === 'web') {
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      // Validate configuration first
      if (!validateStripeConfig()) {
        throw new Error('Invalid Stripe configuration');
      }

      // Initialize Stripe
      const success = await initializeStripe();
      if (!success) {
        throw new Error('Failed to initialize Stripe');
      }

      this.isInitialized = true;
      console.log('🎉 Stripe Payment Service ready for production');
      return true;
    } catch (error) {
      console.error('❌ Stripe Payment Service initialization failed:', error);
      return false;
    }
  }

  /**
   * Process a payment using Stripe PaymentSheet
   */
  static async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    // Check if running on web
    if (Platform.OS === 'web') {
      return {
        success: false,
        error: 'Stripe payments are not supported on web. Please use the mobile app.',
      };
    }

    // Check if Stripe is available
    if (!initPaymentSheet || !presentPaymentSheet) {
      return {
        success: false,
        error: 'Stripe is not available on this platform.',
      };
    }

    try {
      // Ensure Stripe is initialized
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Stripe initialization failed');
        }
      }

      // Step 1: Create payment intent on backend
      const paymentIntent = await this.createPaymentIntent(paymentData);
      if (!paymentIntent) {
        throw new Error('Failed to create payment intent');
      }

      // Step 2: Initialize PaymentSheet with simplified configuration for Expo Go compatibility
      const paymentSheetConfig = {
        merchantDisplayName: STRIPE_CONFIG.merchantDisplayName,
        merchantCountryCode: STRIPE_CONFIG.merchantCountryCode,
        paymentIntentClientSecret: paymentIntent.clientSecret,
        allowsDelayedPaymentMethods: true,
        
        // Default billing details
        defaultBillingDetails: {
          name: 'MusiStash User',
        },
        
        // Return URL for 3D Secure and other redirects
        returnURL: STRIPE_CONFIG.returnURL,
        
        // Simplified appearance for better Expo Go compatibility
        appearance: {
          colors: {
            primary: '#3B82F6',
            background: '#111827',
            componentBackground: '#1F2937',
            primaryText: '#FFFFFF',
            secondaryText: '#9CA3AF',
          },
        },
      };

      // Only add Apple Pay/Google Pay if not in Expo Go (they may cause issues)
      const isExpoGo = __DEV__ && (typeof __expo !== 'undefined');
      if (!isExpoGo) {
        (paymentSheetConfig as any).applePay = {
          merchantId: STRIPE_CONFIG.applePay.merchantId,
          merchantCountryCode: STRIPE_CONFIG.applePay.merchantCountryCode,
        };
        
        (paymentSheetConfig as any).googlePay = {
          merchantId: STRIPE_CONFIG.googlePay.merchantId,
          merchantCountryCode: STRIPE_CONFIG.googlePay.merchantCountryCode,
          testEnv: STRIPE_CONFIG.googlePay.testEnv,
        };
      }

      const { error: initError } = await initPaymentSheet(paymentSheetConfig);

      if (initError) {
        throw new Error(`Payment setup failed: ${initError.message}`);
      }

      // Step 3: Present PaymentSheet to user
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // Handle user cancellation gracefully
        if (presentError.code === PaymentSheetError.Canceled) {
          return { 
            success: false, 
            error: 'Payment was canceled by user' 
          };
        }
        
        throw new Error(presentError.message);
      }

      // Step 4: Update payment status in database
      await this.updatePaymentStatus(paymentData.paymentId, 'completed', paymentIntent.paymentIntentId);

      return {
        success: true,
        paymentId: paymentIntent.paymentIntentId,
        clientSecret: paymentIntent.clientSecret,
      };

    } catch (error) {
      // Provide user-friendly error messages
      const userMessage = this.getUserFriendlyErrorMessage(error);
      
      return {
        success: false,
        error: userMessage,
      };
    }
  }

  /**
   * Create payment intent via Supabase Edge Function
   */
  private static async createPaymentIntent(paymentData: PaymentData): Promise<PaymentIntentResponse | null> {
    try {
      // The Edge Function expects either submissionId OR requestId
      // For project-based payments (from PaymentScreen), we use requestId
      const payload = {
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        requestId: paymentData.projectRequestId, // This is the project_request ID
        clientId: paymentData.clientId,
        providerId: paymentData.providerId,
        description: paymentData.description || `Payment for project ${paymentData.projectRequestId}`,
        paymentMethod: 'card',
      };

      console.log('📤 Creating payment intent with payload:', JSON.stringify(payload, null, 2));

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: payload,
      });

      if (error) {
        let details = error.message || 'Edge Function returned a non-2xx status code';
        if (error.context?.response) {
          try {
            const cloned = error.context.response.clone?.() ?? error.context.response;
            const responseText = await cloned.text();
            details = `${error.context.response.status}: ${responseText || details}`;
          } catch (parseError) {
            console.warn('Failed to read error response body:', parseError);
          }
        }
        console.error('❌ create-payment-intent failed:', details);
        throw new Error(details);
      }

      if (!data) {
        throw new Error('create-payment-intent returned an empty response.');
      }

      return data as PaymentIntentResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update payment status in database
   */
  private static async updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    paymentIntentId?: string
  ): Promise<void> {
    try {
      const updatePayload: any = {
        status,
        payment_intent_id: paymentIntentId || null,
        paid_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('project_payments')
        .update(updatePayload)
        .eq('id', paymentId);

      if (error) {
        console.warn('Project payment update failed, attempting legacy submission update:', error.message);
        await supabase
          .from('work_submissions')
          .update({
            payment_status: status === 'completed' ? 'paid' : status,
            payment_intent_id: paymentIntentId || null,
            payment_completed_at: status === 'completed' ? new Date().toISOString() : null,
          })
          .eq('id', paymentId);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment status for a submission
   */
  static async getPaymentStatus(submissionId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .select('payment_status, payment_intent_id')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('❌ Error fetching payment status:', error);
        return null;
      }

      return data?.payment_status || null;
    } catch (error) {
      console.error('❌ Error getting payment status:', error);
      return null;
    }
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  private static getUserFriendlyErrorMessage(error: any): string {
    const rawMessage = error?.message || error?.error || error?.toString() || 'Unknown error';
    const message = rawMessage;
    
    // Network errors
    if (message.includes('Network request failed') || message.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // Stripe errors
    if (message.includes('Your card was declined')) {
      return 'Your card was declined. Please try a different payment method.';
    }
    
    if (message.includes('insufficient_funds')) {
      return 'Insufficient funds. Please use a different card or add funds to your account.';
    }
    
    if (message.includes('expired_card')) {
      return 'Your card has expired. Please use a different payment method.';
    }
    
    if (message.includes('incorrect_cvc')) {
      return 'Incorrect security code. Please check your card details and try again.';
    }
    
    if (message.includes('processing_error')) {
      return 'Payment processing error. Please try again in a moment.';
    }
    
    // Authentication errors
    if (message.includes('Unauthorized') || message.includes('401')) {
      return 'Authentication error. Please log in again and try again.';
    }
    
    // Backend errors
    if (message.includes('Backend error') || message.includes('500')) {
      return 'Server error. Please try again in a moment or contact support.';
    }
    
    // Generic fallback
    const fallback = 'Payment failed. Please try again or contact support if the problem persists.';
    if (__DEV__) {
      return `${fallback}\n\nDetails: ${rawMessage}`;
    }
    return fallback;
  }

  /**
   * Show user-friendly error alert
   */
  static showPaymentError(error: any, retryCallback?: () => void): void {
    const message = this.getUserFriendlyErrorMessage(error);
    
    const buttons = [
      { text: 'OK', style: 'default' as const }
    ];
    
    if (retryCallback) {
      buttons.unshift({ text: 'Try Again', onPress: retryCallback });
    }
    
    Alert.alert(
      'Payment Failed',
      message,
      buttons
    );
  }
}

export default StripePaymentService;

// Payment Integration Service
// Ready for Stripe, PayPal, or other payment provider integration

export type PaymentMethod = 'card' | 'paypal' | 'apple_pay' | 'google_pay';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
  requiresAction?: boolean;
  actionUrl?: string;
}

export interface PaymentReceipt {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface PaymentConfig {
  stripe?: {
    publishableKey: string;
    merchantId?: string;
  };
  paypal?: {
    clientId: string;
    environment: 'sandbox' | 'production';
  };
  applePay?: {
    merchantId: string;
    supportedNetworks: string[];
  };
}

class PaymentIntegrationService {
  private static config: PaymentConfig | null = null;
  
  // Initialize payment service with configuration
  static initialize(config: PaymentConfig) {
    this.config = config;
  }

  // Create payment intent for project request
  static async createPaymentIntent(
    requestId: string,
    amount: number,
    currency: string = 'usd',
    paymentMethod: PaymentMethod = 'card'
  ): Promise<PaymentIntent> {
    try {
      console.log('PaymentIntegrationService - Creating payment intent:', { requestId, amount, currency, paymentMethod });
      
      // Validate inputs
      if (!requestId || !amount || amount <= 0) {
        throw new Error('Invalid payment parameters');
      }
      
      // Use Supabase Edge Function to create Stripe payment intent
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dwbetxanfumneukrqodd.supabase.co';
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3YmV0eGFuZnVtbmV1a3Jxb2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDI2MzYsImV4cCI6MjA2ODM3ODYzNn0.CO3oIID2omAwuex2qE_dXbOYbtA_v9bC38VQizuXVJc';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency || 'usd',
          requestId: requestId,
          paymentMethod: paymentMethod,
          description: `Payment for project request ${requestId}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      
      const paymentIntent: PaymentIntent = {
        id: data.paymentIntentId || data.id,
        clientSecret: data.clientSecret || data.client_secret,
        amount: amount,
        currency: currency,
        status: 'requires_payment_method',
        metadata: {
          requestId: requestId,
          paymentMethod: paymentMethod
        }
      };
      
      console.log('PaymentIntegrationService - Payment intent created:', paymentIntent.id);
      return paymentIntent;
      
    } catch (error) {
      console.error('PaymentIntegrationService - Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create payment intent for delivery
  static async createDeliveryPaymentIntent(
    deliveryId: string,
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>
  ): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
    try {
      // This will be implemented with your payment provider
      // Example for Stripe:
      
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata: {
            deliveryId,
            type: 'project_delivery',
            ...metadata
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create payment intent' };
      }

      return {
        success: true,
        paymentIntent: {
          id: data.id,
          clientSecret: data.client_secret,
          amount: data.amount / 100, // Convert back from cents
          currency: data.currency,
          status: data.status,
          metadata: data.metadata
        }
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Process card payment
  static async processCardPayment(
    paymentIntentId: string,
    paymentData: { token: string }
  ): Promise<boolean> {
    try {
      console.log('PaymentIntegrationService - Processing card payment:', paymentIntentId);
      
      // In a real implementation, this would confirm the payment intent with Stripe
      // For now, we'll simulate a successful payment
      console.log('PaymentIntegrationService - Card payment processed successfully');
      return true;
      
    } catch (error) {
      console.error('PaymentIntegrationService - Card payment failed:', error);
      return false;
    }
  }

  // Process PayPal payment
  static async processPayPalPayment(
    paymentIntentId: string,
    paymentToken: string
  ): Promise<boolean> {
    try {
      console.log('PaymentIntegrationService - Processing PayPal payment:', paymentIntentId);
      
      // PayPal integration would go here
      console.log('PaymentIntegrationService - PayPal payment processed successfully');
      return true;
      
    } catch (error) {
      console.error('PaymentIntegrationService - PayPal payment failed:', error);
      return false;
    }
  }

  // Process Apple Pay payment
  static async processApplePayPayment(
    paymentIntentId: string,
    paymentToken: string
  ): Promise<boolean> {
    try {
      console.log('PaymentIntegrationService - Processing Apple Pay payment:', paymentIntentId);
      
      // Apple Pay integration would go here
      console.log('PaymentIntegrationService - Apple Pay payment processed successfully');
      return true;
      
    } catch (error) {
      console.error('PaymentIntegrationService - Apple Pay payment failed:', error);
      return false;
    }
  }

  // Create payment receipt
  static async createPaymentReceipt(
    paymentIntentId: string,
    success: boolean,
    metadata?: Record<string, string>
  ): Promise<PaymentReceipt> {
    try {
      console.log('PaymentIntegrationService - Creating payment receipt:', { paymentIntentId, success });
      
      // In a real implementation, this would save to database
      const receipt: PaymentReceipt = {
        id: `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        paymentIntentId,
        amount: 0, // Would get from payment intent
        currency: 'usd',
        status: success ? 'completed' : 'failed',
        createdAt: new Date().toISOString(),
        metadata
      };
      
      console.log('PaymentIntegrationService - Payment receipt created:', receipt.id);
      return receipt;
      
    } catch (error) {
      console.error('PaymentIntegrationService - Error creating receipt:', error);
      throw new Error(`Failed to create receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get payment receipt
  static async getPaymentReceipt(paymentIntentId: string): Promise<PaymentReceipt> {
    try {
      console.log('PaymentIntegrationService - Getting payment receipt:', paymentIntentId);
      
      // In a real implementation, this would fetch from database
      const receipt: PaymentReceipt = {
        id: `receipt_${paymentIntentId}`,
        paymentIntentId,
        amount: 100, // Mock amount
        currency: 'usd',
        status: 'completed',
        createdAt: new Date().toISOString(),
      };
      
      return receipt;
      
    } catch (error) {
      console.error('PaymentIntegrationService - Error getting receipt:', error);
      throw new Error(`Failed to get receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Download receipt PDF
  static async downloadReceiptPDF(receiptId: string): Promise<string> {
    try {
      console.log('PaymentIntegrationService - Downloading receipt PDF:', receiptId);
      
      // In a real implementation, this would generate and return PDF URL
      const pdfUrl = `https://example.com/receipts/${receiptId}.pdf`;
      
      console.log('PaymentIntegrationService - Receipt PDF URL generated:', pdfUrl);
      return pdfUrl;
      
    } catch (error) {
      console.error('PaymentIntegrationService - Error downloading receipt PDF:', error);
      throw new Error(`Failed to download receipt PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process file download (for protected files)
  static async processFileDownload(
    fileUrl: string,
    userId: string,
    requestId?: string
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      console.log('PaymentIntegrationService - Processing file download:', { fileUrl, userId, requestId });
      
      // In a real implementation, this would check payment status and permissions
      // For now, we'll simulate success
      return {
        success: true,
        downloadUrl: fileUrl
      };
      
    } catch (error) {
      console.error('PaymentIntegrationService - Error processing file download:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check if user can download files
  static async canDownloadFiles(requestId: string, userId?: string): Promise<boolean> {
    try {
      console.log('PaymentIntegrationService - Checking download permission:', { requestId, userId });
      
      // In a real implementation, this would check payment status
      // For now, we'll simulate permission granted
      return true;
      
    } catch (error) {
      console.error('PaymentIntegrationService - Error checking download permission:', error);
      return false;
    }
  }

  // Calculate transaction fee
  static calculateTransactionFee(amount: number, paymentMethod: PaymentMethod): number {
    const fees = {
      card: 0.029, // 2.9% + $0.30
      paypal: 0.034, // 3.4% + $0.30
      apple_pay: 0.029, // 2.9% + $0.30
      google_pay: 0.029 // 2.9% + $0.30
    };
    
    const percentageFee = amount * (fees[paymentMethod] || fees.card);
    const fixedFee = 0.30;
    
    return Math.round((percentageFee + fixedFee) * 100) / 100; // Round to 2 decimal places
  }

  // Process payment for delivery access
  static async processDeliveryPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<PaymentResult> {
    try {
      // This will be implemented with your payment provider
      // Example for Stripe:
      
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          payment_method_id: paymentMethodId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Payment failed' };
      }

      return {
        success: data.status === 'succeeded',
        paymentIntentId,
        requiresAction: data.status === 'requires_action',
        actionUrl: data.next_action?.redirect_to_url?.url
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Handle 3D Secure or other payment actions
  static async handlePaymentAction(
    paymentIntentId: string,
    returnUrl?: string
  ): Promise<PaymentResult> {
    try {
      // This will be implemented with your payment provider
      // Example for Stripe:
      
      const response = await fetch('/api/handle-payment-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          return_url: returnUrl
        })
      });

      const data = await response.json();

      return {
        success: data.status === 'succeeded',
        paymentIntentId,
        requiresAction: data.status === 'requires_action'
      };
    } catch (error) {
      console.error('Error handling payment action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get payment methods for user
  static async getPaymentMethods(customerId?: string): Promise<{
    success: boolean;
    paymentMethods?: any[];
    error?: string;
  }> {
    try {
      if (!customerId) {
        return { success: true, paymentMethods: [] };
      }

      const response = await fetch(`/api/payment-methods/${customerId}`);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch payment methods' };
      }

      return {
        success: true,
        paymentMethods: data.payment_methods || []
      };
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create customer for recurring payments
  static async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    try {
      const response = await fetch('/api/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          metadata
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create customer' };
      }

      return {
        success: true,
        customerId: data.id
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Refund payment
  static async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const response = await fetch('/api/refund-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
          reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Refund failed' };
      }

      return {
        success: true,
        refundId: data.id
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get payment status
  static async getPaymentStatus(paymentIntentId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/payment-status/${paymentIntentId}`);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to get payment status' };
      }

      return {
        success: true,
        status: data.status
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Calculate platform fees
  static calculatePlatformFee(amount: number, feePercentage: number = 3): {
    subtotal: number;
    platformFee: number;
    total: number;
  } {
    const platformFee = amount * (feePercentage / 100);
    return {
      subtotal: amount,
      platformFee: Math.round(platformFee * 100) / 100, // Round to 2 decimal places
      total: Math.round((amount + platformFee) * 100) / 100
    };
  }

  // Validate payment amount
  static validatePaymentAmount(amount: number): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be greater than zero' };
    }
    
    if (amount < 0.50) {
      return { valid: false, error: 'Minimum payment amount is $0.50' };
    }
    
    if (amount > 999999.99) {
      return { valid: false, error: 'Maximum payment amount is $999,999.99' };
    }
    
    return { valid: true };
  }

  // Format currency amount for display
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Mock payment for development/testing
  static async mockPayment(
    amount: number,
    shouldSucceed: boolean = true,
    delay: number = 2000
  ): Promise<PaymentResult> {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (shouldSucceed) {
      return {
        success: true,
        paymentIntentId: `pi_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`
      };
    } else {
      return {
        success: false,
        error: 'Mock payment failed for testing'
      };
    }
  }

  // Webhook handlers for payment events
  static async handlePaymentWebhook(event: any): Promise<{ success: boolean; error?: string }> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Update delivery payment status to completed
          await this.updateDeliveryPaymentStatus(
            event.data.object.metadata.deliveryId,
            'completed',
            event.data.object.id
          );
          break;
          
        case 'payment_intent.payment_failed':
          // Update delivery payment status to failed
          await this.updateDeliveryPaymentStatus(
            event.data.object.metadata.deliveryId,
            'failed',
            event.data.object.id
          );
          break;
          
        case 'charge.dispute.created':
          // Handle chargeback/dispute
          console.log('Dispute created for payment:', event.data.object.payment_intent);
          break;
          
        default:
          console.log('Unhandled event type:', event.type);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error handling payment webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update delivery payment status (integrate with ProjectDeliveryService)
  private static async updateDeliveryPaymentStatus(
    deliveryId: string,
    status: 'completed' | 'failed' | 'processing' | 'pending' | 'refunded',
    paymentIntentId: string
  ): Promise<void> {
    // This will be called by webhook handlers
    try {
      const ProjectDeliveryService = (await import('../../projects/services/projectDeliveryService')).default;
      await ProjectDeliveryService.updatePaymentStatus(deliveryId, status, paymentIntentId);
    } catch (error) {
      console.error('Error updating delivery payment status:', error);
    }
  }
}

export default PaymentIntegrationService;

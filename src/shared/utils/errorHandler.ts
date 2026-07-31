// Comprehensive Error Handling Utility for Payment System
import { Alert } from 'react-native';

export interface PaymentError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class PaymentErrorHandler {
  
  // Payment-specific error codes
  static readonly ERROR_CODES = {
    // Network & Connection
    NETWORK_ERROR: 'NETWORK_ERROR',
    SUPABASE_CONNECTION: 'SUPABASE_CONNECTION',
    STRIPE_CONNECTION: 'STRIPE_CONNECTION',
    
    // Authentication
    USER_NOT_AUTHENTICATED: 'USER_NOT_AUTHENTICATED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    
    // Payment Processing
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    PAYMENT_DECLINED: 'PAYMENT_DECLINED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
    
    // Business Logic
    AGREEMENT_NOT_FOUND: 'AGREEMENT_NOT_FOUND',
    INVALID_PRICE: 'INVALID_PRICE',
    SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
    ALREADY_PAID: 'ALREADY_PAID',
    
    // File Operations
    FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    
    // Database
    DATABASE_ERROR: 'DATABASE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION'
  };

  // Map errors to user-friendly messages
  static getErrorDetails(error: any): PaymentError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return {
        code: this.ERROR_CODES.NETWORK_ERROR,
        message: errorMessage,
        userMessage: 'Network connection failed. Please check your internet connection and try again.',
        severity: 'medium'
      };
    }
    
    // Supabase errors
    if (errorMessage.includes('supabase') || errorMessage.includes('JWT')) {
      return {
        code: this.ERROR_CODES.SUPABASE_CONNECTION,
        message: errorMessage,
        userMessage: 'Database connection failed. Please try again in a moment.',
        severity: 'high'
      };
    }
    
    // Stripe errors
    if (errorMessage.includes('stripe') || errorMessage.includes('payment_intent')) {
      return {
        code: this.ERROR_CODES.STRIPE_CONNECTION,
        message: errorMessage,
        userMessage: 'Payment service temporarily unavailable. Please try again.',
        severity: 'high'
      };
    }
    
    // Payment declined
    if (errorMessage.includes('declined') || errorMessage.includes('insufficient_funds')) {
      return {
        code: this.ERROR_CODES.PAYMENT_DECLINED,
        message: errorMessage,
        userMessage: 'Payment was declined. Please check your payment method and try again.',
        severity: 'medium'
      };
    }
    
    // File upload errors
    if (errorMessage.includes('file') && errorMessage.includes('size')) {
      return {
        code: this.ERROR_CODES.FILE_TOO_LARGE,
        message: errorMessage,
        userMessage: 'File is too large. Please choose a smaller file (max 50MB).',
        severity: 'low'
      };
    }
    
    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
      return {
        code: this.ERROR_CODES.USER_NOT_AUTHENTICATED,
        message: errorMessage,
        userMessage: 'Please log in to continue.',
        severity: 'high'
      };
    }
    
    // Default error
    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      severity: 'medium'
    };
  }

  // Show user-friendly error alert
  static showError(error: any, title: string = 'Error') {
    const errorDetails = this.getErrorDetails(error);
    
    console.error(`[${errorDetails.code}] ${errorDetails.message}`);
    
    Alert.alert(
      title,
      errorDetails.userMessage,
      [
        { text: 'OK', style: 'default' },
        ...(errorDetails.severity === 'critical' ? [
          { text: 'Contact Support', onPress: () => this.contactSupport(errorDetails) }
        ] : [])
      ]
    );
  }

  // Handle payment-specific errors with retry options
  static showPaymentError(error: any, onRetry?: () => void) {
    const errorDetails = this.getErrorDetails(error);
    
    console.error(`[PAYMENT ERROR] ${errorDetails.code}: ${errorDetails.message}`);
    
    const buttons = [
      { text: 'Cancel', style: 'cancel' as const }
    ];
    
    if (onRetry && errorDetails.severity !== 'critical') {
      buttons.push({ text: 'Try Again', onPress: onRetry });
    }
    
    if (errorDetails.severity === 'critical') {
      buttons.push({ 
        text: 'Contact Support', 
        onPress: () => this.contactSupport(errorDetails) 
      });
    }
    
    Alert.alert(
      'Payment Failed',
      errorDetails.userMessage,
      buttons
    );
  }

  // Log errors for debugging
  static logError(context: string, error: any, additionalData?: any) {
    const errorDetails = this.getErrorDetails(error);
    
    console.group(`🚨 Error in ${context}`);
    console.error('Code:', errorDetails.code);
    console.error('Message:', errorDetails.message);
    console.error('Severity:', errorDetails.severity);
    if (additionalData) {
      console.error('Additional Data:', additionalData);
    }
    console.groupEnd();
    
    // In production, you might want to send this to a logging service
    // like Sentry, LogRocket, or your own analytics
  }

  // Contact support helper
  private static contactSupport(errorDetails: PaymentError) {
    // In a real app, this would open a support chat or email
    Alert.alert(
      'Contact Support',
      `Please contact support with error code: ${errorDetails.code}`,
      [{ text: 'OK' }]
    );
  }

  // Wrapper for async operations with error handling
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    showUserError: boolean = true
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logError(context, error);
      
      if (showUserError) {
        this.showError(error);
      }
      
      return null;
    }
  }

  // Wrapper for payment operations
  static async withPaymentErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    onRetry?: () => void
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logError(`Payment: ${context}`, error);
      this.showPaymentError(error, onRetry);
      return null;
    }
  }
}

import { initStripe } from '@stripe/stripe-react-native';

/**
 * Stripe Configuration for MusiStash
 * Production-ready setup with live keys and proper merchant configuration
 */

// Live Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: 'pk_live_51S7QOO8UJ5WDwX4NxO0YVWyLi9Tawf7lmRtlhpLClRSJGpoKkoAeyCLzWYA8pCg5Cuz2myHHLdzJeNlYMFjI8PgT00Ew91SOSI',
  merchantIdentifier: 'merchant.com.musistash', // iOS Apple Pay
  urlScheme: 'musistash', // Deep linking
  merchantDisplayName: 'MusiStash',
  merchantCountryCode: 'US', // Required parameter that was missing
  returnURL: 'musistash://payment-return',
  
  // Apple Pay configuration
  applePay: {
    merchantId: 'merchant.com.musistash',
    merchantCountryCode: 'US',
    merchantDisplayName: 'MusiStash',
  },
  
  // Google Pay configuration
  googlePay: {
    merchantId: 'merchant.com.musistash',
    merchantCountryCode: 'US',
    merchantName: 'MusiStash',
    testEnv: false, // Set to false for production
  }
};

/**
 * Initialize Stripe with proper configuration
 * This should be called once when the app starts
 */
export const initializeStripe = async (): Promise<boolean> => {
  try {
    console.log('Initializing Stripe with production configuration...');
    
    await initStripe({
      publishableKey: STRIPE_CONFIG.publishableKey,
      merchantIdentifier: STRIPE_CONFIG.merchantIdentifier, // iOS only
      urlScheme: STRIPE_CONFIG.urlScheme, // iOS only
      setReturnUrlSchemeOnAndroid: true, // Android deep linking
    });
    
    console.log('✅ Stripe initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Stripe initialization failed:', error);
    return false;
  }
};

/**
 * Validate Stripe configuration
 */
export const validateStripeConfig = (): boolean => {
  const requiredFields = [
    'publishableKey',
    'merchantIdentifier', 
    'merchantCountryCode',
    'merchantDisplayName'
  ];
  
  for (const field of requiredFields) {
    if (!STRIPE_CONFIG[field as keyof typeof STRIPE_CONFIG]) {
      console.error(`❌ Missing required Stripe config: ${field}`);
      return false;
    }
  }
  
  // Validate publishable key format
  if (!STRIPE_CONFIG.publishableKey.startsWith('pk_live_')) {
    console.warn('⚠️ Using non-live Stripe key');
  }
  
  console.log('✅ Stripe configuration validated');
  return true;
};

export default STRIPE_CONFIG;

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

// Conditionally import StripePaymentService for mobile only
let StripePaymentService: any = null;
if (Platform.OS !== 'web') {
  StripePaymentService = require('./services/stripePaymentService').default;
}

interface StripeContextType {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  retryInitialization: () => void;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

interface StripeProviderProps {
  children: React.ReactNode;
}

/**
 * Stripe Provider Component
 * Initializes Stripe when the app starts and provides context to child components
 */
export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeStripe = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Skip Stripe initialization on web
      if (Platform.OS === 'web' || !StripePaymentService) {
        console.log('ℹ️ Skipping Stripe initialization for web platform');
        setIsReady(false);
        setIsLoading(false);
        return;
      }
      
      console.log('🔄 Initializing Stripe Payment Service...');
      
      const success = await StripePaymentService.initialize();
      
      if (success) {
        setIsReady(true);
        console.log('✅ Stripe is ready for payments');
      } else {
        throw new Error('Stripe initialization failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Stripe initialization error:', errorMessage);
      setError(errorMessage);
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  const retryInitialization = () => {
    initializeStripe();
  };

  useEffect(() => {
    initializeStripe();
  }, []);

  // Show error alert if initialization fails
  useEffect(() => {
    if (error && !isLoading) {
      Alert.alert(
        'Payment System Error',
        'Failed to initialize payment system. Some payment features may not work properly.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Retry', onPress: retryInitialization }
        ]
      );
    }
  }, [error, isLoading]);

  const contextValue: StripeContextType = {
    isReady,
    isLoading,
    error,
    retryInitialization,
  };

  return (
    <StripeContext.Provider value={contextValue}>
      {children}
    </StripeContext.Provider>
  );
};

/**
 * Hook to use Stripe context
 */
export const useStripe = (): StripeContextType => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

export default StripeProvider;

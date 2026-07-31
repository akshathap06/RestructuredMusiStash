import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme, MusiStashGradients } from '../../../styles/theme';
import { authService } from '../services/authService';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

// Rotating words animation (from Figma landing page)
const rotatingWords = [
  'Creation',
  'Connection',
  'Investment',
  'Freedom',
  'Growth',
  'Opportunities',
];

interface IntroScreenNewProps {
  navigation: any;
}

const IntroScreenNew: React.FC<IntroScreenNewProps> = ({ navigation }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const { isAuthenticated, isLoading } = useAuth();

  // Word rotation animation
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Change word
        setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isAppleLoading, setIsAppleLoading] = React.useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = React.useState(false);
  const authCheckIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const authCheckTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check if Apple Sign In is available (iOS 13+ only)
  useEffect(() => {
    const checkAppleAvailability = async () => {
      const available = await authService.isAppleSignInAvailable();
      setIsAppleAvailable(available);
    };
    checkAppleAvailability();
  }, []);

  // Watch for authentication state changes - clear loading immediately
  useEffect(() => {
    console.log('🔄 IntroScreen auth state:', { isAuthenticated, isLoading, isGoogleLoading, isAppleLoading });
    
    if (isAuthenticated) {
      console.log('✅ User authenticated in IntroScreen, clearing loading state immediately');
      setIsGoogleLoading(false);
      setIsAppleLoading(false);
      // Clear any pending intervals/timeouts
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current);
        authCheckIntervalRef.current = null;
      }
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
        authCheckTimeoutRef.current = null;
      }
    }
  }, [isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current);
      }
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      console.log('🚀 Initiating Google Sign In...');
      setIsGoogleLoading(true);
      
      const result = await authService.signInWithGoogle();
      
      if (result.success) {
        console.log('✅ Google Sign In completed! AuthContext will handle the rest...');
        
        // Set a safety timeout - if auth state doesn't update in 10 seconds, clear loading
        authCheckTimeoutRef.current = setTimeout(() => {
          console.log('⏱️ Safety timeout reached, clearing loading state');
          setIsGoogleLoading(false);
        }, 10000);
        
        // Also do a quick check after 2 seconds
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('✅ Quick check: Session confirmed, clearing loading');
            setIsGoogleLoading(false);
            if (authCheckTimeoutRef.current) {
              clearTimeout(authCheckTimeoutRef.current);
              authCheckTimeoutRef.current = null;
            }
          }
        }, 2000);
        
      } else {
        console.error('❌ Google Sign In failed:', result.error);
        setIsGoogleLoading(false);
        Alert.alert('Sign In Failed', result.error || 'Failed to sign in with Google. Please try again.');
      }
    } catch (error) {
      console.error('❌ Google Sign In error:', error);
      setIsGoogleLoading(false);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      console.log('🍎 Initiating Apple Sign In...');
      setIsAppleLoading(true);
      
      const result = await authService.signInWithApple();
      
      if (result.success) {
        console.log('✅ Apple Sign In completed! AuthContext will handle the rest...');
        
        // Set a safety timeout - if auth state doesn't update in 10 seconds, clear loading
        authCheckTimeoutRef.current = setTimeout(() => {
          console.log('⏱️ Safety timeout reached, clearing loading state');
          setIsAppleLoading(false);
        }, 10000);
        
        // Also do a quick check after 2 seconds
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('✅ Quick check: Session confirmed, clearing loading');
            setIsAppleLoading(false);
            if (authCheckTimeoutRef.current) {
              clearTimeout(authCheckTimeoutRef.current);
              authCheckTimeoutRef.current = null;
            }
          }
        }, 2000);
        
      } else {
        console.error('❌ Apple Sign In failed:', result.error);
        setIsAppleLoading(false);
        // Don't show alert for user cancellation
        if (result.error !== 'Sign in cancelled') {
          // Show detailed error for debugging
          Alert.alert('Sign In Failed', result.error || 'Failed to sign in with Apple. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('❌ Apple Sign In error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      setIsAppleLoading(false);
      Alert.alert('Error', error?.message || 'Failed to sign in with Apple. Please try again.');
    }
  };

  const handleEmailSignup = () => {
    navigation.navigate('Onboarding');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleTermsPress = () => {
    navigation.navigate('TermsOfService');
  };

  const handlePrivacyPress = () => {
    navigation.navigate('PrivacyPolicy');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={MusiStashTheme.colors.background} />
      
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image 
          source={require('../../../../assets/logo-final.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Main Content with Rotating Words */}
      <View style={styles.mainContent}>
        <View style={styles.textContainer}>
          <Text style={styles.headline}>The home for</Text>
          
          <View style={styles.rotatingWordContainer}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <MaskedView
                maskElement={
                  <Text style={styles.rotatingWord}>{rotatingWords[currentWordIndex]}</Text>
                }
              >
                <LinearGradient
                  colors={MusiStashGradients.landing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientTextMask}
                >
                  <Text style={styles.rotatingWord} opacity={0}>{rotatingWords[currentWordIndex]}</Text>
                </LinearGradient>
              </MaskedView>
            </Animated.View>
          </View>
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonContainer}>
          {/* Apple Button - Only shown on iOS */}
          {isAppleAvailable && (
            <TouchableOpacity
              style={[styles.authButton, isAppleLoading && styles.authButtonDisabled]}
              onPress={handleAppleSignIn}
              activeOpacity={0.8}
              disabled={isAppleLoading}
            >
              {isAppleLoading ? (
                <>
                  <ActivityIndicator size="small" color={MusiStashTheme.colors.black} />
                  <Text style={styles.authButtonText}>Signing in...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color={MusiStashTheme.colors.black} />
                  <Text style={styles.authButtonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google Button */}
          <TouchableOpacity
            style={[styles.authButton, isGoogleLoading && styles.authButtonDisabled]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <ActivityIndicator size="small" color={MusiStashTheme.colors.black} />
                <Text style={styles.authButtonText}>Signing in...</Text>
              </>
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={MusiStashTheme.colors.black} />
                <Text style={styles.authButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Email Button */}
          <TouchableOpacity
            style={styles.authButton}
            onPress={handleEmailSignup}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={20} color={MusiStashTheme.colors.black} />
            <Text style={styles.authButtonText}>Signup with Email</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you acknowledge and agree to MusiStash's{' '}
          <Text style={styles.footerLink} onPress={handleTermsPress}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.footerLink} onPress={handlePrivacyPress}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MusiStashTheme.colors.background,
    paddingHorizontal: MusiStashTheme.spacing[6],
    paddingVertical: MusiStashTheme.spacing[16],
    justifyContent: 'space-between',
  },
  
  // Logo Section
  logoSection: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    marginTop: 80,
  },
  logoImage: {
    width: width * 0.55,
    height: 45,
  },

  // Main Content
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
  textContainer: {
    marginBottom: MusiStashTheme.spacing[16],  // mb-16 in Figma
    alignItems: 'center',
  },
  headline: {
    fontSize: 48,                              // text-5xl (3rem) - matching Figma exactly
    color: MusiStashTheme.colors.white,
    textAlign: 'center',
    fontWeight: '500',                         // --font-weight-medium from Figma
    marginBottom: MusiStashTheme.spacing[6],   // mb-6
    lineHeight: 48,                            // line-height: 1 for text-5xl
  },
  rotatingWordContainer: {
    height: 80,                                // h-20 in Figma for animation space
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gradientTextMask: {
    paddingHorizontal: MusiStashTheme.spacing[4],
    paddingVertical: MusiStashTheme.spacing[2],
  },
  rotatingWord: {
    fontSize: 48,                              // text-5xl (3rem) - same as headline
    fontWeight: '500',                         // --font-weight-medium
    color: MusiStashTheme.colors.white,        // White color for the mask (gradient applied via MaskedView)
    textAlign: 'center',
    lineHeight: 48,                            // line-height: 1 from Figma
  },

  // Button Section
  buttonContainer: {
    width: '100%',
    gap: 12,                                   // space-y-3 in Figma (12px gap)
  },
  authButton: {
    backgroundColor: MusiStashTheme.colors.white,  // Pure white buttons
    height: 56,                                // h-14 in Figma
    borderRadius: 14,                          // rounded-xl (not fully rounded)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,                                   // gap-3 for icon spacing
    shadowColor: '#000',                       // shadow-sm in Figma
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  authButtonText: {
    color: MusiStashTheme.colors.black,        // Black text on white buttons
    fontSize: 16,                              // text-base (1rem)
    fontWeight: '500',                         // --font-weight-medium
    lineHeight: 24,                            // 1.5 line height
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: MusiStashTheme.spacing[6],
  },
  loginPrompt: {
    color: MusiStashTheme.colors.gray400,
    fontSize: 14,
  },
  loginLink: {
    color: MusiStashTheme.colors.white,
    fontSize: 14,
    fontWeight: '500',
  },

  // Footer
  footer: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
  footerText: {
    color: MusiStashTheme.colors.gray500,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16 * 1.625, // leading-relaxed
  },
  footerLink: {
    color: MusiStashTheme.colors.accent,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default IntroScreenNew;


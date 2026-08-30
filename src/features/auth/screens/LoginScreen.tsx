import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { authService } from '../services/authService';
import { supabase } from '../../../lib/supabase';
import { MusiStashTheme } from '../../../styles/theme';

const { width, height } = Dimensions.get('window');
const c = MusiStashTheme.colors;

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const { login, isAuthenticated } = useAuth();

  // Check if Apple Sign In is available (iOS 13+ only)
  useEffect(() => {
    const checkAppleAvailability = async () => {
      const available = await authService.isAppleSignInAvailable();
      setIsAppleAvailable(available);
    };
    checkAppleAvailability();
  }, []);

  // Clear loading states when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setIsAppleLoading(false);
      setIsGoogleLoading(false);
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 Attempting login for:', email.trim());
      
      // Call authService directly to get the error message
      const result = await authService.login(email.trim(), password);
      
      console.log('📋 Login result:', result.success, result.message);
      
      if (result.success && result.user && result.token) {
        // Login successful - update auth context
        console.log('✅ Login successful!');
        const contextSuccess = await login(email.trim(), password);
        if (contextSuccess) {
          console.log('✅ Auth context updated');
        }
      } else if (result.message === 'NO_PASSWORD') {
        // Password-less account detected!
        console.log('🔑 Password-less account detected, sending reset email...');
        
        // Send password reset email automatically
        const resetResult = await authService.sendPasswordResetEmail(email.trim());
        
        if (resetResult.success) {
          console.log('✅ Reset email sent successfully');
          setIsLoading(false);
          // Navigate to Check Your Email screen
          navigation.navigate('CheckYourEmail', { email: email.trim() });
          return;
        } else {
          console.error('❌ Failed to send reset email:', resetResult.message);
          Alert.alert('Error', resetResult.message || 'Failed to send reset email');
        }
      } else {
        // Wrong email or password
        console.log('❌ Login failed:', result.message);
        Alert.alert(
          'Login Failed', 
          result.message === 'Invalid email or password' 
            ? 'Invalid email or password. Please try again or click "Forgot Password?"' 
            : result.message || 'Login failed'
        );
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first');
      return;
    }

    Alert.alert(
      'Reset Password',
      `A password reset link will be sent to ${email}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await authService.sendPasswordResetEmail(email.trim());
              
              if (result.success) {
                // Navigate to Check Your Email screen
                navigation.navigate('CheckYourEmail', { email: email.trim() });
              } else {
                Alert.alert('Error', result.message || 'Failed to send reset email');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to send reset email');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAppleSignIn = async () => {
    try {
      console.log('🍎 Initiating Apple Sign In from Login...');
      setIsAppleLoading(true);
      
      const result = await authService.signInWithApple();
      
      if (result.success) {
        console.log('✅ Apple Sign In completed!');
        // Wait a moment for session to propagate
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsAppleLoading(false);
          }
        }, 2000);
      } else {
        setIsAppleLoading(false);
        if (result.message !== 'Sign-in canceled') {
          Alert.alert('Sign In Failed', result.message || 'Failed to sign in with Apple.');
        }
      }
    } catch (error) {
      console.error('❌ Apple Sign In error:', error);
      setIsAppleLoading(false);
      Alert.alert('Error', 'Failed to sign in with Apple.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('🚀 Initiating Google Sign In from Login...');
      setIsGoogleLoading(true);
      
      const result = await authService.signInWithGoogle();
      
      if (result.success) {
        console.log('✅ Google Sign In completed!');
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsGoogleLoading(false);
          }
        }, 2000);
      } else {
        setIsGoogleLoading(false);
        Alert.alert('Sign In Failed', result.error || 'Failed to sign in with Google.');
      }
    } catch (error) {
      console.error('❌ Google Sign In error:', error);
      setIsGoogleLoading(false);
      Alert.alert('Error', 'Failed to sign in with Google.');
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../../assets/logo-final.png')}
                style={styles.logoImageFull}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.subtitle}>Sign in to your paper portfolio</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={c.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={c.textFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={c.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={c.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={c.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtonsContainer}>
              {/* Apple Button - Only shown on iOS */}
              {isAppleAvailable && (
                <TouchableOpacity
                  style={[styles.googleButton, isAppleLoading && styles.socialButtonDisabled]}
                  onPress={handleAppleSignIn}
                  disabled={isAppleLoading}
                >
                  {isAppleLoading ? (
                    <ActivityIndicator size="small" color={c.textPrimary} />
                  ) : (
                    <Ionicons name="logo-apple" size={24} color={c.textPrimary} />
                  )}
                </TouchableOpacity>
              )}

              {/* Google Button */}
              <TouchableOpacity
                style={[styles.googleButton, isGoogleLoading && styles.socialButtonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color={c.textPrimary} />
                ) : (
                  <Ionicons name="logo-google" size={22} color={c.textPrimary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToRegister}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 32,
  },
  logoContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  logoImageFull: {
    width: width * 0.5,
    height: 40,
    alignSelf: 'center',
  },
  title: {
    fontFamily: MusiStashTheme.fonts.extrabold,
    fontSize: 32,
    color: c.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: MusiStashTheme.fonts.regular,
    fontSize: 15,
    color: c.textMuted,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: c.line,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 54,
    color: c.textPrimary,
    fontFamily: MusiStashTheme.fonts.medium,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    marginTop: 18,
    minHeight: 54,
    justifyContent: 'center',
    backgroundColor: c.accent,
    borderRadius: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: c.onAccent,
    fontFamily: MusiStashTheme.fonts.extrabold,
    fontSize: 16,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 18,
    minHeight: 32,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    color: c.accentSolid,
    fontFamily: MusiStashTheme.fonts.semibold,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 26,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.line,
  },
  dividerText: {
    color: c.textFaint,
    fontFamily: MusiStashTheme.fonts.medium,
    marginHorizontal: 14,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: c.textMuted,
    fontFamily: MusiStashTheme.fonts.regular,
    fontSize: 14,
  },
  registerLink: {
    color: c.accentSolid,
    fontFamily: MusiStashTheme.fonts.bold,
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 28,
  },
  googleButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
});

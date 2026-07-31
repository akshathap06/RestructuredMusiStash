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

const { width, height } = Dimensions.get('window');

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
        if (result.error !== 'Sign in cancelled') {
          Alert.alert('Sign In Failed', result.error || 'Failed to sign in with Apple.');
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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
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
            <Text style={styles.subtitle}>Connect through music</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
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
                  color="#94A3B8"
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
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Ionicons name="logo-apple" size={24} color="#000000" />
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
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Ionicons name="logo-google" size={22} color="#000000" />
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
    backgroundColor: '#000000',
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
    marginBottom: 60,
    marginTop: 40,
  },
  logoContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    marginTop: 20,
    paddingVertical: 18,
    backgroundColor: '#3B82F6',
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#4B5563',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  dividerText: {
    color: '#94A3B8',
    marginHorizontal: 16,
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  registerLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 30,
  },
  googleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
});

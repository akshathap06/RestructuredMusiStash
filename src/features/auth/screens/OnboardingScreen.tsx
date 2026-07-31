import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MusiStashTheme } from '../../../styles/theme';
import { InputOTP } from '../../../components/ui/InputOTP';
import { twilioVerificationService } from '../services/twilioVerificationService';
import { supabase } from '../../../lib/supabase';

type OnboardingStep = 'email' | 'email-verify' | 'password';

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [step, setStep] = useState<OnboardingStep>('email');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expectedEmailCode, setExpectedEmailCode] = useState('');

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLowerAndUpper = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isPasswordValid = hasMinLength && hasNumber && hasLowerAndUpper && hasSpecialChar;

  // Progress calculation (3 steps: email, verify, password)
  const steps: OnboardingStep[] = ['email', 'email-verify', 'password'];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleBack = () => {
    if (step === 'email') {
      // Check if we can go back, otherwise navigate to Intro
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Intro');
      }
    } else if (step === 'email-verify') {
      setStep('email');
    } else if (step === 'password') {
      setStep('email-verify');
    }
  };

  const handleEmailContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📧 Starting email verification for:', email);
      
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .ilike('email', email.trim().toLowerCase())
        .single();

      if (existingUser) {
        setIsLoading(false);
        Alert.alert(
          'Account Exists',
          'This email is already registered. Please log in instead.',
          [
            {
              text: 'Log In',
              onPress: () => navigation.navigate('Login'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      console.log('📧 Sending verification code to:', email.trim());
      const result = await twilioVerificationService.sendEmailVerification(email.trim());
      console.log('📧 Send result:', result);
      
      if (result.success && result.code) {
        setExpectedEmailCode(result.code);
        console.log('✅ Verification code sent successfully');
        // Show success message without revealing the code
        Alert.alert(
          'Code Sent', 
          'We\'ve sent a 4-digit verification code to your email. Please check your inbox and enter the code below.',
          [{ text: 'OK' }]
        );
        setStep('email-verify');
      } else {
        console.error('❌ Failed to send code:', result.message);
        Alert.alert('Error', result.message || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error in handleEmailContinue:', error);
      Alert.alert('Error', 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerifyContinue = async () => {
    if (emailCode.length !== 4) {
      Alert.alert('Error', 'Please enter the 4-digit code');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 Verifying code:', emailCode, 'Expected:', expectedEmailCode);
      
      if (emailCode === expectedEmailCode) {
        console.log('✅ Code verified successfully!');
        setStep('password');
      } else {
        console.log('❌ Code mismatch');
        Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
        setEmailCode('');
      }
    } catch (error) {
      console.error('❌ Error verifying code:', error);
      Alert.alert('Error', 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordContinue = async () => {
    if (!isPasswordValid) {
      Alert.alert('Error', 'Password does not meet all requirements');
      return;
    }

    setIsLoading(true);
    try {
      // Create user account with Supabase
      console.log('📧 Creating account for:', email.trim());
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            email_verified: true, // Already verified via OTP
          }
        }
      });

      if (error) {
        console.error('❌ Registration error:', error);
        Alert.alert('Error', error.message || 'Failed to create account');
        return;
      }

      if (data?.user) {
        console.log('✅ Account created, user ID:', data.user.id);
        
        // Create user record in users table
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            name: email.split('@')[0], // Default name from email
            created_at: new Date().toISOString(),
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('❌ Error creating user record:', insertError);
        }

        // Set onboarding flag so AuthContext knows this is a new user
        console.log('🆕 Setting onboarding flag for new user...');
        await AsyncStorage.setItem(`needsOnboarding_${data.user.id}`, 'true');

        // Check if signUp returned a session (happens when email confirmation is disabled)
        if (data.session) {
          console.log('✅ SignUp returned session, user is already authenticated!');
          // Store the auth token
          await AsyncStorage.setItem('authToken', data.session.access_token);
          // The AuthContext will detect this via onAuthStateChange
          Alert.alert('Success', 'Account created successfully!');
        } else {
          // Email confirmation is required - user needs to confirm email first
          // Since we already verified via OTP, try to sign in anyway
          console.log('🔐 No session from signUp, attempting sign in...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (signInError) {
            console.error('❌ Sign in after registration failed:', signInError);
            // Email confirmation is likely required by Supabase
            // Navigate to role selection anyway - AuthContext will handle it when they confirm
            Alert.alert(
              'Account Created!', 
              'Please check your email to confirm your account, then log in.',
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
            return;
          }

          console.log('✅ User signed in successfully!');
          await AsyncStorage.setItem('authToken', signInData.session?.access_token || '');
          Alert.alert('Success', 'Account created successfully!');
        }
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (step === 'email') handleEmailContinue();
    else if (step === 'email-verify') handleEmailVerifyContinue();
    else if (step === 'password') handlePasswordContinue();
  };

  const isContinueDisabled = () => {
    if (step === 'email') return !email || isLoading;
    if (step === 'email-verify') return emailCode.length !== 4 || isLoading;
    if (step === 'password') return !isPasswordValid || isLoading;
    return false;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={MusiStashTheme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons 
            name={step === 'email' ? 'close' : 'arrow-back'} 
            size={24} 
            color={MusiStashTheme.colors.white} 
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Email Step */}
          {step === 'email' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What's your email?</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={MusiStashTheme.colors.gray500}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <View style={styles.helpText}>
                <Text style={styles.helpTextNormal}>Have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.helpTextLink}>Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Email Verification Step */}
          {step === 'email-verify' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Enter verification code</Text>
              <InputOTP
                value={emailCode}
                onChange={setEmailCode}
                length={4}
              />
              <Text style={styles.verificationText}>
                We've sent a code to {email}
              </Text>
              <View style={styles.helpLinks}>
                <TouchableOpacity>
                  <Text style={styles.helpLink}>Need help? Email us</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  setIsLoading(true);
                  try {
                    console.log('📧 Resending verification code to:', email.trim());
                    const result = await twilioVerificationService.resendEmailVerification(email.trim());
                    console.log('📧 Resend result:', result);
                    
                    if (result.success && result.code) {
                      setExpectedEmailCode(result.code);
                      setEmailCode('');
                      console.log('✅ New verification code sent successfully');
                      Alert.alert(
                        'Code Resent', 
                        'A new verification code has been sent to your email. Please check your inbox.',
                        [{ text: 'OK' }]
                      );
                    } else {
                      console.error('❌ Failed to resend code:', result.message);
                      Alert.alert('Error', result.message || 'Failed to resend code. Please try again.');
                    }
                  } catch (error) {
                    console.error('❌ Error resending code:', error);
                    Alert.alert('Error', 'Failed to resend code. Please try again.');
                  } finally {
                    setIsLoading(false);
                  }
                }}>
                  <Text style={styles.helpLink}>Resend code</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Create your password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={MusiStashTheme.colors.gray500}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={MusiStashTheme.colors.gray400}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <View style={styles.requirement}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={hasMinLength ? MusiStashTheme.colors.accent : MusiStashTheme.colors.gray600}
                  />
                  <Text style={[
                    styles.requirementText,
                    hasMinLength && styles.requirementTextMet
                  ]}>
                    8 Characters
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={hasNumber ? MusiStashTheme.colors.accent : MusiStashTheme.colors.gray600}
                  />
                  <Text style={[
                    styles.requirementText,
                    hasNumber && styles.requirementTextMet
                  ]}>
                    Include a number
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={hasLowerAndUpper ? MusiStashTheme.colors.accent : MusiStashTheme.colors.gray600}
                  />
                  <Text style={[
                    styles.requirementText,
                    hasLowerAndUpper && styles.requirementTextMet
                  ]}>
                    Lowercase and Uppercase letters
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={hasSpecialChar ? MusiStashTheme.colors.accent : MusiStashTheme.colors.gray600}
                  />
                  <Text style={[
                    styles.requirementText,
                    hasSpecialChar && styles.requirementTextMet
                  ]}>
                    Special character such as ! @ #
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Phone verification removed - email verification is sufficient */}
        </ScrollView>

        {/* Footer with Continue Button */}
        <View style={styles.footer}>
          {step === 'email' && (
            <Text style={styles.footerText}>
              By continuing, you acknowledge and agree to MusiStash's legal terms, which we recommend reviewing →
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.continueButton,
              isContinueDisabled() && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={isContinueDisabled()}
          >
            <Text style={[
              styles.continueButtonText,
              isContinueDisabled() && styles.continueButtonTextDisabled
            ]}>
              {isLoading ? 'Please wait...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MusiStashTheme.colors.background,
  },
  header: {
    paddingHorizontal: MusiStashTheme.spacing[4],
    paddingTop: 56,
    paddingBottom: MusiStashTheme.spacing[2],
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressContainer: {
    height: 2,
    backgroundColor: MusiStashTheme.colors.gray800,
  },
  progressBar: {
    height: '100%',
    backgroundColor: MusiStashTheme.colors.accent,
    transition: 'width 0.3s ease',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: MusiStashTheme.spacing[6],
    paddingTop: MusiStashTheme.spacing[8],
  },
  stepContainer: {
    gap: MusiStashTheme.spacing[6],
  },
  stepTitle: {
    fontSize: 32,
    color: MusiStashTheme.colors.white,
    fontWeight: '500',
    marginBottom: MusiStashTheme.spacing[2],
  },
  input: {
    height: 56,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: MusiStashTheme.colors.accent,
    borderRadius: 14,
    paddingHorizontal: MusiStashTheme.spacing[4],
    color: MusiStashTheme.colors.white,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: MusiStashTheme.spacing[4],
    top: 18,
  },
  helpText: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  helpTextNormal: {
    color: MusiStashTheme.colors.gray400,
    fontSize: 14,
  },
  helpTextLink: {
    color: MusiStashTheme.colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  verificationText: {
    color: MusiStashTheme.colors.gray400,
    fontSize: 14,
    marginTop: MusiStashTheme.spacing[4],
  },
  helpLinks: {
    gap: MusiStashTheme.spacing[3],
    marginTop: MusiStashTheme.spacing[4],
  },
  helpLink: {
    color: MusiStashTheme.colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  requirementsContainer: {
    gap: MusiStashTheme.spacing[3],
    marginTop: MusiStashTheme.spacing[2],
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MusiStashTheme.spacing[2],
  },
  requirementText: {
    color: MusiStashTheme.colors.gray400,
    fontSize: 14,
  },
  requirementTextMet: {
    color: MusiStashTheme.colors.accent,
  },
  footer: {
    paddingHorizontal: MusiStashTheme.spacing[6],
    paddingBottom: MusiStashTheme.spacing[8],
    gap: MusiStashTheme.spacing[4],
  },
  footerText: {
    color: MusiStashTheme.colors.gray500,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16 * 1.625,
  },
  continueButton: {
    height: 56,
    backgroundColor: MusiStashTheme.colors.accent,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MusiStashTheme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: MusiStashTheme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    opacity: 0.5,
  },
});

export default OnboardingScreen;


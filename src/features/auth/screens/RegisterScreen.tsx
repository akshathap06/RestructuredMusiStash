import React, { useState } from 'react';
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
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { emailVerificationService } from '../services/emailVerificationService';
import { MusiStashTheme } from '../../../styles/theme';

const c = MusiStashTheme.colors;

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await emailVerificationService.sendVerificationCode(email.trim());

      if (result.success) {
        // Navigate to email verification screen
        navigation.navigate('EmailVerification', { email: email.trim() });
        
        // In development, show the code for testing
        if (__DEV__ && result.code) {
          Alert.alert(
            'Dev Mode: Code Sent',
            `Verification code: ${result.code}\n\n(This is only shown in development mode)`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const navigateToTerms = () => {
    navigation.navigate('TermsOfService');
  };

  const navigateToPrivacy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={navigateToLogin}
            >
              <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../../assets/brand/mark-reversed.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Paper-invest in music with simulated MusiStash Cash</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formContainer}>
            <Text style={styles.description}>
              Enter your email address to get started. We'll send you a verification code.
            </Text>

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
                autoFocus={true}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.registerButton, (isLoading || !email.trim()) && styles.registerButtonDisabled]}
              onPress={handleContinue}
              disabled={isLoading || !email.trim()}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Sending Code...' : 'Continue'}
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.termsLink} onPress={navigateToTerms}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink} onPress={navigateToPrivacy}>Privacy Policy</Text>
            </Text>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
    marginTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 0,
    padding: 8,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: c.accentTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  title: {
    fontFamily: MusiStashTheme.fonts.extrabold,
    fontSize: 26,
    color: c.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: MusiStashTheme.fonts.regular,
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  formContainer: {
    width: '100%',
  },
  description: {
    color: c.textMuted,
    fontFamily: MusiStashTheme.fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: c.line,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    color: c.textPrimary,
    fontFamily: MusiStashTheme.fonts.medium,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  passwordRequirements: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  requirementsTitle: {
    color: c.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirement: {
    color: c.textFaint,
    fontSize: 12,
    marginBottom: 4,
  },
  requirementMet: {
    color: c.accentSolid,
  },
  registerButton: {
    marginTop: 18,
    minHeight: 54,
    justifyContent: 'center',
    backgroundColor: c.accent,
    borderRadius: 16,
    alignItems: 'center',
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: c.onAccent,
    fontFamily: MusiStashTheme.fonts.extrabold,
    fontSize: 16,
  },
  termsText: {
    color: c.textFaint,
    fontFamily: MusiStashTheme.fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 18,
  },
  termsLink: {
    color: c.textMuted,
    fontFamily: MusiStashTheme.fonts.semibold,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },
  loginText: {
    color: c.textMuted,
    fontFamily: MusiStashTheme.fonts.regular,
    fontSize: 14,
  },
  loginLink: {
    color: c.accentSolid,
    fontFamily: MusiStashTheme.fonts.bold,
    fontSize: 14,
  },
});

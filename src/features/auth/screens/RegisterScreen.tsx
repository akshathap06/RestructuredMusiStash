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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
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
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../../assets/ms_logo5.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Join MusiStash</Text>
            <Text style={styles.subtitle}>Start your musical journey</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formContainer}>
            <Text style={styles.description}>
              Enter your email address to get started. We'll send you a verification code.
            </Text>

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
    backgroundColor: '#000000',
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
    marginBottom: 40,
    marginTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 0,
    padding: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  description: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 8,
  },
  passwordRequirements: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  requirementsTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirement: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4,
  },
  requirementMet: {
    color: '#3B82F6',
  },
  registerButton: {
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
  registerButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#4B5563',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  loginText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  loginLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

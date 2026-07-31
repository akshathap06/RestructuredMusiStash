import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputOTP } from '../../../components/ui/InputOTP';
import { MusiStashTheme } from '../../../styles/theme';
import { emailVerificationService } from '../services/emailVerificationService';

interface EmailVerificationScreenProps {
  navigation: any;
  route: any;
}

export default function EmailVerificationScreen({ navigation, route }: EmailVerificationScreenProps) {
  const email = route.params?.email || '';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-verify when code is complete
  useEffect(() => {
    if (code.length === 4) {
      handleVerifyCode();
    }
  }, [code]);

  const handleVerifyCode = async () => {
    if (code.length !== 4) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await emailVerificationService.verifyCode(email, code);

      if (result.success) {
        // Navigate to complete registration screen
        navigation.replace('CompleteRegistration', { email });
      } else {
        Alert.alert('Invalid Code', result.message || 'Please check the code and try again.');
        setCode(''); // Clear code on error
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify code. Please try again.');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) {
      return;
    }

    setIsResending(true);
    try {
      const result = await emailVerificationService.resendVerificationCode(email);

      if (result.success) {
        Alert.alert(
          'Code Sent',
          'A new verification code has been sent to your email.',
          [{ text: 'OK' }]
        );
        setCountdown(60); // 60 second cooldown
        setCode(''); // Clear current code
      } else {
        Alert.alert('Error', result.message || 'Failed to resend code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Mask email for display
  const maskEmail = (email: string): string => {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `${username}***@${domain}`;
    }
    const masked = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    return `${masked}@${domain}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={MusiStashTheme.colors.background} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={MusiStashTheme.colors.primary} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={80} color={MusiStashTheme.colors.accent} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Verify Your Email</Text>

          {/* Message */}
          <Text style={styles.message}>
            We've sent a 4-digit verification code to{'\n'}
            <Text style={styles.emailText}>{maskEmail(email)}</Text>
          </Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <InputOTP
              value={code}
              onChange={setCode}
              length={4}
            />
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <Text style={styles.loadingText}>Verifying...</Text>
          )}

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>
                Resend in {countdown}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={isResending}
                style={styles.resendButton}
              >
                <Text style={styles.resendButtonText}>
                  {isResending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <Text style={styles.helpText}>
            The code will expire in 10 minutes.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MusiStashTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: MusiStashTheme.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: MusiStashTheme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  emailText: {
    color: MusiStashTheme.colors.accent,
    fontWeight: '600',
  },
  otpContainer: {
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  loadingText: {
    color: MusiStashTheme.colors.accent,
    fontSize: 14,
    marginBottom: 24,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    color: MusiStashTheme.colors.mutedForeground,
    fontSize: 14,
  },
  resendButton: {
    paddingVertical: 4,
  },
  resendButtonText: {
    color: MusiStashTheme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  countdownText: {
    color: MusiStashTheme.colors.gray500,
    fontSize: 14,
  },
  helpText: {
    color: MusiStashTheme.colors.gray500,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});


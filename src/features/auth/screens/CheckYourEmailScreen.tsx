import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../styles/theme';
import { authService } from '../services/authService';

interface CheckYourEmailScreenProps {
  navigation: any;
  route: any;
}

const CheckYourEmailScreen: React.FC<CheckYourEmailScreenProps> = ({ navigation, route }) => {
  const email = route.params?.email || '';
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const handleResendEmail = async () => {
    if (isResending) return;

    // Limit resend attempts
    if (resendCount >= 3) {
      Alert.alert(
        'Too Many Attempts',
        'Please wait a few minutes before requesting another email.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsResending(true);
    try {
      const result = await authService.sendPasswordResetEmail(email);

      if (result.success) {
        setResendCount(prev => prev + 1);
        Alert.alert(
          'Email Sent!',
          'A new password reset email has been sent. Please check your inbox and spam folder.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to resend email. Please try again.');
      }
    } catch (error) {
      console.error('Resend email error:', error);
      Alert.alert('Error', 'Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={MusiStashTheme.colors.background} />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={MusiStashTheme.colors.accent} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Check Your Email</Text>

        {/* Message */}
        <Text style={styles.message}>
          We've sent a password reset link to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <Text style={styles.instructions}>
          Click the link in the email to set a new password. The link will expire in 24 hours.
        </Text>

        {/* Resend Button */}
        <TouchableOpacity
          style={[styles.resendButton, isResending && styles.resendButtonDisabled]}
          onPress={handleResendEmail}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={MusiStashTheme.colors.accent} />
          ) : (
            <Text style={styles.resendButtonText}>Didn't receive the email? Resend</Text>
          )}
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <Ionicons name="arrow-back" size={20} color={MusiStashTheme.colors.primary} />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MusiStashTheme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    color: MusiStashTheme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: MusiStashTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emailText: {
    color: MusiStashTheme.colors.accent,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    color: MusiStashTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    fontSize: 14,
    color: MusiStashTheme.colors.accent,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: MusiStashTheme.colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CheckYourEmailScreen;



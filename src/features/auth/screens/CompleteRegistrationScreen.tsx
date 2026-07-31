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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { MusiStashTheme } from '../../../styles/theme';
import { emailVerificationService } from '../services/emailVerificationService';

interface CompleteRegistrationScreenProps {
  navigation: any;
  route: any;
}

export default function CompleteRegistrationScreen({ navigation, route }: CompleteRegistrationScreenProps) {
  const email = route.params?.email || '';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  // Verify email was verified before allowing registration
  React.useEffect(() => {
    if (!emailVerificationService.isEmailVerified(email)) {
      Alert.alert(
        'Email Not Verified',
        'Please verify your email first.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Register'),
          },
        ]
      );
    }
  }, [email, navigation]);

  const handleRegister = async () => {
    // Validation
    if (!name.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    // Check password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Error',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Verify email is still verified
      if (!emailVerificationService.isEmailVerified(email)) {
        Alert.alert('Error', 'Email verification expired. Please verify your email again.');
        navigation.navigate('Register');
        return;
      }

      const success = await register(name.trim(), email.trim(), phone.trim(), password);
      
      if (success) {
        // Clear verification data
        emailVerificationService.clearVerification(email);
        
        // Navigate to onboarding or main app
        // The AuthContext will handle navigation based on auth state
        Alert.alert('Success', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Navigation will be handled by AuthContext
            },
          },
        ]);
      } else {
        Alert.alert('Registration Failed', 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordValid = () => {
    if (password.length < 8) return false;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    return passwordRegex.test(password);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={MusiStashTheme.colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Just a few more details</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            {/* Password Requirements */}
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <Text style={[styles.requirement, password.length >= 8 && styles.requirementMet]}>
                • At least 8 characters
              </Text>
              <Text style={[styles.requirement, /[A-Z]/.test(password) && styles.requirementMet]}>
                • One uppercase letter
              </Text>
              <Text style={[styles.requirement, /[a-z]/.test(password) && styles.requirementMet]}>
                • One lowercase letter
              </Text>
              <Text style={[styles.requirement, /\d/.test(password) && styles.requirementMet]}>
                • One number
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                (isLoading || !isPasswordValid() || password !== confirmPassword) && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading || !isPasswordValid() || password !== confirmPassword}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: MusiStashTheme.colors.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MusiStashTheme.colors.mutedForeground,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
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
    color: MusiStashTheme.colors.primary,
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
    color: MusiStashTheme.colors.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirement: {
    color: MusiStashTheme.colors.gray500,
    fontSize: 12,
    marginBottom: 4,
  },
  requirementMet: {
    color: MusiStashTheme.colors.accent,
  },
  registerButton: {
    marginTop: 20,
    paddingVertical: 18,
    backgroundColor: MusiStashTheme.colors.accent,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: MusiStashTheme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonDisabled: {
    opacity: 0.5,
    backgroundColor: MusiStashTheme.colors.gray700,
  },
  registerButtonText: {
    color: MusiStashTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});


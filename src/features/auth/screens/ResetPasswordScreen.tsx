import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { MusiStashTheme } from '../../../styles/theme';
import { useAuth } from '../../../contexts/AuthContext';

interface ResetPasswordScreenProps {
  navigation: any;
  route: any;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const { clearPasswordRecovery, isPasswordRecovery } = useAuth();

  useEffect(() => {
    // Check if user came from email link with access_token
    const checkSession = async () => {
      console.log('🔐 ResetPasswordScreen: Checking session...');
      setCheckingSession(true);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔐 Session check result:', { 
          hasSession: !!session, 
          userEmail: session?.user?.email,
          error: error?.message,
          isPasswordRecovery 
        });
        
        if (session) {
          console.log('✅ Valid session found for password reset');
          setSessionValid(true);
        } else if (isPasswordRecovery) {
          // If we're in password recovery mode but no session, 
          // try to wait a bit for the session to be set
          console.log('⏳ Waiting for session to be established...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            console.log('✅ Session established on retry');
            setSessionValid(true);
          } else {
            showInvalidLinkAlert();
          }
        } else {
          showInvalidLinkAlert();
        }
      } catch (err) {
        console.error('❌ Error checking session:', err);
        showInvalidLinkAlert();
      } finally {
        setCheckingSession(false);
      }
    };
    
    const showInvalidLinkAlert = () => {
      Alert.alert(
        'Invalid Link',
        'This password reset link is invalid or has expired. Please request a new one.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearPasswordRecovery();
              navigation.navigate('Login');
            },
          },
        ]
      );
    };

    checkSession();
  }, [isPasswordRecovery]);

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain a lowercase letter' };
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain an uppercase letter' };
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain a number' };
    }

    return { valid: true };
  };

  const handleResetPassword = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      Alert.alert('Invalid Password', validation.message || 'Please enter a valid password');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Attempting to update password...');
      
      // Update the user's password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('❌ Password update error:', error);
        Alert.alert('Error', error.message || 'Failed to reset password');
        setIsLoading(false);
        return;
      }

      if (data) {
        console.log('✅ Password updated successfully');
        
        // Sign out the user after password reset so they can log in fresh
        await supabase.auth.signOut();
        
        // Clear the password recovery state
        clearPasswordRecovery();
        
        Alert.alert(
          'Success!',
          'Your password has been reset successfully. You can now log in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Reset password error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={MusiStashTheme.colors.blue500} />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>Verifying reset link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If session is not valid after checking, don't render the form
  if (!sessionValid && !checkingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="warning-outline" size={64} color={MusiStashTheme.colors.blue500} />
          <Text style={[styles.title, { marginTop: 16 }]}>Link Expired</Text>
          <Text style={styles.subtitle}>Please request a new password reset link.</Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 24 }]}
            onPress={() => {
              clearPasswordRecovery();
              navigation.navigate('Login');
            }}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    clearPasswordRecovery();
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={MusiStashTheme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={64} color={MusiStashTheme.colors.blue500} />
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previously used passwords
          </Text>

          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={MusiStashTheme.colors.gray500}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={MusiStashTheme.colors.gray400}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={MusiStashTheme.colors.gray500}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={MusiStashTheme.colors.gray400}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must contain:</Text>
            <Text style={styles.requirement}>• At least 8 characters</Text>
            <Text style={styles.requirement}>• One uppercase letter</Text>
            <Text style={styles.requirement}>• One lowercase letter</Text>
            <Text style={styles.requirement}>• One number</Text>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={MusiStashTheme.colors.white} />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MusiStashTheme.colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MusiStashTheme.spacing[4],
    paddingVertical: MusiStashTheme.spacing[4],
  },
  backButton: {
    padding: MusiStashTheme.spacing[2],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MusiStashTheme.colors.white,
  },
  form: {
    flex: 1,
    paddingHorizontal: MusiStashTheme.spacing[6],
    paddingTop: MusiStashTheme.spacing[8],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: MusiStashTheme.spacing[6],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: MusiStashTheme.colors.white,
    textAlign: 'center',
    marginBottom: MusiStashTheme.spacing[3],
  },
  subtitle: {
    fontSize: 14,
    color: MusiStashTheme.colors.gray400,
    textAlign: 'center',
    marginBottom: MusiStashTheme.spacing[8],
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: MusiStashTheme.spacing[5],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: MusiStashTheme.colors.white,
    marginBottom: MusiStashTheme.spacing[2],
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: MusiStashTheme.spacing[4],
    paddingVertical: MusiStashTheme.spacing[4],
    paddingRight: 50,
    fontSize: 16,
    color: MusiStashTheme.colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eyeIcon: {
    position: 'absolute',
    right: MusiStashTheme.spacing[4],
    top: '50%',
    transform: [{ translateY: -11 }],
  },
  requirementsContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: MusiStashTheme.spacing[4],
    marginBottom: MusiStashTheme.spacing[6],
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: MusiStashTheme.colors.blue400,
    marginBottom: MusiStashTheme.spacing[2],
  },
  requirement: {
    fontSize: 13,
    color: MusiStashTheme.colors.gray400,
    marginBottom: MusiStashTheme.spacing[1],
  },
  button: {
    backgroundColor: MusiStashTheme.colors.blue500,
    borderRadius: 14,
    paddingVertical: MusiStashTheme.spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    shadowColor: MusiStashTheme.colors.blue500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: MusiStashTheme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;


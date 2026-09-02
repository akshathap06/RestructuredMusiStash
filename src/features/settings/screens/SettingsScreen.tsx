import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { moderationService } from '../../../services/moderationService';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [aiDataConsent, setAiDataConsent] = useState(false);
  const [isLoadingConsent, setIsLoadingConsent] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  const loadSettings = async () => {
    if (user?.id) {
      const consent = await moderationService.hasAIConsent(user.id);
      setAiDataConsent(consent);
      setIsLoadingConsent(false);
    }
  };

  const handleAIConsentToggle = async (value: boolean) => {
    if (!user?.id) return;
    
    if (!value) {
      Alert.alert(
        'Revoke AI Consent',
        'Are you sure you want to revoke AI data processing consent? You will need to consent again to use AI features.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              await moderationService.setAIConsent(user.id, false);
              setAiDataConsent(false);
            },
          },
        ]
      );
    } else {
      await moderationService.setAIConsent(user.id, true);
      setAiDataConsent(true);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account?\n\nThis will:\n• Delete all your posts and content\n• Remove your profile information\n• Delete your messages and conversations\n• Remove all your data from MusiStash\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance to cancel. Your account will be permanently deleted.',
              [
                { text: 'Keep Account', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (!user?.id) {
                        Alert.alert('Error', 'User not found. Please try logging in again.');
                        return;
                      }

                      const result = await moderationService.deleteUserAccount(user.id);

                      if (result.success) {
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been successfully deleted. You will now be logged out.',
                          [{ text: 'OK', onPress: logout }]
                        );
                      } else {
                        Alert.alert('Error', result.error || 'Failed to delete account. Please contact support.');
                      }
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Something went wrong. Please contact support at support@musistash.com');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@musistash.com?subject=MusiStash%20Support%20Request');
  };

  const SettingsItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    danger = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingsItem, danger && styles.settingsItemDanger]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingsIconContainer, danger && styles.settingsIconDanger]}>
        <Ionicons 
          name={icon as any} 
          size={22} 
          color={danger ? '#EF4444' : '#3B82F6'} 
        />
      </View>
      <View style={styles.settingsTextContainer}>
        <Text style={[styles.settingsTitle, danger && styles.settingsTitleDanger]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.settingsSubtitle}>{subtitle}</Text>
        )}
      </View>
      {rightElement || (onPress && (
        <Ionicons name="chevron-forward" size={20} color={danger ? '#EF4444' : '#6B7280'} />
      ))}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Account Section */}
        <View style={[styles.section, styles.firstSection]}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Change your name and profile picture"
              onPress={() => navigation.navigate('ProfileSettings')}
            />
            <SettingsItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage notification preferences"
              onPress={() => navigation.navigate('Notifications')}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="ban-outline"
              title="Blocked Users"
              subtitle="Manage users you've blocked"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            <SettingsItem
              icon="sparkles-outline"
              title="AI Data Processing"
              subtitle="Allow AI features to process your data"
              rightElement={
                <Switch
                  value={aiDataConsent}
                  onValueChange={handleAIConsentToggle}
                  trackColor={{ false: '#3f3f46', true: 'rgba(59, 130, 246, 0.5)' }}
                  thumbColor={aiDataConsent ? '#3B82F6' : '#71717a'}
                  disabled={isLoadingConsent}
                />
              }
            />
            <SettingsItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="Read our privacy policy"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <SettingsItem
              icon="document-text-outline"
              title="Terms of Service"
              subtitle="Read our terms of service"
              onPress={() => navigation.navigate('TermsOfService')}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="help-circle-outline"
              title="Help Center"
              subtitle="Get help with MusiStash"
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <SettingsItem
              icon="mail-outline"
              title="Contact Support"
              subtitle="support@musistash.com"
              onPress={handleContactSupport}
            />
            <SettingsItem
              icon="bug-outline"
              title="Report a Bug"
              subtitle="Help us improve MusiStash"
              onPress={() => navigation.navigate('ReportBug')}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="information-circle-outline"
              title="App Version"
              subtitle="1.0.0"
            />
            <SettingsItem
              icon="document-text-outline"
              title="Changelog"
              subtitle="What's new in MusiStash"
              onPress={() => navigation.navigate('Changelog')}
            />
            <SettingsItem
              icon="logo-github"
              title="Open Source Licenses"
              subtitle="Third-party libraries"
              onPress={() => navigation.navigate('OpenSourceLicenses')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>Danger Zone</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="log-out-outline"
              title="Log Out"
              subtitle="Sign out of your account"
              onPress={() => {
                Alert.alert(
                  'Log Out',
                  'Are you sure you want to log out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log Out', onPress: logout }
                  ]
                );
              }}
              danger
            />
            <SettingsItem
              icon="trash-outline"
              title="Delete Account"
              subtitle="Permanently delete your account and data"
              onPress={handleDeleteAccount}
              danger
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MusiStash © 2025</Text>
          <Text style={styles.footerSubtext}>Made with ♥ for musicians</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  firstSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  dangerSectionTitle: {
    color: '#EF4444',
  },
  sectionContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsItemDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingsIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingsTitleDanger: {
    color: '#EF4444',
  },
  settingsSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#4B5563',
  },
});




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
import { MusiStashTheme } from '../../../styles/theme';
import { paperWalletService } from '../../paper-trading/services/paperWalletService';

const c = MusiStashTheme.colors;

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [aiDataConsent, setAiDataConsent] = useState(false);
  const [isLoadingConsent, setIsLoadingConsent] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      if (user?.id) {
        const consent = await moderationService.hasAIConsent(user.id);
        setAiDataConsent(consent);
        setIsLoadingConsent(false);
      }
    })();
  }, [user?.id]);

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
        ],
      );
    } else {
      await moderationService.setAIConsent(user.id, true);
      setAiDataConsent(true);
    }
  };

  const handleResetSimulation = () => {
    Alert.alert(
      'Reset simulation',
      'Clear all paper positions and restore your $10,000 paper balance? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setResetting(true);
            try {
              await paperWalletService.resetAccount(user.id);
              Alert.alert('Done', 'Your paper account is back to $10,000.');
            } catch (e) {
              Alert.alert(
                'Reset failed',
                e instanceof Error ? e.message : 'Please try again.',
              );
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account?\n\nThis will remove your profile, posts, and all your data from MusiStash. This action cannot be undone.',
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
                          [{ text: 'OK', onPress: logout }],
                        );
                      } else {
                        Alert.alert(
                          'Error',
                          result.error || 'Failed to delete account. Please contact support.',
                        );
                      }
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert(
                        'Error',
                        'Something went wrong. Please contact support at support@musistash.com',
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
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
    first = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
    first?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.item, !first && styles.itemDivider]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
    >
      <View style={[styles.iconChip, danger && styles.iconChipDanger]}>
        <Ionicons name={icon as any} size={19} color={danger ? c.negative : c.accentLight} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemTitle, danger && styles.itemTitleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement ||
        (onPress && (
          <Ionicons
            name="chevron-forward"
            size={17}
            color={danger ? c.negative : c.textFaint}
          />
        ))}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingsItem
            first
            icon="person-outline"
            title="Edit profile"
            subtitle="Name, photo, and public bio"
            onPress={() => navigation.navigate('ProfileSettings')}
          />
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        <Text style={styles.sectionTitle}>PRIVACY &amp; DATA</Text>
        <View style={styles.card}>
          <SettingsItem
            first
            icon="sparkles-outline"
            title="AI momentum analysis"
            subtitle="Let Paper score projects from your activity"
            rightElement={
              <Switch
                value={aiDataConsent}
                onValueChange={handleAIConsentToggle}
                trackColor={{ false: c.line, true: c.accent }}
                thumbColor="#FFFFFF"
                disabled={isLoadingConsent}
              />
            }
          />
          <SettingsItem
            icon="ban-outline"
            title="Blocked accounts"
            subtitle="Artists and investors you've hidden"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
          <SettingsItem
            icon="shield-checkmark-outline"
            title="Privacy policy"
            subtitle="Read the policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingsItem
            icon="document-text-outline"
            title="Terms of service"
            subtitle="Read the terms"
            onPress={() => navigation.navigate('TermsOfService')}
          />
        </View>

        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.card}>
          <SettingsItem
            first
            icon="help-circle-outline"
            title="Help center"
            subtitle="How paper backing works"
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <SettingsItem
            icon="mail-outline"
            title="Contact support"
            subtitle="support@musistash.com"
            onPress={handleContactSupport}
          />
          <SettingsItem
            icon="bug-outline"
            title="Report a bug"
            subtitle="Help us improve MusiStash"
            onPress={() => navigation.navigate('ReportBug')}
          />
          <SettingsItem
            icon="document-text-outline"
            title="Changelog"
            subtitle="What's new"
            onPress={() => navigation.navigate('Changelog')}
          />
          <SettingsItem
            icon="logo-github"
            title="Open source licenses"
            subtitle="Third-party libraries"
            onPress={() => navigation.navigate('OpenSourceLicenses')}
          />
        </View>

        <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>
          SIMULATION CONTROLS
        </Text>
        <View style={[styles.card, styles.dangerCard]}>
          <SettingsItem
            first
            danger
            icon="refresh-outline"
            title="Reset simulation"
            subtitle={resetting ? 'Resetting…' : 'Clear positions, restore $10,000'}
            onPress={resetting ? undefined : handleResetSimulation}
          />
          <SettingsItem
            danger
            icon="log-out-outline"
            title="Log out"
            subtitle="Sign out of this device"
            onPress={() => {
              Alert.alert('Log Out', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', onPress: logout },
              ]);
            }}
          />
          <SettingsItem
            danger
            icon="trash-outline"
            title="Delete account"
            subtitle="Permanently delete your account and data"
            onPress={handleDeleteAccount}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>MusiStash 1.0.0 · paper trading simulation</Text>
          <Text style={styles.footerSubtext}>
            No real money, securities, or ownership.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.listDivider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  headerPlaceholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    fontWeight: '700',
    color: c.textFaint,
    letterSpacing: 1.6,
    marginTop: 26,
    marginBottom: 8,
  },
  dangerSectionTitle: { color: c.negative },
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    overflow: 'hidden',
  },
  dangerCard: {
    backgroundColor: 'rgba(255,106,94,0.06)',
    borderColor: 'rgba(255,106,94,0.24)',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.listDivider,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconChipDanger: { backgroundColor: 'rgba(255,106,94,0.13)' },
  itemText: { flex: 1 },
  itemTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 2,
  },
  itemTitleDanger: { color: c.negative },
  itemSubtitle: { fontSize: 12.5, color: c.textMuted },
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerText: { fontSize: 11.5, color: c.textFaint, marginBottom: 4 },
  footerSubtext: { fontSize: 11.5, color: c.textFaint },
});

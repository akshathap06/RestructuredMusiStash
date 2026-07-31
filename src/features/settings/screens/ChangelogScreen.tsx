import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'bugfix' | 'improvement' | 'security';
  items: string[];
}

const changelogData: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: 'December 23, 2025',
    type: 'feature',
    items: [
      'Initial release of MusiStash mobile app',
      'Artist profile creation and management',
      'Service provider marketplace',
      'AI-powered tools for artist analysis and venue discovery',
      'Project request and management system',
      'Social features: posts, comments, likes, and follows',
      'Direct messaging between users',
      'Stripe payment integration',
      'Privacy Policy and Terms of Service',
      'Account deletion functionality',
      'Content reporting and user blocking',
      'AI data processing consent management',
      'Professional Settings page with comprehensive options',
      'Help Center with FAQ',
      'Bug reporting system',
      'Open source licenses disclosure',
    ],
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'feature':
      return { name: 'sparkles', color: '#3B82F6' };
    case 'bugfix':
      return { name: 'bug', color: '#F59E0B' };
    case 'improvement':
      return { name: 'trending-up', color: '#10B981' };
    case 'security':
      return { name: 'shield-checkmark', color: '#EF4444' };
    default:
      return { name: 'information-circle', color: '#6B7280' };
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'feature':
      return 'New Features';
    case 'bugfix':
      return 'Bug Fixes';
    case 'improvement':
      return 'Improvements';
    case 'security':
      return 'Security Updates';
    default:
      return 'Updates';
  }
};

export default function ChangelogScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.headerTitle}>Changelog</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="document-text" size={40} color="#10B981" />
          </View>
          <Text style={styles.heroTitle}>What's New</Text>
          <Text style={styles.heroSubtitle}>
            Stay updated with the latest changes, improvements, and bug fixes
          </Text>
        </View>

        {/* Changelog Entries */}
        {changelogData.map((entry, index) => {
          const typeInfo = getTypeIcon(entry.type);
          return (
            <View key={index} style={styles.changelogEntry}>
              {/* Version Header */}
              <View style={styles.versionHeader}>
                <View style={styles.versionHeaderLeft}>
                  <View style={[styles.typeBadge, { backgroundColor: `${typeInfo.color}20` }]}>
                    <Ionicons name={typeInfo.name as any} size={16} color={typeInfo.color} />
                    <Text style={[styles.typeLabel, { color: typeInfo.color }]}>
                      {getTypeLabel(entry.type)}
                    </Text>
                  </View>
                  <Text style={styles.versionText}>Version {entry.version}</Text>
                  <Text style={styles.dateText}>{entry.date}</Text>
                </View>
              </View>

              {/* Changes List */}
              <View style={styles.changesList}>
                {entry.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.changeItem}>
                    <View style={[styles.changeBullet, { backgroundColor: typeInfo.color }]} />
                    <Text style={styles.changeText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle" size={16} color="#6B7280" />
          <Text style={styles.footerNoteText}>
            We're constantly working to improve MusiStash. Check back regularly for updates!
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MusiStash © 2025</Text>
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  changelogEntry: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  versionHeader: {
    marginBottom: 16,
  },
  versionHeaderLeft: {
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  changesList: {
    gap: 12,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  changeBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  changeText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
});







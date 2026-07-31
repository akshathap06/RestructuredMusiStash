import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface License {
  name: string;
  version?: string;
  license: string;
  licenseUrl?: string;
  homepage?: string;
  description?: string;
}

// Comprehensive list of open source licenses based on package.json
const licenses: License[] = [
  {
    name: 'React',
    version: '19.1.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/facebook/react/blob/main/LICENSE',
    homepage: 'https://reactjs.org/',
    description: 'A JavaScript library for building user interfaces',
  },
  {
    name: 'React Native',
    version: '0.81.5',
    license: 'MIT',
    licenseUrl: 'https://github.com/facebook/react-native/blob/main/LICENSE',
    homepage: 'https://reactnative.dev/',
    description: 'A framework for building native apps with React',
  },
  {
    name: 'Expo',
    version: '~54.0.25',
    license: 'MIT',
    licenseUrl: 'https://github.com/expo/expo/blob/main/LICENSE',
    homepage: 'https://expo.dev/',
    description: 'The fastest way to build an app',
  },
  {
    name: '@expo/vector-icons',
    version: '^15.0.2',
    license: 'MIT',
    licenseUrl: 'https://github.com/expo/vector-icons/blob/main/LICENSE',
    homepage: 'https://expo.github.io/vector-icons/',
  },
  {
    name: '@react-navigation/native',
    version: '^7.1.17',
    license: 'MIT',
    licenseUrl: 'https://github.com/react-navigation/react-navigation/blob/main/LICENSE',
    homepage: 'https://reactnavigation.org/',
    description: 'Routing and navigation for React Native apps',
  },
  {
    name: '@react-navigation/stack',
    version: '^7.4.7',
    license: 'MIT',
    licenseUrl: 'https://github.com/react-navigation/react-navigation/blob/main/LICENSE',
  },
  {
    name: '@react-navigation/bottom-tabs',
    version: '^7.4.6',
    license: 'MIT',
    licenseUrl: 'https://github.com/react-navigation/react-navigation/blob/main/LICENSE',
  },
  {
    name: '@supabase/supabase-js',
    version: '^2.57.4',
    license: 'MIT',
    licenseUrl: 'https://github.com/supabase/supabase-js/blob/main/LICENSE',
    homepage: 'https://supabase.com/',
    description: 'JavaScript client for Supabase',
  },
  {
    name: '@stripe/stripe-react-native',
    version: '0.50.3',
    license: 'MIT',
    licenseUrl: 'https://github.com/stripe/stripe-react-native/blob/master/LICENSE',
    homepage: 'https://stripe.com/',
    description: 'Stripe React Native SDK',
  },
  {
    name: 'react-native-safe-area-context',
    version: '~5.6.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/th3rdwave/react-native-safe-area-context/blob/main/LICENSE',
  },
  {
    name: 'react-native-gesture-handler',
    version: '~2.28.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/software-mansion/react-native-gesture-handler/blob/main/LICENSE',
  },
  {
    name: 'react-native-reanimated',
    version: '^4.2.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/software-mansion/react-native-reanimated/blob/main/LICENSE',
  },
  {
    name: 'react-native-screens',
    version: '~4.16.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/software-mansion/react-native-screens/blob/main/LICENSE',
  },
  {
    name: '@react-native-async-storage/async-storage',
    version: '2.2.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/react-native-async-storage/async-storage/blob/main/LICENSE',
  },
  {
    name: 'date-fns',
    version: '^4.1.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/date-fns/date-fns/blob/main/LICENSE.md',
    homepage: 'https://date-fns.org/',
    description: 'Modern JavaScript date utility library',
  },
  {
    name: 'expo-av',
    version: '~16.0.7',
    license: 'MIT',
    licenseUrl: 'https://github.com/expo/expo/blob/main/packages/expo-av/LICENSE',
  },
  {
    name: 'expo-camera',
    version: '~17.0.9',
    license: 'MIT',
    licenseUrl: 'https://github.com/expo/expo/blob/main/packages/expo-camera/LICENSE',
  },
  {
    name: 'expo-image-picker',
    version: '~17.0.8',
    license: 'MIT',
    licenseUrl: 'https://github.com/expo/expo/blob/main/packages/expo-image-picker/LICENSE',
  },
  {
    name: 'expo-linear-gradient',
    version: '~15.0.7',
    license: 'MIT',
    licenseUrl: 'https://github.com/expo/expo/blob/main/packages/expo-linear-gradient/LICENSE',
  },
  {
    name: '@react-native-community/netinfo',
    version: '^11.4.1',
    license: 'MIT',
    licenseUrl: 'https://github.com/react-native-netinfo/react-native-netinfo/blob/main/LICENSE',
  },
  {
    name: '@react-native-google-signin/google-signin',
    version: '^16.0.0',
    license: 'MIT',
    licenseUrl: 'https://github.com/react-native-google-signin/google-signin/blob/master/LICENSE',
  },
  {
    name: 'react-native-paper',
    version: '^5.14.5',
    license: 'MIT',
    licenseUrl: 'https://github.com/callstack/react-native-paper/blob/main/LICENSE',
    homepage: 'https://callstack.github.io/react-native-paper/',
  },
];

const LicenseCard = ({ license }: { license: License }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.licenseCard}>
      <TouchableOpacity
        style={styles.licenseHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.licenseHeaderLeft}>
          <Text style={styles.licenseName}>{license.name}</Text>
          {license.version && (
            <Text style={styles.licenseVersion}>v{license.version}</Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.licenseContent}>
          <View style={styles.licenseInfoRow}>
            <Text style={styles.licenseLabel}>License:</Text>
            <Text style={styles.licenseValue}>{license.license}</Text>
          </View>
          {license.description && (
            <Text style={styles.licenseDescription}>{license.description}</Text>
          )}
          <View style={styles.licenseLinks}>
            {license.licenseUrl && (
              <TouchableOpacity
                style={styles.licenseLink}
                onPress={() => Linking.openURL(license.licenseUrl!)}
              >
                <Ionicons name="document-text" size={16} color="#3B82F6" />
                <Text style={styles.licenseLinkText}>View License</Text>
              </TouchableOpacity>
            )}
            {license.homepage && (
              <TouchableOpacity
                style={styles.licenseLink}
                onPress={() => Linking.openURL(license.homepage!)}
              >
                <Ionicons name="globe" size={16} color="#3B82F6" />
                <Text style={styles.licenseLinkText}>Homepage</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default function OpenSourceLicensesScreen({ navigation }: any) {
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
        <Text style={styles.headerTitle}>Open Source Licenses</Text>
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
            <Ionicons name="code" size={40} color="#8B5CF6" />
          </View>
          <Text style={styles.heroTitle}>Open Source Licenses</Text>
          <Text style={styles.heroSubtitle}>
            MusiStash is built with amazing open source libraries. We're grateful to all the developers who make this possible.
          </Text>
        </View>

        {/* License Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={24} color="#8B5CF6" />
          <Text style={styles.noticeText}>
            This app uses open source software. Each library is listed below with its license information. Click on any library to view details.
          </Text>
        </View>

        {/* Licenses List */}
        <View style={styles.licensesSection}>
          <Text style={styles.sectionTitle}>
            Third-Party Libraries ({licenses.length})
          </Text>
          {licenses.map((license, index) => (
            <LicenseCard key={index} license={license} />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            MusiStash © 2025
          </Text>
          <Text style={styles.footerSubtext}>
            Built with open source software
          </Text>
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
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
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
    lineHeight: 22,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    marginLeft: 12,
    lineHeight: 20,
  },
  licensesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  licenseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  licenseHeaderLeft: {
    flex: 1,
  },
  licenseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  licenseVersion: {
    fontSize: 12,
    color: '#6B7280',
  },
  licenseContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  licenseInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  licenseLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 8,
  },
  licenseValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  licenseDescription: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 12,
  },
  licenseLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  licenseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  licenseLinkText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
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







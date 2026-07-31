import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';

const bugCategories = [
  { id: 'crash', label: 'App Crash', icon: 'warning' },
  { id: 'ui', label: 'UI/Display Issue', icon: 'phone-portrait' },
  { id: 'performance', label: 'Performance Issue', icon: 'speedometer' },
  { id: 'feature', label: 'Feature Not Working', icon: 'construct' },
  { id: 'payment', label: 'Payment Issue', icon: 'card' },
  { id: 'other', label: 'Other', icon: 'ellipse' },
];

export default function ReportBugScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDeviceInfo = () => {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      deviceModel: Platform.select({ ios: 'iOS Device', android: 'Android Device', default: 'Unknown' }),
      appVersion: '1.0.0',
    };
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select a bug category.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe the bug.');
      return;
    }

    setIsSubmitting(true);

    try {
      const deviceInfo = getDeviceInfo();
      const categoryLabel = bugCategories.find(c => c.id === selectedCategory)?.label || selectedCategory;

      const emailBody = `
Bug Report - ${categoryLabel}

Description:
${description}

Steps to Reproduce:
${steps || 'N/A'}

Expected Behavior:
${expectedBehavior || 'N/A'}

Device Information:
- Platform: ${deviceInfo.platform}
- OS Version: ${deviceInfo.version}
- Device: ${deviceInfo.deviceModel}
- App Version: ${deviceInfo.appVersion}
- User ID: ${user?.id || 'Not logged in'}

---
Reported via MusiStash Mobile App
      `.trim();

      const emailSubject = `Bug Report: ${categoryLabel}`;
      const mailtoLink = `mailto:support@musistash.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      const canOpen = await Linking.canOpenURL(mailtoLink);
      if (canOpen) {
        await Linking.openURL(mailtoLink);
        Alert.alert(
          'Bug Report Submitted',
          'Thank you for reporting this bug! Your email client should open with a pre-filled bug report. If it doesn\'t, please email support@musistash.com directly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setDescription('');
                setSteps('');
                setExpectedBehavior('');
                setSelectedCategory(null);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Email Not Available',
          'Please email support@musistash.com with the following information:\n\n' + emailBody,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert(
        'Error',
        'Failed to open email client. Please email support@musistash.com directly with your bug report.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>Report a Bug</Text>
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
            <Ionicons name="bug" size={40} color="#F59E0B" />
          </View>
          <Text style={styles.heroTitle}>Found a Bug?</Text>
          <Text style={styles.heroSubtitle}>
            Help us improve MusiStash by reporting issues you encounter
          </Text>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bug Category *</Text>
          <View style={styles.categoryGrid}>
            {bugCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === category.id ? '#F59E0B' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.categoryTextSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <Text style={styles.sectionSubtitle}>
            Describe the bug in detail. What happened?
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe the bug..."
            placeholderTextColor="#6B7280"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Steps to Reproduce */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Steps to Reproduce</Text>
          <Text style={styles.sectionSubtitle}>
            Help us reproduce the issue (optional)
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="1. Go to...\n2. Tap on...\n3. See error..."
            placeholderTextColor="#6B7280"
            value={steps}
            onChangeText={setSteps}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Expected Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Behavior</Text>
          <Text style={styles.sectionSubtitle}>
            What should have happened instead? (optional)
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe what you expected to happen..."
            placeholderTextColor="#6B7280"
            value={expectedBehavior}
            onChangeText={setExpectedBehavior}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Device Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Device Information</Text>
          <Text style={styles.infoText}>
            This information will be automatically included in your report
          </Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform:</Text>
              <Text style={styles.infoValue}>{Platform.OS}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>OS Version:</Text>
              <Text style={styles.infoValue}>{Platform.Version}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device:</Text>
              <Text style={styles.infoValue}>{getDeviceInfo().deviceModel}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version:</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedCategory || !description.trim() || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedCategory || !description.trim() || isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
          </Text>
        </TouchableOpacity>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle" size={16} color="#6B7280" />
          <Text style={styles.footerNoteText}>
            Your bug report will be sent via email. We typically respond within 24-48 hours.
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: '#F59E0B',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 100,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#3f3f46',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
    lineHeight: 18,
  },
});







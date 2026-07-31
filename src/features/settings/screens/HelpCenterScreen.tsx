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

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'How do I create an artist profile?',
    answer: 'To create an artist profile, go to your Profile tab, tap "Become an Artist" in the menu, and fill out your profile with your music, bio, and portfolio. Once created, you can showcase your work and connect with fans.',
  },
  {
    question: 'How do I become a service provider?',
    answer: 'Navigate to the menu and select "Become Service Provider". Complete the verification process, including Stripe account setup for payments. Once verified, you can create service listings and start receiving project requests.',
  },
  {
    question: 'How do payments work?',
    answer: 'All payments are processed securely through Stripe. When you hire a service provider, payment is held in escrow until the project is completed and approved. Service providers receive payment after successful delivery.',
  },
  {
    question: 'How do I use AI features?',
    answer: 'AI features are available in the AI Assistant section. You can analyze artists, find venues, and generate emails. First-time users will be asked for consent to process data for AI features. You can manage this in Settings.',
  },
  {
    question: 'How do I report inappropriate content?',
    answer: 'Tap the three dots (⋯) on any post or profile, then select "Report". Choose a reason and submit. Our moderation team reviews all reports and takes appropriate action.',
  },
  {
    question: 'How do I block a user?',
    answer: 'Go to the user\'s profile or tap the three dots on their post, then select "Block User". Blocked users cannot message you or see your content.',
  },
  {
    question: 'Can I delete my account?',
    answer: 'Yes. Go to Settings → Danger Zone → Delete Account. This will permanently delete all your data, posts, and profile. This action cannot be undone.',
  },
  {
    question: 'How do I contact support?',
    answer: 'You can contact us at support@musistash.com or use the Contact Support option in Settings. We typically respond within 24-48 hours.',
  },
  {
    question: 'What data does MusiStash collect?',
    answer: 'We collect account information, profile data, content you create, and usage analytics. We use this to provide and improve our services. You can read our full Privacy Policy in Settings for details.',
  },
  {
    question: 'How do I change my notification settings?',
    answer: 'Go to Settings → Notifications to manage your notification preferences. You can control which types of notifications you receive.',
  },
];

export default function HelpCenterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@musistash.com?subject=MusiStash%20Help%20Request');
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
        <Text style={styles.headerTitle}>Help Center</Text>
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
            <Ionicons name="help-circle" size={48} color="#3B82F6" />
          </View>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSubtitle}>
            Find answers to common questions about MusiStash
          </Text>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickLinksGrid}>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              <Ionicons name="shield-checkmark" size={24} color="#3B82F6" />
              <Text style={styles.quickLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('TermsOfService')}
            >
              <Ionicons name="document-text" size={24} color="#8B5CF6" />
              <Text style={styles.quickLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail" size={24} color="#10B981" />
              <Text style={styles.quickLinkText}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('ReportBug')}
            >
              <Ionicons name="bug" size={24} color="#F59E0B" />
              <Text style={styles.quickLinkText}>Report a Bug</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqData.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleItem(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestionText}>{item.question}</Text>
                <Ionicons
                  name={expandedItems.has(index) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
              {expandedItems.has(index) && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <View style={styles.contactCard}>
            <Ionicons name="chatbubbles" size={32} color="#3B82F6" />
            <Text style={styles.contactTitle}>Still need help?</Text>
            <Text style={styles.contactText}>
              Our support team is here to assist you. Reach out and we'll get back to you as soon as possible.
            </Text>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleContactSupport}
            >
              <Text style={styles.contactButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
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
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
  quickLinksSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLinkCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
    marginTop: 12,
    textAlign: 'center',
  },
  faqSection: {
    marginBottom: 32,
  },
  faqItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  contactSection: {
    marginBottom: 32,
  },
  contactCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  contactButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});







import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  
  const handleGoBack = () => {
    navigation.goBack();
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const Paragraph = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.paragraph}>{children}</Text>
  );

  const BulletList = ({ items }: { items: string[] }) => (
    <View style={styles.bulletList}>
      {items.map((item, index) => (
        <View key={index} style={styles.bulletItem}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#3B82F6" />
          </View>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.subtitle}>
            Your privacy is important to us. This policy explains how MusiStash collects, uses, and protects your personal information.
          </Text>
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>Effective Date: December 23, 2025</Text>
            <Text style={styles.metaText}>Last Updated: December 23, 2025</Text>
          </View>
        </View>

        <Section title="1. Introduction">
          <Paragraph>
            MusiStash, LLC ("MusiStash," "we," "us," or "our") operates the MusiStash mobile application and related services (collectively, the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
          </Paragraph>
          <Paragraph>
            Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please discontinue use of the Service immediately.
          </Paragraph>
        </Section>

        <Section title="2. Information We Collect">
          <Text style={styles.subSectionTitle}>Information You Provide</Text>
          <BulletList items={[
            "Account information: name, email address, phone number, username, and password",
            "Profile information: bio, profile photo, location, and music preferences",
            "Content you create: posts, comments, audio files, images, and messages",
            "Service provider information: business name, services offered, pricing, and portfolio",
            "Payment information: processed securely through Stripe (we do not store full card numbers)",
            "Communications: messages you send to other users or to our support team",
          ]} />

          <Text style={styles.subSectionTitle}>Information Collected Automatically</Text>
          <BulletList items={[
            "Device information: device type, operating system, unique device identifiers",
            "Usage data: features used, time spent, interactions, and navigation patterns",
            "Log data: IP address, browser type, pages visited, and crash reports",
            "Location data: approximate location based on IP address (precise location only with your consent)",
          ]} />

          <Text style={styles.subSectionTitle}>Information from Third Parties</Text>
          <BulletList items={[
            "Authentication providers: if you sign in with Apple, Google, or other OAuth providers",
            "Music services: data from Spotify, Last.fm, or other integrated platforms (with your permission)",
            "Payment processors: transaction status and limited payment information from Stripe",
            "Analytics providers: aggregated usage statistics",
          ]} />
        </Section>

        <Section title="3. How We Use Your Information">
          <Paragraph>We use the information we collect to:</Paragraph>
          <BulletList items={[
            "Provide, maintain, and improve our Service",
            "Process transactions and send related information",
            "Create and maintain your account",
            "Enable communication between users",
            "Personalize your experience and provide content recommendations",
            "Power AI features including artist analysis and venue recommendations",
            "Send you updates, security alerts, and support messages",
            "Send marketing communications (with your consent)",
            "Detect, prevent, and address fraud, abuse, and security issues",
            "Comply with legal obligations",
            "Analyze usage trends to improve our Service",
          ]} />
        </Section>

        <Section title="4. AI and Data Processing">
          <Paragraph>
            MusiStash uses artificial intelligence to enhance your experience. When you use AI features:
          </Paragraph>
          <BulletList items={[
            "Your queries and inputs are processed by our AI systems and third-party AI services",
            "We use data from music platforms (Spotify, Last.fm, Deezer) to generate insights",
            "AI-generated content is for informational purposes and may not be 100% accurate",
            "You can opt out of AI data processing in your Settings at any time",
          ]} />
          <Paragraph>
            We do not sell your personal information. AI features use your data solely to provide the requested service.
          </Paragraph>
        </Section>

        <Section title="5. How We Share Your Information">
          <Text style={styles.subSectionTitle}>We may share your information with:</Text>
          <BulletList items={[
            "Other users: your profile, posts, and public content are visible to other users",
            "Service providers: companies that help us operate our Service (hosting, analytics, support)",
            "Payment processors: Stripe processes all payments securely",
            "Business partners: when you use integrated third-party services",
            "Legal authorities: when required by law or to protect our rights",
            "Business transfers: in connection with a merger, acquisition, or sale of assets",
          ]} />
          <Paragraph>
            We require all third parties to respect the security of your personal data and treat it in accordance with applicable law.
          </Paragraph>
        </Section>

        <Section title="6. Data Security">
          <Paragraph>
            We implement appropriate technical and organizational measures to protect your personal information, including:
          </Paragraph>
          <BulletList items={[
            "Encryption of data in transit using TLS/SSL",
            "Secure storage with access controls",
            "Regular security assessments and updates",
            "Employee training on data protection",
          ]} />
          <Paragraph>
            However, no method of transmission over the Internet is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
          </Paragraph>
        </Section>

        <Section title="7. Data Retention">
          <Paragraph>
            We retain your personal information for as long as necessary to:
          </Paragraph>
          <BulletList items={[
            "Provide our Service to you",
            "Comply with legal obligations",
            "Resolve disputes and enforce our agreements",
            "Protect against fraud and abuse",
          ]} />
          <Paragraph>
            When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal or legitimate business purposes.
          </Paragraph>
        </Section>

        <Section title="8. Your Rights and Choices">
          <Text style={styles.subSectionTitle}>You have the right to:</Text>
          <BulletList items={[
            "Access: request a copy of the personal information we hold about you",
            "Correction: request correction of inaccurate personal information",
            "Deletion: request deletion of your personal information",
            "Portability: receive your data in a structured, machine-readable format",
            "Opt-out: unsubscribe from marketing communications at any time",
            "Withdraw consent: revoke any consent you have given us",
          ]} />
          <Paragraph>
            To exercise these rights, please contact us at privacy@musistash.com or use the settings in the app.
          </Paragraph>
        </Section>

        <Section title="9. California Privacy Rights (CCPA)">
          <Paragraph>
            If you are a California resident, you have additional rights under the California Consumer Privacy Act:
          </Paragraph>
          <BulletList items={[
            "Right to know what personal information we collect, use, and disclose",
            "Right to delete personal information we have collected",
            "Right to opt-out of the sale of personal information (we do not sell your data)",
            "Right to non-discrimination for exercising your privacy rights",
          ]} />
        </Section>

        <Section title="10. International Users (GDPR)">
          <Paragraph>
            If you are located in the European Economic Area (EEA), UK, or Switzerland, you have additional rights under the General Data Protection Regulation:
          </Paragraph>
          <BulletList items={[
            "Legal basis: we process your data based on consent, contract, legal obligation, or legitimate interests",
            "Data transfers: we may transfer data outside the EEA using standard contractual clauses",
            "Supervisory authority: you have the right to lodge a complaint with your local data protection authority",
          ]} />
        </Section>

        <Section title="11. Children's Privacy">
          <Paragraph>
            Our Service is not directed to children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children. If we learn we have collected information from a child without verification of parental consent, we will delete it. If you believe we have collected information from a child, please contact us.
          </Paragraph>
        </Section>

        <Section title="12. Changes to This Policy">
          <Paragraph>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
          </Paragraph>
        </Section>

        <Section title="13. Contact Us">
          <Paragraph>
            If you have questions about this Privacy Policy or our privacy practices, please contact us:
          </Paragraph>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={18} color="#3B82F6" />
              <Text style={styles.contactText}>privacy@musistash.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="business" size={18} color="#3B82F6" />
              <Text style={styles.contactText}>MusiStash, LLC</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="globe" size={18} color="#3B82F6" />
              <TouchableOpacity onPress={() => Linking.openURL('https://musistash.com')}>
                <Text style={[styles.contactText, styles.link]}>www.musistash.com</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Section>
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  metaContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginTop: 16,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 24,
    marginBottom: 16,
  },
  bulletList: {
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginTop: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#E5E7EB',
    marginLeft: 12,
  },
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});

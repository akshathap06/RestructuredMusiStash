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

export default function TermsOfServiceScreen({ navigation }: any) {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
            <Ionicons name="document-text" size={40} color="#8B5CF6" />
          </View>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.subtitle}>
            Please read these terms carefully before using MusiStash. By using our service, you agree to these terms.
          </Text>
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>Effective Date: December 23, 2025</Text>
            <Text style={styles.metaText}>MusiStash, LLC</Text>
          </View>
        </View>

        <Section title="1. Agreement to Terms">
          <Paragraph>
            These Terms of Service ("Terms") constitute a legally binding agreement between you and MusiStash, LLC ("MusiStash," "we," "us," or "our") governing your access to and use of the MusiStash mobile application and related services (collectively, the "Service").
          </Paragraph>
          <Paragraph>
            By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Service.
          </Paragraph>
        </Section>

        <Section title="2. Description of Service">
          <Paragraph>
            MusiStash is a platform designed for the music industry that enables:
          </Paragraph>
          <BulletList items={[
            "Artists to showcase their work, connect with fans, and find opportunities",
            "Service providers to offer music-related services (production, mixing, mastering, etc.)",
            "Users to discover artists, hire service providers, and engage with the music community",
            "AI-powered tools for artist analysis, venue discovery, and email generation",
          ]} />
          <Paragraph>
            MusiStash acts as a marketplace and technology platform. We are not a party to contracts between users, and we do not guarantee any specific outcomes, earnings, or results.
          </Paragraph>
        </Section>

        <Section title="3. Eligibility">
          <Paragraph>
            To use the Service, you must:
          </Paragraph>
          <BulletList items={[
            "Be at least 13 years old (or the minimum age required in your jurisdiction)",
            "Have parental or guardian consent if you are under 18",
            "Be at least 18 years old to use financial features or become a service provider",
            "Have the legal capacity to enter into a binding agreement",
            "Not be prohibited from using the Service under applicable laws",
          ]} />
        </Section>

        <Section title="4. Account Registration and Security">
          <Paragraph>
            When you create an account, you agree to:
          </Paragraph>
          <BulletList items={[
            "Provide accurate, current, and complete information",
            "Maintain and promptly update your account information",
            "Keep your password secure and confidential",
            "Notify us immediately of any unauthorized access or security breach",
            "Accept responsibility for all activities that occur under your account",
          ]} />
          <Paragraph>
            We reserve the right to suspend or terminate accounts that violate these Terms, contain false information, or engage in fraudulent activity.
          </Paragraph>
        </Section>

        <Section title="5. User Roles and Responsibilities">
          <Text style={styles.subSectionTitle}>Artists</Text>
          <Paragraph>
            As an artist on MusiStash, you are responsible for the accuracy and legality of your profile, content, and any claims you make about your work, achievements, or capabilities.
          </Paragraph>

          <Text style={styles.subSectionTitle}>Service Providers</Text>
          <Paragraph>
            As a service provider, you agree to:
          </Paragraph>
          <BulletList items={[
            "Accurately represent your services, skills, and experience",
            "Deliver services as described and within agreed timelines",
            "Maintain all necessary licenses, permits, and insurance",
            "Comply with all applicable laws and regulations",
            "Handle client data responsibly and confidentially",
            "Complete Stripe verification to receive payments",
          ]} />

          <Text style={styles.subSectionTitle}>Clients</Text>
          <Paragraph>
            As a client using service providers, you agree to provide clear project requirements, make timely payments, and communicate respectfully with service providers.
          </Paragraph>
        </Section>

        <Section title="6. Payments and Fees">
          <Paragraph>
            All payments are processed through Stripe. By using our payment features, you agree to:
          </Paragraph>
          <BulletList items={[
            "Provide accurate payment information",
            "Authorize charges to your payment method for purchases",
            "Pay all applicable fees, including platform fees if any",
            "Accept that refunds are subject to our refund policy and provider agreements",
          ]} />
          <Paragraph>
            Service providers receive payment after successful delivery and client approval. MusiStash may charge platform fees on transactions as disclosed at the time of purchase.
          </Paragraph>
        </Section>

        <Section title="7. Content and Intellectual Property">
          <Text style={styles.subSectionTitle}>Your Content</Text>
          <Paragraph>
            You retain ownership of content you upload to MusiStash. By uploading content, you grant us a worldwide, non-exclusive, royalty-free license to:
          </Paragraph>
          <BulletList items={[
            "Host, store, and display your content on the Service",
            "Reproduce and distribute your content to provide the Service",
            "Process your content with AI features you choose to use",
            "Use your content to promote MusiStash (with your profile visible)",
          ]} />

          <Text style={styles.subSectionTitle}>Content Restrictions</Text>
          <Paragraph>
            You may not upload content that:
          </Paragraph>
          <BulletList items={[
            "Infringes on intellectual property rights of others",
            "Contains illegal, harmful, or offensive material",
            "Includes spam, malware, or deceptive content",
            "Violates the privacy or rights of any person",
            "Promotes violence, discrimination, or illegal activities",
          ]} />
        </Section>

        <Section title="8. AI Features and Data Processing">
          <Paragraph>
            MusiStash offers AI-powered features. By using these features, you acknowledge that:
          </Paragraph>
          <BulletList items={[
            "Your inputs may be processed by AI systems and third-party services",
            "AI outputs are informational only and not professional advice",
            "Results may not be 100% accurate",
            "You can opt out of AI data processing in your Settings",
          ]} />
        </Section>

        <Section title="9. Prohibited Conduct">
          <Paragraph>
            You agree not to:
          </Paragraph>
          <BulletList items={[
            "Violate any applicable laws or regulations",
            "Impersonate any person or entity",
            "Harass, abuse, or harm other users",
            "Interfere with or disrupt the Service",
            "Attempt to gain unauthorized access to our systems",
            "Use automated means to access the Service without permission",
            "Bypass fees, abuse promotions, or engage in fraud",
            "Reverse engineer or copy our technology",
            "Use the Service for any illegal purpose",
          ]} />
        </Section>

        <Section title="10. Termination">
          <Paragraph>
            You may terminate your account at any time through the Settings page. We may suspend or terminate your access to the Service at any time, with or without cause, including for:
          </Paragraph>
          <BulletList items={[
            "Violation of these Terms",
            "Fraudulent or illegal activity",
            "Extended periods of inactivity",
            "At our sole discretion for any reason",
          ]} />
          <Paragraph>
            Upon termination, your right to use the Service will immediately cease. Provisions that by their nature should survive termination will survive.
          </Paragraph>
        </Section>

        <Section title="11. Disclaimers">
          <View style={styles.disclaimerBox}>
            <Paragraph>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </Paragraph>
            <Paragraph>
              WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE ARE NOT RESPONSIBLE FOR THE ACTIONS OR CONTENT OF THIRD PARTIES OR OTHER USERS.
            </Paragraph>
          </View>
        </Section>

        <Section title="12. Limitation of Liability">
          <View style={styles.disclaimerBox}>
            <Paragraph>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MUSISTASH AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION.
            </Paragraph>
            <Paragraph>
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF $100 OR THE AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE.
            </Paragraph>
          </View>
        </Section>

        <Section title="13. Indemnification">
          <Paragraph>
            You agree to indemnify, defend, and hold harmless MusiStash and its affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
          </Paragraph>
          <BulletList items={[
            "Your use of the Service",
            "Your content or services provided through the platform",
            "Your violation of these Terms",
            "Your violation of any third-party rights",
          ]} />
        </Section>

        <Section title="14. Dispute Resolution">
          <Paragraph>
            These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.
          </Paragraph>
          <Paragraph>
            Any dispute arising from these Terms or the Service shall be resolved through binding arbitration on an individual basis, in accordance with the American Arbitration Association's rules. You waive the right to participate in class actions or jury trials.
          </Paragraph>
        </Section>

        <Section title="15. Changes to Terms">
          <Paragraph>
            We may modify these Terms at any time. We will provide notice of material changes by posting the updated Terms and changing the "Effective Date." Your continued use of the Service after changes constitutes acceptance of the modified Terms.
          </Paragraph>
        </Section>

        <Section title="16. General Provisions">
          <BulletList items={[
            "Entire Agreement: These Terms and our Privacy Policy constitute the entire agreement between you and MusiStash",
            "Severability: If any provision is found unenforceable, the remaining provisions will continue in effect",
            "Waiver: Failure to enforce any right does not waive that right",
            "Assignment: You may not assign your rights under these Terms without our consent",
          ]} />
        </Section>

        <Section title="17. Contact Us">
          <Paragraph>
            If you have questions about these Terms, please contact us:
          </Paragraph>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={18} color="#8B5CF6" />
              <Text style={styles.contactText}>legal@musistash.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="help-circle" size={18} color="#8B5CF6" />
              <Text style={styles.contactText}>support@musistash.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="business" size={18} color="#8B5CF6" />
              <Text style={styles.contactText}>MusiStash, LLC</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="globe" size={18} color="#8B5CF6" />
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
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
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
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  contactCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
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
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
});

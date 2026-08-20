import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
// ============================================
// FEATURE-BASED IMPORTS (Organized by Feature)
// ============================================

// --- Auth Feature ---
import { AuthProvider, useAuth } from './src/features/auth/AuthContext';
import LoginScreen from './src/features/auth/screens/LoginScreen';
import RegisterScreen from './src/features/auth/screens/RegisterScreen';
import EmailVerificationScreen from './src/features/auth/screens/EmailVerificationScreen';
import CompleteRegistrationScreen from './src/features/auth/screens/CompleteRegistrationScreen';
import OnboardingScreen from './src/features/auth/screens/OnboardingScreen';
import CheckYourEmailScreen from './src/features/auth/screens/CheckYourEmailScreen';
import ResetPasswordScreen from './src/features/auth/screens/ResetPasswordScreen';
import TermsOfServiceScreen from './src/features/auth/screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/features/auth/screens/PrivacyPolicyScreen';
import IntroScreenNew from './src/features/auth/screens/IntroScreenNew';
import WelcomeCarouselScreen from './src/features/auth/screens/WelcomeCarouselScreen';
import RoleSelectionScreen from './src/features/auth/screens/RoleSelectionScreen';
import ArtistOnboardingScreen from './src/features/auth/screens/ArtistOnboardingScreen';
import ArtistOnboardingCompleteScreen from './src/features/auth/screens/ArtistOnboardingCompleteScreen';
import ServiceProviderOnboardingScreen from './src/features/auth/screens/ServiceProviderOnboardingScreen';
import ServiceProviderOnboardingCompleteScreen from './src/features/auth/screens/ServiceProviderOnboardingCompleteScreen';

// --- Profile Feature ---
import ProfileScreen from './src/features/profile/screens/ProfileScreen';
import SearchScreen from './src/features/profile/screens/SearchScreen';
import { ProductionProfileService } from './src/features/profile/services/productionProfileService';

// --- Artists Feature ---
import BrowseArtistsScreen from './src/features/artists/screens/BrowseArtistsScreen';
import ArtistProfileScreen from './src/features/artists/screens/ArtistProfileScreen';
import ArtistExperienceScreen from './src/features/artists/screens/ArtistExperienceScreen';
import CreateArtistScreen from './src/features/artists/screens/CreateArtistScreen';
import CreateArtistProjectScreen from './src/features/artists/screens/CreateArtistProjectScreen';
import { ApprovedArtistsService } from './src/features/artists/services/approvedArtistsService';
// ArtistProfileViewScreen retained in repo; public route uses ArtistExperienceScreen

// --- Service Providers Feature ---
import ServiceProviderScreen from './src/features/service-providers/screens/ServiceProviderScreen';
import ServiceProvidersScreen from './src/features/service-providers/screens/ServiceProvidersScreen';
import ServiceProviderDetailScreen from './src/features/service-providers/screens/ServiceProviderDetailScreen';
import CreateServiceProviderScreen from './src/features/service-providers/screens/CreateServiceProviderScreen';
import ServiceProviderDashboardScreen from './src/features/service-providers/screens/ServiceProviderDashboardScreen';
import ServiceProviderRequestsScreen from './src/features/service-providers/screens/ServiceProviderRequestsScreen';
import ContactServiceProviderScreen from './src/features/service-providers/screens/ContactServiceProviderScreen';
import ManageServicesScreen from './src/features/service-providers/screens/ManageServicesScreen';
import ManagePortfolioScreen from './src/features/service-providers/screens/ManagePortfolioScreen';

// --- Projects Feature ---
import ProjectRequestsScreen from './src/features/projects/screens/ProjectRequestsScreen';
import ProjectRequestDetailsScreen from './src/features/projects/screens/ProjectRequestDetailsScreen';
import ProjectSubmissionScreen from './src/features/projects/screens/ProjectSubmissionScreen';
import NewWorkSubmissionScreen from './src/features/projects/screens/NewWorkSubmissionScreen';
import ClientWorkViewScreen from './src/features/projects/screens/ClientWorkViewScreen';
import SubmitWorkScreen from './src/features/projects/screens/SubmitWorkScreen';
import RequestRevisionScreen from './src/features/projects/screens/RequestRevisionScreen';
import { WorkSubmissionScreen } from './src/features/projects/screens/WorkSubmissionScreen';

// --- Delivery Feature ---
import ClientDeliveryScreen from './src/features/delivery/screens/ClientDeliveryScreen';
import ClientDeliveryListScreen from './src/features/delivery/screens/ClientDeliveryListScreen';
import DeliveryPreviewScreen from './src/features/delivery/screens/DeliveryPreviewScreen';
import { DeliveryScreen } from './src/features/delivery/screens/DeliveryScreen';

// --- Payments Feature ---
import { StripeProvider } from './src/features/payments/StripeContext';
import { PaymentScreen } from './src/features/payments/screens/PaymentScreen';
import { PaymentReceiptScreen } from './src/features/payments/screens/PaymentReceiptScreen';
import ProviderEarningsScreen from './src/features/payments/screens/ProviderEarningsScreen';
import SimpleEarningsScreen from './src/features/payments/screens/SimpleEarningsScreen';
import MyOrdersScreen from './src/features/payments/screens/MyOrdersScreen';

// --- Posts Feature ---
import PostsScreen from './src/features/posts/screens/PostsScreen';
import CreatePostScreen from './src/features/posts/screens/CreatePostScreen';
import CreateHubScreen from './src/features/posts/screens/CreateHubScreen';
import PostDetailScreen from './src/features/posts/screens/PostDetailScreen';

// --- Messaging Feature ---
import MessagesScreen from './src/features/messaging/screens/MessagesScreen';
import NewMessageScreen from './src/features/messaging/screens/NewMessageScreen';
import ChatScreen from './src/features/messaging/screens/ChatScreen';

// --- Notifications Feature ---
import { NotificationsScreen } from './src/features/notifications/screens/NotificationsScreen';

// --- Settings Feature ---
import SettingsScreen from './src/features/settings/screens/SettingsScreen';
import ProfileSettingsScreen from './src/features/settings/screens/ProfileSettingsScreen';
import BlockedUsersScreen from './src/features/settings/screens/BlockedUsersScreen';
import HelpCenterScreen from './src/features/settings/screens/HelpCenterScreen';
import ReportBugScreen from './src/features/settings/screens/ReportBugScreen';
import OpenSourceLicensesScreen from './src/features/settings/screens/OpenSourceLicensesScreen';
import ChangelogScreen from './src/features/settings/screens/ChangelogScreen';

// --- Files Feature ---
import { FileTransferPortalScreen } from './src/features/files/screens/FileTransferPortalScreen';

// --- AI Feature ---
import AgenticManagerScreen from './src/features/ai/screens/AgenticManagerScreen';

// --- Investment Feature (legacy; gated) ---
import CampaignBrowseScreen from './src/features/investments/screens/CampaignBrowseScreen';
import CampaignDetailScreen from './src/features/investments/screens/CampaignDetailScreen';
import SharePurchaseScreen from './src/features/investments/screens/SharePurchaseScreen';
import InvestorDashboardScreen from './src/features/investments/screens/InvestorDashboardScreen';

// --- V2 Paper Trading / Explore / Waitlist ---
import PortfolioScreen from './src/features/paper-trading/screens/PortfolioScreen';
import PaperTradeScreen from './src/features/paper-trading/screens/PaperTradeScreen';
import ProjectDetailScreen from './src/features/paper-trading/screens/ProjectDetailScreen';
import ExploreScreen from './src/features/explore/screens/ExploreScreen';
import WaitlistScreen from './src/features/waitlist/screens/WaitlistScreen';
import { featureFlags } from './src/config/featureFlags';

// --- Shared Components ---
import ErrorBoundary from './src/shared/components/ErrorBoundary';

// --- Core ---
import { Platform, Linking } from 'react-native';

// Animated Splash Screen Component
const AnimatedSplash = ({ children, isReady }: { children: React.ReactNode; isReady: boolean }) => {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // After 1.5 seconds, fade out splash
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <Animated.View 
        style={{
          flex: 1,
          opacity: fadeAnim,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      >
        <ImageBackground
          source={require('./assets/splash-cover.png')}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          resizeMode="cover"
        >
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            {/* Logo is already in the background image */}
          </Animated.View>
        </ImageBackground>
      </Animated.View>
    );
  }

  return <>{children}</>;
};
import { View, TouchableOpacity, StyleSheet, Modal, Text, Animated, Dimensions, ScrollView, Image, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Conditionally import StripePaymentService for mobile only
let StripePaymentService: any = null;
if (Platform.OS !== 'web') {
  StripePaymentService = require('./src/features/payments/services/stripePaymentService').default;
}


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

// Menu item configurations — V2 paper product (marketplace items gated)
const MAIN_MENU_ITEMS = [
  ...(featureFlags.AGENTIC_MANAGER_ENABLED
    ? [{ icon: 'flash', label: 'Agentic Manager', route: 'AgenticManager', colors: ['#8B5CF6', '#7C3AED', '#6D28D9'] }]
    : []),
  { icon: 'wallet', label: 'Portfolio', route: 'Portfolio', colors: ['#8B5CF6', '#7C3AED', '#A78BFA'] },
  { icon: 'compass', label: 'Explore', route: 'Explore', colors: ['#8B5CF6', '#7C3AED', '#A78BFA'] },
  { icon: 'person', label: 'Profile', route: 'Profile', colors: ['#8B5CF6', '#7C3AED', '#A78BFA'] },
  { icon: 'add-circle', label: 'Create', route: 'Create', colors: ['#8B5CF6', '#06B6D4', '#14B8A6'] },
  ...(featureFlags.WAITLIST_ENABLED
    ? [{ icon: 'mail', label: 'Join Waitlist', route: 'Waitlist', colors: ['#8B5CF6', '#A78BFA', '#7C3AED'] }]
    : []),
  ...(featureFlags.MARKETPLACE_ENABLED
    ? [
        { icon: 'document-text', label: 'My Requests', route: 'ProjectRequests', colors: ['#8B5CF6', '#7C3AED', '#6D28D9'] },
        { icon: 'cube', label: 'My Orders', route: 'MyOrders', colors: ['#8B5CF6', '#A78BFA', '#7C3AED'] },
      ]
    : []),
];

const BECOME_MENU_ITEMS = [
  { icon: 'person-add', label: 'Become an Artist', route: 'CreateArtist', colors: ['#10B981', '#22C55E', '#14B8A6'] },
  ...(featureFlags.MARKETPLACE_ENABLED
    ? [{ icon: 'briefcase', label: 'Become Service Provider', route: 'CreateServiceProvider', colors: ['#06B6D4', '#0EA5E9', '#8B5CF6'] }]
    : []),
];

const BROWSE_MENU_ITEMS = [
  { icon: 'people', label: 'Browse Artists', route: 'BrowseArtists', colors: ['#8B5CF6', '#7C3AED', '#A78BFA'] },
  { icon: 'star', label: 'Kaleb (Demo Profile)', route: 'ArtistExperience', colors: ['#8B5CF6', '#A78BFA', '#7C3AED'] },
];

const BOTTOM_MENU_ITEMS = [
  { icon: 'notifications', label: 'Notifications', route: 'Notifications', hasNotification: true },
  { icon: 'settings', label: 'Settings', route: 'Settings' },
  { icon: 'log-out', label: 'Log Out', route: 'Logout', danger: true },
];

// Universal header with hamburger menu for all tabs
function UniversalHeader({ navigation, title, subtitle }: { navigation: any, title: string, subtitle?: string }) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-340))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const glowAnim = useState(new Animated.Value(0.6))[0];

  // Pulsing glow animation for avatar
  React.useEffect(() => {
    if (isMenuVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isMenuVisible]);

  const handleMenuPress = () => {
    setIsMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -340,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuVisible(false);
    });
  };

  const handleMenuItemPress = (route: string) => {
    handleCloseMenu();
    
    if (route === 'Logout') {
      signOut();
      return;
    }
    
    // Handle navigation to different screens with proper tab/screen navigation
    setTimeout(() => {
      switch (route) {
        case 'Profile':
          navigation.navigate('MainTabs', { screen: 'Profile' });
          break;
        case 'Portfolio':
          navigation.navigate('MainTabs', { screen: 'Portfolio' });
          break;
        case 'Explore':
          navigation.navigate('MainTabs', { screen: 'Explore' });
          break;
        case 'Create':
          navigation.navigate('MainTabs', { screen: 'Create' });
          break;
        case 'BrowseArtists':
          navigation.navigate('BrowseArtists');
          break;
        case 'ArtistExperience':
          navigation.navigate('ArtistExperience', { artistId: 'artist_kaleb' });
          break;
        case 'Waitlist':
          navigation.navigate('Waitlist');
          break;
        case 'AgenticManager':
          if (featureFlags.AGENTIC_MANAGER_ENABLED) navigation.navigate('AgenticManager');
          break;
        case 'CreateServiceProvider':
          if (featureFlags.MARKETPLACE_ENABLED) navigation.navigate('CreateServiceProvider');
          break;
        case 'CreateArtist':
          navigation.navigate('CreateArtist');
          break;
        case 'ProjectRequests':
          if (featureFlags.MARKETPLACE_ENABLED) navigation.navigate('ProjectRequests');
          break;
        case 'MyOrders':
          if (featureFlags.MARKETPLACE_ENABLED) navigation.navigate('MyOrders');
          break;
        case 'Notifications':
          navigation.navigate('Notifications');
          break;
        case 'Settings':
          navigation.navigate('Settings');
          break;
        default:
          console.log(`Route not configured: ${route}`);
      }
    }, 300); // Wait for menu close animation
  };

  const renderMenuItem = (item: any, index: number, hasGradient: boolean = true) => (
    <TouchableOpacity
      key={index}
      style={sidebarStyles.menuItem}
      onPress={() => handleMenuItemPress(item.route)}
      activeOpacity={0.7}
    >
      {hasGradient ? (
        <View style={[sidebarStyles.menuIconBox, { backgroundColor: item.colors[1] }]}>
          <Ionicons name={item.icon as any} size={18} color="#FFFFFF" />
        </View>
      ) : (
        <View style={[sidebarStyles.menuIconBoxSimple, item.danger && sidebarStyles.menuIconBoxDanger]}>
          <Ionicons 
            name={item.icon as any} 
            size={18} 
            color={item.danger ? '#F87171' : '#9CA3AF'} 
          />
          {item.hasNotification && <View style={sidebarStyles.notificationDot} />}
        </View>
      )}
      <Text style={[
        sidebarStyles.menuItemText, 
        item.danger && sidebarStyles.menuItemTextDanger
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
          <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.headerCenter}>
        <Image 
          source={require('./assets/logo-final.png')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.headerRight}>
        {/* Empty view for layout balance */}
      </View>
      
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseMenu}
      >
        <Animated.View style={[sidebarStyles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={sidebarStyles.backdrop} 
            activeOpacity={1} 
            onPress={handleCloseMenu}
          />
          <Animated.View style={[sidebarStyles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
            {/* Header */}
            <View style={sidebarStyles.header}>
              <View style={sidebarStyles.headerContent}>
                <View style={sidebarStyles.avatarWrapper}>
                  <Animated.View style={[sidebarStyles.avatarGlow, { opacity: glowAnim }]} />
                  <View style={sidebarStyles.avatarBorder}>
                    <View style={sidebarStyles.avatar}>
                      <Ionicons name="person" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
                <View style={sidebarStyles.userInfo}>
                  <Text style={sidebarStyles.userName} numberOfLines={1}>
                    {user?.name || 'Welcome Back'}
                  </Text>
                  <Text style={sidebarStyles.userEmail} numberOfLines={1}>
                    {user?.email || 'music@musistash.com'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={sidebarStyles.closeButton} onPress={handleCloseMenu}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Menu Content */}
            <ScrollView 
              style={sidebarStyles.scrollView}
              contentContainerStyle={sidebarStyles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Main Actions */}
              <View style={sidebarStyles.menuSection}>
                {MAIN_MENU_ITEMS.map((item, index) => renderMenuItem(item, index, true))}
              </View>

              {/* Become Section */}
              <View style={sidebarStyles.menuSection}>
                <Text style={sidebarStyles.sectionLabel}>BECOME</Text>
                {BECOME_MENU_ITEMS.map((item, index) => renderMenuItem(item, index, true))}
              </View>

              {/* Browse Section */}
              <View style={sidebarStyles.menuSection}>
                <Text style={sidebarStyles.sectionLabel}>BROWSE</Text>
                {BROWSE_MENU_ITEMS.map((item, index) => renderMenuItem(item, index, true))}
              </View>

              {/* Divider */}
              <View style={sidebarStyles.divider} />

              {/* Bottom Actions */}
              <View style={sidebarStyles.menuSection}>
                {BOTTOM_MENU_ITEMS.map((item, index) => renderMenuItem(item, index, false))}
              </View>

              {/* Footer inside scroll */}
              <View style={sidebarStyles.footer}>
                <View style={sidebarStyles.statusPill}>
                  <View style={sidebarStyles.statusDot} />
                  <Text style={sidebarStyles.statusText}>All Systems Operational</Text>
                </View>
                <Text style={sidebarStyles.versionText}>MusiStash v1.0.0</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

// Premium Sidebar Styles
const sidebarStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 340,
    backgroundColor: '#030712',
    borderRightWidth: 1,
    borderRightColor: 'rgba(55, 65, 81, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    backgroundColor: '#3B82F6',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  menuContent: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuIconBoxSimple: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuIconBoxDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  menuItemTextDanger: {
    color: '#F87171',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#030712',
  },
  divider: {
    height: 1,
    marginVertical: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
  },
  footer: {
    marginTop: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  versionText: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 8,
  },
});

// Profile Stack Navigator
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <ProfileStack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="ArtistProfile" 
        component={ArtistProfileScreen}
        options={{ title: 'Artist Profile' }}
      />
      <ProfileStack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="ProfileSettings" 
        component={ProfileSettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="BlockedUsers" 
        component={BlockedUsersScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="HelpCenter" 
        component={HelpCenterScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="ReportBug" 
        component={ReportBugScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="OpenSourceLicenses" 
        component={OpenSourceLicensesScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="Changelog" 
        component={ChangelogScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="TermsOfService" 
        component={TermsOfServiceScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
}

// Tab navigator for main authenticated screens
function MainTabs({ navigation: parentNavigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      initialRouteName="Explore"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Portfolio') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Create') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#262626',
          borderTopWidth: 0.5,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          height: 58 + Math.max(insets.bottom, 8),
          paddingHorizontal: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: true,
        lazy: false, // Don't lazy load tabs to maintain state
        unmountOnBlur: false, // Keep screens mounted when switching tabs
      })}
    >
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={({ navigation }) => ({
          header: () => (
            <UniversalHeader navigation={navigation} title="Portfolio" subtitle="Paper trading" />
          ),
        })}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={({ navigation }) => ({
          header: () => (
            <UniversalHeader navigation={navigation} title="Explore" subtitle="" />
          ),
        })}
        initialParams={{ parentNavigation }}
      />
      <Tab.Screen
        name="Create"
        component={CreateHubScreen}
        options={({ navigation }) => ({
          header: () => (
            <UniversalHeader navigation={navigation} title="Create" subtitle="" />
          ),
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={({ navigation }) => ({
          header: () => (
            <UniversalHeader navigation={navigation} title="Profile" subtitle="" />
          ),
        })}
      />
    </Tab.Navigator>
  );
}

// Main authenticated stack that wraps the tabs
function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#000000',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={({ navigation }: any) => <MainTabs navigation={navigation} />}
      />
      <Stack.Screen
        name="ArtistProfileView"
        component={ArtistExperienceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ArtistExperience"
        component={ArtistExperienceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BrowseArtists"
        component={BrowseArtistsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PaperTrade"
        component={PaperTradeScreen}
        options={{
          headerShown: true,
          title: 'Paper trade',
          headerStyle: { backgroundColor: '#070709' },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Waitlist"
        component={WaitlistScreen}
        options={{
          headerShown: true,
          title: 'Launch waitlist',
          headerStyle: { backgroundColor: '#070709' },
          headerTintColor: '#FFFFFF',
        }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateArtist"
        component={CreateArtistScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateArtistProject"
        component={CreateArtistProjectScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReportBug"
        component={ReportBugScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OpenSourceLicenses"
        component={OpenSourceLicensesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Changelog"
        component={ChangelogScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ headerShown: false }}
      />
      {featureFlags.AGENTIC_MANAGER_ENABLED && (
        <Stack.Screen
          name="AgenticManager"
          component={AgenticManagerScreen}
          options={{ headerShown: false }}
        />
      )}
      {featureFlags.MESSAGING_ENABLED && (
        <>
          <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="NewMessage" component={NewMessageScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        </>
      )}
      {featureFlags.MARKETPLACE_ENABLED && (
        <>
          <Stack.Screen name="ServiceProvider" component={ServiceProviderScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ServiceProviderDetail" component={ServiceProviderDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateServiceProvider" component={CreateServiceProviderScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ContactServiceProvider" component={ContactServiceProviderScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProjectRequests" component={ProjectRequestsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ServiceProviderRequests" component={ServiceProviderRequestsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ManageServices" component={ManageServicesScreen} options={{ headerShown: true, title: 'Manage Services', headerStyle: { backgroundColor: '#000000' }, headerTintColor: '#FFFFFF' }} />
          <Stack.Screen name="ManagePortfolio" component={ManagePortfolioScreen} options={{ headerShown: true, title: 'Portfolio', headerStyle: { backgroundColor: '#000000' }, headerTintColor: '#FFFFFF' }} />
          <Stack.Screen name="ProviderEarnings" component={ProviderEarningsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SimpleEarnings" component={SimpleEarningsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProjectRequestDetails" component={ProjectRequestDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PaymentScreen" component={PaymentScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Delivery" component={DeliveryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="WorkSubmissionScreen" component={WorkSubmissionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="FileTransferPortalScreen" component={FileTransferPortalScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PaymentReceiptScreen" component={PaymentReceiptScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProjectSubmission" component={ProjectSubmissionScreen} options={{ headerShown: true, title: 'Submit Work', headerStyle: { backgroundColor: '#000000' }, headerTintColor: '#FFFFFF' }} />
          <Stack.Screen name="ClientDelivery" component={ClientDeliveryScreen} options={{ headerShown: true, title: 'Project Delivery', headerStyle: { backgroundColor: '#000000' }, headerTintColor: '#FFFFFF' }} />
          <Stack.Screen name="ClientDeliveryList" component={ClientDeliveryListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DeliveryPreview" component={DeliveryPreviewScreen} options={{ headerShown: false }} />
          <Stack.Screen name="NewWorkSubmission" component={NewWorkSubmissionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SubmitWork" component={SubmitWorkScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ClientWorkView" component={ClientWorkViewScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RequestRevision" component={RequestRevisionScreen} options={{ headerShown: false }} />
        </>
      )}
      {(featureFlags.LEGACY_INVESTMENT_UI || featureFlags.PAPER_TRADING_ENABLED) && (
        <>
          <Stack.Screen name="CampaignBrowse" component={CampaignBrowseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="InvestorDashboard" component={InvestorDashboardScreen} options={{ headerShown: false }} />
        </>
      )}
      {featureFlags.LEGACY_INVESTMENT_UI && (
        <Stack.Screen name="SharePurchase" component={SharePurchaseScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

// Authentication stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeCarouselScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Intro" 
        component={IntroScreenNew}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EmailVerification" 
        component={EmailVerificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CompleteRegistration" 
        component={CompleteRegistrationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CheckYourEmail" 
        component={CheckYourEmailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ResetPassword" 
        component={ResetPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TermsOfService" 
        component={TermsOfServiceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RoleSelection" 
        component={RoleSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ArtistOnboarding" 
        component={ArtistOnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ArtistOnboardingComplete" 
        component={ArtistOnboardingCompleteScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ServiceProviderOnboarding" 
        component={ServiceProviderOnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ServiceProviderOnboardingComplete" 
        component={ServiceProviderOnboardingCompleteScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Main" 
        component={MainStack}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Main app component
function AppContent() {
  const { isAuthenticated, isLoading, user, isPasswordRecovery, needsOnboarding } = useAuth();
  const navigationRef = React.useRef<any>(null);

  // Debug logging with more detail
  console.log('🎬 AppContent render:', { 
    isLoading, 
    isAuthenticated, 
    hasUser: !!user,
    userEmail: user?.email,
    isPasswordRecovery,
    needsOnboarding
  });

  // Handle password recovery navigation
  React.useEffect(() => {
    if (isPasswordRecovery && navigationRef.current) {
      console.log('🔐 Navigating to ResetPassword screen...');
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        if (navigationRef.current?.isReady()) {
          navigationRef.current.navigate('ResetPassword');
        }
      }, 100);
    }
  }, [isPasswordRecovery]);

  // Handle new user onboarding navigation (must be before any early returns!)
  React.useEffect(() => {
    // Only navigate if user is authenticated AND needs onboarding AND has user data
    if (isAuthenticated && needsOnboarding && user) {
      console.log('🆕 New user needs onboarding, will navigate to RoleSelection');
      // Navigate as soon as navigation is ready
      const checkAndNavigate = () => {
        if (navigationRef.current?.isReady()) {
          console.log('🎯 Navigating to RoleSelection now!');
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
          });
        } else {
          // Check again in 50ms
          setTimeout(checkAndNavigate, 50);
        }
      };
      checkAndNavigate();
    }
  }, [isAuthenticated, needsOnboarding, user]);

  if (isLoading) {
    // Show a simple loading screen instead of null (black screen)
    console.log('⏳ Showing loading screen...');
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 18 }}>Loading...</Text>
      </View>
    );
  }

  console.log('🚦 Rendering navigation:', isAuthenticated ? (needsOnboarding ? '🆕 Onboarding' : '✅ MainStack') : '🔐 AuthStack');

  // Universal Links + Deep linking configuration for password reset
  const linking = {
    prefixes: [
      'musistash://', 
      'https://musistash.com',
      'https://www.musistash.com',
    ],
    config: {
      screens: {
        // When not authenticated, these screens are available
        Intro: 'intro',
        Login: 'login',
        Register: 'register',
        CheckYourEmail: 'check-email',
        ResetPassword: {
          path: 'reset-password',
          // The hash params will be handled by the URL listener
        },
        // When authenticated
        MainTabs: {
          screens: {
            Portfolio: 'portfolio',
            Explore: 'explore',
            Profile: 'profile',
            Create: 'create',
          }
        },
      },
    },
  };

  // Determine which stack to show:
  // - Show MainStack for authenticated users who don't need onboarding
  // - Show AuthStack (which contains onboarding screens) for:
  //   - Non-authenticated users
  //   - Users in password recovery mode  
  //   - New users who need onboarding
  const shouldShowMainStack = isAuthenticated && !isPasswordRecovery && !needsOnboarding;
  
  return (
    <NavigationContainer 
      ref={navigationRef}
      linking={linking}
      onStateChange={(state) => {
        console.log('🧭 Navigation state changed');
      }}
    >
      {shouldShowMainStack ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    // Handle deep links for Stripe Connect returns and Password Reset
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('🔗 Deep link received:', url);
      
      // Handle Stripe Connect return (from success or refresh pages on musistash.com)
      if (url.includes('stripe-success') || url.includes('stripe-return') || url.includes('stripe-refresh')) {
        console.log('✅ Stripe onboarding flow completed, returning to app');
        // ProfileScreen will automatically refresh when it comes into focus
        // The webhook should update the database within 1-2 minutes
        return;
      }
      
      // Handle Password Reset deep link
      if (url.includes('reset-password')) {
        console.log('🔐 Password reset link detected');
        
        // Extract tokens from hash params (Supabase uses hash for tokens)
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let type: string | null = null;
        
        // Parse hash params (after #)
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hashString = url.substring(hashIndex + 1);
          const hashParams = new URLSearchParams(hashString);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          type = hashParams.get('type');
          console.log('🔑 Found tokens in hash:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken, 
            type 
          });
        }
        
        // Also check query params (after ?)
        if (!accessToken) {
          const queryIndex = url.indexOf('?');
          if (queryIndex !== -1) {
            const queryString = url.substring(queryIndex + 1).split('#')[0];
            const queryParams = new URLSearchParams(queryString);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
            type = queryParams.get('type');
            console.log('🔑 Found tokens in query:', { 
              hasAccessToken: !!accessToken, 
              hasRefreshToken: !!refreshToken, 
              type 
            });
          }
        }
        
        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          console.log('🔐 Setting Supabase session from deep link tokens...');
          try {
            const { supabase } = require('./src/lib/supabase');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('❌ Failed to set session:', error.message);
            } else {
              console.log('✅ Session set successfully for password reset');
              console.log('👤 User:', data?.user?.email);
              // The onAuthStateChange listener will handle the navigation
            }
          } catch (err) {
            console.error('❌ Error setting session:', err);
          }
        } else {
          console.warn('⚠️ No tokens found in password reset URL');
        }
      }
    };
    
    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 App opened with deep link:', url);
        handleDeepLink({ url });
      }
    });
    
    // Initialize services when the app starts
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing MusiStash app...');
        
        // Initialize our production Stripe Payment Service (mobile only)
        if (Platform.OS !== 'web' && StripePaymentService) {
          const stripeReady = await StripePaymentService.initialize();
          if (stripeReady) {
            console.log('✅ Stripe Payment Service initialized');
          } else {
            console.warn('⚠️ Stripe Payment Service initialization failed');
          }
        } else {
          console.log('ℹ️ Skipping Stripe initialization for web platform');
        }
        
        // Preload approved artists for fast browsing
        console.log('🚀 Preloading approved artists on app startup...');
        await ApprovedArtistsService.preloadApprovedArtists();
        
        // Test database connectivity
        const healthCheck = await ProductionProfileService.healthCheck();
        console.log('🏥 Database health:', healthCheck.ok ? 'ok' : 'fail', healthCheck.message);
        
      } catch (error) {
        console.warn('⚠️ App initialization warning:', error);
        // Don't crash the app if preloading fails
      }
    };
    
    initializeApp();
    
    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Mark app as ready after a short delay
    const timer = setTimeout(() => setAppReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider>
          <StripeProvider>
            <AuthProvider>
              <AnimatedSplash isReady={appReady}>
                <AppContent />
              </AnimatedSplash>
              <StatusBar style="light" />
            </AuthProvider>
          </StripeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // Simplified header - Figma style
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerLogo: {
    width: 150,
    height: 38,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  menuButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
});

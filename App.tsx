import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

// Default every <Text>/<TextInput> to Manrope once the family is loaded, so
// legacy screens pick up the typeface without touching each StyleSheet.
let fontDefaultsApplied = false;
function applyFontDefaults() {
  if (fontDefaultsApplied) return;
  fontDefaultsApplied = true;
  const base = { fontFamily: 'Manrope_400Regular' as const };
  // @ts-expect-error defaultProps is untyped on host components
  RNText.defaultProps = RNText.defaultProps || {};
  // @ts-expect-error
  RNText.defaultProps.style = [base, RNText.defaultProps.style];
  // @ts-expect-error
  RNTextInput.defaultProps = RNTextInput.defaultProps || {};
  // @ts-expect-error
  RNTextInput.defaultProps.style = [base, RNTextInput.defaultProps.style];
}
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

// --- Profile Feature ---
import ProfileV2Screen from './src/features/profile/screens/ProfileV2Screen';
import SearchScreen from './src/features/profile/screens/SearchScreen';
import { ProductionProfileService } from './src/features/profile/services/productionProfileService';

// --- Artists Feature ---
import BrowseArtistsScreen from './src/features/artists/screens/BrowseArtistsScreen';
import ArtistProfileScreen from './src/features/artists/screens/ArtistProfileScreen';
import ArtistExperienceScreen from './src/features/artists/screens/ArtistExperienceScreen';
import CreateArtistV2Screen from './src/features/artists/screens/CreateArtistV2Screen';
import CreateArtistProjectScreen from './src/features/artists/screens/CreateArtistProjectScreen';
import { ApprovedArtistsService } from './src/features/artists/services/approvedArtistsService';

// --- Posts Feature ---
import PostsScreen from './src/features/posts/screens/PostsScreen';
import CreatePostScreen from './src/features/posts/screens/CreatePostScreen';
import CreateHubScreen from './src/features/posts/screens/CreateHubScreen';
import PostDetailScreen from './src/features/posts/screens/PostDetailScreen';

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

// --- AI Feature ---
import AgenticManagerScreen from './src/features/ai/screens/AgenticManagerScreen';

// --- V2 Paper Trading / Explore ---
import PortfolioScreen from './src/features/paper-trading/screens/PortfolioScreen';
import PaperTradeScreen from './src/features/paper-trading/screens/PaperTradeScreen';
import ProjectDetailScreen from './src/features/paper-trading/screens/ProjectDetailScreen';
import BackingReceiptScreen from './src/features/paper-trading/screens/BackingReceiptScreen';
import WatchlistScreen from './src/features/paper-trading/screens/WatchlistScreen';
import TransactionHistoryScreen from './src/features/paper-trading/screens/TransactionHistoryScreen';
import ExploreScreen from './src/features/explore/screens/ExploreScreen';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

// Minimal Robinhood-style menu: flat rows grouped in quiet sections, no icon boxes
const MENU_WIDTH = 300;

type MenuItem = { icon: string; label: string; route: string };
type MenuSection = { label?: string; items: MenuItem[] };

const MENU_SECTIONS: MenuSection[] = [
  {
    items: [
      ...(featureFlags.AGENTIC_MANAGER_ENABLED
        ? [{ icon: 'flash-outline', label: 'Agentic manager', route: 'AgenticManager' }]
        : []),
      { icon: 'notifications-outline', label: 'Notifications', route: 'Notifications' },
      { icon: 'settings-outline', label: 'Settings', route: 'Settings' },
    ],
  },
  {
    label: 'Artists',
    items: [
      { icon: 'people-outline', label: 'Browse artists', route: 'BrowseArtists' },
      { icon: 'sparkles-outline', label: 'Kaleb (demo profile)', route: 'ArtistExperience' },
      { icon: 'mic-outline', label: 'Become an artist', route: 'CreateArtist' },
    ],
  },
];

// Minimal universal header: avatar opens the menu, quiet title, bell on the right
function UniversalHeader({ navigation, title }: { navigation: any, title: string, subtitle?: string }) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleMenuPress = () => {
    setIsMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const handleCloseMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -MENU_WIDTH, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
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
        case 'Search':
          navigation.navigate('MainTabs', { screen: 'Search' });
          break;
        case 'CreateHub':
          navigation.navigate('CreateHub');
          break;
        case 'Waitlist':
          // Waitlist screen removed — every account is auto-enrolled.
          navigation.navigate('MainTabs', { screen: 'Explore' });
          break;
        case 'BrowseArtists':
          navigation.navigate('BrowseArtists');
          break;
        case 'ArtistExperience':
          navigation.navigate('ArtistExperience', { artistId: 'artist_kaleb' });
          break;
        case 'AgenticManager':
          if (featureFlags.AGENTIC_MANAGER_ENABLED) navigation.navigate('AgenticManager');
          break;
        case 'CreateArtist':
          navigation.navigate('CreateArtist');
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
    }, 220); // Wait for menu close animation
  };

  const goToProfile = () => {
    handleCloseMenu();
    setTimeout(() => navigation.navigate('MainTabs', { screen: 'Profile' }), 220);
  };

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.route + item.label}
      style={sidebarStyles.menuItem}
      onPress={() => handleMenuItemPress(item.route)}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <Ionicons name={item.icon as any} size={20} color="#9B9BA4" />
      <Text style={sidebarStyles.menuItemText}>{item.label}</Text>
    </TouchableOpacity>
  );

  const avatarInitial = (user?.name || 'M').trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity
        style={styles.headerAvatarButton}
        onPress={handleMenuPress}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
            <Text style={styles.headerAvatarInitial}>{avatarInitial}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.headerTitle}>{title}</Text>

      <TouchableOpacity
        style={styles.headerIconButton}
        onPress={() => navigation.navigate('Notifications')}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={22} color="#9B9BA4" />
      </TouchableOpacity>

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
        </Animated.View>
        <Animated.View style={[sidebarStyles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
          {/* Account block — tapping goes to Profile */}
          <TouchableOpacity
            style={[sidebarStyles.account, { paddingTop: insets.top + 24 }]}
            onPress={goToProfile}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={sidebarStyles.accountAvatar} />
            ) : (
              <View style={[sidebarStyles.accountAvatar, sidebarStyles.accountAvatarFallback]}>
                <Text style={sidebarStyles.accountAvatarInitial}>{avatarInitial}</Text>
              </View>
            )}
            <View style={sidebarStyles.accountInfo}>
              <Text style={sidebarStyles.accountName} numberOfLines={1}>
                {user?.name || 'Your account'}
              </Text>
              <Text style={sidebarStyles.accountEmail} numberOfLines={1}>
                {user?.email || ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6A6A74" />
          </TouchableOpacity>

          <ScrollView
            style={sidebarStyles.scrollView}
            contentContainerStyle={sidebarStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {MENU_SECTIONS.map((section, i) => (
              <View key={section.label ?? `section-${i}`} style={sidebarStyles.menuSection}>
                {section.label ? (
                  <Text style={sidebarStyles.sectionLabel}>{section.label.toUpperCase()}</Text>
                ) : null}
                {section.items.map(renderMenuItem)}
              </View>
            ))}

            <View style={sidebarStyles.divider} />

            <TouchableOpacity
              style={sidebarStyles.menuItem}
              onPress={() => handleMenuItemPress('Logout')}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Ionicons name="log-out-outline" size={20} color="#FF6A5E" />
              <Text style={[sidebarStyles.menuItemText, sidebarStyles.menuItemTextDanger]}>Log out</Text>
            </TouchableOpacity>

            <Text style={sidebarStyles.versionText}>MusiStash v1.0.0 — paper trading simulation</Text>
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

// Minimal sidebar styles (Robinhood-inspired)
const sidebarStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: '#0B0D11',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255, 255, 255, 0.10)',
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  accountAvatarFallback: {
    backgroundColor: '#15151A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarInitial: {
    color: '#F4F4F6',
    fontSize: 17,
    fontWeight: '600',
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F4F4F6',
    letterSpacing: -0.2,
  },
  accountEmail: {
    fontSize: 12,
    color: '#6A6A74',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 40,
  },
  menuSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6A6A74',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F4F4F6',
    flex: 1,
  },
  menuItemTextDanger: {
    color: '#FF6A5E',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  versionText: {
    fontSize: 11,
    color: '#6A6A74',
    marginTop: 16,
    marginLeft: 20,
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
        component={ProfileV2Screen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
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

// Tab navigator — "Paper Mobile": Explore · Search · Portfolio · You.
// Route names kept (Explore/Search/Portfolio/Profile) so deep links, the menu
// and getParent().navigate() calls stay valid; only the visible label changes.
function MainTabs({ navigation: parentNavigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Explore"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
          if (route.name === 'Explore') iconName = 'reorder-three-outline';
          else if (route.name === 'Search') iconName = 'search-outline';
          else if (route.name === 'Portfolio') iconName = 'stats-chart-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: {
          backgroundColor: '#0C0C0F',
          borderTopColor: '#1C1C22',
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom, 8),
          paddingHorizontal: 8,
        },
        tabBarActiveTintColor: '#8ECDF0',
        tabBarInactiveTintColor: '#6A6A74',
        tabBarLabelStyle: {
          fontFamily: 'Manrope_700Bold',
          fontSize: 10.5,
          letterSpacing: 0.2,
          marginTop: 3,
        },
        headerShown: true,
        lazy: false,
        unmountOnBlur: false,
      })}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={({ navigation }) => ({
          header: () => <UniversalHeader navigation={navigation} title="" />,
        })}
        initialParams={{ parentNavigation }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={({ navigation }) => ({
          header: () => <UniversalHeader navigation={navigation} title="" />,
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'You', headerShown: false }}
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
          headerStyle: { backgroundColor: '#0A0A0C' },
          headerTintColor: '#F4F4F6',
          headerTitleStyle: { fontFamily: 'Manrope_800ExtraBold' },
        }}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BackingReceipt"
        component={BackingReceiptScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="CreateHub"
        component={CreateHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateArtist"
        component={CreateArtistV2Screen}
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
      initialRouteName="Intro"
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
  // Untyped navigators can't infer the param list, so type the linking config loosely.
  const linking: React.ComponentProps<typeof NavigationContainer>['linking'] = {
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
            Explore: 'explore',
            Search: 'search',
            Portfolio: 'portfolio',
            Profile: 'profile',
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
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  if (fontsLoaded) applyFontDefaults();

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

  // Non-blocking: render immediately; text swaps to Manrope the moment the
  // family resolves (brief FOUT at worst). Never gate the whole app on fonts.

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider>
          <AuthProvider>
            <AnimatedSplash isReady={appReady}>
              <AppContent />
            </AnimatedSplash>
            <StatusBar style="light" />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // Minimal header — avatar / title / bell
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    fontWeight: '800',
    color: '#F4F4F6',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerAvatarButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  headerAvatarFallback: {
    backgroundColor: '#15151A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: '#F4F4F6',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    fontWeight: '800',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  
});

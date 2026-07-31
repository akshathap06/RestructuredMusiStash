import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './services/authService';
import { supabase } from '../../lib/supabase';
import { ProductionProfileService } from '../profile/services/productionProfileService';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
}

interface ProfileData {
  userProfile?: any;
  artistProfile?: any;
  serviceProfile?: any;
  posts?: any[];
  lastUpdated?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileData: ProfileData | null;
  isProfileLoading: boolean;
  isPasswordRecovery: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, phone: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>; // Alias for logout
  updateUser: (userData: Partial<User>) => void;
  getProfileData: () => ProfileData | null;
  refreshProfileData: () => Promise<void>;
  clearPasswordRecovery: () => void;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Check for stored authentication token on app start
    checkAuthStatus();

    // Listen for auth state changes (for OAuth)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);
      
      // Handle PASSWORD_RECOVERY event - this happens when user clicks reset link
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔐 Password recovery mode activated');
        setIsPasswordRecovery(true);
        setIsLoading(false);
        // Don't sign the user in - just let them reset their password
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in (including OAuth)
        console.log('✅ User signed in via', session.user.app_metadata?.provider || 'email');
        console.log('📧 Email:', session.user.email);
        console.log('🆔 User ID:', session.user.id);
        
        // Build basic user object from session
        const basicUser = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'listener',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        };
        
        // 🔥 Pre-warm profile cache immediately
        ProductionProfileService.preWarmCache(session.user.id);
        
        // Save auth token immediately so session persists
        await AsyncStorage.setItem('authToken', session.access_token);
        
        // Check if user is NEW with a fast timeout (2 seconds max)
        let isNewUser = false;
        let finalUser = basicUser;
        
        try {
          console.log('🔍 Quick check: user exists in database?');
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DB check timeout')), 2000)
          );
          
          const fetchPromise = supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();
          
          const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
          
          if (result?.data && !result?.error) {
            // Existing user found
            console.log('✅ Existing user found:', result.data.email);
            finalUser = result.data;
            
            // Check if they still need onboarding
            const onboardingFlag = await AsyncStorage.getItem(`needsOnboarding_${result.data.id}`);
            if (onboardingFlag === 'true') {
              console.log('🆕 User still needs to complete onboarding');
              isNewUser = true;
            }
          } else {
            // NEW USER - create profile quickly
            console.log('🆕 New user! Creating profile...');
            isNewUser = true;
            
            const createPromise = supabase
              .from('users')
              .insert([basicUser])
              .select()
              .single();
            
            const createResult = await Promise.race([createPromise, timeoutPromise]) as any;
            
            if (createResult?.data && !createResult?.error) {
              console.log('✅ Profile created');
              finalUser = createResult.data;
              await AsyncStorage.setItem(`needsOnboarding_${createResult.data.id}`, 'true');
            } else {
              console.warn('⚠️ Profile creation issue, using session data');
              await AsyncStorage.setItem(`needsOnboarding_${basicUser.id}`, 'true');
            }
          }
        } catch (dbError: any) {
          console.warn('⚠️ DB check skipped:', dbError?.message || 'timeout');
          // If DB check fails/times out, assume existing user and skip onboarding
          // This prevents blocking the login flow
        }
        
        // Set user and onboarding state
        setUser(finalUser);
        if (isNewUser) {
          setNeedsOnboarding(true);
          console.log('🎯 New user flagged for onboarding');
        }
        
        // Complete authentication
        setIsLoading(false);
        console.log('✅ Authentication complete! isAuthenticated:', !!finalUser);
        
        // Load profile data in background (non-blocking)
        loadProfileData(finalUser.id).then(profileData => {
          console.log('📦 Profile data loaded');
          setProfileData(profileData);
        }).catch(err => console.warn('⚠️ Profile data load failed:', err));
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        setProfileData(null);
        setNeedsOnboarding(false);
        setIsLoading(false);
        await AsyncStorage.removeItem('authToken');
      }
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadProfileData = async (userId: string): Promise<ProfileData> => {
    try {
      const cacheKey = `profile_data_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      const cacheTime = 60 * 60 * 1000; // 60 minutes cache (1 hour) for better persistence
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        console.log('Found cached profile data, age:', (Date.now() - parsed.lastUpdated) / 1000 / 60, 'minutes');
        if (Date.now() - parsed.lastUpdated < cacheTime) {
          console.log('Using cached profile data');
          return parsed;
        } else {
          console.log('Cache expired, fetching fresh data');
        }
      } else {
        console.log('No cached profile data found, fetching fresh data');
      }

      // Fetch fresh data with better error handling
      console.log('Fetching fresh profile data for user:', userId);
      const [userProfile, artistProfile, serviceProfile, posts] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', userId).single().then(result => result, err => ({ data: null, error: err })),
        supabase.from('artist_profiles').select('*').eq('user_id', userId).single().then(result => result, err => ({ data: null, error: err })),
        supabase.from('service_providers').select('*').eq('user_id', userId).single().then(result => result, err => ({ data: null, error: err })),
        supabase.from('posts').select('*').eq('user_id', userId).eq('is_active', true).eq('post_status', 'approved').order('created_at', { ascending: false }).limit(10).then(result => result, err => ({ data: [], error: err }))
      ]);

      console.log('Profile data fetched:', {
        userProfile: !!userProfile.data,
        artistProfile: !!artistProfile.data,
        serviceProfile: !!serviceProfile.data,
        posts: posts.data?.length || 0
      });

      const profileData: ProfileData = {
        userProfile: userProfile.data,
        artistProfile: artistProfile.data,
        serviceProfile: serviceProfile.data,
        posts: posts.data || [],
        lastUpdated: Date.now()
      };

      // Cache the data
      await AsyncStorage.setItem(cacheKey, JSON.stringify(profileData));
      console.log('Profile data cached successfully');
      return profileData;
    } catch (error) {
      console.error('Error loading profile data:', error);
      return {};
    }
  };

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      
      // Use Supabase's built-in session restoration
      // This automatically restores the session from AsyncStorage
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ Error getting session:', sessionError.message);
        setIsLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('✅ Session found, user authenticated:', session.user.email);
        
        // Build user object from session
        const userData = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'listener',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        };
        
        // Try to fetch full user data from database
        try {
          const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (dbUser && !dbError) {
            // Use database user data if available
            setUser(dbUser);
          } else {
            // Fall back to session data
            setUser(userData);
          }
        } catch (dbError) {
          console.warn('⚠️ Could not fetch user from DB, using session data');
          setUser(userData);
        }
        
        // Store auth token for compatibility
        if (session.access_token) {
          await AsyncStorage.setItem('authToken', session.access_token);
        }
        
        // Check if user needs onboarding
        const onboardingFlag = await AsyncStorage.getItem(`needsOnboarding_${session.user.id}`);
        if (onboardingFlag === 'true') {
          console.log('🆕 User still needs onboarding');
          setNeedsOnboarding(true);
        }
        
        // Immediately try to load cached profile data
        const cacheKey = `profile_data_${session.user.id}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);
        
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            console.log('📦 Using cached profile data');
            setProfileData(parsed);
          } catch (parseError) {
            console.error('❌ Error parsing cached profile data:', parseError);
          }
        }
        
        // Then load fresh data in background (will update cache)
        loadProfileData(session.user.id).then(freshData => {
          console.log('🔄 Updated profile data with fresh data');
          setProfileData(freshData);
        }).catch(err => {
          console.warn('⚠️ Failed to load fresh profile data:', err);
        });
      } else {
        console.log('ℹ️ No active session found');
        // Clear any stale tokens
        await AsyncStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
    } finally {
      console.log('✅ Auth check complete, setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await authService.login(email, password);
      
      if (result.success && result.user && result.token) {
        // Store token securely
        await AsyncStorage.setItem('authToken', result.token);
        setUser(result.user);
        
        // 🔥 Pre-warm profile cache immediately
        ProductionProfileService.preWarmCache(result.user.id);
        
        // Immediately try to load cached profile data
        const cacheKey = `profile_data_${result.user.id}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);
        
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            console.log('Setting cached profile data immediately on login');
            setProfileData(parsed);
          } catch (parseError) {
            console.error('Error parsing cached profile data on login:', parseError);
          }
        }
        
        // Then load fresh data in background
        loadProfileData(result.user.id).then(freshData => {
          console.log('Updated profile data with fresh data after login');
          setProfileData(freshData);
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, phone: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await authService.register(name, email, phone, password);
      
      if (result.success && result.user && result.token) {
        // Store token securely
        await AsyncStorage.setItem('authToken', result.token);
        setUser(result.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('👋 Logging out...');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      await AsyncStorage.removeItem('authToken');
      // Clear cached profile data and onboarding flag
      if (user) {
        await AsyncStorage.removeItem(`profile_data_${user.id}`);
        await AsyncStorage.removeItem(`needsOnboarding_${user.id}`);
      }
      setUser(null);
      setProfileData(null);
      setIsPasswordRecovery(false);
      setNeedsOnboarding(false);
      
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const getProfileData = (): ProfileData | null => {
    return profileData;
  };

  const refreshProfileData = async (): Promise<void> => {
    if (user) {
      setIsProfileLoading(true);
      try {
        const freshData = await loadProfileData(user.id);
        setProfileData(freshData);
      } catch (error) {
        console.error('Error refreshing profile data:', error);
      } finally {
        setIsProfileLoading(false);
      }
    }
  };

  const clearPasswordRecovery = () => {
    console.log('🔐 Clearing password recovery mode');
    setIsPasswordRecovery(false);
  };

  const completeOnboarding = async (): Promise<void> => {
    console.log('✅ Completing onboarding');
    if (user) {
      await AsyncStorage.removeItem(`needsOnboarding_${user.id}`);
    }
    setNeedsOnboarding(false);
  };

  // signOut is an alias for logout (used in some components)
  const signOut = logout;

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    profileData,
    isProfileLoading,
    isPasswordRecovery,
    needsOnboarding,
    login,
    register,
    logout,
    signOut,
    updateUser,
    getProfileData,
    refreshProfileData,
    clearPasswordRecovery,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

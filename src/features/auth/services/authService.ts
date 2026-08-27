import { Platform } from 'react-native';
import { supabase, User } from '../../../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    avatar?: string;
  };
  token?: string;
  message?: string;
}

interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    avatar?: string;
  };
  token?: string;
  message?: string;
}

class AuthService {
  private token: string | null = null;

  // Set authentication token
  setToken(token: string) {
    this.token = token;
  }

  // Get authentication token
  getToken(): string | null {
    return this.token;
  }

  // Check if user exists in auth database but has no password set
  async checkIfPasswordlessAccount(email: string): Promise<{ isPasswordless: boolean; shouldSendReset: boolean }> {
    try {
      // Check if user exists in the users table (not auth.users)
      const { data: userExists, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (!userExists || userError) {
        console.log('User not found in users table');
        return { isPasswordless: false, shouldSendReset: false };
      }

      console.log('User found in users table:', userExists.email);
      
      // User exists in our database, so they should have an auth account
      // If login failed, it means they either:
      // 1. Have no password (OAuth user)
      // 2. Wrong password
      // We'll assume it's a password-less account and send reset email
      return { isPasswordless: true, shouldSendReset: true };
    } catch (error) {
      console.error('Error checking passwordless account:', error);
      return { isPasswordless: false, shouldSendReset: false };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          // Use your actual domain for Universal Links (required for App Store)
          // This should match your apple-app-site-association file
          redirectTo: 'https://musistash.com/reset-password',
        }
      );

      if (error) {
        console.error('Password reset error:', error);
        return { 
          success: false, 
          message: error.message || 'Failed to send reset email' 
        };
      }

      return { 
        success: true, 
        message: 'Password reset email sent successfully' 
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send reset email' 
      };
    }
  }

  // Google OAuth Sign In
  async signInWithGoogle(): Promise<{ success: boolean; error?: string; url?: string }> {
    try {
      // Create the redirect URL for deep linking
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'musistash',
        path: 'auth/callback'
      });

      console.log('📱 OAuth redirect URL:', redirectUrl);

      // Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // We'll handle the browser opening manually
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Force Google to show account picker
          },
        },
      });

      if (error) {
        console.error('❌ Google sign in error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.url) {
        console.error('❌ No OAuth URL returned');
        return { success: false, error: 'No OAuth URL returned' };
      }

      console.log('🌐 Opening OAuth URL:', data.url);
      console.log('👤 User will be prompted to select Google account');

      // Open the OAuth URL in the browser
      // The prompt=select_account parameter ensures user can pick their account
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          // Create a new browser session to avoid cached logins
          createTask: true,
        }
      );

      console.log('🔄 Browser result:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('✅ OAuth success! URL:', result.url);
        
        // Extract tokens from the URL
        const url = result.url;
        let accessToken = null;
        let refreshToken = null;

        // Try to parse URL hash params
        if (url.includes('#')) {
          const hashParams = new URLSearchParams(url.split('#')[1]);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }
        
        // Try to parse URL query params
        if (!accessToken && url.includes('?')) {
          const queryParams = new URLSearchParams(url.split('?')[1]);
          accessToken = queryParams.get('access_token');
          refreshToken = queryParams.get('refresh_token');
        }

        console.log('🔑 Access token found:', !!accessToken);
        console.log('🔑 Refresh token found:', !!refreshToken);

        if (accessToken) {
          console.log('🔐 Setting session with tokens...');
          
          // Set the session with the tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            return { success: false, error: sessionError.message };
          }

          console.log('✅ Session set successfully!');
          console.log('👤 Session user:', sessionData?.user?.email);
          
          // Force a small delay to allow auth state listener to fire
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify the session is actually set
          const { data: { session: verifySession } } = await supabase.auth.getSession();
          console.log('🔍 Verified session:', !!verifySession, verifySession?.user?.email);
          
          return { success: true };
        } else {
          console.error('❌ No access token found in callback URL');
          console.log('📋 Full callback URL:', url);
          return { success: false, error: 'No access token in callback' };
        }
      } else if (result.type === 'cancel') {
        console.log('⚠️ User cancelled OAuth');
        return { success: false, error: 'Sign in cancelled' };
      } else {
        console.error('❌ OAuth failed, result type:', result.type);
        return { success: false, error: 'OAuth flow failed' };
      }
    } catch (error) {
      console.error('❌ Google sign in error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Google sign in failed' 
      };
    }
  }


  // Login user
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Input validation and sanitization
      if (!email || !password) {
        return { success: false, message: 'Email and password are required' };
      }

      // Sanitize inputs
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPassword = password.trim();

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Password length validation
      if (sanitizedPassword.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
      }

      // Use Supabase Auth for login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      if (authError) {
        console.error('Auth error:', authError);
        
        // Check if this is a password-less account (OAuth user)
        if (authError.message.includes('Invalid login credentials')) {
          console.log('Invalid credentials, checking if user exists in DB...');
          
          // Check if user exists in our users table
          const { data: userExists, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', sanitizedEmail)
            .single();

          if (userExists && !userError) {
            console.log('User exists in DB but login failed - likely password-less account');
            // User exists in our database but login failed = password-less account
            return {
              success: false,
              message: 'NO_PASSWORD', // Special flag for password-less accounts
            };
          } else {
            console.log('User does not exist in DB - wrong credentials');
            // User doesn't exist in our database = wrong email or password
            return {
              success: false,
              message: 'Invalid email or password',
            };
          }
        }
        
        return {
          success: false,
          message: authError.message || 'Login failed',
        };
      }

      if (!authData.user) {
        return {
          success: false,
          message: 'Login failed',
        };
      }

      // Get user profile from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', sanitizedEmail)
        .single();

      if (profileError || !userProfile) {
        // Create user profile if it doesn't exist (for OAuth users)
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
            email: authData.user.email,
            role: 'listener',
            avatar: authData.user.user_metadata?.avatar_url || null,
          }])
          .select()
          .single();

        if (createError) {
          console.error('Failed to create user profile:', createError);
          return {
            success: false,
            message: 'Failed to create user profile',
          };
        }

        const token = authData.session?.access_token || '';
        this.setToken(token);
        return {
          success: true,
          user: newProfile,
          token: token,
        };
      }

      const token = authData.session?.access_token || '';
      this.setToken(token);
      return {
        success: true,
        user: userProfile,
        token: token,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  // Register user
  async register(name: string, email: string, phone: string, password: string): Promise<RegisterResponse> {
    try {
      // Input validation and sanitization
      if (!name || !email || !phone || !password) {
        return { success: false, message: 'All fields are required' };
      }

      // Sanitize inputs to prevent SQL injection
      const sanitizedName = name.trim();
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPhone = phone.trim();
      const sanitizedPassword = password.trim();

      // Name validation
      if (sanitizedName.length < 2) {
        return { success: false, message: 'Name must be at least 2 characters' };
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Phone validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(sanitizedPhone.replace(/[\s\-\(\)]/g, ''))) {
        return { success: false, message: 'Invalid phone number format' };
      }

      // Password validation
      if (sanitizedPassword.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters' };
      }

      // Check for strong password (optional)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(sanitizedPassword)) {
        return {
          success: false,
          message: 'Password must contain uppercase, lowercase, and number',
        };
      }

      // Additional security: Check for SQL injection patterns
      const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
        /(\b(OR|AND)\s+'.*'\s*=\s*'.*')/i,
        /(\b(OR|AND)\s+".*"\s*=\s*".*")/i,
        /(UNION\s+SELECT)/i,
        /(DROP\s+TABLE)/i,
        /(INSERT\s+INTO)/i,
        /(UPDATE\s+SET)/i,
        /(DELETE\s+FROM)/i
      ];

      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(sanitizedEmail) || pattern.test(sanitizedPassword) || pattern.test(sanitizedName) || pattern.test(sanitizedPhone)) {
          console.warn('Potential SQL injection attempt detected');
          return { success: false, message: 'Invalid input detected' };
        }
      }

      // Use Supabase Auth to create user account
      try {
        // Check if user already exists in database
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', sanitizedEmail)
          .single();
        
        if (existingUser) {
          return { success: false, message: 'User with this email already exists' };
        }
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: sanitizedPassword,
          options: {
            data: {
              name: sanitizedName,
              phone: sanitizedPhone,
              // Signup-channel tracking for the waitlist auto-enrol trigger.
              platform: 'app',
              signup_source: 'app_signup',
            },
          },
        });

        if (authError) {
          console.error('Auth error:', authError);
          return {
            success: false,
            message: authError.message || 'Failed to create account',
          };
        }

        if (!authData.user) {
          return {
            success: false,
            message: 'Failed to create user account',
          };
        }

        // Create user profile in database
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            name: sanitizedName,
            email: sanitizedEmail,
            phone: sanitizedPhone,
            role: 'listener', // Default role
          }])
          .select()
          .single();
        
        if (createError || !newUser) {
          console.error('Failed to create user profile:', createError);
          // User was created in Auth but not in database - this is a problem
          // In production, you might want to handle this better
          return {
            success: false,
            message: 'Account created but profile setup failed. Please contact support.',
          };
        }

        // Get session token
        const token = authData.session?.access_token || '';
        this.setToken(token);

        return {
          success: true,
          user: newUser,
          token: token,
        };
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        return {
          success: false,
          message: 'Database connection error',
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  // Verify token
  async verifyToken(token: string): Promise<any> {
    try {
      this.setToken(token);
      
      // First try to get existing Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Valid Supabase session found:', session.user.email);
        
        // Try to get user data from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (userData && !userError) {
          console.log('✅ User data retrieved from database');
          return userData;
        }
        
        // If no database record, return basic user info from session
        console.log('⚠️ No database record, using session data');
        return {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'listener',
          avatar: session.user.user_metadata?.avatar_url || null,
        };
      }
      
      // No valid session - try to set session with the stored token
      console.log('⚠️ No active session, attempting to restore with token...');
      const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: '', // May not have refresh token stored
      });
      
      if (refreshData?.session?.user) {
        console.log('✅ Session restored successfully');
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', refreshData.session.user.id)
          .single();
        
        return userData || {
          id: refreshData.session.user.id,
          name: refreshData.session.user.email?.split('@')[0] || 'User',
          email: refreshData.session.user.email || '',
          role: 'listener',
        };
      }
      
      console.log('❌ Could not restore session');
      return null;
    } catch (error) {
      console.error('Token verification error:', error);
      this.token = null;
      return null;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Clear the token
      this.token = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async signInWithApple(): Promise<LoginResponse> {
    try {
      if (Platform.OS !== 'ios') {
        return { success: false, message: 'Apple Sign-In is only available on iOS' };
      }
      const AppleAuthentication = await import('expo-apple-authentication');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        return { success: false, message: 'No identity token from Apple' };
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error || !data.user) {
        return { success: false, message: error?.message || 'Apple Sign-In failed' };
      }
      const token = data.session?.access_token || '';
      this.setToken(token);
      const { data: userData } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      return {
        success: true,
        user: userData || {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
          role: 'listener',
        },
        token,
      };
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, message: 'Sign-in canceled' };
      }
      return { success: false, message: e?.message || 'Apple Sign-In failed' };
    }
  }
}

export const authService = new AuthService();




import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// SUPABASE CONFIGURATION
// =============================================================================
// 
// For custom domain setup:
// 1. Go to Supabase Dashboard → Settings → Custom Domains
// 2. Add your domain (e.g., api.musistash.com)
// 3. Add CNAME record in Hostinger pointing to your Supabase URL
// 4. Wait for verification (can take up to 24 hours)
// 5. Once verified, change USE_CUSTOM_DOMAIN to true
//
// =============================================================================

// Toggle this to true once your custom domain is set up and verified
const USE_CUSTOM_DOMAIN = true;

// Your custom domain (set this up in Supabase Dashboard first)
const CUSTOM_DOMAIN = "https://api.musistash.com";

// Default Supabase URL (used until custom domain is ready)
const DEFAULT_SUPABASE_URL = "https://dwbetxanfumneukrqodd.supabase.co";

// Use custom domain if enabled, otherwise use default
const SUPABASE_URL = USE_CUSTOM_DOMAIN ? CUSTOM_DOMAIN : DEFAULT_SUPABASE_URL;

// This key is safe to expose (it's the anon/public key)
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3YmV0eGFuZnVtbmV1a3Jxb2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDI2MzYsImV4cCI6MjA2ODM3ODYzNn0.CO3oIID2omAwuex2qE_dXbOYbtA_v9bC38VQizuXVJc";

// Create Supabase client with AsyncStorage for mobile
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Export the URL for use in other services
export const getSupabaseUrl = () => SUPABASE_URL;

// Direct Supabase URL for storage (custom domains don't work well with storage)
export const DIRECT_SUPABASE_URL = DEFAULT_SUPABASE_URL;

// Create a separate Supabase client for storage operations (uses direct URL, not custom domain)
export const supabaseStorage = createClient(DEFAULT_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper to convert custom domain storage URLs to direct Supabase URLs
export const getDirectStorageUrl = (url: string): string => {
  if (url.includes('api.musistash.com')) {
    return url.replace('https://api.musistash.com', DEFAULT_SUPABASE_URL);
  }
  return url;
};

// Database types (simplified version)
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

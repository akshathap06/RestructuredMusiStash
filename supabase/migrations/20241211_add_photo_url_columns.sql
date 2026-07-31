-- ============================================================================
-- Migration: Add URL columns for Supabase Storage migration
-- Date: 2024-12-11
-- 
-- This migration adds new columns to store image URLs from Supabase Storage
-- The original base64 columns are preserved until migration is verified
-- ============================================================================

-- Add new URL columns (keeping old base64 columns for now)
ALTER TABLE public.artist_profiles 
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_photo_url TEXT;

-- Add comments
COMMENT ON COLUMN public.artist_profiles.profile_photo_url IS 
'URL to profile photo in Supabase Storage. Preferred over base64 profile_photo column.';

COMMENT ON COLUMN public.artist_profiles.banner_photo_url IS 
'URL to banner photo in Supabase Storage. Preferred over base64 banner_photo column.';

-- Create index on the new columns for faster lookups
CREATE INDEX IF NOT EXISTS idx_artist_profiles_has_photo_url 
ON public.artist_profiles (id) 
WHERE profile_photo_url IS NOT NULL;

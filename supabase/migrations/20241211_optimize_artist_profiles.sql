-- ============================================================================
-- Migration: Optimize artist_profiles table for Investments tab performance
-- Date: 2024-12-11
-- 
-- PROBLEM IDENTIFIED:
-- 1. profile_photo and banner_photo columns contain ~2MB base64 images each
-- 2. Fetching 20 artists = 22MB+ data transfer, taking 3+ seconds
-- 3. Most indexes are unused (0% utilization)
-- 4. No composite index for common query pattern
--
-- IMMEDIATE ACTIONS (this migration):
-- 1. Add composite index for the investments query
-- 2. Add partial index for approved artists only
--
-- FUTURE ACTIONS (separate migration/data task):
-- 1. Migrate base64 images to Supabase Storage
-- 2. Add profile_photo_url column with storage URLs
-- 3. Clean up old base64 data
-- ============================================================================

-- Create composite index for the investments tab query pattern
-- Query: status = 'approved', ORDER BY monthly_listeners DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_artist_profiles_investments_optimized 
ON public.artist_profiles (status, monthly_listeners DESC NULLS LAST, created_at DESC)
WHERE status = 'approved' AND artist_name IS NOT NULL;

-- Create index for search queries
CREATE INDEX IF NOT EXISTS idx_artist_profiles_search 
ON public.artist_profiles USING gin (
  to_tsvector('english', coalesce(artist_name, '') || ' ' || coalesce(bio, ''))
)
WHERE status = 'approved';

-- Add an index specifically for artist name text search (ILIKE patterns)
CREATE INDEX IF NOT EXISTS idx_artist_profiles_name_pattern 
ON public.artist_profiles (artist_name text_pattern_ops)
WHERE status = 'approved';

-- ============================================================================
-- RECOMMENDED FUTURE: Image Storage Migration
-- 
-- Step 1: Add new URL columns
-- ALTER TABLE public.artist_profiles 
--   ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
--   ADD COLUMN IF NOT EXISTS banner_photo_url TEXT,
--   ADD COLUMN IF NOT EXISTS profile_photo_thumbnail TEXT; -- Small ~10KB thumbnail
--
-- Step 2: Create a storage bucket
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('artist-photos', 'artist-photos', true);
--
-- Step 3: Migrate images via script (see scripts/migrate_artist_images.js)
--
-- Step 4: After migration verified, remove old base64 columns
-- ALTER TABLE public.artist_profiles 
--   DROP COLUMN profile_photo,
--   DROP COLUMN banner_photo;
-- ============================================================================

-- Add comment explaining the current state
COMMENT ON COLUMN public.artist_profiles.profile_photo IS 
'DEPRECATED: Contains base64 image data (~2MB). Should be migrated to Supabase Storage. Use profile_photo_url instead when available.';

COMMENT ON COLUMN public.artist_profiles.banner_photo IS 
'DEPRECATED: Contains base64 image data (~2MB). Should be migrated to Supabase Storage. Use banner_photo_url instead when available.';








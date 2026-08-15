#!/bin/bash

# Full Migration Script
# This script helps you migrate artist images from base64 to Supabase Storage

set -e

SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_KEY environment variable is required"
  echo ""
  echo "Usage:"
  echo "  SUPABASE_SERVICE_KEY=\"your-key\" ./scripts/shell/run-full-migration.sh"
  exit 1
fi

echo "🚀 Artist Image Migration - Full Process"
echo "=========================================="
echo ""

# Step 1: Check if columns exist
echo "📋 Step 1: Checking if URL columns exist..."
export SUPABASE_SERVICE_KEY
if node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://dwbetxanfumneukrqodd.supabase.co', process.env.SUPABASE_SERVICE_KEY);
supabase.from('artist_profiles').select('profile_photo_url').limit(1).then(({error}) => {
  if (error && error.code === '42703') {
    console.log('❌ Columns do not exist');
    process.exit(1);
  } else if (error) {
    console.log('⚠️  Could not verify:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Columns exist!');
    process.exit(0);
  }
});
" 2>/dev/null; then
  echo "✅ URL columns already exist!"
  echo ""
else
  echo "⚠️  URL columns do not exist yet."
  echo ""
  echo "Please run this SQL in Supabase Dashboard → SQL Editor:"
  echo "https://supabase.com/dashboard/project/dwbetxanfumneukrqodd/sql/new"
  echo ""
  echo "=========================================="
  cat << 'SQL'
ALTER TABLE public.artist_profiles 
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_photo_url TEXT;

COMMENT ON COLUMN public.artist_profiles.profile_photo_url IS 
'URL to profile photo in Supabase Storage. Preferred over base64 profile_photo column.';

COMMENT ON COLUMN public.artist_profiles.banner_photo_url IS 
'URL to banner photo in Supabase Storage. Preferred over base64 banner_photo column.';

CREATE INDEX IF NOT EXISTS idx_artist_profiles_has_photo_url 
ON public.artist_profiles (id) 
WHERE profile_photo_url IS NOT NULL;
SQL
  echo "=========================================="
  echo ""
  echo "After running the SQL above, press Enter to continue..."
  read -r
fi

# Step 2: Run image migration
echo "📦 Step 2: Running image migration..."
echo ""
node scripts/javascript/migrate-artist-images.js

echo ""
echo "✅ Migration complete!"








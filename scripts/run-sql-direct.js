/**
 * Execute SQL directly using Supabase connection
 * This script runs the SQL migration to add URL columns
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dwbetxanfumneukrqodd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

// SQL to add columns
const sql = `
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
`.trim();

async function executeSQL() {
  console.log('🚀 Running SQL Migration');
  console.log('='.repeat(60));
  console.log('\n⚠️  Supabase REST API cannot execute DDL statements directly.');
  console.log('📋 Please run this SQL in Supabase Dashboard → SQL Editor:\n');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  console.log('\n💡 Steps:');
  console.log('   1. Go to https://supabase.com/dashboard/project/dwbetxanfumneukrqodd/sql/new');
  console.log('   2. Paste the SQL above');
  console.log('   3. Click "Run"');
  console.log('   4. Then re-run the image migration script\n');
  
  // Try to verify if columns exist
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  try {
    const { error } = await supabase
      .from('artist_profiles')
      .select('profile_photo_url')
      .limit(1);
    
    if (!error) {
      console.log('✅ Columns already exist! You can proceed with image migration.');
      return true;
    } else if (error.code === '42703') {
      console.log('❌ Columns do not exist yet. Please run the SQL above first.');
      return false;
    }
  } catch (err) {
    console.log('⚠️  Could not verify column status');
  }
  
  return false;
}

executeSQL().catch(console.error);








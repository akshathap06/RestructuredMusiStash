/**
 * Execute SQL Migration using direct Postgres connection
 */

const { Client } = require('pg');

// Extract connection details from Supabase URL
// Format: postgresql://postgres:[password]@[host]:[port]/postgres
// We need to construct this from the service key and project ref

const SUPABASE_PROJECT_REF = 'dwbetxanfumneukrqodd';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

// For Supabase, we need the database password
// The service key doesn't give us direct DB access
// We need to use the connection pooler or get the password from Supabase

// Actually, let's use the Supabase connection string format
// We can get this from the Supabase dashboard or use the pooler

const SQL = `
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

async function runMigration() {
  console.log('🚀 Executing SQL Migration');
  console.log('='.repeat(60));
  
  // We need the database password to connect directly
  // For now, let's use the Supabase REST API workaround
  // or provide instructions
  
  console.log('\n⚠️  Direct Postgres connection requires database password.');
  console.log('📋 Please run this SQL in Supabase Dashboard:\n');
  console.log('='.repeat(60));
  console.log(SQL);
  console.log('='.repeat(60));
  console.log('\nOr get your database password from:');
  console.log('   Supabase Dashboard → Settings → Database → Connection string');
  console.log('   Then run: PGPASSWORD="password" psql -h db.dwbetxanfumneukrqodd.supabase.co -U postgres -d postgres -c "' + SQL.replace(/\n/g, ' ') + '"');
}

runMigration().catch(console.error);








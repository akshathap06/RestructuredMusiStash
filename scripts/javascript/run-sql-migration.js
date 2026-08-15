/**
 * Run SQL Migration Script
 * Executes SQL migrations using Supabase REST API
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 60)}...`);
    
    try {
      // Use the REST API to execute SQL via rpc
      // Note: This requires a function to be created in Supabase
      // For now, we'll use a workaround with the PostgREST API
      
      // Actually, we need to use the management API or direct Postgres connection
      // Since we can't execute arbitrary SQL via REST API, we'll use curl with psql
      // or create a migration function
      
      // For now, let's try using the Supabase CLI approach
      console.log('  ⚠️  Direct SQL execution not available via REST API');
      console.log('  💡 Please run this SQL in Supabase Dashboard → SQL Editor');
      console.log(`\n${statement}\n`);
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
    }
  }
}

async function main() {
  const migrationFile = path.join(__dirname, '../../supabase/migrations/20241211_add_photo_url_columns.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('🚀 Running SQL Migration');
  console.log('='.repeat(50));
  console.log('\n⚠️  Note: Supabase REST API cannot execute arbitrary SQL');
  console.log('📋 Please copy and run this SQL in Supabase Dashboard → SQL Editor:\n');
  console.log('='.repeat(50));
  console.log(sql);
  console.log('='.repeat(50));
  console.log('\n✅ After running the SQL above, you can proceed with the image migration.');
}

main().catch(console.error);








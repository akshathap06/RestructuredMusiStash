/**
 * Artist Image Migration Script
 * 
 * This script migrates base64 images from the artist_profiles table
 * to Supabase Storage and updates the database with URLs.
 * 
 * IMPORTANT: Run this script AFTER running the SQL migration:
 * supabase/migrations/20241211_add_photo_url_columns.sql
 * 
 * Usage:
 *   # Production run
 *   SUPABASE_SERVICE_KEY="your-key" node scripts/javascript/migrate-artist-images.js
 * 
 *   # Dry-run (no changes, just shows what would happen)
 *   SUPABASE_SERVICE_KEY="your-key" DRY_RUN=true node scripts/javascript/migrate-artist-images.js
 * 
 *   # Custom domain (if using custom domain)
 *   SUPABASE_SERVICE_KEY="your-key" SUPABASE_URL="https://api.musistash.com" node scripts/javascript/migrate-artist-images.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dwbetxanfumneukrqodd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.env.DRY_RUN === 'true';
const DELAY_BETWEEN_UPLOADS = 500; // ms - rate limiting to avoid overwhelming API

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.log('\nTo get your service key:');
  console.log('1. Go to Supabase Dashboard → Settings → API');
  console.log('2. Copy the "service_role" key (NOT the anon key)');
  console.log('3. Run: SUPABASE_SERVICE_KEY="your-key" node scripts/javascript/migrate-artist-images.js');
  console.log('\nOptional flags:');
  console.log('  DRY_RUN=true          - Preview changes without applying');
  console.log('  SUPABASE_URL="..."    - Use custom domain');
  process.exit(1);
}

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

// Create Supabase client with service role key (needed for storage operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'artist-photos';

/**
 * Create the storage bucket if it doesn't exist
 */
async function createBucketIfNeeded() {
  console.log('📦 Checking storage bucket...');
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would check/create bucket: ${BUCKET_NAME}`);
    return;
  }
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    throw listError;
  }
  
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`📦 Creating bucket: ${BUCKET_NAME}`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Make images publicly accessible
      fileSizeLimit: 10485760, // 10MB max
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      throw createError;
    }
    console.log('✅ Bucket created successfully');
  } else {
    console.log('✅ Bucket already exists');
  }
}

/**
 * Parse base64 data URL and extract binary data
 */
function parseBase64DataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return null;
  }
  
  try {
    // Format: data:image/jpeg;base64,/9j/4AAQ...
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine file extension from mime type
    const extMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    const extension = extMap[mimeType] || 'jpg';
    
    return { buffer, mimeType, extension };
  } catch (error) {
    console.error('Error parsing base64:', error.message);
    return null;
  }
}

/**
 * Upload an image to Supabase Storage with retry logic
 */
async function uploadImage(artistId, imageType, base64Data, retries = 3) {
  const parsed = parseBase64DataUrl(base64Data);
  if (!parsed) {
    console.log(`  ⚠️ Invalid or missing ${imageType} data`);
    return null;
  }
  
  const fileName = `${artistId}/${imageType}.${parsed.extension}`;
  const sizeKB = (parsed.buffer.length / 1024).toFixed(1);
  
  if (DRY_RUN) {
    const mockUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
    console.log(`  [DRY RUN] Would upload ${imageType} (${sizeKB} KB) → ${mockUrl}`);
    return mockUrl;
  }
  
  console.log(`  📤 Uploading ${imageType} (${sizeKB} KB)...`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, parsed.buffer, {
          contentType: parsed.mimeType,
          upsert: true // Overwrite if exists
        });
      
      if (error) {
        if (attempt < retries) {
          console.log(`  ⚠️ Upload attempt ${attempt} failed, retrying... (${error.message})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        console.error(`  ❌ Upload error for ${imageType} after ${retries} attempts:`, error.message);
        return null;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);
      
      console.log(`  ✅ Uploaded ${imageType}: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      if (attempt < retries) {
        console.log(`  ⚠️ Upload attempt ${attempt} failed, retrying... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      console.error(`  ❌ Upload error for ${imageType}:`, error.message);
      return null;
    }
  }
  
  return null;
}

/**
 * Migrate a single artist's images
 */
async function migrateArtist(artist, index, total) {
  const progress = `[${index + 1}/${total}]`;
  console.log(`\n${progress} 🎨 Migrating: ${artist.artist_name} (${artist.id.substring(0, 8)}...)`);
  
  const updates = {};
  
  // Migrate profile photo
  if (artist.profile_photo && artist.profile_photo.startsWith('data:')) {
    const profileUrl = await uploadImage(artist.id, 'profile', artist.profile_photo);
    if (profileUrl) {
      updates.profile_photo_url = profileUrl;
    }
    // Rate limiting
    if (!DRY_RUN) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_UPLOADS));
    }
  } else if (artist.profile_photo_url) {
    console.log(`  ✓ Profile photo already migrated`);
  }
  
  // Migrate banner photo
  if (artist.banner_photo && artist.banner_photo.startsWith('data:')) {
    const bannerUrl = await uploadImage(artist.id, 'banner', artist.banner_photo);
    if (bannerUrl) {
      updates.banner_photo_url = bannerUrl;
    }
    // Rate limiting
    if (!DRY_RUN) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_UPLOADS));
    }
  } else if (artist.banner_photo_url) {
    console.log(`  ✓ Banner photo already migrated`);
  }
  
  // Update database with new URLs
  if (Object.keys(updates).length > 0) {
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would update database with:`, Object.keys(updates).join(', '));
    } else {
      const { error: updateError } = await supabase
        .from('artist_profiles')
        .update(updates)
        .eq('id', artist.id);
      
      if (updateError) {
        console.error(`  ❌ Database update error:`, updateError.message);
        return false;
      }
      console.log(`  ✅ Database updated with new URLs`);
    }
  } else {
    console.log(`  ⏭️ No images to migrate`);
  }
  
  return true;
}

/**
 * Check if URL columns exist, create them if not
 */
async function ensureColumnsExist() {
  console.log('🔍 Checking if URL columns exist...');
  
  try {
    // Try to query with the new columns
    const { error } = await supabase
      .from('artist_profiles')
      .select('id, profile_photo_url, banner_photo_url')
      .limit(1);
    
    if (error && error.code === '42703') {
      // Column doesn't exist
      console.log('⚠️  URL columns do not exist yet.');
      console.log('📝 Creating columns...');
      console.log('\nPlease run this SQL in Supabase Dashboard → SQL Editor:');
      console.log('='.repeat(60));
      console.log(`
ALTER TABLE public.artist_profiles 
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_photo_url TEXT;

COMMENT ON COLUMN public.artist_profiles.profile_photo_url IS 
'URL to profile photo in Supabase Storage. Preferred over base64 profile_photo column.';

COMMENT ON COLUMN public.artist_profiles.banner_photo_url IS 
'URL to banner photo in Supabase Storage. Preferred over base64 banner_photo column.';
      `.trim());
      console.log('='.repeat(60));
      console.log('\nAfter running the SQL above, re-run this migration script.');
      return false;
    }
    
    if (error) {
      throw error;
    }
    
    console.log('✅ URL columns exist');
    return true;
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
    return false;
  }
}

/**
 * Get migration statistics
 */
async function getMigrationStats() {
  // First check if columns exist
  const columnsExist = await ensureColumnsExist();
  if (!columnsExist) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('id, artist_name, profile_photo, profile_photo_url, banner_photo, banner_photo_url')
    .not('artist_name', 'is', null);
  
  if (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
  
  const stats = {
    total: data.length,
    profilePhotos: {
      base64: data.filter(a => a.profile_photo?.startsWith('data:')).length,
      url: data.filter(a => a.profile_photo_url).length,
      none: data.filter(a => !a.profile_photo && !a.profile_photo_url).length
    },
    bannerPhotos: {
      base64: data.filter(a => a.banner_photo?.startsWith('data:')).length,
      url: data.filter(a => a.banner_photo_url).length,
      none: data.filter(a => !a.banner_photo && !a.banner_photo_url).length
    }
  };
  
  return stats;
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Artist Image Migration');
  console.log('='.repeat(50));
  
  try {
    // Create bucket
    await createBucketIfNeeded();
    
    // Get pre-migration stats
    console.log('\n📊 Pre-migration Statistics:');
    const preStats = await getMigrationStats();
    if (preStats) {
      console.log(`  Total artists: ${preStats.total}`);
      console.log(`  Profile photos (base64): ${preStats.profilePhotos.base64}`);
      console.log(`  Profile photos (URL): ${preStats.profilePhotos.url}`);
      console.log(`  Banner photos (base64): ${preStats.bannerPhotos.base64}`);
      console.log(`  Banner photos (URL): ${preStats.bannerPhotos.url}`);
    }
    
    // Ensure columns exist before proceeding
    const columnsExist = await ensureColumnsExist();
    if (!columnsExist) {
      console.log('\n❌ Cannot proceed without URL columns. Please run the SQL above first.');
      process.exit(1);
    }
    
    // Fetch all artists with base64 images
    console.log('\n📥 Fetching artists with base64 images...');
    const { data: artists, error: fetchError } = await supabase
      .from('artist_profiles')
      .select('id, artist_name, profile_photo, profile_photo_url, banner_photo, banner_photo_url')
      .not('artist_name', 'is', null);
    
    if (fetchError) {
      console.error('❌ Error fetching artists:', fetchError);
      if (fetchError.code === '42703') {
        console.log('\n💡 The URL columns do not exist. Please run the SQL migration first.');
      }
      throw fetchError;
    }
    
    // Filter to only artists needing migration
    const needsMigration = artists.filter(a => 
      (a.profile_photo?.startsWith('data:') && !a.profile_photo_url) ||
      (a.banner_photo?.startsWith('data:') && !a.banner_photo_url)
    );
    
    console.log(`Found ${needsMigration.length} artists needing migration`);
    
    if (needsMigration.length === 0) {
      console.log('\n✅ All images already migrated!');
      return;
    }
    
    // Migrate each artist
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < needsMigration.length; i++) {
      const artist = needsMigration[i];
      const success = await migrateArtist(artist, i, needsMigration.length);
      if (success) successCount++;
      else failCount++;
      
      // Progress indicator
      if ((i + 1) % 5 === 0 || i === needsMigration.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const remaining = needsMigration.length - (i + 1);
        const avgTime = elapsed / (i + 1);
        const estimatedRemaining = (remaining * avgTime).toFixed(0);
        console.log(`\n📊 Progress: ${i + 1}/${needsMigration.length} (${((i + 1) / needsMigration.length * 100).toFixed(1)}%)`);
        if (remaining > 0) {
          console.log(`   Estimated time remaining: ~${estimatedRemaining}s`);
        }
      }
    }
    
    // Get post-migration stats
    console.log('\n📊 Post-migration Statistics:');
    const postStats = await getMigrationStats();
    if (postStats) {
      console.log(`  Profile photos (base64): ${postStats.profilePhotos.base64}`);
      console.log(`  Profile photos (URL): ${postStats.profilePhotos.url}`);
      console.log(`  Banner photos (base64): ${postStats.bannerPhotos.base64}`);
      console.log(`  Banner photos (URL): ${postStats.bannerPhotos.url}`);
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    if (DRY_RUN) {
      console.log('🔍 Dry Run Complete!');
      console.log(`  Would migrate: ${needsMigration.length} artists`);
      console.log(`  Estimated time: ~${totalTime}s`);
      console.log('\n💡 To actually run the migration, remove DRY_RUN=true');
    } else {
      console.log('🎉 Migration Complete!');
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  ❌ Failed: ${failCount}`);
      console.log(`  ⏱️  Total time: ${totalTime}s`);
      
      if (failCount === 0 && successCount > 0) {
        console.log('\n💡 Next steps:');
        console.log('  1. ✅ App code already updated to use profile_photo_url');
        console.log('  2. Test the app to verify images load correctly');
        console.log('  3. After verification, you can optionally clear the old base64 columns:');
        console.log('     ALTER TABLE artist_profiles DROP COLUMN profile_photo, DROP COLUMN banner_photo;');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();

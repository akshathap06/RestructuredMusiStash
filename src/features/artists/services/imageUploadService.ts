import { supabaseStorage } from '../../../lib/supabase';

const BUCKET = 'profile-pictures';

/**
 * Upload a local image URI (from expo-image-picker) to Supabase Storage and
 * return its public URL. Used for artist profile / banner photos so we write
 * real URLs into artist_profiles.*_photo_url — never the purged base64 columns.
 */
export async function uploadProfileImage(
  uri: string,
  opts: { userId: string; kind: 'avatar' | 'banner' },
): Promise<string> {
  const res = await fetch(uri);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const extRaw = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extRaw) ? extRaw : 'jpg';
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `artist/${opts.userId}_${opts.kind}_${Date.now()}.${ext}`;

  const { error } = await supabaseStorage.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabaseStorage.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

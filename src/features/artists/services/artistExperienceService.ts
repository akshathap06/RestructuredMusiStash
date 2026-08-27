import { supabase } from '../../../lib/supabase';
import type { Artist, Track, Project, ProjectSummary } from '../types/experience';
import { kalebArtist, KALEB_ARTIST_ID } from '../data/kalebDemo';
import { artistProjectService } from './artistProjectService';

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80';
const FALLBACK_ART =
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80';

function pickImage(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 0 && !c.startsWith('data:')) {
      return c;
    }
  }
  // Allow data URIs as last resort (legacy base64)
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 0) return c;
  }
  return FALLBACK_HERO;
}

function genreLabel(genre: unknown): string {
  if (Array.isArray(genre) && genre.length) return String(genre[0]);
  if (typeof genre === 'string' && genre.trim()) return genre;
  return 'Artist';
}

function postsToTracks(posts: any[], artworkFallback: string): Track[] {
  const tracks: Track[] = [];
  for (const post of posts) {
    const media: string[] = Array.isArray(post.media_urls) ? post.media_urls : [];
    const audio = media.find((u) =>
      /\.(mp3|m4a|wav|aac|ogg)(\?|$)/i.test(u) || u.includes('audio'),
    );
    const image =
      media.find((u) => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u)) || artworkFallback;
    const title =
      (typeof post.content === 'string' && post.content.trim().split('\n')[0].slice(0, 48)) ||
      'Untitled track';

    // Prefer audio posts; otherwise take image posts as track cards (preview UX)
    if (audio || media.length > 0 || post.content) {
      tracks.push({
        id: String(post.id),
        title,
        artworkUrl: image || FALLBACK_ART,
        audioUrl: audio,
        durationSeconds: 180,
        playCount: post.likes_count ?? undefined,
      });
    }
    if (tracks.length >= 8) break;
  }
  return tracks;
}

export type LoadedArtistExperience = {
  artist: Artist;
  userId: string;
  isOwner: boolean;
  projects: Project[];
};

export const artistExperienceService = {
  async load(
    params: {
      artistId?: string;
      userId?: string;
      viewerUserId?: string;
      artistData?: any;
    },
  ): Promise<LoadedArtistExperience | null> {
    // Legacy alias — the old string id still ships in a few deep links.
    const artistId =
      params.artistId === 'kaleb' || params.artistId === 'artist_kaleb'
        ? KALEB_ARTIST_ID
        : params.artistId;

    let row: any = params.artistData;
    params = { ...params, artistId };

    if (!row?.artist_name) {
      if (params.artistId) {
        const { data } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('id', params.artistId)
          .maybeSingle();
        row = data;
      } else if (params.userId) {
        const { data } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('user_id', params.userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        row = data;
      }
    }

    if (!row) return null;

    const userId: string = row.user_id || params.userId || '';
    const profileUrl = pickImage(
      row.banner_photo_url,
      row.profile_photo_url,
      row.banner_photo,
      row.profile_photo,
    );
    const avatarUrl = pickImage(
      row.profile_photo_url,
      row.profile_photo,
      FALLBACK_ART,
    );

    let posts: any[] = [];
    if (userId) {
      const { data } = await supabase
        .from('posts')
        .select('id, content, media_urls, likes_count, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      posts = data || [];
    }

    let popularTracks = postsToTracks(posts, avatarUrl);
    // The seeded Kaleb demo has no posts — keep its curated track list.
    if (popularTracks.length === 0 && row.id === KALEB_ARTIST_ID) {
      popularTracks = kalebArtist.popularTracks;
    }
    const projects = await artistProjectService.listForArtist(row.id);
    const current = projects[0];

    const artist: Artist = {
      id: row.id,
      name: (row.artist_name || 'Artist').toUpperCase(),
      verified: !!(row.is_verified || row.status === 'approved'),
      genre: genreLabel(row.genre),
      location: row.location || row.city || '—',
      monthlyListeners: Number(row.monthly_listeners) || 0,
      heroImageUrl: profileUrl,
      bio: row.bio || row.biography || undefined,
      accentColor: '#4B9CD3',
      popularTracks,
      currentProject: current ? toSummary(current) : undefined,
    };

    return {
      artist,
      userId,
      isOwner: !!(params.viewerUserId && userId && params.viewerUserId === userId),
      projects,
    };
  },
};

function toSummary(p: Project): ProjectSummary {
  const percent =
    p.fundingGoal > 0 ? (p.paperBackingTotal / p.fundingGoal) * 100 : 0;
  return {
    id: p.id,
    title: p.title,
    artworkUrl: p.artworkUrl,
    percentBacked: percent,
    fundingGoal: p.fundingGoal,
    paperBackingTotal: p.paperBackingTotal,
  };
}

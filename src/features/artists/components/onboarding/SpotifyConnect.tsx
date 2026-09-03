import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  parseSpotifyArtistId,
  searchSpotifyArtists,
  getSpotifyArtist,
  type SpotifyArtist,
} from '../../services/musicMetricsService';

const c = {
  surface: '#15151A',
  surfaceElevated: '#1D1D24',
  line: '#26262D',
  textPrimary: '#F4F4F6',
  textSecondary: '#C9C6D4',
  textMuted: '#9B9BA4',
  textFaint: '#6A6A74',
  accent: '#4B9CD3',
  accentTint: 'rgba(75,156,211,0.14)',
  onAccent: '#0A0A0C',
  negative: '#FF6A5E',
};

type Props = {
  /** Pre-fills the search box from the name entered on the previous step. */
  initialQuery?: string;
  selected: SpotifyArtist | null;
  onSelect: (artist: SpotifyArtist | null) => void;
};

/**
 * Links the artist's Spotify profile so followers, popularity, genres and the
 * top-track list come from Spotify rather than from a form. Accepts a pasted
 * profile URL as well as a name search — an artist looking at their own
 * Spotify page usually has the URL to hand.
 */
export function SpotifyConnect({ initialQuery = '', selected, onSelect }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const run = useCallback(async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setError(null);
    try {
      // A pasted URL identifies the artist exactly — no need to guess.
      const pastedId = parseSpotifyArtistId(q);
      if (pastedId) {
        onSelect(await getSpotifyArtist(pastedId));
        setResults([]);
      } else {
        setResults(await searchSpotifyArtists(q, 8));
      }
      setSearched(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not reach Spotify. Try again.',
      );
    } finally {
      setSearching(false);
    }
  }, [query, searching, onSelect]);

  if (selected) {
    return (
      <View style={styles.card}>
        <View style={styles.selectedRow}>
          {selected.imageUrl ? (
            <Image source={{ uri: selected.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selected.name}
            </Text>
            <Text style={styles.selectedMeta} numberOfLines={1}>
              {`${fmt(selected.followers)} followers · popularity ${selected.popularity}/100`}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={c.accent} />
        </View>

        {selected.genres.length > 0 ? (
          <Text style={styles.genres} numberOfLines={1}>
            {selected.genres.slice(0, 3).join(' · ')}
          </Text>
        ) : null}

        <Pressable
          onPress={() => {
            onSelect(null);
            setResults([]);
            setSearched(false);
          }}
          style={styles.changeBtn}
          accessibilityRole="button"
          accessibilityLabel="Choose a different Spotify profile"
        >
          <Text style={styles.changeText}>Not you? Search again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={c.textFaint} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Artist name or Spotify URL"
          placeholderTextColor={c.textFaint}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={run}
        />
        <Pressable
          onPress={run}
          disabled={!query.trim() || searching}
          style={[styles.searchBtn, (!query.trim() || searching) && styles.searchBtnOff]}
          accessibilityRole="button"
          accessibilityLabel="Search Spotify"
        >
          {searching ? (
            <ActivityIndicator size="small" color={c.onAccent} />
          ) : (
            <Text style={styles.searchBtnText}>Find</Text>
          )}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.map((a) => (
        <Pressable
          key={a.spotifyId}
          style={styles.resultRow}
          onPress={() => onSelect(a)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${a.name}`}
        >
          {a.imageUrl ? (
            <Image source={{ uri: a.imageUrl }} style={styles.resultAvatar} />
          ) : (
            <View style={[styles.resultAvatar, styles.avatarFallback]} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.resultName} numberOfLines={1}>
              {a.name}
            </Text>
            <Text style={styles.resultMeta} numberOfLines={1}>
              {`${fmt(a.followers)} followers${a.genres[0] ? ` · ${a.genres[0]}` : ''}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
        </Pressable>
      ))}

      {searched && results.length === 0 && !error && !searching ? (
        <Text style={styles.empty}>
          No match on Spotify. You can skip this and add your numbers by hand.
        </Text>
      ) : null}
    </View>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  input: { flex: 1, height: 52, color: c.textPrimary, fontSize: 16 },
  searchBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnOff: { opacity: 0.4 },
  searchBtnText: { color: c.onAccent, fontWeight: '800', fontSize: 14 },

  error: { color: c.negative, fontSize: 13, marginTop: 10 },
  empty: { color: c.textMuted, fontSize: 13, marginTop: 14, lineHeight: 19 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  resultAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surfaceElevated },
  resultName: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
  resultMeta: { color: c.textMuted, fontSize: 13, marginTop: 2 },

  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
    padding: 16,
  },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.surfaceElevated },
  avatarFallback: { backgroundColor: c.surfaceElevated },
  selectedName: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
  selectedMeta: { color: c.textSecondary, fontSize: 13, marginTop: 3 },
  genres: { color: c.textMuted, fontSize: 12, marginTop: 12, textTransform: 'capitalize' },
  changeBtn: { marginTop: 14, alignSelf: 'flex-start' },
  changeText: { color: c.accent, fontSize: 13, fontWeight: '600' },
});

export default SpotifyConnect;

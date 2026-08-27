import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText } from '../../../shared/components/ui';
import { ChipRow } from '../../../shared/components/ui/Chip';
import {
  discoveryService,
  DiscoveryArtist,
  DiscoveryProject,
} from '../../explore/services/discoveryService';

const c = MusiStashTheme.colors;

const GENRES = [
  'All',
  'Alternative R&B',
  'Post-punk',
  'Folk soul',
  'Industrial',
  'Bedroom pop',
  'Hyperpop',
  'Ambient',
];

type Row =
  | { kind: 'project'; data: DiscoveryProject }
  | { kind: 'artist'; data: DiscoveryArtist };

function listeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export default function SearchScreen(props: any) {
  const insets = useSafeAreaInsets();
  const nav = props.navigation;
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<DiscoveryProject[]>([]);
  const [artists, setArtists] = useState<DiscoveryArtist[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await discoveryService.search('', 'All');
        if (!cancelled) {
          setProjects(res.projects);
          setArtists(res.artists);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Search is unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const gOk = (g: string) => genre === 'All' || g === genre;
    const p: Row[] = projects
      .filter((x) => !q || `${x.title} ${x.artistName} ${x.type}`.toLowerCase().includes(q))
      .map((data) => ({ kind: 'project', data }));
    const a: Row[] = artists
      .filter(
        (x) =>
          gOk(x.genre) &&
          (!q || `${x.name} ${x.genre} ${x.location ?? ''}`.toLowerCase().includes(q)),
      )
      .map((data) => ({ kind: 'artist', data }));
    return genre === 'All' ? [...p, ...a] : a;
  }, [projects, artists, query, genre]);

  const open = (row: Row) => {
    if (row.kind === 'project') nav?.navigate?.('ProjectDetail', { projectId: row.data.id });
    else nav?.navigate?.('ArtistExperience', { artistId: row.data.id });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <AppText variant="h1" style={styles.h1}>
          Search
        </AppText>
        <View style={styles.field}>
          <Ionicons name="search" size={17} color={c.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Artists, projects, genres"
            placeholderTextColor={c.textFaint}
            style={styles.input}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={17} color={c.textFaint} />
            </Pressable>
          )}
        </View>
      </View>

      <ChipRow options={GENRES} value={genre} onChange={setGenre} wrap style={styles.chips} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error ? (
        <AppText variant="bodySmall" color={c.negative} style={styles.pad}>
          {error}
        </AppText>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <AppText variant="eyebrow" color={c.textFaint} style={styles.resultsLabel}>
            {`${results.length} RESULT${results.length === 1 ? '' : 'S'}`}
          </AppText>

          {results.length === 0 ? (
            <AppText variant="bodySmall" color={c.textFaint} center style={styles.empty}>
              {query ? `Nothing matches “${query}”.` : 'No results.'}
            </AppText>
          ) : (
            results.map((row, i) => {
              const isProject = row.kind === 'project';
              const title = isProject ? row.data.title : row.data.name;
              const sub = isProject
                ? `${row.data.artistName} · ${row.data.type}`
                : `${row.data.genre} · ${listeners(row.data.monthlyListeners)} listeners`;
              const stat = isProject ? `${row.data.percent}%` : 'artist';
              const statLabel = isProject ? 'backed' : '';
              const art = isProject ? row.data.artworkUrl : row.data.avatarUrl;
              return (
                <Pressable
                  key={`${row.kind}-${row.data.id}`}
                  style={[styles.row, i > 0 && styles.rowDivider]}
                  onPress={() => open(row)}
                  accessibilityRole="button"
                  accessibilityLabel={title}
                >
                  <View style={styles.rowArt}>
                    {art ? (
                      <Image source={{ uri: art }} style={StyleSheet.absoluteFill} />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.artFallback]} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="h4" numberOfLines={1}>
                      {title}
                    </AppText>
                    <AppText variant="bodySmall" color={c.textMuted} numberOfLines={1}>
                      {sub}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="label" tabular color={c.accentSolid}>
                      {stat}
                    </AppText>
                    {!!statLabel && (
                      <AppText variant="caption" color={c.textFaint}>
                        {statLabel}
                      </AppText>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: { padding: 20 },

  head: { paddingHorizontal: 20, paddingTop: 14 },
  h1: {},
  field: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  input: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: c.textPrimary,
    padding: 0,
  },

  chips: { paddingHorizontal: 20, paddingVertical: 12 },

  resultsLabel: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  empty: { padding: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 66,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.listDivider },
  rowArt: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  artFallback: { backgroundColor: c.surfaceElevated },
});

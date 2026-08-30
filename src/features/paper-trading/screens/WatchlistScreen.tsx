import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText, Eyebrow } from '../../../shared/components/ui';
import { statusLabel } from '../domain/projectLifecycle';
import { watchlistService, WatchlistProject } from '../services/watchlistService';

const c = MusiStashTheme.colors;

type NavLike = {
  goBack?: () => void;
  navigate?: (name: string, params?: Record<string, unknown>) => void;
  getParent?: () => NavLike | undefined;
};

function money(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WatchlistScreen({ navigation }: { navigation?: NavLike }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WatchlistProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await watchlistService.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your saved projects');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const openProject = (id: string) =>
    navigation?.navigate?.('ProjectDetail', { projectId: id });

  const goExplore = () => {
    const parent = navigation?.getParent?.();
    (parent?.navigate ?? navigation?.navigate)?.('MainTabs', { screen: 'Explore' });
  };

  const removeItem = async (id: string) => {
    setBusyId(id);
    const prev = items;
    setItems((list) => list.filter((p) => p.id !== id)); // optimistic
    try {
      await watchlistService.remove(id);
    } catch {
      setItems(prev); // revert
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.nav, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </Pressable>
        <AppText variant="h4" style={styles.navTitle}>
          Saved
        </AppText>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <AppText variant="bodySmall" color={c.negative} center>
            {error}
          </AppText>
          <Pressable style={styles.retry} onPress={load} accessibilityRole="button">
            <AppText variant="label" color={c.accent}>
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={30} color={c.textFaint} />
          <AppText variant="h4" color={c.textSecondary} center style={{ marginTop: 12 }}>
            Nothing saved yet
          </AppText>
          <AppText
            variant="bodySmall"
            color={c.textMuted}
            center
            style={{ marginTop: 6, maxWidth: 260 }}
          >
            Tap the bookmark on a project to keep an eye on it here.
          </AppText>
          <Pressable style={styles.retry} onPress={goExplore} accessibilityRole="button">
            <AppText variant="label" color={c.accent}>
              Explore projects
            </AppText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
          ListHeaderComponent={
            <AppText variant="bodySmall" color={c.textMuted} style={styles.count}>
              {`${items.length} project${items.length === 1 ? '' : 's'}`}
            </AppText>
          }
          renderItem={({ item, index }) => {
            const up = item.changePctVsStart >= 0;
            return (
              <Pressable
                style={[styles.row, index > 0 && styles.rowDivider]}
                onPress={() => openProject(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.artistName}, ${item.title}`}
              >
                <View style={styles.mark}>
                  <AppText variant="h4" color={c.textFaint}>
                    {(item.title || '?').charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <View style={styles.rowMid}>
                  <AppText variant="h4" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText variant="bodySmall" color={c.textMuted} numberOfLines={1}>
                    {`${item.artistName} · ${money(item.currentPrice)} · ${statusLabel(
                      item.status as any,
                    )}`}
                  </AppText>
                </View>
                <View style={styles.rowRight}>
                  <AppText
                    variant="bodySmall"
                    tabular
                    color={up ? c.accentSolid : c.negative}
                  >
                    {`${up ? '+' : ''}${item.changePctVsStart.toFixed(1)}%`}
                  </AppText>
                  <Pressable
                    onPress={() => removeItem(item.id)}
                    disabled={busyId === item.id}
                    style={styles.bookmarkBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title} from saved`}
                    hitSlop={8}
                  >
                    <Ionicons name="bookmark" size={20} color={c.accent} />
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <AppText variant="caption" color={c.textFaint} style={styles.disclosure}>
        MusiStash Paper Trading is a simulation. No real securities or returns are
        being offered.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  retry: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: c.accentTint,
  },

  count: { paddingTop: 6, paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    minHeight: 66,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.listDivider,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMid: { flex: 1, minWidth: 0 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookmarkBtn: { padding: 6 },

  disclosure: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    lineHeight: 16,
  },
});

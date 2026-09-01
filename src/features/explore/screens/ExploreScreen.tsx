import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MusiStashTheme } from '../../../styles/theme';
import PostsScreen from '../../posts/screens/PostsScreen';
import BrowseArtistsScreen from '../../artists/screens/BrowseArtistsScreen';
import SearchScreen from '../../profile/screens/SearchScreen';

type ExploreTab = 'foryou' | 'artists' | 'search';

const TABS: { key: ExploreTab; label: string }[] = [
  { key: 'foryou', label: 'For You' },
  { key: 'artists', label: 'Artists' },
  { key: 'search', label: 'Search' },
];

export default function ExploreScreen(props: any) {
  const [tab, setTab] = useState<ExploreTab>('foryou');

  return (
    // The tab's UniversalHeader already clears the notch — don't re-pad the top.
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setTab(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.body}>
        {tab === 'foryou' && (
          <PostsScreen navigation={props.navigation} route={props.route} />
        )}
        {tab === 'artists' && (
          <BrowseArtistsScreen navigation={props.navigation} embedded />
        )}
        {tab === 'search' && (
          <SearchScreen navigation={props.navigation} route={props.route} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MusiStashTheme.colors.background,
    paddingTop: MusiStashTheme.spacing[3],
  },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: MusiStashTheme.spacing[4],
    marginBottom: MusiStashTheme.spacing[2],
    padding: 4,
    borderRadius: MusiStashTheme.borderRadius.xl,
    backgroundColor: MusiStashTheme.colors.card,
    borderWidth: 1,
    borderColor: MusiStashTheme.colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: MusiStashTheme.spacing[2],
    alignItems: 'center',
    borderRadius: MusiStashTheme.borderRadius.lg,
  },
  segmentActive: {
    backgroundColor: MusiStashTheme.colors.accent,
  },
  segmentText: {
    ...MusiStashTheme.typography.label,
    color: MusiStashTheme.colors.mutedForeground,
  },
  segmentTextActive: {
    color: MusiStashTheme.colors.white,
  },
  body: {
    flex: 1,
  },
});

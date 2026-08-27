import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../styles/theme';

const c = MusiStashTheme.colors;

export interface ScreenScaffoldProps {
  children: React.ReactNode;
  /** Pin content to the bottom (above the home indicator). */
  bottomAction?: React.ReactNode;
  /** Apply top safe-area padding to the content (default true). */
  safeTop?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Full-bleed dark screen container. Optional sticky bottom action bar with a
 * fade so scrolling content passes under it.
 */
export function ScreenScaffold({
  children,
  bottomAction,
  safeTop = true,
  style,
  contentStyle,
}: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, style]}>
      <View
        style={[
          styles.content,
          safeTop && { paddingTop: insets.top },
          contentStyle,
        ]}
      >
        {children}
      </View>
      {bottomAction ? (
        <View
          style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          {bottomAction}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { flex: 1 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: c.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.listDivider,
  },
});

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { MusiStashTheme } from '../../../../styles/theme';
import { AppText } from '../../../../shared/components/ui';
import { BottomSheetFrame } from './BottomSheetFrame';

const c = MusiStashTheme.colors;

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Tapped from the Portfolio "LIVE" pill. There is no join form — every account
 * is already enrolled — so this just confirms status and shows how many people
 * are waiting for real-money investing.
 */
export function LiveWaitlistSheet({ visible, onClose }: Props) {
  const [total, setTotal] = useState<number | null>(null);
  const [onList, setOnList] = useState(true);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc('rpc_waitlist_status');
        if (!cancelled && data) {
          setTotal(typeof data.total === 'number' ? data.total : Number(data.total));
          setOnList(!!data.on_list);
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <BottomSheetFrame visible={visible} title="Live investing" onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={26} color={c.accentSolid} />
        </View>

        <AppText variant="h2" style={styles.title}>
          {onList ? "You're on the list" : 'Live investing is coming'}
        </AppText>

        <AppText variant="body" color={c.textMuted} style={styles.copy}>
          Real-money investing isn&apos;t open yet. Your MusiStash account is
          automatically in line — we&apos;ll let you know the moment it goes live.
        </AppText>

        {total != null && (
          <View style={styles.countRow}>
            <AppText variant="money" tabular color={c.accentSolid}>
              {total.toLocaleString()}
            </AppText>
            <AppText variant="bodySmall" color={c.textMuted}>
              {total === 1 ? 'person waiting' : 'people waiting'}
            </AppText>
          </View>
        )}

        <Pressable
          style={styles.cta}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Got it"
        >
          <AppText variant="button" color={c.onAccent}>
            Got it
          </AppText>
        </Pressable>

        <AppText variant="caption" color={c.textFaint} style={styles.disclosure}>
          MusiStash Paper Trading is a simulation. No real securities or returns
          are being offered.
        </AppText>
      </View>
    </BottomSheetFrame>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 18 },
  copy: { marginTop: 10 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 22,
  },
  cta: {
    marginTop: 24,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosure: { marginTop: 16, lineHeight: 16 },
});

export default LiveWaitlistSheet;

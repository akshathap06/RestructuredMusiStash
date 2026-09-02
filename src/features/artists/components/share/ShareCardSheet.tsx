import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  PixelRatio,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';
import { MusiStashTheme } from '../../../../styles/theme';
import { analytics } from '../../../../services/analytics';
import { artistProjectService } from '../../services/artistProjectService';
import type { Artist, Project } from '../../types/experience';
import { ArtistShareCard, FORMAT_RATIO, type ShareFormat } from './ArtistShareCard';
import { buildShareCardModel } from './shareCardData';

const { colors, fonts } = MusiStashTheme;

/** Filename-safe artist name, e.g. "KALEB" -> "kaleb". */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'artist';

/** Long edge of the exported PNG. 1080 is Instagram's native upload width. */
const EXPORT_W = 1080;

type Props = {
  visible: boolean;
  onClose: () => void;
  artist: Artist | null;
  projects?: Project[];
};

export function ShareCardSheet({ visible, onClose, artist, projects = [] }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const cardRef = useRef<View>(null);

  const [format, setFormat] = useState<ShareFormat>('post');
  const [priceHistory, setPriceHistory] = useState<{ t: number; v: number }[]>([]);
  const [artworkReady, setArtworkReady] = useState(false);
  const [busy, setBusy] = useState<null | 'share' | 'save'>(null);

  // A live project's model-price series is the one genuine trend we can plot.
  useEffect(() => {
    if (!visible || !artist) return;
    const live = projects.find((p) =>
      ['funding', 'funded', 'active'].includes(p.status),
    );
    if (!live) {
      setPriceHistory([]);
      return;
    }
    let cancelled = false;
    artistProjectService
      .getPriceHistory(live.id, 90)
      .then((h) => !cancelled && setPriceHistory(h))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [visible, artist, projects]);

  useEffect(() => {
    if (visible && artist) {
      analytics.track('share_card_opened', { artist_id: artist.id });
    } else if (!visible) {
      setArtworkReady(false);
    }
  }, [visible, artist]);

  const model = useMemo(
    () => (artist ? buildShareCardModel({ artist, projects, priceHistory }) : null),
    [artist, projects, priceHistory],
  );

  // Fit the card to whatever room the sheet has left, in both axes.
  const previewW = useMemo(() => {
    const chromeH = insets.top + insets.bottom + 300;
    const availH = Math.max(240, screenH - chromeH);
    const availW = screenW - 48;
    return Math.floor(Math.min(availW, availH / FORMAT_RATIO[format]));
  }, [screenW, screenH, insets.top, insets.bottom, format]);

  const capture = useCallback(async (): Promise<string> => {
    // view-shot takes points and rasterises at the screen scale, so divide
    // through to land on exactly EXPORT_W pixels rather than 3x that.
    const scale = PixelRatio.get();
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: EXPORT_W / scale,
      height: Math.round(EXPORT_W * FORMAT_RATIO[format]) / scale,
    });
    // captureRef names the file with a UUID, which is what the share sheet
    // and Files would show. Rename to something the artist would recognise.
    try {
      const named = new File(Paths.cache, `${slug(model?.name ?? 'artist')}-musistash.png`);
      if (named.exists) named.delete();
      new File(uri).move(named);
      return named.uri;
    } catch {
      return uri;
    }
  }, [format, model?.name]);

  const onShare = useCallback(async () => {
    if (!model || busy) return;
    setBusy('share');
    try {
      const uri = await capture();
      // iOS carries both on one sheet: Instagram takes the image, X takes
      // image + text. Passing only the file would drop the link.
      await Share.share({
        url: uri,
        message: `${model.name} on MusiStash — ${model.url}`,
      });
      analytics.track('share_card_shared', { format });
    } catch (e) {
      Alert.alert(
        'Could not create the card',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setBusy(null);
    }
  }, [model, busy, capture, format]);

  const onSave = useCallback(async () => {
    if (!model || busy) return;
    setBusy('save');
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photos access needed',
          'Allow photo access in Settings to save the card to your library.',
        );
        return;
      }
      const uri = await capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      analytics.track('share_card_saved', { format });
      Alert.alert('Saved', 'The card is in your photo library.');
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setBusy(null);
    }
  }, [model, busy, capture, format]);

  if (!model) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: 14 }]}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>Share card</Text>
          <Pressable
            onPress={onClose}
            style={[styles.headerSide, styles.closeBtn]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <View
            ref={cardRef}
            collapsable={false}
            renderToHardwareTextureAndroid
            style={styles.cardShadow}
          >
            <ArtistShareCard
              model={model}
              format={format}
              width={previewW}
              onArtworkLoad={() => setArtworkReady(true)}
            />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.segment}>
            {(['post', 'story'] as ShareFormat[]).map((f) => {
              const active = f === format;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFormat(f)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={f === 'post' ? 'Post format' : 'Story format'}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {f === 'post' ? 'Post  4:5' : 'Story  9:16'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onShare}
            disabled={!artworkReady || busy !== null}
            style={({ pressed }) => [
              styles.primary,
              (!artworkReady || busy !== null) && styles.disabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Share card"
          >
            {busy === 'share' ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color={colors.onAccent} />
                <Text style={styles.primaryText}>
                  {artworkReady ? 'Share' : 'Preparing…'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={onSave}
            disabled={!artworkReady || busy !== null}
            style={({ pressed }) => [
              styles.secondary,
              (!artworkReady || busy !== null) && styles.disabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save card to photos"
          >
            {busy === 'save' ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.secondaryText}>Save to Photos</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerSide: { width: 40, height: 32, justifyContent: 'center' },
  closeBtn: { alignItems: 'flex-end' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.textPrimary,
  },

  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },

  footer: { paddingHorizontal: 20, gap: 10 },

  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    marginBottom: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: colors.surfaceElevated },
  segmentText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.textFaint },
  segmentTextActive: { color: colors.textPrimary },

  primary: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.onAccent },

  secondary: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },

  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});

export default ShareCardSheet;

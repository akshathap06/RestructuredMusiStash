import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import { BarColumns, TrendLine } from './ShareCardChart';
import type { ShareCardModel } from './shareCardData';

const { colors, fonts } = MusiStashTheme;

/** Type sizes are authored against a card this wide, then scaled by `s`. */
const BASE_CARD_W = 310;
/** Card proportion. Fixed so the layout is identical in both export formats. */
const CARD_RATIO = 1.38;

export type ShareFormat = 'post' | 'story';

/** 4:5 reads well in the Instagram feed and on X; 9:16 fills a Story. */
export const FORMAT_RATIO: Record<ShareFormat, number> = {
  post: 5 / 4,
  story: 16 / 9,
};

/**
 * Vertical budget as a fraction of card height. Sections are laid out to these
 * shares rather than to their content, so the card can never outgrow the frame
 * it is exported into — the failure mode would be a clipped, unpostable image.
 */
const BAND = {
  full: { hero: 375, stats: 135, chart: 185, tracks: 200, footer: 105 },
  chartOnly: { hero: 430, stats: 160, chart: 285, tracks: 0, footer: 125 },
  tracksOnly: { hero: 400, stats: 155, chart: 0, tracks: 340, footer: 105 },
  // Barely any data: lead with the artwork and the headline numbers rather
  // than leave a hole where the missing sections would have been.
  sparse: { hero: 600, stats: 265, chart: 0, tracks: 0, footer: 135 },
};

type Props = {
  model: ShareCardModel;
  format: ShareFormat;
  /** Backdrop width in dp. Height follows the format ratio. */
  width: number;
  onArtworkLoad?: () => void;
};

/**
 * The artwork that gets exported and shared. Rendered on screen so the preview
 * is the export — view-shot captures this exact view.
 */
export function ArtistShareCard({ model, format, width, onArtworkLoad }: Props) {
  const height = width * FORMAT_RATIO[format];
  const story = format === 'story';
  const accent = model.accent;

  // Fit the card inside the frame in both axes; 4:5 is height-bound, 9:16 is
  // width-bound and keeps the leftover space for the surrounding wordmarks.
  const s0 = width / 340;
  const padH = 15 * s0;
  const padV = 16 * s0;
  const cardW = Math.min(width - padH * 2, (height - padV * 2) / CARD_RATIO);
  const cardH = cardW * CARD_RATIO;
  const s = cardW / BASE_CARD_W;

  const hasChart = model.chart.kind !== 'none';
  const hasTracks = model.tracks.length > 0;
  const band = hasChart
    ? hasTracks
      ? BAND.full
      : BAND.chartOnly
    : hasTracks
      ? BAND.tracksOnly
      : BAND.sparse;
  const total = band.hero + band.stats + band.chart + band.tracks + band.footer;
  const heroH = (cardH * band.hero) / total;
  const chartH = (cardH * band.chart) / total;
  const padX = 17 * s;

  return (
    <View style={[styles.backdrop, { width, height }]}>
      <LinearGradient
        colors={[tint(accent, 0.42), '#0B0B0E', '#08080A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {story ? (
        <Text
          style={[styles.storyKicker, { fontSize: 11 * s, letterSpacing: 3 * s }]}
        >
          MUSISTASH · INVEST IN MUSIC
        </Text>
      ) : null}

      <View
        style={[
          styles.card,
          { width: cardW, height: cardH, borderRadius: 28 * s },
        ]}
      >
        {/* --- artwork ------------------------------------------------- */}
        <View style={{ flexGrow: band.hero, flexBasis: 0, minHeight: 0 }}>
          <Image
            source={{ uri: model.artworkUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onLoadEnd={onArtworkLoad}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={['rgba(11,11,14,0.10)', 'rgba(19,19,24,0.70)', '#131318']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={[
              styles.badge,
              {
                top: 13 * s,
                left: 13 * s,
                paddingHorizontal: 9 * s,
                paddingVertical: 4.5 * s,
              },
            ]}
          >
            <Text style={[styles.badgeText, { fontSize: 8 * s, letterSpacing: 1.4 * s }]}>
              MUSISTASH
            </Text>
          </View>

          <View style={[styles.heroText, { left: padX, right: padX, bottom: 12 * s }]}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  { fontSize: 32 * s, lineHeight: 35 * s, letterSpacing: -0.8 * s },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {model.name}
              </Text>
              {model.verified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={16 * s}
                  color={accent}
                  style={{ marginLeft: 6 * s }}
                />
              ) : null}
            </View>
            {model.subtitle ? (
              <Text
                style={[styles.subtitle, { fontSize: 11.5 * s, marginTop: 2 * s }]}
                numberOfLines={1}
              >
                {model.subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* --- stats ---------------------------------------------------- */}
        <View
          style={[
            styles.stats,
            {
              flexGrow: band.stats,
              flexBasis: 0,
              minHeight: 0,
              paddingHorizontal: padX,
            },
          ]}
        >
          {model.stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 ? <View style={[styles.statRule, { marginHorizontal: 11 * s }]} /> : null}
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { fontSize: 23 * s }]} numberOfLines={1}>
                  {stat.value}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    { fontSize: 7.5 * s, letterSpacing: 1 * s, marginTop: 2 * s },
                  ]}
                  numberOfLines={1}
                >
                  {stat.label.toUpperCase()}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* --- chart ---------------------------------------------------- */}
        {hasChart && model.chart.kind !== 'none' ? (
          <View
            style={{
              flexGrow: band.chart,
              flexBasis: 0,
              minHeight: 0,
              overflow: 'hidden',
              paddingHorizontal: padX,
            }}
          >
            <View style={styles.blockHead}>
              <Text
                style={[styles.eyebrow, { fontSize: 8 * s, letterSpacing: 1.1 * s }]}
                numberOfLines={1}
              >
                {model.chart.caption.toUpperCase()}
              </Text>
              {model.chart.kind === 'momentum' ? (
                <Text
                  style={[
                    styles.delta,
                    {
                      fontSize: 10.5 * s,
                      color: model.chart.deltaPct >= 0 ? accent : colors.negative,
                    },
                  ]}
                >
                  {`${model.chart.deltaPct >= 0 ? '+' : ''}${model.chart.deltaPct.toFixed(1)}%`}
                </Text>
              ) : null}
            </View>

            <View style={styles.chartBody}>
              {model.chart.kind === 'momentum' ? (
                <TrendLine
                  points={model.chart.points}
                  width={cardW - padX * 2}
                  height={chartH * 0.56}
                  color={accent}
                  s={s}
                />
              ) : (
                <BarColumns
                  values={model.chart.bars.map((b) => b.value)}
                  height={chartH * 0.56}
                  color={accent}
                  s={s}
                />
              )}
            </View>
          </View>
        ) : null}

        {/* --- tracks --------------------------------------------------- */}
        {hasTracks ? (
          <View
            style={{
              flexGrow: band.tracks,
              flexBasis: 0,
              minHeight: 0,
              overflow: 'hidden',
              paddingHorizontal: padX,
            }}
          >
            <Text style={[styles.eyebrow, { fontSize: 8 * s, letterSpacing: 1.1 * s }]}>
              POPULAR
            </Text>
            <View style={styles.trackList}>
              {model.tracks.map((track) => (
                <View key={track.rank} style={styles.trackRow}>
                  <Text style={[styles.rank, { fontSize: 10 * s, width: 14 * s }]}>
                    {track.rank}
                  </Text>
                  <Text
                    style={[styles.trackTitle, { fontSize: 12.5 * s }]}
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  {track.plays ? (
                    <Text style={[styles.trackPlays, { fontSize: 10.5 * s }]}>
                      {track.plays}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* --- footer --------------------------------------------------- */}
        <View
          style={[
            styles.footer,
            {
              flexGrow: band.footer,
              flexBasis: 0,
              minHeight: 0,
              marginHorizontal: padX,
            },
          ]}
        >
          <Image
            source={require('../../../../../assets/brand/lockup-reversed.png')}
            style={{ width: 72 * s, height: 17 * s }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={[styles.url, { fontSize: 10 * s }]}>{model.urlLabel}</Text>
        </View>
      </View>

      {story ? (
        <Text
          style={[styles.storyFooter, { fontSize: 10.5 * s, letterSpacing: 0.3 * s }]}
        >
          Back artist projects with simulated cash
        </Text>
      ) : null}
    </View>
  );
}

/** Flat blend of a hex accent toward the near-black backdrop. */
function tint(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#16161C';
  const int = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c * amount + 10 * (1 - amount));
  return `rgb(${mix((int >> 16) & 255)}, ${mix((int >> 8) & 255)}, ${mix(int & 255)})`;
}

const styles = StyleSheet.create({
  backdrop: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#08080A',
  },
  card: {
    backgroundColor: '#131318',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },

  badge: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(8,8,10,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  badgeText: { fontFamily: fonts.extrabold, color: '#FFFFFF' },

  heroText: { position: 'absolute' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { flexShrink: 1, fontFamily: fonts.extrabold, color: '#FFFFFF' },
  subtitle: { fontFamily: fonts.medium, color: colors.textMuted },

  stats: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  statCell: { flex: 1, minWidth: 0 },
  statRule: {
    width: StyleSheet.hairlineWidth,
    height: '52%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: { fontFamily: fonts.extrabold, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.bold, color: colors.textFaint },

  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartBody: { flex: 1, justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.bold, color: colors.textFaint },
  delta: { fontFamily: fonts.extrabold },

  trackList: { flex: 1, justifyContent: 'space-evenly' },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  rank: { fontFamily: fonts.bold, color: colors.textFaint },
  trackTitle: { flex: 1, minWidth: 0, fontFamily: fonts.bold, color: colors.textPrimary },
  trackPlays: { fontFamily: fonts.medium, color: colors.textMuted, marginLeft: 8 },

  footer: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  url: { fontFamily: fonts.semibold, color: colors.textMuted },

  storyKicker: {
    position: 'absolute',
    top: '9%',
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    color: 'rgba(255,255,255,0.55)',
  },
  storyFooter: {
    position: 'absolute',
    bottom: '9%',
    textAlign: 'center',
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.45)',
  },
});

export default ArtistShareCard;

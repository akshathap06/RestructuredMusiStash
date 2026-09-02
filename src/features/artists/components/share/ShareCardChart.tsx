import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Charts for the share card, drawn with plain Views.
 *
 * Deliberately dependency-free: react-native-svg is not linked into this
 * client, and a share card must render identically inside a view-shot capture
 * — plain Views always do.
 */

const LINE_THICKNESS = 2.5;

type TrendProps = {
  points: number[];
  width: number;
  height: number;
  color: string;
  /** Scales stroke/dot sizing with the card. */
  s: number;
};

/** Polyline drawn as rotated 1-D Views, one per segment. */
export function TrendLine({ points, width, height, color, s }: TrendProps) {
  const { segments, last } = useMemo(() => {
    if (width <= 0 || points.length < 2) {
      return { segments: [] as Seg[], last: null as null | Pt };
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    const padY = LINE_THICKNESS * s;
    const usable = height - padY * 2;
    const denom = points.length - 1;

    const coords: Pt[] = points.map((v, i) => ({
      x: (i / denom) * width,
      y: padY + (1 - (v - min) / span) * usable,
    }));

    const segs: Seg[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      // Overlap neighbours by one stroke width so the joints close up;
      // butt-ended segments otherwise leave the line looking dashed.
      const t = LINE_THICKNESS * s;
      segs.push({
        // Views rotate about their centre, so position at the midpoint.
        left: (a.x + b.x) / 2 - (len + t) / 2,
        top: (a.y + b.y) / 2 - t / 2,
        width: len + t,
        angle: Math.atan2(dy, dx),
      });
    }
    return { segments: segs, last: coords[coords.length - 1] };
  }, [points, width, height, s]);

  const dot = 7 * s;

  return (
    <View style={{ width, height }}>
      {segments.map((seg, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: seg.left,
            top: seg.top,
            width: seg.width,
            height: LINE_THICKNESS * s,
            borderRadius: LINE_THICKNESS * s,
            backgroundColor: color,
            transform: [{ rotate: `${seg.angle}rad` }],
          }}
        />
      ))}
      {last ? (
        <View
          style={{
            position: 'absolute',
            left: last.x - dot / 2,
            top: last.y - dot / 2,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: color,
          }}
        />
      ) : null}
    </View>
  );
}

type BarsProps = {
  values: number[];
  height: number;
  color: string;
  s: number;
};

/** Columns normalised to the tallest value; the leader keeps full accent. */
export function BarColumns({ values, height, color, s }: BarsProps) {
  const max = Math.max(...values, 1);
  return (
    <View style={[styles.bars, { height, gap: 6 * s }]}>
      {values.map((v, i) => {
        const ratio = Math.max(v / max, 0.08);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: height * ratio,
              borderRadius: 3 * s,
              backgroundColor: color,
              opacity: i === 0 ? 1 : 0.34,
            }}
          />
        );
      })}
    </View>
  );
}

type Pt = { x: number; y: number };
type Seg = { left: number; top: number; width: number; angle: number };

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end' },
});

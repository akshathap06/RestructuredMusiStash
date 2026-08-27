import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

export type ChartPoint = { t: number; v: number };

export type InteractiveLineChartProps = {
  points: ChartPoint[];
  height?: number;
  color?: string;
  positiveColor?: string;
  negativeColor?: string;
  onScrub?: (point: ChartPoint | null) => void;
};

const MAX_SEGMENTS = 60;
const PAD_Y = 10;
const LINE_THICKNESS = 2;

const POSITIVE_DEFAULT = '#62D892';
const NEGATIVE_DEFAULT = '#EF4444';
const BASELINE_COLOR = 'rgba(255,255,255,0.18)';

type Coord = { x: number; y: number };

type Segment = {
  left: number;
  top: number;
  width: number;
  angle: number; // radians
};

function downsample(points: ChartPoint[], maxSegments: number): ChartPoint[] {
  if (points.length <= maxSegments + 1) return points;
  const step = (points.length - 1) / maxSegments;
  const out: ChartPoint[] = [];
  for (let i = 0; i <= maxSegments; i++) {
    out.push(points[Math.round(i * step)]);
  }
  return out;
}

export default function InteractiveLineChart({
  points,
  height = 180,
  color,
  positiveColor = POSITIVE_DEFAULT,
  negativeColor = NEGATIVE_DEFAULT,
  onScrub,
}: InteractiveLineChartProps) {
  const [width, setWidth] = useState(0);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;

  const sampled = useMemo(() => downsample(points, MAX_SEGMENTS), [points]);

  const lineColor = useMemo(() => {
    if (color) return color;
    if (sampled.length < 2) return positiveColor;
    return sampled[sampled.length - 1].v >= sampled[0].v ? positiveColor : negativeColor;
  }, [color, sampled, positiveColor, negativeColor]);

  const { coords, segments, baselineY } = useMemo(() => {
    if (width <= 0 || sampled.length === 0) {
      return { coords: [] as Coord[], segments: [] as Segment[], baselineY: height / 2 };
    }

    const values = sampled.map((p) => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const usable = height - PAD_Y * 2;
    const denom = Math.max(sampled.length - 1, 1);

    const nextCoords: Coord[] = sampled.map((p, i) => ({
      x: (i / denom) * width,
      y: PAD_Y + (1 - (p.v - min) / span) * usable,
    }));

    const nextSegments: Segment[] = [];
    for (let i = 0; i < nextCoords.length - 1; i++) {
      const a = nextCoords[i];
      const b = nextCoords[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) continue;
      nextSegments.push({
        // Position at the segment midpoint; RN rotates around the view center.
        left: (a.x + b.x) / 2 - length / 2,
        top: (a.y + b.y) / 2 - LINE_THICKNESS / 2,
        width: length,
        angle: Math.atan2(dy, dx),
      });
    }

    return { coords: nextCoords, segments: nextSegments, baselineY: nextCoords[0].y };
  }, [width, height, sampled]);

  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const sampledRef = useRef(sampled);
  sampledRef.current = sampled;

  const panResponder = useMemo(() => {
    const handle = (locationX: number) => {
      const cs = coordsRef.current;
      if (cs.length === 0) return;
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      for (let i = 0; i < cs.length; i++) {
        const d = Math.abs(cs[i].x - locationX);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      setScrubIndex(nearest);
      onScrubRef.current?.(sampledRef.current[nearest]);
    };
    const end = () => {
      setScrubIndex(null);
      onScrubRef.current?.(null);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => handle(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handle(evt.nativeEvent.locationX),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const scrubCoord = scrubIndex !== null ? coords[scrubIndex] : null;
  const tooFewPoints = sampled.length < 2;

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={onLayout}
      {...(tooFewPoints ? {} : panResponder.panHandlers)}
      accessibilityLabel="Portfolio value chart"
    >
      {width > 0 && tooFewPoints ? (
        <View style={[styles.flatLine, { top: height / 2, backgroundColor: lineColor }]} />
      ) : null}

      {width > 0 && !tooFewPoints ? (
        <>
          <View style={[styles.baseline, { top: baselineY }]} />
          {segments.map((s, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.segment,
                {
                  left: s.left,
                  top: s.top,
                  width: s.width,
                  backgroundColor: lineColor,
                  transform: [{ rotateZ: `${s.angle}rad` }],
                },
              ]}
            />
          ))}
          {scrubCoord ? (
            <>
              <View
                pointerEvents="none"
                style={[styles.scrubLine, { left: scrubCoord.x - 0.5 }]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.scrubDot,
                  {
                    left: scrubCoord.x - 4,
                    top: scrubCoord.y - 4,
                    backgroundColor: lineColor,
                  },
                ]}
              />
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    height: LINE_THICKNESS,
    borderRadius: LINE_THICKNESS / 2,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BASELINE_COLOR,
    borderStyle: 'dashed',
  },
  flatLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  scrubLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  scrubDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

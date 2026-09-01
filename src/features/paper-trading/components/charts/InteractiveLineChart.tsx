import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export type ChartPoint = { t: number; v: number };

export type InteractiveLineChartProps = {
  points: ChartPoint[];
  height?: number;
  color?: string;
  positiveColor?: string;
  negativeColor?: string;
  /** Colour behind the scrub dot ring — should match the screen background. */
  backgroundColor?: string;
  onScrub?: (point: ChartPoint | null) => void;
};

/** Cap on rendered vertices — a smooth <Path> handles this many comfortably. */
const MAX_POINTS = 250;
const PAD_Y = 12;
const LINE_THICKNESS = 2;

const POSITIVE_DEFAULT = '#62D892';
const NEGATIVE_DEFAULT = '#EF4444';
const BACKGROUND_DEFAULT = '#080A0D';
const BASELINE_COLOR = 'rgba(255,255,255,0.14)';

type Coord = { x: number; y: number };

function downsample(points: ChartPoint[], max: number): ChartPoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: ChartPoint[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

/**
 * Fritsch–Carlson monotone cubic interpolation. Produces a smooth curve that
 * never overshoots the data — important for money charts where a bulge below
 * zero or above a peak would misrepresent the values.
 */
function buildSmoothPath(coords: Coord[]): string {
  const n = coords.length;
  if (n === 0) return '';
  if (n === 1) return `M ${coords[0].x} ${coords[0].y}`;
  if (n === 2) {
    return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  }

  const xs = coords.map((c) => c.x);
  const ys = coords.map((c) => c.y);
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    slope[i] = dx[i] !== 0 ? (ys[i + 1] - ys[i]) / dx[i] : 0;
  }

  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const tau = 3 / h;
      m[i] = tau * a * slope[i];
      m[i + 1] = tau * b * slope[i];
    }
  }

  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = xs[i] + dx[i] / 3;
    const c1y = ys[i] + (m[i] * dx[i]) / 3;
    const c2x = xs[i + 1] - dx[i] / 3;
    const c2y = ys[i + 1] - (m[i + 1] * dx[i]) / 3;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${xs[i + 1]} ${ys[i + 1]}`;
  }
  return d;
}

export default function InteractiveLineChart({
  points,
  height = 180,
  color,
  positiveColor = POSITIVE_DEFAULT,
  negativeColor = NEGATIVE_DEFAULT,
  backgroundColor = BACKGROUND_DEFAULT,
  onScrub,
}: InteractiveLineChartProps) {
  const [width, setWidth] = useState(0);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;

  const sampled = useMemo(() => downsample(points, MAX_POINTS), [points]);

  const lineColor = useMemo(() => {
    if (color) return color;
    if (sampled.length < 2) return positiveColor;
    return sampled[sampled.length - 1].v >= sampled[0].v ? positiveColor : negativeColor;
  }, [color, sampled, positiveColor, negativeColor]);

  const { coords, linePath, areaPath, baselineY } = useMemo(() => {
    if (width <= 0 || sampled.length === 0) {
      return {
        coords: [] as Coord[],
        linePath: '',
        areaPath: '',
        baselineY: height / 2,
      };
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

    const line = buildSmoothPath(nextCoords);
    const first = nextCoords[0];
    const last = nextCoords[nextCoords.length - 1];
    const area =
      nextCoords.length >= 2
        ? `${line} L ${last.x} ${height} L ${first.x} ${height} Z`
        : '';

    return {
      coords: nextCoords,
      linePath: line,
      areaPath: area,
      baselineY: first.y,
    };
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
  const gradientId = 'ilcFill';

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={onLayout}
      {...(tooFewPoints ? {} : panResponder.panHandlers)}
      accessibilityLabel="Portfolio value chart"
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity={0.22} />
              <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {tooFewPoints ? (
            <Line
              x1={0}
              y1={height / 2}
              x2={width}
              y2={height / 2}
              stroke={lineColor}
              strokeWidth={LINE_THICKNESS}
              strokeLinecap="round"
            />
          ) : (
            <>
              {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}

              <Line
                x1={0}
                y1={baselineY}
                x2={width}
                y2={baselineY}
                stroke={BASELINE_COLOR}
                strokeWidth={1}
                strokeDasharray={[3, 4]}
              />

              <Path
                d={linePath}
                stroke={lineColor}
                strokeWidth={LINE_THICKNESS}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {scrubCoord ? (
                <>
                  <Line
                    x1={scrubCoord.x}
                    y1={0}
                    x2={scrubCoord.x}
                    y2={height}
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1}
                  />
                  <Circle
                    cx={scrubCoord.x}
                    cy={scrubCoord.y}
                    r={9}
                    fill={lineColor}
                    fillOpacity={0.18}
                  />
                  <Circle
                    cx={scrubCoord.x}
                    cy={scrubCoord.y}
                    r={4}
                    fill={lineColor}
                    stroke={backgroundColor}
                    strokeWidth={2}
                  />
                </>
              ) : null}
            </>
          )}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
});

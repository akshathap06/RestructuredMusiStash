import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  icon: string;
  gradient?: [string, string];
  /** solid background colour — takes precedence over `gradient` */
  color?: string;
  size?: number;
};

const DEFAULT_GRADIENT: [string, string] = ['#3B82F6', '#8B5CF6'];

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Shift a hex colour toward white (amt > 0) or black (amt < 0). */
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((c) => Number.isNaN(c))) return hex;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c: number) =>
    clampByte(c + (target - c) * p)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export default function AgentAvatar({ icon, gradient = DEFAULT_GRADIENT, color, size = 44 }: Props) {
  // Derive a soft top-left → bottom-right gradient from a single picked colour.
  const fill: [string, string] = color
    ? [shade(color, 0.2), shade(color, -0.22)]
    : gradient;
  return (
    <LinearGradient
      colors={fill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View
        style={[
          styles.sheen,
          { borderRadius: size / 2, borderWidth: Math.max(1, size * 0.03) },
        ]}
      />
      <Ionicons name={icon as any} size={size * 0.5} color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Faint inner highlight so the disc catches light at the edge.
  sheen: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});

export function AgentAvatarPlain({ icon, size = 44 }: { icon: string; size?: number }) {
  return (
    <View
      style={[
        plain.wrap,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Ionicons name={icon as any} size={size * 0.5} color="#9CA3AF" />
    </View>
  );
}

const plain = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
});

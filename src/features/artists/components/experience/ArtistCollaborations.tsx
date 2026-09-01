import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Collaboration } from '../../types/experience';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

type Props = {
  collaborations: Collaboration[];
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function ArtistCollaborations({ collaborations }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>COLLABORATIONS</Text>

      {collaborations.length === 0 ? (
        <Text style={styles.emptyText}>No collaborations yet.</Text>
      ) : (
        <View style={styles.list}>
          {collaborations.map((collab) => (
            <View key={collab.id} style={styles.row}>
              {collab.avatarUrl ? (
                <Image
                  source={{ uri: collab.avatarUrl }}
                  style={styles.avatar}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials(collab.name)}</Text>
                </View>
              )}
              <View style={styles.meta}>
                <Text style={styles.name} numberOfLines={1}>
                  {collab.name}
                </Text>
                {collab.role ? (
                  <Text style={styles.role} numberOfLines={1}>
                    {collab.role}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingHorizontal: H_PAD,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 14,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  role: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});

export default ArtistCollaborations;

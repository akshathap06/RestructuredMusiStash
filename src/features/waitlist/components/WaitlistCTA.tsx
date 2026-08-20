import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MusiStashTheme } from '../../../styles/theme';

interface WaitlistCTAProps {
  navigation: any;
  surface: string;
}

export function WaitlistCTA({ navigation, surface }: WaitlistCTAProps) {
  const handlePress = () => {
    navigation.navigate('Waitlist', { source: surface });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Get early access</Text>
      <Text style={styles.subtitle}>
        Join the waitlist for MusiStash's future real-money launch.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Join waitlist"
      >
        <Text style={styles.buttonText}>Join waitlist</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MusiStashTheme.colors.card,
    borderRadius: MusiStashTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: MusiStashTheme.colors.border,
    padding: MusiStashTheme.spacing[4],
    gap: MusiStashTheme.spacing[2],
  },
  title: {
    ...MusiStashTheme.typography.h4,
    color: MusiStashTheme.colors.foreground,
  },
  subtitle: {
    ...MusiStashTheme.typography.bodySmall,
    color: MusiStashTheme.colors.mutedForeground,
    marginBottom: MusiStashTheme.spacing[2],
  },
  button: {
    backgroundColor: MusiStashTheme.colors.accent,
    borderRadius: MusiStashTheme.borderRadius.xl,
    paddingVertical: MusiStashTheme.spacing[3],
    alignItems: 'center',
  },
  buttonText: {
    ...MusiStashTheme.typography.button,
    color: MusiStashTheme.colors.accentForeground,
  },
});

export default WaitlistCTA;

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MusiStashTheme, MusiStashGradients } from '../../../styles/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  containerStyle?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  containerStyle,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={MusiStashGradients.progress}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${clampedProgress * 100}%` }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: MusiStashTheme.components.progress.height,
    backgroundColor: MusiStashTheme.components.progress.backgroundColor,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});


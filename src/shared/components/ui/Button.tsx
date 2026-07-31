import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MusiStashTheme } from '../../../styles/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const buttonStyle = [
    styles.button,
    styles[`${variant}Button`],
    disabled && styles.disabled,
    style,
  ];

  const buttonTextStyle = [
    styles.buttonText,
    styles[`${variant}ButtonText`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? MusiStashTheme.colors.black : MusiStashTheme.colors.white}
        />
      ) : (
        <>
          {icon}
          <Text style={buttonTextStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    ...MusiStashTheme.components.button.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: MusiStashTheme.spacing[6],
  },

  // Primary button (white with black text)
  primaryButton: {
    backgroundColor: MusiStashTheme.components.button.primary.backgroundColor,
    borderWidth: 0,
  },
  primaryButtonText: {
    color: MusiStashTheme.components.button.primary.textColor,
    fontSize: MusiStashTheme.typography.button.fontSize,
    fontWeight: MusiStashTheme.typography.button.fontWeight,
  },

  // Secondary button (transparent with border)
  secondaryButton: {
    backgroundColor: MusiStashTheme.components.button.secondary.backgroundColor,
    borderWidth: 1,
    borderColor: MusiStashTheme.components.button.secondary.borderColor,
  },
  secondaryButtonText: {
    color: MusiStashTheme.components.button.secondary.textColor,
    fontSize: MusiStashTheme.typography.button.fontSize,
    fontWeight: MusiStashTheme.typography.button.fontWeight,
  },

  // Accent button (emerald green)
  accentButton: {
    backgroundColor: MusiStashTheme.components.button.accent.backgroundColor,
    borderWidth: 0,
  },
  accentButtonText: {
    color: MusiStashTheme.components.button.accent.textColor,
    fontSize: MusiStashTheme.typography.button.fontSize,
    fontWeight: MusiStashTheme.typography.button.fontWeight,
  },

  // Ghost button (transparent, no border)
  ghostButton: {
    backgroundColor: MusiStashTheme.components.button.ghost.backgroundColor,
    borderWidth: 0,
  },
  ghostButtonText: {
    color: MusiStashTheme.components.button.ghost.textColor,
    fontSize: MusiStashTheme.typography.button.fontSize,
    fontWeight: MusiStashTheme.typography.button.fontWeight,
  },

  buttonText: {
    fontSize: MusiStashTheme.typography.button.fontSize,
    fontWeight: MusiStashTheme.typography.button.fontWeight,
  },

  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});


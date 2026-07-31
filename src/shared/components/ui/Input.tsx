import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  showPasswordToggle = false,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputStyle = [
    styles.input,
    isFocused && styles.inputFocused,
    error && styles.inputError,
    props.style,
  ];

  const handlePasswordToggle = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.inputContainer}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          style={inputStyle}
          placeholderTextColor={MusiStashTheme.components.input.placeholderColor}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
          {...props}
        />
        
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={handlePasswordToggle}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={MusiStashTheme.colors.gray400}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...MusiStashTheme.typography.label,
    color: MusiStashTheme.colors.foreground,
    marginBottom: MusiStashTheme.spacing[2],
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: MusiStashTheme.components.input.backgroundColor,
    borderColor: MusiStashTheme.components.input.borderColorIdle,
    borderWidth: MusiStashTheme.components.input.borderWidth,
    borderRadius: MusiStashTheme.components.input.borderRadius,
    height: MusiStashTheme.components.input.height,
    paddingHorizontal: MusiStashTheme.spacing[4],
    color: MusiStashTheme.components.input.textColor,
    fontSize: MusiStashTheme.components.input.fontSize,
  },
  inputFocused: {
    borderColor: MusiStashTheme.components.input.borderColor,
  },
  inputError: {
    borderColor: MusiStashTheme.colors.destructive,
  },
  errorText: {
    color: MusiStashTheme.colors.destructiveForeground,
    fontSize: MusiStashTheme.typography.caption.fontSize,
    marginTop: MusiStashTheme.spacing[1],
  },
  passwordToggle: {
    position: 'absolute',
    right: MusiStashTheme.spacing[4],
    top: '50%',
    transform: [{ translateY: -10 }],
  },
});


import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { MusiStashTheme } from '../../../styles/theme';

interface InputOTPProps {
  value: string;
  onChange: (value: string) => void;
  length: number;
}

export const InputOTP: React.FC<InputOTPProps> = ({ value, onChange, length }) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChangeText = (text: string, index: number) => {
    // Only allow single digit
    if (text.length > 1) {
      text = text.slice(-1);
    }

    // Build new value
    const newValue = value.split('');
    newValue[index] = text;
    const finalValue = newValue.join('').slice(0, length);
    
    onChange(finalValue);

    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // If current input is empty, focus previous
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    }
  };

  const renderInput = (index: number) => {
    const isFocused = index === value.length;
    const hasValue = Boolean(value[index]);

    return (
      <TextInput
        key={index}
        ref={(ref) => (inputRefs.current[index] = ref)}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          hasValue && styles.inputHasValue,
        ]}
        value={value[index] || ''}
        onChangeText={(text) => handleChangeText(text, index)}
        onKeyPress={(e) => handleKeyPress(e, index)}
        keyboardType="number-pad"
        maxLength={1}
        selectTextOnFocus
      />
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }, (_, index) => renderInput(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: MusiStashTheme.colors.gray700,
    borderRadius: 14,
    backgroundColor: 'transparent',
    color: MusiStashTheme.colors.white,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputFocused: {
    borderColor: MusiStashTheme.colors.accent,
  },
  inputHasValue: {
    borderColor: MusiStashTheme.colors.accent,
  },
});

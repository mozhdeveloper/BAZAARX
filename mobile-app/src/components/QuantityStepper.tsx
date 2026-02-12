import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

interface QuantityStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange?: (newValue: number) => void; // New prop for manual input
  min?: number;
  max?: number;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onIncrement,
  onDecrement,
  onChange,
  min = 1,
  max = 99,
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const canDecrement = value > min;
  const canIncrement = value < max;

  // Sync internal input state with external value prop
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleTextChange = (text: string) => {
    // allow empty string for typing experience
    if (text === '') {
      setInputValue('');
      return;
    }
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setInputValue(numericValue);
  };

  const handleBlur = () => {
    let newValue = parseInt(inputValue || '0', 10);

    // validate constraints
    if (isNaN(newValue) || newValue < min) {
      newValue = min;
    } else if (newValue > max) {
      Alert.alert('Limit Reached', `Only ${max} items available.`);
      newValue = max;
    }

    setInputValue(newValue.toString());
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onDecrement}
        disabled={!canDecrement}
        style={({ pressed }) => [
          styles.button,
          !canDecrement && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Minus size={16} color={canDecrement ? '#FF5722' : '#9CA3AF'} strokeWidth={2.5} />
      </Pressable>

      <View style={styles.valueContainer}>
        <TextInput
          style={[styles.input, value > max && styles.inputError]} // highlight if over max (edge case)
          value={inputValue}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          keyboardType="numeric"
          selectTextOnFocus
          maxLength={3} // limit digit length
        />
      </View>

      <Pressable
        onPress={onIncrement}
        disabled={!canIncrement}
        style={({ pressed }) => [
          styles.button,
          !canIncrement && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Plus size={16} color={canIncrement ? '#FF5722' : '#9CA3AF'} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    gap: 8,
  },
  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FF5722',
    backgroundColor: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.3,
    borderColor: '#E5E7EB',
  },
  buttonPressed: {
    backgroundColor: '#FFF5F0',
  },
  valueContainer: {
    minWidth: 40, // Increased width for input
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    padding: 0,
    minWidth: 40,
  },
  inputError: {
    color: '#EF4444',
  }
});

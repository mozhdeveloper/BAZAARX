import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

interface QuantityStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
}) => {
  const canDecrement = value > min;
  const canIncrement = value < max;

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
        <Text style={styles.value}>{value}</Text>
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
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
});

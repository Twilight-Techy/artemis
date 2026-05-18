import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';

interface Props {
  temperature: number;
  onIncrease?: () => void;
  onDecrease?: () => void;
  disabled?: boolean;
}

export function ClimateControl({ temperature, onIncrease, onDecrease, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, disabled && styles.buttonDisabled]} 
        onPress={onDecrease}
        disabled={disabled}
      >
        <MaterialIcons name="remove" size={20} color={disabled ? Colors.onSurfaceVariant : Colors.onSurface} />
      </TouchableOpacity>

      <Text style={[styles.temperature, disabled && styles.temperatureDisabled]}>
        {temperature}°
      </Text>

      <TouchableOpacity 
        style={[styles.button, disabled && styles.buttonDisabled]} 
        onPress={onIncrease}
        disabled={disabled}
      >
        <MaterialIcons name="add" size={20} color={disabled ? Colors.onSurfaceVariant : Colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  temperature: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    color: Colors.onSurface,
    fontWeight: Typography.weights.medium,
    minWidth: 40,
    textAlign: 'center',
  },
  temperatureDisabled: {
    color: Colors.onSurfaceVariant,
  },
});

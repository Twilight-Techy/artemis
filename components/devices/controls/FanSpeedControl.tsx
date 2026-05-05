import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';

interface Props {
  speed: number;
  maxSteps: number;
  onChange: (speed: number) => void;
  disabled?: boolean;
}

export function FanSpeedControl({ speed, maxSteps, onChange, disabled }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: maxSteps }, (_, i) => i + 1).map((step) => (
        <TouchableOpacity
          key={step}
          style={[
            styles.stepBtn,
            speed >= step && !disabled && styles.stepBtnActive,
            disabled && styles.stepBtnDisabled,
          ]}
          onPress={() => !disabled && onChange(step)}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text
            style={[
              styles.stepText,
              speed >= step && !disabled && styles.stepTextActive,
            ]}
          >
            {step}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.label}>Speed {speed}/{maxSteps}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnActive: {
    backgroundColor: Colors.primary,
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.weights.bold,
  },
  stepTextActive: {
    color: Colors.onPrimary,
  },
  label: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelMd,
    color: Colors.onSurfaceVariant,
    marginLeft: Spacing.sm,
  },
});

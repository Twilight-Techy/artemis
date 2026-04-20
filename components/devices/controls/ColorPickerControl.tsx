import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors as ThemeColors, Spacing } from '../../../constants/theme';

interface Props {
  activeColor: string;
  onSelect?: (color: string) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#FFFFFF', // White
  '#FF716C', // Red/Orange
  '#9547F7', // Purple
  '#74B1FF', // Blue
  '#00E3FD', // Cyan
];

export function ColorPickerControl({ activeColor, onSelect, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      {PRESET_COLORS.map((color) => {
        const isActive = activeColor.toLowerCase() === color.toLowerCase();
        return (
          <TouchableOpacity
            key={color}
            style={[
              styles.swatch,
              { backgroundColor: color },
              isActive && styles.swatchActive,
              disabled && styles.disabled,
              isActive && { shadowColor: color }
            ]}
            onPress={() => onSelect?.(color)}
            disabled={disabled}
            activeOpacity={0.8}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: ThemeColors.onSurface,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  disabled: {
    opacity: 0.3,
  },
});

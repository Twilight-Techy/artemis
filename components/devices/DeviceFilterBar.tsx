import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export type FilterCategory = 'All' | 'Lights' | 'Climate' | 'Sensors' | 'Security';

interface Props {
  activeFilter: FilterCategory;
  onSelect: (filter: FilterCategory) => void;
}

export const CATEGORIES: FilterCategory[] = ['All', 'Lights', 'Climate', 'Sensors', 'Security'];

export function DeviceFilterBar({ activeFilter, onSelect }: Props) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isActive = activeFilter === cat;
        return (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)', // outlineVariant 15% opacity
    minWidth: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryFixed,
  },
  text: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
  },
  textActive: {
    color: Colors.onPrimary,
    fontWeight: Typography.weights.bold,
  },
});

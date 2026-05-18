import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

type QuickActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  onPress?: () => void;
};

export default function QuickActionCard({
  icon,
  iconColor,
  title,
  onPress,
}: QuickActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${iconColor}15` },
        ]}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.10)',
    flex: 1,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
    borderColor: 'rgba(116, 177, 255, 0.3)',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    textAlign: 'center',
  },
});

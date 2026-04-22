import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { Device } from './types';

interface Props {
  device: Device;
  onPress: (device: Device) => void;
  onToggle: (id: string, newState: boolean) => void;
  onLongPress?: (device: Device) => void;
}

export function DeviceCard({ device, onPress, onToggle, onLongPress }: Props) {
  // Determine icon based on device type
  const getIconName = () => {
    switch (device.type) {
      case 'light': return 'lightbulb-outline';
      case 'climate': return 'ac-unit';
      case 'media': return 'speaker';
      case 'shade': return 'blinds';
      case 'appliance': return 'kitchen';
      case 'sensor': return 'sensors';
      default: return 'device-unknown';
    }
  };

  const getStatusColor = () => {
    if (!device.isOn) return Colors.onSurfaceVariant;
    switch (device.type) {
      case 'light': return Colors.primary;
      case 'climate': return Colors.tertiary;
      case 'media': return Colors.secondary;
      case 'appliance': return Colors.tertiaryFixed;
      case 'sensor': return Colors.onSurface;
      default: return Colors.primary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        device.isOn && { shadowColor: statusColor, elevation: 4, shadowOpacity: 0.15, shadowRadius: 10 }
      ]}
      onPress={() => onPress(device)}
      onLongPress={() => onLongPress?.(device)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={getIconName()} size={24} color={statusColor} />
          {device.isOn && <View style={[styles.glow, { backgroundColor: statusColor }]} />}
        </View>
        <TouchableOpacity 
          style={[styles.toggleBtn, device.isOn && { backgroundColor: statusColor }]}
          onPress={() => onToggle(device.id, !device.isOn)}
        >
          <View style={[styles.toggleThumb, device.isOn && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
        <Text style={styles.status}>
          {device.isOn ? (
            device.statusText ? device.statusText : 'Active'
          ) : 'Off'}
        </Text>

        {device.isOn && device.intensity !== undefined && (
          <View style={styles.miniIndicator}>
            <View style={[styles.miniBar, { width: `${device.intensity}%`, backgroundColor: statusColor }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    width: '48%', // Allow 2 columns
    borderWidth: 1,
    borderColor: 'rgba(72, 71, 74, 0.15)', // outlineVariant at 15%
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.full,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radii.full,
    opacity: 0.2, // Simulate state-based bloom
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  toggleBtn: {
    width: 36,
    height: 20,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: Radii.full,
    backgroundColor: Colors.onSurfaceVariant,
  },
  toggleThumbActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    transform: [{ translateX: 16 }],
  },
  content: {
    gap: Spacing.xs,
  },
  name: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurface,
  },
  status: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniIndicator: {
    height: 4,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.full,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  miniBar: {
    height: '100%',
    borderRadius: Radii.full,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { Device } from './types';
import { DeviceCard } from './DeviceCard';

interface Props {
  roomName: string;
  devices: Device[];
  onDevicePress: (device: Device) => void;
  onDeviceToggle: (id: string, newState: boolean) => void;
}

export function RoomSection({ roomName, devices, onDevicePress, onDeviceToggle }: Props) {
  if (devices.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{roomName}</Text>
      <View style={styles.grid}>
        {devices.map((device) => (
          <DeviceCard 
            key={device.id}
            device={device}
            onPress={onDevicePress}
            onToggle={onDeviceToggle}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

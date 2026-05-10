import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { Device } from './types';
import { SliderControl } from './controls/SliderControl';
import { ClimateControl } from './controls/ClimateControl';
import { ColorPickerControl } from './controls/ColorPickerControl';
import { FanSpeedControl } from './controls/FanSpeedControl';
import { BlurView } from 'expo-blur';

interface Props {
  visible: boolean;
  device: Device | null;
  onClose: () => void;
  onToggle: () => void;
  onUpdateValue: (updates: Partial<Device>) => void;
  onEdit: (device: Device) => void;
}

export function DeviceDetailModal({ visible, device, onClose, onToggle, onUpdateValue, onEdit }: Props) {
  if (!device) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{device.name}</Text>
              <Text style={styles.subtitle}>{device.roomId}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(device)}>
                <MaterialIcons name="edit" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statusSection}>
            <Text style={styles.statusText}>{device.isOn ? 'Active' : 'Off'}</Text>
            <Switch
              value={device.isOn}
              onValueChange={onToggle}
              trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primary }}
              thumbColor={Colors.onSurface}
            />
          </View>

          <View style={styles.controlsSection}>
            {device.controls.map((c) => {
              if (c.ui === 'slider') {
                const v = device[c.field] as number | undefined;
                if (v === undefined) return null;
                return (
                  <View key={c.id} style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>{c.label}</Text>
                    <SliderControl
                      value={v}
                      min={c.min}
                      max={c.max}
                      onChange={(val) => onUpdateValue({ [c.field]: val } as Partial<Device>)}
                      disabled={!device.isOn}
                    />
                  </View>
                );
              }
              if (c.ui === 'steps') {
                const v = device[c.field] as number | undefined;
                if (v === undefined) return null;
                return (
                  <View key={c.id} style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>{c.label}</Text>
                    <FanSpeedControl
                      speed={v}
                      maxSteps={c.stepCount}
                      stepLabels={c.labels}
                      onChange={(val) => onUpdateValue({ [c.field]: val } as Partial<Device>)}
                      disabled={!device.isOn}
                    />
                  </View>
                );
              }
              if (c.ui === 'color') {
                const col = device[c.field] as string | undefined;
                if (col === undefined) return null;
                return (
                  <View key={c.id} style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>{c.label}</Text>
                    <ColorPickerControl
                      activeColor={col}
                      onSelect={(color) => onUpdateValue({ [c.field]: color } as Partial<Device>)}
                      disabled={!device.isOn}
                    />
                  </View>
                );
              }
              if (c.ui === 'thermostat') {
                const t = device[c.field] as number | undefined;
                if (t === undefined) return null;
                return (
                  <View key={c.id} style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>{c.label}</Text>
                    <ClimateControl
                      temperature={t}
                      onIncrease={() => {
                        if (!device.isOn) return;
                        onUpdateValue({ [c.field]: Math.min(c.max, t + c.step) } as Partial<Device>);
                      }}
                      onDecrease={() => {
                        if (!device.isOn) return;
                        onUpdateValue({ [c.field]: Math.max(c.min, t - c.step) } as Partial<Device>);
                      }}
                      disabled={!device.isOn}
                    />
                  </View>
                );
              }
              return null;
            })}

            {device.type === 'security' && (
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Status</Text>
                <Text style={styles.infoText}>{device.statusText ?? 'Unknown'}</Text>
              </View>
            )}

            {device.type === 'sensor' && device.statusText && (
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Reading</Text>
                <Text style={styles.infoText}>{device.statusText}</Text>
              </View>
            )}

            {(device.type === 'switch' || device.type === 'other') && device.controls.length === 0 && (
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Power</Text>
                <Text style={styles.infoText}>{device.isOn ? 'Powered On' : 'Powered Off'}</Text>
              </View>
            )}

            {!device.isOnline && (
              <View style={styles.offlineBanner}>
                <MaterialIcons name="cloud-off" size={16} color={Colors.error} />
                <Text style={styles.offlineText}>Device Offline</Text>
              </View>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineMd,
    color: Colors.onSurface,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelLg,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.full,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHighest,
    marginBottom: Spacing.lg,
  },
  statusText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurface,
  },
  controlsSection: {
    gap: Spacing.xl,
  },
  controlGroup: {
    gap: Spacing.sm,
  },
  controlLabel: {
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelMd,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255, 113, 108, 0.1)',
    borderRadius: Radii.md,
  },
  offlineText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelMd,
    color: Colors.error,
  },
});

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true the confirm button is rendered in the error/destructive colour. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  icon = 'warning-outline',
  iconColor,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const accentColor = destructive ? Colors.error : Colors.primary;
  const resolvedIconColor = iconColor ?? accentColor;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom + Spacing['2xl'], Spacing['3xl']) },
          ]}
        >
          {/* ── Icon badge ── */}
          <View style={[styles.iconBadge, { backgroundColor: `${resolvedIconColor}18`, borderColor: `${resolvedIconColor}30` }]}>
            <Ionicons name={icon as any} size={28} color={resolvedIconColor} />
          </View>

          {/* ── Copy ── */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            {/* Cancel (ghost) */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onCancel}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            {/* Confirm */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onConfirm}
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
            >
              <Text style={[styles.confirmText, { color: destructive ? '#fff' : Colors.onPrimary }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  sheet: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii['3xl'],
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    // Glassmorphism border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    // Ambient shadow
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },

  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },

  title: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.headlineSm,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['3xl'],
  },

  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.xl,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurfaceVariant,
  },

  confirmBtn: {
    flex: 1,
    paddingVertical: Spacing.xl,
    borderRadius: Radii.full,
    alignItems: 'center',
    // Glow
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  confirmText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
});

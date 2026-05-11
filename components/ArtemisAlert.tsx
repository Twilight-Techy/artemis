/**
 * ArtemisAlert — Themed replacement for native Alert.alert
 *
 * Usage (imperative, via hook):
 *   const alert = useArtemisAlert();
 *   alert.show({ title: 'Error', message: 'Something went wrong.' });
 *   alert.show({ title: 'Confirm?', message: '...', confirmLabel: 'Delete', onConfirm: () => doDelete() });
 *
 * Place <ArtemisAlertHost /> once at a high level in the tree (e.g., inside App root)
 * OR pass the state directly from useArtemisAlert into <ArtemisAlert />.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

export interface ArtemisAlertOptions {
  title: string;
  message: string;
  variant?: AlertVariant;
  /** If provided, a secondary cancel button is shown next to the confirm button */
  cancelLabel?: string;
  /** Label for the primary/only action button. Defaults to 'OK' */
  confirmLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ArtemisAlertProps extends ArtemisAlertOptions {
  visible: boolean;
  onDismiss: () => void;
}

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  AlertVariant,
  { icon: string; color: string; glowColor: string }
> = {
  error: {
    icon: 'alert-circle-outline',
    color: Colors.error,
    glowColor: 'rgba(255, 113, 108, 0.25)',
  },
  warning: {
    icon: 'warning-outline',
    color: '#ffb347',
    glowColor: 'rgba(255, 179, 71, 0.25)',
  },
  info: {
    icon: 'information-circle-outline',
    color: Colors.primary,
    glowColor: 'rgba(116, 177, 255, 0.25)',
  },
  success: {
    icon: 'checkmark-circle-outline',
    color: Colors.tertiary,
    glowColor: 'rgba(129, 236, 255, 0.25)',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ArtemisAlert({
  visible,
  title,
  message,
  variant = 'info',
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  onCancel,
  onDismiss,
}: ArtemisAlertProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.88)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const cfg = VARIANT_CONFIG[variant];
  const isConfirm = !!cancelLabel;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleConfirm = () => {
    onDismiss();
    onConfirm?.();
  };

  const handleCancel = () => {
    onDismiss();
    onCancel?.();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={isConfirm ? undefined : handleConfirm} />

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {/* Icon glow badge */}
          <View style={[styles.iconBadge, { backgroundColor: cfg.glowColor }]}>
            <Ionicons name={cfg.icon as any} size={32} color={cfg.color} />
          </View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={[styles.btnRow, isConfirm && styles.btnRowSplit]}>
            {isConfirm && (
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.75}
                onPress={handleCancel}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.confirmWrapper, isConfirm && { flex: 1 }]}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <LinearGradient
                colors={
                  variant === 'error'
                    ? [Colors.error, Colors.errorContainer]
                    : variant === 'warning'
                    ? ['#ffb347', '#cc8800']
                    : variant === 'success'
                    ? [Colors.tertiary, Colors.tertiaryContainer]
                    : [Colors.primary, Colors.primaryContainer]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.confirmBtn, isConfirm && { borderRadius: Radii.lg }]}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useArtemisAlert() {
  const [state, setState] = React.useState<
    (ArtemisAlertOptions & { visible: boolean }) | null
  >(null);

  const show = React.useCallback((opts: ArtemisAlertOptions) => {
    setState({ ...opts, visible: true });
  }, []);

  const dismiss = React.useCallback(() => {
    setState((prev) => (prev ? { ...prev, visible: false } : null));
  }, []);

  const alertNode = state ? (
    <ArtemisAlert
      visible={state.visible}
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onConfirm={state.onConfirm}
      onCancel={state.onCancel}
      onDismiss={dismiss}
    />
  ) : null;

  return { show, alertNode };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    // Ghost border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    // Ambient shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.55,
        shadowRadius: 40,
      },
      android: { elevation: 24 },
    }),
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['3xl'],
  },
  btnRow: {
    width: '100%',
    alignItems: 'center',
  },
  btnRowSplit: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.lg,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.semibold,
    color: Colors.onSurfaceVariant,
  },
  confirmWrapper: {
    width: '100%',
  },
  confirmBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  confirmText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.bodyMd,
    fontWeight: Typography.weights.bold,
    color: Colors.onPrimary,
    letterSpacing: 1.5,
  },
});

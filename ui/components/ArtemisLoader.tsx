/**
 * ArtemisLoader
 * A unique, design-system-native loading indicator for the Artemis "Living Interface."
 *
 * Visuals:
 *  - Three concentric rings that spin at different speeds and directions,
 *    each tinted with a design-state color (primary / secondary / tertiary).
 *  - A central breathing glow orb that pulses opacity & scale.
 *  - An optional label rendered below in Manrope.
 *
 * Usage:
 *   <ArtemisLoader />
 *   <ArtemisLoader label="Syncing devices..." size={72} style={{ marginTop: 40 }} />
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Typography } from '../constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArtemisLoaderProps {
  /** Diameter of the outermost ring (default: 64) */
  size?: number;
  /** Optional caption rendered below the rings */
  label?: string;
  style?: ViewStyle;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ArtemisLoader({ size = 64, label, style }: ArtemisLoaderProps) {
  // Rotation refs — three rings, different durations
  const ring1Rot = useRef(new Animated.Value(0)).current;
  const ring2Rot = useRef(new Animated.Value(0)).current;
  const ring3Rot = useRef(new Animated.Value(0)).current;

  // Core glow refs — opacity & scale breathe together
  const coreScale = useRef(new Animated.Value(0.7)).current;
  const coreOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // ── Spinning rings ────────────────────────────────────────────────────
    const spin = (anim: Animated.Value, duration: number, toValue: number) =>
      Animated.loop(
        Animated.timing(anim, {
          toValue,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

    spin(ring1Rot, 2800, 1).start();    // outer  — clockwise, slow
    spin(ring2Rot, 2000, -1).start();   // middle — counter-clockwise, medium
    spin(ring3Rot, 1400, 1).start();    // inner  — clockwise, fast

    // ── Breathing core ────────────────────────────────────────────────────
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(coreScale, {
            toValue: 1.15,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(coreOpacity, {
            toValue: 0.9,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(coreScale, {
            toValue: 0.7,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(coreOpacity, {
            toValue: 0.4,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    breathe.start();

    return () => {
      ring1Rot.stopAnimation();
      ring2Rot.stopAnimation();
      ring3Rot.stopAnimation();
      coreScale.stopAnimation();
      coreOpacity.stopAnimation();
    };
  }, []);

  // ── Derived sizes ─────────────────────────────────────────────────────────
  const outer  = size;
  const middle = size * 0.70;
  const inner  = size * 0.43;
  const core   = size * 0.22;

  // ── Rotation interpolations (0→1 maps to 0deg→360deg) ────────────────────
  const rot1 = ring1Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2 = ring2Rot.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });
  const rot3 = ring3Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ── Ring border widths ────────────────────────────────────────────────────
  const bw1 = Math.max(1.5, size * 0.030);  // outer
  const bw2 = Math.max(1.5, size * 0.036);  // middle
  const bw3 = Math.max(1.5, size * 0.044);  // inner

  return (
    <View style={[styles.wrapper, style]}>
      {/* ── Outermost ring — primary blue ─────────────────────────────── */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            borderWidth: bw1,
            borderColor: Colors.primary,
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: [{ rotate: rot1 }],
          },
        ]}
      />

      {/* ── Middle ring — secondary violet ───────────────────────────── */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: middle,
            height: middle,
            borderRadius: middle / 2,
            borderWidth: bw2,
            borderColor: Colors.secondary,
            borderBottomColor: 'transparent',
            borderRightColor: 'transparent',
            transform: [{ rotate: rot2 }],
          },
        ]}
      />

      {/* ── Inner ring — tertiary cyan ────────────────────────────────── */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            borderWidth: bw3,
            borderColor: Colors.tertiary,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            transform: [{ rotate: rot3 }],
          },
        ]}
      />

      {/* ── Core glow orb ────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.core,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            backgroundColor: Colors.primary,
            opacity: coreOpacity,
            transform: [{ scale: coreScale }],
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: core * 0.8,
            elevation: 8,
          },
        ]}
      />

      {/* ── Label ─────────────────────────────────────────────────────── */}
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  core: {
    position: 'absolute',
  },
  label: {
    marginTop: 52,
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelLg,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
});

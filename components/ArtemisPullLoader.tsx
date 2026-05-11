/**
 * ArtemisPullLoader
 * ─────────────────
 * A compact, design-system-native indicator used for two contexts:
 *
 *  1. Pull-to-refresh overlay — rendered at the top of a ScrollView instead
 *     of the platform's default spinner when `refreshing === true`.
 *
 *  2. Inline skeleton / mini-load — small horizontal dot-wave that can sit
 *     inside a content area without dominating the screen.
 *
 * Visual:
 *  • Three dots that animate in a staggered "wave" (scale + opacity).
 *  • Each dot is tinted by the design-state spectrum:
 *      dot 1 → primary (blue)
 *      dot 2 → secondary (violet)
 *      dot 3 → tertiary (cyan)
 *  • An optional label rendered below in Manrope label style.
 *
 * Usage:
 *   // In a RefreshControl-equivalent header:
 *   {refreshing && <ArtemisPullLoader />}
 *
 *   // With a label:
 *   <ArtemisPullLoader label="Syncing…" />
 *
 *   // Compact (no label, smaller dots):
 *   <ArtemisPullLoader size={8} />
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
import { Colors, Typography, Spacing } from '../constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArtemisPullLoaderProps {
  /** Diameter of each dot (default: 10) */
  size?: number;
  /** Optional caption rendered below the dots */
  label?: string;
  style?: ViewStyle;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DOT_COLORS = [Colors.primary, Colors.secondary, Colors.tertiary];
const WAVE_DURATION = 420;   // ms per dot phase
const WAVE_DELAY    = 140;   // ms stagger between dots
const GAP           = 8;     // px between dots

// ─── Single animated dot ──────────────────────────────────────────────────────

interface DotProps {
  color: string;
  size: number;
  delay: number;
}

function Dot({ color, size, delay }: DotProps) {
  const scale   = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const wave = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: WAVE_DURATION,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: WAVE_DURATION,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.5,
            duration: WAVE_DURATION,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.35,
            duration: WAVE_DURATION,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // pause before next loop tick so the full cycle isn't too fast
        Animated.delay(WAVE_DELAY * (3 - Math.round(delay / WAVE_DELAY))),
      ])
    );
    wave.start();

    return () => {
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, [delay]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: size * 0.6,
        elevation: 4,
      }}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ArtemisPullLoader({
  size = 10,
  label,
  style,
}: ArtemisPullLoaderProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.dotsRow, { gap: GAP }]}>
        {DOT_COLORS.map((color, i) => (
          <Dot key={color} color={color} size={size} delay={i * WAVE_DELAY} />
        ))}
      </View>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginTop: Spacing.md,
    fontFamily: Typography.families.label,
    fontSize: Typography.sizes.labelSm,
    fontWeight: Typography.weights.medium,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

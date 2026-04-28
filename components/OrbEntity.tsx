import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';
import { useNetwork } from '../contexts/NetworkContext';

const ORB_SIZE = 180;
const INNER_RING = 150;
const CORE_SIZE = 125;
const GLOW_SIZE = 285;

export type OrbState = 'idle' | 'listening' | 'processing';

interface OrbEntityProps {
  state?: OrbState;
}

export default function OrbEntity({ state = 'idle' }: OrbEntityProps) {
  const { isOffline } = useNetwork();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let duration = 3000;
    if (isOffline) duration = 6000;
    else if (state === 'listening') duration = 800; // Fast energetic pulse
    else if (state === 'processing') duration = 400; // Ultra fast processing flutter

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isOffline, state]);

  // Ambient glow – scale & opacity
  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: isOffline ? [1, 1.02] : [1, 1.12],
  });
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: isOffline ? [0.1, 0.2] : [0.35, 0.6],
  });

  // Inner ring – subtle scale
  const innerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  // Core icon – breathing opacity
  const coreOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: isOffline ? [0.2, 0.4] : [0.4, 0.9],
  });

  let activeColor: string = Colors.primary;
  let gradientColors: [string, string, string] = ['rgba(116, 177, 255, 0.25)', 'rgba(116, 177, 255, 0.08)', 'transparent'];
  let innerRingColors: [string, string, string] = [Colors.primary, Colors.primaryDim, Colors.onPrimaryContainer];
  
  if (isOffline) {
    activeColor = 'rgba(150, 150, 160, 0.3)';
    gradientColors = ['rgba(150, 150, 160, 0.15)', 'rgba(150, 150, 160, 0.05)', 'transparent'];
    innerRingColors = ['#3a3a3a', '#2a2a2a', '#1a1a1a'];
  } else if (state === 'listening') {
    activeColor = Colors.tertiary; // Cyan
    gradientColors = ['rgba(129, 236, 255, 0.35)', 'rgba(129, 236, 255, 0.10)', 'transparent'];
    innerRingColors = [Colors.tertiary, '#4abccf', '#1c7180'];
  } else if (state === 'processing') {
    activeColor = Colors.secondary; // Violet
    gradientColors = ['rgba(184, 132, 255, 0.35)', 'rgba(184, 132, 255, 0.10)', 'transparent'];
    innerRingColors = [Colors.secondary, '#8855cc', '#452277'];
  }

  return (
    <View style={styles.container}>
      {/* Ambient glow behind the orb */}
      <Animated.View
        style={[
          styles.ambientGlow,
          { transform: [{ scale: glowScale }], opacity: glowOpacity },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.glowGradient}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Outer glass ring */}
      <View style={[styles.outerRing, isOffline && { borderColor: 'rgba(150, 150, 160, 0.2)' }]}>
        {/* Middle gradient ring */}
        <Animated.View
          style={[
            styles.middleRingWrapper,
            { transform: [{ scale: innerScale }] },
          ]}
        >
          <LinearGradient
            colors={innerRingColors}
            style={styles.middleRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Inner core - obsidian circle */}
            <View style={styles.core}>
              {/* Core icon dot */}
              <Animated.View style={[styles.coreIconOuter, { opacity: coreOpacity }]}>
                <View style={[styles.coreIconRing, { borderColor: activeColor }, isOffline && { shadowOpacity: 0 }]}>
                  <View style={[styles.coreIconCenter, { backgroundColor: activeColor }, isOffline && { shadowOpacity: 0 }]} />
                </View>
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: GLOW_SIZE / 2,
  },
  outerRing: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: 'rgba(38, 37, 41, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(116, 177, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    // Glassmorphism is emulated via background opacity
    overflow: 'hidden',
  },
  middleRingWrapper: {
    width: INNER_RING,
    height: INNER_RING,
    borderRadius: INNER_RING / 2,
  },
  middleRing: {
    width: INNER_RING,
    height: INNER_RING,
    borderRadius: INNER_RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  coreIconOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  coreIconCenter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
});

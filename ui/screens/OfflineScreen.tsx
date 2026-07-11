import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';
import { useNetwork } from '../contexts/NetworkContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineScreen() {
  const { toggleOfflineSimulation } = useNetwork();
  const insets = useSafeAreaInsets();
  
  // Simple pulsing animation for the icon
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
          <Ionicons name="cloud-offline" size={80} color={Colors.error} />
        </Animated.View>
        <Text style={styles.title}>Connection Lost</Text>
        <Text style={styles.subtitle}>Artemis requires an active network connection to function. Waiting for connection...</Text>
      </View>

      <TouchableOpacity
        style={styles.devButton}
        onPress={toggleOfflineSimulation}
        activeOpacity={0.7}
      >
        <Text style={styles.devButtonText}>Developer: Restore Connection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing['3xl'],
    backgroundColor: 'rgba(255, 113, 108, 0.1)',
    padding: Spacing['3xl'],
    borderRadius: 100,
  },
  title: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.displaySm,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing['xl'],
    lineHeight: 24,
  },
  devButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radii.full,
    marginBottom: Spacing.xl,
  },
  devButtonText: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.labelMd,
    color: Colors.onSurfaceVariant,
  }
});

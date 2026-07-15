import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useProfile } from '../contexts/ProfileContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface TopNavBarProps {
  /** Called once with a `refresh` fn the parent can invoke to re-fetch the avatar */
  onRefreshReady?: (refresh: () => Promise<void>) => void;
}

export default function TopNavBar({ onRefreshReady }: TopNavBarProps) {
  const navigation = useNavigation<NavProp>();
  const { avatarUrl, profileLoading, profileError, refreshProfile } = useProfile();

  // Expose refreshProfile to the parent (e.g. HomeScreen pull-to-refresh)
  React.useEffect(() => {
    onRefreshReady?.(refreshProfile);
  }, [refreshProfile, onRefreshReady]);

  // Ring colour: red tint on error, blue default
  const ringColor = profileError
    ? 'rgba(255, 113, 108, 0.5)'
    : 'rgba(116, 177, 255, 0.2)';

  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Text style={styles.logoText}>ARTEMIS</Text>
      </View>
      <View style={styles.topBarRight}>
        <TouchableOpacity
          onPress={() => navigation.navigate('History')}
          activeOpacity={0.7}
          style={styles.actionIcon}
        >
          <Ionicons name="time-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => profileError ? refreshProfile() : navigation.navigate('Settings')}
          activeOpacity={0.7}
          style={[styles.avatarRing, { borderColor: ringColor }]}
        >
          {profileLoading ? (
            // First-load shimmer — show a spinner inside the ring
            <View style={styles.avatarLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : profileError ? (
            // All retries failed — show a retry icon; tap to retry
            <View style={styles.avatarLoadingContainer}>
              <Ionicons name="refresh-outline" size={18} color={Colors.error} />
            </View>
          ) : (
            <Image source={require('../assets/avatar.jpg')} style={styles.avatar} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionIcon: {
    padding: Spacing.xs,
  },
  logoText: {
    fontFamily: Typography.families.headline,
    fontSize: Typography.sizes.titleLg,
    fontWeight: Typography.weights.bold,
    color: Colors.onSurface,
    letterSpacing: 6,
    textShadowColor: 'rgba(116, 177, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

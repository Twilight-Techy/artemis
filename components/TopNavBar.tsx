import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { artemisApi } from '../api/artemisClient';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface TopNavBarProps {
  /** Called once with a `refresh` fn the parent can invoke to re-fetch the avatar */
  onRefreshReady?: (refresh: () => Promise<void>) => void;
}

export default function TopNavBar({ onRefreshReady }: TopNavBarProps) {
  const navigation = useNavigation<NavProp>();
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  const fetchProfile = React.useCallback(async () => {
    try {
      const data = await artemisApi.getMe();
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      // Silent fail for avatar
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      // Expose the refresh fn to the parent once on mount
      onRefreshReady?.(fetchProfile);
    }, [fetchProfile, onRefreshReady])
  );

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
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
          style={styles.avatarRing}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <Image
              source={require('../assets/avatar.png')}
              style={styles.avatar}
            />
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
    borderColor: 'rgba(116, 177, 255, 0.2)',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

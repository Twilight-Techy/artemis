import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import AppNavigator from './navigation/AppNavigator';
import { Colors } from './constants/theme';
import { NetworkProvider } from './contexts/NetworkContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { MCPProvider } from './contexts/MCPContext';
import { useMCP } from './contexts/MCPContext';
import { LocationProvider } from './contexts/LocationContext';

/**
 * Inner component that lives inside MCPProvider so it can access useMCP().
 * Sets up push notification listeners once on mount.
 */
function NotificationBridge() {
  const { showActionFromNotification } = useMCP();

  useEffect(() => {
    // Set up notification registration and tap handling.
    let isMounted = true;
    let removeNotificationListener: (() => void) | null = null;

    async function setupNotifications() {
      const {
        addNotificationResponseListener,
        registerForPushNotifications,
      } = await import('./services/notificationService');

      if (!isMounted) return;

      // Register token after login. This is best-effort and no-ops in Expo Go.
      void registerForPushNotifications().catch(err => {
        console.error('[Notifications] Registration failed:', err);
      });

      const subscription = await addNotificationResponseListener(showActionFromNotification);
      if (!isMounted) {
        subscription?.remove();
        return;
      }

      removeNotificationListener = () => subscription?.remove();
    }

    setupNotifications().catch(err => {
      console.error('[Notifications] Setup failed:', err);
    });

    return () => {
      isMounted = false;
      removeNotificationListener?.();
    };
  }, [showActionFromNotification]);

  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    Manrope: Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  const MyTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.background,
      card: Colors.surfaceContainer,
    },
  };

  return (
    <SafeAreaProvider style={{ backgroundColor: Colors.background }}>
      <NetworkProvider>
        <AuthProvider>
          <ProfileProvider>
            <HistoryProvider>
              <LocationProvider>
                <MCPProvider>
                  <NotificationBridge />
                  <NavigationContainer theme={MyTheme}>
                    <AppNavigator />
                    <StatusBar style="light" />
                  </NavigationContainer>
                </MCPProvider>
              </LocationProvider>
            </HistoryProvider>
          </ProfileProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

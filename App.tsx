import React, { useCallback, useEffect, useRef } from 'react';
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
import { registerForPushNotifications } from './services/notificationService';
import * as Notifications from 'expo-notifications';

/**
 * Inner component that lives inside MCPProvider so it can access useMCP().
 * Sets up push notification listeners once on mount.
 */
function NotificationBridge() {
  const { showActionFromNotification } = useMCP();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register token after login (best-effort — fails gracefully on simulator)
    registerForPushNotifications();

    // Fired when the user TAPS a notification (foreground or background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.action_id) {
        showActionFromNotification(data.action_id);
      }
    });

    return () => {
      responseListener.current?.remove();
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
              <MCPProvider>
                <NotificationBridge />
                <NavigationContainer theme={MyTheme}>
                  <AppNavigator />
                  <StatusBar style="light" />
                </NavigationContainer>
              </MCPProvider>
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

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { artemisApi } from '../api/artemisClient';

type NotificationsModule = typeof import('expo-notifications');
type NotificationSubscription = { remove: () => void };

let notificationHandlerConfigured = false;
let didLogExpoGoSkip = false;

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isRunningInExpoGo()) {
    if (!didLogExpoGoSkip) {
      didLogExpoGoSkip = true;
      console.log(
        '[Notifications] Push notifications are disabled in Expo Go. Use a development build to test remote notifications.'
      );
    }
    return null;
  }

  const Notifications = await import('expo-notifications');

  if (!notificationHandlerConfigured) {
    notificationHandlerConfigured = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  return Notifications;
}

/**
 * Requests push notification permissions and registers the Expo push token
 * with the backend. Should be called once after a successful login.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted.');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('artemis-actions', {
      name: 'Artemis Action Requests',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('[Notifications] No projectId found in app.json extra.eas.projectId');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    // Register token with the backend
    await artemisApi.registerPushToken(token);
    console.log('[Notifications] Push token registered:', token);
    return token;
  } catch (err) {
    console.error('[Notifications] Failed to get/register push token:', err);
    return null;
  }
}

export async function addNotificationResponseListener(
  onActionNotification: (actionId: string) => void
): Promise<NotificationSubscription | null> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  return Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as { action_id?: unknown };
    if (typeof data?.action_id === 'string') {
      onActionNotification(data.action_id);
    }
  });
}

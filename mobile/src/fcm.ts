import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { api } from './api';

type ForegroundHandler = (title: string, body: string) => void;

let foregroundHandler: ForegroundHandler | null = null;

export function setForegroundHandler(handler: ForegroundHandler | null): void {
  foregroundHandler = handler;
}

export async function setupFcm(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  await messaging().requestPermission();

    try {
    const token = await messaging().getToken();
    console.log('[FCM] got token:', token ? token.slice(0, 20) + '...' : 'NULL');
    if (token) {
      await api.registerFcmToken(token);
      console.log('[FCM] token registered with backend OK');
    }
  } catch (err) {
    console.warn('[FCM] token register failed', err);
  }

  messaging().onMessage(async (msg) => {
    const title = msg.notification?.title ?? 'Stock alert';
    const body = msg.notification?.body ?? '';
    foregroundHandler?.(title, body);
  });
}

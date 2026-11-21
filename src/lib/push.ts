import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { request } from './api';
import { APP_VERSION } from './config';
import { KEYS, getItem, removeItem, setItem } from './storage';

/**
 * Push notifications.
 *
 * The backend sends pushes through Firebase Cloud Messaging (HTTP v1) to the
 * tokens saved by POST /devices/register (same contract as the Capacitor app).
 *  - Android: getDevicePushTokenAsync() returns the FCM registration token
 *    when google-services.json is bundled (GOOGLE_SERVICES_JSON secret in CI).
 *  - iOS: the native token is an APNs token, which FCM cannot address
 *    directly. The app still asks permission and listens for notifications;
 *    register iOS once the backend can send to APNs (see README "Push").
 * Payloads may carry data.url (e.g. "/student/notices"); tapping opens that screen.
 */
export const CHANNEL_ID = 'edureon_default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Edureone Campus notifications',
      description: 'Notices, results, fees and attendance alerts',
      // eslint-disable-next-line import/namespace -- re-exported via `export *`
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#1C2540',
    });
  }
}

async function deviceId(): Promise<string | undefined> {
  try {
    if (Platform.OS === 'android') return Application.getAndroidId() ?? undefined;
    return (await Application.getIosIdForVendorAsync()) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted || Platform.OS !== 'android') return;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    const value = String(token.data || '');
    if (value.length < 10) return;
    await request('/devices/register', {
      method: 'POST',
      body: { token: value, platform: 'android', device_id: await deviceId(), app_version: APP_VERSION },
      ignore401: true,
    });
    await setItem(KEYS.pushToken, value);
  } catch {
    // No google-services.json in this build, or the backend refused the
    // student token. Push is optional; the app works without it.
  }
}

export async function unregisterPush(): Promise<void> {
  const token = await getItem(KEYS.pushToken);
  if (!token) return;
  await request('/devices/unregister', { method: 'POST', body: { token, device_id: await deviceId() }, ignore401: true }).catch(() => null);
  await removeItem(KEYS.pushToken);
}

/** Map a web-portal path from a push payload to an app route. */
export function routeForPushUrl(url?: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const map: Record<string, string> = {
    '/student/dashboard': '/',
    '/student/notices': '/notices',
    '/student/results': '/exams',
    '/student/exams': '/exams',
    '/student/fees': '/fees',
    '/student/attendance': '/attendance',
    '/student/timetable': '/timetable',
    '/student/assignments': '/assignments',
    '/student/materials': '/materials',
    '/student/gate-pass': '/gate-passes',
  };
  return map[path] ?? null;
}

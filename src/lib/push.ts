import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_URL, APP_VERSION } from './config';
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
 * Payloads may carry data.url (e.g. "/student/notices"); tapping opens that page.
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

export type WebSession = { token: string; institute?: string | null };

async function callDevices(path: string, session: WebSession, body: Record<string, unknown>) {
  if (!API_URL) return;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${session.token}`,
  };
  if (session.institute && session.institute !== '__all__') headers['X-Institute-UUID'] = session.institute;
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/**
 * Ask for notification permission and register this phone for the person
 * signed in to the portal (same POST /devices/register contract the portal's
 * Capacitor build uses). Safe to call repeatedly.
 */
export async function registerForPush(session: WebSession): Promise<void> {
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
    await callDevices('/devices/register', session, {
      token: value,
      platform: 'android',
      device_id: await deviceId(),
      app_version: APP_VERSION,
    });
    await setItem(KEYS.pushToken, value);
  } catch {
    // No google-services.json in this build, or the backend refused the
    // token. Push is optional; the app works without it.
  }
}

/** Detach this phone from the person who just signed out (best effort). */
export async function unregisterPush(session: WebSession | null): Promise<void> {
  const token = await getItem(KEYS.pushToken);
  if (!token) return;
  if (session) await callDevices('/devices/unregister', session, { token, device_id: await deviceId() }).catch(() => null);
  await removeItem(KEYS.pushToken);
  await Notifications.dismissAllNotificationsAsync().catch(() => null);
}

/** Portal path carried by a push payload (data.url), e.g. "/student/notices". */
export function pathForPushUrl(url?: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  return path.startsWith('/') && !path.startsWith('//') ? path : null;
}

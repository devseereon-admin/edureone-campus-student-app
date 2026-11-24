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

/**
 * Android 8+ drops a push whose channel does not exist on the phone, so the
 * app creates both channels the backend sends to
 * (push_notification_service.CHANNEL_ALERTS / CHANNEL_DEFAULT), at start-up.
 */
export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('edureon_alerts', {
    name: 'Important alerts',
    description: 'Fees, attendance, gate pass and account security',
    // eslint-disable-next-line import/namespace -- re-exported via `export *`
    importance: Notifications.AndroidImportance.MAX,
    lightColor: '#1C2540',
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'General',
    description: 'Notices, assignments, exams and timetable updates',
    // eslint-disable-next-line import/namespace -- re-exported via `export *`
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#1C2540',
    sound: 'default',
  });
}

/** What happened the last time this phone tried to register for push. */
export type PushStatus =
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'registered' }
  | { state: 'denied' }
  | { state: 'unsupported'; reason: string }
  | { state: 'failed'; reason: string };

let status: PushStatus = { state: 'idle' };
const statusListeners = new Set<(s: PushStatus) => void>();
const setStatus = (s: PushStatus) => {
  status = s;
  statusListeners.forEach((fn) => fn(s));
};
export const getPushStatus = () => status;
export function onPushStatus(fn: (s: PushStatus) => void) {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
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

/** The school named inside the sign-in token (the API refuses any other X-Institute-UUID). */
function tokenInstitute(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
    return typeof payload?.institute_uuid === 'string' ? payload.institute_uuid : null;
  } catch {
    return null;
  }
}

async function callDevices(path: string, session: WebSession, body?: Record<string, unknown>, method = 'POST') {
  if (!API_URL) throw new Error('API address not set in this build');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${session.token}`,
  };
  const institute = tokenInstitute(session.token) || session.institute;
  if (institute && institute !== '__all__') headers['X-Institute-UUID'] = institute;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) {
    let detail = '';
    try {
      const j = JSON.parse(text);
      detail = typeof j?.detail === 'string' ? j.detail : j?.detail?.message || j?.message || '';
    } catch {
      detail = text.slice(0, 120);
    }
    throw new Error(`server said ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Ask for notification permission and register this phone for the person
 * signed in to the portal (same POST /devices/register contract the portal's
 * Capacitor build uses). Safe to call repeatedly.
 */
export async function registerForPush(session: WebSession): Promise<void> {
  if (!Device.isDevice) return setStatus({ state: 'unsupported', reason: 'emulator' });
  setStatus({ state: 'working' });
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return setStatus({ state: 'denied' });
    if (Platform.OS !== 'android') return setStatus({ state: 'unsupported', reason: 'iOS push is not set up yet' });
    let value = '';
    try {
      value = String((await Notifications.getDevicePushTokenAsync()).data || '');
    } catch (e) {
      return setStatus({ state: 'failed', reason: `Firebase: ${String((e as Error)?.message || e)}` });
    }
    if (value.length < 10) return setStatus({ state: 'failed', reason: 'Firebase gave no token' });
    await callDevices('/devices/register', session, {
      token: value,
      platform: 'android',
      device_id: await deviceId(),
      app_version: APP_VERSION,
    });
    await setItem(KEYS.pushToken, value);
    setStatus({ state: 'registered' });
  } catch (e) {
    setStatus({ state: 'failed', reason: String((e as Error)?.message || e) });
  }
}

/** Asks the backend to push a test notification to this person's phones. */
export async function sendTestPush(session: WebSession): Promise<string> {
  const res = await callDevices('/devices/test', session, {});
  const sent = res?.sent ?? res?.delivered ?? res?.success_count;
  return typeof sent === 'number' ? `Sent to ${sent} device(s).` : 'Sent. It should arrive in a few seconds.';
}

/** Detach this phone from the person who just signed out (best effort). */
export async function unregisterPush(session: WebSession | null): Promise<void> {
  const token = await getItem(KEYS.pushToken);
  if (!token) return;
  if (session) await callDevices('/devices/unregister', session, { token, device_id: await deviceId() }).catch(() => null);
  setStatus({ state: 'idle' });
  await removeItem(KEYS.pushToken);
  await Notifications.dismissAllNotificationsAsync().catch(() => null);
}

/** Portal path carried by a push payload (data.route or data.url), e.g. "/student/notices". */
export function pathForPushData(data?: Record<string, unknown> | null): string | null {
  return pathForPushUrl(data?.route) || pathForPushUrl(data?.url);
}

export function pathForPushUrl(url?: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  return path.startsWith('/') && !path.startsWith('//') ? path : null;
}

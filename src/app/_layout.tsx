import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LockScreen } from '@/components/lock-screen';
import { colors } from '@/components/ui';
import { pathForPushUrl } from '@/lib/push';
import { ShellProvider, useShell } from '@/lib/shell';

// Keep the native Edureone Campus splash up until the shell is ready.
SplashScreen.preventAutoHideAsync().catch(() => null);
SplashScreen.setOptions({ fade: true, duration: 250 });

/** Tapping a push opens the page it points to (data.url, e.g. /student/notices). */
function usePushNavigation(enabled: boolean, navigate: (path: string) => void) {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!enabled || !last) return;
    const path = pathForPushUrl(last.notification.request.content.data?.url);
    if (path) navigate(path);
  }, [enabled, last, navigate]);
}

function Root() {
  const shell = useShell();
  const { ready, locked, send } = shell;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => null);
  }, [ready]);
  usePushNavigation(ready && !locked, (path) => send({ kind: 'navigate', path }));
  if (!ready) return null;
  return (
    <>
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="more" options={{ title: 'More', presentation: 'modal' }} />
      </Stack>
      {locked ? <LockScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ShellProvider>
        <StatusBar style="dark" />
        <Root />
      </ShellProvider>
    </SafeAreaProvider>
  );
}

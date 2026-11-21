import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockScreen } from '@/components/lock-screen';
import { colors } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { routeForPushUrl } from '@/lib/push';

// Keep the native Edureone Campus splash up until the saved session is restored.
SplashScreen.preventAutoHideAsync().catch(() => null);
SplashScreen.setOptions({ fade: true, duration: 250 });

function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false)), []);
  if (!offline) return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 6, paddingTop: 6, backgroundColor: colors.amber }}>
      <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>You are offline. Showing the last loaded data.</Text>
    </View>
  );
}

function usePushNavigation(enabled: boolean) {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!enabled || !last) return;
    const route = routeForPushUrl(last.notification.request.content.data?.url);
    if (route) router.push(route as any);
  }, [enabled, last]);
}

function RootNavigator() {
  const { ready, session, locked } = useAuth();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => null);
  }, [ready]);
  usePushNavigation(ready && !!session && !locked);
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
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="assignments/index" options={{ title: 'Assignments' }} />
          <Stack.Screen name="assignments/[id]" options={{ title: 'Assignment' }} />
          <Stack.Screen name="exams" options={{ title: 'Exams & Results' }} />
          <Stack.Screen name="notices" options={{ title: 'Notices & Calendar' }} />
          <Stack.Screen name="materials" options={{ title: 'Study Materials' }} />
          <Stack.Screen name="gate-passes" options={{ title: 'Gate Passes' }} />
          <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
          <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
          <Stack.Screen name="pay" options={{ title: 'Pay Fees Online', presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
      {session && locked ? <LockScreen /> : null}
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

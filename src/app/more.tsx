import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Row, SectionTitle, colors } from '@/components/ui';
import { APP_VERSION, BRAND } from '@/lib/config';
import { MORE_LINKS } from '@/lib/portal-nav';
import { type PushStatus, getPushStatus, onPushStatus, registerForPush, sendTestPush } from '@/lib/push';
import { useShell } from '@/lib/shell';

const PRIVACY_URL = 'https://edureonecampus.com/privacy-policy';

function pushText(s: PushStatus): string {
  switch (s.state) {
    case 'registered': return 'On. This phone is registered for school notifications.';
    case 'working': return 'Registering this phone...';
    case 'denied': return 'Off. Notifications are not allowed for this app. Tap "Notification settings" to allow them.';
    case 'unsupported': return `Not available (${s.reason}).`;
    case 'failed': return `Could not register: ${s.reason}`;
    default: return 'Sign in to turn on notifications.';
  }
}

function usePushStatus() {
  const [s, set] = useState<PushStatus>(getPushStatus());
  useEffect(() => onPushStatus(set), []);
  return s;
}

export default function More() {
  const shell = useShell();
  const push = usePushStatus();
  const [testing, setTesting] = useState(false);
  const testPush = async () => {
    if (!shell.user) return;
    setTesting(true);
    try {
      if (push.state !== 'registered') await registerForPush(shell.user);
      if (getPushStatus().state !== 'registered') {
        Alert.alert('Notifications', pushText(getPushStatus()));
        return;
      }
      Alert.alert('Test notification', await sendTestPush(shell.user));
    } catch (e) {
      Alert.alert('Test notification failed', String((e as Error)?.message || e));
    } finally {
      setTesting(false);
    }
  };
  const open = (path: string) => {
    router.back();
    shell.send({ kind: 'navigate', path });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
      {shell.user?.name ? (
        <Text style={{ color: colors.muted, marginBottom: 4 }}>Signed in as {shell.user.name}</Text>
      ) : null}

      <SectionTitle>School</SectionTitle>
      {MORE_LINKS.map((l) => (
        <Row key={l.path} icon={l.icon} title={l.title} onPress={() => open(l.path)} />
      ))}

      <SectionTitle>App</SectionTitle>
      {shell.biometricAvailable ? (
        <Row
          icon="finger-print"
          title="Biometric unlock"
          subtitle="Ask for Face ID / fingerprint when opening the app"
          right={<Switch value={shell.biometricEnabled} onValueChange={(on) => { shell.setBiometricEnabled(on).catch(() => undefined); }} />}
        />
      ) : null}
      <SectionTitle>Notifications</SectionTitle>
      <Text style={{ color: push.state === 'failed' || push.state === 'denied' ? colors.red : colors.muted, fontSize: 13 }}>{pushText(push)}</Text>
      {shell.user ? (
        <Row icon="paper-plane-outline" title={testing ? 'Sending...' : 'Send a test notification'} onPress={() => { if (!testing) testPush().catch(() => undefined); }} />
      ) : null}
      <Row icon="notifications-outline" title="Notification settings" onPress={() => Linking.openSettings()} />

      <SectionTitle>{'Account & support'}</SectionTitle>
      <Row icon="refresh-outline" title="Reload" onPress={() => { router.back(); shell.send({ kind: 'reload' }); }} />
      <Row icon="lock-closed-outline" title="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
      <Row icon="help-circle-outline" title="Help & support" subtitle={BRAND.supportEmail} onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`)} />
      {shell.user ? (
        <Row
          icon="log-out-outline"
          title="Sign out"
          onPress={() =>
            Alert.alert('Sign out?', 'You will need to sign in again.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => {
                  router.back();
                  shell.send({ kind: 'signOut' });
                },
              },
            ])
          }
        />
      ) : null}

      <View style={{ alignItems: 'center', marginTop: 16, gap: 2 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{BRAND.product} {APP_VERSION}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{BRAND.company}</Text>
      </View>
    </ScrollView>
  );
}

import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Row, SectionTitle, colors } from '@/components/ui';
import { APP_VERSION, BRAND } from '@/lib/config';
import { MORE_LINKS } from '@/lib/portal-nav';
import { useShell } from '@/lib/shell';

const PRIVACY_URL = 'https://edureonecampus.com/privacy-policy';

export default function More() {
  const shell = useShell();
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
      <Row icon="notifications-outline" title="Notification settings" onPress={() => Linking.openSettings()} />
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

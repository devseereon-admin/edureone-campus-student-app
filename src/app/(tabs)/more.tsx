import { router } from 'expo-router';
import { Alert, Linking, Switch, Text, View } from 'react-native';
import { Card, Row, Screen, SectionTitle, colors } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { APP_VERSION, BRAND, WEB_URL } from '@/lib/config';
import { openUrl } from '@/lib/files';

export default function More() {
  const { session, signOut, biometricAvailable, biometricEnabled, setBiometricEnabled } = useAuth();
  const s = session?.student;
  return (
    <Screen>
      <Card onPress={() => router.push('/profile')}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{s?.full_name}</Text>
        <Text style={{ color: colors.muted, marginTop: 2 }}>{[s?.student_no && `Adm. ${s.student_no}`, s?.email].filter(Boolean).join(' · ')}</Text>
      </Card>

      <SectionTitle>Academics</SectionTitle>
      <Row icon="document-text-outline" title="Assignments" onPress={() => router.push('/assignments')} />
      <Row icon="ribbon-outline" title="Exams & Results" onPress={() => router.push('/exams')} />
      <Row icon="library-outline" title="Study Materials" onPress={() => router.push('/materials')} />
      <Row icon="megaphone-outline" title="Notices & Calendar" onPress={() => router.push('/notices')} />
      <Row icon="exit-outline" title="Gate Passes" onPress={() => router.push('/gate-passes')} />

      <SectionTitle>Account</SectionTitle>
      <Row icon="person-outline" title="My Profile" onPress={() => router.push('/profile')} />
      <Row icon="key-outline" title="Change Password" onPress={() => router.push('/change-password')} />
      {biometricAvailable ? (
        <Row
          icon="finger-print-outline"
          title="Biometric unlock"
          subtitle="Ask for Face ID / fingerprint when opening the app"
          right={<Switch value={biometricEnabled} onValueChange={(v) => setBiometricEnabled(v)} trackColor={{ true: colors.primary }} />}
        />
      ) : null}

      <SectionTitle>More</SectionTitle>
      {WEB_URL ? <Row icon="briefcase-outline" title="User login" subtitle="Staff and admin portal" onPress={() => openUrl(`${WEB_URL}/login`)} /> : null}
      <Row icon="help-circle-outline" title="Help & Support" subtitle={BRAND.supportEmail} onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`)} />
      <Row
        icon="log-out-outline"
        title="Sign out"
        onPress={() =>
          Alert.alert('Sign out?', 'You will need your password to sign in again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
          ])
        }
      />
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{BRAND.product} · v{APP_VERSION}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{BRAND.school}</Text>
      </View>
    </Screen>
  );
}

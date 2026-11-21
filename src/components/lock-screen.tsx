import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { Button, colors } from './ui';

/** Full-screen biometric lock shown over the app when unlock is required. */
export function LockScreen() {
  const { unlock, signOut, session } = useAuth();
  useEffect(() => {
    unlock().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]}>
      <Image source={require('@/assets/brand/edureone-logo.png')} style={{ width: 200, height: 124 }} contentFit="contain" />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>Signed in as {session?.student.full_name}. Unlock to continue.</Text>
      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        <Button title="Unlock" icon="finger-print" onPress={() => unlock().catch(() => null)} />
        <Button title="Sign out" variant="ghost" onPress={() => signOut()} />
      </View>
    </View>
  );
}

import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useShell } from '@/lib/shell';
import { Button, colors } from './ui';

/** Full-screen biometric lock shown over the app when unlock is required. */
export function LockScreen() {
  const { unlock, user } = useShell();
  useEffect(() => {
    unlock().catch(() => null);
  }, [unlock]);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]}>
      <Image source={require('@/assets/brand/edureone-logo.png')} style={{ width: 200, height: 124 }} contentFit="contain" />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>
        {user?.name ? `Signed in as ${user.name}. ` : ''}Unlock to continue.
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <Button title="Unlock" icon="finger-print" onPress={() => unlock().catch(() => null)} />
      </View>
    </View>
  );
}

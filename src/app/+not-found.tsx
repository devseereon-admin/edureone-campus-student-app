import { Link, Stack } from 'expo-router';
import { Text } from 'react-native';
import { Screen, colors } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen contentStyle={{ alignItems: 'center', paddingTop: 80 }}>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>This screen does not exist.</Text>
      <Link href="/" style={{ color: colors.accent, marginTop: 12 }}>Go to home</Link>
    </Screen>
  );
}

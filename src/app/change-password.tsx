import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Card, ErrorView, Field, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/student-api';

export default function ChangePassword() {
  const { signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = current.length >= 8 && next.length >= 8 && next === confirm;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await auth.changePassword(current, next, confirm);
      Alert.alert('Password changed', 'Please sign in again with your new password.');
      router.back();
      await signOut();
    } catch (e: any) {
      setError(e?.message || 'Unable to change the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card style={{ gap: 14 }}>
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" />
        <Field label="New password (min 8 characters)" value={next} onChangeText={setNext} secureTextEntry textContentType="newPassword" />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" />
        <Button title="Change password" onPress={submit} loading={loading} disabled={!valid} />
      </Card>
      {error ? <ErrorView message={error} /> : null}
    </Screen>
  );
}

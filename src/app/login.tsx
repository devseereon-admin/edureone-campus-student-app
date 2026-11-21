import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { BRAND, WEB_URL } from '@/lib/config';
import { openUrl } from '@/lib/files';

/**
 * Student sign in. Mother's Public School name and logo on top (same as the
 * web portal's login), Edureone Campus as the product, and a "User login"
 * link for staff that opens the web portal.
 */
export default function Login() {
  const { signIn, signOutReason } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(signOutReason);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (e: any) {
      setError(e?.message || 'Unable to sign in. Check your student credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('@/assets/brand/mps-logo.png')} style={{ width: 60, height: 60 }} contentFit="contain" accessibilityLabel={BRAND.school} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{BRAND.school}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 }}>{BRAND.product}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>Student sign in</Text>

          {error ? (
            <View style={{ backgroundColor: colors.redSoft, borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8 }} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.red} />
              <Text style={{ color: colors.red, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ gap: 16 }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@institute.edu.in"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
            />
            <View>
              <Field
                label="Password"
                right={
                  <Link href="/forgot-password" style={{ color: colors.accent, fontWeight: '500' }}>
                    Forgot Password?
                  </Link>
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                style={{ paddingRight: 48 }}
              />
              <Pressable onPress={() => setShow((s) => !s)} style={{ position: 'absolute', right: 12, bottom: 12 }} accessibilityLabel={show ? 'Hide password' : 'Show password'} hitSlop={10}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
              </Pressable>
            </View>
            <Button title="Sign in as student" onPress={submit} loading={loading} />
          </View>

          {WEB_URL ? (
            <Pressable onPress={() => openUrl(`${WEB_URL}/login`)} style={{ alignSelf: 'center', padding: 8 }} accessibilityRole="link">
              <Text style={{ color: colors.primary, fontSize: 16 }}>User login</Text>
            </Pressable>
          ) : null}

          <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}>{BRAND.poweredBy}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

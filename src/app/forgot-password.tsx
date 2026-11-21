import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Card, ErrorView, Field, Screen, colors } from '@/components/ui';
import { auth } from '@/lib/student-api';

type Step = 'account' | 'otp' | 'password';

/** Student password recovery: email + admission number -> OTP -> new password. */
export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('account');
  const [email, setEmail] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card style={{ gap: 14 }}>
        {step === 'account' && (
          <>
            <Text style={{ color: colors.muted }}>Enter your registered email and admission number. We will send a 6-digit code to your email.</Text>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="Admission number" value={admissionNo} onChangeText={setAdmissionNo} autoCapitalize="characters" />
            <Button
              title="Send code"
              loading={loading}
              disabled={!email.trim() || !admissionNo.trim()}
              onPress={() => run(async () => {
                await auth.forgot(email, admissionNo);
                setStep('otp');
              })}
            />
          </>
        )}
        {step === 'otp' && (
          <>
            <Text style={{ color: colors.muted }}>Enter the 6-digit code sent to {email}.</Text>
            <Field label="Code" value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" />
            <Button
              title="Verify code"
              loading={loading}
              disabled={otp.length !== 6}
              onPress={() => run(async () => {
                const res = await auth.verifyOtp(email, admissionNo, otp);
                setResetToken(res.reset_token);
                setStep('password');
              })}
            />
            <Button title="Resend code" variant="ghost" onPress={() => run(() => auth.forgot(email, admissionNo).then(() => undefined))} />
          </>
        )}
        {step === 'password' && (
          <>
            <Text style={{ color: colors.muted }}>Choose a new password (at least 8 characters).</Text>
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
            <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" />
            <Button
              title="Update password"
              loading={loading}
              disabled={password.length < 8 || password !== confirm}
              onPress={() => run(async () => {
                await auth.reset(resetToken, password, confirm);
                Alert.alert('Password updated', 'Sign in with your new password.');
                router.back();
              })}
            />
          </>
        )}
      </Card>
      {error ? <ErrorView message={error} /> : null}
    </Screen>
  );
}

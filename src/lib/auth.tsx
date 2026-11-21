import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { setApiContext, setUnauthorizedHandler } from './api';
import { registerForPush, unregisterPush } from './push';
import { KEYS, getItem, getJSON, removeItem, setItem, setJSON } from './storage';
import { auth as authApi, type Student } from './student-api';

type Session = { token: string; student: Student };

type AuthState = {
  ready: boolean;
  session: Session | null;
  locked: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (reason?: string) => Promise<void>;
  refreshStudent: () => Promise<void>;
  unlock: () => Promise<boolean>;
  setBiometricEnabled: (on: boolean) => Promise<void>;
  signOutReason: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

const applyContext = (s: Session | null) =>
  setApiContext(
    s
      ? {
          token: s.token,
          instituteUuid: s.student.institute_uuid,
          studentUuid: s.student.student_uuid,
          sessionYear: s.student.session_year ?? null,
        }
      : { token: null },
  );

/** Re-lock after the app has been in the background this long. */
const RELOCK_AFTER_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [locked, setLocked] = useState(false);
  const [biometricEnabled, setBio] = useState(false);
  const [biometricAvailable, setBioAvailable] = useState(false);
  const [signOutReason, setSignOutReason] = useState<string | null>(null);
  const backgroundAt = useRef<number | null>(null);

  const signOut = useCallback(async (reason?: string) => {
    await unregisterPush().catch(() => null);
    await authApi.logout();
    await Promise.all([removeItem(KEYS.token), removeItem(KEYS.session)]);
    applyContext(null);
    setSession(null);
    setLocked(false);
    setSignOutReason(reason ?? null);
  }, []);

  // Restore the saved session on cold start.
  useEffect(() => {
    (async () => {
      const [token, student, bio, hasHw, enrolled] = await Promise.all([
        getItem(KEYS.token),
        getJSON<Student>(KEYS.session),
        getItem(KEYS.biometric),
        LocalAuthentication.hasHardwareAsync().catch(() => false),
        LocalAuthentication.isEnrolledAsync().catch(() => false),
      ]);
      const available = Boolean(hasHw && enrolled);
      setBioAvailable(available);
      setBio(bio === '1' && available);
      if (token && student) {
        const s = { token, student };
        applyContext(s);
        setSession(s);
        setLocked(bio === '1' && available);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut('Your session has expired. Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Biometric re-lock when returning from the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state === 'active' && backgroundAt.current) {
        const away = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (biometricEnabled && session && away > RELOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const token = res.access_token;
    setApiContext({ token, instituteUuid: res.institute_uuid, studentUuid: res.student_uuid, sessionYear: res.student_context?.session_year ?? null });
    const student = await authApi.me();
    const s = { token, student };
    await Promise.all([setItem(KEYS.token, token), setJSON(KEYS.session, student)]);
    applyContext(s);
    setSession(s);
    setSignOutReason(null);
    registerForPush().catch(() => null);
  }, []);

  const refreshStudent = useCallback(async () => {
    if (!session) return;
    const student = await authApi.me();
    const s = { ...session, student: { ...session.student, ...student } };
    await setJSON(KEYS.session, s.student);
    applyContext(s);
    setSession(s);
  }, [session]);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Edureone Campus',
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
    });
    if (result.success) setLocked(false);
    return result.success;
  }, []);

  const setBiometricEnabled = useCallback(async (on: boolean) => {
    if (on) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to turn on biometric unlock' });
      if (!result.success) return;
    }
    await setItem(KEYS.biometric, on ? '1' : '0');
    setBio(on);
  }, []);

  // Re-register push on every cold start while signed in (token can rotate).
  useEffect(() => {
    if (ready && session && !locked) registerForPush().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, Boolean(session), locked]);

  const value = useMemo<AuthState>(
    () => ({
      ready, session, locked, biometricEnabled, biometricAvailable, signIn, signOut, refreshStudent, unlock,
      setBiometricEnabled, signOutReason,
    }),
    [ready, session, locked, biometricEnabled, biometricAvailable, signIn, signOut, refreshStudent, unlock, setBiometricEnabled, signOutReason],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

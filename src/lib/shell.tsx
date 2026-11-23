import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { registerForPush, unregisterPush, type WebSession } from './push';
import { KEYS, getItem, removeItem, setItem } from './storage';

/**
 * Native state around the portal: who is signed in (as reported by the
 * portal), the Face ID / fingerprint lock, and a small command channel so
 * native screens (More, push taps) can drive the portal WebView.
 */

export type PortalUser = WebSession & { name?: string | null; role?: string | null };

type Command = { kind: 'navigate'; path: string } | { kind: 'signOut' } | { kind: 'reload' };

type ShellState = {
  ready: boolean;
  /** True when the portal had a signed-in user the last time the app ran. */
  hadSession: boolean;
  user: PortalUser | null;
  path: string;
  locked: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  setUser: (u: PortalUser | null) => void;
  setPath: (p: string) => void;
  unlock: () => Promise<boolean>;
  setBiometricEnabled: (on: boolean) => Promise<void>;
  send: (c: Command) => void;
  onCommand: (fn: (c: Command) => void) => () => void;
};

const Ctx = createContext<ShellState | null>(null);

const RELOCK_AFTER_MS = 60_000;
const HAD_SESSION_KEY = 'edureon.had_session';

export function ShellProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hadSession, setHadSession] = useState(false);
  const [user, setUserState] = useState<PortalUser | null>(null);
  const [path, setPath] = useState('/');
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBioAvailable] = useState(false);
  const [biometricEnabled, setBio] = useState(false);
  const listeners = useRef(new Set<(c: Command) => void>());
  const lastUser = useRef<PortalUser | null>(null);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const [had, bio, hw, enrolled] = await Promise.all([
        getItem(HAD_SESSION_KEY),
        getItem(KEYS.biometric),
        LocalAuthentication.hasHardwareAsync().catch(() => false),
        LocalAuthentication.isEnrolledAsync().catch(() => false),
      ]);
      const available = Boolean(hw && enrolled);
      setBioAvailable(available);
      setBio(bio === '1' && available);
      setHadSession(had === '1');
      setLocked(had === '1' && bio === '1' && available);
      setReady(true);
    })();
  }, []);

  const setUser = useCallback((u: PortalUser | null) => {
    const prev = lastUser.current;
    if (prev?.token === u?.token && prev?.institute === u?.institute) return;
    lastUser.current = u;
    setUserState(u);
    if (u) {
      setItem(HAD_SESSION_KEY, '1').catch(() => null);
      registerForPush(u).catch(() => null);
    } else {
      removeItem(HAD_SESSION_KEY).catch(() => null);
      if (prev) unregisterPush(prev).catch(() => null);
    }
  }, []);

  // Re-lock after a minute in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state === 'active' && backgroundAt.current) {
        const away = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (biometricEnabled && lastUser.current && away > RELOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [biometricEnabled]);

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
      await setItem(KEYS.biometric, '1');
    } else {
      await removeItem(KEYS.biometric);
    }
    setBio(on);
  }, []);

  const send = useCallback((c: Command) => {
    listeners.current.forEach((fn) => fn(c));
  }, []);

  const onCommand = useCallback((fn: (c: Command) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value = useMemo<ShellState>(
    () => ({
      ready, hadSession, user, path, locked, biometricAvailable, biometricEnabled,
      setUser, setPath, unlock, setBiometricEnabled, send, onCommand,
    }),
    [ready, hadSession, user, path, locked, biometricAvailable, biometricEnabled, setUser, unlock, setBiometricEnabled, send, onCommand],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShell(): ShellState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShell outside ShellProvider');
  return v;
}


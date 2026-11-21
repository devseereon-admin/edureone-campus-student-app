import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

type State<T> = { data: T | null; error: string | null; loading: boolean; refreshing: boolean };

const messageOf = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/**
 * Load data for a screen. Reloads on pull-to-refresh, when `deps` change,
 * and silently when the screen regains focus more than 60 s after the last load.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true, refreshing: false });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  const loadedAt = useRef(0);
  const key = JSON.stringify(deps);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;
    loaderRef
      .current()
      .then((data) => {
        if (cancelled) return;
        loadedAt.current = Date.now();
        setState({ data, error: null, loading: false, refreshing: false });
      })
      .catch((e) => {
        if (!cancelled) setState((s) => ({ ...s, error: messageOf(e), loading: false, refreshing: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, refreshing: true }));
    setNonce((n) => n + 1);
  }, []);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useFocusEffect(
    useCallback(() => {
      if (loadedAt.current && Date.now() - loadedAt.current > 60_000) reload();
    }, [reload]),
  );

  return { ...state, refresh, reload };
}

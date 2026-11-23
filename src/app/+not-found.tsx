import { Redirect, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useShell } from '@/lib/shell';

/**
 * Deep links such as edureon://student/notices land here: open that page of
 * the portal inside the app.
 */
export default function DeepLink() {
  const pathname = usePathname();
  const { send } = useShell();
  useEffect(() => {
    if (pathname && pathname !== '/') send({ kind: 'navigate', path: pathname.startsWith('/') ? pathname : `/${pathname}` });
  }, [pathname, send]);
  return <Redirect href="/" />;
}

import Ionicons from '@expo/vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { BlurView } from 'expo-blur';
import { Directory, File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation, type WebViewProps } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { Button, colors } from '@/components/ui';
import { SIGN_OUT_SCRIPT, injectedBeforeLoad, navigateScript, parseBridgeMessage } from '@/lib/bridge';
import { WEB_URL } from '@/lib/config';
import { openLocalFile } from '@/lib/files';
import { START_SIGNED_IN, START_SIGNED_OUT, TABS, activeTab, showsTabBar } from '@/lib/portal-nav';
import { useShell } from '@/lib/shell';

// react-native-webview's class typings resolve to `never` under TypeScript 6;
// describe the bits we use.
type WebViewHandle = { injectJavaScript: (js: string) => void; reload: () => void; goBack: () => void };
const PortalWebView = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebViewHandle> }>;

const WEB_ORIGIN = (() => {
  try {
    return new URL(WEB_URL).origin;
  } catch {
    return '';
  }
})();

const INJECTED = injectedBeforeLoad(WEB_ORIGIN);

const PILL_HEIGHT = 62;
const PILL_PAD = 5;
/** Tells the portal how much room to leave under its pages for the tab bar. */
const reserveScript = (px: number) =>
  `document.documentElement.style.setProperty('--edureone-tabbar', '${Math.round(px)}px'); true;`;

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'download';

function downloadsDir() {
  const dir = new Directory(Paths.cache, 'downloads');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function saveBase64(name: string, mime: string, base64: string) {
  const file = new File(downloadsDir(), safeName(name));
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  await openLocalFile(file.uri, mime);
}

async function saveFromUrl(url: string, name: string, token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const target = new File(downloadsDir(), safeName(name));
  const file = await File.downloadFileAsync(url, target, { headers, idempotent: true });
  await openLocalFile(file.uri, file.type || undefined);
}

const openExternal = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: colors.primary,
  }).catch(() => Linking.openURL(url));

export default function Portal() {
  const shell = useShell();
  const { setUser, setPath, onCommand } = shell;
  const insets = useSafeAreaInsets();
  const web = useRef<WebViewHandle>(null);
  const [startPath] = useState(() => (shell.hadSession ? START_SIGNED_IN : START_SIGNED_OUT));
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [keyboard, setKeyboard] = useState(0);
  const pendingPath = useRef<string | null>(null);
  const loadedOnce = useRef(false);
  const [loaded, setLoaded] = useState(false);

  const tabBar = Boolean(shell.user && showsTabBar(shell.path) && keyboard === 0);
  const pillBottom = Math.max(insets.bottom, 12);
  // Room the portal leaves under its pages for the floating tab bar.
  const reserve = tabBar ? PILL_HEIGHT + pillBottom + 8 : 0;
  const reserveRef = useRef(reserve);
  useEffect(() => {
    reserveRef.current = reserve;
    if (loaded) web.current?.injectJavaScript(reserveScript(reserve));
  }, [reserve, loaded]);

  // iOS-style capsule that glides to the selected tab.
  const [pillWidth, setPillWidth] = useState(0);
  const [capsuleX] = useState(() => new Animated.Value(0));
  const activeIndex = (() => {
    const k = activeTab(shell.path);
    return k === 'more' ? TABS.length : TABS.findIndex((t) => t.key === k);
  })();
  useEffect(() => {
    if (pillWidth <= 0 || activeIndex < 0) return;
    const w = (pillWidth - PILL_PAD * 2) / (TABS.length + 1);
    Animated.spring(capsuleX, { toValue: activeIndex * w, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [activeIndex, pillWidth, capsuleX]);

  const go = useCallback((path: string) => {
    if (!loadedOnce.current) {
      pendingPath.current = path;
      return;
    }
    web.current?.injectJavaScript(navigateScript(path));
  }, []);

  // Commands from native screens (More, push taps).
  useEffect(
    () =>
      onCommand((c) => {
        if (c.kind === 'navigate') go(c.path);
        if (c.kind === 'reload') web.current?.reload();
        if (c.kind === 'signOut') web.current?.injectJavaScript(SIGN_OUT_SCRIPT);
      }),
    [onCommand, go],
  );

  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        const isOff = s.isConnected === false;
        setOffline(isOff);
        if (!isOff && failed) {
          setFailed(false);
          web.current?.reload();
        }
      }),
    [failed],
  );

  // Android 15+ draws edge-to-edge, so the window no longer shrinks for the
  // keyboard and a WebView's inputs would sit behind it. Lift the portal
  // above the keyboard ourselves (iOS's WKWebView already does this).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Android back button: walk the portal's history, then leave the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && shell.path !== '/student/dashboard' && shell.path !== START_SIGNED_OUT) {
        web.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack, shell.path]);

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const msg = parseBridgeMessage(event.nativeEvent.data);
      if (!msg) return;
      switch (msg.type) {
        case 'route':
          setPath(msg.path);
          break;
        case 'session':
          setUser(msg.token ? { token: msg.token, institute: msg.institute, name: msg.name, role: msg.role } : null);
          break;
        case 'external':
          openExternal(msg.url);
          break;
        case 'download':
        case 'downloadUrl':
          setBusy(true);
          try {
            if (msg.type === 'download') await saveBase64(msg.name, msg.mime, msg.base64);
            else await saveFromUrl(msg.url, msg.name, msg.token);
          } catch {
            if (msg.type === 'downloadUrl') openExternal(msg.url);
          } finally {
            setBusy(false);
          }
          break;
      }
    },
    [setPath, setUser],
  );

  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    const url = req.url || '';
    if (/^(https?:|about:|blob:|data:|javascript:)/i.test(url)) return true;
    // upi://, tel:, mailto:, intent:, whatsapp: ... belong to other apps.
    Linking.openURL(url).catch(() => null);
    return false;
  }, []);

  const onNavState = useCallback(
    (nav: WebViewNavigation) => {
      setCanGoBack(nav.canGoBack);
      // Payment gateway or another site: no tab bar until we are back on the portal.
      if (WEB_ORIGIN && nav.url && !nav.url.startsWith(WEB_ORIGIN)) setPath('#external');
    },
    [setPath],
  );

  const onLoadEnd = useCallback(() => {
    setLoading(false);
    web.current?.injectJavaScript(reserveScript(reserveRef.current));
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      setLoaded(true);
      if (pendingPath.current) {
        web.current?.injectJavaScript(navigateScript(pendingPath.current));
        pendingPath.current = null;
      }
    }
  }, []);

  if (!WEB_URL) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Portal address missing</Text>
        <Text style={styles.body}>This build was made without EXPO_PUBLIC_WEB_URL.</Text>
      </View>
    );
  }

  const tab = activeTab(shell.path);
  const tabIndex = tab === 'more' ? TABS.length : TABS.findIndex((t) => t.key === tab);
  const tabWidth = pillWidth > 0 ? (pillWidth - PILL_PAD * 2) / (TABS.length + 1) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: keyboard }}>
      {progress > 0 && progress < 1 && loaded ? (
        <View style={[styles.progress, { top: insets.top, width: `${Math.round(progress * 100)}%` }]} />
      ) : null}
      <PortalWebView
        ref={web}
        source={{ uri: `${WEB_URL}${startPath}` }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        injectedJavaScriptBeforeContentLoaded={INJECTED}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStart}
        onNavigationStateChange={onNavState}
        onLoadEnd={onLoadEnd}
        onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
        overScrollMode="never"
        cacheEnabled
        onError={() => setFailed(true)}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500 && e.nativeEvent.url.startsWith(WEB_ORIGIN)) setFailed(true);
        }}
        onContentProcessDidTerminate={() => web.current?.reload()}
        onRenderProcessGone={() => web.current?.reload()}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        mixedContentMode="never"
        textZoom={100}
        // A number, not "normal": the Android view manager casts this prop to a
        // Double and crashes on a string (iOS "normal" scrolling = 0.998).
        decelerationRate={0.998}
        applicationNameForUserAgent="EdureoneCampusApp/1"
        webviewDebuggingEnabled={__DEV__}
      />

      {tabBar ? (
        <View style={[styles.pillShadow, { bottom: pillBottom }]} pointerEvents="box-none">
          <View style={styles.pill} onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}>
            {Platform.OS === 'ios' ? (
              <BlurView tint="systemChromeMaterialLight" intensity={90} style={StyleSheet.absoluteFill} />
            ) : null}
            {pillWidth > 0 && tabIndex >= 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.capsule,
                  { left: PILL_PAD + 3, width: tabWidth - 6, transform: [{ translateX: capsuleX }] },
                ]}
              />
            ) : null}
            {TABS.map((t) => (
              <TabButton
                key={t.key}
                icon={t.icon}
                title={t.title}
                active={tab === t.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => null);
                  go(t.path);
                }}
              />
            ))}
            <TabButton
              icon="grid-outline"
              title="More"
              active={tab === 'more'}
              onPress={() => {
                Haptics.selectionAsync().catch(() => null);
                router.push('/more');
              }}
            />
          </View>
        </View>
      ) : (
        <View style={{ height: keyboard ? 0 : insets.bottom, backgroundColor: '#fff' }} />
      )}

      {loading && !loaded ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Image source={require('@/assets/brand/edureone-logo.png')} style={{ width: 180, height: 110 }} contentFit="contain" />
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        </View>
      ) : null}

      {failed || (offline && !loaded) ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: insets.top }]}>
          <Ionicons name="cloud-offline-outline" size={56} color={colors.muted} />
          <Text style={styles.title}>{offline ? 'You are offline' : 'Could not reach Edureone Campus'}</Text>
          <Text style={styles.body}>Check your internet connection and try again. The app reconnects automatically.</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
            <Button
              title="Try again"
              icon="refresh"
              onPress={() => {
                setFailed(false);
                web.current?.reload();
              }}
            />
          </View>
        </View>
      ) : null}

      {offline && loaded && !failed ? (
        <View style={[styles.banner, { top: insets.top }]}>
          <Text style={styles.bannerText}>You are offline</Text>
        </View>
      ) : null}

      {busy ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.body, { marginTop: 8 }]}>Preparing file…</Text>
        </View>
      ) : null}
    </View>
  );
}

function TabButton({
  icon,
  title,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  const filled = (active ? String(icon).replace('-outline', '') : icon) as React.ComponentProps<typeof Ionicons>['name'];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: 0.94 }] }]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={title}>
      <View style={styles.tabInner}>
        <Ionicons name={filled} size={21} color={active ? colors.primary : colors.muted} />
        <Text numberOfLines={1} style={[styles.tabText, { color: active ? colors.primary : colors.muted, fontWeight: active ? '700' : '500' }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 8 },
  body: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  // Floating pill tab bar: frosted glass on iOS, translucent white on Android.
  pillShadow: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    shadowColor: '#0B1024',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255,255,255,0.94)',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PILL_PAD,
    borderRadius: PILL_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,37,64,0.10)',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.35)' : 'transparent',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 1 },
  // Soft, fully rounded capsule behind the selected tab (no hard box edges).
  capsule: {
    position: 'absolute',
    left: 0,
    top: 5,
    bottom: 5,
    borderRadius: 999,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(28,37,64,0.10)' : 'rgba(28,37,64,0.08)',
  },
  tabText: { fontSize: 10.5 },
  progress: { position: 'absolute', left: 0, height: 2, backgroundColor: colors.accent, zIndex: 10 },
  banner: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.amber, paddingVertical: 4 },
  bannerText: { color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 12 },
});

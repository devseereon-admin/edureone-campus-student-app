import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { Empty, colors } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { WEB_URL } from '@/lib/config';

/**
 * Online fee payment.
 *
 * The school's payment gateways (PayU / SabPaisa / Worldline / Razorpay)
 * are wired into the web portal's Fees page, so the app opens that page in a
 * secure in-app WebView and hands it the student's existing session (the
 * same localStorage / sessionStorage keys the web portal writes at student
 * sign in). The student never signs in twice and no card data touches the app.
 */
export default function Pay() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);

  const inject = useMemo(() => {
    if (!session) return '';
    const s = session.student;
    const user = {
      uuid: s.student_uuid, account_type: 'student', name: s.full_name, display_name: s.full_name, email: s.email,
      role: 'STUDENT', role_code: 'STUDENT', role_codes: ['STUDENT'], permissions: [], is_super_admin: false,
      requires_institute_selection: false, selected_institute_uuid: s.institute_uuid,
    };
    const scope = `${s.student_uuid}:${s.institute_uuid}`;
    const local: Record<string, string> = {
      access_token: session.token,
      user: JSON.stringify(user),
      'edureone.auth.user': JSON.stringify(user),
      'auth-storage': JSON.stringify({ state: { instituteUUID: s.institute_uuid }, version: 0 }),
      'institute-storage': JSON.stringify({ state: { activeInstituteId: s.institute_uuid }, version: 0 }),
      ...(s.session_year ? { 'session-storage': JSON.stringify({ state: { sessionYear: s.session_year }, version: 1 }) } : {}),
    };
    const sessionKeys = {
      'edureone.student-selection': JSON.stringify({ state: { scope, children: [s], selectedStudent: s, revision: 1 }, version: 0 }),
    };
    return `(function(){try{var l=${JSON.stringify(local)};for(var k in l){localStorage.setItem(k,l[k]);}var s=${JSON.stringify(sessionKeys)};for(var j in s){sessionStorage.setItem(j,s[j]);}document.documentElement.classList.add('native-app');}catch(e){}})();true;`;
  }, [session]);

  if (!WEB_URL || !session) return <Empty icon="card-outline" title="Online payment is not configured" />;

  const allowed = (url: string) => url.startsWith(WEB_URL) || /^https:\/\//.test(url);
  const onNav = (req: WebViewNavigation) => {
    // UPI / intent links open the payment app.
    if (/^(upi|intent|phonepe|paytmmp|gpay|tez):/i.test(req.url)) {
      Linking.openURL(req.url).catch(() => null);
      return false;
    }
    // The web portal signs out to its login page: close the sheet instead.
    if (req.url.startsWith(`${WEB_URL}/login`)) {
      router.back();
      return false;
    }
    return allowed(req.url);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <WebView
        source={{ uri: `${WEB_URL}/student/fees` }}
        injectedJavaScriptBeforeContentLoaded={inject}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        onShouldStartLoadWithRequest={onNav}
        onLoadEnd={() => setLoading(false)}
        originWhitelist={['https://*', 'upi://*', 'intent://*']}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        mixedContentMode="never"
      />
      {loading ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

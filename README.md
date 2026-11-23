# Edureone Campus — Student App (React Native / Expo hybrid shell)

The student / parent app for Edureone Campus (Mother's Public School), built
with Expo SDK 58 / React Native 0.88 and Expo Router.

It is a **native shell around the hosted web portal**: the screens come from
the live portal (`EXPO_PUBLIC_WEB_URL`, the same site students use in a
browser), so anything the web team ships, including new pages, the mobile
number + OTP login and the student switcher, reaches the app **without a store
update**. The shell adds what a phone app needs and what the App Store
reviews for.

## Native features

| Feature | How |
|---------|-----|
| Splash + icon | Edureone Campus logo centred on white (Android 12+ mask safe); adaptive + themed Android icon |
| Native tab bar | Home, Attendance, Fees, Notices + **More** (native list of every other student page). Tabs move the portal client-side, no reload. The portal's own mobile bar is hidden inside the app |
| Push notifications | Permission prompt after sign in, Android channel `edureon_default`, FCM token sent to `POST /devices/register` with the signed-in user's token; tapping a push with `data.url` (e.g. `/student/notices`) opens that page |
| Biometric lock | Optional Face ID / Touch ID / fingerprint (More → Biometric unlock); re-locks after 60 s in the background |
| Files | Receipts / reports the portal generates (jsPDF, XLSX, blob, `<a download>`) are saved and opened in the system viewer / share sheet |
| Links | Other websites open in the in-app browser (SFSafariViewController / Custom Tab); `upi:`, `tel:`, `mailto:`, `whatsapp:` open the right app |
| Offline | Native offline screen with retry and auto-reconnect; banner when the connection drops |
| Deep links | `edureon://student/notices` etc. open that portal page |
| Platform | Android back button walks portal history; iOS swipe back; pull to refresh (iOS); haptics; safe areas |

How the shell and portal talk: `src/lib/bridge.ts` (a script injected before the
portal loads). Tabs and the More list: `src/lib/portal-nav.ts`. Keep the portal's
student paths (`/student/...`) and `/login/student` stable, or update that file.

## Configuration

Set these as GitHub **Variables** (or in `.env.local` for local builds):

| Name | Example | Used for |
|------|---------|----------|
| `EXPO_PUBLIC_WEB_URL` | `https://portal.example.com` | **required**: the portal the app shows (same as the web repo's `MOBILE_SERVER_URL`) |
| `EXPO_PUBLIC_API_URL` | `https://api.example.com/api/v1` | push token registration (same value as the web repo's `VITE_API_URL`) |
| `APPLE_TEAM_ID` | `ABCDE12345` | iOS signing |

`app.config.ts` also reads `APP_VERSION`, `APP_BUILD_NUMBER` and
`APP_BUNDLE_ID` (default **`com.seereon.edureon`**, the same id as the
current Capacitor app, so this app ships as an *update* to the existing store
listings; use a build number higher than any Capacitor build already uploaded).

## Building

### GitHub Actions (`.github/workflows/build.yml`)

* Every push / PR: typecheck + lint, Android release APK + AAB, iOS Release
  build for the simulator and an unsigned device build.
* *Actions → Build apps → Run workflow* with `store_build` ticked: signed AAB
  (Play Console) and signed IPA (App Store Connect / Transporter).

Secrets (the same values as the web repo's *Mobile release* workflow can be reused):

| Secret | What |
|--------|------|
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Play upload key (`base64 -w0 upload.jks`) |
| `GOOGLE_SERVICES_JSON` | optional, Firebase Android config, enables push |
| `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD` | Apple Distribution certificate |
| `IOS_PROVISIONING_PROFILE_BASE64` | App Store profile for the bundle id, **Push Notifications** capability on |

### EAS (alternative)

`npx eas-cli build --platform all --profile production` works with the
included `eas.json` if you prefer Expo's cloud builds (needs an Expo account).

### Locally

```bash
npm ci
npx expo prebuild --clean          # generates android/ and ios/ (not committed)
npx expo run:android               # or: cd android && ./gradlew assembleRelease  (JDK 17)
npx expo run:ios                   # macOS + Xcode 26.4+
```

## Push

* **Android** works with the existing backend once `GOOGLE_SERVICES_JSON` is set
  and `PUSH_NOTIFICATIONS_ENABLED=true` on the server.
* `POST /devices/register` authenticates *user* tokens. If the backend rejects
  student tokens the app ignores it quietly (it never signs the student out);
  allow student tokens there to enable student pushes.
* **iOS**: the native iOS token is an APNs token, which FCM cannot address
  directly. The app already requests permission and handles taps; to send iOS
  pushes either add APNs sending to the backend or add `@react-native-firebase/messaging`
  to obtain an FCM token on iOS.

## Store checklist

* Play: upload the AAB, target SDK 36, content rating *Education*, Data safety:
  name/email/student records (collected, encrypted in transit), provide a test student login.
* Apple: App Privacy (contact info, user content, identifiers), review notes with a
  test student login and the native features above; `ITSAppUsesNonExemptEncryption` = NO is set.
* Bump `build_number` on every upload.

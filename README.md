# Edureone Campus — Student App (React Native / Expo)

A fully native student app for Edureone Campus (Mother's Public School),
built with Expo SDK 58 / React Native 0.88 and Expo Router. It talks
directly to the same FastAPI backend as the web portal; it does **not** load
the website in a WebView (except the online-payment sheet, see below).

## What's in it

| Area | Screens / features |
|------|--------------------|
| Sign in | Student sign in (MPS logo + name), forgot password (email + admission no. → OTP → new password), **User login** link for staff (opens the web portal) |
| Home | Greeting, attendance %, pending work, upcoming exams, fee balance, quick links, upcoming assignments, latest results, notices |
| Attendance | Month calendar (P/A/L/Holiday), totals, monthly trend, 75% eligibility warning |
| Timetable | Regular / summer / exam / additional timetables, day picker |
| Fees | Dues by component, totals, payment history, **receipt PDF download + share**, *Pay online* |
| Assignments | Pending / submitted / graded, detail, teacher attachments, **file submission** (PDF/image/Word), questions to teacher |
| Exams & Results | Schedule with papers, subject-wise marks, percentage, grade |
| Notices & Calendar | Notices by category with attachments, academic calendar and holidays |
| Study Materials | Materials and lesson plans, search, open/download |
| Gate Passes | Issued passes, status |
| Account | Profile, change password, biometric unlock toggle, sign out |

### Native functionality

* **Secure storage**: the token and profile live in the iOS Keychain /
  Android Keystore (`expo-secure-store`, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`).
* **Biometric unlock**: optional Face ID / Touch ID / fingerprint lock, re-locks
  after 60 s in the background (`expo-local-authentication`).
* **Push notifications**: permission prompt after sign in, Android channel
  `edureon_default`, FCM token registered with `POST /devices/register`
  (same contract as the Capacitor app); tapping a push with `data.url`
  (e.g. `/student/notices`) opens the matching screen. See *Push* below.
* **Splash + icon**: Edureone Campus logo centred on white, sized to stay
  inside Android 12+'s splash mask; adaptive + themed (monochrome) Android icon;
  iOS icon without alpha.
* **Deep links**: `edureon://` scheme on both platforms (Expo Router maps
  `edureon://fees`, `edureon://notices`, … to screens).
* **Files**: receipt PDFs downloaded with auth headers and opened in the system
  viewer / share sheet; document picker for assignment uploads.
* **Offline banner**, pull-to-refresh everywhere, haptics, safe areas, keyboard handling.

### Online fee payment

The school's payment gateways are integrated in the web portal, so *Pay
online* opens the portal's Fees page in an in-app WebView and passes it the
student's existing session (same storage keys the web portal writes at student
sign in). UPI app links open the UPI app. No card data touches the app.

## Configuration

Set these as GitHub **Variables** (or in `.env.local` for local builds):

| Name | Example | Used for |
|------|---------|----------|
| `EXPO_PUBLIC_API_URL` | `https://api.example.com/api/v1` | the backend (same value as the web repo's `VITE_API_URL`) |
| `EXPO_PUBLIC_WEB_URL` | `https://mps.example.com` | "User login" and online payment (same as `MOBILE_SERVER_URL`) |
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

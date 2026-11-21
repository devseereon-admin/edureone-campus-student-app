import type { ExpoConfig } from 'expo/config';

/**
 * Edureone Campus — student app (React Native / Expo).
 *
 * Everything that differs per school or per release comes from environment
 * variables, so CI can build without editing this file:
 *
 *   EXPO_PUBLIC_API_URL      FastAPI base, e.g. https://api.example.com/api/v1
 *   EXPO_PUBLIC_WEB_URL      hosted web portal (used for "User login" and online fee payment)
 *   APP_VERSION              marketing version shown in the stores (1.0.0)
 *   APP_BUILD_NUMBER         Android versionCode / iOS build number, +1 every upload
 *   APP_BUNDLE_ID            defaults to com.seereon.edureon (same id as the current
 *                            Capacitor app, so this build ships as an UPDATE to the
 *                            existing store listings)
 */
const VERSION = process.env.APP_VERSION || '1.0.0';
const BUILD = Number(process.env.APP_BUILD_NUMBER || '1');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.seereon.edureon';

const config: ExpoConfig = {
  name: 'Edureone Campus',
  slug: 'edureone-campus-student',
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/brand/icon.png',
  scheme: 'edureon',
  userInterfaceStyle: 'light',
  backgroundColor: '#ffffff',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: String(BUILD),
    supportsTablet: true,
    deploymentTarget: '16.4',
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSFaceIDUsageDescription: 'Use Face ID to unlock Edureone Campus quickly and keep your student data private.',
      NSCameraUsageDescription: 'Edureone Campus uses the camera when you attach a photo to an assignment.',
      NSPhotoLibraryUsageDescription: 'Edureone Campus needs your photo library so you can attach images to assignments.',
      UIBackgroundModes: ['remote-notification'],
    },
    entitlements: { 'aps-environment': 'production' },
  },
  android: {
    package: BUNDLE_ID,
    versionCode: BUILD,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/brand/adaptive-foreground.png',
      monochromeImage: './assets/brand/monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Only what the app actually uses (Play Console asks you to justify extras).
    permissions: ['android.permission.USE_BIOMETRIC', 'android.permission.POST_NOTIFICATIONS'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
    // google-services.json is written by CI from the GOOGLE_SERVICES_JSON secret
    // (enables FCM push). Without it the app builds and runs; push stays off.
    ...(process.env.GOOGLE_SERVICES_FILE ? { googleServicesFile: process.env.GOOGLE_SERVICES_FILE } : {}),
    intentFilters: [
      {
        action: 'VIEW',
        category: ['BROWSABLE', 'DEFAULT'],
        data: [{ scheme: 'edureon' }],
      },
    ],
  },
  web: { favicon: './assets/brand/favicon.png' },
  plugins: [
    'expo-router',
    './plugins/with-android-release-signing',
    [
      'expo-splash-screen',
      {
        // Edureone Campus logo, centred, never stretched. 156dp keeps the whole
        // logo inside Android 12+'s circular splash-icon mask.
        backgroundColor: '#ffffff',
        image: './assets/brand/splash-logo.png',
        imageWidth: 156,
        resizeMode: 'contain',
      },
    ],
    'expo-secure-store',
    [
      'expo-local-authentication',
      { faceIDPermission: 'Use Face ID to unlock Edureone Campus quickly and keep your student data private.' },
    ],
    [
      'expo-notifications',
      { color: '#1C2540', defaultChannel: 'edureon_default' },
    ],
    'expo-sharing',
    [
      'expo-build-properties',
      {
        android: { usesCleartextTraffic: false },
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
    webUrl: process.env.EXPO_PUBLIC_WEB_URL || '',
    school: "Mother's Public School",
  },
};

export default config;

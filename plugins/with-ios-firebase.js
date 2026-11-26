/**
 * Config plugin: Firebase on iOS only, so iOS phones get an FCM token (the
 * backend sends every push through FCM HTTP v1; Firebase forwards to APNs).
 *
 * Android keeps using expo-notifications + google-services.json exactly as
 * before (react-native.config.js keeps the React Native Firebase modules out
 * of the Android build).
 *
 * Applied only when GOOGLE_SERVICES_PLIST_FILE points to a
 * GoogleService-Info.plist (CI writes it from the GOOGLE_SERVICE_INFO_PLIST
 * secret). Without it, Firebase is never started and iOS push stays off.
 */
const fs = require('fs');
const path = require('path');
const { withPlugins } = require('expo/config-plugins');
// The iOS half of @react-native-firebase/app's own plugin (not in its "exports").
const rnfbApp = path.dirname(require.resolve('@react-native-firebase/app/package.json'));
const ios = require(path.join(rnfbApp, 'plugin', 'build', 'ios'));

module.exports = function withIosFirebase(config) {
  const plist = process.env.GOOGLE_SERVICES_PLIST_FILE;
  if (!plist || !fs.existsSync(plist)) return config;
  config.ios = { ...config.ios, googleServicesFile: plist };
  return withPlugins(config, [ios.withFirebaseAppDelegate, ios.withIosGoogleServicesFile, [ios.withIosDisableSPM, {}]]);
};

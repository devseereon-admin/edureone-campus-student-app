/**
 * Config plugin: sign Android release builds with the upload key from the
 * environment (CI secrets) instead of the template's debug key.
 *
 *   ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
 *
 * Without them the release build stays debug-signed (fine for a test install,
 * never for the Play Store). Set REQUIRE_RELEASE_SIGNING=1 to make a missing
 * key fail the build instead.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// edureon-release-signing';

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    src = src.replace(
      /signingConfigs \{\n/,
      `signingConfigs {
        ${MARKER}
        release {
            def ksPath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (ksPath && file(ksPath).exists()) {
                storeFile file(ksPath)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
`,
    );
    src = src.replace(
      /(release \{\n\s*\/\/ Caution![^\n]*\n\s*\/\/ see[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
      `$1def hasUploadKey = System.getenv("ANDROID_KEYSTORE_PATH") && file(System.getenv("ANDROID_KEYSTORE_PATH")).exists()
            if (!hasUploadKey && System.getenv("REQUIRE_RELEASE_SIGNING") == "1") {
                throw new GradleException("Release signing key missing: set ANDROID_KEYSTORE_PATH / _PASSWORD / ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD")
            }
            signingConfig hasUploadKey ? signingConfigs.release : signingConfigs.debug`,
    );
    if (!src.includes('hasUploadKey')) {
      throw new Error('with-android-release-signing: build.gradle layout changed; update the plugin.');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};

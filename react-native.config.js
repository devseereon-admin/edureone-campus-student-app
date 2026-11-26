// React Native Firebase is used on iOS only (FCM token for push). Android
// gets its FCM token from expo-notifications, so keep these modules out of
// the Android build: two Firebase messaging services would fight over pushes.
module.exports = {
  dependencies: {
    '@react-native-firebase/app': { platforms: { android: null } },
    '@react-native-firebase/messaging': { platforms: { android: null } },
  },
};

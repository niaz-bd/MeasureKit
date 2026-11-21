/**
 * Sideloaded APKs must not include Expo Dev Launcher — debug builds with
 * expo-dev-client always open the "connect to Metro" UI even when JS is
 * embedded. Expo Go workflow stays available via `npm run start:go`.
 *
 * expo-av is excluded because its native .so crashes on load (jsi ABI
 * mismatch) in this RN 0.88 / Expo 58 debug package; Sound meter already
 * degrades when ExponentAV is missing.
 */
module.exports = {
  dependencies: {
    'expo-dev-client': { platforms: { android: null, ios: null } },
    'expo-dev-launcher': { platforms: { android: null, ios: null } },
    'expo-dev-menu': { platforms: { android: null, ios: null } },
    'expo-dev-menu-interface': { platforms: { android: null, ios: null } },
    'expo-av': { platforms: { android: null, ios: null } },
  },
};

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Expo Go cannot load AdMob or Viro native modules.
 * `npm run start:go` sets EXPO_NO_ADMOB=1 so Metro stubs those packages.
 */
const stubNativeExtras =
  process.env.EXPO_NO_ADMOB === '1' || process.env.EXPO_GO === '1';

if (stubNativeExtras) {
  const admobStub = path.resolve(__dirname, 'src/admobStub.js');
  const viroStub = path.resolve(__dirname, 'src/ar/viroStub.js');
  const avStub = path.resolve(__dirname, 'src/av/expoAvStub.js');
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-google-mobile-ads') {
      return { filePath: admobStub, type: 'sourceFile' };
    }
    if (
      moduleName === '@reactvision/react-viro' ||
      moduleName.startsWith('@reactvision/react-viro/')
    ) {
      return { filePath: viroStub, type: 'sourceFile' };
    }
    // expo-av may be missing from some Expo Go runtimes (ExponentAV).
    if (moduleName === 'expo-av' || moduleName.startsWith('expo-av/')) {
      return { filePath: avStub, type: 'sourceFile' };
    }
    if (typeof upstream === 'function') {
      return upstream(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;

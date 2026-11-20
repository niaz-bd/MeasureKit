const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * When EXPO_NO_ADMOB=1 (used by `npm run start:go`), resolve the AdMob package
 * to a JS stub so Metro never evaluates getEnforcing('RNGoogleMobileAdsModule').
 * Dev-client / run:android builds omit this env and keep the real package.
 */
const stubAdMob =
  process.env.EXPO_NO_ADMOB === '1' || process.env.EXPO_GO === '1';

if (stubAdMob) {
  const stubPath = path.resolve(__dirname, 'src/admobStub.js');
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-google-mobile-ads') {
      return { filePath: stubPath, type: 'sourceFile' };
    }
    if (typeof upstream === 'function') {
      return upstream(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;

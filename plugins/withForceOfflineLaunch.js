const { withMainApplication } = require('expo/config-plugins');

/**
 * Sideloaded debug APKs still get ReactBuildConfig.DEBUG=true, so Expo/RN
 * enables BridgelessDevSupportManager and probes Metro. Force useDevSupport
 * off so the embedded assets/index.android.bundle always loads offline.
 */
function withForceOfflineLaunch(config) {
  return withMainApplication(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') return cfg;
    let contents = cfg.modResults.contents;
    if (contents.includes('useDevSupport = false')) return cfg;
    if (!contents.includes('ExpoReactHostFactory.getDefaultReactHost')) return cfg;

    // Insert named arg after packageList block (common Expo template).
    if (contents.includes('ReactViroPackage')) {
      contents = contents.replace(
        /(add\(ReactViroPackage\([^\)]*\)\)\s*\n\s*\}\s*\n)/,
        `$1      useDevSupport = false,\n`,
      );
    } else {
      contents = contents.replace(
        /(ExpoReactHostFactory\.getDefaultReactHost\(\s*\n\s*context\s*=\s*applicationContext,\s*\n\s*packageList\s*=\s*[\s\S]*?\n\s*\))/m,
        (match) => {
          if (match.includes('useDevSupport')) return match;
          return match.replace(/\)$/, ',\n      useDevSupport = false,\n    )');
        },
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withForceOfflineLaunch;

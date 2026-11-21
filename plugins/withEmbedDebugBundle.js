const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Debug APKs skip JS bundling by default, so a sideloaded build opens the
 * Expo Dev Client "connect to Metro" UI instead of MeasureKit. Empty
 * debuggableVariants forces createBundle*JsAndAssets for debug too.
 */
function withEmbedDebugBundle(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    if (contents.includes('debuggableVariants = []')) return cfg;
    if (!contents.includes('react {')) return cfg;
    contents = contents.replace(
      /react\s*\{/,
      `react {
    // Embed JS in debug so sideloaded APKs launch MeasureKit without Metro.
    debuggableVariants = []`,
    );
    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withEmbedDebugBundle;

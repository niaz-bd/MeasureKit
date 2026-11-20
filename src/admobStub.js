/**
 * Metro substitutes this for react-native-google-mobile-ads when EXPO_NO_ADMOB=1
 * (Expo Go). No TurboModule access.
 */
const noop = () => {};
const asyncNoop = async () => {};

function mobileAds() {
  return {
    setRequestConfiguration: asyncNoop,
    initialize: async () => [],
  };
}

class FakeFullScreenAd {
  loaded = false;
  load() {}
  show() {}
  addAdEventListener() {
    return { remove: noop };
  }
}

const BannerAd = () => null;

module.exports = {
  __esModule: true,
  default: mobileAds,
  mobileAds,
  InterstitialAd: {
    createForAdRequest: () => new FakeFullScreenAd(),
  },
  RewardedAd: {
    createForAdRequest: () => new FakeFullScreenAd(),
  },
  AppOpenAd: {
    createForAdRequest: () => new FakeFullScreenAd(),
  },
  AdEventType: {
    CLOSED: 'closed',
    LOADED: 'loaded',
    ERROR: 'error',
  },
  RewardedAdEventType: {
    LOADED: 'rewarded_loaded',
    EARNED_REWARD: 'rewarded_earned_reward',
  },
  BannerAd,
  BannerAdSize: {
    ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
    BANNER: 'BANNER',
  },
  TestIds: {
    BANNER: 'stub-banner',
    INTERSTITIAL: 'stub-interstitial',
    REWARDED: 'stub-rewarded',
    APP_OPEN: 'stub-app-open',
  },
};

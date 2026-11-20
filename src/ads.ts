import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const ADMOB_TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;

/** Google demo unit IDs (also available as TestIds after native link). */
export const ADMOB_TEST_UNIT_IDS = {
  banner: Platform.select({
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
    default: 'ca-app-pub-3940256099942544/6300978111',
  })!,
  interstitial: Platform.select({
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: 'ca-app-pub-3940256099942544/1033173712',
  })!,
} as const;

type AdsModule = typeof import('react-native-google-mobile-ads');

let adsModule: AdsModule | null = null;
let initPromise: Promise<boolean> | null = null;
let interstitial: ReturnType<
  AdsModule['InterstitialAd']['createForAdRequest']
> | null = null;

/** Expo Go cannot host AdMob or other custom native modules. */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function tryLoadAds(): AdsModule | null {
  if (isExpoGo()) return null;
  if (adsModule) return adsModule;
  try {
    // Native module is absent in Expo Go — never require() there.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adsModule = require('react-native-google-mobile-ads') as AdsModule;
    return adsModule;
  } catch {
    return null;
  }
}

export function adsAvailable(): boolean {
  return tryLoadAds() != null;
}

export async function initializeAds(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = tryLoadAds();
    if (!mod) return false;
    try {
      const mobileAds = mod.default;
      await mobileAds().setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR'],
      });
      await mobileAds().initialize();
      interstitial = mod.InterstitialAd.createForAdRequest(
        ADMOB_TEST_UNIT_IDS.interstitial,
      );
      interstitial.load();
      return true;
    } catch {
      return false;
    }
  })();
  return initPromise;
}

/**
 * Show interstitial only after leaving settings/calibration — never mid-drag.
 * Fire-and-forget; failures are silent.
 */
export function showInterstitialAfterChrome(): void {
  const mod = tryLoadAds();
  if (!mod || !interstitial) return;
  try {
    if (interstitial.loaded) {
      interstitial.show();
      interstitial.addAdEventListener(mod.AdEventType.CLOSED, () => {
        interstitial?.load();
      });
    } else {
      interstitial.load();
    }
  } catch {
    // ignore
  }
}

export function getBannerUnitId(): string {
  const mod = tryLoadAds();
  if (mod?.TestIds?.BANNER) return mod.TestIds.BANNER;
  return ADMOB_TEST_UNIT_IDS.banner;
}

export function getAdsModule(): AdsModule | null {
  return tryLoadAds();
}

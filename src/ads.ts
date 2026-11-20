import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';

export const ADMOB_TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;

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

const NATIVE_NAME = 'RNGoogleMobileAdsModule';

/** Minimal surface we use — keeps AdMob package types out of this file. */
type AdsModule = {
  default: () => {
    setRequestConfiguration: (config: {
      testDeviceIdentifiers?: string[];
    }) => Promise<void>;
    initialize: () => Promise<unknown>;
  };
  InterstitialAd: {
    createForAdRequest: (unitId: string) => InterstitialLike;
  };
  AdEventType: { CLOSED: string };
  BannerAd: ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
  }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
  TestIds?: { BANNER: string };
};

type InterstitialLike = {
  loaded: boolean;
  load: () => void;
  show: () => void;
  addAdEventListener: (event: string, cb: () => void) => { remove?: () => void } | void;
};

let adsModule: AdsModule | null = null;
let loadAttempted = false;
let initPromise: Promise<boolean> | null = null;
let interstitial: InterstitialLike | null = null;

/** Expo Go / store client — never load AdMob JS. */
export function isExpoGo(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo'
  );
}

/**
 * Safe probe: TurboModuleRegistry.get (not getEnforcing) returns null when missing.
 * Never require the AdMob JS package unless this is true.
 */
export function hasAdMobNativeModule(): boolean {
  if (isExpoGo()) return false;
  try {
    return TurboModuleRegistry.get(NATIVE_NAME) != null;
  } catch {
    return false;
  }
}

function tryLoadAds(): AdsModule | null {
  if (adsModule) return adsModule;
  if (loadAttempted) return null;
  if (!hasAdMobNativeModule()) {
    loadAttempted = true;
    return null;
  }
  loadAttempted = true;
  try {
    // Separate module so Metro only evaluates AdMob JS after this call.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adsModule = require('./admobNative') as AdsModule;
    return adsModule;
  } catch {
    adsModule = null;
    return null;
  }
}

export function adsAvailable(): boolean {
  return hasAdMobNativeModule();
}

export async function initializeAds(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!hasAdMobNativeModule()) return false;
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

/** No-op when AdMob is unavailable (Expo Go / missing native). Never mid-drag. */
export function showInterstitialAfterChrome(): void {
  if (!hasAdMobNativeModule()) return;
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
  if (!hasAdMobNativeModule()) return ADMOB_TEST_UNIT_IDS.banner;
  const mod = tryLoadAds();
  if (mod?.TestIds?.BANNER) return mod.TestIds.BANNER;
  return ADMOB_TEST_UNIT_IDS.banner;
}

export function getAdsModule(): AdsModule | null {
  if (!hasAdMobNativeModule()) return null;
  return tryLoadAds();
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';
import { AppState, Platform, TurboModuleRegistry } from 'react-native';

/**
 * Google sample / test App IDs (also set in app.json plugin).
 * Production: replace plugin androidAppId / iosAppId before store release.
 */
export const ADMOB_TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;

/**
 * Official Google test unit IDs (safe for debug builds).
 * @see https://developers.google.com/admob/android/test-ads
 */
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
  rewarded: Platform.select({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
    default: 'ca-app-pub-3940256099942544/5224354917',
  })!,
  appOpen: Platform.select({
    android: 'ca-app-pub-3940256099942544/9257395921',
    ios: 'ca-app-pub-3940256099942544/5575463023',
    default: 'ca-app-pub-3940256099942544/9257395921',
  })!,
} as const;

/**
 * Production placeholders — swap these (and app.json App IDs) before release.
 * Keep `USE_ADMOB_TEST_IDS = true` until real units are pasted here.
 */
export const ADMOB_PRODUCTION_UNIT_IDS = {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB',
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
  rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR',
  appOpen: 'ca-app-pub-XXXXXXXXXXXXXXXX/OOOOOOOOOO',
} as const;

/** Flip to false only after production unit IDs above are real. */
export const USE_ADMOB_TEST_IDS = true;

export const ADMOB_UNIT_IDS = USE_ADMOB_TEST_IDS
  ? ADMOB_TEST_UNIT_IDS
  : ADMOB_PRODUCTION_UNIT_IDS;

/** Measure tools that may show an interstitial when returning to Home. */
export const MEASURE_TOOL_ROUTES = new Set([
  'Measure',
  'ArMeasure',
  'Level',
  'Inclinometer',
  'Compass',
  'AngleMeter',
  'LandArea',
  'Speedometer',
  'LightMeter',
  'SoundMeter',
]);

const STORAGE = {
  adsFreeUntil: '@visual_ruler/ads_free_until',
  firstSessionDone: '@visual_ruler/ads_first_session_done',
  lastInterstitialAt: '@visual_ruler/ads_last_interstitial_at',
} as const;

/** Midpoint of the 90–120s gap between interstitials. */
const INTERSTITIAL_COOLDOWN_MS = 105_000;
const ADS_FREE_MS = 24 * 60 * 60 * 1000;

const NATIVE_NAME = 'RNGoogleMobileAdsModule';

type AdsModule = {
  default: () => {
    setRequestConfiguration: (config: {
      testDeviceIdentifiers?: string[];
    }) => Promise<void>;
    initialize: () => Promise<unknown>;
  };
  InterstitialAd: {
    createForAdRequest: (unitId: string) => FullScreenAdLike;
  };
  RewardedAd: {
    createForAdRequest: (unitId: string) => FullScreenAdLike;
  };
  AppOpenAd: {
    createForAdRequest: (unitId: string) => FullScreenAdLike;
  };
  AdEventType: { CLOSED: string; LOADED: string; ERROR: string };
  RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
  BannerAd: ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
  }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
  TestIds?: {
    BANNER?: string;
    INTERSTITIAL?: string;
    REWARDED?: string;
    APP_OPEN?: string;
  };
};

type FullScreenAdLike = {
  loaded: boolean;
  load: () => void;
  show: () => Promise<void> | void;
  addAdEventListener: (
    event: string,
    cb: (payload?: unknown) => void,
  ) => (() => void) | { remove?: () => void } | void;
};

let adsModule: AdsModule | null = null;
let loadAttempted = false;
let initPromise: Promise<boolean> | null = null;
let interstitial: FullScreenAdLike | null = null;
let rewarded: FullScreenAdLike | null = null;
let appOpen: FullScreenAdLike | null = null;
let appOpenShownThisColdStart = false;
let sessionCompletionWired = false;

type AdsFreeListener = (until: number | null) => void;
const adsFreeListeners = new Set<AdsFreeListener>();
let adsFreeUntilCache: number | null | undefined;

function notifyAdsFree(until: number | null) {
  adsFreeUntilCache = until;
  adsFreeListeners.forEach((fn) => fn(until));
}

export function subscribeAdsFree(listener: AdsFreeListener): () => void {
  adsFreeListeners.add(listener);
  if (adsFreeUntilCache !== undefined) listener(adsFreeUntilCache);
  return () => {
    adsFreeListeners.delete(listener);
  };
}

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

export async function loadAdsFreeUntil(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE.adsFreeUntil);
    if (!raw) {
      notifyAdsFree(null);
      return null;
    }
    const until = Number(raw);
    if (!Number.isFinite(until) || until <= Date.now()) {
      await AsyncStorage.removeItem(STORAGE.adsFreeUntil);
      notifyAdsFree(null);
      return null;
    }
    notifyAdsFree(until);
    return until;
  } catch {
    notifyAdsFree(null);
    return null;
  }
}

export async function areAdsRemoved(): Promise<boolean> {
  const until = await loadAdsFreeUntil();
  return until != null && until > Date.now();
}

export async function grantAdsFree24h(): Promise<number> {
  const until = Date.now() + ADS_FREE_MS;
  await AsyncStorage.setItem(STORAGE.adsFreeUntil, String(until));
  notifyAdsFree(until);
  return until;
}

async function hasCompletedFirstSession(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE.firstSessionDone)) === '1';
  } catch {
    return false;
  }
}

export async function markFirstSessionComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE.firstSessionDone, '1');
  } catch {
    // ignore
  }
}

function wireSessionCompletion(): void {
  if (sessionCompletionWired) return;
  sessionCompletionWired = true;
  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'background' || next === 'inactive') {
      markFirstSessionComplete().catch(() => undefined);
    }
  });
  // Keep subscription for app lifetime (no remove).
  void sub;
}

async function lastInterstitialAt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE.lastInterstitialAt);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function setLastInterstitialAt(ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE.lastInterstitialAt, String(ts));
  } catch {
    // ignore
  }
}

function unitId(
  kind: 'banner' | 'interstitial' | 'rewarded' | 'appOpen',
): string {
  const mod = tryLoadAds();
  if (USE_ADMOB_TEST_IDS && mod?.TestIds) {
    if (kind === 'banner' && mod.TestIds.BANNER) return mod.TestIds.BANNER;
    if (kind === 'interstitial' && mod.TestIds.INTERSTITIAL) {
      return mod.TestIds.INTERSTITIAL;
    }
    if (kind === 'rewarded' && mod.TestIds.REWARDED) return mod.TestIds.REWARDED;
    if (kind === 'appOpen' && mod.TestIds.APP_OPEN) return mod.TestIds.APP_OPEN;
  }
  return ADMOB_UNIT_IDS[kind];
}

function preloadInterstitial(mod: AdsModule) {
  interstitial = mod.InterstitialAd.createForAdRequest(unitId('interstitial'));
  interstitial.load();
}

function preloadRewarded(mod: AdsModule) {
  rewarded = mod.RewardedAd.createForAdRequest(unitId('rewarded'));
  rewarded.load();
}

function preloadAppOpen(mod: AdsModule) {
  appOpen = mod.AppOpenAd.createForAdRequest(unitId('appOpen'));
  appOpen.load();
}

export async function initializeAds(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await loadAdsFreeUntil();
    wireSessionCompletion();
    if (!hasAdMobNativeModule()) return false;
    const mod = tryLoadAds();
    if (!mod) return false;
    try {
      const mobileAds = mod.default;
      await mobileAds().setRequestConfiguration({
        testDeviceIdentifiers: ['EMULATOR'],
      });
      await mobileAds().initialize();
      preloadInterstitial(mod);
      preloadRewarded(mod);
      preloadAppOpen(mod);
      return true;
    } catch {
      return false;
    }
  })();
  return initPromise;
}

/**
 * Cold-start app-open: only after the user has completed at least one prior
 * session. Skipped while ads-free or when native ads are unavailable.
 */
export async function maybeShowAppOpenOnColdStart(): Promise<void> {
  if (appOpenShownThisColdStart) return;
  appOpenShownThisColdStart = true;
  if (!hasAdMobNativeModule()) return;
  if (!(await hasCompletedFirstSession())) return;
  if (await areAdsRemoved()) return;
  await initializeAds();
  const mod = tryLoadAds();
  if (!mod || !appOpen) return;
  try {
    const showWhenReady = () => {
      if (!appOpen?.loaded) return;
      appOpen.show();
    };
    if (appOpen.loaded) {
      showWhenReady();
    } else {
      appOpen.addAdEventListener(mod.AdEventType.LOADED, showWhenReady);
      appOpen.load();
    }
    appOpen.addAdEventListener(mod.AdEventType.CLOSED, () => {
      preloadAppOpen(mod);
    });
  } catch {
    // ignore
  }
}

/**
 * Interstitial when leaving a measure tool → Home.
 * Enforces 90–120s cooldown; never called mid-measure (nav transition only).
 */
export function showInterstitialOnToolExit(): void {
  if (!hasAdMobNativeModule()) return;
  void (async () => {
    try {
      if (await areAdsRemoved()) return;
      const last = await lastInterstitialAt();
      if (Date.now() - last < INTERSTITIAL_COOLDOWN_MS) return;
      await initializeAds();
      const mod = tryLoadAds();
      if (!mod || !interstitial) return;
      if (interstitial.loaded) {
        await setLastInterstitialAt(Date.now());
        interstitial.show();
        interstitial.addAdEventListener(mod.AdEventType.CLOSED, () => {
          preloadInterstitial(mod);
        });
      } else {
        interstitial.load();
      }
    } catch {
      // ignore
    }
  })();
}

/** @deprecated Use showInterstitialOnToolExit from navigation instead. */
export function showInterstitialAfterChrome(): void {
  // No-op: chrome screens no longer trigger interstitials.
}

export type RewardedRemoveAdsResult =
  | 'granted'
  | 'dismissed'
  | 'unavailable'
  | 'failed';

/**
 * Optional rewarded video → 24h ads-free. Safe no-op in Expo Go.
 */
export async function showRewardedRemoveAds(): Promise<RewardedRemoveAdsResult> {
  if (!hasAdMobNativeModule()) return 'unavailable';
  if (await areAdsRemoved()) return 'granted';
  await initializeAds();
  const mod = tryLoadAds();
  if (!mod || !rewarded) return 'unavailable';

  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    const finish = (result: RewardedRemoveAdsResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
      preloadRewarded(mod);
    };

    try {
      rewarded!.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
        grantAdsFree24h()
          .then(() => finish('granted'))
          .catch(() => finish('failed'));
      });
      rewarded!.addAdEventListener(mod.AdEventType.CLOSED, () => {
        if (!earned) finish('dismissed');
      });
      rewarded!.addAdEventListener(mod.AdEventType.ERROR, () => {
        finish('failed');
      });

      const tryShow = () => {
        try {
          rewarded!.show();
        } catch {
          finish('failed');
        }
      };

      if (rewarded!.loaded) {
        tryShow();
      } else {
        rewarded!.addAdEventListener(mod.RewardedAdEventType.LOADED, tryShow);
        rewarded!.load();
        // If load never completes, don't hang forever.
        setTimeout(() => {
          if (!settled && !rewarded!.loaded) finish('failed');
        }, 12_000);
      }
    } catch {
      finish('failed');
    }
  });
}

export function getBannerUnitId(): string {
  return unitId('banner');
}

export function getAdsModule(): AdsModule | null {
  if (!hasAdMobNativeModule()) return null;
  return tryLoadAds();
}

export function formatAdsFreeRemaining(until: number | null): string | null {
  if (until == null || until <= Date.now()) return null;
  const ms = until - Date.now();
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours >= 24) return 'Ads off for ~24h';
  if (hours <= 1) return 'Ads off for under 1h';
  return `Ads off for ~${hours}h`;
}

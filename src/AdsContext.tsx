import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  formatAdsFreeRemaining,
  initializeAds,
  loadAdsFreeUntil,
  markFirstSessionComplete,
  maybeShowAppOpenOnColdStart,
  showRewardedRemoveAds,
  subscribeAdsFree,
  type RewardedRemoveAdsResult,
} from './ads';

type AdsContextValue = {
  adsFreeUntil: number | null;
  adsFreeActive: boolean;
  adsFreeLabel: string | null;
  requestRemoveAds: () => Promise<RewardedRemoveAdsResult>;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [adsFreeUntil, setAdsFreeUntil] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await initializeAds();
      const until = await loadAdsFreeUntil();
      if (alive) setAdsFreeUntil(until);
      await maybeShowAppOpenOnColdStart();
      // First Home paint counts toward completing the install session if the
      // process is later killed without a background event.
      setTimeout(() => {
        markFirstSessionComplete().catch(() => undefined);
      }, 8_000);
    })().catch(() => undefined);

    const unsub = subscribeAdsFree((until) => {
      if (alive) setAdsFreeUntil(until);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const requestRemoveAds = useCallback(async () => {
    return showRewardedRemoveAds();
  }, []);

  const adsFreeActive = adsFreeUntil != null && adsFreeUntil > Date.now();
  const adsFreeLabel = formatAdsFreeRemaining(adsFreeUntil);

  const value = useMemo(
    () => ({
      adsFreeUntil,
      adsFreeActive,
      adsFreeLabel,
      requestRemoveAds,
    }),
    [adsFreeUntil, adsFreeActive, adsFreeLabel, requestRemoveAds],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    throw new Error('useAds must be used within AdsProvider');
  }
  return ctx;
}

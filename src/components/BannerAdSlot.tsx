import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAds } from '../AdsContext';
import {
  adsAvailable,
  getAdsModule,
  getBannerUnitId,
  hasAdMobNativeModule,
  initializeAds,
  isExpoGo,
} from '../ads';
import { colors } from '../theme';

/**
 * Sticky banner for hub chrome only (Home, History, Settings, Calculator,
 * Converter). Hidden while ads-free. Never used on measure / AR screens.
 */
export function BannerAdSlot() {
  const { adsFreeActive } = useAds();
  const [ready, setReady] = useState(false);
  const canUseAds = hasAdMobNativeModule();

  useEffect(() => {
    if (!canUseAds || adsFreeActive) return;
    let alive = true;
    (async () => {
      const ok = await initializeAds();
      if (alive) setReady(ok && adsAvailable());
    })();
    return () => {
      alive = false;
    };
  }, [canUseAds, adsFreeActive]);

  if (adsFreeActive) {
    return null;
  }

  if (!canUseAds || !ready) {
    return (
      <View style={styles.placeholder} accessibilityLabel="Ad placeholder">
        <Text style={styles.placeholderText}>
          {isExpoGo()
            ? 'Ads need a native build — use: npx expo run:android'
            : 'AdMob unavailable (native module missing)'}
        </Text>
      </View>
    );
  }

  const mod = getAdsModule();
  if (!mod) {
    return (
      <View style={styles.placeholder} accessibilityLabel="Ad placeholder">
        <Text style={styles.placeholderText}>AdMob unavailable</Text>
      </View>
    );
  }

  const { BannerAd, BannerAdSize } = mod;
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={getBannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: colors.graphiteSoft,
    width: '100%',
  },
  placeholder: {
    minHeight: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.graphiteMid,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.graphiteEdge,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});

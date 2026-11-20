import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
 * Banner for non-measure chrome only.
 * Never mounts BannerAd unless the native TurboModule is present.
 */
export function BannerAdSlot() {
  const [ready, setReady] = useState(false);
  const canUseAds = hasAdMobNativeModule();

  useEffect(() => {
    if (!canUseAds) return;
    let alive = true;
    (async () => {
      const ok = await initializeAds();
      if (alive) setReady(ok && adsAvailable());
    })();
    return () => {
      alive = false;
    };
  }, [canUseAds]);

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

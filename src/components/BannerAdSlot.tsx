import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  adsAvailable,
  getAdsModule,
  getBannerUnitId,
  initializeAds,
  isExpoGo,
} from '../ads';
import { colors } from '../theme';

/**
 * Banner for non-measure chrome only (settings / calibration / about).
 * Renders a quiet placeholder when the native AdMob module is unavailable
 * (e.g. Expo Go).
 */
export function BannerAdSlot() {
  const [ready, setReady] = useState(false);
  const available = adsAvailable();

  useEffect(() => {
    if (isExpoGo()) return;
    let alive = true;
    (async () => {
      const ok = await initializeAds();
      if (alive) setReady(ok);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!available || !ready) {
    return (
      <View style={styles.placeholder} accessibilityLabel="Ad placeholder">
        <Text style={styles.placeholderText}>
          {isExpoGo()
            ? 'Ads need a native build (expo run:android)'
            : 'AdMob test banner (loading…)'}
        </Text>
      </View>
    );
  }

  const mod = getAdsModule();
  if (!mod) return null;

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
  },
});

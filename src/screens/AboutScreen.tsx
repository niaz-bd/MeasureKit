import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showInterstitialAfterChrome } from '../ads';
import { BannerAdSlot } from '../components/BannerAdSlot';
import { colors, spacing } from '../theme';

export function AboutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const back = () => {
    showInterstitialAfterChrome();
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>MeasureKit</Text>
      <Text style={styles.body}>
        MeasureKit is a toolkit for Android: on-screen ruler, sensors, map
        area, converters, and more. Ruler lengths use your display density and
        an optional credit-card calibration (ISO ID-1 long edge, 85.6 mm).
      </Text>
      <Text style={styles.body}>
        Ads use Google AdMob test unit IDs in this build. Swap to production IDs
        before store release. Interstitials only appear after leaving settings or
        calibration — never while dragging the measure handle.
      </Text>
      <Text style={styles.meta}>Version 1.0.0 · Android focus</Text>

      <Pressable style={styles.back} onPress={back}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.ad}>
        <BannerAdSlot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  meta: {
    color: colors.teal,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.graphiteSoft,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  backText: {
    color: colors.text,
    fontWeight: '600',
  },
  ad: {
    marginTop: 'auto',
  },
});

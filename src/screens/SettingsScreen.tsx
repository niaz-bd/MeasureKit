import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdSlot } from '../components/BannerAdSlot';
import { RemoveAdsButton } from '../components/RemoveAdsButton';
import type { RootStackParamList } from '../types';
import { colors, spacing } from '../theme';

function Row({
  label,
  onPress,
  detail,
}: {
  label: string;
  onPress: () => void;
  detail?: string;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

/**
 * App-level settings only (ads / about).
 * Units and calibration live on each tool screen.
 */
export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable
          onPress={() => navigation.navigate('Home')}
          style={styles.done}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Ads</Text>
      <View style={styles.removeAds}>
        <RemoveAdsButton />
      </View>
      <Text style={styles.hint}>
        Length, area, and speed units are set inside each tool — not here.
      </Text>

      <Text style={styles.section}>About</Text>
      <Row
        label="About MeasureKit"
        onPress={() => navigation.navigate('About')}
      />

      <View style={[styles.ad, { paddingBottom: Math.max(insets.bottom, 0) }]}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
  },
  done: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.tealSoft,
  },
  doneText: {
    color: colors.teal,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.graphiteEdge,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  rowDetail: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
  },
  removeAds: {
    alignSelf: 'stretch',
  },
  ad: {
    marginTop: 'auto',
    marginHorizontal: -spacing.lg,
  },
});

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showInterstitialAfterChrome } from '../ads';
import { BannerAdSlot } from '../components/BannerAdSlot';
import type { RootStackParamList } from '../types';
import { useSettings } from '../SettingsContext';
import { colors, spacing } from '../theme';
import { UNIT_OPTIONS, UnitSystem, unitDisplayName } from '../units';

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

export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { unit, setUnit, calibration, resetCalibration } = useSettings();

  const pickUnit = async (next: UnitSystem) => {
    await setUnit(next);
  };

  const leave = () => {
    showInterstitialAfterChrome();
    navigation.navigate('Home');
  };

  const calibratedLabel = calibration.calibratedAt
    ? new Date(calibration.calibratedAt).toLocaleString()
    : 'Using screen density (not calibrated)';

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable onPress={leave} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Units</Text>
      <View style={styles.segment}>
        {UNIT_OPTIONS.map((u) => (
          <Pressable
            key={u}
            onPress={() => pickUnit(u)}
            style={[styles.segBtn, unit === u && styles.segBtnOn]}
          >
            <Text style={[styles.segText, unit === u && styles.segTextOn]}>
              {unitDisplayName(u)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Scale</Text>
      <Row
        label="Calibrate with credit card"
        detail={calibratedLabel}
        onPress={() => navigation.navigate('Calibration')}
      />
      <Row
        label="Reset to density default"
        onPress={() => {
          resetCalibration().catch(() => undefined);
        }}
      />

      <Text style={styles.section}>About</Text>
      <Row label="About Visual Ruler" onPress={() => navigation.navigate('About')} />

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
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.graphiteSoft,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flexGrow: 1,
    flexBasis: '47%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  segBtnOn: {
    backgroundColor: colors.teal,
  },
  segText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  segTextOn: {
    color: colors.graphite,
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
  ad: {
    marginTop: 'auto',
  },
});

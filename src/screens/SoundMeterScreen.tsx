import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hasExponentAv } from '../av/avAvailability';
import { loadExpoAvAudio } from '../av/loadExpoAv';
import { useLogMeasurementOnLeave } from '../history/useLogMeasurementOnLeave';
import {
  dbToBar,
  formatDb,
  soundSceneLabel,
} from '../sensors/sound';
import { useSmoothedDb } from '../sensors/useSmoothedDb';
import { colors, spacing } from '../theme';

export function SoundMeterScreen() {
  const navigation = useNavigation();
  const [active, setActive] = useState(() => hasExponentAv());
  const {
    ready,
    permissionDenied,
    nativeMissing,
    db,
    peakDb,
    error,
    resetPeak,
  } = useSmoothedDb(active);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      setActive(hasExponentAv());
      return () => {
        setActive(false);
      };
    }, []),
  );

  useLogMeasurementOnLeave('soundMeter', 'Sound meter', () => {
    if (nativeMissing || !(db > 0)) return null;
    return {
      summary: `${formatDb(db)} dB`,
      values: {
        db: Number(db.toFixed(1)),
        peakDb: Number(peakDb.toFixed(1)),
        scene: soundSceneLabel(db),
      },
    };
  });

  const requestMicAgain = async () => {
    const Audio = loadExpoAvAudio();
    if (!Audio) return;
    const perm = await Audio.requestPermissionsAsync();
    if (perm.granted) {
      setActive(false);
      setTimeout(() => setActive(true), 50);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to menu"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Sound meter</Text>
        <Pressable
          style={styles.iconBtn}
          onPress={resetPeak}
          accessibilityLabel="Reset peak"
        >
          <MaterialCommunityIcons name="reload" size={22} color={colors.text} />
        </Pressable>
      </View>

      {nativeMissing || !hasExponentAv() ? (
        <View style={styles.centered}>
          <Text style={styles.body}>
            Sound meter needs the expo-av native module (ExponentAV). It is not
            available in this runtime (for example some Expo Go builds).
          </Text>
          <Text style={styles.code}>npx expo run:android</Text>
          <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Back to menu</Text>
          </Pressable>
        </View>
      ) : permissionDenied ? (
        <View style={styles.centered}>
          <Text style={styles.body}>Microphone access is required.</Text>
          <Pressable style={styles.btn} onPress={requestMicAgain}>
            <Text style={styles.btnText}>Allow microphone</Text>
          </Pressable>
        </View>
      ) : ready === null ? (
        <View style={styles.centered}>
          <Text style={styles.body}>Starting microphone…</Text>
        </View>
      ) : (
        <View style={styles.stage}>
          <Text style={styles.heroDb}>{formatDb(db)}</Text>
          <Text style={styles.heroUnit}>dB</Text>
          <Text style={styles.scene}>{soundSceneLabel(db)}</Text>

          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.round(dbToBar(db) * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barLabel}>0</Text>
            <Text style={styles.barLabel}>40</Text>
            <Text style={styles.barLabel}>70</Text>
            <Text style={styles.barLabel}>100</Text>
          </View>

          <View style={styles.peakRow}>
            <Text style={styles.peakLabel}>Peak</Text>
            <Text style={styles.peakValue}>{formatDb(peakDb)} dB</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.hint}>
            Relative level from the device mic (not a calibrated SPL meter).
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.graphiteSoft,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  body: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  code: {
    color: colors.teal,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  heroDb: {
    color: colors.white,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroUnit: {
    color: colors.teal,
    fontSize: 20,
    fontWeight: '600',
    marginTop: -4,
  },
  scene: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  barTrack: {
    width: '100%',
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.graphiteSoft,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.teal,
    borderRadius: 8,
  },
  barLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  peakRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.graphiteSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  peakLabel: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  peakValue: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 18,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hint: {
    marginTop: spacing.xl,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: colors.graphite,
    fontWeight: '700',
  },
});

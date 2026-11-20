import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useLogMeasurementOnLeave } from '../history/useLogMeasurementOnLeave';
import { gradeFromDeg } from '../sensors/tilt';
import { useSmoothedTilt } from '../sensors/useSmoothedTilt';
import { colors, spacing } from '../theme';

const ZERO_KEY = '@visual_ruler/incline_zero';
/** Gauge spans −90° … +90° (signed primary axis). */
const GAUGE_MAX_DEG = 90;

type AxisMode = 'incline' | 'roll' | 'pitch';

export function InclinometerScreen() {
  const navigation = useNavigation();
  const {
    available,
    rollDeg,
    pitchDeg,
    inclineDeg,
    smoothRoll,
    smoothPitch,
    smoothIncline,
    setZeroFromLatest,
    resetZero,
  } = useSmoothedTilt(ZERO_KEY);

  const [axis, setAxis] = useState<AxisMode>('incline');
  const [gaugeW, setGaugeW] = useState(280);
  const axisMode = useSharedValue(0); // 0 incline, 1 roll, 2 pitch

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => undefined;
    }, []),
  );

  const displayDeg =
    axis === 'incline' ? inclineDeg : axis === 'roll' ? rollDeg : pitchDeg;

  useLogMeasurementOnLeave('inclinometer', 'Inclinometer', () => ({
    summary: `${axis} ${displayDeg.toFixed(1)}°`,
    values: {
      axis,
      deg: Number(displayDeg.toFixed(2)),
      grade: gradeFromDeg(Math.abs(displayDeg)),
    },
  }));

  const needleStyle = useAnimatedStyle(() => {
    const raw =
      axisMode.value < 0.5
        ? smoothIncline.value
        : axisMode.value < 1.5
          ? smoothRoll.value
          : smoothPitch.value;
    // Incline is 0–90 absolute; map to needle over ±90 for signed axes.
    const clamped = Math.min(GAUGE_MAX_DEG, Math.max(-GAUGE_MAX_DEG, raw));
    return {
      transform: [{ rotate: `${clamped}deg` }],
    };
  });

  if (available === null) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.body}>Starting sensors…</Text>
      </View>
    );
  }

  if (available === false) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.title}>Inclinometer</Text>
        <Text style={styles.body}>
          Accelerometer is not available on this device.
        </Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const setAxisMode = (mode: AxisMode) => {
    setAxis(mode);
    axisMode.value = mode === 'incline' ? 0 : mode === 'roll' ? 1 : 2;
  };

  const radius = gaugeW * 0.42;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to ruler"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Inclinometer</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View style={styles.axisRow}>
        {(
          [
            ['incline', 'Surface'],
            ['roll', 'Roll'],
            ['pitch', 'Pitch'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setAxisMode(id)}
            style={[styles.axisChip, axis === id && styles.axisChipOn]}
          >
            <Text style={[styles.axisChipText, axis === id && styles.axisChipTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={styles.stage}
        onLayout={(e: LayoutChangeEvent) => {
          const { width, height } = e.nativeEvent.layout;
          setGaugeW(Math.min(width * 0.9, height * 0.85, 360));
        }}
      >
        <View style={[styles.gauge, { width: gaugeW, height: gaugeW }]}>
          {/* Arc ticks */}
          {[-90, -60, -45, -30, -15, 0, 15, 30, 45, 60, 90].map((tick) => (
            <View
              key={tick}
              style={[
                styles.tickWrap,
                {
                  width: gaugeW,
                  height: gaugeW,
                  transform: [{ rotate: `${tick}deg` }],
                },
              ]}
            >
              <View
                style={[
                  styles.tick,
                  Math.abs(tick) === 0 || Math.abs(tick) === 90
                    ? styles.tickMajor
                    : Math.abs(tick) === 45
                      ? styles.tickMid
                      : styles.tickMinor,
                  { top: gaugeW * 0.06 },
                ]}
              />
              {(tick === 0 || Math.abs(tick) === 45 || Math.abs(tick) === 90) && (
                <Text
                  style={[
                    styles.tickLabel,
                    {
                      top: gaugeW * 0.12,
                      transform: [{ rotate: `${-tick}deg` }],
                    },
                  ]}
                >
                  {tick}°
                </Text>
              )}
            </View>
          ))}

          <View style={[styles.hub, { width: radius * 0.22, height: radius * 0.22 }]} />

          <Animated.View
            style={[
              styles.needlePivot,
              { width: gaugeW, height: gaugeW },
              needleStyle,
            ]}
          >
            <View
              style={[
                styles.needle,
                {
                  height: radius * 0.88,
                  marginTop: gaugeW * 0.08,
                },
              ]}
            />
          </Animated.View>
        </View>
      </View>

      <Text style={[styles.heroDeg, Math.abs(displayDeg) < 0.4 && styles.heroLevel]}>
        {displayDeg.toFixed(1)}°
      </Text>
      <Text style={styles.grade}>
        Grade {gradeFromDeg(Math.abs(displayDeg))} · slope{' '}
        {Math.tan((Math.abs(displayDeg) * Math.PI) / 180).toFixed(3)}
      </Text>

      <View style={styles.readouts}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Surface</Text>
          <Text style={styles.metricValue}>{inclineDeg.toFixed(1)}°</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Roll</Text>
          <Text style={styles.metricValue}>{rollDeg.toFixed(1)}°</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Pitch</Text>
          <Text style={styles.metricValue}>{pitchDeg.toFixed(1)}°</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={setZeroFromLatest}>
          <Text style={styles.btnText}>Zero here</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={resetZero}>
          <Text style={styles.btnSecondaryText}>Reset zero</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        Lay the phone on a slope for Surface angle, or switch to Roll / Pitch.
      </Text>
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.graphiteSoft,
  },
  iconBtnPlaceholder: { width: 44, height: 44 },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  axisChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.graphiteSoft,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  axisChipOn: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  axisChipText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  axisChipTextOn: {
    color: colors.teal,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  gauge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.graphiteEdge,
    backgroundColor: 'rgba(42, 48, 56, 0.85)',
  },
  tickWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  tick: {
    width: 2,
    borderRadius: 1,
  },
  tickMajor: {
    height: 16,
    backgroundColor: colors.tickMajor,
  },
  tickMid: {
    height: 12,
    backgroundColor: colors.tealDim,
  },
  tickMinor: {
    height: 8,
    backgroundColor: colors.tickMinor,
  },
  tickLabel: {
    position: 'absolute',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  hub: {
    borderRadius: 999,
    backgroundColor: colors.graphiteMid,
    borderWidth: 2,
    borderColor: colors.teal,
    zIndex: 2,
  },
  needlePivot: {
    position: 'absolute',
    alignItems: 'center',
  },
  needle: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.teal,
  },
  heroDeg: {
    color: colors.white,
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroLevel: {
    color: colors.teal,
  },
  grade: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    marginTop: 4,
    fontSize: 14,
  },
  readouts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.graphiteSoft,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
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
    fontSize: 15,
  },
  btnSecondary: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  btnSecondaryText: {
    color: colors.text,
    fontWeight: '600',
  },
  hint: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});

import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { colors, spacing } from '../theme';

const ZERO_KEY = '@visual_ruler/level_zero';
const LEVEL_TOLERANCE_DEG = 0.4;
const MAX_BUBBLE_TILT_DEG = 12;
/** Sensor poll interval — ~60 Hz. */
const SAMPLE_MS = 16;
/** EMA blend toward raw tilt each sample (0–1). Lower = smoother. */
const SENSOR_EMA = 0.18;
/** UI lerp factor per frame toward filtered tilt. */
const UI_LERP = 0.22;
/** How often to push °/% text to React (~12 Hz). */
const READOUT_MS = 80;

type ZeroOffset = { x: number; y: number };

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function tiltsFromAccel(
  { x, y, z }: AccelerometerMeasurement,
  zero: ZeroOffset,
): { rollDeg: number; pitchDeg: number } {
  const ax = x - zero.x;
  const ay = y - zero.y;
  const az = z;
  return {
    rollDeg: radToDeg(Math.atan2(ax, Math.hypot(ay, az))),
    pitchDeg: radToDeg(Math.atan2(ay, Math.hypot(ax, az))),
  };
}

function pctFromDeg(deg: number): string {
  return `${(Math.sin((deg * Math.PI) / 180) * 100).toFixed(1)}%`;
}

export function LevelScreen() {
  const navigation = useNavigation();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [rollDeg, setRollDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);
  const [isLevel, setIsLevel] = useState(false);
  const [zero, setZero] = useState<ZeroOffset>({ x: 0, y: 0 });
  const [vialSize, setVialSize] = useState(220);
  const latest = useRef<AccelerometerMeasurement | null>(null);
  const zeroRef = useRef(zero);
  zeroRef.current = zero;

  const filteredRoll = useRef(0);
  const filteredPitch = useRef(0);
  const filterReady = useRef(false);
  const lastReadoutAt = useRef(0);

  const targetRoll = useSharedValue(0);
  const targetPitch = useSharedValue(0);
  const smoothRoll = useSharedValue(0);
  const smoothPitch = useSharedValue(0);
  const travelSV = useSharedValue(vialSize * 0.38);
  const levelSV = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => undefined;
    }, []),
  );

  useEffect(() => {
    travelSV.value = vialSize * 0.38;
  }, [vialSize, travelSV]);

  useFrameCallback(() => {
    const a = UI_LERP;
    smoothRoll.value += (targetRoll.value - smoothRoll.value) * a;
    smoothPitch.value += (targetPitch.value - smoothPitch.value) * a;
    const mag = Math.hypot(smoothRoll.value, smoothPitch.value);
    levelSV.value = mag <= LEVEL_TOLERANCE_DEG ? 1 : 0;
  });

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const ok = await Accelerometer.isAvailableAsync();
      if (cancelled) return;
      setAvailable(ok);
      if (!ok) return;
      try {
        const raw = await AsyncStorage.getItem(ZERO_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as ZeroOffset;
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            setZero(parsed);
          }
        }
      } catch {
        // ignore
      }
      Accelerometer.setUpdateInterval(SAMPLE_MS);
      sub = Accelerometer.addListener((m) => {
        latest.current = m;
        const t = tiltsFromAccel(m, zeroRef.current);
        if (!filterReady.current) {
          filteredRoll.current = t.rollDeg;
          filteredPitch.current = t.pitchDeg;
          filterReady.current = true;
        } else {
          const a = SENSOR_EMA;
          filteredRoll.current += (t.rollDeg - filteredRoll.current) * a;
          filteredPitch.current += (t.pitchDeg - filteredPitch.current) * a;
        }
        targetRoll.value = filteredRoll.current;
        targetPitch.value = filteredPitch.current;

        const now = Date.now();
        if (now - lastReadoutAt.current >= READOUT_MS) {
          lastReadoutAt.current = now;
          const r = filteredRoll.current;
          const p = filteredPitch.current;
          const mag = Math.hypot(r, p);
          setRollDeg(r);
          setPitchDeg(p);
          setIsLevel(mag <= LEVEL_TOLERANCE_DEG);
        }
      });
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [targetPitch, targetRoll]);

  // Re-seed filter when zero changes
  useEffect(() => {
    if (!latest.current) return;
    const t = tiltsFromAccel(latest.current, zero);
    filteredRoll.current = t.rollDeg;
    filteredPitch.current = t.pitchDeg;
    targetRoll.value = t.rollDeg;
    targetPitch.value = t.pitchDeg;
    smoothRoll.value = t.rollDeg;
    smoothPitch.value = t.pitchDeg;
    setRollDeg(t.rollDeg);
    setPitchDeg(t.pitchDeg);
    setIsLevel(Math.hypot(t.rollDeg, t.pitchDeg) <= LEVEL_TOLERANCE_DEG);
  }, [zero, targetPitch, targetRoll, smoothPitch, smoothRoll]);

  const bubbleStyle = useAnimatedStyle(() => {
    const travel = travelSV.value;
    const nx = Math.min(
      1,
      Math.max(-1, smoothRoll.value / MAX_BUBBLE_TILT_DEG),
    );
    const ny = Math.min(
      1,
      Math.max(-1, -smoothPitch.value / MAX_BUBBLE_TILT_DEG),
    );
    const leveled = levelSV.value > 0.5;
    return {
      transform: [{ translateX: nx * travel }, { translateY: ny * travel }],
      backgroundColor: leveled ? colors.teal : '#7ED6CC',
    };
  });

  const vialBorderStyle = useAnimatedStyle(() => ({
    borderColor: levelSV.value > 0.5 ? colors.teal : colors.graphiteEdge,
  }));

  const onZero = async () => {
    const m = latest.current;
    if (!m) return;
    const next = { x: m.x, y: m.y };
    setZero(next);
    await AsyncStorage.setItem(ZERO_KEY, JSON.stringify(next));
  };

  const onResetZero = async () => {
    const next = { x: 0, y: 0 };
    setZero(next);
    await AsyncStorage.removeItem(ZERO_KEY);
  };

  const magnitude = Math.hypot(rollDeg, pitchDeg);

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
        <Text style={styles.title}>Spirit level</Text>
        <Text style={styles.body}>
          Accelerometer is not available on this device.
        </Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

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
        <Text style={styles.title}>Spirit level</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View
        style={styles.stage}
        onLayout={(e: LayoutChangeEvent) => {
          const { width, height } = e.nativeEvent.layout;
          setVialSize(Math.min(width, height) * 0.72);
        }}
      >
        <Animated.View
          style={[
            styles.vial,
            { width: vialSize, height: vialSize },
            vialBorderStyle,
          ]}
        >
          <View style={styles.crossH} />
          <View style={styles.crossV} />
          <View style={styles.centerRing} />
          <Animated.View style={[styles.bubble, bubbleStyle]} />
        </Animated.View>
      </View>

      <View style={styles.readouts}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Roll</Text>
          <Text style={[styles.metricValue, isLevel && styles.metricLevel]}>
            {rollDeg.toFixed(1)}°
          </Text>
          <Text style={styles.metricSub}>{pctFromDeg(rollDeg)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Pitch</Text>
          <Text style={[styles.metricValue, isLevel && styles.metricLevel]}>
            {pitchDeg.toFixed(1)}°
          </Text>
          <Text style={styles.metricSub}>{pctFromDeg(pitchDeg)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Tilt</Text>
          <Text style={[styles.metricValue, isLevel && styles.metricLevel]}>
            {magnitude.toFixed(1)}°
          </Text>
          <Text style={styles.metricSub}>
            {isLevel ? 'Level' : 'Off level'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={onZero}>
          <Text style={styles.btnText}>Zero here</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={onResetZero}>
          <Text style={styles.btnSecondaryText}>Reset zero</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        Place the phone on a surface, then Zero here to set a reference.
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
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vial: {
    borderRadius: 999,
    borderWidth: 3,
    backgroundColor: 'rgba(42, 48, 56, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  crossH: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.graphiteEdge,
  },
  crossV: {
    position: 'absolute',
    top: '12%',
    bottom: '12%',
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.graphiteEdge,
  },
  centerRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.tealDim,
  },
  bubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    opacity: 0.95,
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
    fontSize: 22,
    fontWeight: '600',
    marginTop: 4,
  },
  metricLevel: {
    color: colors.teal,
  },
  metricSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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

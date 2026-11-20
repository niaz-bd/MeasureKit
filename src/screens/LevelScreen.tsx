import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, spacing } from '../theme';

const ZERO_KEY = '@visual_ruler/level_zero';
const LEVEL_TOLERANCE_DEG = 0.4;
const MAX_BUBBLE_TILT_DEG = 12;

type ZeroOffset = { x: number; y: number };

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

/** Tilt from accelerometer (device face-up / edge-on friendly). */
function tiltsFromAccel(
  { x, y, z }: AccelerometerMeasurement,
  zero: ZeroOffset,
): { rollDeg: number; pitchDeg: number } {
  const ax = x - zero.x;
  const ay = y - zero.y;
  const az = z;
  // Screen-plane tilts relative to gravity
  const rollDeg = radToDeg(Math.atan2(ax, Math.hypot(ay, az)));
  const pitchDeg = radToDeg(Math.atan2(ay, Math.hypot(ax, az)));
  return { rollDeg, pitchDeg };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function LevelScreen() {
  const navigation = useNavigation();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [rollDeg, setRollDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);
  const [zero, setZero] = useState<ZeroOffset>({ x: 0, y: 0 });
  const [vialSize, setVialSize] = useState(220);
  const latest = useRef<AccelerometerMeasurement | null>(null);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => {
        // Measure screen re-locks landscape on focus
      };
    }, []),
  );

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
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener((m) => {
        latest.current = m;
        const t = tiltsFromAccel(m, zeroRef.current);
        setRollDeg(t.rollDeg);
        setPitchDeg(t.pitchDeg);
      });
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  const zeroRef = useRef(zero);
  zeroRef.current = zero;

  // Recompute when zero changes using last sample
  useEffect(() => {
    if (!latest.current) return;
    const t = tiltsFromAccel(latest.current, zero);
    setRollDeg(t.rollDeg);
    setPitchDeg(t.pitchDeg);
  }, [zero]);

  const magnitude = Math.hypot(rollDeg, pitchDeg);
  const isLevel = magnitude <= LEVEL_TOLERANCE_DEG;

  const bubble = useMemo(() => {
    const travel = vialSize * 0.38;
    const nx = clamp(rollDeg / MAX_BUBBLE_TILT_DEG, -1, 1);
    const ny = clamp(-pitchDeg / MAX_BUBBLE_TILT_DEG, -1, 1);
    return { x: nx * travel, y: ny * travel };
  }, [rollDeg, pitchDeg, vialSize]);

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

  const pct = (deg: number) =>
    `${(Math.sin((deg * Math.PI) / 180) * 100).toFixed(1)}%`;

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
        <View
          style={[
            styles.vial,
            {
              width: vialSize,
              height: vialSize,
              borderColor: isLevel ? colors.teal : colors.graphiteEdge,
            },
          ]}
        >
          <View style={styles.crossH} />
          <View style={styles.crossV} />
          <View style={styles.centerRing} />
          <View
            style={[
              styles.bubble,
              {
                transform: [
                  { translateX: bubble.x },
                  { translateY: bubble.y },
                ],
                backgroundColor: isLevel ? colors.teal : '#7ED6CC',
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.readouts}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Roll</Text>
          <Text style={[styles.metricValue, isLevel && styles.metricLevel]}>
            {rollDeg.toFixed(1)}°
          </Text>
          <Text style={styles.metricSub}>{pct(rollDeg)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Pitch</Text>
          <Text style={[styles.metricValue, isLevel && styles.metricLevel]}>
            {pitchDeg.toFixed(1)}°
          </Text>
          <Text style={styles.metricSub}>{pct(pitchDeg)}</Text>
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

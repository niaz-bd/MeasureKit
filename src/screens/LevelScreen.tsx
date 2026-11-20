import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { pctFromDeg } from '../sensors/tilt';
import { useSmoothedTilt } from '../sensors/useSmoothedTilt';
import { colors, spacing } from '../theme';

const ZERO_KEY = '@visual_ruler/level_zero';
const LEVEL_TOLERANCE_DEG = 0.4;
const MAX_BUBBLE_TILT_DEG = 12;

export function LevelScreen() {
  const navigation = useNavigation();
  const {
    available,
    rollDeg,
    pitchDeg,
    smoothRoll,
    smoothPitch,
    setZeroFromLatest,
    resetZero,
  } = useSmoothedTilt(ZERO_KEY);

  const [vialSize, setVialSize] = useState(220);
  const travelSV = useSharedValue(vialSize * 0.38);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => undefined;
    }, []),
  );

  useEffect(() => {
    travelSV.value = vialSize * 0.38;
  }, [vialSize, travelSV]);

  const magnitude = Math.hypot(rollDeg, pitchDeg);
  const isLevel = magnitude <= LEVEL_TOLERANCE_DEG;

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
    const mag = Math.hypot(smoothRoll.value, smoothPitch.value);
    const leveled = mag <= LEVEL_TOLERANCE_DEG;
    return {
      transform: [{ translateX: nx * travel }, { translateY: ny * travel }],
      backgroundColor: leveled ? colors.teal : '#7ED6CC',
    };
  });

  const vialBorderStyle = useAnimatedStyle(() => {
    const mag = Math.hypot(smoothRoll.value, smoothPitch.value);
    return {
      borderColor:
        mag <= LEVEL_TOLERANCE_DEG ? colors.teal : colors.graphiteEdge,
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
        <Pressable style={styles.btn} onPress={setZeroFromLatest}>
          <Text style={styles.btnText}>Zero here</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={resetZero}>
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

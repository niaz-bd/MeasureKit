import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraBackdrop } from '../components/CameraBackdrop';
import { GlowReadout } from '../components/GlowReadout';
import { RulerTrack } from '../components/RulerTrack';
import { useSettings } from '../SettingsContext';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types';
import {
  dpToMm,
  formatMeasurement,
  mmToDp,
  unitLabel,
} from '../units';

const HANDLE_HIT = 44;
const FINE_STEP_MM = 0.1;
const COARSE_DRAG_FACTOR = 1;
const FINE_DRAG_FACTOR = 0.22;

export function MeasureScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { unit, calibration } = useSettings();
  const [trackWidth, setTrackWidth] = useState(0);
  const [fineMode, setFineMode] = useState(false);
  const [displayMm, setDisplayMm] = useState(0);
  const handleX = useSharedValue(0);
  const startX = useSharedValue(0);
  const fineModeSV = useSharedValue(0);
  const widthSV = useSharedValue(0);
  const mmPerDpSV = useSharedValue(calibration.mmPerDp);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => undefined);
      return () => {
        ScreenOrientation.unlockAsync().catch(() => undefined);
      };
    }, []),
  );

  useEffect(() => {
    mmPerDpSV.value = calibration.mmPerDp;
  }, [calibration.mmPerDp, mmPerDpSV]);

  useEffect(() => {
    fineModeSV.value = fineMode ? 1 : 0;
  }, [fineMode, fineModeSV]);

  const syncDisplay = useCallback(
    (x: number) => {
      setDisplayMm(dpToMm(Math.max(0, x), calibration.mmPerDp));
    },
    [calibration.mmPerDp],
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    widthSV.value = w;
    if (handleX.value <= 0 || handleX.value > w) {
      const initial = Math.min(w * 0.35, mmToDp(50, calibration.mmPerDp));
      handleX.value = initial;
      syncDisplay(initial);
    }
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startX.value = handleX.value;
        })
        .onUpdate((e) => {
          const factor =
            fineModeSV.value > 0 ? FINE_DRAG_FACTOR : COARSE_DRAG_FACTOR;
          const next = Math.min(
            Math.max(0, startX.value + e.translationX * factor),
            widthSV.value,
          );
          handleX.value = next;
          runOnJS(syncDisplay)(next);
        }),
    [fineModeSV, handleX, startX, syncDisplay, widthSV],
  );

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handleX.value - HANDLE_HIT / 2 }],
  }));

  const nudge = useCallback(
    (dir: -1 | 1) => {
      const delta = mmToDp(FINE_STEP_MM, calibration.mmPerDp) * dir;
      const next = Math.min(Math.max(0, handleX.value + delta), trackWidth);
      handleX.value = next;
      syncDisplay(next);
    },
    [calibration.mmPerDp, handleX, syncDisplay, trackWidth],
  );

  const startHold = (dir: -1 | 1) => {
    nudge(dir);
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = setInterval(() => nudge(dir), 80);
  };

  const stopHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };

  useEffect(() => () => stopHold(), []);

  const readout = formatMeasurement(displayMm, unit);
  const bottomPad = Math.max(insets.bottom, 4);

  return (
    <View style={styles.root}>
      <CameraBackdrop />

      <View
        style={[
          styles.overlay,
          { paddingTop: Math.max(insets.top, 8) },
        ]}
      >
        <View style={styles.chrome}>
          <Pressable
            accessibilityLabel="Open settings"
            onPress={() => navigation.navigate('Settings')}
            style={styles.iconBtn}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={26}
              color={colors.text}
            />
          </Pressable>

          <GlowReadout value={readout} unit={unitLabel(unit)} />

          <View style={styles.fineCluster}>
            <Pressable
              accessibilityLabel={
                fineMode ? 'Disable fine adjust' : 'Enable fine adjust (turtle)'
              }
              onPress={() => setFineMode((v) => !v)}
              style={[styles.iconBtn, fineMode && styles.iconBtnActive]}
            >
              <MaterialCommunityIcons
                name="turtle"
                size={28}
                color={fineMode ? colors.teal : colors.textMuted}
              />
            </Pressable>
            {fineMode ? (
              <View style={styles.nudgeRow}>
                <Pressable
                  accessibilityLabel="Decrease by 0.1 millimetre"
                  onPressIn={() => startHold(-1)}
                  onPressOut={stopHold}
                  style={styles.nudgeBtn}
                >
                  <Text style={styles.nudgeText}>−</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Increase by 0.1 millimetre"
                  onPressIn={() => startHold(1)}
                  onPressOut={stopHold}
                  style={styles.nudgeBtn}
                >
                  <Text style={styles.nudgeText}>+</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.spacer} />

        <View
          style={[styles.rulerEdge, { paddingBottom: bottomPad }]}
          onLayout={onTrackLayout}
        >
          <RulerTrack
            width={trackWidth}
            mmPerDp={calibration.mmPerDp}
            unit={unit}
          />
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[styles.handleHit, handleStyle]}
              accessibilityLabel="Measure handle"
              accessibilityRole="adjustable"
            >
              <View style={styles.handleStem} />
              <View style={styles.handleKnob} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
  },
  overlay: {
    flex: 1,
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 48, 56, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.graphiteEdge,
  },
  iconBtnActive: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  fineCluster: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nudgeBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 67, 78, 0.85)',
  },
  nudgeText: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: '600',
  },
  rulerEdge: {
    width: '100%',
    position: 'relative',
  },
  handleHit: {
    position: 'absolute',
    bottom: 0,
    width: HANDLE_HIT,
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  handleStem: {
    width: 2,
    flex: 1,
    backgroundColor: colors.teal,
    opacity: 0.9,
    shadowColor: colors.teal,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  handleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 8,
    backgroundColor: colors.teal,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.teal,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});

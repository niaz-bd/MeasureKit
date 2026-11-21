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

import { GlowReadout } from '../components/GlowReadout';
import { RulerTrack } from '../components/RulerTrack';
import { SegmentControl } from '../components/SegmentControl';
import { useLogMeasurementOnLeave } from '../history/useLogMeasurementOnLeave';
import { useToolPrefs } from '../hooks/useToolPrefs';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types';
import {
  UNIT_OPTIONS,
  UnitSystem,
  defaultCalibration,
  dpToMm,
  formatMeasurement,
  mmToDp,
  unitLabel,
} from '../units';

const BAR_HIT = 48;
const MIN_GAP_DP = 8;
const FINE_STEP_MM = 0.1;
const COARSE_DRAG_FACTOR = 1;
const FINE_DRAG_FACTOR = 0.22;

type ActiveBar = 'left' | 'right';

export function MeasureScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { prefs, updatePrefs, refresh } = useToolPrefs('ruler');
  const unit = prefs.unit;
  const calibration = prefs.calibration ?? defaultCalibration();
  const [trackWidth, setTrackWidth] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fineMode, setFineMode] = useState(false);
  const [displayMm, setDisplayMm] = useState(0);
  const [activeBar, setActiveBar] = useState<ActiveBar>('right');

  const leftX = useSharedValue(0);
  const rightX = useSharedValue(0);
  const startLeft = useSharedValue(0);
  const startRight = useSharedValue(0);
  const fineModeSV = useSharedValue(0);
  const widthSV = useSharedValue(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => undefined);
      refresh().catch(() => undefined);
      return () => {
        ScreenOrientation.unlockAsync().catch(() => undefined);
      };
    }, [refresh]),
  );

  useLogMeasurementOnLeave('ruler', 'Ruler', () => {
    if (!(displayMm > 0)) return null;
    const summary = `${formatMeasurement(displayMm, unit)} ${unitLabel(unit)}`;
    return {
      summary,
      values: { mm: Number(displayMm.toFixed(3)), unit },
    };
  });

  useEffect(() => {
    fineModeSV.value = fineMode ? 1 : 0;
  }, [fineMode, fineModeSV]);

  const syncFromBars = useCallback(
    (left: number, right: number) => {
      const gap = Math.max(0, right - left);
      setDisplayMm(dpToMm(gap, calibration.mmPerDp));
    },
    [calibration.mmPerDp],
  );

  const onStageLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    widthSV.value = w;
    if (!initialized.current && w > 0) {
      initialized.current = true;
      // Centered pair with a clear gap (≈28% of width, clamped).
      const gap = Math.min(Math.max(w * 0.28, 96), w * 0.4);
      const mid = w / 2;
      const l = mid - gap / 2;
      const r = mid + gap / 2;
      leftX.value = l;
      rightX.value = r;
      syncFromBars(l, r);
    }
  };

  const markActive = useCallback((bar: ActiveBar) => {
    setActiveBar(bar);
  }, []);

  const panLeft = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startLeft.value = leftX.value;
          runOnJS(markActive)('left');
        })
        .onUpdate((e) => {
          const factor =
            fineModeSV.value > 0 ? FINE_DRAG_FACTOR : COARSE_DRAG_FACTOR;
          const max = rightX.value - MIN_GAP_DP;
          const next = Math.min(
            Math.max(0, startLeft.value + e.translationX * factor),
            max,
          );
          leftX.value = next;
          runOnJS(syncFromBars)(next, rightX.value);
        }),
    [fineModeSV, leftX, markActive, rightX, startLeft, syncFromBars],
  );

  const panRight = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startRight.value = rightX.value;
          runOnJS(markActive)('right');
        })
        .onUpdate((e) => {
          const factor =
            fineModeSV.value > 0 ? FINE_DRAG_FACTOR : COARSE_DRAG_FACTOR;
          const min = leftX.value + MIN_GAP_DP;
          const next = Math.min(
            Math.max(min, startRight.value + e.translationX * factor),
            widthSV.value,
          );
          rightX.value = next;
          runOnJS(syncFromBars)(leftX.value, next);
        }),
    [fineModeSV, leftX, markActive, rightX, startRight, syncFromBars, widthSV],
  );

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value - BAR_HIT / 2 }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value - BAR_HIT / 2 }],
  }));

  const nudge = useCallback(
    (dir: -1 | 1) => {
      const delta = mmToDp(FINE_STEP_MM, calibration.mmPerDp) * dir;
      if (activeBar === 'left') {
        const next = Math.min(
          Math.max(0, leftX.value + delta),
          rightX.value - MIN_GAP_DP,
        );
        leftX.value = next;
        syncFromBars(next, rightX.value);
      } else {
        const next = Math.min(
          Math.max(leftX.value + MIN_GAP_DP, rightX.value + delta),
          trackWidth,
        );
        rightX.value = next;
        syncFromBars(leftX.value, next);
      }
    },
    [
      activeBar,
      calibration.mmPerDp,
      leftX,
      rightX,
      syncFromBars,
      trackWidth,
    ],
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
  // Immersive mode hides system bars — keep a tiny pad only if insets remain.
  const bottomPad = Math.max(insets.bottom > 24 ? 0 : insets.bottom, 0);

  const pickUnit = (next: UnitSystem) => {
    updatePrefs({ unit: next }).catch(() => undefined);
  };

  const unitToggle = (
    <SegmentControl
      accessibilityLabel="Ruler units"
      value={unit}
      onChange={pickUnit}
      options={UNIT_OPTIONS.map((u) => ({ value: u, label: unitLabel(u) }))}
    />
  );

  const calibratedLabel = calibration.calibratedAt
    ? `Calibrated ${new Date(calibration.calibratedAt).toLocaleString()}`
    : 'Using screen density (not calibrated)';

  return (
    <View style={styles.root}>
      <View style={styles.overlay} onLayout={onStageLayout}>
        <GestureDetector gesture={panLeft}>
          <Animated.View
            style={[styles.barHit, leftStyle]}
            accessibilityLabel="Left measure bar"
            accessibilityRole="adjustable"
          >
            <View
              style={[
                styles.barStem,
                activeBar === 'left' && styles.barStemActive,
              ]}
            />
            <View
              style={[
                styles.barKnob,
                activeBar === 'left' && styles.barKnobActive,
              ]}
            />
          </Animated.View>
        </GestureDetector>

        <GestureDetector gesture={panRight}>
          <Animated.View
            style={[styles.barHit, rightStyle]}
            accessibilityLabel="Right measure bar"
            accessibilityRole="adjustable"
          >
            <View
              style={[
                styles.barStem,
                activeBar === 'right' && styles.barStemActive,
              ]}
            />
            <View
              style={[
                styles.barKnob,
                activeBar === 'right' && styles.barKnobActive,
              ]}
            />
          </Animated.View>
        </GestureDetector>

        <View
          style={[styles.chrome, { paddingTop: spacing.sm }]}
          pointerEvents="box-none"
        >
          <View style={styles.leftCluster}>
            <Pressable
              accessibilityLabel="Back to menu"
              onPress={() => navigation.navigate('Home')}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={26}
                color={colors.text}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Ruler settings"
              onPress={() => setSettingsOpen((v) => !v)}
              style={[styles.iconBtn, settingsOpen && styles.iconBtnActive]}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={26}
                color={settingsOpen ? colors.teal : colors.text}
              />
            </Pressable>
          </View>

          <View style={styles.centerChrome}>
            {unitToggle}
            <GlowReadout value={readout} unit={unitLabel(unit)} />
          </View>

          <View style={styles.fineCluster} pointerEvents="box-none">
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
                  accessibilityLabel={`Nudge ${activeBar} bar left by 0.1 millimetre`}
                  onPressIn={() => startHold(-1)}
                  onPressOut={stopHold}
                  style={styles.nudgeBtn}
                >
                  <Text style={styles.nudgeText}>−</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Nudge ${activeBar} bar right by 0.1 millimetre`}
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

        <View
          style={[styles.rulerEdge, { paddingBottom: bottomPad }]}
          pointerEvents="none"
        >
          <RulerTrack
            width={trackWidth}
            mmPerDp={calibration.mmPerDp}
            unit={unit}
          />
        </View>

        {settingsOpen ? (
          <View style={styles.settingsPanel} pointerEvents="box-none">
            <Text style={styles.settingsTitle}>Ruler settings</Text>
            <Text style={styles.settingsDetail}>{calibratedLabel}</Text>
            <View style={styles.settingsActions}>
              <Pressable
                style={styles.settingsBtn}
                onPress={() => {
                  setSettingsOpen(false);
                  navigation.navigate('Calibration');
                }}
              >
                <Text style={styles.settingsBtnText}>Calibrate card</Text>
              </Pressable>
              <Pressable
                style={styles.settingsBtnSecondary}
                onPress={() => {
                  updatePrefs({
                    calibration: defaultCalibration(),
                  }).catch(() => undefined);
                }}
              >
                <Text style={styles.settingsBtnSecondaryText}>
                  Reset density
                </Text>
              </Pressable>
            </View>
            <Text style={styles.settingsHint}>
              Units above apply to this ruler only (not AR or other tools).
            </Text>
          </View>
        ) : null}
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
    position: 'relative',
  },
  chrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    zIndex: 4,
  },
  leftCluster: {
    gap: spacing.sm,
  },
  centerChrome: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsPanel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: 72,
    zIndex: 6,
    backgroundColor: colors.graphiteSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    padding: spacing.md,
    gap: spacing.sm,
  },
  settingsTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  settingsDetail: {
    color: colors.textMuted,
    fontSize: 13,
  },
  settingsActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  settingsBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  settingsBtnText: {
    color: colors.graphite,
    fontWeight: '700',
  },
  settingsBtnSecondary: {
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  settingsBtnSecondaryText: {
    color: colors.text,
    fontWeight: '600',
  },
  settingsHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
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
  barHit: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: BAR_HIT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  barStem: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.teal,
    opacity: 0.75,
  },
  barStemActive: {
    opacity: 1,
    width: 3,
  },
  barKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.tealDim,
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 1,
  },
  barKnobActive: {
    backgroundColor: colors.teal,
  },
  rulerEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
});

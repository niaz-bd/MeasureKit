import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { logMeasurement } from '../history/measureHistory';
import {
  angleBetweenVec3,
  cornerAngles,
  normalizeVec3,
  type Vec3,
} from '../sensors/gravity';
import { useSmoothedGravity } from '../sensors/useSmoothedGravity';
import { colors, spacing } from '../theme';

const HOLD_MS = 650;

type Step = 'edge1' | 'edge2' | 'done';

export function AngleMeterScreen() {
  const navigation = useNavigation();
  const { available, gravity, capture } = useSmoothedGravity();

  const [edge1, setEdge1] = useState<Vec3 | null>(null);
  const [edge2, setEdge2] = useState<Vec3 | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [gaugeW, setGaugeW] = useState(280);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStarted = useRef(0);

  const liveAngleSv = useSharedValue(0);
  const lockedAngleSv = useSharedValue(0);
  const hasEdge1Sv = useSharedValue(0);
  const doneSv = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => {
        if (holdTimer.current) clearInterval(holdTimer.current);
      };
    }, []),
  );

  const step: Step = !edge1 ? 'edge1' : !edge2 ? 'edge2' : 'done';

  const liveVsEdge1 = useMemo(() => {
    if (!edge1) return 0;
    return angleBetweenVec3(edge1, normalizeVec3(gravity));
  }, [edge1, gravity]);

  const measured = useMemo(() => {
    if (!edge1 || !edge2) return null;
    return cornerAngles(angleBetweenVec3(edge1, edge2));
  }, [edge1, edge2]);

  // Drive needle from live or locked angle
  useEffect(() => {
    hasEdge1Sv.value = edge1 ? 1 : 0;
    doneSv.value = edge2 ? 1 : 0;
    if (edge1 && edge2) {
      lockedAngleSv.value = angleBetweenVec3(edge1, edge2);
    }
  }, [edge1, edge2, hasEdge1Sv, doneSv, lockedAngleSv]);

  useEffect(() => {
    if (edge1 && !edge2) {
      liveAngleSv.value = liveVsEdge1;
    }
  }, [liveVsEdge1, edge1, edge2, liveAngleSv]);

  // Continuous live angle from shared gravity when waiting for edge 2
  useEffect(() => {
    if (!edge1 || edge2) return;
    const id = setInterval(() => {
      // gravity state already throttled; keep SV in sync
      liveAngleSv.value = angleBetweenVec3(edge1, normalizeVec3(gravity));
    }, 50);
    return () => clearInterval(id);
  }, [edge1, edge2, gravity, liveAngleSv]);

  const rayStyle = useAnimatedStyle(() => {
    const deg =
      doneSv.value > 0.5
        ? lockedAngleSv.value
        : hasEdge1Sv.value > 0.5
          ? liveAngleSv.value
          : 0;
    return { transform: [{ rotate: `${-deg}deg` }] };
  });

  const clearHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldProgress(0);
  };

  const commitCapture = () => {
    const sample = capture();
    if (!sample) return;
    if (!edge1) {
      setEdge1(sample);
      liveAngleSv.value = 0;
    } else if (!edge2) {
      const deg = angleBetweenVec3(edge1, sample);
      const corners = cornerAngles(deg);
      setEdge2(sample);
      lockedAngleSv.value = deg;
      doneSv.value = 1;
      logMeasurement({
        toolId: 'angleMeter',
        toolName: 'Angle meter',
        summary: `${corners.primary.toFixed(1)}°`,
        values: {
          primaryDeg: Number(corners.primary.toFixed(2)),
          supplementDeg: Number(corners.supplement.toFixed(2)),
        },
      }).catch(() => undefined);
    }
  };

  const onHoldIn = () => {
    if (step === 'done') return;
    clearHold();
    holdStarted.current = Date.now();
    holdTimer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - holdStarted.current) / HOLD_MS);
      setHoldProgress(p);
      if (p >= 1) {
        clearHold();
        commitCapture();
      }
    }, 40);
  };

  const onHoldOut = () => {
    clearHold();
  };

  const onReset = () => {
    clearHold();
    setEdge1(null);
    setEdge2(null);
    liveAngleSv.value = 0;
    lockedAngleSv.value = 0;
    hasEdge1Sv.value = 0;
    doneSv.value = 0;
  };

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
        <Text style={styles.title}>Angle meter</Text>
        <Text style={styles.body}>
          Accelerometer is not available on this device.
        </Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const displayDeg = measured
    ? measured.primary
    : edge1
      ? liveVsEdge1
      : 0;

  const instruction =
    step === 'edge1'
      ? 'Align with the first edge, then hold Capture'
      : step === 'edge2'
        ? 'Align with the second edge, then hold Capture'
        : 'Angle between the two captured orientations';

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
        <Text style={styles.title}>Angle meter</Text>
        <Pressable
          style={styles.iconBtn}
          onPress={onReset}
          accessibilityLabel="Reset captures"
        >
          <MaterialCommunityIcons name="refresh" size={22} color={colors.text} />
        </Pressable>
      </View>

      <Text style={styles.instruction}>{instruction}</Text>

      <View style={styles.steps}>
        <View style={[styles.stepPill, edge1 && styles.stepPillDone]}>
          <Text style={styles.stepText}>1 · Edge A {edge1 ? '✓' : ''}</Text>
        </View>
        <View style={[styles.stepPill, edge2 && styles.stepPillDone]}>
          <Text style={styles.stepText}>2 · Edge B {edge2 ? '✓' : ''}</Text>
        </View>
      </View>

      <View
        style={styles.stage}
        onLayout={(e: LayoutChangeEvent) => {
          const { width, height } = e.nativeEvent.layout;
          setGaugeW(Math.min(width * 0.9, height * 0.9, 340));
        }}
      >
        <View style={[styles.gauge, { width: gaugeW, height: gaugeW }]}>
          {/* Fixed reference ray (edge A / 0°) */}
          <View style={[styles.rayPivot, { width: gaugeW, height: gaugeW }]}>
            <View
              style={[
                styles.ray,
                styles.rayRef,
                { height: gaugeW * 0.42, marginBottom: gaugeW * 0.5 - 2 },
              ]}
            />
          </View>

          {/* Moving ray (live or edge B) */}
          <Animated.View
            style={[
              styles.rayPivot,
              { width: gaugeW, height: gaugeW },
              rayStyle,
            ]}
          >
            <View
              style={[
                styles.ray,
                styles.rayLive,
                { height: gaugeW * 0.42, marginBottom: gaugeW * 0.5 - 2 },
              ]}
            />
          </Animated.View>

          <View style={styles.hub} />
          {/* Arc hint ticks */}
          {[0, 45, 90, 135, 180].map((t) => (
            <View
              key={t}
              style={[
                styles.arcTickWrap,
                {
                  width: gaugeW,
                  height: gaugeW,
                  transform: [{ rotate: `${-t}deg` }],
                },
              ]}
            >
              <View style={styles.arcTick} />
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.heroDeg}>{displayDeg.toFixed(1)}°</Text>
      {measured ? (
        <Text style={styles.supplement}>
          Supplement {measured.supplement.toFixed(1)}°
        </Text>
      ) : (
        <Text style={styles.supplement}>
          {step === 'edge1'
            ? 'Waiting for first capture'
            : 'Live angle from edge A'}
        </Text>
      )}

      <Pressable
        style={[
          styles.captureBtn,
          step === 'done' && styles.captureBtnDisabled,
          holdProgress > 0 && styles.captureBtnHolding,
        ]}
        onPressIn={onHoldIn}
        onPressOut={onHoldOut}
        disabled={step === 'done'}
        accessibilityLabel={
          step === 'edge1'
            ? 'Hold to capture first edge'
            : step === 'edge2'
              ? 'Hold to capture second edge'
              : 'Both edges captured'
        }
      >
        <View
          style={[styles.holdFill, { width: `${Math.round(holdProgress * 100)}%` }]}
        />
        <Text
          style={[
            styles.captureText,
            step === 'done' && styles.captureTextDone,
          ]}
        >
          {step === 'done'
            ? 'Done — tap refresh to measure again'
            : `Hold to capture ${step === 'edge1' ? 'edge A' : 'edge B'}`}
        </Text>
      </Pressable>

      <Text style={styles.hint}>
        Place the phone along each edge or face, then hold Capture. Distinct from
        the inclinometer — this compares two saved orientations.
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
  instruction: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.graphiteSoft,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  stepPillDone: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  stepText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  gauge: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.graphiteEdge,
    backgroundColor: 'rgba(42, 48, 56, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rayPivot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    width: 4,
    borderRadius: 2,
  },
  rayRef: {
    backgroundColor: colors.tickMajor,
  },
  rayLive: {
    backgroundColor: colors.teal,
  },
  hub: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.graphiteMid,
    borderWidth: 2,
    borderColor: colors.teal,
    zIndex: 3,
  },
  arcTickWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  arcTick: {
    marginTop: 8,
    width: 2,
    height: 10,
    backgroundColor: colors.graphiteMid,
  },
  heroDeg: {
    color: colors.white,
    fontSize: 52,
    fontWeight: '700',
    textAlign: 'center',
  },
  supplement: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    marginTop: 4,
    fontSize: 14,
  },
  captureBtn: {
    alignSelf: 'center',
    minWidth: 280,
    backgroundColor: colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
    alignItems: 'center',
  },
  captureBtnHolding: {
    backgroundColor: colors.tealDim,
  },
  captureBtnDisabled: {
    backgroundColor: colors.graphiteMid,
  },
  holdFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  captureText: {
    color: colors.graphite,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  captureTextDone: {
    color: colors.text,
  },
  hint: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  btnText: {
    color: colors.graphite,
    fontWeight: '700',
    fontSize: 15,
  },
});

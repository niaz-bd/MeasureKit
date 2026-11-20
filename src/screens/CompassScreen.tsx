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
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useLogMeasurementOnLeave } from '../history/useLogMeasurementOnLeave';
import { cardinalFromDeg, formatHeading } from '../sensors/heading';
import { useSmoothedHeading } from '../sensors/useSmoothedHeading';
import { colors, spacing } from '../theme';

const CARDINAL_MARKS: { deg: number; label: string; major: boolean }[] = [
  { deg: 0, label: 'N', major: true },
  { deg: 45, label: 'NE', major: false },
  { deg: 90, label: 'E', major: true },
  { deg: 135, label: 'SE', major: false },
  { deg: 180, label: 'S', major: true },
  { deg: 225, label: 'SW', major: false },
  { deg: 270, label: 'W', major: true },
  { deg: 315, label: 'NW', major: false },
];

export function CompassScreen() {
  const navigation = useNavigation();
  const { available, headingDeg, smoothHeading } = useSmoothedHeading();
  const [dialSize, setDialSize] = useState(280);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => undefined;
    }, []),
  );

  useLogMeasurementOnLeave('compass', 'Compass', () => {
    if (available === false) return null;
    return {
      summary: `${formatHeading(headingDeg)} ${cardinalFromDeg(headingDeg)}`,
      values: { headingDeg: Number(headingDeg.toFixed(1)) },
    };
  });

  // Rotate rose opposite to heading so N stays geographic north; top of screen = device heading.
  const roseStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-smoothHeading.value}deg` }],
  }));

  if (available === null) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.body}>Starting magnetometer…</Text>
      </View>
    );
  }

  if (available === false) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.title}>Compass</Text>
        <Text style={styles.body}>
          Magnetometer is not available on this device.
        </Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const cardinal = cardinalFromDeg(headingDeg);

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
        <Text style={styles.title}>Compass</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View
        style={styles.stage}
        onLayout={(e: LayoutChangeEvent) => {
          const { width, height } = e.nativeEvent.layout;
          setDialSize(Math.min(width * 0.88, height * 0.88, 360));
        }}
      >
        {/* Fixed heading marker (device forward) */}
        <View style={styles.headingMarker}>
          <MaterialCommunityIcons name="triangle" size={22} color={colors.teal} />
        </View>

        <View style={[styles.dial, { width: dialSize, height: dialSize }]}>
          <Animated.View
            style={[
              styles.rose,
              { width: dialSize, height: dialSize },
              roseStyle,
            ]}
          >
            {CARDINAL_MARKS.map(({ deg, label, major }) => (
              <View
                key={label}
                style={[
                  styles.markWrap,
                  {
                    width: dialSize,
                    height: dialSize,
                    transform: [{ rotate: `${deg}deg` }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.tick,
                    major ? styles.tickMajor : styles.tickMinor,
                  ]}
                />
                <Text
                  style={[
                    styles.markLabel,
                    major && styles.markLabelMajor,
                    label === 'N' && styles.markNorth,
                    {
                      transform: [{ rotate: `${-deg}deg` }],
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}

            {/* Degree ticks every 30° */}
            {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => (
              <View
                key={`t${deg}`}
                style={[
                  styles.degreeTickWrap,
                  {
                    width: dialSize,
                    height: dialSize,
                    transform: [{ rotate: `${deg}deg` }],
                  },
                ]}
              >
                <View style={styles.degreeTick} />
              </View>
            ))}

            <View style={styles.hub} />
          </Animated.View>
        </View>
      </View>

      <Text style={styles.heroDeg}>{formatHeading(headingDeg)}</Text>
      <Text style={styles.cardinal}>{cardinal}</Text>
      <Text style={styles.hint}>
        Hold the phone flat. The teal marker shows the direction you are facing.
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
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  headingMarker: {
    marginBottom: 6,
    zIndex: 2,
  },
  dial: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.graphiteEdge,
    backgroundColor: 'rgba(42, 48, 56, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rose: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  tick: {
    marginTop: 10,
    width: 2,
    borderRadius: 1,
  },
  tickMajor: {
    height: 14,
    backgroundColor: colors.tickMajor,
  },
  tickMinor: {
    height: 8,
    backgroundColor: colors.tickMinor,
  },
  markLabel: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  markLabelMajor: {
    fontSize: 18,
    color: colors.text,
  },
  markNorth: {
    color: colors.teal,
    fontWeight: '800',
  },
  degreeTickWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  degreeTick: {
    marginTop: 4,
    width: 1,
    height: 6,
    backgroundColor: colors.graphiteMid,
  },
  hub: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.graphiteMid,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  heroDeg: {
    color: colors.white,
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardinal: {
    color: colors.teal,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  hint: {
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

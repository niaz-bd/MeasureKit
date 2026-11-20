import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLogMeasurementOnLeave } from '../history/useLogMeasurementOnLeave';
import { formatSpeed } from '../sensors/speed';
import { useSmoothedSpeed } from '../sensors/useSmoothedSpeed';
import { colors, spacing } from '../theme';

export function SpeedometerScreen() {
  const navigation = useNavigation();
  const [active, setActive] = useState(true);
  const {
    ready,
    permissionDenied,
    servicesOff,
    kmh,
    mph,
    accuracyM,
    error,
  } = useSmoothedSpeed(active);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  useLogMeasurementOnLeave('speedometer', 'Speedometer', () => {
    if (!(kmh > 0.5)) return null;
    return {
      summary: `${formatSpeed(kmh)} km/h`,
      values: {
        kmh: Number(kmh.toFixed(1)),
        mph: Number(mph.toFixed(1)),
      },
    };
  });

  const requestLocationAgain = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
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
        <Text style={styles.title}>Speedometer</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      {servicesOff ? (
        <View style={styles.centered}>
          <Text style={styles.body}>
            Turn on location / GPS services to measure speed.
          </Text>
          <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Back to menu</Text>
          </Pressable>
        </View>
      ) : permissionDenied ? (
        <View style={styles.centered}>
          <Text style={styles.body}>Location permission is required.</Text>
          <Pressable style={styles.btn} onPress={requestLocationAgain}>
            <Text style={styles.btnText}>Allow location</Text>
          </Pressable>
        </View>
      ) : ready === null ? (
        <View style={styles.centered}>
          <Text style={styles.body}>Starting GPS…</Text>
        </View>
      ) : (
        <View style={styles.stage}>
          <Text style={styles.heroSpeed}>{formatSpeed(kmh)}</Text>
          <Text style={styles.heroUnit}>km/h</Text>

          <View style={styles.secondary}>
            <Text style={styles.secondaryValue}>{formatSpeed(mph)}</Text>
            <Text style={styles.secondaryUnit}>mph</Text>
          </View>

          {accuracyM != null ? (
            <Text style={styles.meta}>GPS ±{accuracyM.toFixed(0)} m</Text>
          ) : (
            <Text style={styles.meta}>Waiting for a solid GPS fix…</Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.hint}>
            Smoothed GPS speed. Accuracy is best outdoors while moving.
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
  iconBtnPlaceholder: { width: 44, height: 44 },
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
  stage: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  heroSpeed: {
    color: colors.white,
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroUnit: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: '600',
    marginTop: -4,
  },
  secondary: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    backgroundColor: colors.graphiteSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  secondaryValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
  },
  secondaryUnit: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
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

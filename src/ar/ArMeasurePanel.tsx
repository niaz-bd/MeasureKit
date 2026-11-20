import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { isExpoGo, canUseArMeasure } from './arAvailability';
import type { ArMeasureNativeProps } from './ArMeasureNative';
import { colors, spacing } from '../theme';
import type { UnitSystem } from '../units';

type Props = {
  unit: UnitSystem;
  onOpenSettings: () => void;
  onBackToContact: () => void;
};

type NativeComp = React.ComponentType<ArMeasureNativeProps>;

/**
 * Gates AR behind a native Viro/ARCore build. Expo Go never loads the Viro package.
 */
export function ArMeasurePanel({ unit, onOpenSettings, onBackToContact }: Props) {
  const [Native, setNative] = useState<NativeComp | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const available = canUseArMeasure();

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./ArMeasureNative') as {
        ArMeasureNative: NativeComp;
      };
      if (!cancelled) setNative(() => mod.ArMeasureNative);
    } catch (e) {
      if (!cancelled) {
        setLoadError(
          e instanceof Error ? e.message : 'Failed to load AR module',
        );
      }
    }
    return () => {
      cancelled = true;
    };
  }, [available]);

  if (isExpoGo() || !available) {
    return (
      <View style={styles.gate}>
        <Text style={styles.title}>AR measure needs a native build</Text>
        <Text style={styles.body}>
          Real-world AR (ARCore via ViroReact) is not available in Expo Go.
          Contact (on-screen) measure still works here.
        </Text>
        <Text style={styles.code}>npx expo run:android</Text>
        <Text style={styles.body}>
          Use a device with Google Play Services for AR. Then open this app’s
          AR mode and tap two points on a detected plane.
        </Text>
        <Pressable style={styles.btn} onPress={onBackToContact}>
          <Text style={styles.btnText}>Back to menu</Text>
        </Pressable>
        <Pressable
          style={styles.link}
          onPress={() => {
            Linking.openURL(
              'https://play.google.com/store/apps/details?id=com.google.ar.core',
            ).catch(() => undefined);
          }}
        >
          <Text style={styles.linkText}>ARCore on Play Store</Text>
        </Pressable>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.gate}>
        <Text style={styles.title}>AR unavailable on this device</Text>
        <Text style={styles.body}>{loadError}</Text>
        <Pressable style={styles.btn} onPress={onBackToContact}>
          <Text style={styles.btnText}>Back to menu</Text>
        </Pressable>
      </View>
    );
  }

  if (!Native) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color={colors.teal} size="large" />
        <Text style={[styles.body, { marginTop: spacing.md }]}>
          Loading AR…
        </Text>
      </View>
    );
  }

  return <Native unit={unit} onOpenSettings={onOpenSettings} />;
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(30, 36, 43, 0.92)',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  code: {
    color: colors.teal,
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  btnText: { color: colors.graphite, fontWeight: '700', fontSize: 16 },
  link: { marginTop: spacing.md, padding: spacing.sm },
  linkText: { color: colors.teal, fontSize: 14 },
});

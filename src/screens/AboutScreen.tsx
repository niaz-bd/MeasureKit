import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USE_ADMOB_TEST_IDS } from '../ads';
import { colors, spacing } from '../theme';

export function AboutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>MeasureKit</Text>
      <Text style={styles.body}>
        MeasureKit is a toolkit for Android: on-screen ruler, sensors, map
        area, converters, and more. Ruler lengths use your display density and
        an optional credit-card calibration (ISO ID-1 long edge, 85.6 mm).
      </Text>
      <Text style={styles.body}>
        Each tool keeps its own units (and ruler calibration). Global Settings
        is only for ads and about. Ads use Google AdMob{' '}
        {USE_ADMOB_TEST_IDS ? 'test' : 'production'} unit IDs — see README.
      </Text>
      <Text style={styles.meta}>Version 1.0.0 · Android focus</Text>

      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  meta: {
    color: colors.teal,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.graphiteSoft,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
  },
  backText: {
    color: colors.text,
    fontWeight: '600',
  },
});

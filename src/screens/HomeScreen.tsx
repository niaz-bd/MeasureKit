import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  probeFeatureCapabilities,
  type FeatureCapability,
} from '../capabilities';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types';

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [features, setFeatures] = useState<FeatureCapability[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      let cancelled = false;
      setFeatures(null);
      probeFeatureCapabilities().then((list) => {
        if (!cancelled) setFeatures(list);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      <Text style={styles.brand}>Visual Ruler</Text>
      <Text style={styles.tagline}>Choose a tool</Text>

      {features == null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.loadingText}>Checking device capabilities…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {features.map((f) => (
            <Pressable
              key={f.id}
              disabled={!f.available}
              accessibilityState={{ disabled: !f.available }}
              accessibilityLabel={
                f.available
                  ? f.title
                  : `${f.title}, unavailable: ${f.reason ?? ''}`
              }
              onPress={() => navigation.navigate(f.route)}
              style={[styles.card, !f.available && styles.cardDisabled]}
            >
              <View
                style={[
                  styles.iconWrap,
                  !f.available && styles.iconWrapDisabled,
                ]}
              >
                <MaterialCommunityIcons
                  name={f.icon}
                  size={28}
                  color={f.available ? colors.teal : colors.graphiteEdge}
                />
              </View>
              <Text
                style={[styles.cardTitle, !f.available && styles.cardTitleOff]}
              >
                {f.title}
              </Text>
              <Text
                style={[
                  styles.cardSub,
                  !f.available && styles.cardSubOff,
                ]}
                numberOfLines={2}
              >
                {f.available ? f.subtitle : f.reason}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.md,
  },
  brand: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    maxWidth: '48%',
    backgroundColor: colors.graphiteSoft,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    minHeight: 132,
  },
  cardDisabled: {
    opacity: 0.55,
    borderColor: colors.graphiteMid,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
    marginBottom: spacing.sm,
  },
  iconWrapDisabled: {
    backgroundColor: colors.graphiteMid,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardTitleOff: {
    color: colors.textMuted,
  },
  cardSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  cardSubOff: {
    color: colors.danger,
  },
});

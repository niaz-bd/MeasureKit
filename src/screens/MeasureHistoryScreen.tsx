import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  clearMeasureHistory,
  formatHistoryWhen,
  loadMeasureHistory,
  type MeasureHistoryEntry,
} from '../history/measureHistory';
import { colors, spacing } from '../theme';

export function MeasureHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<MeasureHistoryEntry[]>([]);

  const reload = useCallback(() => {
    loadMeasureHistory().then(setEntries).catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      reload();
      return () => undefined;
    }, [reload]),
  );

  const onClear = async () => {
    await clearMeasureHistory();
    setEntries([]);
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to menu"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>History</Text>
        <Pressable
          style={styles.iconBtn}
          onPress={onClear}
          disabled={entries.length === 0}
          accessibilityLabel="Clear history"
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={22}
            color={entries.length === 0 ? colors.graphiteEdge : colors.danger}
          />
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No measurements yet</Text>
          <Text style={styles.emptyBody}>
            Finalized readings from the ruler, AR, level, and other tools appear
            here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.tool}>{item.toolName}</Text>
                <Text style={styles.when}>{formatHistoryWhen(item.at)}</Text>
              </View>
              <Text style={styles.summary}>{item.summary}</Text>
              {Object.keys(item.values).length > 0 ? (
                <Text style={styles.detail} numberOfLines={2}>
                  {Object.entries(item.values)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ')}
                </Text>
              ) : null}
            </View>
          )}
        />
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
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyBody: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.graphiteSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    padding: spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: spacing.sm,
  },
  tool: {
    color: colors.teal,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  when: {
    color: colors.textMuted,
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  summary: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
});

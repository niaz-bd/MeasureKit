import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  appendCalcHistory,
  clearCalcHistory,
  loadCalcHistory,
  type CalcHistoryEntry,
} from '../calc/history';
import {
  inputBackspace,
  inputClear,
  inputDigit,
  inputEquals,
  inputNegate,
  inputOp,
  inputPercent,
  initialCalcState,
  reuseResult,
  type CalcState,
  type Op,
} from '../calc/engine';
import { colors, spacing } from '../theme';

type Key =
  | { label: string; kind: 'digit'; value: string }
  | { label: string; kind: 'op'; value: Op }
  | { label: string; kind: 'fn'; value: 'C' | '⌫' | '±' | '%' | '=' };

const KEYS: Key[][] = [
  [
    { label: 'C', kind: 'fn', value: 'C' },
    { label: '±', kind: 'fn', value: '±' },
    { label: '%', kind: 'fn', value: '%' },
    { label: '÷', kind: 'op', value: '÷' },
  ],
  [
    { label: '7', kind: 'digit', value: '7' },
    { label: '8', kind: 'digit', value: '8' },
    { label: '9', kind: 'digit', value: '9' },
    { label: '×', kind: 'op', value: '×' },
  ],
  [
    { label: '4', kind: 'digit', value: '4' },
    { label: '5', kind: 'digit', value: '5' },
    { label: '6', kind: 'digit', value: '6' },
    { label: '−', kind: 'op', value: '-' },
  ],
  [
    { label: '1', kind: 'digit', value: '1' },
    { label: '2', kind: 'digit', value: '2' },
    { label: '3', kind: 'digit', value: '3' },
    { label: '+', kind: 'op', value: '+' },
  ],
  [
    { label: '⌫', kind: 'fn', value: '⌫' },
    { label: '0', kind: 'digit', value: '0' },
    { label: '.', kind: 'digit', value: '.' },
    { label: '=', kind: 'fn', value: '=' },
  ],
];

export function CalculatorScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<CalcState>(initialCalcState);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      return () => undefined;
    }, []),
  );

  useEffect(() => {
    loadCalcHistory().then(setHistory).catch(() => undefined);
  }, []);

  const onKey = (key: Key) => {
    if (key.kind === 'fn' && key.value === '=') {
      setState((s) => {
        const { state: next, history: entry } = inputEquals(s);
        if (entry) {
          appendCalcHistory(entry.expression, entry.result)
            .then(setHistory)
            .catch(() => undefined);
        }
        return next;
      });
      return;
    }

    setState((s) => {
      switch (key.kind) {
        case 'digit':
          return inputDigit(s, key.value);
        case 'op':
          return inputOp(s, key.value);
        case 'fn':
          switch (key.value) {
            case 'C':
              return inputClear();
            case '⌫':
              return inputBackspace(s);
            case '±':
              return inputNegate(s);
            case '%':
              return inputPercent(s);
            default:
              return s;
          }
      }
    });
  };

  const onReuse = (entry: CalcHistoryEntry) => {
    setState(reuseResult(entry.result));
    setShowHistory(false);
  };

  const onClearHistory = async () => {
    await clearCalcHistory();
    setHistory([]);
  };

  const expression =
    state.acc != null && state.op != null
      ? `${formatShort(state.acc)} ${state.op}`
      : ' ';

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
        <Text style={styles.title}>Calculator</Text>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setShowHistory((v) => !v)}
          accessibilityLabel={showHistory ? 'Hide history' : 'Show history'}
        >
          <MaterialCommunityIcons
            name="history"
            size={22}
            color={showHistory ? colors.teal : colors.text}
          />
        </Pressable>
      </View>

      {showHistory ? (
        <View style={styles.historyPanel}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>History</Text>
            <Pressable
              onPress={onClearHistory}
              disabled={history.length === 0}
              accessibilityLabel="Clear history"
            >
              <Text
                style={[
                  styles.clearText,
                  history.length === 0 && styles.clearTextOff,
                ]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>No calculations yet.</Text>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              style={styles.historyList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.historyRow}
                  onPress={() => onReuse(item)}
                  accessibilityLabel={`Reuse ${item.result}`}
                >
                  <Text style={styles.historyExpr} numberOfLines={1}>
                    {item.expression}
                  </Text>
                  <Text style={styles.historyResult} numberOfLines={1}>
                    = {item.result}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      ) : null}

      <View style={styles.display}>
        <Text style={styles.expr} numberOfLines={1}>
          {expression}
        </Text>
        <Text
          style={[
            styles.value,
            state.display.length > 9 && styles.valueCompact,
            state.display.length > 12 && styles.valueTiny,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {state.display}
        </Text>
      </View>

      <View style={styles.pad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key) => {
              const isOp = key.kind === 'op';
              const isEq = key.kind === 'fn' && key.value === '=';
              const isFn = key.kind === 'fn' && !isEq;
              return (
                <Pressable
                  key={key.label}
                  onPress={() => onKey(key)}
                  style={({ pressed }) => [
                    styles.key,
                    isOp && styles.keyOp,
                    isEq && styles.keyEq,
                    isFn && styles.keyFn,
                    pressed && styles.keyPressed,
                  ]}
                  accessibilityLabel={key.label}
                >
                  <Text
                    style={[
                      styles.keyText,
                      (isOp || isEq) && styles.keyTextOnAccent,
                    ]}
                  >
                    {key.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function formatShort(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  return Number(n.toPrecision(10)).toString();
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
  historyPanel: {
    maxHeight: 180,
    backgroundColor: colors.graphiteSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  historyTitle: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  clearText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  clearTextOff: {
    opacity: 0.4,
  },
  emptyHistory: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  historyList: {
    maxHeight: 140,
  },
  historyRow: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.graphiteEdge,
  },
  historyExpr: {
    color: colors.textMuted,
    fontSize: 13,
  },
  historyResult: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  display: {
    backgroundColor: colors.graphiteSoft,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.graphiteEdge,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  expr: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 6,
  },
  value: {
    color: colors.white,
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'right',
  },
  valueCompact: {
    fontSize: 36,
  },
  valueTiny: {
    fontSize: 28,
  },
  pad: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  key: {
    flex: 1,
    aspectRatio: 1.15,
    maxHeight: 78,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.graphiteMid,
  },
  keyFn: {
    backgroundColor: colors.graphiteSoft,
  },
  keyOp: {
    backgroundColor: colors.tealDim,
  },
  keyEq: {
    backgroundColor: colors.teal,
  },
  keyPressed: {
    opacity: 0.75,
  },
  keyText: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '600',
  },
  keyTextOnAccent: {
    color: colors.white,
  },
});

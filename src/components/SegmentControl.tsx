import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** Compact segmented control for per-tool unit / mode prefs. */
export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={opt.label}
            onPress={() => onChange(opt.value)}
            style={[styles.btn, on && styles.btnOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.graphiteSoft,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  btn: {
    flexGrow: 1,
    minWidth: 56,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOn: {
    backgroundColor: colors.teal,
  },
  text: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  textOn: {
    color: colors.graphite,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  value: string;
  unit: string;
};

/** Single white measurement value + unit — no glow duplicate layer. */
export function GlowReadout({ value, unit }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.value}>
        {value}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  value: {
    fontSize: 48,
    fontWeight: '400',
    letterSpacing: 1,
    color: colors.white,
  },
  unit: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.white,
    letterSpacing: 1,
  },
});

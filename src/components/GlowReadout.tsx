import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  value: string;
  unit: string;
};

export function GlowReadout({ value, unit }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.glow}>{value}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  glow: {
    position: 'absolute',
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: 1,
    color: colors.teal,
    opacity: 0.35,
    textShadowColor: colors.tealGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  value: {
    fontSize: 52,
    fontWeight: '300',
    letterSpacing: 1.5,
    color: colors.text,
    textShadowColor: colors.tealGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  unit: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '500',
    color: colors.teal,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

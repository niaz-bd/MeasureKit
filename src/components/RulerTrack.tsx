import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import {
  UnitSystem,
  majorTickMm,
  minorTickMm,
  mmToDp,
} from '../units';

type Props = {
  width: number;
  mmPerDp: number;
  unit: UnitSystem;
  /** Height of the ruler strip along the bottom edge. */
  height?: number;
};

export function RulerTrack({ width, mmPerDp, unit, height = 72 }: Props) {
  const ticks = useMemo(() => {
    if (width <= 0 || mmPerDp <= 0) return [];
    const totalMm = width * mmPerDp;
    const minor = minorTickMm(unit);
    const major = majorTickMm(unit);
    const items: { x: number; kind: 'major' | 'mid' | 'minor' }[] = [];
    const steps = Math.floor(totalMm / minor) + 1;
    for (let i = 0; i <= steps; i += 1) {
      const mm = i * minor;
      if (mm > totalMm + 0.01) break;
      const x = mmToDp(mm, mmPerDp);
      if (x > width + 0.5) break;
      const nearMajor = Math.abs(mm % major) < 0.01 || Math.abs((mm % major) - major) < 0.01;
      const half = major / 2;
      const nearMid = Math.abs(mm % half) < 0.01 || Math.abs((mm % half) - half) < 0.01;
      let kind: 'major' | 'mid' | 'minor' = 'minor';
      if (nearMajor) kind = 'major';
      else if (nearMid) kind = 'mid';
      items.push({ x, kind });
    }
    return items;
  }, [width, mmPerDp, unit]);

  return (
    <View style={[styles.track, { height, width }]} pointerEvents="none">
      <View style={styles.trackWash} />
      <View style={styles.baseline} />
      {ticks.map((t, idx) => {
        const h =
          t.kind === 'major' ? height * 0.78 : t.kind === 'mid' ? height * 0.52 : height * 0.32;
        const color =
          t.kind === 'major'
            ? colors.tickMajor
            : t.kind === 'mid'
              ? colors.textMuted
              : colors.tickMinor;
        return (
          <View
            key={`${t.x}-${idx}`}
            style={[
              styles.tick,
              {
                left: t.x,
                height: h,
                backgroundColor: color,
                width: t.kind === 'major' ? 1.5 : StyleSheet.hairlineWidth * 2,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  trackWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 36, 43, 0.42)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(74, 85, 96, 0.7)',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.tealDim,
  },
  tick: {
    position: 'absolute',
    bottom: 0,
  },
});

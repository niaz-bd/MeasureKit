import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import {
  UnitSystem,
  majorTickMm,
  minorTickMm,
  mmToDisplay,
  mmToDp,
  unitLabel,
} from '../units';

type Props = {
  width: number;
  mmPerDp: number;
  unit: UnitSystem;
  /** Height of the ruler strip along the bottom edge. */
  height?: number;
};

type Tick = {
  x: number;
  mm: number;
  kind: 'major' | 'mid' | 'minor';
  label?: string;
};

function majorLabel(mm: number, unit: UnitSystem): string {
  const value = mmToDisplay(mm, unit);
  // Whole units at major ticks (cm or inches).
  const rounded = Math.round(value * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(unit === 'cm' ? 0 : 2);
}

export function RulerTrack({ width, mmPerDp, unit, height = 72 }: Props) {
  const ticks = useMemo(() => {
    if (width <= 0 || mmPerDp <= 0) return [] as Tick[];
    const totalMm = width * mmPerDp;
    const minor = minorTickMm(unit);
    const major = majorTickMm(unit);
    const items: Tick[] = [];
    const steps = Math.floor(totalMm / minor) + 1;
    for (let i = 0; i <= steps; i += 1) {
      const mm = i * minor;
      if (mm > totalMm + 0.01) break;
      const x = mmToDp(mm, mmPerDp);
      if (x > width + 0.5) break;
      const nearMajor =
        Math.abs(mm % major) < 0.01 || Math.abs((mm % major) - major) < 0.01;
      const half = major / 2;
      const nearMid =
        Math.abs(mm % half) < 0.01 || Math.abs((mm % half) - half) < 0.01;
      let kind: Tick['kind'] = 'minor';
      if (nearMajor) kind = 'major';
      else if (nearMid) kind = 'mid';
      items.push({
        x,
        mm,
        kind,
        label: kind === 'major' ? majorLabel(mm, unit) : undefined,
      });
    }
    return items;
  }, [width, mmPerDp, unit]);

  const labelTop = 4;

  return (
    <View style={[styles.track, { height, width }]} pointerEvents="none">
      <View style={styles.trackWash} />
      <View style={styles.baseline} />
      <Text style={styles.unitTag}>{unitLabel(unit)}</Text>
      {ticks.map((t, idx) => {
        const h =
          t.kind === 'major'
            ? height * 0.55
            : t.kind === 'mid'
              ? height * 0.42
              : height * 0.28;
        const color =
          t.kind === 'major'
            ? colors.tickMajor
            : t.kind === 'mid'
              ? colors.textMuted
              : colors.tickMinor;
        return (
          <React.Fragment key={`${t.x}-${idx}`}>
            <View
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
            {t.label != null ? (
              <Text
                style={[
                  styles.label,
                  {
                    left: Math.max(0, t.x - 10),
                    top: labelTop,
                  },
                ]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
            ) : null}
          </React.Fragment>
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
  label: {
    position: 'absolute',
    width: 28,
    textAlign: 'center',
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.92,
  },
  unitTag: {
    position: 'absolute',
    right: 6,
    top: 4,
    color: colors.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

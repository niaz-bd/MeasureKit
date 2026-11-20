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

type TickKind = 'major' | 'half' | 'quarter' | 'eighth' | 'minor';

type Tick = {
  x: number;
  mm: number;
  kind: TickKind;
  label?: string;
  labelSize?: 'lg' | 'sm';
};

const EPS = 0.05;

function near(mm: number, step: number): boolean {
  const r = ((mm % step) + step) % step;
  return r < EPS || step - r < EPS;
}

function formatTickLabel(mm: number, unit: UnitSystem, kind: TickKind): string {
  const value = mmToDisplay(mm, unit);
  if (unit === 'cm') {
    const rounded = Math.round(value * 10) / 10;
    if (kind === 'major') return String(Math.round(rounded));
    // Half-cm: one decimal if needed
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
  // Inches — prefer fraction-ish decimals at sub-inch marks
  if (kind === 'major') {
    return String(Math.round(value));
  }
  const sixteenths = Math.round(value * 16) / 16;
  if (Math.abs(sixteenths - Math.round(sixteenths)) < 0.001) {
    return String(Math.round(sixteenths));
  }
  if (Math.abs(sixteenths * 2 - Math.round(sixteenths * 2)) < 0.001) {
    return sixteenths.toFixed(1).replace(/\.0$/, '');
  }
  return sixteenths.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function tickHeight(kind: TickKind, height: number): number {
  switch (kind) {
    case 'major':
      return height * 0.62;
    case 'half':
      return height * 0.5;
    case 'quarter':
      return height * 0.4;
    case 'eighth':
      return height * 0.32;
    default:
      return height * 0.22;
  }
}

function tickColor(kind: TickKind): string {
  switch (kind) {
    case 'major':
      return colors.tickMajor;
    case 'half':
      return colors.textMuted;
    case 'quarter':
      return '#8A96A1';
    case 'eighth':
      return colors.tickMinor;
    default:
      return '#5A6570';
  }
}

function classifyTick(mm: number, unit: UnitSystem): TickKind {
  const major = majorTickMm(unit);
  if (near(mm, major)) return 'major';
  if (near(mm, major / 2)) return 'half';
  if (unit === 'inch') {
    if (near(mm, major / 4)) return 'quarter';
    if (near(mm, major / 8)) return 'eighth';
  } else {
    // cm mode: 5 mm is half; no quarter/eighth beyond mm minors
    if (near(mm, 5)) return 'half';
  }
  return 'minor';
}

/** Prefer denser labels when major ticks are spaced enough on screen. */
function shouldLabel(
  kind: TickKind,
  unit: UnitSystem,
  majorDp: number,
): { label: boolean; size: 'lg' | 'sm' } {
  if (kind === 'major') return { label: true, size: 'lg' };
  if (kind === 'half' && majorDp >= 28) return { label: true, size: 'sm' };
  if (unit === 'inch' && kind === 'quarter' && majorDp >= 56) {
    return { label: true, size: 'sm' };
  }
  // Very wide cm scale: also label every 5 mm already covered by half
  return { label: false, size: 'sm' };
}

export function RulerTrack({ width, mmPerDp, unit, height = 88 }: Props) {
  const ticks = useMemo(() => {
    if (width <= 0 || mmPerDp <= 0) return [] as Tick[];
    const totalMm = width * mmPerDp;
    const minor = minorTickMm(unit);
    const major = majorTickMm(unit);
    const majorDp = mmToDp(major, mmPerDp);
    const items: Tick[] = [];
    const steps = Math.floor(totalMm / minor) + 1;
    let lastLabelX = -999;

    for (let i = 0; i <= steps; i += 1) {
      const mm = i * minor;
      if (mm > totalMm + 0.01) break;
      const x = mmToDp(mm, mmPerDp);
      if (x > width + 0.5) break;

      const kind = classifyTick(mm, unit);
      const { label: wantLabel, size } = shouldLabel(kind, unit, majorDp);
      // Keep labels readable: min ~16 dp gap (smaller for sm)
      const minGap = size === 'lg' ? 16 : 14;
      let label: string | undefined;
      if (wantLabel && (x - lastLabelX >= minGap || x < 2)) {
        label = formatTickLabel(mm, unit, kind);
        lastLabelX = x;
      }

      items.push({ x, mm, kind, label, labelSize: size });
    }
    return items;
  }, [width, mmPerDp, unit]);

  return (
    <View style={[styles.track, { height, width }]} pointerEvents="none">
      <View style={styles.trackWash} />
      <View style={styles.baseline} />
      <Text style={styles.unitTag}>{unitLabel(unit)}</Text>
      {ticks.map((t, idx) => (
        <React.Fragment key={`${t.kind}-${t.x}-${idx}`}>
          <View
            style={[
              styles.tick,
              {
                left: t.x,
                height: tickHeight(t.kind, height),
                backgroundColor: tickColor(t.kind),
                width: t.kind === 'major' ? 1.5 : StyleSheet.hairlineWidth * 2,
              },
            ]}
          />
          {t.label != null ? (
            <Text
              style={[
                styles.label,
                t.labelSize === 'sm' ? styles.labelSm : null,
                {
                  left: Math.max(0, t.x - (t.labelSize === 'sm' ? 9 : 11)),
                  top: 3,
                },
              ]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
          ) : null}
        </React.Fragment>
      ))}
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
    width: 24,
    textAlign: 'center',
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.95,
  },
  labelSm: {
    width: 22,
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.8,
    color: colors.textMuted,
  },
  unitTag: {
    position: 'absolute',
    right: 6,
    top: 3,
    color: colors.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    zIndex: 2,
  },
});

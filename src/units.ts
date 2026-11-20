/** ISO/IEC 7810 ID-1 credit-card long edge in millimetres. */
export const CREDIT_CARD_LENGTH_MM = 85.6;

/** React Native layout units are density-independent; 160 dp ≈ 1 inch. */
export const DEFAULT_MM_PER_DP = 25.4 / 160;

export type UnitSystem = 'cm' | 'inch';

export type CalibrationState = {
  /** Millimetres per density-independent pixel (layout unit). */
  mmPerDp: number;
  calibratedAt: string | null;
};

export const defaultCalibration = (): CalibrationState => ({
  mmPerDp: DEFAULT_MM_PER_DP,
  calibratedAt: null,
});

export function dpToMm(dp: number, mmPerDp: number): number {
  return dp * mmPerDp;
}

export function mmToDp(mm: number, mmPerDp: number): number {
  return mm / mmPerDp;
}

export function mmToDisplay(mm: number, unit: UnitSystem): number {
  return unit === 'cm' ? mm / 10 : mm / 25.4;
}

export function formatMeasurement(
  mm: number,
  unit: UnitSystem,
  locale?: string,
): string {
  const value = mmToDisplay(mm, unit);
  const digits = unit === 'cm' ? 2 : 3;
  try {
    return value.toLocaleString(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  } catch {
    return value.toFixed(digits);
  }
}

export function unitLabel(unit: UnitSystem): string {
  return unit === 'cm' ? 'cm' : 'in';
}

/** Tick step in mm for ruler drawing. */
export function majorTickMm(unit: UnitSystem): number {
  return unit === 'cm' ? 10 : 25.4;
}

export function minorTickMm(unit: UnitSystem): number {
  return unit === 'cm' ? 1 : 25.4 / 16;
}

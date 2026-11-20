/** ISO/IEC 7810 ID-1 credit-card long edge in millimetres. */
export const CREDIT_CARD_LENGTH_MM = 85.6;

/** React Native layout units are density-independent; 160 dp ≈ 1 inch. */
export const DEFAULT_MM_PER_DP = 25.4 / 160;

export type UnitSystem = 'inch' | 'cm' | 'mm';

/** Display order for unit selectors. */
export const UNIT_OPTIONS: UnitSystem[] = ['inch', 'cm', 'mm'];

export type CalibrationState = {
  /** Millimetres per density-independent pixel (layout unit). */
  mmPerDp: number;
  calibratedAt: string | null;
};

export const defaultCalibration = (): CalibrationState => ({
  mmPerDp: DEFAULT_MM_PER_DP,
  calibratedAt: null,
});

export function isUnitSystem(value: string | null | undefined): value is UnitSystem {
  return value === 'inch' || value === 'cm' || value === 'mm';
}

export function dpToMm(dp: number, mmPerDp: number): number {
  return dp * mmPerDp;
}

export function mmToDp(mm: number, mmPerDp: number): number {
  return mm / mmPerDp;
}

export function mmToDisplay(mm: number, unit: UnitSystem): number {
  switch (unit) {
    case 'mm':
      return mm;
    case 'cm':
      return mm / 10;
    case 'inch':
      return mm / 25.4;
  }
}

export function formatDigits(unit: UnitSystem): number {
  switch (unit) {
    case 'mm':
      return 1;
    case 'cm':
      return 2;
    case 'inch':
      return 3;
  }
}

export function formatMeasurement(
  mm: number,
  unit: UnitSystem,
  locale?: string,
): string {
  const value = mmToDisplay(mm, unit);
  const digits = formatDigits(unit);
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
  switch (unit) {
    case 'inch':
      return 'in';
    case 'cm':
      return 'cm';
    case 'mm':
      return 'mm';
  }
}

export function unitDisplayName(unit: UnitSystem): string {
  switch (unit) {
    case 'inch':
      return 'Inches';
    case 'cm':
      return 'Centimetres';
    case 'mm':
      return 'Millimetres';
  }
}

/** Major tick spacing in millimetres for ruler drawing. */
export function majorTickMm(unit: UnitSystem): number {
  switch (unit) {
    case 'mm':
      return 10;
    case 'cm':
      return 10;
    case 'inch':
      return 25.4;
  }
}

/** Finest tick spacing in millimetres. */
export function minorTickMm(unit: UnitSystem): number {
  switch (unit) {
    case 'mm':
      return 1;
    case 'cm':
      return 1;
    case 'inch':
      return 25.4 / 16;
  }
}

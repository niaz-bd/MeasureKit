import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CalibrationState,
  UnitSystem,
  defaultCalibration,
  isUnitSystem,
} from './units';

const KEYS = {
  calibration: '@visual_ruler/calibration',
  unit: '@visual_ruler/unit',
} as const;

export async function loadCalibration(): Promise<CalibrationState> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.calibration);
    if (!raw) return defaultCalibration();
    const parsed = JSON.parse(raw) as Partial<CalibrationState>;
    if (typeof parsed.mmPerDp !== 'number' || !(parsed.mmPerDp > 0)) {
      return defaultCalibration();
    }
    return {
      mmPerDp: parsed.mmPerDp,
      calibratedAt:
        typeof parsed.calibratedAt === 'string' ? parsed.calibratedAt : null,
    };
  } catch {
    return defaultCalibration();
  }
}

export async function saveCalibration(state: CalibrationState): Promise<void> {
  await AsyncStorage.setItem(KEYS.calibration, JSON.stringify(state));
}

export async function loadUnit(): Promise<UnitSystem> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.unit);
    if (isUnitSystem(raw)) return raw;
    return 'cm';
  } catch {
    return 'cm';
  }
}

export async function saveUnit(unit: UnitSystem): Promise<void> {
  await AsyncStorage.setItem(KEYS.unit, unit);
}

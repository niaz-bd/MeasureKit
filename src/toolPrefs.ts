import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AreaUnitSystem } from './geo/areaMath';
import {
  CalibrationState,
  UnitSystem,
  defaultCalibration,
  isUnitSystem,
} from './units';

/** Tools that persist their own unit / scale prefs. */
export type PrefToolId = 'ruler' | 'ar' | 'landArea' | 'speedometer';

export type { AreaUnitSystem };
export type SpeedUnit = 'kmh' | 'mph';

export type RulerPrefs = {
  unit: UnitSystem;
  calibration: CalibrationState;
};

export type ArPrefs = {
  unit: UnitSystem;
};

export type LandAreaPrefs = {
  unitSystem: AreaUnitSystem;
};

export type SpeedometerPrefs = {
  unit: SpeedUnit;
};

export type ToolPrefsMap = {
  ruler: RulerPrefs;
  ar: ArPrefs;
  landArea: LandAreaPrefs;
  speedometer: SpeedometerPrefs;
};

const LEGACY = {
  unit: '@visual_ruler/unit',
  calibration: '@visual_ruler/calibration',
} as const;

function keyFor(toolId: PrefToolId): string {
  return `@visual_ruler/tool_prefs/${toolId}`;
}

export const defaultToolPrefs: ToolPrefsMap = {
  ruler: {
    unit: 'cm',
    calibration: defaultCalibration(),
  },
  ar: {
    unit: 'cm',
  },
  landArea: {
    unitSystem: 'metric',
  },
  speedometer: {
    unit: 'kmh',
  },
};

function parseCalibration(raw: unknown): CalibrationState {
  if (!raw || typeof raw !== 'object') return defaultCalibration();
  const c = raw as Partial<CalibrationState>;
  if (typeof c.mmPerDp !== 'number' || !(c.mmPerDp > 0)) {
    return defaultCalibration();
  }
  return {
    mmPerDp: c.mmPerDp,
    calibratedAt: typeof c.calibratedAt === 'string' ? c.calibratedAt : null,
  };
}

async function migrateLegacyIntoRuler(): Promise<RulerPrefs | null> {
  try {
    const [unitRaw, calRaw] = await Promise.all([
      AsyncStorage.getItem(LEGACY.unit),
      AsyncStorage.getItem(LEGACY.calibration),
    ]);
    if (unitRaw == null && calRaw == null) return null;

    let unit: UnitSystem = 'cm';
    if (isUnitSystem(unitRaw)) unit = unitRaw;

    let calibration = defaultCalibration();
    if (calRaw) {
      try {
        calibration = parseCalibration(JSON.parse(calRaw));
      } catch {
        calibration = defaultCalibration();
      }
    }

    const prefs: RulerPrefs = { unit, calibration };
    await AsyncStorage.setItem(keyFor('ruler'), JSON.stringify(prefs));
    // Seed AR from the same legacy length unit once.
    const existingAr = await AsyncStorage.getItem(keyFor('ar'));
    if (!existingAr) {
      await AsyncStorage.setItem(
        keyFor('ar'),
        JSON.stringify({ unit } satisfies ArPrefs),
      );
    }
    await AsyncStorage.multiRemove([LEGACY.unit, LEGACY.calibration]);
    return prefs;
  } catch {
    return null;
  }
}

function normalizePrefs<T extends PrefToolId>(
  toolId: T,
  parsed: unknown,
): ToolPrefsMap[T] {
  const defaults = defaultToolPrefs[toolId];
  if (!parsed || typeof parsed !== 'object') return { ...defaults };

  if (toolId === 'ruler') {
    const p = parsed as Partial<RulerPrefs>;
    const d = defaults as RulerPrefs;
    return {
      unit: isUnitSystem(p.unit) ? p.unit : d.unit,
      calibration: parseCalibration(p.calibration),
    } as ToolPrefsMap[T];
  }
  if (toolId === 'ar') {
    const p = parsed as Partial<ArPrefs>;
    return {
      unit: isUnitSystem(p.unit) ? p.unit : (defaults as ArPrefs).unit,
    } as ToolPrefsMap[T];
  }
  if (toolId === 'landArea') {
    const p = parsed as Partial<LandAreaPrefs>;
    const sys =
      p.unitSystem === 'imperial' || p.unitSystem === 'metric'
        ? p.unitSystem
        : (defaults as LandAreaPrefs).unitSystem;
    return { unitSystem: sys } as ToolPrefsMap[T];
  }
  const p = parsed as Partial<SpeedometerPrefs>;
  const unit =
    p.unit === 'mph' || p.unit === 'kmh'
      ? p.unit
      : (defaults as SpeedometerPrefs).unit;
  return { unit } as ToolPrefsMap[T];
}

export async function loadToolPrefs<T extends PrefToolId>(
  toolId: T,
): Promise<ToolPrefsMap[T]> {
  try {
    if (toolId === 'ruler') {
      const existing = await AsyncStorage.getItem(keyFor('ruler'));
      if (!existing) {
        const migrated = await migrateLegacyIntoRuler();
        if (migrated) return migrated as ToolPrefsMap[T];
      }
    }
    const raw = await AsyncStorage.getItem(keyFor(toolId));
    if (!raw) {
      // AR may have been seeded during ruler migration.
      if (toolId === 'ar') {
        const seeded = await AsyncStorage.getItem(keyFor('ar'));
        if (seeded) {
          return normalizePrefs(toolId, JSON.parse(seeded));
        }
      }
      return { ...defaultToolPrefs[toolId] };
    }
    return normalizePrefs(toolId, JSON.parse(raw));
  } catch {
    return { ...defaultToolPrefs[toolId] };
  }
}

export async function saveToolPrefs<T extends PrefToolId>(
  toolId: T,
  prefs: ToolPrefsMap[T],
): Promise<void> {
  await AsyncStorage.setItem(keyFor(toolId), JSON.stringify(prefs));
}

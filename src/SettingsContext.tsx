import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loadCalibration, loadUnit, saveCalibration, saveUnit } from './storage';
import {
  CalibrationState,
  UnitSystem,
  defaultCalibration,
} from './units';

type SettingsContextValue = {
  ready: boolean;
  unit: UnitSystem;
  setUnit: (unit: UnitSystem) => Promise<void>;
  calibration: CalibrationState;
  applyCalibration: (mmPerDp: number) => Promise<void>;
  resetCalibration: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unit, setUnitState] = useState<UnitSystem>('cm');
  const [calibration, setCalibration] = useState<CalibrationState>(
    defaultCalibration(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [u, c] = await Promise.all([loadUnit(), loadCalibration()]);
      if (cancelled) return;
      setUnitState(u);
      setCalibration(c);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setUnit = useCallback(async (next: UnitSystem) => {
    setUnitState(next);
    await saveUnit(next);
  }, []);

  const applyCalibration = useCallback(async (mmPerDp: number) => {
    const next: CalibrationState = {
      mmPerDp,
      calibratedAt: new Date().toISOString(),
    };
    setCalibration(next);
    await saveCalibration(next);
  }, []);

  const resetCalibration = useCallback(async () => {
    const next = defaultCalibration();
    setCalibration(next);
    await saveCalibration(next);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      unit,
      setUnit,
      calibration,
      applyCalibration,
      resetCalibration,
    }),
    [ready, unit, setUnit, calibration, applyCalibration, resetCalibration],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}

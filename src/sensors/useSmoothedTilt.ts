import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  TILT_READOUT_MS,
  TILT_SAMPLE_MS,
  TILT_SENSOR_EMA,
  TILT_UI_LERP,
  tiltsFromAccel,
  type ZeroOffset,
} from './tilt';

export type SmoothedTilt = {
  available: boolean | null;
  rollDeg: number;
  pitchDeg: number;
  inclineDeg: number;
  smoothRoll: SharedValue<number>;
  smoothPitch: SharedValue<number>;
  smoothIncline: SharedValue<number>;
  zero: ZeroOffset;
  setZeroFromLatest: () => Promise<void>;
  resetZero: () => Promise<void>;
};

/**
 * Accelerometer tilt with EMA + Reanimated frame lerp (shared by spirit level / inclinometer).
 */
export function useSmoothedTilt(zeroStorageKey: string): SmoothedTilt {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [rollDeg, setRollDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);
  const [inclineDeg, setInclineDeg] = useState(0);
  const [zero, setZero] = useState<ZeroOffset>({ x: 0, y: 0 });

  const latest = useRef<AccelerometerMeasurement | null>(null);
  const zeroRef = useRef(zero);
  zeroRef.current = zero;

  const filteredRoll = useRef(0);
  const filteredPitch = useRef(0);
  const filteredIncline = useRef(0);
  const filterReady = useRef(false);
  const lastReadoutAt = useRef(0);

  const targetRoll = useSharedValue(0);
  const targetPitch = useSharedValue(0);
  const targetIncline = useSharedValue(0);
  const smoothRoll = useSharedValue(0);
  const smoothPitch = useSharedValue(0);
  const smoothIncline = useSharedValue(0);

  useFrameCallback(() => {
    const a = TILT_UI_LERP;
    smoothRoll.value += (targetRoll.value - smoothRoll.value) * a;
    smoothPitch.value += (targetPitch.value - smoothPitch.value) * a;
    smoothIncline.value += (targetIncline.value - smoothIncline.value) * a;
  });

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const ok = await Accelerometer.isAvailableAsync();
      if (cancelled) return;
      setAvailable(ok);
      if (!ok) return;
      try {
        const raw = await AsyncStorage.getItem(zeroStorageKey);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as ZeroOffset;
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            setZero(parsed);
          }
        }
      } catch {
        // ignore
      }
      Accelerometer.setUpdateInterval(TILT_SAMPLE_MS);
      sub = Accelerometer.addListener((m) => {
        latest.current = m;
        const t = tiltsFromAccel(m, zeroRef.current);
        if (!filterReady.current) {
          filteredRoll.current = t.rollDeg;
          filteredPitch.current = t.pitchDeg;
          filteredIncline.current = t.inclineDeg;
          filterReady.current = true;
        } else {
          const a = TILT_SENSOR_EMA;
          filteredRoll.current += (t.rollDeg - filteredRoll.current) * a;
          filteredPitch.current += (t.pitchDeg - filteredPitch.current) * a;
          filteredIncline.current +=
            (t.inclineDeg - filteredIncline.current) * a;
        }
        targetRoll.value = filteredRoll.current;
        targetPitch.value = filteredPitch.current;
        targetIncline.value = filteredIncline.current;

        const now = Date.now();
        if (now - lastReadoutAt.current >= TILT_READOUT_MS) {
          lastReadoutAt.current = now;
          setRollDeg(filteredRoll.current);
          setPitchDeg(filteredPitch.current);
          setInclineDeg(filteredIncline.current);
        }
      });
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [
    zeroStorageKey,
    targetPitch,
    targetRoll,
    targetIncline,
  ]);

  useEffect(() => {
    if (!latest.current) return;
    const t = tiltsFromAccel(latest.current, zero);
    filteredRoll.current = t.rollDeg;
    filteredPitch.current = t.pitchDeg;
    filteredIncline.current = t.inclineDeg;
    targetRoll.value = t.rollDeg;
    targetPitch.value = t.pitchDeg;
    targetIncline.value = t.inclineDeg;
    smoothRoll.value = t.rollDeg;
    smoothPitch.value = t.pitchDeg;
    smoothIncline.value = t.inclineDeg;
    setRollDeg(t.rollDeg);
    setPitchDeg(t.pitchDeg);
    setInclineDeg(t.inclineDeg);
  }, [
    zero,
    targetPitch,
    targetRoll,
    targetIncline,
    smoothPitch,
    smoothRoll,
    smoothIncline,
  ]);

  const setZeroFromLatest = async () => {
    const m = latest.current;
    if (!m) return;
    const next = { x: m.x, y: m.y };
    setZero(next);
    await AsyncStorage.setItem(zeroStorageKey, JSON.stringify(next));
  };

  const resetZero = async () => {
    const next = { x: 0, y: 0 };
    setZero(next);
    await AsyncStorage.removeItem(zeroStorageKey);
  };

  return {
    available,
    rollDeg,
    pitchDeg,
    inclineDeg,
    smoothRoll,
    smoothPitch,
    smoothIncline,
    zero,
    setZeroFromLatest,
    resetZero,
  };
}

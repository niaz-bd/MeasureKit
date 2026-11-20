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
} from './tilt';
import {
  lerpVec3,
  measurementToVec3,
  normalizeVec3,
  type Vec3,
} from './gravity';

export type SmoothedGravity = {
  available: boolean | null;
  /** Filtered gravity sample (not unit). */
  gravity: Vec3;
  smoothX: SharedValue<number>;
  smoothY: SharedValue<number>;
  smoothZ: SharedValue<number>;
  capture: () => Vec3 | null;
};

/**
 * Smoothed accelerometer gravity vector for angle-between-two-orientations.
 * Reuses the same EMA / frame-lerp rates as spirit level.
 */
export function useSmoothedGravity(): SmoothedGravity {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [gravity, setGravity] = useState<Vec3>({ x: 0, y: 0, z: 1 });

  const filtered = useRef<Vec3>({ x: 0, y: 0, z: 1 });
  const filterReady = useRef(false);
  const lastReadoutAt = useRef(0);
  const latest = useRef<AccelerometerMeasurement | null>(null);

  const targetX = useSharedValue(0);
  const targetY = useSharedValue(0);
  const targetZ = useSharedValue(1);
  const smoothX = useSharedValue(0);
  const smoothY = useSharedValue(0);
  const smoothZ = useSharedValue(1);

  useFrameCallback(() => {
    const a = TILT_UI_LERP;
    smoothX.value += (targetX.value - smoothX.value) * a;
    smoothY.value += (targetY.value - smoothY.value) * a;
    smoothZ.value += (targetZ.value - smoothZ.value) * a;
  });

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const ok = await Accelerometer.isAvailableAsync();
      if (cancelled) return;
      setAvailable(ok);
      if (!ok) return;

      Accelerometer.setUpdateInterval(TILT_SAMPLE_MS);
      sub = Accelerometer.addListener((m) => {
        latest.current = m;
        const raw = measurementToVec3(m);
        if (!filterReady.current) {
          filtered.current = raw;
          filterReady.current = true;
        } else {
          filtered.current = lerpVec3(
            filtered.current,
            raw,
            TILT_SENSOR_EMA,
          );
        }
        targetX.value = filtered.current.x;
        targetY.value = filtered.current.y;
        targetZ.value = filtered.current.z;

        const now = Date.now();
        if (now - lastReadoutAt.current >= TILT_READOUT_MS) {
          lastReadoutAt.current = now;
          setGravity({ ...filtered.current });
        }
      });
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [targetX, targetY, targetZ]);

  const capture = (): Vec3 | null => {
    if (!filterReady.current) return null;
    return normalizeVec3(filtered.current);
  };

  return {
    available,
    gravity,
    smoothX,
    smoothY,
    smoothZ,
    capture,
  };
}

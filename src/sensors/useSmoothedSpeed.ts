import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import {
  SPEED_READOUT_MS,
  SPEED_SENSOR_EMA,
  msToKmh,
  msToMph,
  sanitizeSpeedMs,
} from './speed';

export type SmoothedSpeed = {
  ready: boolean | null;
  permissionDenied: boolean;
  servicesOff: boolean;
  kmh: number;
  mph: number;
  accuracyM: number | null;
  error: string | null;
};

/**
 * Live GPS speed via expo-location, EMA-smoothed.
 */
export function useSmoothedSpeed(active: boolean): SmoothedSpeed {
  const [ready, setReady] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [servicesOff, setServicesOff] = useState(false);
  const [kmh, setKmh] = useState(0);
  const [mph, setMph] = useState(0);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredMs = useRef(0);
  const filterReady = useRef(false);
  const lastReadoutAt = useRef(0);

  useEffect(() => {
    if (!active) {
      setReady(null);
      return;
    }

    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (cancelled) return;
        if (!enabled) {
          setServicesOff(true);
          setReady(false);
          setError('Location services are turned off.');
          return;
        }
        setServicesOff(false);

        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          setPermissionDenied(true);
          setReady(false);
          setError('Location permission is required.');
          return;
        }
        setPermissionDenied(false);

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 500,
            distanceInterval: 0,
          },
          (pos) => {
            if (cancelled) return;
            const raw = sanitizeSpeedMs(pos.coords.speed);
            if (!filterReady.current) {
              filteredMs.current = raw;
              filterReady.current = true;
            } else {
              filteredMs.current +=
                (raw - filteredMs.current) * SPEED_SENSOR_EMA;
            }
            const now = Date.now();
            if (now - lastReadoutAt.current >= SPEED_READOUT_MS) {
              lastReadoutAt.current = now;
              const ms = filteredMs.current;
              setKmh(msToKmh(ms));
              setMph(msToMph(ms));
              setAccuracyM(
                pos.coords.accuracy != null && Number.isFinite(pos.coords.accuracy)
                  ? pos.coords.accuracy
                  : null,
              );
            }
          },
        );
        if (cancelled) {
          sub.remove();
          return;
        }
        setReady(true);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setReady(false);
          setError(
            e instanceof Error ? e.message : 'Could not start GPS speed',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      filterReady.current = false;
      sub?.remove();
    };
  }, [active]);

  return {
    ready,
    permissionDenied,
    servicesOff,
    kmh,
    mph,
    accuracyM,
    error,
  };
}

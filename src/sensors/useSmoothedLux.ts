import { LightSensor } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  LIGHT_READOUT_MS,
  LIGHT_SAMPLE_MS,
  LIGHT_SENSOR_EMA,
  LIGHT_UI_LERP,
  type LightSource,
} from './light';

export type SmoothedLux = {
  /** null = probing, false = no ambient light sensor (use camera fallback). */
  sensorAvailable: boolean | null;
  lux: number;
  smoothLux: SharedValue<number>;
  source: LightSource | null;
  /** Push an external lux sample (camera estimate). */
  ingestExternal: (lux: number) => void;
  setSource: (source: LightSource) => void;
};

export function useSmoothedLux(): SmoothedLux {
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);
  const [lux, setLux] = useState(0);
  const [source, setSource] = useState<LightSource | null>(null);

  const filtered = useRef(0);
  const filterReady = useRef(false);
  const lastReadoutAt = useRef(0);
  const preferExternal = useRef(false);

  const targetLux = useSharedValue(0);
  const smoothLux = useSharedValue(0);

  const pushSample = (raw: number) => {
    const v = Math.max(0, raw);
    if (!filterReady.current) {
      filtered.current = v;
      filterReady.current = true;
    } else {
      filtered.current += (v - filtered.current) * LIGHT_SENSOR_EMA;
    }
    targetLux.value = filtered.current;
    const now = Date.now();
    if (now - lastReadoutAt.current >= LIGHT_READOUT_MS) {
      lastReadoutAt.current = now;
      setLux(filtered.current);
    }
  };

  useFrameCallback(() => {
    smoothLux.value += (targetLux.value - smoothLux.value) * LIGHT_UI_LERP;
  });

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const ok = await LightSensor.isAvailableAsync();
      if (cancelled) return;
      setSensorAvailable(ok);
      if (!ok) return;
      if (!preferExternal.current) setSource('sensor');
      LightSensor.setUpdateInterval(LIGHT_SAMPLE_MS);
      sub = LightSensor.addListener(({ illuminance }) => {
        if (preferExternal.current) return;
        pushSample(illuminance);
      });
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLux]);

  const ingestExternal = (value: number) => {
    preferExternal.current = true;
    pushSample(value);
  };

  const setSourceAndMode = (next: LightSource) => {
    preferExternal.current = next === 'camera';
    setSource(next);
  };

  return {
    sensorAvailable,
    lux,
    smoothLux,
    source,
    ingestExternal,
    setSource: setSourceAndMode,
  };
}

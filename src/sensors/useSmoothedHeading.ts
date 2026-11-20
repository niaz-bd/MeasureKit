import { Magnetometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  HEADING_READOUT_MS,
  HEADING_SAMPLE_MS,
  HEADING_SENSOR_EMA,
  HEADING_UI_LERP,
  headingFromMagnetometer,
  lerpAngle,
  normalizeDeg,
} from './heading';

function orientationOffsetDeg(
  orientation: ScreenOrientation.Orientation,
): number {
  switch (orientation) {
    case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
      return 90;
    case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
      return -90;
    case ScreenOrientation.Orientation.PORTRAIT_DOWN:
      return 180;
    default:
      return 0;
  }
}

export type SmoothedHeading = {
  available: boolean | null;
  headingDeg: number;
  smoothHeading: SharedValue<number>;
};

export function useSmoothedHeading(): SmoothedHeading {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [headingDeg, setHeadingDeg] = useState(0);

  const filtered = useRef(0);
  const filterReady = useRef(false);
  const lastReadoutAt = useRef(0);
  const orientOffset = useRef(0);

  const targetHeading = useSharedValue(0);
  const smoothHeading = useSharedValue(0);

  useFrameCallback(() => {
    const from = smoothHeading.value;
    const to = targetHeading.value;
    const delta = ((to - from + 540) % 360) - 180;
    smoothHeading.value = (from + delta * HEADING_UI_LERP + 360) % 360;
  });

  useEffect(() => {
    let magSub: { remove: () => void } | null = null;
    let orientSub: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const ok = await Magnetometer.isAvailableAsync();
      if (cancelled) return;
      setAvailable(ok);
      if (!ok) return;

      try {
        const o = await ScreenOrientation.getOrientationAsync();
        orientOffset.current = orientationOffsetDeg(o);
      } catch {
        orientOffset.current = 0;
      }

      orientSub = ScreenOrientation.addOrientationChangeListener((e) => {
        orientOffset.current = orientationOffsetDeg(
          e.orientationInfo.orientation,
        );
      });

      Magnetometer.setUpdateInterval(HEADING_SAMPLE_MS);
      magSub = Magnetometer.addListener(({ x, y }) => {
        const raw = headingFromMagnetometer(x, y, orientOffset.current);
        if (!filterReady.current) {
          filtered.current = raw;
          filterReady.current = true;
        } else {
          filtered.current = lerpAngle(
            filtered.current,
            raw,
            HEADING_SENSOR_EMA,
          );
        }
        targetHeading.value = filtered.current;

        const now = Date.now();
        if (now - lastReadoutAt.current >= HEADING_READOUT_MS) {
          lastReadoutAt.current = now;
          setHeadingDeg(normalizeDeg(filtered.current));
        }
      });
    })();

    return () => {
      cancelled = true;
      magSub?.remove();
      orientSub?.remove();
    };
  }, [targetHeading]);

  return { available, headingDeg, smoothHeading };
}

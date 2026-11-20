import { useEffect, useRef, useState } from 'react';

import { hasExponentAv } from '../av/avAvailability';
import { loadExpoAv } from '../av/loadExpoAv';
import {
  SOUND_READOUT_MS,
  SOUND_SAMPLE_MS,
  SOUND_SENSOR_EMA,
  meteringToDb,
} from './sound';

export type SmoothedDb = {
  /** null while requesting permission / starting */
  ready: boolean | null;
  permissionDenied: boolean;
  nativeMissing: boolean;
  db: number;
  peakDb: number;
  error: string | null;
  resetPeak: () => void;
};

/**
 * Live mic level via expo-av Recording metering, EMA-smoothed.
 * No-ops safely when ExponentAV is missing (Expo Go without AV, etc.).
 */
export function useSmoothedDb(active: boolean): SmoothedDb {
  const [ready, setReady] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [nativeMissing, setNativeMissing] = useState(false);
  const [db, setDb] = useState(0);
  const [peakDb, setPeakDb] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const filtered = useRef(0);
  const filterReady = useRef(false);
  const lastReadoutAt = useRef(0);
  const peakRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setReady(null);
      return;
    }

    if (!hasExponentAv()) {
      setNativeMissing(true);
      setReady(false);
      setError('Sound meter needs expo-av (ExponentAV). Not available in this runtime.');
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recording: any = null;

    (async () => {
      const av = loadExpoAv();
      const Audio = av?.Audio;
      if (!Audio) {
        if (!cancelled) {
          setNativeMissing(true);
          setReady(false);
          setError('Could not load expo-av.');
        }
        return;
      }

      try {
        const perm = await Audio.requestPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          setPermissionDenied(true);
          setReady(false);
          setError('Microphone permission is required.');
          return;
        }
        setPermissionDenied(false);

        // Use numeric interruption modes — avoid Audio.InterruptionMode* which
        // is not always attached to the Audio namespace (caused "mode" crashes).
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1, // DoNotMix
          interruptionModeAndroid: 1, // DoNotMix
        });
        if (cancelled) return;

        const rec = new Audio.Recording();
        const presets = Audio.RecordingOptionsPresets?.LOW_QUALITY ?? {
          isMeteringEnabled: true,
        };
        await rec.prepareToRecordAsync({
          ...presets,
          isMeteringEnabled: true,
        });
        rec.setProgressUpdateInterval(SOUND_SAMPLE_MS);
        rec.setOnRecordingStatusUpdate(
          (status: {
            isRecording?: boolean;
            metering?: number;
          }) => {
            if (!status.isRecording || status.metering == null) return;
            const raw = meteringToDb(status.metering);
            if (!filterReady.current) {
              filtered.current = raw;
              filterReady.current = true;
            } else {
              filtered.current +=
                (raw - filtered.current) * SOUND_SENSOR_EMA;
            }
            if (filtered.current > peakRef.current) {
              peakRef.current = filtered.current;
            }
            const now = Date.now();
            if (now - lastReadoutAt.current >= SOUND_READOUT_MS) {
              lastReadoutAt.current = now;
              setDb(filtered.current);
              setPeakDb(peakRef.current);
            }
          },
        );
        await rec.startAsync();
        if (cancelled) {
          await rec.stopAndUnloadAsync().catch(() => undefined);
          return;
        }
        recording = rec;
        setNativeMissing(false);
        setReady(true);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setReady(false);
          const msg =
            e instanceof Error ? e.message : 'Could not start microphone';
          if (/ExponentAV|native module/i.test(msg)) {
            setNativeMissing(true);
          }
          setError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      filterReady.current = false;
      const rec = recording;
      recording = null;
      if (rec) {
        try {
          rec.setOnRecordingStatusUpdate(null);
          rec.stopAndUnloadAsync().catch(() => undefined);
        } catch {
          // ignore
        }
      }
    };
  }, [active]);

  const resetPeak = () => {
    peakRef.current = filtered.current;
    setPeakDb(filtered.current);
  };

  return {
    ready,
    permissionDenied,
    nativeMissing,
    db,
    peakDb,
    error,
    resetPeak,
  };
}

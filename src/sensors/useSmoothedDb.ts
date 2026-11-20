import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';

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
  db: number;
  peakDb: number;
  error: string | null;
  resetPeak: () => void;
};

/**
 * Live mic level via expo-av Recording metering, EMA-smoothed.
 */
export function useSmoothedDb(active: boolean): SmoothedDb {
  const [ready, setReady] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
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

    let cancelled = false;
    let recording: Audio.Recording | null = null;

    (async () => {
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

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        if (cancelled) return;

        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync({
          ...Audio.RecordingOptionsPresets.LOW_QUALITY,
          isMeteringEnabled: true,
        });
        rec.setProgressUpdateInterval(SOUND_SAMPLE_MS);
        rec.setOnRecordingStatusUpdate((status) => {
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
        });
        await rec.startAsync();
        if (cancelled) {
          await rec.stopAndUnloadAsync().catch(() => undefined);
          return;
        }
        recording = rec;
        setReady(true);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setReady(false);
          setError(
            e instanceof Error ? e.message : 'Could not start microphone',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      filterReady.current = false;
      const rec = recording;
      recording = null;
      if (rec) {
        rec.setOnRecordingStatusUpdate(null);
        rec.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [active]);

  const resetPeak = () => {
    peakRef.current = filtered.current;
    setPeakDb(filtered.current);
  };

  return { ready, permissionDenied, db, peakDb, error, resetPeak };
}

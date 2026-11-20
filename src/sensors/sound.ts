/** Poll interval for recording status / metering. */
export const SOUND_SAMPLE_MS = 80;
/** EMA toward raw dB. */
export const SOUND_SENSOR_EMA = 0.22;
/** React readout throttle. */
export const SOUND_READOUT_MS = 80;

/** Typical display range for a phone mic sound meter (dBFS offset → relative dB). */
export const SOUND_DB_MIN = 0;
export const SOUND_DB_MAX = 100;

/**
 * Convert expo-av metering (dBFS, typically −160…0) to a relative dB SPL-like scale.
 * Not a calibrated SPL meter — phone mics vary widely.
 */
export function meteringToDb(metering: number | undefined | null): number {
  if (metering == null || !Number.isFinite(metering)) return 0;
  // Map −160…0 dBFS → 0…100 display dB
  const clamped = Math.min(0, Math.max(-160, metering));
  return ((clamped + 160) / 160) * SOUND_DB_MAX;
}

export function formatDb(db: number): string {
  if (!Number.isFinite(db)) return '—';
  return db.toFixed(1);
}

export function soundSceneLabel(db: number): string {
  if (!Number.isFinite(db) || db <= 0) return 'Silence';
  if (db < 20) return 'Very quiet';
  if (db < 40) return 'Quiet';
  if (db < 55) return 'Moderate';
  if (db < 70) return 'Loud';
  if (db < 85) return 'Very loud';
  return 'Extreme';
}

/** 0–1 bar fill for display dB. */
export function dbToBar(db: number): number {
  return Math.min(
    1,
    Math.max(0, (db - SOUND_DB_MIN) / (SOUND_DB_MAX - SOUND_DB_MIN)),
  );
}

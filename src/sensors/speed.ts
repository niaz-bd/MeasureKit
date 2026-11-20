/** EMA toward raw speed (m/s). */
export const SPEED_SENSOR_EMA = 0.2;
/** How often to push readouts to React. */
export const SPEED_READOUT_MS = 100;

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export function msToMph(ms: number): number {
  return ms * 2.23693629;
}

/** Clamp invalid GPS speed readings (null / negative). */
export function sanitizeSpeedMs(speed: number | null | undefined): number {
  if (speed == null || !Number.isFinite(speed) || speed < 0) return 0;
  // Ignore absurd spikes (> ~400 km/h)
  if (speed > 120) return 120;
  return speed;
}

export function formatSpeed(value: number, digits = 1): string {
  if (!Number.isFinite(value) || value < 0.05) return '0.0';
  return value.toFixed(digits);
}

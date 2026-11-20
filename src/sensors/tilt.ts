import type { AccelerometerMeasurement } from 'expo-sensors';

/** Sensor poll interval — ~60 Hz. */
export const TILT_SAMPLE_MS = 16;
/** EMA blend toward raw tilt each sample (0–1). Lower = smoother. */
export const TILT_SENSOR_EMA = 0.18;
/** UI lerp factor per frame toward filtered tilt. */
export const TILT_UI_LERP = 0.22;
/** How often to push °/% text to React (~12 Hz). */
export const TILT_READOUT_MS = 80;

export type ZeroOffset = { x: number; y: number };

export function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

export function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function tiltsFromAccel(
  { x, y, z }: AccelerometerMeasurement,
  zero: ZeroOffset,
): { rollDeg: number; pitchDeg: number; inclineDeg: number } {
  const ax = x - zero.x;
  const ay = y - zero.y;
  const az = z;
  const rollDeg = radToDeg(Math.atan2(ax, Math.hypot(ay, az)));
  const pitchDeg = radToDeg(Math.atan2(ay, Math.hypot(ax, az)));
  // Absolute surface incline from horizontal (device lying on a slope).
  const inclineDeg = radToDeg(Math.atan2(Math.hypot(ax, ay), az));
  return { rollDeg, pitchDeg, inclineDeg };
}

export function pctFromDeg(deg: number): string {
  return `${(Math.sin(degToRad(deg)) * 100).toFixed(1)}%`;
}

/** Percent grade: rise/run × 100. */
export function gradeFromDeg(deg: number): string {
  return `${(Math.tan(degToRad(deg)) * 100).toFixed(1)}%`;
}

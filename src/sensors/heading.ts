/** Magnetometer poll — ~60 Hz. */
export const HEADING_SAMPLE_MS = 16;
/** EMA toward raw heading each sample (circular). */
export const HEADING_SENSOR_EMA = 0.2;
/** Frame lerp toward filtered heading. */
export const HEADING_UI_LERP = 0.2;
/** React readout throttle. */
export const HEADING_READOUT_MS = 80;

const CARDINALS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Normalize degrees into [0, 360). */
export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Shortest signed delta from `from` to `to` in (−180, 180].
 */
export function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function lerpAngle(from: number, to: number, t: number): number {
  return normalizeDeg(from + shortestAngleDelta(from, to) * t);
}

/**
 * Compass heading (0° = North, clockwise) from magnetometer while device is roughly flat.
 * `orientationOffset` compensates portrait / landscape.
 */
export function headingFromMagnetometer(
  x: number,
  y: number,
  orientationOffset = 0,
): number {
  // atan2(x, y): 0 when +Y (phone top) aligns with magnetic north on many Android devices
  let deg = (Math.atan2(x, y) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return normalizeDeg(deg + orientationOffset);
}

export function cardinalFromDeg(deg: number): string {
  const i = Math.round(normalizeDeg(deg) / 45) % 8;
  return CARDINALS_8[i];
}

export function formatHeading(deg: number): string {
  return `${normalizeDeg(deg).toFixed(0)}°`;
}

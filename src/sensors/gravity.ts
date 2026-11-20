import type { AccelerometerMeasurement } from 'expo-sensors';

import { radToDeg } from './tilt';

export type Vec3 = { x: number; y: number; z: number };

export function normalizeVec3(v: Vec3): Vec3 {
  const n = Math.hypot(v.x, v.y, v.z);
  if (n < 1e-6) return { x: 0, y: 0, z: 1 };
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

export function lerpVec3(from: Vec3, to: Vec3, t: number): Vec3 {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
  };
}

/** Angle in degrees between two orientation samples (gravity / device axes). */
export function angleBetweenVec3(a: Vec3, b: Vec3): number {
  const na = normalizeVec3(a);
  const nb = normalizeVec3(b);
  const dot = Math.min(1, Math.max(-1, na.x * nb.x + na.y * nb.y + na.z * nb.z));
  return radToDeg(Math.acos(dot));
}

export function measurementToVec3(m: AccelerometerMeasurement): Vec3 {
  return { x: m.x, y: m.y, z: m.z };
}

/** Acute-or-obtuse pair useful for corners: θ and 180−θ (both ≥ 0). */
export function cornerAngles(deg: number): { primary: number; supplement: number } {
  const primary = Math.min(Math.abs(deg), 180);
  return { primary, supplement: 180 - primary };
}

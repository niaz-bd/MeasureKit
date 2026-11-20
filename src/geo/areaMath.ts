export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6378137;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two WGS84 points (metres). */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Closed-ring perimeter (metres). Needs ≥ 2 points. */
export function perimeterM(points: LatLng[]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    // Only close the ring when we have a polygon (≥ 3)
    if (i === points.length - 1 && points.length < 3) break;
    sum += haversineM(points[i], next);
  }
  return sum;
}

/**
 * Spherical polygon area on a sphere (m²) via excess angle.
 * Sign ignored (absolute). Needs ≥ 3 points.
 */
export function polygonAreaM2(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const n = points.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    total +=
      toRad(points[j].longitude - points[i].longitude) *
      (2 +
        Math.sin(toRad(points[i].latitude)) +
        Math.sin(toRad(points[j].latitude)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function formatArea(m2: number): { value: string; unit: string } {
  if (!Number.isFinite(m2) || m2 <= 0) return { value: '0', unit: 'm²' };
  if (m2 >= 1_000_000) {
    return { value: (m2 / 1_000_000).toFixed(3), unit: 'km²' };
  }
  if (m2 >= 10_000) {
    return { value: (m2 / 10_000).toFixed(3), unit: 'ha' };
  }
  if (m2 >= 100) {
    return { value: m2.toFixed(1), unit: 'm²' };
  }
  return { value: m2.toFixed(2), unit: 'm²' };
}

export function formatLength(m: number): { value: string; unit: string } {
  if (!Number.isFinite(m) || m <= 0) return { value: '0', unit: 'm' };
  if (m >= 1000) {
    return { value: (m / 1000).toFixed(3), unit: 'km' };
  }
  return { value: m.toFixed(1), unit: 'm' };
}

/** Skip GPS samples closer than this to the last point (metres). */
export const GPS_MIN_STEP_M = 2.5;

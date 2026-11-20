/** Light sensor / camera sample interval. */
export const LIGHT_SAMPLE_MS = 100;
/** EMA toward raw lux. */
export const LIGHT_SENSOR_EMA = 0.18;
/** Frame lerp for UI needle / bar. */
export const LIGHT_UI_LERP = 0.2;
/** React readout throttle. */
export const LIGHT_READOUT_MS = 80;

export type LightSource = 'sensor' | 'camera';

export function formatLux(lux: number): string {
  if (!Number.isFinite(lux) || lux < 0) return '—';
  if (lux < 10) return lux.toFixed(1);
  if (lux < 1000) return lux.toFixed(0);
  if (lux < 10000) return (lux / 1000).toFixed(2) + 'k';
  return (lux / 1000).toFixed(1) + 'k';
}

export function lightSceneLabel(lux: number): string {
  if (!Number.isFinite(lux) || lux < 0) return 'No reading';
  if (lux < 1) return 'Very dark';
  if (lux < 10) return 'Dark';
  if (lux < 50) return 'Dim indoor';
  if (lux < 200) return 'Indoor';
  if (lux < 1000) return 'Bright indoor';
  if (lux < 10000) return 'Daylight (shade)';
  if (lux < 30000) return 'Daylight';
  return 'Direct sun';
}

/** Map lux to 0–1 on a log scale for the meter bar (1 … 100_000 lx). */
export function luxToBar(lux: number): number {
  const clamped = Math.min(100_000, Math.max(1, lux));
  const t = Math.log10(clamped) / 5; // 10^0 … 10^5
  return Math.min(1, Math.max(0, t));
}

function parseRational(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    if (v.includes('/')) {
      const [a, b] = v.split('/').map(Number);
      if (b) return a / b;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (v && typeof v === 'object') {
    const o = v as { numerator?: number; denominator?: number };
    if (
      typeof o.numerator === 'number' &&
      typeof o.denominator === 'number' &&
      o.denominator !== 0
    ) {
      return o.numerator / o.denominator;
    }
  }
  return null;
}

/**
 * Approximate lux from capture EXIF (BrightnessValue or EV from ISO/shutter/aperture).
 * Camera estimates are approximate — not a calibrated photometer.
 */
export function luxFromExif(exif: Record<string, unknown> | null | undefined): number | null {
  if (!exif) return null;

  const bv = parseRational(
    exif.BrightnessValue ?? exif.Brightness ?? exif.brightnessValue,
  );
  if (bv != null) {
    // Photographic BrightnessValue (APEX) → rough lux
    return Math.max(0, Math.pow(2, bv) * 2.5);
  }

  const iso = Number(
    exif.ISOSpeedRatings ??
      exif.PhotographicSensitivity ??
      exif.ISO ??
      exif.IsoSpeedRatings,
  );
  const exposure = parseRational(exif.ExposureTime ?? exif.ShutterSpeedValue);
  const fNum =
    parseRational(exif.FNumber) ??
    (() => {
      const av = parseRational(exif.ApertureValue);
      // ApertureValue is APEX: Av = log2(N^2) → N = 2^(Av/2)
      return av != null ? Math.pow(2, av / 2) : null;
    })();

  if (Number.isFinite(iso) && iso > 0 && exposure && exposure > 0 && fNum && fNum > 0) {
    const ev = Math.log2((fNum * fNum) / exposure) + Math.log2(iso / 100);
    return Math.max(0, 2.5 * Math.pow(2, ev));
  }

  return null;
}

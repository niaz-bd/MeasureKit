import { hasExponentAv } from './avAvailability';

export type ExpoAvModule = typeof import('expo-av');
export type ExpoAvAudio = ExpoAvModule['Audio'];

/**
 * Lazily load expo-av only when ExponentAV exists.
 * Never call this when hasExponentAv() is false — require() would still init the native bridge.
 */
export function loadExpoAv(): ExpoAvModule | null {
  if (!hasExponentAv()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-av') as ExpoAvModule;
  } catch {
    return null;
  }
}

export function loadExpoAvAudio(): ExpoAvAudio | null {
  return loadExpoAv()?.Audio ?? null;
}

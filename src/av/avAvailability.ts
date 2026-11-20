import { requireOptionalNativeModule } from 'expo-modules-core';
import { NativeModules, Platform } from 'react-native';

/**
 * True when the expo-av native module (ExponentAV) is linked.
 * Safe to call without importing `expo-av` (which crashes if ExponentAV is missing).
 */
export function hasExponentAv(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    if (requireOptionalNativeModule('ExponentAV') != null) return true;
  } catch {
    // fall through
  }
  try {
    return NativeModules.ExponentAV != null;
  } catch {
    return false;
  }
}

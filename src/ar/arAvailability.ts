import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/** Expo Go cannot load Viro / ARCore native binaries. */
export function isExpoGo(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo'
  );
}

/**
 * True when Viro native AR modules are linked (dev client / run:android).
 * Never import @reactvision/react-viro before this returns true.
 */
export function hasViroNative(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  try {
    return (
      NativeModules.VRTARSceneNavigatorModule != null ||
      NativeModules.VRTARUtils != null ||
      NativeModules.VRTSceneNavigatorModule != null
    );
  } catch {
    return false;
  }
}

export function canUseArMeasure(): boolean {
  return hasViroNative();
}

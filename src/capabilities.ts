import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import {
  Accelerometer,
  LightSensor,
  Magnetometer,
} from 'expo-sensors';
import { Platform } from 'react-native';

import { canUseArMeasure, isExpoGo } from './ar/arAvailability';
import type { RootStackParamList } from './types';

export type FeatureRoute = keyof RootStackParamList;

export type FeatureId =
  | 'ruler'
  | 'ar'
  | 'level'
  | 'inclinometer'
  | 'compass'
  | 'angleMeter'
  | 'landArea'
  | 'lightMeter'
  | 'settings';

export type FeatureCapability = {
  id: FeatureId;
  route: FeatureRoute;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  available: boolean;
  reason?: string;
};

type Probe = Omit<FeatureCapability, 'available' | 'reason'> & {
  check: () => Promise<{ available: boolean; reason?: string }>;
};

const FEATURE_PROBES: Probe[] = [
  {
    id: 'ruler',
    route: 'Measure',
    title: 'Ruler',
    subtitle: 'On-screen measure',
    icon: 'ruler',
    check: async () => ({ available: true }),
  },
  {
    id: 'ar',
    route: 'ArMeasure',
    title: 'AR measure',
    subtitle: 'Real-world tap measure',
    icon: 'cube-scan',
    check: async () => {
      if (canUseArMeasure()) return { available: true };
      if (isExpoGo()) {
        return {
          available: false,
          reason: 'Needs native build (expo run:android), not Expo Go',
        };
      }
      return {
        available: false,
        reason: 'ARCore / Viro not available on this device',
      };
    },
  },
  {
    id: 'level',
    route: 'Level',
    title: 'Spirit level',
    subtitle: 'Bubble level',
    icon: 'spirit-level',
    check: async () => {
      const ok = await Accelerometer.isAvailableAsync();
      return ok
        ? { available: true }
        : { available: false, reason: 'Accelerometer not available' };
    },
  },
  {
    id: 'inclinometer',
    route: 'Inclinometer',
    title: 'Inclinometer',
    subtitle: 'Surface angle gauge',
    icon: 'angle-acute',
    check: async () => {
      const ok = await Accelerometer.isAvailableAsync();
      return ok
        ? { available: true }
        : { available: false, reason: 'Accelerometer not available' };
    },
  },
  {
    id: 'compass',
    route: 'Compass',
    title: 'Compass',
    subtitle: 'Magnetic heading',
    icon: 'compass-outline',
    check: async () => {
      const ok = await Magnetometer.isAvailableAsync();
      return ok
        ? { available: true }
        : { available: false, reason: 'Magnetometer not available' };
    },
  },
  {
    id: 'angleMeter',
    route: 'AngleMeter',
    title: 'Angle meter',
    subtitle: 'Two-edge capture',
    icon: 'angle-right',
    check: async () => {
      const ok = await Accelerometer.isAvailableAsync();
      return ok
        ? { available: true }
        : { available: false, reason: 'Accelerometer not available' };
    },
  },
  {
    id: 'landArea',
    route: 'LandArea',
    title: 'Land area',
    subtitle: 'Map & GPS walk',
    icon: 'vector-polygon',
    check: async () => {
      if (Platform.OS === 'web') {
        return { available: false, reason: 'Maps not supported on web' };
      }
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          return {
            available: false,
            reason: 'Location services are turned off',
          };
        }
        return { available: true };
      } catch {
        return {
          available: false,
          reason: 'Location services unavailable',
        };
      }
    },
  },
  {
    id: 'lightMeter',
    route: 'LightMeter',
    title: 'Light meter',
    subtitle: 'Ambient lux',
    icon: 'white-balance-sunny',
    check: async () => {
      const sensor = await LightSensor.isAvailableAsync();
      if (sensor) return { available: true };
      try {
        const cam = await CameraView.isAvailableAsync();
        if (cam) return { available: true };
      } catch {
        // fall through
      }
      return {
        available: false,
        reason: 'No light sensor or camera on this device',
      };
    },
  },
  {
    id: 'settings',
    route: 'Settings',
    title: 'Settings',
    subtitle: 'Units & calibration',
    icon: 'cog-outline',
    check: async () => ({ available: true }),
  },
];

export async function probeFeatureCapabilities(): Promise<FeatureCapability[]> {
  return Promise.all(
    FEATURE_PROBES.map(async (f) => {
      try {
        const { available, reason } = await f.check();
        return {
          id: f.id,
          route: f.route,
          title: f.title,
          subtitle: f.subtitle,
          icon: f.icon,
          available,
          reason: available ? undefined : reason,
        } satisfies FeatureCapability;
      } catch {
        return {
          id: f.id,
          route: f.route,
          title: f.title,
          subtitle: f.subtitle,
          icon: f.icon,
          available: false,
          reason: 'Could not check this feature',
        } satisfies FeatureCapability;
      }
    }),
  );
}

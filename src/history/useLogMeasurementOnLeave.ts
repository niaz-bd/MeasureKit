import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';

import {
  logMeasurement,
  type LogMeasurementInput,
} from './measureHistory';

/**
 * When the screen blurs, log the latest payload from `getPayload` if non-null.
 */
export function useLogMeasurementOnLeave(
  toolId: string,
  toolName: string,
  getPayload: () => Omit<LogMeasurementInput, 'toolId' | 'toolName'> | null,
) {
  const getRef = useRef(getPayload);
  getRef.current = getPayload;

  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          const payload = getRef.current();
          if (!payload) return;
          logMeasurement({
            toolId,
            toolName,
            summary: payload.summary,
            values: payload.values,
          }).catch(() => undefined);
        } catch {
          // ignore
        }
      };
    }, [toolId, toolName]),
  );
}

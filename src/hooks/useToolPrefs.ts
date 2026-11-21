import { useCallback, useEffect, useState } from 'react';

import {
  defaultToolPrefs,
  loadToolPrefs,
  saveToolPrefs,
  type PrefToolId,
  type ToolPrefsMap,
} from '../toolPrefs';

/**
 * Load + persist prefs for a single tool. Ready becomes true after first load.
 * Call `refresh` after external writers (e.g. Calibration) mutate storage.
 */
export function useToolPrefs<T extends PrefToolId>(toolId: T) {
  const [prefs, setPrefs] = useState<ToolPrefsMap[T]>(
    () => defaultToolPrefs[toolId],
  );
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const loaded = await loadToolPrefs(toolId);
    setPrefs(loaded);
    setReady(true);
    return loaded;
  }, [toolId]);

  useEffect(() => {
    let cancelled = false;
    loadToolPrefs(toolId).then((loaded) => {
      if (cancelled) return;
      setPrefs(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [toolId]);

  const updatePrefs = useCallback(
    async (patch: Partial<ToolPrefsMap[T]>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch } as ToolPrefsMap[T];
        saveToolPrefs(toolId, next).catch(() => undefined);
        return next;
      });
    },
    [toolId],
  );

  const replacePrefs = useCallback(
    async (next: ToolPrefsMap[T]) => {
      setPrefs(next);
      await saveToolPrefs(toolId, next);
    },
    [toolId],
  );

  return { prefs, ready, updatePrefs, replacePrefs, refresh };
}

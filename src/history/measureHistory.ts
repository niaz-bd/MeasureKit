import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@visual_ruler/measure_history';
const MAX_ENTRIES = 200;
const DEDUPE_MS = 4000;

export type MeasureHistoryEntry = {
  id: string;
  /** ISO timestamp */
  at: string;
  toolId: string;
  toolName: string;
  /** One-line primary value for the list */
  summary: string;
  values: Record<string, string | number>;
};

export async function loadMeasureHistory(): Promise<MeasureHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MeasureHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        typeof e.at === 'string' &&
        typeof e.toolName === 'string' &&
        typeof e.summary === 'string',
    );
  } catch {
    return [];
  }
}

async function saveMeasureHistory(
  entries: MeasureHistoryEntry[],
): Promise<void> {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export type LogMeasurementInput = {
  toolId: string;
  toolName: string;
  summary: string;
  values?: Record<string, string | number>;
};

/**
 * Append a finalized measurement. Skips empty summaries and near-duplicate
 * consecutive entries (same tool + summary within a few seconds).
 */
export async function logMeasurement(
  input: LogMeasurementInput,
): Promise<MeasureHistoryEntry | null> {
  const summary = input.summary.trim();
  if (!summary || summary === '—' || summary === '0') return null;

  const prev = await loadMeasureHistory();
  const latest = prev[0];
  if (
    latest &&
    latest.toolId === input.toolId &&
    latest.summary === summary &&
    Date.now() - new Date(latest.at).getTime() < DEDUPE_MS
  ) {
    return null;
  }

  const entry: MeasureHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    toolId: input.toolId,
    toolName: input.toolName,
    summary,
    values: input.values ?? {},
  };
  await saveMeasureHistory([entry, ...prev]);
  return entry;
}

export async function clearMeasureHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function formatHistoryWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

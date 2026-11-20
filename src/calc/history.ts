import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@visual_ruler/calc_history';
const MAX_ENTRIES = 50;

export type CalcHistoryEntry = {
  id: string;
  expression: string;
  result: string;
  at: string;
};

export async function loadCalcHistory(): Promise<CalcHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CalcHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        typeof e.expression === 'string' &&
        typeof e.result === 'string',
    );
  } catch {
    return [];
  }
}

export async function saveCalcHistory(
  entries: CalcHistoryEntry[],
): Promise<void> {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export async function appendCalcHistory(
  expression: string,
  result: string,
): Promise<CalcHistoryEntry[]> {
  const prev = await loadCalcHistory();
  const entry: CalcHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expression,
    result,
    at: new Date().toISOString(),
  };
  const next = [entry, ...prev].slice(0, MAX_ENTRIES);
  await saveCalcHistory(next);
  return next;
}

export async function clearCalcHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

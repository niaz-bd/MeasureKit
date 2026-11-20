export type Op = '+' | '-' | '×' | '÷';

export type CalcState = {
  display: string;
  acc: number | null;
  op: Op | null;
  /** True after equals — next digit starts fresh. */
  fresh: boolean;
};

export const initialCalcState = (): CalcState => ({
  display: '0',
  acc: null,
  op: null,
  fresh: false,
});

function applyOp(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  // Avoid float junk; keep enough precision for a pocket calc.
  const s = Number(n.toPrecision(12)).toString();
  if (s.includes('e') || s.includes('E')) return n.toPrecision(8);
  return s;
}

export function inputDigit(state: CalcState, digit: string): CalcState {
  if (state.display === 'Error') {
    return { display: digit, acc: null, op: null, fresh: false };
  }
  if (state.fresh) {
    return { ...state, display: digit, fresh: false };
  }
  if (digit === '.' && state.display.includes('.')) return state;
  if (state.display === '0' && digit !== '.') {
    return { ...state, display: digit };
  }
  if (state.display === '-0' && digit !== '.') {
    return { ...state, display: `-${digit}` };
  }
  // Cap length for UI
  if (state.display.replace(/^-/, '').length >= 14) return state;
  return { ...state, display: state.display + digit };
}

export function inputOp(state: CalcState, next: Op): CalcState {
  if (state.display === 'Error') return initialCalcState();
  const cur = parseFloat(state.display);
  if (state.acc != null && state.op != null && !state.fresh) {
    const result = applyOp(state.acc, cur, state.op);
    return {
      display: formatNum(result),
      acc: Number.isFinite(result) ? result : null,
      op: Number.isFinite(result) ? next : null,
      fresh: true,
    };
  }
  return {
    display: state.display,
    acc: cur,
    op: next,
    fresh: true,
  };
}

export function inputEquals(state: CalcState): CalcState {
  if (state.display === 'Error') return initialCalcState();
  if (state.acc == null || state.op == null) return { ...state, fresh: true };
  const cur = parseFloat(state.display);
  const result = applyOp(state.acc, cur, state.op);
  return {
    display: formatNum(result),
    acc: null,
    op: null,
    fresh: true,
  };
}

export function inputClear(): CalcState {
  return initialCalcState();
}

export function inputBackspace(state: CalcState): CalcState {
  if (state.fresh || state.display === 'Error') return initialCalcState();
  if (state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith('-'))) {
    return { ...state, display: '0' };
  }
  return { ...state, display: state.display.slice(0, -1) };
}

export function inputNegate(state: CalcState): CalcState {
  if (state.display === 'Error' || state.display === '0') return state;
  if (state.display.startsWith('-')) {
    return { ...state, display: state.display.slice(1), fresh: false };
  }
  return { ...state, display: `-${state.display}`, fresh: false };
}

export function inputPercent(state: CalcState): CalcState {
  if (state.display === 'Error') return initialCalcState();
  const cur = parseFloat(state.display);
  return { ...state, display: formatNum(cur / 100), fresh: true };
}

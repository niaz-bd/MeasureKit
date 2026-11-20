import assert from 'node:assert/strict';
import {
  CREDIT_CARD_LENGTH_MM,
  DEFAULT_MM_PER_DP,
  dpToMm,
  formatMeasurement,
  mmToDp,
  mmToDisplay,
} from './units';

assert.equal(Math.round(DEFAULT_MM_PER_DP * 160 * 1000) / 1000, 25.4);
assert.equal(dpToMm(10, 0.2), 2);
assert.equal(mmToDp(85.6, CREDIT_CARD_LENGTH_MM / 500), 500);
assert.ok(Math.abs(mmToDisplay(25.4, 'inch') - 1) < 1e-9);
assert.ok(Math.abs(mmToDisplay(10, 'cm') - 1) < 1e-9);
assert.ok(Math.abs(mmToDisplay(12.3, 'mm') - 12.3) < 1e-9);
assert.ok(formatMeasurement(12.3, 'cm').includes('1'));
console.log('units.test.ts OK');

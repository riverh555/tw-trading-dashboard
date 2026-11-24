import test from 'node:test';
import assert from 'node:assert/strict';
import { initialVisibleRange, LEFT_PAD_BARS } from '../public/chart-range.js';

test('chart range: left padding keeps the first bar away from the left edge', () => {
  assert.deepEqual(initialVisibleRange(100), { from: -LEFT_PAD_BARS, to: 99 });
  assert.deepEqual(initialVisibleRange(3, 2), { from: -2, to: 2 });
  assert.deepEqual(initialVisibleRange(5, 0), { from: 0, to: 4 });
});

test('chart range: empty or invalid data has no visible range', () => {
  for (const n of [0, -1, NaN, undefined, null, '10']) assert.equal(initialVisibleRange(n), null);
});

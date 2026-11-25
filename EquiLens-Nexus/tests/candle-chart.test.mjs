import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeBars, formatLegendValue, numBars } from '../public/candle-chart.js';

const b = (time, close) => ({ time, open: close, high: close, low: close, close, volume: 1 });

test('candle chart: mergeBars merges older bars in front, dedupes by time, keeps existing on conflict', () => {
  const cur = [b(100, 10), b(200, 20), b(300, 30)];
  const older = [b(50, 5), b(100, 99), b(150, 15)];
  const merged = mergeBars(cur, older);
  assert.deepEqual(merged.map(x => x.time), [50, 100, 150, 200, 300]);
  assert.equal(merged.find(x => x.time === 100).close, 10); // existing wins
  assert.deepEqual(mergeBars(cur, []), cur);
  assert.deepEqual(mergeBars([], older).map(x => x.time), [50, 100, 150]);
});

test('candle chart: numBars converts day labels to Taipei epoch seconds', () => {
  const out = numBars([{ time: '2026-11-25', open: 1, high: 2, low: 0, close: 1.5, volume: 3 }]);
  assert.equal(out[0].time, Math.floor(Date.parse('2026-11-25T00:00:00+08:00') / 1000));
  assert.equal(out[0].volume, 3);
  assert.deepEqual(numBars([]), []);
});

test('candle chart: numBars accepts /api/chart array rows and datetime strings', () => {
  const out = numBars([['2026-11-25 09:30', 700, 705, 698, 702, 120], ['2026-11-24', 690, 700, 685, 695, 5000]]);
  assert.equal(out[0].time, Math.floor(Date.parse('2026-11-25T09:30:00+08:00') / 1000));
  assert.equal(out[0].close, 702);
  assert.equal(out[1].time, Math.floor(Date.parse('2026-11-24T00:00:00+08:00') / 1000));
  const obj = numBars([{ time: '2026-11-25 09:30', open: 1, high: 2, low: 0, close: 1.5, volume: 3 }]);
  assert.equal(obj[0].time, Math.floor(Date.parse('2026-11-25T09:30:00+08:00') / 1000));
});

test('candle chart: formatLegendValue never shows NaN', () => {
  assert.equal(formatLegendValue(12.3456), '12.35');
  assert.equal(formatLegendValue(null), '—');
  assert.equal(formatLegendValue(undefined), '—');
  assert.equal(formatLegendValue(NaN), '—');
  assert.equal(formatLegendValue('abc'), '—');
  assert.equal(formatLegendValue(0), '0.00');
});

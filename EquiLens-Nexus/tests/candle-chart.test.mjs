import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeBars, formatLegendValue, numBars, barLabel } from '../public/candle-chart.js';

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

test('candle chart: mergeBars with fresh data as existing lets fresh win and keeps older bars', () => {
  const old = [b(50, 5), b(100, 10), b(200, 20)];
  const fresh = [b(100, 99), b(200, 21), b(300, 30)];
  const merged = mergeBars(fresh, old);
  assert.deepEqual(merged.map(x => x.time), [50, 100, 200, 300]);
  assert.equal(merged.find(x => x.time === 100).close, 99); // fresh wins on conflict
  assert.equal(merged.find(x => x.time === 50).close, 5); // older bars kept
  assert.deepEqual(mergeBars([], old), old); // empty fresh keeps chart bars
});

test('candle chart: barLabel shows HH:MM for intraday bars, date only at midnight', () => {
  const t1330 = Math.floor(Date.parse('2026-11-25T13:30:00+08:00') / 1000);
  const label = barLabel({ time: t1330, open: 710, high: 716, low: 710, close: 716 });
  assert.ok(label.includes('2026-11-25 13:30'), label);
  const tMid = Math.floor(Date.parse('2026-11-24T00:00:00+08:00') / 1000);
  const dayLabel = barLabel({ time: tMid, open: 734, high: 734, low: 734, close: 734 });
  assert.ok(dayLabel.includes('2026-11-24'), dayLabel);
  assert.ok(!dayLabel.includes('00:00'), dayLabel);
  assert.equal(barLabel(null), '');
});

test('candle chart: formatLegendValue never shows NaN', () => {
  assert.equal(formatLegendValue(12.3456), '12.35');
  assert.equal(formatLegendValue(null), '—');
  assert.equal(formatLegendValue(undefined), '—');
  assert.equal(formatLegendValue(NaN), '—');
  assert.equal(formatLegendValue('abc'), '—');
  assert.equal(formatLegendValue(0), '0.00');
});

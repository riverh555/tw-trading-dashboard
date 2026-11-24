// 即時看盤：K 線時間換算與週期彙整（純函式，不碰網路）
import test from 'node:test';
import assert from 'node:assert/strict';
import { barTime, toChartBars, validPeriod, PERIOD_MINUTES } from '../lib/candles.mjs';
import { fiveMinBars } from '../lib/insight.mjs';

test('barTime: 日 K 回傳日期字串，分 K 回傳台北時間的 epoch 秒數', () => {
  assert.equal(barTime('2026-11-24'), '2026-11-24');
  // 2026-11-24 09:00 +08:00 = 2026-11-24 01:00 UTC
  assert.equal(barTime('2026-11-24 09:00'), Date.parse('2026-11-24T01:00:00Z') / 1000);
  assert.equal(barTime('2026-11-24 13:30'), Date.parse('2026-11-24T05:30:00Z') / 1000);
  assert.equal(barTime(''), null);
  assert.equal(barTime('09:00'), null);
  assert.equal(barTime(null), null);
});

test('toChartBars: 過濾無效列，保留量為 0 的棒', () => {
  const bars = toChartBars([
    ['2026-11-24 09:00', 100, 101, 99, 100.5, 10],
    ['2026-11-24 09:01', 100.5, 102, 100, 101, 0],
    ['2026-11-24 09:02', 101, 101, 100, 0, 5], // 收盤 0 → 捨棄
    ['2026-11-23', 98, 100, 97, 99, 500],
    ['bad', 1, 1, 1, 1, 1],
  ]);
  assert.equal(bars.length, 3);
  assert.equal(typeof bars[0].time, 'number');
  assert.equal(bars[0].open, 100);
  assert.equal(bars[1].volume, 0);
  assert.equal(bars[2].time, '2026-11-23');
});

test('validPeriod 接受看盤週期', () => {
  for (const p of ['1m', '3m', '5m', '15m', '60m', 'day']) assert.equal(validPeriod(p), true);
  assert.equal(validPeriod('10m'), false);
  assert.equal(validPeriod(''), false);
  assert.deepEqual(PERIOD_MINUTES, { '1m': 1, '3m': 3, '5m': 5, '15m': 15, '60m': 60 });
});

test('fiveMinBars 以 size 彙整：3 分 K 由 1 分 K 合成（結束時間標示）', () => {
  const rows = [
    ['09:00', 100, 101, 99, 100.5, 10], ['09:01', 100.5, 102, 100, 101, 20], ['09:02', 101, 101.5, 100.5, 101, 15],
    ['09:03', 101, 103, 101, 102.5, 5], ['09:04', 102.5, 102.5, 102, 102, 8], ['09:05', 102, 104, 102, 103, 12],
  ];
  const bars3 = fiveMinBars(rows, { start: true, size: 3 });
  assert.equal(bars3.length, 2);
  assert.deepEqual(bars3[0], ['09:03', 100, 102, 99, 101, 45]);
  assert.deepEqual(bars3[1], ['09:06', 101, 104, 101, 103, 25]);
  const bars15 = fiveMinBars(rows, { start: true, size: 15 });
  assert.equal(bars15.length, 1);
  assert.deepEqual(bars15[0], ['09:15', 100, 104, 99, 103, 70]);
  const bars1 = fiveMinBars(rows, { start: true, size: 1 });
  assert.equal(bars1.length, 6);
});

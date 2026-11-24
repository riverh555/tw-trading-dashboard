// 主圖初始可見範圍：左邊留白，避免第一根 K 線貼左緣被切掉一半（純函式）
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEFT_PAD_BARS, initialVisibleRange } from '../public/chart-range.js';

test('初始可見範圍：左邊留 5 根空白，右邊到最後一根', () => {
  assert.equal(LEFT_PAD_BARS, 5);
  assert.deepEqual(initialVisibleRange(100), { from: -5, to: 99 });
  assert.deepEqual(initialVisibleRange(1), { from: -5, to: 0 });
});

test('初始可見範圍：自訂留白根數', () => {
  assert.deepEqual(initialVisibleRange(50, 3), { from: -3, to: 49 });
  assert.deepEqual(initialVisibleRange(50, 0), { from: 0, to: 49 });
});

test('初始可見範圍：沒有 K 線時回傳 null', () => {
  assert.equal(initialVisibleRange(0), null);
  assert.equal(initialVisibleRange(-3), null);
  assert.equal(initialVisibleRange(NaN), null);
  assert.equal(initialVisibleRange(undefined), null);
});

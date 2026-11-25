// 畫線工具的純函式測試（fib／通道／測量／序列化／hit test）。
// LWC 渲染與滑鼠互動無法在 node 測試（需要真的 chart／series 與瀏覽器），留給實機檢查。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOOLS, pointsRequired, storageKey, newDrawingId,
  fibLevels, channelOffset, measureStats,
  serializeDrawings, parseDrawings, hitTest,
} from '../public/drawings.js';

const p = (time, price) => ({ time, price });

test('fib levels: 上漲（p0 低 → p1 高），level 0 在 p1、level 100 在 p0', () => {
  const levels = fibLevels(p(0, 100), p(60, 200));
  assert.equal(levels.length, 7);
  assert.deepEqual(levels.map(l => l.label), ['0', '23.6', '38.2', '50', '61.8', '78.6', '100']);
  assert.deepEqual(levels.map(l => l.ratio), [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
  assert.equal(levels[0].price, 200); // 0% 在終點
  assert.equal(levels[6].price, 100); // 100% 在起點
  assert.equal(levels[3].price, 150); // 50%
  assert.ok(Math.abs(levels[4].price - 138.2) < 1e-9); // 61.8%
});

test('fib levels: 下跌（p0 高 → p1 低），方向反過來但 level 定義不變', () => {
  const levels = fibLevels(p(0, 200), p(60, 100));
  assert.equal(levels[0].price, 100);
  assert.equal(levels[6].price, 200);
  assert.equal(levels[3].price, 150);
  assert.ok(Math.abs(levels[1].price - 123.6) < 1e-9); // 23.6%
});

test('fib levels: 起點終點同價，全是同一價', () => {
  const levels = fibLevels(p(0, 150), p(60, 150));
  assert.ok(levels.every(l => l.price === 150));
});

test('fib levels: 輸入不合法時拋 TypeError', () => {
  for (const bad of [null, {}, p(0, NaN), p('x', 100), p(0, Infinity)]) {
    assert.throws(() => fibLevels(bad, p(0, 100)), TypeError);
    assert.throws(() => fibLevels(p(0, 100), bad), TypeError);
  }
});

test('channel offset: 水平底線，第三點高 10 就是偏移 10', () => {
  assert.equal(channelOffset(p(0, 100), p(60, 100), p(30, 110)), 10);
  assert.equal(channelOffset(p(0, 100), p(60, 100), p(30, 90)), -10);
  assert.equal(channelOffset(p(0, 100), p(60, 100), p(30, 100)), 0);
});

test('channel offset: 斜底線，偏移是在第三點時間上的垂直價差', () => {
  // 底線斜率 1 元／秒：t=30 時底線價 130，第三點 140 → 偏移 10
  assert.equal(channelOffset(p(0, 100), p(60, 160), p(30, 140)), 10);
  // 第三點在底線下方
  assert.equal(channelOffset(p(0, 100), p(60, 160), p(45, 130)), -15);
});

test('channel offset: 底線垂直（兩點同時間）回傳 null，不拋錯', () => {
  assert.equal(channelOffset(p(30, 100), p(30, 160), p(45, 130)), null);
});

test('measure stats: 上漲 3,600 秒＝60 根 1 分 K', () => {
  assert.deepEqual(measureStats(p(0, 100), p(3600, 110)), {
    priceDiff: 10, pctChange: 10, timeSpanSec: 3600, barsApprox: 60,
  });
});

test('measure stats: 下跌為負值，順序反過來時間跨度一樣', () => {
  const a = measureStats(p(3600, 110), p(0, 100));
  assert.equal(a.priceDiff, -10);
  assert.ok(Math.abs(a.pctChange - (-10 / 110 * 100)) < 1e-9);
  assert.equal(a.timeSpanSec, 3600);
  assert.equal(a.barsApprox, 60);
});

test('measure stats: 起點價 0 時漲跌幅為 null；跨度超過一天時 barsApprox 為 null', () => {
  assert.equal(measureStats(p(0, 0), p(60, 5)).pctChange, null);
  assert.equal(measureStats(p(0, 100), p(86400, 100)).barsApprox, null);
  assert.equal(measureStats(p(0, 100), p(90000, 100)).barsApprox, null);
  assert.equal(measureStats(p(0, 100), p(86399, 100)).barsApprox, 1440);
  assert.deepEqual(measureStats(p(100, 100), p(100, 100)), {
    priceDiff: 0, pctChange: 0, timeSpanSec: 0, barsApprox: 0,
  });
});

test('serialize/parse round-trip: 兩筆畫線原樣回來', () => {
  const drawings = [
    { id: 'd1', tool: 'trend', points: [p(1000, 700), p(2000, 710)], options: { color: '#ff0000' } },
    { id: 'd2', tool: 'text', points: [p(1500, 705)], options: { text: '買點' } },
  ];
  assert.deepEqual(parseDrawings(serializeDrawings(drawings)), drawings);
});

test('parseDrawings: 垃圾輸入回傳 []，絕不拋錯', () => {
  for (const raw of [null, undefined, '', 'not json', '{bad', '{"a":1}', '[1,2]', '123', 42, true]) {
    assert.deepEqual(parseDrawings(raw), []);
  }
  assert.deepEqual(parseDrawings('[]'), []);
});

test('parseDrawings: 部分損毀的陣列只保留合法項目', () => {
  const raw = JSON.stringify([
    { id: 'ok', tool: 'trend', points: [p(0, 100), p(60, 110)], options: {} },
    { tool: 'trend', points: [p(0, 100)] }, // 缺 id
    { id: 'bad-tool', tool: 'laser', points: [p(0, 100)] }, // 未知工具
    { id: 'no-points', tool: 'trend', points: [] }, // 沒有合法點
    { id: 'half-points', tool: 'trend', points: [p(0, 100), { time: 'x', price: 1 }, null], options: { color: 123, text: 'keep' } },
    null, 'string', 42,
  ]);
  assert.deepEqual(parseDrawings(raw), [
    { id: 'ok', tool: 'trend', points: [p(0, 100), p(60, 110)], options: {} },
    { id: 'half-points', tool: 'trend', points: [p(0, 100)], options: { text: 'keep' } },
  ]);
});

test('serializeDrawings: 非陣列輸入回傳 [] 字串', () => {
  assert.equal(serializeDrawings(null), '[]');
  assert.equal(serializeDrawings('x'), '[]');
});

test('tools: 10 個工具，每個點數符合規格', () => {
  assert.deepEqual(pointsRequired('horizontal'), 1);
  assert.deepEqual(pointsRequired('vertical'), 1);
  assert.deepEqual(pointsRequired('text'), 1);
  for (const t of ['trend', 'ray', 'extended', 'box', 'fib', 'measure']) assert.equal(pointsRequired(t), 2);
  assert.equal(pointsRequired('channel'), 3);
  assert.equal(pointsRequired('laser'), null);
  assert.deepEqual(Object.keys(TOOLS).sort(), [
    'box', 'channel', 'extended', 'fib', 'horizontal', 'measure', 'ray', 'text', 'trend', 'vertical',
  ]);
});

test('storageKey: 格式 nexus.watchDrawings.<symbol>；空 symbol 拋錯', () => {
  assert.equal(storageKey('3406'), 'nexus.watchDrawings.3406');
  assert.throws(() => storageKey(''), TypeError);
  assert.throws(() => storageKey(null), TypeError);
});

test('newDrawingId: 每次都不一樣、是非空字串', () => {
  const ids = new Set(Array.from({ length: 100 }, () => newDrawingId()));
  assert.equal(ids.size, 100);
  for (const id of ids) assert.equal(typeof id, 'string');
});

// 假座標轉換：time→x、price→y（1:1），測 hitTest 的幾何邏輯。
const toXY = pt => ({ x: pt.time, y: pt.price });

test('hitTest: 橫線只看 y 距離，直線只看 x 距離', () => {
  const h = { id: 'h', tool: 'horizontal', points: [p(0, 100)], options: {} };
  assert.equal(hitTest(h, 500, 100, toXY), true);
  assert.equal(hitTest(h, 500, 105, toXY), true);
  assert.equal(hitTest(h, 500, 120, toXY), false);
  const v = { id: 'v', tool: 'vertical', points: [p(50, 0)], options: {} };
  assert.equal(hitTest(v, 50, 999, toXY), true);
  assert.equal(hitTest(v, 80, 999, toXY), false);
});

test('hitTest: 趨勢線中段命中、延長線外命中、射線起點前不命中', () => {
  const trend = { id: 't', tool: 'trend', points: [p(0, 0), p(100, 100)], options: {} };
  assert.equal(hitTest(trend, 50, 50, toXY), true);
  assert.equal(hitTest(trend, 50, 80, toXY), false);
  const ext = { id: 'e', tool: 'extended', points: [p(0, 0), p(100, 100)], options: {} };
  assert.equal(hitTest(ext, 200, 200, toXY), true); // 線外也算（無限延伸）
  const ray = { id: 'r', tool: 'ray', points: [p(100, 100), p(200, 200)], options: {} };
  assert.equal(hitTest(ray, 300, 300, toXY), true);
  assert.equal(hitTest(ray, 0, 0, toXY), false); // 起點之前不算
});

test('hitTest: 通道底線與平行線都命中；矩形內外；文字錨點附近', () => {
  const ch = { id: 'c', tool: 'channel', points: [p(0, 0), p(100, 0), p(50, 10)], options: {} };
  assert.equal(hitTest(ch, 50, 0, toXY), true); // 底線
  assert.equal(hitTest(ch, 50, 10, toXY), true); // 平行線
  assert.equal(hitTest(ch, 50, 25, toXY), false); // 離底線 25、離平行線 15，都超出 8px 容許範圍
  const box = { id: 'b', tool: 'box', points: [p(0, 0), p(100, 100)], options: {} };
  assert.equal(hitTest(box, 50, 50, toXY), true);
  assert.equal(hitTest(box, 150, 50, toXY), false);
  const text = { id: 'x', tool: 'text', points: [p(50, 50)], options: { text: 'hi' } };
  assert.equal(hitTest(text, 55, 55, toXY), true);
  assert.equal(hitTest(text, 90, 90, toXY), false);
});

test('hitTest: fib 任一 level 命中；點在可視範圍外（toXY 回傳 null）不命中', () => {
  const fib = { id: 'f', tool: 'fib', points: [p(0, 100), p(100, 200)], options: {} };
  assert.equal(hitTest(fib, 50, 150, toXY), true); // 50% level
  assert.equal(hitTest(fib, 50, 130, toXY), false); // 130 離 138.2 與 121.4 都超過 8px
  assert.equal(hitTest(fib, 500, 150, toXY), false); // x 超出兩點範圍
  const nullXY = () => null;
  assert.equal(hitTest(fib, 50, 150, nullXY), false);
  assert.equal(hitTest({ id: 'n', tool: 'trend', points: [], options: {} }, 0, 0, toXY), false);
});

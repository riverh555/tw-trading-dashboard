// 個股即時走勢（分時線）面板：SVG 渲染、即時 bar 合併、掛載元件（假 el 測渲染邏輯）。
// 真實瀏覽器掛載與視覺效果無法在 node 測，留給 River 做 live 檢查。
import test from 'node:test';
import assert from 'node:assert/strict';
import { intradayLineSVG, appendBar, createIntradayLine } from '../public/intraday-line.js';

// 09:30–09:34 五分鐘，昨收 700，價格在昨收上下游走。
const sample = () => ({
  minutes: { m: [570, 571, 572, 573, 574], c: [698, 702, 701, 705, 703], v: [120, 45, 30, 60, 25] },
  ref: 700, open: 540, close: 810,
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('intraday line: SVG 有價格折線、昨收虛線、最後一價與量柱', () => {
  const svg = intradayLineSVG(sample());
  assert.match(svg, /<svg class="wv-idxline"/);
  assert.match(svg, /<polyline points="[^"]+"/); // 價格折線
  assert.match(svg, /stroke-dasharray="3 3"/); // 昨收虛線
  assert.match(svg, /<circle[^>]+r="3"/); // 最後一價圓點
  assert.match(svg, /703/); // 最後一價數值（最後收 703）
  assert.match(svg, /<rect[^>]+opacity=".55"/); // 量柱
  assert.match(svg, /09<\/text>/); // x 軸整點標籤（開盤小時）
});

test('intraday line: 沒有分鐘資料或 ref <= 0 時回傳佔位', () => {
  for (const d of [{ minutes: { m: [], c: [], v: [] }, ref: 700 }, { minutes: { m: [570], c: [700], v: [1] }, ref: 0 }, { minutes: null, ref: 700 }, {}])
    assert.match(intradayLineSVG(d), /<div class="empty">/);
});

test('intraday line: y 軸以昨收為中心對稱，右邊是對昨收的漲跌幅', () => {
  const svg = intradayLineSVG(sample());
  // 左邊價格軸三檔（text-anchor="end"）：上檔 > 昨收 > 下檔，且中間一檔就是昨收 700。
  const left = [...svg.matchAll(/text-anchor="end" class="ia-ax[^"]*">([^<]+)<\/text>/g)].map(m => Number(m[1].replace(/,/g, '')));
  assert.equal(left.length, 3);
  assert.ok(left[0] > 700 && left[1] === 700 && left[2] < 700, `y 軸三檔應為 上>700>下，實際 ${left}`);
  assert.ok(Math.abs((left[0] - 700) - (700 - left[2])) < 0.01, '上下對稱');
  // 右邊漲跌幅軸：上檔正、下檔負。
  const pct = [...svg.matchAll(/<text x="294"[^>]*>([+-][\d.]+%)<\/text>/g)].map(m => m[1]);
  assert.equal(pct.length, 3);
  assert.match(pct[0], /^\+/); assert.equal(pct[1], '+0.00%'); assert.match(pct[2], /^-/);
});

test('intraday line: 價格在昨收之上時最後一價標 up、之下時標 down', () => {
  const up = intradayLineSVG({ ...sample(), minutes: { m: [570, 571], c: [701, 705], v: [10, 10] } });
  assert.match(up, /class="ia-ax up">705/);
  const down = intradayLineSVG({ ...sample(), minutes: { m: [570, 571], c: [699, 695], v: [10, 10] } });
  assert.match(down, /class="ia-ax down">695/);
});

test('intraday line: 開盤集合競價大量不撐爆量柱刻度（第 97 百分位）', () => {
  const svg = intradayLineSVG({ ...sample(), minutes: { m: [570, 571, 572, 573, 574], c: [700, 701, 702, 701, 703], v: [10000, 40, 30, 50, 20] } });
  // 量柱高度 = rect 的 height：第一根（10000 張）應被截頂、與其他柱同量級，不會是其他柱的數百倍。
  const heights = [...svg.matchAll(/<rect[^>]+height="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.equal(heights.length, 5);
  assert.ok(Math.max(...heights) / Math.min(...heights.filter(h => h > 0)) < 5, `量柱高度比應 <5，實際 ${heights}`);
});

test('appendBar: 同一分鐘更新收價與量，新分鐘按時間插入，且不動原輸入', () => {
  const minutes = { m: [570, 571, 572], c: [698, 702, 701], v: [120, 45, 30] };
  const snap = structuredClone(minutes);
  const updated = appendBar(minutes, ['09:32', 701, 703, 700, 702.5, 55]);
  assert.deepEqual(updated, { m: [570, 571, 572], c: [698, 702, 702.5], v: [120, 45, 55] });
  assert.deepEqual(minutes, snap, '原輸入不得被改動');
  const appended = appendBar(updated, ['09:33', 702.5, 704, 702, 704, 40]);
  assert.deepEqual(appended.m, [570, 571, 572, 573]);
  assert.deepEqual(appended.c, [698, 702, 702.5, 704]);
  assert.deepEqual(minutes, snap, '原輸入仍不得被改動');
  // 亂序插入：09:31 插進 [570, 572] 中間，順序保持由舊到新。
  const inserted = appendBar({ m: [570, 572], c: [698, 701], v: [10, 20] }, ['09:31', 698, 700, 698, 699, 15]);
  assert.deepEqual(inserted.m, [570, 571, 572]);
  // 格式錯誤的 bar 原樣回傳。
  assert.equal(appendBar(minutes, ['09:33']), minutes);
  assert.equal(appendBar(minutes, ['xx:yy', 1, 2, 3, 4, 5]), minutes);
});

test('appendBar: 其他等長陣列欄位（vwap）跟著對齊，新分鐘補 null', () => {
  const minutes = { m: [570, 571], c: [698, 702], v: [10, 20], vwap: [699, 700] };
  const out = appendBar(minutes, ['09:32', 702, 703, 702, 703, 5]);
  assert.deepEqual(out.vwap, [699, 700, null]);
  assert.deepEqual(out.m, [570, 571, 572]);
});

test('createIntradayLine: setData 畫整幅，onBar 併入即時 bar 並重畫（節流可調）', async () => {
  const el = { innerHTML: '' };
  const line = createIntradayLine({ el, throttleMs: 50 });
  line.setData(sample());
  assert.match(el.innerHTML, /703/);
  line.onBar(['09:35', 703, 706, 703, 706, 33]);
  assert.match(el.innerHTML, /703/, '節流窗內不立即重畫');
  await sleep(80);
  assert.match(el.innerHTML, /706/, '節流窗過後重畫出新價');
  line.destroy();
});

test('createIntradayLine: setData 之前收到的 bar 先暫存，setData 時一併併入', () => {
  const el = { innerHTML: '' };
  const line = createIntradayLine({ el, throttleMs: 50 });
  line.onBar(['09:35', 703, 706, 703, 706, 33]);
  assert.equal(el.innerHTML, '', '還沒 setData，不畫');
  line.setData(sample());
  assert.match(el.innerHTML, /706/, '暫存的 bar 已併入');
  line.destroy();
});

test('createIntradayLine: destroy 清掉待執行的節流重畫', async () => {
  const el = { innerHTML: '' };
  const line = createIntradayLine({ el, throttleMs: 50 });
  line.setData(sample());
  line.onBar(['09:35', 703, 706, 703, 706, 33]);
  line.destroy();
  await sleep(80);
  assert.match(el.innerHTML, /703/, 'destroy 後不應重畫出 706');
  assert.doesNotMatch(el.innerHTML, /706/);
});

test('createIntradayLine: 沒有 el 時拋錯', () => {
  assert.throws(() => createIntradayLine({}), /需要 el/);
});

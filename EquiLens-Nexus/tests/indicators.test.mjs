// 技術指標套用：搜尋、收藏置頂、防重複、參數正規化（純函式，不碰 DOM 或網路）
import test from 'node:test';
import assert from 'node:assert/strict';
import { SEEDED_FAVORITES, INDICATOR_CATEGORIES, searchIndicators, pinFavorites, applyBlocked, normalizeInputs } from '../public/indicators.js';

const fixture = [
  { id: 'rsi', name: 'Relative strength index', shortName: 'RSI', category: 'Momentum', overlay: false },
  { id: 'macd', name: 'Moving average convergence divergence', shortName: 'MACD', category: 'Momentum', overlay: false },
  { id: 'sma', name: 'Simple moving average', shortName: 'SMA', category: 'Moving Averages', overlay: true },
  { id: 'ml-adaptive-supertrend', name: 'Machine Learning Adaptive SuperTrend [AlgoAlpha]', shortName: 'AlgoAlpha - 🤖 Adaptive SuperTrend', category: 'Trend', overlay: true },
  { id: 'bb', name: 'Bollinger Bands', shortName: 'BB', category: 'Volatility', overlay: true },
];

test('搜尋：名稱／代碼／簡稱不分大小寫，分類過濾，結果上限 100', () => {
  assert.deepEqual(searchIndicators(fixture, 'rsi').map(e => e.id), ['rsi']);
  assert.deepEqual(searchIndicators(fixture, 'MACD').map(e => e.id), ['macd']);
  assert.deepEqual(searchIndicators(fixture, 'supertrend').map(e => e.id), ['ml-adaptive-supertrend']);
  assert.deepEqual(searchIndicators(fixture, '', 'Momentum').map(e => e.id), ['rsi', 'macd']);
  assert.deepEqual(searchIndicators(fixture, '', 'all').map(e => e.id), ['rsi', 'macd', 'sma', 'ml-adaptive-supertrend', 'bb']);
  assert.equal(searchIndicators(fixture, '', 'all', 2).length, 2);
  assert.deepEqual(searchIndicators(fixture, '沒有這個指標'), []);
});

test('收藏置頂：收藏的照收藏順序放前面，其餘維持目錄順序', () => {
  const pinned = pinFavorites(fixture, ['bb', 'rsi']);
  assert.deepEqual(pinned.map(e => e.id), ['bb', 'rsi', 'macd', 'sma', 'ml-adaptive-supertrend']);
  assert.deepEqual(pinFavorites(fixture, []).map(e => e.id), fixture.map(e => e.id));
});

test('收藏種子：4 個目錄找得到的收藏，id 唯一且是 kebab-case；wojtek 那支不在其中', () => {
  assert.equal(SEEDED_FAVORITES.length, 4);
  const ids = SEEDED_FAVORITES.map(f => f.id);
  assert.equal(new Set(ids).size, 4);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.deepEqual(ids, ['smart-money-concepts-luxalgo', 'ml-adaptive-supertrend', 'average-sentiment-oscillator', 'macd']);
  assert.ok(!ids.some(id => id.includes('supertrend-with-entry')));
});

test('分類表：全部＋目錄的 8 個分類', () => {
  assert.deepEqual(INDICATOR_CATEGORIES.map(c => c.id), ['all', 'Moving Averages', 'Momentum', 'Volatility', 'Volume', 'Trend', 'Oscillators', 'Channels & Bands', 'Candlestick Patterns']);
});

test('防重複：已套用的擋下；MACD／均線開關開著時，目錄版擋下', () => {
  assert.equal(applyBlocked('rsi', [], { showMA: true, showMACD: true }), null);
  assert.equal(applyBlocked('rsi', ['rsi'], {}), 'already');
  assert.equal(applyBlocked('macd', [], { showMACD: true }), 'macd-toggle');
  assert.equal(applyBlocked('macd', [], { showMACD: false }), null);
  assert.equal(applyBlocked('sma', [], { showMA: true }), 'ma-toggle');
  assert.equal(applyBlocked('sma', [], { showMA: false }), null);
});

test('參數正規化：預設值＋改動，字串轉型別，超出範圍夾住', () => {
  const entry = {
    defaultInputs: { length: 14, src: 'close', show: true },
    inputConfig: [
      { id: 'length', type: 'int', defval: 14, min: 2, max: 100 },
      { id: 'src', type: 'source', defval: 'close' },
      { id: 'show', type: 'bool', defval: true },
      { id: 'mult', type: 'float', defval: 2, min: 0.5, max: 5 },
    ],
  };
  assert.deepEqual(normalizeInputs(entry, { length: '20', show: 'false', mult: '9' }), { length: 20, src: 'close', show: false, mult: 5 });
  assert.deepEqual(normalizeInputs(entry, { length: 'abc' }), { length: 14, src: 'close', show: true });
  assert.deepEqual(normalizeInputs(entry, {}), { length: 14, src: 'close', show: true });
});

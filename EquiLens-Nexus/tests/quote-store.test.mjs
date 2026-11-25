// 中央報價庫（public/quote-store.js）：以假 EventSource 與假時鐘測試訂閱計數、連線重建、
// 解析（缺欄位不拋錯）、指數快取、退避重連與延遲關閉
import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuoteStore, parseStreamEvent, SSE_BACKOFF_MS, SSE_CLOSE_DELAY_MS } from '../public/quote-store.js';

function fakeClock() {
  let t = 0, seq = 0; const jobs = new Map();
  const add = (fn, ms) => { const id = ++seq; jobs.set(id, { fn, at: t + ms }); return id; };
  return {
    now: () => t,
    timers: { setTimeout: (fn, ms) => add(fn, ms), clearTimeout: id => jobs.delete(id) },
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let next = null;
        for (const [id, j] of jobs) if (j.at <= end && (!next || j.at < next[1].at)) next = [id, j];
        if (!next) break;
        const [id, j] = next; t = j.at; jobs.delete(id); j.fn();
      }
      t = end;
    },
  };
}
class FakeEventSource {
  constructor(url) { this.url = url; this.listeners = new Map(); this.closed = false; this.onmessage = null; this.onopen = null; this.onerror = null; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
  emit(type, data) { for (const fn of this.listeners.get(type) || []) fn({ data: typeof data === 'string' ? data : JSON.stringify(data) }); }
  emitMessage(data) { this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) }); }
  emitError() { this.onerror?.(new Event('error')); }
  close() { this.closed = true; }
}
function setup() {
  const clock = fakeClock(), sources = [], statuses = [];
  const store = createQuoteStore({ url: '/api/stream', timers: clock.timers,
    eventSourceFactory: target => { const s = new FakeEventSource(target); sources.push(s); return s; },
    onStatus: s => statuses.push(s) });
  return { clock, sources, statuses, store };
}
const quote = (id, last) => ({ id, last, change: 1, changePrice: 7, open: 690, high: 705, low: 688, volume: 100, time: '10:00:00', ref: 693, source: 'stream' });

test('quote store: many subscribers to one id share one connection', () => {
  const { sources, store } = setup();
  let n = 0; const fn = () => n++;
  store.subscribe('3406', fn);
  store.subscribe('3406', () => {});
  assert.equal(sources.length, 1);
  assert.equal(sources[0].url, '/api/stream?symbols=3406');
  sources[0].emit('quote', quote('3406', 700));
  assert.equal(n, 1);
  assert.deepEqual(store.getQuote('3406').last, 700);
});

test('quote store: symbol set change rebuilds the connection (debounced)', () => {
  const { clock, sources, store } = setup();
  store.subscribe('3406', () => {});
  store.subscribe('2330', () => {});
  assert.equal(sources.length, 1); // debounce 期間尚未重建
  clock.advance(100);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].closed, true);
  assert.equal(sources[1].url, '/api/stream?symbols=3406,2330');
  store.unsubscribe('2330', () => {}); // 不是原本那個 fn，不影響
  clock.advance(100);
  assert.equal(sources.length, 2);
});

test('quote store: last subscriber leaving waits 5s before closing; resubscribe cancels', () => {
  const { clock, sources, store } = setup();
  const fn = () => {};
  store.subscribe('3406', fn);
  store.unsubscribe('3406', fn);
  assert.equal(sources[0].closed, false);
  clock.advance(SSE_CLOSE_DELAY_MS - 1);
  assert.equal(sources[0].closed, false);
  clock.advance(1);
  assert.equal(sources[0].closed, true);
  // 5 秒內重新訂閱：取消關閉，沿用原連線
  const { clock: c2, sources: s2, store: st2 } = setup();
  const f2 = () => {};
  st2.subscribe('3406', f2);
  st2.unsubscribe('3406', f2);
  c2.advance(2000);
  st2.subscribe('3406', f2);
  c2.advance(10000);
  assert.equal(s2.length, 1);
  assert.equal(s2[0].closed, false);
});

test('quote store: bar events update the per-id last 1-min bar', () => {
  const { sources, store } = setup();
  store.subscribe('3406', () => {});
  sources[0].emit('bar', { id: '3406', bar: ['10:00', 690, 705, 688, 700, 100] });
  assert.deepEqual(store.getLastBar('3406'), ['10:00', 690, 705, 688, 700, 100]);
  assert.equal(store.getLastBar('2330'), null);
  assert.equal(store.getQuote('2330'), null);
});

test('quote store: index events are cached like quotes', () => {
  const { sources, statuses, store } = setup();
  const seen = [];
  store.subscribe('TAIEX', ev => seen.push(ev));
  sources[0].emit('index', { id: 'TAIEX', last: 28500, change: 1.5, changePrice: 420, time: '10:00:05', minute: { m: 541, c: 28500 } });
  assert.deepEqual(store.getQuote('TAIEX'), { type: 'index', id: 'TAIEX', last: 28500, change: 1.5, changePrice: 420, time: '10:00:05', minute: { m: 541, c: 28500 } });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].type, 'index');
  assert.equal(statuses.at(-1), 'live');
});

test('quote store: disconnect goes dead, then reconnects with backoff 1s then 2s', () => {
  const { clock, sources, statuses, store } = setup();
  store.subscribe('3406', () => {});
  assert.deepEqual(statuses, ['connecting']);
  sources[0].emit('quote', quote('3406', 700));
  assert.deepEqual(statuses, ['connecting', 'live']);
  sources[0].emitError();
  assert.deepEqual(statuses, ['connecting', 'live', 'dead']);
  assert.equal(sources.length, 1);
  clock.advance(SSE_BACKOFF_MS[0]);
  assert.equal(sources.length, 2);
  assert.equal(statuses.at(-1), 'reconnecting');
  sources[1].emitError();
  assert.equal(statuses.at(-1), 'dead');
  clock.advance(SSE_BACKOFF_MS[1] - 1);
  assert.equal(sources.length, 2);
  clock.advance(1);
  assert.equal(sources.length, 3);
  sources[2].emit('quote', quote('3406', 701));
  assert.equal(statuses.at(-1), 'live');
  assert.equal(store.getQuote('3406').last, 701);
});

test('quote store: destroy closes the connection and stops timers', () => {
  const { clock, sources, store } = setup();
  const fn = () => {};
  store.subscribe('3406', fn);
  store.destroy();
  assert.equal(sources[0].closed, true);
  clock.advance(60000);
  assert.equal(sources.length, 1);
  assert.equal(store.getStatus(), 'connecting'); // destroy 後狀態不再變動（此 store 從未收到訊息）
});

test('parseStreamEvent: full SSE block and data-only payloads', () => {
  const raw = 'event: quote\ndata: {"id":"3406","last":700,"change":2.04}\n\n';
  assert.deepEqual(parseStreamEvent(raw), { type: 'quote', id: '3406', last: 700, change: 2.04, changePrice: null, open: null, high: null, low: null, volume: 0, time: null, ref: null, source: null });
  // 沒有 event: 行時依形狀推斷
  assert.equal(parseStreamEvent('{"id":"3406","bar":["10:00",690,705,688,700,100]}').type, 'bar');
  assert.equal(parseStreamEvent('{"id":"3406","bids":[[700,1]],"asks":[]}').type, 'book');
  assert.equal(parseStreamEvent('{"id":"3406","trade":["09:30:00",699,701,701,5,1]}').type, 'tape');
  assert.equal(parseStreamEvent('{"status":"live","provider":"fugle","mode":"full"}').type, 'status');
  // 具名事件優先於形狀推斷
  assert.equal(parseStreamEvent('{"id":"TAIEX","last":28500}', 'index').type, 'index');
});

test('parseStreamEvent: index payload with minute tail', () => {
  assert.deepEqual(
    parseStreamEvent('{"id":"TAIEX","last":28500,"change":1.5,"changePrice":420,"time":"10:00:05","minute":{"m":541,"c":28500}}', 'index'),
    { type: 'index', id: 'TAIEX', last: 28500, change: 1.5, changePrice: 420, time: '10:00:05', minute: { m: 541, c: 28500 } });
  assert.deepEqual(parseStreamEvent('{"id":"TAIEX","last":28500}', 'index').minute, null);
  assert.equal(parseStreamEvent('{"last":28500}', 'index'), null); // 缺 id
});

test('parseStreamEvent: missing fields never throw', () => {
  for (const raw of ['', 'not json', '{"id":"3406"}', '{"id":"3406","last":"x"}', '{"id":"3406","bar":[]}', '{"id":"3406","trade":[]}', '{"status":1}', '{"foo":1}', null, undefined, 42]) {
    assert.equal(parseStreamEvent(raw), null, JSON.stringify(raw));
  }
  assert.equal(parseStreamEvent('event: quote\n\n'), null); // 沒有 data 行
});

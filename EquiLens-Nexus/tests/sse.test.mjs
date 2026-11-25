// SSE 推播中心（lib/sse.mjs）：事件 payload 組裝、客戶端登錄／過濾／節流
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseHub, quotePayload, bookPayload, tapePayload, indexPayload, formatEvent, taipeiHms } from '../lib/sse.mjs';

function fakeRes() {
  const res = { written: [], write(s) { res.written.push(s); return true; } };
  return res;
}
function fakeClock() {
  let t = 0;
  return { now: () => t, advance(ms) { t += ms; } };
}

test('sse: taipeiHms converts ms epoch to Taipei HH:MM:SS', () => {
  assert.equal(taipeiHms(Date.UTC(2026, 10, 25, 1, 30, 0)), '09:30:00');
  assert.equal(taipeiHms(Date.UTC(2026, 10, 25, 5, 0, 0)), '13:00:00');
  assert.equal(taipeiHms(null), null);
  assert.equal(taipeiHms('nope'), null);
});

test('sse: formatEvent produces one SSE event block', () => {
  assert.equal(formatEvent('quote', { id: '3406', last: 700 }), 'event: quote\ndata: {"id":"3406","last":700}\n\n');
});

test('sse: quotePayload computes ref and change from the row', () => {
  const row = { stock_id: '3406', date: '2026-11-25 10:00:00', close: 700, open: 690, high: 705, low: 688, total_volume: 12345, change_price: 14 };
  assert.deepEqual(quotePayload(row, 'stream'), { id: '3406', last: 700, change: 2.04, changePrice: 14, open: 690, high: 705, low: 688, volume: 12345, time: '10:00:00', ref: 686, source: 'stream' });
  assert.equal(quotePayload({ ...row, close: 0 }), null);
  assert.equal(quotePayload({ ...row, stock_id: '' }), null);
  // 昨收 <= 0 時漲跌幅為 null，不拋錯
  assert.equal(quotePayload({ ...row, close: 10, change_price: 10 }).change, null);
});

test('sse: bookPayload converts object bids/asks to pairs, top 5', () => {
  const ev = { kind: 'book', id: '3406', time: Date.UTC(2026, 10, 25, 1, 30, 15),
    bids: Array.from({ length: 7 }, (_, i) => ({ price: 700 - i, size: i + 1 })),
    asks: [{ price: 701, size: 5 }] };
  assert.deepEqual(bookPayload(ev), { id: '3406', bids: [[700, 1], [699, 2], [698, 3], [697, 4], [696, 5]], asks: [[701, 5]], time: '09:30:15' });
  // 聚合行情帶的 book 也接受
  assert.deepEqual(bookPayload({ id: '2330', book: { bids: [[100, 2]], asks: [] }, time: Date.UTC(2026, 10, 25, 1, 0, 0) }),
    { id: '2330', bids: [[100, 2]], asks: [], time: '09:00:00' });
  assert.equal(bookPayload({ id: '2330' }).bids.length, 0);
  assert.equal(bookPayload(null), null);
});

test('sse: tapePayload computes side from bid/ask', () => {
  const base = { kind: 'trade', id: '3406', size: 5, bid: 699, ask: 701, time: Date.UTC(2026, 10, 25, 1, 30, 0) };
  assert.deepEqual(tapePayload({ ...base, price: 701 }), { id: '3406', trade: ['09:30:00', 699, 701, 701, 5, 1] });
  assert.deepEqual(tapePayload({ ...base, price: 699 }).trade.at(-1), -1);
  assert.deepEqual(tapePayload({ ...base, price: 700 }).trade.at(-1), 0);
  assert.equal(tapePayload({ ...base, price: null }), null);
  assert.equal(tapePayload({ ...base, time: null }), null);
});

test('sse: indexPayload takes the latest 1-min point from indexReport', () => {
  const report = { id: 'TAIEX', quote: { last: 28500, change: 1.5, changePrice: 420, time: '10:00:05' },
    minutes: { m: [540, 541], c: [28400, 28500] } };
  assert.deepEqual(indexPayload(report), { id: 'TAIEX', last: 28500, change: 1.5, changePrice: 420, time: '10:00:05', minute: { m: 541, c: 28500 } });
  assert.equal(indexPayload({ ...report, quote: { last: null } }), null);
  assert.equal(indexPayload({ ...report, minutes: { m: [], c: [] } }).minute, null);
  assert.equal(indexPayload(null), null);
});

test('sse hub: broadcast only reaches clients subscribed to the id', () => {
  const clock = fakeClock(), hub = createSseHub({ now: clock.now });
  const a = fakeRes(), b = fakeRes();
  hub.addClient(a, new Set(['3406']));
  hub.addClient(b, new Set(['2330']));
  assert.equal(hub.broadcast('quote', { id: '3406', last: 700 }, { id: '3406' }), 1);
  assert.equal(a.written.length, 1);
  assert.equal(b.written.length, 0);
  assert.deepEqual([...hub.wantedSymbols()].sort(), ['2330', '3406']);
  // 沒有 id 的廣播（例如 index）送給全部客戶端
  assert.equal(hub.broadcast('index', { id: 'TAIEX', last: 28500 }, {}), 2);
  assert.equal(a.written.length, 2);
  assert.equal(b.written.length, 1);
});

test('sse hub: same id and event throttled to 1 per second', () => {
  const clock = fakeClock(), hub = createSseHub({ now: clock.now });
  const res = fakeRes();
  hub.addClient(res, new Set(['3406']));
  assert.equal(hub.broadcast('quote', { id: '3406', last: 700 }, { id: '3406' }), 1);
  assert.equal(hub.broadcast('quote', { id: '3406', last: 701 }, { id: '3406' }), 0);
  assert.equal(hub.broadcast('bar', { id: '3406' }, { id: '3406' }), 1); // 不同事件不共用節流
  clock.advance(999);
  assert.equal(hub.broadcast('quote', { id: '3406', last: 702 }, { id: '3406' }), 0);
  clock.advance(1);
  assert.equal(hub.broadcast('quote', { id: '3406', last: 703 }, { id: '3406' }), 1);
  assert.equal(res.written.length, 3);
});

test('sse hub: removeClient stops delivery; write errors drop the client', () => {
  const clock = fakeClock(), hub = createSseHub({ now: clock.now });
  const res = fakeRes();
  const client = hub.addClient(res, new Set(['3406']));
  hub.removeClient(client);
  assert.equal(hub.broadcast('quote', { id: '3406' }, { id: '3406' }), 0);
  assert.equal(hub.wantedSymbols().size, 0);
  const bad = { write() { throw new Error('closed'); } };
  const badClient = hub.addClient(bad, new Set(['3406']));
  assert.equal(hub.send(badClient, 'quote', { id: '3406' }), false);
  assert.equal(hub.clients.has(badClient), false);
  assert.equal(hub.heartbeat(badClient), false);
});

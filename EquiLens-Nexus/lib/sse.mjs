// SSE 推播中心（即時看盤 Phase 1）：純函式＋客戶端登錄／節流，供 server.mjs 使用，可單元測試。
// 事件格式一律 `event: <type>\ndata: <JSON>\n\n`；時間一律台北時間 HH:MM:SS。

// 台北時間（UTC+8，無日光節約）：ms epoch → HH:MM:SS，無法解析回傳 null
const TAIPEI_MS = 8 * 3600e3;
export function taipeiHms(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n + TAIPEI_MS).toISOString().slice(11, 19);
}

const numOrNull = v => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const toNum = v => { const n = numOrNull(v); return n == null ? NaN : n; };
const round4 = v => Math.round(v * 1e4) / 1e4;

// 推播／快照列 → quote 事件 payload：{id, last, change, changePrice, open, high, low, volume, time, ref, source}
// ref（昨收）＝ close − change_price；change（漲跌幅 %）＝ (last/ref − 1) * 100，取 2 位小數
export function quotePayload(row, source = 'stream') {
  if (!row || typeof row !== 'object' || typeof row.stock_id !== 'string' || !row.stock_id) return null;
  const last = Number(row.close);
  if (!Number.isFinite(last) || last <= 0) return null;
  const ch = Number(row.change_price) || 0, ref = round4(last - ch);
  return { id: row.stock_id, last, change: ref > 0 ? Math.round((last / ref - 1) * 1e4) / 100 : null,
    changePrice: ch, open: numOrNull(row.open), high: numOrNull(row.high), low: numOrNull(row.low),
    volume: Number(row.total_volume) || 0, time: String(row.date || '').slice(11, 19) || null, ref, source };
}

// 五檔事件 → book 事件 payload：{id, bids:[[price,size]...], asks:[[price,size]...], time}
// 接受 ev 本身或 ev.book 帶 bids/asks（物件 {price,size} 或 [price,size] 皆可），各取前 5 檔
const toPair = x => {
  if (Array.isArray(x)) { const p = [toNum(x[0]), toNum(x[1])]; return p.every(Number.isFinite) ? p : null; }
  if (x && typeof x === 'object') { const p = [toNum(x.price), toNum(x.size)]; return p.every(Number.isFinite) ? p : null; }
  return null;
};
export function bookPayload(ev) {
  if (!ev || typeof ev !== 'object' || typeof ev.id !== 'string' || !ev.id) return null;
  const src = ev.book && typeof ev.book === 'object' ? ev.book : ev;
  const time = taipeiHms(ev.time ?? (ev.row?.date ? Date.parse(ev.row.date) : null));
  return { id: ev.id,
    bids: (Array.isArray(src.bids) ? src.bids : []).map(toPair).filter(Boolean).slice(0, 5),
    asks: (Array.isArray(src.asks) ? src.asks : []).map(toPair).filter(Boolean).slice(0, 5),
    time };
}

// 逐筆事件 → tape 事件 payload：{id, trade:[hms, bid, ask, price, size, side]}
// side：成交價 ≥ 賣一價為外盤 1，≤ 買一價為內盤 -1，否則 0
export function tapePayload(ev) {
  if (!ev || typeof ev !== 'object' || typeof ev.id !== 'string' || !ev.id) return null;
  const price = toNum(ev.price), size = toNum(ev.size);
  if (!Number.isFinite(price) || !Number.isFinite(size)) return null;
  const hms = taipeiHms(ev.time);
  if (!hms) return null;
  const bid = toNum(ev.bid) || 0, ask = toNum(ev.ask) || 0;
  return { id: ev.id, trade: [hms, bid > 0 ? bid : null, ask > 0 ? ask : null, price, size,
    ask > 0 && price >= ask ? 1 : bid > 0 && price <= bid ? -1 : 0] };
}

// indexReport → index 事件 payload：{id, last, change, changePrice, time, minute:{m, c}}
// minute.m／minute.c 為 minutes 的最後一點（最新 1 分鐘）；沒有有效報價回傳 null
export function indexPayload(report) {
  if (!report || typeof report !== 'object') return null;
  const q = report.quote;
  if (!q || typeof q.last !== 'number' || !(q.last > 0)) return null;
  const m = report.minutes?.m, c = report.minutes?.c;
  return { id: typeof report.id === 'string' && report.id ? report.id : 'TAIEX', last: q.last,
    change: typeof q.change === 'number' ? q.change : null,
    changePrice: typeof q.changePrice === 'number' ? q.changePrice : null,
    time: typeof q.time === 'string' ? q.time : null,
    minute: Array.isArray(m) && m.length && Array.isArray(c) && c.length ? { m: m.at(-1), c: c.at(-1) } : null };
}

// 單一 SSE 事件的文字格式
export function formatEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// SSE 客戶端中心：登錄、依訂閱代號過濾廣播、每客戶每代號每種事件 1 秒節流
export function createSseHub({ now = () => Date.now() } = {}) {
  let seq = 0;
  const clients = new Set();
  const lastSent = new Map(); // `${clientId}:${event}:${id}` → ms
  const hub = {
    clients,
    addClient(res, symbols) {
      const client = { id: ++seq, res, symbols: new Set(symbols) };
      clients.add(client);
      return client;
    },
    removeClient(client) {
      clients.delete(client);
      for (const k of [...lastSent.keys()]) if (k.startsWith(`${client.id}:`)) lastSent.delete(k);
    },
    // 全部客戶端訂閱代號的聯集：快照扇出時只對這些代號送報價
    wantedSymbols() {
      const out = new Set();
      for (const c of clients) for (const id of c.symbols) out.add(id);
      return out;
    },
    // 寫入失敗（客戶端已斷線）時移除該客戶端，回傳 false
    send(client, event, data) {
      try { client.res.write(formatEvent(event, data)); return true; }
      catch { hub.removeClient(client); return false; }
    },
    heartbeat(client) {
      try { client.res.write(': ping\n\n'); return true; }
      catch { hub.removeClient(client); return false; }
    },
    // 只送給訂閱該 id 的客戶端；同 id 同事件 1 秒內只送一次（預設 throttleMs=1000）
    broadcast(event, data, { id, throttleMs = 1000 } = {}) {
      const t = now();
      let n = 0;
      for (const client of [...clients]) {
        if (id && !client.symbols.has(id)) continue;
        const key = `${client.id}:${event}:${id || ''}`;
        const last = lastSent.get(key);
        if (last !== undefined && t - last < throttleMs) continue;
        if (hub.send(client, event, data)) { lastSent.set(key, t); n++; }
      }
      return n;
    },
  };
  return hub;
}

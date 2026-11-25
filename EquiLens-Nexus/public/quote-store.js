// 中央報價庫（即時看盤 Phase 1）：瀏覽器端唯一 SSE 連線，分發報價／K 線／五檔／逐筆給各面板訂閱者。
// 多個訂閱者共用同一代號的一條連線；代號集合變動時重建連線（debounce）；全部訂閱者離開 5 秒後才關閉連線。
// 狀態機：connecting → live → dead → reconnecting，斷線後以 1s/2s/5s/15s/30s 退避重連；收到任何訊息都算 live。

export const SSE_BACKOFF_MS = [1000, 2000, 5000, 15000, 30000];
export const SSE_CLOSE_DELAY_MS = 5000;
const REBUILD_DEBOUNCE_MS = 100;
const SSE_TYPES = ['quote', 'bar', 'book', 'tape', 'index', 'status'];

const numOrNull = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };

// 依 payload 形狀推斷事件種類（收到的 data 本身沒有 type 欄位時用）
function inferType(data) {
  if (Array.isArray(data.bar)) return 'bar';
  if (Array.isArray(data.bids) || Array.isArray(data.asks)) return 'book';
  if (Array.isArray(data.trade)) return 'tape';
  if (typeof data.last === 'number') return 'quote';
  if (typeof data.status === 'string') return 'status';
  if (data.index) return 'index';
  return null;
}

// 解析一段 SSE data payload（或完整 `event:…\ndata:…` 區塊）→ {type, ...}；
// 缺欄位或解析失敗回傳 null，不拋錯。eventName 可由呼叫端（具名事件監聽器）傳入。
export function parseStreamEvent(raw, eventName) {
  let data = raw, type = eventName || null;
  if (typeof raw === 'string') {
    if (!raw) return null;
    let dataText = raw;
    if (raw.includes('event:') || raw.includes('data:')) {
      const lines = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith('event:')) type = type || line.slice(6).trim();
        else if (line.startsWith('data:')) lines.push(line.slice(5).replace(/^ /, ''));
      }
      if (!lines.length) return null;
      dataText = lines.join('\n');
    }
    try { data = JSON.parse(dataText); } catch { return null; }
  }
  if (!data || typeof data !== 'object') return null;
  if (!type) type = data.type || inferType(data);
  if (!type || !SSE_TYPES.includes(type)) return null;
  switch (type) {
    case 'quote': {
      if (typeof data.id !== 'string' || !data.id) return null;
      if (typeof data.last !== 'number' || !Number.isFinite(data.last)) return null;
      return { type, id: data.id, last: data.last,
        change: typeof data.change === 'number' ? data.change : null,
        changePrice: typeof data.changePrice === 'number' ? data.changePrice : null,
        open: numOrNull(data.open), high: numOrNull(data.high), low: numOrNull(data.low),
        volume: numOrNull(data.volume) ?? 0,
        time: typeof data.time === 'string' ? data.time : null,
        ref: numOrNull(data.ref), source: typeof data.source === 'string' ? data.source : null };
    }
    case 'bar':
      if (typeof data.id !== 'string' || !data.id || !Array.isArray(data.bar) || data.bar.length < 6) return null;
      return { type, id: data.id, bar: data.bar };
    case 'book':
      if (typeof data.id !== 'string' || !data.id) return null;
      return { type, id: data.id, bids: Array.isArray(data.bids) ? data.bids : [],
        asks: Array.isArray(data.asks) ? data.asks : [],
        time: typeof data.time === 'string' ? data.time : null };
    case 'tape':
      if (typeof data.id !== 'string' || !data.id || !Array.isArray(data.trade) || data.trade.length < 6) return null;
      return { type, id: data.id, trade: data.trade };
    case 'status':
      if (typeof data.status !== 'string') return null;
      return { type, status: data.status, provider: data.provider ?? null, mode: data.mode ?? null };
    case 'index':
      if (typeof data.id !== 'string' || !data.id) return null;
      return { type, id: data.id, last: typeof data.last === 'number' ? data.last : null,
        change: typeof data.change === 'number' ? data.change : null,
        changePrice: typeof data.changePrice === 'number' ? data.changePrice : null,
        time: typeof data.time === 'string' ? data.time : null,
        minute: data.minute && typeof data.minute === 'object'
          ? { m: data.minute.m ?? null, c: data.minute.c ?? null } : null };
    default:
      return null;
  }
}

export function createQuoteStore({ url = '/api/stream', eventSourceFactory, onStatus, timers } = {}) {
  const clock = timers || { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: id => clearTimeout(id) };
  const factory = eventSourceFactory || (target => new EventSource(target));
  const subs = new Map(); // id → Set(fn)
  const quotes = new Map(); // id → 最新 quote／index 事件（getQuote('TAIEX') 取大盤）
  const lastBars = new Map(); // id → 最新 1 分 K [HH:MM,開,高,低,收,量]
  let es = null, status = null, destroyed = false, reconnectAttempt = 0, openSymbols = '';
  let closeTimer = null, rebuildTimer = null, reconnectTimer = null;

  const setStatus = next => {
    if (next === status || destroyed) return;
    status = next;
    try { onStatus?.(next); } catch {}
  };
  const symbolsUrl = () => {
    const qs = [...subs.keys()].map(encodeURIComponent).join(',');
    return `${url}${url.includes('?') ? '&' : '?'}symbols=${qs}`;
  };
  const clearCloseTimer = () => { if (closeTimer != null) { clock.clearTimeout(closeTimer); closeTimer = null; } };
  const clearRebuildTimer = () => { if (rebuildTimer != null) { clock.clearTimeout(rebuildTimer); rebuildTimer = null; } };
  const clearReconnectTimer = () => { if (reconnectTimer != null) { clock.clearTimeout(reconnectTimer); reconnectTimer = null; } };

  function closeEs() {
    if (!es) return;
    const s = es; es = null;
    try { s.close(); } catch {}
  }
  function open() {
    if (destroyed || !subs.size) return;
    closeEs();
    // 重建連線（代號集合變動）時若本來就是 live，不翻狀態；初次或重連才標 connecting/reconnecting
    if (status !== 'live') setStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    const target = symbolsUrl();
    let source;
    try { source = factory(target); } catch { scheduleReconnect(); return; }
    es = source; openSymbols = target;
    for (const type of SSE_TYPES) {
      try { source.addEventListener(type, ev => onEvent(type, ev.data)); } catch {}
    }
    source.onmessage = ev => onEvent(null, ev.data);
    source.onopen = () => { reconnectAttempt = 0; setStatus('live'); };
    source.onerror = () => {
      if (source !== es || destroyed) return;
      closeEs();
      setStatus('dead');
      scheduleReconnect();
    };
  }
  function scheduleReconnect() {
    if (destroyed || reconnectTimer != null || !subs.size) return;
    const delay = SSE_BACKOFF_MS[Math.min(reconnectAttempt, SSE_BACKOFF_MS.length - 1)];
    reconnectAttempt++;
    reconnectTimer = clock.setTimeout(() => { reconnectTimer = null; open(); }, delay);
  }
  function scheduleRebuild() {
    if (destroyed || !es || !subs.size || rebuildTimer != null) return;
    rebuildTimer = clock.setTimeout(() => { rebuildTimer = null; if (!destroyed && es && subs.size && symbolsUrl() !== openSymbols) open(); }, REBUILD_DEBOUNCE_MS);
  }
  function scheduleClose() {
    if (destroyed || !es || closeTimer != null) return;
    closeTimer = clock.setTimeout(() => { closeTimer = null; closeEs(); }, SSE_CLOSE_DELAY_MS);
  }
  function onEvent(type, raw) {
    const parsed = parseStreamEvent(raw, type);
    if (!parsed) return;
    reconnectAttempt = 0;
    setStatus('live');
    if (parsed.type === 'quote' || parsed.type === 'index') quotes.set(parsed.id, parsed);
    else if (parsed.type === 'bar') lastBars.set(parsed.id, parsed.bar);
    const set = parsed.id ? subs.get(parsed.id) : null;
    if (set) for (const fn of [...set]) { try { fn(parsed); } catch {} }
  }

  function subscribe(id, fn) {
    if (destroyed || typeof id !== 'string' || !id || typeof fn !== 'function') return () => {};
    let set = subs.get(id);
    const isNewId = !set;
    if (!set) { set = new Set(); subs.set(id, set); }
    set.add(fn);
    clearCloseTimer();
    if (!es) open();
    else if (isNewId && symbolsUrl() !== openSymbols) scheduleRebuild();
    return () => unsubscribe(id, fn);
  }
  function unsubscribe(id, fn) {
    const set = subs.get(id);
    if (!set) return;
    set.delete(fn);
    if (!set.size) {
      subs.delete(id);
      clearRebuildTimer();
      if (!subs.size) scheduleClose();
      else if (es && symbolsUrl() !== openSymbols) scheduleRebuild();
    }
  }
  function destroy() {
    destroyed = true;
    clearCloseTimer();
    clearRebuildTimer();
    clearReconnectTimer();
    closeEs();
    subs.clear(); quotes.clear(); lastBars.clear();
  }

  return {
    subscribe, unsubscribe,
    getQuote: id => quotes.get(id) || null,
    getLastBar: id => lastBars.get(id) || null,
    getStatus: () => status || 'connecting',
    destroy,
  };
}

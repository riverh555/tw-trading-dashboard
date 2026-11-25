// 台新證券（Nova API）：以 Node.js SDK（taishin-sdk，原生 Rust binding）取得台股盤中即時報價。
// 官方流程：login → registerApiAuth（首次開通 API 資格，之後即可移除）→ initRealtime →
//   websocket_client.stock → connect() → 訂閱 aggregates 頻道（即時行情）。
// 報價走 WebSocket aggregates，不走 REST：SDK 內建的 marketdata 客戶端 baseUrl 含 /v1.0，
// 但 @fugle/marketdata 1.8.0 起 baseUrl 不可含版本段（withVersion 會自行補上），
// 直接用會拋「baseUrl must not include a version segment」；所以自行以正確的 baseUrl
// （不含版本段）建立 WebSocketClient。錯誤回傳格式為 {"code","message"}（見官方錯誤處理文件）。
import taishinSdk from 'taishin-sdk';
import { WebSocketClient } from '@fugle/marketdata';
import { config } from '../config.mjs';
import { getSecret } from '../secrets.mjs';
import { DataError } from './common.mjs';

const LABEL = '台新證券';
const TW_TZ = 'Asia/Taipei';
const { TaishinSDK } = taishinSdk;
// 台新即時行情 WebSocket（版本段由 client 自行補上，最終為 wss://fubon-api.fugle.tw/marketdata/v1.0/stock/streaming）
const WS_BASE = 'wss://fubon-api.fugle.tw/marketdata';
// 等待授權／首筆 aggregate 的逾時（毫秒）
const AUTH_TIMEOUT = 10000;
const FIRST_AGG_TIMEOUT = 10000;

let sdk = null;
let lastCreds = null;
let lastToken = null;

// WebSocket 即時行情：一個連線、多檔訂閱、最新 aggregate 快取
let wsFactory = null;
let wsStock = null;
let wsToken = null; // 建 WS 時用的 token；token 換了就要重建
let wsConnected = false;
let wsAuthed = false;
let wsError = null;
const aggCache = new Map(); // symbol → aggregate
const aggWaiters = new Map(); // symbol → Set<{resolve, reject, timer}>
const wsSymbols = new Set();
let wsConnectPromise = null;
let authWaiter = null; // {resolve, reject, timer}

// 台新設定：身分證字號與憑證檔案路徑（.pfx）從 config；登入密碼（TAISHIN_PASSWORD）與憑證密碼（TAISHIN_CERT_PASS）從 secrets
function taishinSettings() {
  const c = config().providers?.taishin || {};
  return { personalId: c.personalId || '', certPath: c.certPath || '' };
}

function credKey(personalId, certPath, password, certPass) {
  return `${personalId}|${certPath}|${password}|${certPass}`;
}

// SDK 原生錯誤（Rust binding 拋出的 plain Error）轉成可顯示的 DataError，設定頁才看得到真正原因
// 原生錯誤的訊息可能是 {"code","message"} JSON（官方錯誤格式），或帶 code 屬性
// （實測：憑證路徑錯誤時 code='GenericFailure'）；兩種都攤平成「代碼：訊息」，設定頁才看得到真正的錯誤代碼
function nativeErrText(e) {
  const msg = e instanceof Error ? e.message : String(e);
  const raw = String(msg || '');
  try {
    const d = JSON.parse(raw);
    if (d && typeof d === 'object') return errText(d, raw);
  } catch { /* 不是 JSON，當一般訊息處理 */ }
  const code = e && typeof e === 'object' && typeof e.code === 'string' && e.code ? e.code : '';
  return code ? `${code}：${raw}` : raw;
}

function sdkError(e, step) {
  return new DataError('{label}：台新{step}失敗：{msg}', { label: LABEL, step, msg: nativeErrText(e) }, { fatal: true, code: 'auth' });
}

// 官方錯誤回傳格式 {"code","message"} → 可讀訊息
function errText(d, fallback = 'WebSocket error') {
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  const code = d.code ? String(d.code) : '';
  const msg = d.message ? String(d.message) : '';
  return (code && msg ? `${code} ${msg}` : code || msg || fallback);
}

// Fugle 時間戳可能是微秒／毫秒／秒，統一成毫秒
const tsMs = (ts) => { const n = Number(ts); if (!Number.isFinite(n) || n <= 0) return null; return n > 1e14 ? n / 1000 : n > 1e11 ? n : n * 1000; };

// 登入、執行 API 認證（尚未開通台新 API 者首次登入時需執行 registerApiAuth）、建立行情連線
async function connect(loginPassword, certPass) {
  const { personalId, certPath } = taishinSettings();
  if (!personalId || !certPath) throw new DataError('{label}：請填寫台新證券帳號（身分證字號）與憑證檔案路徑', { label: LABEL }, { fatal: true, code: 'auth' });
  if (!loginPassword) throw new DataError('{label}：請先填寫帳號、密碼與憑證密碼', { label: LABEL }, { fatal: true, code: 'auth' });
  if (!certPass) throw new DataError('{label}：請填寫憑證密碼', { label: LABEL }, { fatal: true, code: 'auth' });
  const creds = credKey(personalId, certPath, loginPassword, certPass);
  if (sdk && lastCreds === creds) return;
  const s = new TaishinSDK();
  let accounts;
  try {
    accounts = s.login(personalId, loginPassword, certPath, certPass);
  } catch (e) {
    throw sdkError(e, '登入');
  }
  const acc = Array.isArray(accounts) ? accounts[0] : accounts;
  if (!acc) throw new DataError('{label}：登入回應沒有帳號', { label: LABEL }, { fatal: true, code: 'auth' });
  // 官方文件：registerApiAuth 只在首次開通 API 時執行，之後應移除；已開通者重複執行可能失敗，
  // 只要後續行情授權成功就忽略，失敗時再把認證錯誤一併回報
  let authNote = '';
  try {
    const registered = s.registerApiAuth(acc);
    if (!registered) authNote = 'API 認證回傳未完成';
  } catch (e) {
    authNote = nativeErrText(e);
  }
  try {
    s.initRealtime(acc);
  } catch (e) {
    const msg = nativeErrText(e);
    throw new DataError('{label}：台新{step}失敗：{msg}', { label: LABEL, step: '行情授權', msg: authNote ? `${msg}（API 認證：${authNote}）` : msg }, { fatal: true, code: 'auth' });
  }
  // 取得即時行情 Bearer token，供 WebSocket 授權使用
  let token;
  try {
    token = s.getRealtimeToken(acc)?.realtimeToken || null;
  } catch (e) {
    throw sdkError(e, '行情授權');
  }
  if (!token) throw new DataError('{label}：未取得台新即時行情授權，請重試', { label: LABEL }, { fatal: true, code: 'auth' });
  sdk = s;
  lastCreds = creds;
  lastToken = token;
  resetStream();
  return acc;
}

// 斷開並清除 WebSocket 狀態（token 換了、授權失敗時重建；aggregate 快取保留，當日最後價仍可用）
function resetStream() {
  if (wsStock) { try { wsStock.disconnect(); } catch {} }
  wsFactory = null;
  wsStock = null;
  wsToken = null;
  wsConnected = false;
  wsAuthed = false;
  wsSymbols.clear();
  wsConnectPromise = null;
  if (authWaiter) { clearTimeout(authWaiter.timer); authWaiter = null; }
}

// 拒絕所有等待中的 aggregate（連線斷了、授權失敗時讓呼叫方立刻知道，不用等逾時）
function failWaiters(err) {
  for (const set of aggWaiters.values()) for (const w of set) { clearTimeout(w.timer); w.reject(err); }
  aggWaiters.clear();
  if (authWaiter) { clearTimeout(authWaiter.timer); const w = authWaiter; authWaiter = null; w.reject(err); }
}

// WebSocket 訊息：aggregates 進快取並叫醒等待者；error 事件記下來
function onWsMessage(raw) {
  let msg;
  try { msg = JSON.parse(typeof raw === 'string' ? raw : String(raw)); } catch { return; }
  if (msg?.event === 'error') {
    wsError = new Error(errText(msg.data, '台新即時行情錯誤'));
    failWaiters(wsError);
    return;
  }
  if (msg?.event !== 'data' || msg?.channel !== 'aggregates') return;
  const d = msg.data;
  if (!d?.symbol) return;
  const sym = String(d.symbol);
  aggCache.set(sym, d);
  const set = aggWaiters.get(sym);
  if (set) {
    aggWaiters.delete(sym);
    for (const w of set) { clearTimeout(w.timer); w.resolve(d); }
  }
}

// 建立 WebSocket client（正確的 baseUrl，不含版本段）並掛上事件
function buildStream() {
  wsFactory = new WebSocketClient({ baseUrl: WS_BASE, bearerToken: lastToken });
  wsStock = wsFactory.stock;
  wsToken = lastToken;
  wsConnected = false;
  wsAuthed = false;
  wsError = null;
  wsSymbols.clear();
  wsStock.on('message', onWsMessage);
  wsStock.on('error', (e) => { wsError = e instanceof Error ? e : new Error(String(e)); failWaiters(wsError); });
  wsStock.on('disconnect', () => { wsConnected = false; wsAuthed = false; failWaiters(new Error('台新即時行情連線中斷')); });
  wsStock.on('authenticated', () => { wsAuthed = true; if (authWaiter) { clearTimeout(authWaiter.timer); const w = authWaiter; authWaiter = null; w.resolve(); } });
  wsStock.on('unauthenticated', (d) => {
    wsError = new Error(errText(d, 'Invalid authentication credentials'));
    wsAuthed = false;
    // token 可能已過期：只有當快取的 token 還是這條連線用的那個，才清除登入快取，
    // 下次重登入取新 token；若 connect 已先取到新 token，就不清除，WS 下次依新 token 重建
    if (lastToken === wsToken) { sdk = null; lastCreds = null; lastToken = null; }
    failWaiters(wsError);
  });
}

// 等待 WebSocket 授權完成（connect 只代表 socket 開了，授權是另外的事件）
function waitAuth(timeoutMs = AUTH_TIMEOUT) {
  if (wsAuthed) return Promise.resolve();
  if (wsError) return Promise.reject(wsError);
  if (authWaiter) return authWaiter.promise;
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  const timer = setTimeout(() => {
    if (authWaiter && authWaiter.promise === promise) authWaiter = null;
    reject(wsError || new Error('台新即時行情授權逾時'));
  }, timeoutMs);
  authWaiter = { promise, resolve, reject, timer };
  return promise;
}

// 等待某檔的首筆 aggregate（已有快取的直接回傳）
function waitAgg(symbol, timeoutMs = FIRST_AGG_TIMEOUT) {
  if (aggCache.has(symbol)) return Promise.resolve(aggCache.get(symbol));
  if (wsError) return Promise.reject(wsError);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const set = aggWaiters.get(symbol);
      if (set) { set.delete(w); if (!set.size) aggWaiters.delete(symbol); }
      reject(wsError || new Error(`等待 ${symbol} 行情逾時`));
    }, timeoutMs);
    const w = { resolve, reject, timer };
    let set = aggWaiters.get(symbol);
    if (!set) { set = new Set(); aggWaiters.set(symbol, set); }
    set.add(w);
  });
}

// 確保 WebSocket 已連線＋授權，並訂閱 aggregates；回傳已有資料的代碼（逾時只跳過該檔，不整批失敗）
async function ensureStream(ids) {
  const wanted = [...new Set(ids.map(String))].filter(Boolean);
  if (!wanted.length) return [];
  if (!lastToken) throw new DataError('{label}：尚未取得台新即時行情授權，請先完成登入', { label: LABEL }, { fatal: true, code: 'auth' });
  if (!wsStock || wsToken !== lastToken) buildStream();
  if (!wsConnected) {
    if (!wsConnectPromise) {
      wsConnectPromise = wsStock.connect()
        .then(() => { wsConnected = true; wsError = null; })
        .catch((e) => { wsError = e instanceof Error ? e : new Error(String(e)); throw sdkError(wsError, '行情連線'); })
        .finally(() => { wsConnectPromise = null; });
    }
    await wsConnectPromise;
  }
  await waitAuth();
  const fresh = wanted.filter(s => !wsSymbols.has(s));
  if (fresh.length) {
    wsStock.subscribe({ channel: 'aggregates', symbols: fresh });
    fresh.forEach(s => wsSymbols.add(s));
  }
  const got = [];
  await Promise.all(wanted.map(async (s) => {
    try { await waitAgg(s); got.push(s); } catch { /* 該檔逾時，跳過 */ }
  }));
  return got;
}

// 將 aggregates 訊息轉成衡析內部快照格式（見 common.mjs；欄位與 intraday/quote 相同）
function toSnapshot(symbol, d, lot = 1000, tz = TW_TZ) {
  const now = new Date();
  const dateStr = String(d.date || now.toISOString().slice(0, 10));
  const ms = tsMs(d.lastUpdated);
  const timeStr = ms ? new Date(ms).toLocaleTimeString('en-GB', { timeZone: tz, hour12: false }) : now.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
  const hhmmss = String(timeStr || '').slice(0, 8);
  const close = d.lastPrice ?? d.closePrice ?? 0;
  const buyPrice = Array.isArray(d.bids) && d.bids.length > 0 ? d.bids[0].price : null;
  const sellPrice = Array.isArray(d.asks) && d.asks.length > 0 ? d.asks[0].price : null;
  const vol = d.total?.tradeVolume ?? 0;
  const amount = d.total?.tradeValue ?? 0;
  return {
    stock_id: String(symbol),
    date: `${dateStr} ${hhmmss}`,
    open: d.openPrice ?? null,
    high: d.highPrice ?? null,
    low: d.lowPrice ?? null,
    close: close > 0 ? close : null,
    change_price: d.change ?? null,
    total_volume: vol > 0 ? vol / lot : 0,
    total_amount: amount > 0 ? amount : 0,
    yesterday_volume: null,
    buy_price: buyPrice ?? null,
    sell_price: sellPrice ?? null,
  };
}

export { tsMs, toSnapshot, errText, nativeErrText };

export default {
  id: 'taishin', name: '台新證券', site: 'https://www.tssco.com.tw/', docs: 'https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/prepare',
  markets: ['TW'], key: 'required', keyEnv: 'TAISHIN_PASSWORD', interval: 1000,
  caps: { snapshot: 1 }, snapshotMode: 'symbols',
  async validate(key, certPassArg) {
    const password = key || await getSecret('taishin', 'TAISHIN_PASSWORD');
    // 設定頁送出的憑證密碼優先：先驗證、後儲存的流程下，儲存的舊值在第一次設定時是空的
    const certPass = certPassArg || await getSecret('taishinCert', 'TAISHIN_CERT_PASS');
    const acc = await connect(password, certPass);
    const got = await ensureStream(['2330']);
    if (!got.includes('2330')) throw sdkError(wsError || new Error('未收到台新即時行情'), '報價');
    return { plan: 'taishin', tier: 'paid', account: acc };
  },
  snapshot: async (ids, ctx) => {
    if (!ids || ids.length === 0) return [];
    const password = await getSecret('taishin', 'TAISHIN_PASSWORD');
    const certPass = await getSecret('taishinCert', 'TAISHIN_CERT_PASS');
    await connect(password, certPass);
    const got = await ensureStream(ids);
    const lot = ctx.market?.lot ?? 1000;
    const tz = ctx.market?.tz || TW_TZ;
    const out = [];
    for (const id of got) {
      const d = aggCache.get(String(id));
      if (d) out.push(toSnapshot(String(id), d, lot, tz));
    }
    if (!out.length) throw sdkError(wsError || new Error('未收到台新即時行情'), '報價');
    return out;
  },
};

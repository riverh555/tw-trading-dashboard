// 台新證券（Nova API）：以 Node.js SDK（taishin-sdk，原生 Rust binding）取得台股盤中即時報價。
// 架構：SDK 內含 REST（intraday/quote）與 WebSocket（initRealtime）客戶端；登入使用身分證字號＋密碼＋憑證（.pfx）；
// 尚未開通台新 API 者，首次登入需執行 registerApiAuth 完成 API 認證（之後即可移除該行）。
// 與其他資料源一樣，將回傳轉成衡析內部快照格式（見 lib/providers/common.mjs）。
import taishinSdk from 'taishin-sdk';
import { config } from '../config.mjs';
import { getSecret } from '../secrets.mjs';
import { DataError } from './common.mjs';

const LABEL = '台新證券';
const TW_TZ = 'Asia/Taipei';
const { TaishinSDK } = taishinSdk;

let sdk = null;
let lastCreds = null;

// 台新設定：身分證字號與憑證檔案路徑（.pfx）從 config；登入密碼（TAISHIN_PASSWORD）與憑證密碼（TAISHIN_CERT_PASS）從 secrets
function taishinSettings() {
  const c = config().providers?.taishin || {};
  return { personalId: c.personalId || '', certPath: c.certPath || '' };
}

function credKey(personalId, certPath, password, certPass) {
  return `${personalId}|${certPath}|${password}|${certPass}`;
}

// 登入、執行 API 認證（尚未開通台新 API 者首次登入時需執行 registerApiAuth）、建立行情連線
async function connect(loginPassword, certPass) {
  const { personalId, certPath } = taishinSettings();
  if (!personalId || !certPath) throw new DataError('{label}：請填寫台新證券帳號（身分證字號）與憑證檔案路徑', { label: LABEL }, { fatal: true, code: 'auth' });
  if (!loginPassword) throw new DataError('{label}：請先填寫帳號、密碼與憑證密碼', { label: LABEL }, { fatal: true, code: 'auth' });
  if (!certPass) throw new DataError('{label}：請填寫憑證密碼', { label: LABEL }, { fatal: true, code: 'auth' });
  const creds = credKey(personalId, certPath, loginPassword, certPass);
  if (sdk && lastCreds === creds) return;
  const s = new TaishinSDK();
  const accounts = s.login(personalId, loginPassword, certPath, certPass);
  const acc = Array.isArray(accounts) ? accounts[0] : accounts;
  if (!acc) throw new DataError('{label}：登入回應沒有帳號', { label: LABEL }, { fatal: true, code: 'auth' });
  const registered = s.registerApiAuth(acc); // 尚未開通台新 API 者，首次登入時需執行 API 認證
  if (!registered) throw new DataError('{label}：台新 API 認證未完成，請聯繫台新證券後再試', { label: LABEL }, { fatal: true, code: 'auth' });
  s.initRealtime(acc);
  sdk = s;
  lastCreds = creds;
  return acc;
}

// 將台新行情回應轉成衡析內部快照格式（見 common.mjs）
function toSnapshot(symbol, q, lot = 1000, tz = TW_TZ) {
  const now = new Date();
  const dateStr = String(q.date || now.toISOString().slice(0, 10));
  const timeStr = q.lastUpdated ? new Date(Number(q.lastUpdated)).toLocaleString('en-GB', { timeZone: tz, hour12: false }) : now.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
  const hhmmss = String(timeStr || '').slice(0, 8);
  const close = q.lastPrice ?? q.closePrice ?? 0;
  const buyPrice = Array.isArray(q.bids) && q.bids.length > 0 ? q.bids[0].price : null;
  const sellPrice = Array.isArray(q.asks) && q.asks.length > 0 ? q.asks[0].price : null;
  const vol = q.total?.tradeVolume ?? 0;
  const amount = q.total?.tradeValue ?? 0;
  return {
    stock_id: String(symbol),
    date: `${dateStr} ${hhmmss}`,
    open: q.openPrice ?? null,
    high: q.highPrice ?? null,
    low: q.lowPrice ?? null,
    close: close > 0 ? close : null,
    change_price: q.change ?? null,
    total_volume: vol > 0 ? vol / lot : 0,
    total_amount: amount > 0 ? amount : 0,
    yesterday_volume: null,
    buy_price: buyPrice ?? null,
    sell_price: sellPrice ?? null,
  };
}

export default {
  id: 'taishin', name: '台新證券', site: 'https://www.tssco.com.tw/', docs: 'https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/prepare',
  markets: ['TW'], key: 'required', keyEnv: 'TAISHIN_PASSWORD', interval: 1000,
  caps: { snapshot: 1 }, snapshotMode: 'symbols',
  async validate(key) {
    const password = key || await getSecret('taishin', 'TAISHIN_PASSWORD');
    const certPass = await getSecret('taishinCert', 'TAISHIN_CERT_PASS');
    const acc = await connect(password, certPass);
    const q = await sdk.marketdata.restClient.stock.intraday.quote({ symbol: '2330' });
    return { plan: 'taishin', tier: 'paid', account: acc };
  },
  snapshot: async (ids, ctx) => {
    if (!ids || ids.length === 0) return [];
    const password = await getSecret('taishin', 'TAISHIN_PASSWORD');
    const certPass = await getSecret('taishinCert', 'TAISHIN_CERT_PASS');
    await connect(password, certPass);
    const out = [];
    const lot = ctx.market?.lot ?? 1000;
    const tz = ctx.market?.tz || TW_TZ;
    for (const id of ids) {
      const q = await sdk.marketdata.restClient.stock.intraday.quote({ symbol: String(id) });
      out.push(toSnapshot(String(id), q, lot, tz));
    }
    return out;
  },
};

// 即時看盤：技術指標套用的純函式（不碰 DOM、不碰網路；瀏覽器與 node 測試共用）。
// 指標目錄由 lightweight-charts-indicators 的 indicatorRegistry 提供；這裡只放與目錄無關的邏輯。
// 收藏種子是 River 的 TradingView 收藏中、目錄裡找得到的 4 個（2026-11-24 對 0.26.4 實查）：
//   Smart Money Concepts (SMC) → smart-money-concepts-luxalgo（LuxAlgo 公開版的移植，registry 顯示名沒有 [LuxAlgo] 後綴）
//   Machine Learning Adaptive SuperTrend [AlgoAlpha] → ml-adaptive-supertrend
//   Average Sentiment Oscillator → average-sentiment-oscillator
//   Moving average convergence divergence → macd
// wojtek_s730ir 的「Supertrend with Entry, TP1, TP2 & TP3」不在目錄裡，不要冒充；目錄裡另有 Supertrend 變體。

export const SEEDED_FAVORITES = [
  { id: 'smart-money-concepts-luxalgo', name: 'Smart Money Concepts (SMC)' },
  { id: 'ml-adaptive-supertrend', name: 'Machine Learning Adaptive SuperTrend [AlgoAlpha]' },
  { id: 'average-sentiment-oscillator', name: 'Average Sentiment Oscillator' },
  { id: 'macd', name: 'Moving average convergence divergence' },
];

// 目錄的 8 個分類（registry 的 category 原文）＋中文顯示
export const INDICATOR_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'Moving Averages', label: '均線' },
  { id: 'Momentum', label: '動能' },
  { id: 'Volatility', label: '波動' },
  { id: 'Volume', label: '成交量' },
  { id: 'Trend', label: '趨勢' },
  { id: 'Oscillators', label: '震盪' },
  { id: 'Channels & Bands', label: '通道' },
  { id: 'Candlestick Patterns', label: 'K 線型態' },
];

export const GROUP_LABELS = { standard: '內建', community: '社群', candlestick: '型態' };
export const SOURCE_OPTIONS = ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4', 'hlcc4', 'volume'];

// 搜尋：比對 id／名稱／簡稱（不分大小寫），可按分類過濾；只回傳前 limit 筆，1,700 多筆目錄才跑得動
export function searchIndicators(entries, query = '', category = 'all', limit = 100) {
  const q = String(query || '').trim().toLowerCase();
  const out = [];
  for (const e of entries || []) {
    if (category !== 'all' && e.category !== category) continue;
    if (q && ![e.id, e.name, e.shortName].some(s => String(s || '').toLowerCase().includes(q))) continue;
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

// 收藏置頂：收藏的（照收藏順序）放前面，其餘維持目錄順序
export function pinFavorites(results, favIds) {
  const favs = new Set(favIds || []);
  const top = [], rest = [];
  for (const e of results || []) (favs.has(e.id) ? top : rest).push(e);
  top.sort((a, b) => (favIds || []).indexOf(a.id) - (favIds || []).indexOf(b.id));
  return [...top, ...rest];
}

// 套用前的擋下檢查：重複套用、或跟上方均線／MACD 開關畫到同一條線時擋下（回傳原因碼，null 表示可套用）
export function applyBlocked(entryId, appliedIds, toggles) {
  if ((appliedIds || []).includes(entryId)) return 'already';
  if (entryId === 'macd' && toggles?.showMACD) return 'macd-toggle';
  if (entryId === 'sma' && toggles?.showMA) return 'ma-toggle';
  return null;
}

// 參數正規化：預設值＋使用者改動，依 inputConfig 的型別轉型（表單來的都是字串），超出 min／max 時夾住
export function normalizeInputs(entry, changes = {}) {
  const out = { ...(entry.defaultInputs || {}) };
  for (const cfg of entry.inputConfig || []) {
    if (!(cfg.id in changes)) continue;
    const v = changes[cfg.id];
    if (cfg.type === 'int') { const n = parseInt(v, 10); if (Number.isFinite(n)) out[cfg.id] = clamp(n, cfg.min, cfg.max); }
    else if (cfg.type === 'float') { const n = parseFloat(v); if (Number.isFinite(n)) out[cfg.id] = clamp(n, cfg.min, cfg.max); }
    else if (cfg.type === 'bool') out[cfg.id] = v === true || v === 'true' || v === '1';
    else out[cfg.id] = v;
  }
  return out;
}
const clamp = (n, min, max) => {
  let x = n;
  if (typeof min === 'number') x = Math.max(min, x);
  if (typeof max === 'number') x = Math.min(max, x);
  return x;
};

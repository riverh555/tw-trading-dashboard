// K 線時間換算（即時看盤用；純函式，可單元測試）。
// 伺服器 K 棒列格式：[標籤, 開, 高, 低, 收, 量]；標籤為 'YYYY-MM-DD'（日 K）或 'YYYY-MM-DD HH:MM'（分 K，台北時間）。
// Lightweight Charts 接受的時間：日 K 用 'YYYY-MM-DD' 字串；分 K 用 epoch 秒數（數字）。

export const PERIODS = ['1m', '3m', '5m', '15m', '60m', 'day'];
export const PERIOD_MINUTES = { '1m': 1, '3m': 3, '5m': 5, '15m': 15, '60m': 60 };
export const validPeriod = p => PERIODS.includes(p);

// 標籤 → 圖表時間：日 K 回傳原字串；分 K 回傳台北時間的 epoch 秒數；無法解析回傳 null
export function barTime(label) {
  const s = String(label || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+08:00`);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

// K 棒列 → Lightweight Charts 序列（過濾無效列；量為 0 也保留，收盤價必須 > 0）
export function toChartBars(bars) {
  const out = [];
  for (const b of bars || []) {
    const time = barTime(b?.[0]);
    if (time == null || !(b[4] > 0)) continue;
    out.push({ time, open: b[1], high: b[2], low: b[3], close: b[4], volume: Math.max(0, b[5] || 0) });
  }
  return out;
}

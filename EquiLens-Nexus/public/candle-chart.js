// 即時看盤：新 K 線圖（shioaji-pro-app candle-chart 做法的原生重寫，不複製程式碼）。
// Lightweight Charts 5.3.0；K 線＋量；圖例 overlay（OHLC＋每個指標一行）；往左捲載入更舊歷史；
// 切週期／換股票只換資料，不重建圖表（舊的 chartKey 重建邏輯已刪除）。
// 指標（MA／MACD／目錄指標）由實例層提供，本模組只給 series／pane 的原語，不直接算指標。
import { fmt } from './insight-ui.js';
import { initialVisibleRange } from './chart-range.js';

const TW_TZ = 'Asia/Taipei';
const UP = '#ff3d5a', DOWN = '#16e38b';
const twDate = t => typeof t === 'number' ? new Date(t * 1000) : new Date(`${t}T00:00:00+08:00`);
const twTick = (time, type) => {
  const d = twDate(time), o = { timeZone: TW_TZ };
  if (type === 0) return d.toLocaleString('zh-TW', { ...o, year: 'numeric' });
  if (type === 1) return d.toLocaleString('zh-TW', { ...o, month: 'short' });
  if (type === 2) return d.toLocaleString('zh-TW', { ...o, day: 'numeric' });
  return d.toLocaleString('zh-TW', { ...o, hour12: false, hour: '2-digit', minute: '2-digit' });
};
const twFull = t => twDate(t).toLocaleString('zh-TW', { timeZone: TW_TZ, hour12: false });
// 日 K 標籤是 'YYYY-MM-DD' 字串；指標計算與圖例都需要數字時間，統一換成台北時間的 epoch 秒數。
// 也吃 /api/chart 回傳的陣列列 ['YYYY-MM-DD HH:MM'|'YYYY-MM-DD', 開, 高, 低, 收, 量]（與 lib/candles.mjs 的 barTime 同規則）。
const parseBarTime = s => {
  if (typeof s === 'number') return s;
  const str = String(s || '');
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(str);
  if (!m) return NaN;
  const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4] || '00'}:${m[5] || '00'}:00+08:00`);
  return Number.isFinite(t) ? Math.floor(t / 1000) : NaN;
};
export const numBars = bars => (bars || []).map(b => Array.isArray(b)
  ? { time: parseBarTime(b[0]), open: b[1], high: b[2], low: b[3], close: b[4], volume: b[5] || 0 }
  : { time: parseBarTime(b.time), open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0 });
export const barLabel = b => {
  if (!b) return '';
  let t = b.time;
  if (typeof t === 'number') {
    const d = new Date(t * 1000);
    const date = d.toLocaleDateString('sv-SE', { timeZone: TW_TZ });
    const hm = d.toLocaleTimeString('en-GB', { timeZone: TW_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    t = hm === '00:00' ? date : `${date} ${hm}`; // 日 K 午夜只顯示日期，分時顯示 HH:MM
  }
  return `${t}　開 ${fmt(b.open, 2)}　高 ${fmt(b.high, 2)}　低 ${fmt(b.low, 2)}　收 ${fmt(b.close, 2)}`;
};

// 合併兩組已排序的 bars：依 time 去重（重複時保留 existing 那組）、排序。給無限歷史分頁用。
export function mergeBars(existing, incoming) {
  const byTime = new Map();
  for (const b of incoming || []) byTime.set(b.time, b);
  for (const b of existing || []) byTime.set(b.time, b); // existing 優先
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
// 圖例數值格式化：plot 尾值可能是 null／NaN，顯示 — 而不是炸掉或顯示 NaN
export function formatLegendValue(v, digits = 2) {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? fmt(n, digits) : '—';
}

export function createCandleChart({ el, lib, onNeedOlder }) {
  const { lwc } = lib;
  const chart = lwc.createChart(el, {
    width: el.clientWidth || 800, height: el.clientHeight || 480,
    layout: { background: { type: lwc.ColorType.Solid, color: '#03060c' }, textColor: '#8fa3b8', fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    grid: { vertLines: { color: 'rgba(148,163,184,.07)' }, horzLines: { color: 'rgba(148,163,184,.07)' } },
    crosshair: { mode: lwc.CrosshairMode.Normal },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(148,163,184,.25)', tickMarkFormatter: twTick },
    rightPriceScale: { borderColor: 'rgba(148,163,184,.25)' },
    localization: { locale: 'zh-TW', timeFormatter: twFull },
  });
  const candles = chart.addSeries(lwc.CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false });
  let bars = [], loadingOlder = false, destroyed = false, legendRows = [], suppressOlderOnce = false;

  // ---- 圖例 overlay（左上，absolute；容器不擋圖表操作，只有按鈕可點）----
  const legendEl = document.createElement('div');
  legendEl.className = 'wv-legend-overlay';
  el.appendChild(legendEl);
  const paintLegend = (crossBar) => {
    const ohlc = crossBar || bars.at(-1);
    const rows = [`<div class="wv-lg-ohlc">${barLabel(ohlc) || ''}</div>`];
    for (const r of legendRows) {
      const vals = (r.values || []).map(v => `<span style="color:${v.color || 'inherit'}">${v.text}</span>`).join(' ');
      rows.push(`<div class="wv-lg-row${r.visible === false ? ' off' : ''}"><span class="wv-lg-name" style="color:${r.color || 'inherit'}">${r.name}</span><span class="wv-lg-vals">${vals}</span><span class="wv-lg-btns"><button type="button" data-lg-settings="${r.uid}" title="設定" aria-label="設定">⚙</button><button type="button" data-lg-toggle="${r.uid}" title="顯示／隱藏" aria-label="顯示／隱藏">👁</button><button type="button" data-lg-remove="${r.uid}" title="移除" aria-label="移除">×</button></span></div>`);
    }
    legendEl.innerHTML = rows.join('');
  };
  legendEl.addEventListener('click', e => {
    e.stopPropagation(); // 圖例按鈕在圖表容器內：不擋住的話點擊會冒泡到圖表，畫線工具會誤以為在圖上點了一下
    const b = e.target.closest('button'); if (!b) return;
    const row = legendRows.find(r => r.uid === (b.dataset.lgSettings || b.dataset.lgToggle || b.dataset.lgRemove));
    if (!row) return;
    if (b.dataset.lgSettings) row.onSettings?.(row.uid);
    else if (b.dataset.lgToggle) row.onToggle?.(row.uid);
    else if (b.dataset.lgRemove) row.onRemove?.(row.uid);
  });
  chart.subscribeCrosshairMove(param => {
    if (destroyed) return;
    const bar = param.seriesData?.get(candles);
    paintLegend(bar && bar.open != null ? { time: param.time, ...bar } : null);
  });
  // ---- 無限歷史：可見範圍左緣接近最舊一根時，請整合層載入更舊的 bars ----
  chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (destroyed || loadingOlder || !range || !bars.length) return;
    if (suppressOlderOnce) { suppressOlderOnce = false; return; } // setBars 剛設好的範圍不觸發載入舊資料
    if (range.from < 10) {
      loadingOlder = true;
      try {
        const p = onNeedOlder?.();
        if (p && typeof p.finally === 'function') p.finally(() => { loadingOlder = false; });
        else loadingOlder = false;
      } catch { loadingOlder = false; }
    }
  });
  const resizeObs = new ResizeObserver(() => { if (!destroyed) chart.applyOptions({ width: el.clientWidth, height: el.clientHeight }); });
  resizeObs.observe(el);

  const api = {
    getChart: () => chart,
    getCandles: () => candles,
    getBars: () => bars,
    // 換股票／換週期：整組換掉，左邊留 5 根空白（只在整組換資料時套用一次，之後不再重設）
    setBars(next) {
      bars = numBars(next);
      candles.setData(bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
      const range = initialVisibleRange(bars.length);
      // 剛換上的範圍 from=-5 會立刻觸發 onNeedOlder；只讓使用者往左捲時才載入更舊歷史
      suppressOlderOnce = true;
      setTimeout(() => { suppressOlderOnce = false; }, 1000);
      if (range) { try { chart.timeScale().setVisibleLogicalRange(range); } catch { } }
      loadingOlder = false;
      paintLegend();
    },
    // 同一股票／週期輪詢刷新：新資料優先（同一 time 以新版為準），但保留已載入的更舊歷史；
    // 直接整組換掉會把無限分頁的 bars 清掉，可見範圍指到資料外，圖表會跳動。
    replaceBars(next) {
      bars = mergeBars(numBars(next), bars);
      candles.setData(bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
      paintLegend();
    },
    // 無限歷史分頁：舊 bars 接到前面；可見範圍跟著往右移同樣根數，畫面不跳
    prependBars(older) {
      if (!older?.length) return;
      const merged = mergeBars(bars, numBars(older));
      const added = merged.length - bars.length;
      if (added <= 0) return;
      const ts = chart.timeScale(), vr = ts.getVisibleLogicalRange();
      bars = merged;
      candles.setData(bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
      if (vr) { try { ts.setVisibleLogicalRange({ from: vr.from + added, to: vr.to + added }); } catch { } }
      paintLegend();
    },
    // 即時 tick：更新或追加最後一根；新 K 棒出現且在最右邊時自動跟到最新
    updateLastBar(bar) {
      if (!bar || !bars.length) return;
      const nb = numBars([bar])[0], last = bars.at(-1);
      const grew = nb.time > last.time;
      if (grew) bars.push(nb); else if (nb.time === last.time) bars[bars.length - 1] = nb; else return;
      try { candles.update({ time: nb.time, open: nb.open, high: nb.high, low: nb.low, close: nb.close }); } catch { }
      if (grew) {
        const ts = chart.timeScale(), vr = ts.getVisibleLogicalRange();
        if (!vr || vr.to >= bars.length - 4) { try { ts.scrollToRealTime(); } catch { } }
      }
      paintLegend();
    },
    // 實例層用的原語：開副圖、加 series（MA／MACD／目錄指標由此接入）
    addPane(height) { try { chart.addPane(); const i = chart.panes().length - 1; if (height) chart.panes()[i]?.setHeight(height); return i; } catch { return -1; } },
    removePane(index) { try { chart.removePane(index); } catch { } },
    addSeries(type, options, paneIndex) { return chart.addSeries(type, options, paneIndex); },
    removeSeries(series) { try { chart.removeSeries(series); } catch { } },
    // 圖例：實例層傳入已格式化的 rows；OHLC 第一行由本模組自己管
    setLegendRows(rows) { legendRows = rows || []; paintLegend(); },
    destroy() {
      destroyed = true;
      try { resizeObs.disconnect(); } catch { }
      try { legendEl.remove(); } catch { }
      try { chart.remove(); } catch { }
      bars = [];
    },
  };
  paintLegend();
  return api;
}

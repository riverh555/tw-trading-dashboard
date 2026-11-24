// 衡析 Nexus：即時看盤頁（自選 K 線＋五檔＋成交明細＋加權指數；僅看盤，不下單）。
// K 線由 Lightweight Charts 繪製，MA／MACD 由 lightweight-charts-indicators 計算（ESM importmap，見 index.html）。
// 圖表模組檔不進版控：安裝時由 tools/fetch-vendor.mjs 下載到 public/vendor/；尚未下載時本頁顯示提示，其他功能不受影響。
import { esc, fmt, pct, cls, sparkSVG } from './insight-ui.js';
import * as MK from './market.js';
import { bookHTML, tapeHTML } from './intraday.js';

let C = null; // { api, toast, state, redraw, page, inScope }
const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } }, savePref = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
const PERIODS = ['1m', '3m', '5m', '15m', '60m', 'day'];
const PERIOD_LABEL = { '1m': '1分', '3m': '3分', '5m': '5分', '15m': '15分', '60m': '60分', day: '日K' };
const UP = '#ff3d5a', DOWN = '#16e38b', MA5C = '#f0b90b', MA20C = '#22e6ff', DIFC = '#2962ff', DEAC = '#ff6d00';
const W = {
  id: null, period: pref('nexus.watchPeriod', '5m'), group: pref('nexus.watchGroup', ''), query: '',
  board: null, data: null, error: '', lib: null, libError: '',
  showMA: pref('nexus.watchMA', '1') === '1', showVol: pref('nexus.watchVol', '1') === '1', showMACD: pref('nexus.watchMACD', '1') === '1',
  chart: null, chartEl: null, chartKey: '', series: null, idxChart: null, idxChartEl: null, resizeObs: null,
};
export function initWatch(ctx) { C = ctx; }

// 日 K 標籤是 'YYYY-MM-DD' 字串；指標計算需要數字時間，統一換成台北時間的 epoch 秒數
const numBars = bars => (bars || []).map(b => ({ time: typeof b.time === 'number' ? b.time : Math.floor(Date.parse(`${b.time}T00:00:00+08:00`) / 1000), open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0 }));
const barLabel = b => b ? `${typeof b.time === 'number' ? new Date(b.time * 1000).toISOString().slice(0, 10) : b.time}　開 ${fmt(b.open, 2)}　高 ${fmt(b.high, 2)}　低 ${fmt(b.low, 2)}　收 ${fmt(b.close, 2)}` : '';

let boardBusy = null;
async function loadBoard() { if (boardBusy) return boardBusy; boardBusy = (async () => { try { W.board = await C.api('board?group=watch'); } catch (e) { W.error = e.message; } })().finally(() => { boardBusy = null; }); return boardBusy; }
let watchBusy = null;
async function loadWatch() { if (watchBusy) return watchBusy; watchBusy = (async () => { try { W.data = await C.api(`watch?id=${encodeURIComponent(W.id)}&period=${encodeURIComponent(W.period)}`); W.error = ''; } catch (e) { W.error = e.message; C.toast(e.message); } })().finally(() => { watchBusy = null; }); return watchBusy; }
export async function enterWatch() {
  const st = C.state();
  if (!W.id || !(st.watchlist || []).includes(W.id)) W.id = (st.watchlist || [])[0] || '3406';
  await Promise.all([loadBoard(), loadWatch()]);
  if (C.page() !== 'watch') return;
  paintWatch(); await syncWatchDOM();
}

// ---------- 自選橫條 ----------
const wg = () => C.state().watchGroups || { groups: [], assign: {} };
const inGroup = id => !W.group || (W.group === 'none' ? !wg().assign[id] : wg().assign[id] === W.group);
function chipList() {
  const st = C.state(), q = W.query.trim();
  return (W.board?.stocks || []).filter(s => st.watchlist.includes(s.id) && inGroup(s.id) && (!q || `${s.id} ${s.name}`.includes(q)));
}
function chipsHTML() {
  const list = chipList();
  if (!list.length) return `<div class="empty">${W.board ? '沒有符合條件的自選股。' : '載入自選清單中…'}</div>`;
  return list.map(s => { const px = s.quote?.close ?? s.daily?.price, ch = s.quote?.change ?? s.daily?.change; return `<button class="wv-chip ${s.id === W.id ? 'selected' : ''}" data-wchip="${esc(s.id)}" aria-pressed="${s.id === W.id}"><span class="wv-name">${esc(s.name)}<span class="wv-code">${esc(s.id)}</span></span><span class="wv-px"><b class="${cls(ch)}">${px != null ? fmt(px, 2) : '—'}</b><span class="${cls(ch)}">${pct(ch)}</span></span><span class="wv-spark">${sparkSVG(s.spark, s.prev, { w: 38, h: 12, xs: s.sparkX })}</span></button>`; }).join('');
}
function paintStrip() { const el = document.getElementById('wv-chips'); if (el) el.innerHTML = chipsHTML(); const n = document.getElementById('wv-count'); if (n) n.textContent = `${chipList().length} 檔`; }

// ---------- 頁面 ----------
function headHTML() {
  const d = W.data, q = d?.quote;
  if (!d) return `<div class="wv-head"><h2>${esc(W.id || '')}</h2><span class="wv-meta">載入中…</span></div>`;
  return `<div class="wv-head"><h2>${esc(d.name)} <span class="wv-meta">${esc(d.id)}</span></h2><span class="wv-px ${cls(q?.change)}">${q?.last != null ? fmt(q.last, 2) : '—'}</span><span class="wv-meta ${cls(q?.change)}">${q?.change != null ? `${q.changePrice > 0 ? '+' : ''}${fmt(q.changePrice, 2)}（${pct(q.change)}）` : ''}</span><span class="wv-meta">昨收 ${d.ref != null ? fmt(d.ref, 2) : '—'}　開 ${fmt(q?.open, 2)}　高 ${fmt(q?.high, 2)}　低 ${fmt(q?.low, 2)}　量 ${fmt(q?.volume)}　${q?.time || ''}</span></div>`;
}
export function watchPage() {
  const st = C.state();
  if (!W.id) W.id = (st.watchlist || [])[0] || '3406';
  const g = wg();
  queueMicrotask(() => syncWatchDOM());
  return `<div class="wv-strip"><input type="search" id="wv-filter" placeholder="篩選代碼或名稱" value="${esc(W.query)}" aria-label="篩選代碼或名稱"><select id="wv-group" aria-label="自訂族群"><option value="">全部自選（${st.watchlist.length}）</option>${g.groups.map(x => `<option value="${esc(x.id)}" ${W.group === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}<option value="none" ${W.group === 'none' ? 'selected' : ''}>未分組</option></select><span class="wv-count" id="wv-count">${chipList().length} 檔</span>${W.error ? `<span class="wv-count" style="color:var(--down)">${esc(W.error)}</span>` : ''}</div>
  <div class="wv-chips" id="wv-chips">${chipsHTML()}</div>
  <div class="wv-layout"><section class="panel wv-chartbox"><div class="contentpad">${headHTML()}<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:6px 0 8px"><div class="segmented" role="group" aria-label="K 線週期">${PERIODS.map(p => `<button data-wperiod="${p}" class="${W.period === p ? 'selected' : ''}" aria-pressed="${W.period === p}">${PERIOD_LABEL[p]}</button>`).join('')}</div><div class="actions"><button data-wtoggle="ma" aria-pressed="${W.showMA}" class="${W.showMA ? 'selected' : ''}">均線</button><button data-wtoggle="vol" aria-pressed="${W.showVol}" class="${W.showVol ? 'selected' : ''}">成交量</button><button data-wtoggle="macd" aria-pressed="${W.showMACD}" class="${W.showMACD ? 'selected' : ''}">MACD</button></div></div><div class="wv-legend" id="wv-legend"></div><div class="wv-chart" id="wv-chart"><div class="wv-empty">${W.libError ? `圖表元件載入失敗：${esc(W.libError)}` : '載入圖表元件中…'}</div></div><p class="fine">圖表由 TradingView Lightweight Charts 提供（<a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">tradingview.com</a>）· 均線與 MACD 由 lightweight-charts-indicators 計算 · 僅供看盤參考，不構成投資建議</p></div></section>
  <div class="wv-rail"><section class="panel"><div class="panelhead"><h2>加權指數</h2><span class="fine" id="wv-idx-quote"></span></div><div class="contentpad"><div class="wv-idxchart" id="wv-idx"></div></div></section>
  <section class="panel"><div class="panelhead"><h2>五檔報價</h2></div><div class="contentpad" id="wv-book">${W.data ? bookHTML(W.data) : '<div class="empty">載入中…</div>'}</div></section>
  <section class="panel"><div class="panelhead"><h2>成交明細</h2></div><div class="contentpad" id="wv-tape">${W.data ? tapeHTML(W.data) : '<div class="empty">載入中…</div>'}</div></section></div></div>`;
}
function paintWatch() {
  const head = document.querySelector('.wv-chartbox .contentpad .wv-head'); if (head) head.outerHTML = headHTML();
  const book = document.getElementById('wv-book'); if (book && W.data) book.innerHTML = bookHTML(W.data);
  const tape = document.getElementById('wv-tape'); if (tape && W.data) tape.innerHTML = tapeHTML(W.data);
  const iq = document.getElementById('wv-idx-quote'); if (iq && W.data) { const q = W.data.indexQuote; iq.innerHTML = q?.last != null ? `<b class="${cls(q.change)}">${fmt(q.last, 2)}</b> <span class="${cls(q.change)}">${q.changePrice > 0 ? '+' : ''}${fmt(q.changePrice, 2)}（${pct(q.change)}）</span>` : ''; }
  const lg = document.getElementById('wv-legend'); if (lg && W.data?.bars?.length) lg.textContent = barLabel(W.data.bars.at(-1));
  applyBars();
}

// ---------- 圖表 ----------
// 圖表元件尚未下載時的提示（見 tools/fetch-vendor.mjs）
const VENDOR_HINT = '圖表元件尚未下載時，請執行 node tools/fetch-vendor.mjs';
async function ensureLibs() {
  if (W.lib) return W.lib;
  if (W.libError) throw new Error(W.libError);
  try {
    const [lwc, ind, renderMod] = await Promise.all([import('lightweight-charts'), import('lightweight-charts-indicators'), import('lightweight-charts-indicators/render')]);
    W.lib = { lwc, SMA: ind.SMA, MACD: ind.MACD, IndicatorRenderer: renderMod.IndicatorRenderer };
    return W.lib;
  } catch (e) { W.libError = `${e.message}。${VENDOR_HINT}`; throw e; }
}
function destroyMainChart() { try { W.resizeObs?.disconnect(); } catch { } W.resizeObs = null; try { W.chart?.remove(); } catch { } W.chart = null; W.series = null; W.chartEl = null; }
function destroyIdxChart() { try { W.idxChart?.remove(); } catch { } W.idxChart = null; W.idxChartEl = null; }
function buildMainChart() {
  const { lwc, SMA, MACD } = W.lib, el = document.getElementById('wv-chart');
  if (!el) return;
  destroyMainChart();
  const chart = lwc.createChart(el, {
    width: el.clientWidth || 800, height: el.clientHeight || 480,
    layout: { background: { type: lwc.ColorType.Solid, color: '#03060c' }, textColor: '#8fa3b8', fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    grid: { vertLines: { color: 'rgba(148,163,184,.07)' }, horzLines: { color: 'rgba(148,163,184,.07)' } },
    crosshair: { mode: lwc.CrosshairMode.Normal },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(148,163,184,.25)' },
    rightPriceScale: { borderColor: 'rgba(148,163,184,.25)' },
    localization: { locale: 'zh-TW' },
  });
  const candles = chart.addSeries(lwc.CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false });
  const S = { candles };
  let pane = 0;
  if (W.showVol) { try { chart.addPane(); pane = 1; chart.panes()[1]?.setHeight(80); } catch { pane = 1; } S.vol = chart.addSeries(lwc.HistogramSeries, { priceFormat: { type: 'volume' } }, pane); }
  if (W.showMACD) { try { chart.addPane(); pane = W.showVol ? 2 : 1; chart.panes()[pane]?.setHeight(110); } catch { pane = W.showVol ? 2 : 1; } S.macdHist = chart.addSeries(lwc.HistogramSeries, { priceFormat: { type: 'price', precision: 2 } }, pane); S.macdDif = chart.addSeries(lwc.LineSeries, { color: DIFC, lineWidth: 1 }, pane); S.macdDea = chart.addSeries(lwc.LineSeries, { color: DEAC, lineWidth: 1 }, pane); }
  if (W.showMA) { S.ma5 = chart.addSeries(lwc.LineSeries, { color: MA5C, lineWidth: 1 }); S.ma20 = chart.addSeries(lwc.LineSeries, { color: MA20C, lineWidth: 1 }); }
  chart.subscribeCrosshairMove(param => {
    const lg = document.getElementById('wv-legend'); if (!lg) return;
    const bar = param.seriesData?.get(candles);
    lg.textContent = barLabel(bar && bar.open != null ? { time: param.time, ...bar } : W.data?.bars?.at(-1));
  });
  W.resizeObs = new ResizeObserver(() => { const e2 = document.getElementById('wv-chart'); if (e2 && W.chart) W.chart.applyOptions({ width: e2.clientWidth, height: e2.clientHeight }); });
  W.resizeObs.observe(el);
  W.chart = chart; W.chartEl = el; W.series = S; W.chartKey = `${W.id}|${W.period}|${W.showMA ? 1 : 0}${W.showVol ? 1 : 0}${W.showMACD ? 1 : 0}`;
  applyBars();
}
function applyBars() {
  if (!W.chart || !W.series || !W.data?.bars?.length) return;
  const { SMA, MACD } = W.lib, bars = numBars(W.data.bars), S = W.series;
  S.candles.setData(bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  if (S.ma5) { try { S.ma5.setData(SMA.calculate(bars, { len: 5, src: 'close' }).plots.plot0); } catch { } }
  if (S.ma20) { try { S.ma20.setData(SMA.calculate(bars, { len: 20, src: 'close' }).plots.plot0); } catch { } }
  if (S.vol) S.vol.setData(bars.map(b => ({ time: b.time, value: b.volume, color: b.close >= b.open ? UP : DOWN })));
  if (S.macdHist) {
    try {
      const r = MACD.calculate(bars, { fastLength: 12, slowLength: 26, signalLength: 9 });
      S.macdHist.setData(r.plots.plot0.map(p => ({ time: p.time, value: p.value, color: p.value >= 0 ? UP : DOWN })));
      S.macdDif.setData(r.plots.plot1); S.macdDea.setData(r.plots.plot2);
    } catch { }
  }
}
function buildIdxChart() {
  const { lwc } = W.lib, el = document.getElementById('wv-idx');
  if (!el || !W.data?.indexBars?.length) return;
  if (W.idxChartEl === el && W.idxChart) { W.idxChart.series?.setData?.(numBars(W.data.indexBars)); return; }
  destroyIdxChart();
  const chart = lwc.createChart(el, {
    width: el.clientWidth || 340, height: 150,
    layout: { background: { type: lwc.ColorType.Solid, color: '#03060c' }, textColor: '#8fa3b8', fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    grid: { vertLines: { color: 'rgba(148,163,184,.07)' }, horzLines: { color: 'rgba(148,163,184,.07)' } },
    timeScale: { timeVisible: false, borderColor: 'rgba(148,163,184,.25)' },
    rightPriceScale: { borderColor: 'rgba(148,163,184,.25)' },
    localization: { locale: 'zh-TW' },
  });
  const s = chart.addSeries(lwc.CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false });
  s.setData(numBars(W.data.indexBars));
  chart.series = s; W.idxChart = chart; W.idxChartEl = el;
}
async function syncWatchDOM() {
  if (!C || C.page() !== 'watch') return;
  const el = document.getElementById('wv-chart');
  if (!el) return;
  const key = `${W.id}|${W.period}|${W.showMA ? 1 : 0}${W.showVol ? 1 : 0}${W.showMACD ? 1 : 0}`;
  try { await ensureLibs(); } catch { const e2 = document.getElementById('wv-chart'); if (e2 && !W.chart) e2.innerHTML = `<div class="wv-empty">圖表元件載入失敗：${esc(W.libError)}</div>`; return; }
  if (!W.data?.bars?.length) { if (!W.chart) el.innerHTML = '<div class="wv-empty">尚無 K 線資料。</div>'; return; }
  if (!W.chart || W.chartEl !== el || W.chartKey !== key) { el.innerHTML = ''; buildMainChart(); }
  else applyBars();
  buildIdxChart();
}

// ---------- 事件 ----------
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !C || C.page() !== 'watch') return; const ds = b.dataset;
  try {
    if (ds.wperiod && PERIODS.includes(ds.wperiod) && ds.wperiod !== W.period) { W.period = ds.wperiod; savePref('nexus.watchPeriod', ds.wperiod); await loadWatch(); C.redraw(); if (C.page() === 'watch') { paintWatch(); await syncWatchDOM(); } return; }
    if (ds.wtoggle) {
      if (ds.wtoggle === 'ma') { W.showMA = !W.showMA; savePref('nexus.watchMA', W.showMA ? '1' : '0'); }
      if (ds.wtoggle === 'vol') { W.showVol = !W.showVol; savePref('nexus.watchVol', W.showVol ? '1' : '0'); }
      if (ds.wtoggle === 'macd') { W.showMACD = !W.showMACD; savePref('nexus.watchMACD', W.showMACD ? '1' : '0'); }
      C.redraw(); await syncWatchDOM(); return;
    }
    if (ds.wchip && ds.wchip !== W.id) { W.id = ds.wchip; await loadWatch(); C.redraw(); if (C.page() === 'watch') { paintWatch(); await syncWatchDOM(); } return; }
  } catch (err) { C.toast(err.message); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!C || C.page() !== 'watch') return;
  if (t.id === 'wv-group') { W.group = t.value; savePref('nexus.watchGroup', t.value); paintStrip(); }
});
document.addEventListener('input', e => {
  const t = e.target; if (!C || C.page() !== 'watch') return;
  if (t.id === 'wv-filter') { W.query = t.value; paintStrip(); }
});
// 盤中每 3 秒更新報價／五檔／成交明細與最後一根 K 棒；自選橫條每 10 秒更新
setInterval(async () => {
  if (!C || document.hidden || C.page() !== 'watch' || !MK.isOpen()) return;
  await loadWatch(); if (C.page() === 'watch') paintWatch();
}, 3000);
setInterval(async () => {
  if (!C || document.hidden || C.page() !== 'watch') return;
  await loadBoard(); paintStrip();
}, 10000);

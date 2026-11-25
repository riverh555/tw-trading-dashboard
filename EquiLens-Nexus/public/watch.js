// 衡析 Nexus：即時看盤頁（自選 K 線＋五檔＋成交明細＋加權指數；僅看盤，不下單）。
// K 線由 Lightweight Charts 繪製，MA／MACD 由 lightweight-charts-indicators 計算（ESM importmap，見 index.html）。
// 圖表模組檔不進版控：安裝時由 tools/fetch-vendor.mjs 下載到 public/vendor/；尚未下載時本頁顯示提示，其他功能不受影響。
import { esc, fmt, pct, cls, sparkSVG } from './insight-ui.js';
import * as MK from './market.js';
import { bookHTML, tapeHTML } from './intraday.js';
import { SEEDED_FAVORITES, INDICATOR_CATEGORIES, GROUP_LABELS, SOURCE_OPTIONS, searchIndicators, pinFavorites, applyBlocked, normalizeInputs } from './indicators.js';
import { initialVisibleRange } from './chart-range.js';

let C = null; // { api, toast, state, redraw, page, inScope }
const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } }, savePref = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
const biVal = (k, d) => { const n = Number(pref(`nexus.watch.${k}`, d)); return Number.isFinite(n) && n > 0 && n <= 500 ? Math.round(n) : d; };
const PERIODS = ['1m', '3m', '5m', '15m', '60m', 'day'];
const PERIOD_LABEL = { '1m': '1分', '3m': '3分', '5m': '5分', '15m': '15分', '60m': '60分', day: '日K' };
const UP = '#ff3d5a', DOWN = '#16e38b', MA5C = '#f0b90b', MA20C = '#22e6ff', DIFC = '#2962ff', DEAC = '#ff6d00';
// 圖表軸與游標標籤一律用台北時區：LWC 預設 UTC，日 K 的台北 00:00 會被顯示成前一天
const TW_TZ = 'Asia/Taipei';
const twDate = t => typeof t === 'number' ? new Date(t * 1000) : new Date(`${t}T00:00:00+08:00`);
const twTick = (time, type) => {
  const d = twDate(time), o = { timeZone: TW_TZ };
  if (type === 0) return d.toLocaleString('zh-TW', { ...o, year: 'numeric' });
  if (type === 1) return d.toLocaleString('zh-TW', { ...o, month: 'short' });
  if (type === 2) return d.toLocaleString('zh-TW', { ...o, day: 'numeric' });
  return d.toLocaleString('zh-TW', { ...o, hour12: false, hour: '2-digit', minute: '2-digit' });
};
const twFull = t => twDate(t).toLocaleString('zh-TW', { timeZone: TW_TZ, hour12: false });
const W = {
  id: null, period: pref('nexus.watchPeriod', '5m'), group: pref('nexus.watchGroup', ''), query: '',
  board: null, data: null, error: '', lib: null, libError: '',
  showMA: pref('nexus.watchMA', '1') === '1', showVol: pref('nexus.watchVol', '1') === '1', showMACD: pref('nexus.watchMACD', '1') === '1',
  maFast: biVal('maFast', 5), maSlow: biVal('maSlow', 20), macdFast: biVal('macdFast', 12), macdSlow: biVal('macdSlow', 26), macdSignal: biVal('macdSignal', 9), volHeight: biVal('volHeight', 80),
  chart: null, chartEl: null, chartKey: '', series: null, idxChart: null, idxChartEl: null, resizeObs: null, fitLeftPad: false,
  registry: null, studies: [], renderers: new Map(), studySeq: 0, favs: null,
  pickerQ: '', pickerCat: 'all', pickerMode: 'list', pickerStudy: null, pickerBuiltin: '', pickerTimer: null, studiesHTML: '',
};
export function initWatch(ctx) { C = ctx; }

// 日 K 標籤是 'YYYY-MM-DD' 字串；指標計算需要數字時間，統一換成台北時間的 epoch 秒數
const numBars = bars => (bars || []).map(b => ({ time: typeof b.time === 'number' ? b.time : Math.floor(Date.parse(`${b.time}T00:00:00+08:00`) / 1000), open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0 }));
const barLabel = b => b ? `${typeof b.time === 'number' ? new Date(b.time * 1000).toLocaleDateString('sv-SE', { timeZone: TW_TZ }) : b.time}　開 ${fmt(b.open, 2)}　高 ${fmt(b.high, 2)}　低 ${fmt(b.low, 2)}　收 ${fmt(b.close, 2)}` : '';

let boardBusy = null;
async function loadBoard() { if (boardBusy) return boardBusy; boardBusy = (async () => { try { W.board = await C.api('board?group=watch'); } catch (e) { W.error = e.message; } })().finally(() => { boardBusy = null; }); return boardBusy; }
let watchBusy = null;
async function loadWatch() { if (watchBusy) return watchBusy; watchBusy = (async () => { try { W.data = await C.api(`watch?id=${encodeURIComponent(W.id)}&period=${encodeURIComponent(W.period)}`); W.error = ''; } catch (e) { W.error = e.message; C.toast(e.message); } })().finally(() => { watchBusy = null; }); return watchBusy; }
export async function enterWatch() {
  const st = C.state();
  if (!W.id || !(st.watchlist || []).includes(W.id)) W.id = (st.watchlist || [])[0] || '3406';
  await Promise.all([loadBoard(), loadWatch()]);
  if (C.page() !== 'watch') return;
  try { await ensureLibs(); } catch { /* 圖表元件缺失時圖表區顯示提示，已套用的指標等元件就緒後再畫 */ }
  restoreStudies();
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
  <div class="wv-layout"><section class="panel wv-chartbox"><div class="contentpad">${headHTML()}<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:6px 0 8px"><div class="segmented" role="group" aria-label="K 線週期">${PERIODS.map(p => `<button data-wperiod="${p}" class="${W.period === p ? 'selected' : ''}" aria-pressed="${W.period === p}">${PERIOD_LABEL[p]}</button>`).join('')}</div><div class="actions"><button data-wtoggle="ma" aria-pressed="${W.showMA}" class="${W.showMA ? 'selected' : ''}">均線</button><button data-wtoggle="vol" aria-pressed="${W.showVol}" class="${W.showVol ? 'selected' : ''}">成交量</button><button data-wtoggle="macd" aria-pressed="${W.showMACD}" class="${W.showMACD ? 'selected' : ''}">MACD</button><button data-windicator>技術指標</button></div></div><div class="wv-studies" id="wv-studies"></div><div class="wv-legend" id="wv-legend"></div><div class="wv-chart" id="wv-chart"><div class="wv-empty">${W.libError ? `圖表元件載入失敗：${esc(W.libError)}` : '載入圖表元件中…'}</div></div><p class="fine">圖表由 TradingView Lightweight Charts 提供（<a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">tradingview.com</a>）· 均線與 MACD 由 lightweight-charts-indicators 計算 · 僅供看盤參考，不構成投資建議</p></div></section>
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
  paintStudies();
  applyBars();
  buildIdxChart();
  renderChartGears();
}

// ---------- 圖表 ----------
// 圖表元件尚未下載時的提示（見 tools/fetch-vendor.mjs）
const VENDOR_HINT = '圖表元件尚未下載時，請執行 node tools/fetch-vendor.mjs';
async function ensureLibs() {
  if (W.lib) return W.lib;
  if (W.libError) throw new Error(W.libError);
  try {
    const [lwc, ind, renderMod, oak] = await Promise.all([import('lightweight-charts'), import('lightweight-charts-indicators'), import('lightweight-charts-indicators/render'), import('oakscriptjs').catch(() => null)]);
    W.lib = { lwc, SMA: ind.SMA, MACD: ind.MACD, IndicatorRenderer: renderMod.IndicatorRenderer, registry: ind.indicatorRegistry, MissingSymbolDataError: ind.MissingSymbolDataError, isInputActive: oak?.isInputActive || null };
    W.registry = ind.indicatorRegistry;
    return W.lib;
  } catch (e) { W.libError = `${e.message}。${VENDOR_HINT}`; throw e; }
}
function destroyMainChart() { try { W.resizeObs?.disconnect(); } catch { } W.resizeObs = null; try { W.chart?.remove(); } catch { } W.chart = null; W.series = null; W.chartEl = null; W.renderers = new Map(); W.fitLeftPad = false; }
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
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(148,163,184,.25)', tickMarkFormatter: twTick },
    rightPriceScale: { borderColor: 'rgba(148,163,184,.25)' },
    localization: { locale: 'zh-TW', timeFormatter: twFull },
  });
  const candles = chart.addSeries(lwc.CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false });
  const S = { candles };
  let nextPane = 1;
  if (W.showVol) { try { chart.addPane(); chart.panes()[nextPane]?.setHeight(W.volHeight); } catch { } S.vol = chart.addSeries(lwc.HistogramSeries, { priceFormat: { type: 'volume' } }, nextPane); nextPane++; }
  if (W.showMACD) { try { chart.addPane(); chart.panes()[nextPane]?.setHeight(110); } catch { } S.macdHist = chart.addSeries(lwc.HistogramSeries, { priceFormat: { type: 'price', precision: 2 } }, nextPane); S.macdDif = chart.addSeries(lwc.LineSeries, { color: DIFC, lineWidth: 1 }, nextPane); S.macdDea = chart.addSeries(lwc.LineSeries, { color: DEAC, lineWidth: 1 }, nextPane); nextPane++; }
  if (W.showMA) { S.ma5 = chart.addSeries(lwc.LineSeries, { color: MA5C, lineWidth: 1 }); S.ma20 = chart.addSeries(lwc.LineSeries, { color: MA20C, lineWidth: 1 }); }
  // 套用的指標：主圖的畫在第 0 格，副圖的各開一格（IndicatorRenderer 一支指標一層）
  W.renderers = new Map();
  for (const study of W.studies) {
    const entry = registryEntry(study.id); if (!entry) continue;
    let pane = 0;
    if (!entry.overlay) { try { chart.addPane(); chart.panes()[nextPane]?.setHeight(110); } catch { } pane = nextPane++; }
    try { W.renderers.set(study.uid, { entry, pane, renderer: new W.lib.IndicatorRenderer(chart, { paneIndex: pane, mainSeries: candles }) }); }
    catch (e) { study.error = e.message; }
  }
  chart.subscribeCrosshairMove(param => {
    const lg = document.getElementById('wv-legend'); if (!lg) return;
    const bar = param.seriesData?.get(candles);
    lg.textContent = barLabel(bar && bar.open != null ? { time: param.time, ...bar } : W.data?.bars?.at(-1));
  });
  W.resizeObs = new ResizeObserver(() => { const e2 = document.getElementById('wv-chart'); if (e2 && W.chart) W.chart.applyOptions({ width: e2.clientWidth, height: e2.clientHeight }); });
  W.resizeObs.observe(el);
  W.chart = chart; W.chartEl = el; W.series = S; W.chartKey = chartKey();
  W.fitLeftPad = true; // 初次載入左邊留白，避免第一根 K 線貼左緣被切掉；之後輪詢不再重設，不干擾捲動
  applyBars();
}
function applyBars() {
  if (!W.chart || !W.series || !W.data?.bars?.length) return;
  const { SMA, MACD } = W.lib, bars = numBars(W.data.bars), S = W.series;
  S.candles.setData(bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  if (S.ma5) { try { S.ma5.setData(SMA.calculate(bars, { len: W.maFast, src: 'close' }).plots.plot0); } catch { } }
  if (S.ma20) { try { S.ma20.setData(SMA.calculate(bars, { len: W.maSlow, src: 'close' }).plots.plot0); } catch { } }
  if (S.vol) S.vol.setData(bars.map(b => ({ time: b.time, value: b.volume, color: b.close >= b.open ? UP : DOWN })));
  if (S.macdHist) {
    try {
      const r = MACD.calculate(bars, { fastLength: W.macdFast, slowLength: W.macdSlow, signalLength: W.macdSignal });
      S.macdHist.setData(r.plots.plot0.map(p => ({ time: p.time, value: p.value, color: p.value >= 0 ? UP : DOWN })));
      S.macdDif.setData(r.plots.plot1); S.macdDea.setData(r.plots.plot2);
    } catch { }
  }
  for (const study of W.studies) renderStudy(study, { reuse: true });
  paintStudies();
  if (W.fitLeftPad) {
    W.fitLeftPad = false;
    const range = initialVisibleRange(bars.length);
    if (range) { try { W.chart.timeScale().setVisibleLogicalRange(range); } catch { } }
  }
}

// ---------- 技術指標套用 ----------
const chartKey = () => `${W.id}|${W.period}|${W.showMA ? 1 : 0}:${W.maFast}:${W.maSlow}|${W.showVol ? 1 : 0}:${W.volHeight}|${W.showMACD ? 1 : 0}:${W.macdFast}:${W.macdSlow}:${W.macdSignal}|${W.studies.map(s => s.id).join(',')}`;
const registryEntry = id => (W.registry || []).find(e => e.id === id) || null;
const PERIOD_CTX = { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '60m': '60', day: '1D' };
const chartContext = () => ({ timeframe: PERIOD_CTX[W.period] || '5', timezone: 'Asia/Taipei' });

// 收藏：localStorage，沒存過就用種子（River 的 TradingView 收藏中、目錄找得到的 4 個）
function loadFavs() {
  if (W.favs) return W.favs;
  try { const raw = JSON.parse(localStorage.getItem('nexus.watchFavs') || 'null'); if (Array.isArray(raw)) { W.favs = raw.filter(id => typeof id === 'string'); return W.favs; } } catch { }
  W.favs = SEEDED_FAVORITES.map(f => f.id); return W.favs;
}
function saveFavs() { try { localStorage.setItem('nexus.watchFavs', JSON.stringify(loadFavs())); } catch { } }
function toggleFav(id) { const f = loadFavs(), i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); saveFavs(); renderPicker(); }

// 已套用的指標：只存 id＋改動過的參數，localStorage；進頁面時讀回，目錄裡找不到的 id 丟掉
function restoreStudies() {
  try {
    const raw = JSON.parse(localStorage.getItem('nexus.watchStudies') || 'null');
    if (!Array.isArray(raw)) return;
    W.studies = raw.filter(s => s && typeof s.id === 'string').map(s => ({ uid: `s${++W.studySeq}`, id: s.id, inputs: s.inputs || {}, error: '' }));
  } catch { W.studies = []; }
}
function saveStudies() { try { localStorage.setItem('nexus.watchStudies', JSON.stringify(W.studies.map(s => ({ id: s.id, inputs: s.inputs || {} })))); } catch { } }
function dropStudyById(id, note) {
  const before = W.studies.length;
  W.studies = W.studies.filter(s => s.id !== id);
  if (W.studies.length !== before) { saveStudies(); paintStudies(); if (note) C.toast(note); }
}

// 已套用列表：名字＋設定＋移除；失敗的標出來（計算錯誤只影響該指標，不拖垮圖表）
function paintStudies() {
  const el = document.getElementById('wv-studies'); if (!el) return;
  const built = [];
  if (W.showMA) built.push({ key: 'ma', name: `均線 ${W.maFast}/${W.maSlow}` });
  if (W.showVol) built.push({ key: 'vol', name: '成交量' });
  if (W.showMACD) built.push({ key: 'macd', name: `MACD ${W.macdFast}/${W.macdSlow}/${W.macdSignal}` });
  const builtHTML = built.map(b => typeof b === 'string'
    ? `<span class="wv-study">${esc(b)}</span>`
    : `<span class="wv-study">${esc(b.name)}<button data-wbuiltin-off="${b.key}" aria-label="關閉">×</button></span>`).join('');
  const html = builtHTML + W.studies.map(s => {
    const e = registryEntry(s.id);
    const name = e ? (e.shortName || e.name) : s.id;
    return `<span class="wv-study${s.error ? ' failed' : ''}" title="${esc(s.error || (e ? e.name : s.id))}">${esc(name)}<button data-wstudy-remove="${s.uid}" aria-label="移除">×</button></span>`;
  }).join('');
  // 頁面重繪後 #wv-studies 是新的空節點，即使內容相同也要補回，否則已套用指標會消失
  if (html !== W.studiesHTML || !el.children.length) { el.innerHTML = html; W.studiesHTML = html; }
}
// 圖表左上角的設定齒輪（TradingView 風格）：內建開關與已套用指標各一顆
function renderChartGears() {
  const chart = document.getElementById('wv-chart'); if (!chart) return;
  let el = document.getElementById('wv-gears');
  if (!el) { el = document.createElement('div'); el.className = 'wv-chart-gears'; el.id = 'wv-gears'; chart.appendChild(el); }
  const items = [];
  if (W.showMA) items.push('<button type="button" data-wbuiltin="ma" title="均線" aria-label="均線">⚙</button>');
  if (W.showVol) items.push('<button type="button" data-wbuiltin="vol" title="成交量" aria-label="成交量">⚙</button>');
  if (W.showMACD) items.push('<button type="button" data-wbuiltin="macd" title="MACD" aria-label="MACD">⚙</button>');
  for (const s of W.studies) {
    const e = registryEntry(s.id), name = e ? (e.shortName || e.name) : s.id;
    items.push(`<button type="button" data-wstudy-settings="${s.uid}" title="${esc(name)}" aria-label="${esc(name)}">⚙</button>`);
  }
  const html = items.join('');
  if (el.innerHTML !== html) el.innerHTML = html;
}
function renderStudy(study, { reuse = false } = {}) {
  const rt = W.renderers.get(study.uid);
  if (!rt || !W.data?.bars?.length) return;
  try {
    const bars = numBars(W.data.bars);
    const result = rt.entry.calculate(bars, { ...rt.entry.defaultInputs, ...study.inputs }, chartContext());
    rt.renderer.render(rt.entry, result, bars, { inputs: study.inputs, reuseSeries: reuse });
    study.error = '';
  } catch (err) {
    const missing = err?.name === 'MissingSymbolDataError' || (W.lib?.MissingSymbolDataError && err instanceof W.lib.MissingSymbolDataError);
    study.error = missing ? '需要其他商品資料，暫不支援' : (err?.message || '計算失敗');
  }
}

// 選擇器：全目錄搜尋（名稱／代碼／簡稱）、分類、收藏置頂；每頁最多顯示 100 筆
function pickerEntries() {
  const list = pinFavorites(searchIndicators(W.registry || [], W.pickerQ, W.pickerCat, 100), loadFavs());
  return { list, truncated: (W.registry || []).length > 100 && list.length >= 100 };
}
function pickerRowHTML(e) {
  const fav = loadFavs().includes(e.id), applied = W.studies.some(s => s.id === e.id);
  return `<div class="ind-row" data-wind="${esc(e.id)}" role="button" tabindex="0"><span><strong>${esc(e.name)}</strong><small>${esc(e.shortName || '')}${e.shortName ? ' · ' : ''}${GROUP_LABELS[e.group] || e.group} · ${esc(e.category)}</small></span><span class="ind-badges"><span class="tag">${e.overlay ? '主圖' : '副圖'}</span>${applied ? '<span class="tag">已套用</span>' : ''}<button class="ind-star${fav ? ' on' : ''}" data-wfav="${esc(e.id)}" aria-label="${fav ? '取消收藏' : '收藏'}">${fav ? '★' : '☆'}</button></span></div>`;
}
function pickerHTML() {
  if (W.pickerMode === 'settings') return settingsHTML();
  if (W.pickerMode === 'builtin') return builtinSettingsHTML();
  const { list, truncated } = pickerEntries();
  const total = (W.registry || []).length;
  return `<div class="contentpad"><div class="picker-head"><h3>技術指標</h3><button data-wclose>關閉</button></div>
  <input type="search" id="ind-search" placeholder="搜尋指標名稱或代碼" value="${esc(W.pickerQ)}" aria-label="搜尋指標名稱或代碼">
  <div class="ind-cats segmented" role="group" aria-label="指標分類">${INDICATOR_CATEGORIES.map(c => `<button data-wcat="${esc(c.id)}" class="${W.pickerCat === c.id ? 'selected' : ''}" aria-pressed="${W.pickerCat === c.id}">${esc(c.label)}</button>`).join('')}</div>
  <div class="picker-results" id="ind-results">${list.length ? list.map(pickerRowHTML).join('') : '<p class="fine">查無符合的指標。</p>'}</div>
  <p class="fine">共 ${total} 個指標 · 收藏置頂</p>${truncated ? '<p class="fine">僅顯示前 100 筆，請縮小搜尋範圍</p>' : ''}</div>`;
}
function renderPicker() { const el = document.getElementById('indicator-picker'); if (el) el.innerHTML = pickerHTML(); const q = document.getElementById('ind-search'); if (q && W.pickerMode === 'list') { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
async function openPicker() {
  const dlg = document.getElementById('indicator-dialog'); if (!dlg) return;
  if (!dlg.dataset.bound) { dlg.dataset.bound = '1'; dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); }
  try { await ensureLibs(); } catch { C.toast(W.libError); return; }
  W.pickerMode = 'list'; W.pickerStudy = null;
  renderPicker();
  if (!dlg.open) dlg.showModal();
}
function closePicker() { document.getElementById('indicator-dialog')?.close(); }
async function applyIndicator(id) {
  const entry = registryEntry(id);
  if (!entry) { C.toast('找不到這個指標'); return; }
  const blocked = applyBlocked(id, W.studies.map(s => s.id), { showMA: W.showMA, showMACD: W.showMACD });
  if (blocked === 'already') { C.toast('已套用'); return; }
  if (blocked === 'macd-toggle') { C.toast('MACD 已由上方開關顯示，請先關閉 MACD 開關再套用'); return; }
  if (blocked === 'ma-toggle') { C.toast('均線已由上方開關顯示，請先關閉均線開關再套用'); return; }
  if (!W.data?.bars?.length) { C.toast('尚無 K 線資料'); return; }
  W.studies.push({ uid: `s${++W.studySeq}`, id, inputs: { ...(entry.defaultInputs || {}) }, error: '' });
  saveStudies(); paintStudies();
  await syncWatchDOM();
  C.toast(`已套用 ${entry.shortName || entry.name}`);
}
function removeStudy(uid) {
  W.studies = W.studies.filter(s => s.uid !== uid);
  saveStudies(); paintStudies();
  if (W.pickerMode === 'settings') { W.pickerMode = 'list'; W.pickerStudy = null; renderPicker(); }
  syncWatchDOM();
}

// 設定：依 inputConfig 自動生表單（數字／勾選／下拉／來源／顏色／文字）；改了就立即重算
function settingsFieldHTML(cfg, value, active) {
  const dis = active ? '' : ' disabled';
  const title = esc(cfg.title || cfg.id);
  const tip = cfg.tooltip ? ` title="${esc(cfg.tooltip)}"` : '';
  if (cfg.type === 'bool') return `<div class="ind-field"><label${tip}>${title}</label><span><input type="checkbox" data-ind-input="${esc(cfg.id)}"${value ? ' checked' : ''}${dis}></span></div>`;
  if (cfg.type === 'int' || cfg.type === 'float') return `<div class="ind-field"><label${tip}>${title}</label><input type="number" data-ind-input="${esc(cfg.id)}" value="${esc(String(value ?? cfg.defval ?? ''))}" step="${cfg.step ?? (cfg.type === 'int' ? 1 : 'any')}"${cfg.min != null ? ` min="${cfg.min}"` : ''}${cfg.max != null ? ` max="${cfg.max}"` : ''}${dis}></div>`;
  if (cfg.type === 'color') return `<div class="ind-field"><label${tip}>${title}</label><input type="color" data-ind-input="${esc(cfg.id)}" value="${esc(String(value ?? cfg.defval ?? '#000000'))}"${dis}></div>`;
  if ((cfg.type === 'string' && cfg.options?.length) || cfg.type === 'source') {
    const opts = cfg.type === 'source' ? SOURCE_OPTIONS : cfg.options;
    return `<div class="ind-field"><label${tip}>${title}</label><select data-ind-input="${esc(cfg.id)}"${dis}>${opts.map(o => `<option value="${esc(String(o))}"${String(value ?? cfg.defval) === String(o) ? ' selected' : ''}>${esc(String(o))}</option>`).join('')}</select></div>`;
  }
  return `<div class="ind-field"><label${tip}>${title}</label><input type="text" data-ind-input="${esc(cfg.id)}" value="${esc(String(value ?? cfg.defval ?? ''))}"${dis}></div>`;
}
function settingsHTML() {
  const study = W.studies.find(s => s.uid === W.pickerStudy);
  const entry = study && registryEntry(study.id);
  if (!study || !entry) return `<div class="contentpad"><div class="picker-head"><h3>技術指標</h3><button data-wclose>關閉</button></div><p class="fine">找不到這個指標。</p></div>`;
  const isActive = cfg => { try { return !W.lib?.isInputActive || W.lib.isInputActive(cfg, study.inputs, entry.inputConfig || []); } catch { return true; } };
  let lastGroup = '';
  const rows = (entry.inputConfig || []).map(cfg => {
    const head = cfg.group && cfg.group !== lastGroup ? `<div class="ind-group">${esc(cfg.group)}</div>` : '';
    if (cfg.group) lastGroup = cfg.group;
    return head + settingsFieldHTML(cfg, study.inputs[cfg.id] ?? cfg.defval, isActive(cfg));
  }).join('');
  return `<div class="contentpad"><div class="picker-head"><h3>${esc(entry.name)} 設定</h3><button data-wclose>關閉</button></div>
  <form id="ind-settings">${rows || '<p class="fine">這個指標沒有可調參數。</p>'}</form>
  <div class="actions"><button data-wstudy-remove="${study.uid}">移除指標</button><button data-wclose>完成</button></div>
  <p class="fine">參數變更立即重新計算。</p></div>`;
}
function collectSettings() {
  const study = W.studies.find(s => s.uid === W.pickerStudy);
  const entry = study && registryEntry(study.id);
  const form = document.getElementById('ind-settings');
  if (!study || !entry || !form) return;
  const raw = {};
  for (const el of form.querySelectorAll('[data-ind-input]')) raw[el.dataset.indInput] = el.type === 'checkbox' ? el.checked : el.value;
  study.inputs = normalizeInputs(entry, raw);
  saveStudies();
  renderStudy(study, { reuse: true });
}
function openStudySettings(uid) {
  const dlg = document.getElementById('indicator-dialog'); if (!dlg) return;
  W.pickerMode = 'settings'; W.pickerStudy = uid;
  renderPicker();
  if (!dlg.open) dlg.showModal();
}
// 內建開關（均線／成交量／MACD）的參數設定：齒輪打開同一个對話框，改完立即重算
const BUILTIN_CFG = {
  ma: [['maFast', '均線快線', 5], ['maSlow', '均線慢線', 20]],
  vol: [['volHeight', '成交量柱高度', 80]],
  macd: [['macdFast', 'MACD 快線', 12], ['macdSlow', 'MACD 慢線', 26], ['macdSignal', 'MACD 訊號線', 9]],
};
function builtinSettingsHTML() {
  const k = W.pickerBuiltin, title = k === 'ma' ? '均線' : k === 'macd' ? 'MACD' : '成交量';
  const rows = (BUILTIN_CFG[k] || []).map(([id, label, def]) => `<div class="ind-field"><label>${esc(label)}</label><input type="number" data-bi-input="${id}" value="${W[id] ?? def}" min="1" max="500" step="1"></div>`).join('');
  return `<div class="contentpad"><div class="picker-head"><h3>${esc(title)} 設定</h3><button data-wclose>關閉</button></div>
  <form id="bi-settings">${rows || '<p class="fine">成交量沒有可調參數。</p>'}</form>
  <div class="actions"><button data-wclose>完成</button></div><p class="fine">參數變更立即重新計算。</p></div>`;
}
function openBuiltinSettings(key) {
  const dlg = document.getElementById('indicator-dialog'); if (!dlg) return;
  W.pickerMode = 'builtin'; W.pickerBuiltin = key;
  renderPicker();
  if (!dlg.open) dlg.showModal();
}
function toggleBuiltin(key) {
  if (key === 'ma') { W.showMA = !W.showMA; savePref('nexus.watchMA', W.showMA ? '1' : '0'); if (W.showMA) dropStudyById('sma', '均線開關已開啟，已移除目錄版 SMA'); }
  else if (key === 'vol') { W.showVol = !W.showVol; savePref('nexus.watchVol', W.showVol ? '1' : '0'); }
  else if (key === 'macd') { W.showMACD = !W.showMACD; savePref('nexus.watchMACD', W.showMACD ? '1' : '0'); if (W.showMACD) dropStudyById('macd', 'MACD 開關已開啟，已移除目錄版 MACD'); }
  else return;
  W.studiesHTML = ''; paintStudies();
  C.redraw(); syncWatchDOM();
}
// 加權指數當日走勢（1 分線）；沒有分時資料時退回日 K
function indexIntradaySVG(d) {
  const M = d?.minutes, ref = d?.ref, empty = '<div class="wv-empty">尚無指數當日走勢。</div>';
  if (!M?.m?.length || !(ref > 0)) return empty;
  const vals = M.c.filter(v => v != null); if (!vals.length) return empty;
  const w = 340, h = 150, L = 8, R = 44, T = 10, B = 16, x0 = L, x1 = w - R, y0 = T, y1 = h - B;
  const dev = Math.max(Math.max(...vals.map(v => Math.abs(v - ref))), ref * 0.002) * 1.1;
  const yMax = ref + dev, yMin = ref - dev, yOf = v => y0 + (yMax - Math.min(yMax, Math.max(yMin, v))) / (yMax - yMin) * (y1 - y0);
  const open = d.open || 540, close = d.close || 810, span = close - open || 1;
  const xOf = m => x0 + (Math.min(close, Math.max(open, m)) - open) / span * (x1 - x0);
  const pts = M.m.map((m, i) => [xOf(m), yOf(M.c[i])]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${x1.toFixed(1)} ${yOf(ref).toFixed(1)} L${x0.toFixed(1)} ${yOf(ref).toFixed(1)} Z`;
  const last = vals.at(-1), col = last >= ref ? 'var(--up)' : 'var(--down)';
  const soft = last >= ref ? 'var(--up-soft, rgba(255,77,103,.14))' : 'var(--down-soft, rgba(32,217,139,.14))';
  const [lx, ly] = pts.at(-1), hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `<svg class="wv-idxline" viewBox="0 0 ${w} ${h}" role="img" aria-label="加權指數當日走勢">
    <line x1="${x0}" x2="${x1}" y1="${yOf(ref).toFixed(1)}" y2="${yOf(ref).toFixed(1)}" stroke="var(--soft)" stroke-dasharray="3 3"/>
    <text x="${x0}" y="${(yOf(yMax) + 8).toFixed(1)}" class="ia-ax">${fmt(yMax, 1)}</text>
    <text x="${x0}" y="${(yOf(ref) - 2).toFixed(1)}" class="ia-ax">${fmt(ref, 1)}</text>
    <text x="${x0}" y="${(yOf(yMin) - 2).toFixed(1)}" class="ia-ax">${fmt(yMin, 1)}</text>
    <text x="${x1 + 4}" y="${(yOf(last) + 4).toFixed(1)}" class="ia-ax ${last >= ref ? 'up' : 'down'}">${fmt(last, 1)}</text>
    <path d="${area}" fill="${soft}"/><path d="${line}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.5" fill="${col}"/>
    <text x="${x0}" y="${h - 3}" class="ia-ax">${hm(open)}</text><text x="${x1}" y="${h - 3}" text-anchor="end" class="ia-ax">${hm(close)}</text>
  </svg>`;
}
function buildIdxChart() {
  const el = document.getElementById('wv-idx');
  if (!el) return;
  const intra = W.data?.indexIntraday;
  if (intra?.minutes?.m?.length) {
    if (W.idxChart) destroyIdxChart();
    W.idxChartEl = null;
    el.innerHTML = indexIntradaySVG(intra);
    return;
  }
  if (!W.data?.indexBars?.length || !W.lib?.lwc) { if (!W.idxChart) el.innerHTML = '<div class="wv-empty">尚無 K 線資料。</div>'; return; }
  const { lwc } = W.lib;
  if (W.idxChartEl === el && W.idxChart) { W.idxChart.series?.setData?.(numBars(W.data.indexBars)); return; }
  destroyIdxChart();
  const chart = lwc.createChart(el, {
    width: el.clientWidth || 340, height: 150,
    layout: { background: { type: lwc.ColorType.Solid, color: '#03060c' }, textColor: '#8fa3b8', fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    grid: { vertLines: { color: 'rgba(148,163,184,.07)' }, horzLines: { color: 'rgba(148,163,184,.07)' } },
    timeScale: { timeVisible: false, borderColor: 'rgba(148,163,184,.25)', tickMarkFormatter: twTick },
    rightPriceScale: { borderColor: 'rgba(148,163,184,.25)' },
    localization: { locale: 'zh-TW', timeFormatter: twFull },
  });
  const s = chart.addSeries(lwc.CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false });
  s.setData(numBars(W.data.indexBars));
  chart.series = s; W.idxChart = chart; W.idxChartEl = el;
}
async function syncWatchDOM() {
  if (!C || C.page() !== 'watch') return;
  const el = document.getElementById('wv-chart');
  if (!el) return;
  const key = chartKey();
  try { await ensureLibs(); } catch { const e2 = document.getElementById('wv-chart'); if (e2 && !W.chart) e2.innerHTML = `<div class="wv-empty">圖表元件載入失敗：${esc(W.libError)}</div>`; return; }
  if (!W.data?.bars?.length) { if (!W.chart) el.innerHTML = '<div class="wv-empty">尚無 K 線資料。</div>'; return; }
  if (!W.chart || W.chartEl !== el || W.chartKey !== key) { el.innerHTML = ''; buildMainChart(); }
  else applyBars();
  buildIdxChart();
  renderChartGears();
}

// ---------- 事件 ----------
document.addEventListener('click', async e => {
  if (C && C.page() === 'watch') {
    const fav = e.target.closest('[data-wfav]');
    if (fav) { toggleFav(fav.dataset.wfav); return; }
    const row = e.target.closest('[data-wind]');
    if (row) { try { await applyIndicator(row.dataset.wind); } catch (err) { C.toast(err.message); } return; }
    const cat = e.target.closest('[data-wcat]');
    if (cat) { W.pickerCat = cat.dataset.wcat; renderPicker(); return; }
    const closer = e.target.closest('[data-wclose]');
    if (closer) { closePicker(); return; }
    const biSet = e.target.closest('[data-wbuiltin]');
    if (biSet) { openBuiltinSettings(biSet.dataset.wbuiltin); return; }
    const biOff = e.target.closest('[data-wbuiltin-off]');
    if (biOff) { toggleBuiltin(biOff.dataset.wbuiltinOff); return; }
  }
  const b = e.target.closest('button'); if (!b || !C || C.page() !== 'watch') return; const ds = b.dataset;
  try {
    if ('windicator' in ds) { openPicker(); return; }
    if (ds.wstudySettings) { openStudySettings(ds.wstudySettings); return; }
    if (ds.wstudyRemove) { removeStudy(ds.wstudyRemove); return; }
    if (ds.wperiod && PERIODS.includes(ds.wperiod) && ds.wperiod !== W.period) { W.period = ds.wperiod; savePref('nexus.watchPeriod', ds.wperiod); await loadWatch(); C.redraw(); if (C.page() === 'watch') { paintWatch(); await syncWatchDOM(); } return; }
    if (ds.wtoggle) { toggleBuiltin(ds.wtoggle); return; }
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
  if (t.id === 'ind-search') { W.pickerQ = t.value; clearTimeout(W.pickerTimer); W.pickerTimer = setTimeout(renderPicker, 180); }
  if (t.dataset?.indInput) { clearTimeout(W.pickerTimer); W.pickerTimer = setTimeout(collectSettings, 200); }
  if (t.dataset?.biInput) {
    const k = t.dataset.biInput, n = Number(t.value);
    if (Number.isFinite(n) && n > 0 && n <= 500) {
      W[k] = Math.round(n); savePref(`nexus.watch.${k}`, String(W[k]));
      W.studiesHTML = ''; paintStudies(); syncWatchDOM();
    }
  }
});
// 設定表單在對話框裡：Enter 不送出、不換頁
document.addEventListener('submit', e => { if (e.target.id === 'ind-settings' || e.target.id === 'bi-settings') e.preventDefault(); });
// 盤中每 3 秒更新報價／五檔／成交明細與最後一根 K 棒；自選橫條每 10 秒更新
setInterval(async () => {
  if (!C || document.hidden || C.page() !== 'watch' || !MK.isOpen()) return;
  await loadWatch(); if (C.page() === 'watch') paintWatch();
}, 3000);
setInterval(async () => {
  if (!C || document.hidden || C.page() !== 'watch') return;
  await loadBoard(); paintStrip();
}, 10000);

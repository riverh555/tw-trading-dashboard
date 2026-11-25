// 衡析 Nexus：即時看盤頁（自選 K 線＋五檔＋成交明細＋加權指數；僅看盤，不下單）。
// K 線由 Lightweight Charts 繪製，MA／MACD 由 lightweight-charts-indicators 計算（ESM importmap，見 index.html）。
// 圖表模組檔不進版控：安裝時由 tools/fetch-vendor.mjs 下載到 public/vendor/；尚未下載時本頁顯示提示，其他功能不受影響。
// 版面是可拖曳的格子工作區（public/grid.js）；中間是新 K 線圖（public/candle-chart.js，圖內圖例、往左捲載入舊 K 線、
// 切週期／換股不重建圖表）；畫線工具（public/drawings.js）與個股當日走勢線（public/intraday-line.js）各是一格面板。
// 即時資料走一條 SSE（GET /api/stream，public/quote-store.js 中央報價庫）；SSE 斷線時 3 秒輪詢接手。
import { esc, fmt, pct, cls, sparkSVG } from './insight-ui.js';
import * as MK from './market.js';
import { bookHTML, tapeHTML } from './intraday.js';
import { SEEDED_FAVORITES, INDICATOR_CATEGORIES, GROUP_LABELS, SOURCE_OPTIONS, searchIndicators, pinFavorites, applyBlocked, normalizeInputs } from './indicators.js';
import { createQuoteStore } from './quote-store.js';
import { createGrid } from './grid.js';
import { createCandleChart, formatLegendValue, numBars } from './candle-chart.js';
import { createDrawings, TOOLS as DRAW_TOOLS } from './drawings.js';
import { createIntradayLine } from './intraday-line.js';
import { studyLegendValues } from './legend-values.js';

let C = null; // { api, toast, state, redraw, page, inScope }
const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } }, savePref = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
const biVal = (k, d) => { const n = Number(pref(`nexus.watch.${k}`, d)); return Number.isFinite(n) && n > 0 && n <= 500 ? Math.round(n) : d; };
const PERIODS = ['1m', '3m', '5m', '15m', '60m', 'day'];
const PERIOD_LABEL = { '1m': '1分', '3m': '3分', '5m': '5分', '15m': '15分', '60m': '60分', day: '日K' };
const UP = '#ff3d5a', DOWN = '#16e38b', MA5C = '#f0b90b', MA20C = '#22e6ff', DIFC = '#2962ff', DEAC = '#ff6d00';
const TW_TZ = 'Asia/Taipei';
const W = {
  id: null, period: pref('nexus.watchPeriod', '5m'), group: pref('nexus.watchGroup', ''), query: '',
  board: null, data: null, dataKey: '', error: '', lib: null, libError: '',
  showMA: pref('nexus.watchMA', '1') === '1', showVol: pref('nexus.watchVol', '1') === '1', showMACD: pref('nexus.watchMACD', '1') === '1',
  maFast: biVal('maFast', 5), maSlow: biVal('maSlow', 20), macdFast: biVal('macdFast', 12), macdSlow: biVal('macdSlow', 26), macdSignal: biVal('macdSignal', 9), volHeight: biVal('volHeight', 80),
  chartApi: null, chartEl: null, chartDataKey: '', gridApi: null, gridEl: null,
  drawingsApi: null, drawingsSymbol: '', drawKeyHandler: null, drawBar: null,
  intraApi: null, instances: [], hidden: new Set(), // hidden：圖例眼睛關掉的實例 uid（工作階段內有效，重建實例時保留）
  store: null, storeUnsubs: [], subscribedChips: '', streamStatus: 'connecting', tapeRows: null,
  noOlder: false, registry: null, studies: [], studySeq: 0, favs: null,
  pickerQ: '', pickerCat: 'all', pickerMode: 'list', pickerStudy: null, pickerBuiltin: '', pickerTimer: null, studiesHTML: '',
};
export function initWatch(ctx) { C = ctx; }

let boardBusy = null;
async function loadBoard() { if (boardBusy) return boardBusy; boardBusy = (async () => { try { W.board = await C.api('board?group=watch'); } catch (e) { W.error = e.message; } })().finally(() => { boardBusy = null; }); return boardBusy; }
let watchBusy = null, watchBusyKey = '';
const watchKey = () => `${W.id}|${W.period}`;
async function loadWatch() {
  const key = watchKey();
  if (watchBusy && watchBusyKey === key) return watchBusy; // 同一股票＋週期的並行請求才共用
  watchBusyKey = key;
  watchBusy = (async () => {
    try { const data = await C.api(`watch?id=${encodeURIComponent(W.id)}&period=${encodeURIComponent(W.period)}`); if (watchKey() !== key) return; W.data = data; W.dataKey = key; W.error = ''; }
    catch (e) { W.error = e.message; C.toast(e.message); }
  })().finally(() => { watchBusy = null; });
  return watchBusy;
}
// 無限歷史：往左捲到最舊一根時載入更早的交易日（/api/chart?before=），接回圖表前面；沒更舊的資料就不再請求
let olderBusy = null;
function loadOlderBars() {
  if (olderBusy || W.noOlder || !W.chartApi || !W.data?.bars?.length) return Promise.resolve();
  const oldest = W.chartApi.getBars()[0];
  if (!oldest) return Promise.resolve();
  const before = new Date(oldest.time * 1000).toLocaleDateString('sv-SE', { timeZone: TW_TZ });
  olderBusy = (async () => {
    try {
      const r = await C.api(`chart?id=${encodeURIComponent(W.id)}&period=${encodeURIComponent(W.period)}&before=${before}`);
      const bars = numBars(r.bars || []);
      if (!bars.length) W.noOlder = true;
      else W.chartApi.prependBars(bars);
    } catch { /* 載入失敗就停在這次，下次往左捲再試 */ }
  })().finally(() => { olderBusy = null; });
  return olderBusy;
}
export async function enterWatch() {
  const st = C.state();
  if (!W.id || !(st.watchlist || []).includes(W.id)) { const next = (st.watchlist || [])[0] || '3406'; if (next !== W.id) { W.id = next; W.data = null; W.dataKey = ''; } }
  await Promise.all([loadBoard(), loadWatch()]);
  if (C.page() !== 'watch') return;
  try { await ensureLibs(); } catch { /* 圖表元件缺失時圖表區顯示提示，已套用的指標等元件就緒後再畫 */ }
  restoreStudies();
  ensureStore();
  await syncWatchDOM();
  resubscribeLive();
}

// ---------- 中央報價庫（SSE） ----------
// 一條 SSE 連線分發給各面板：當前股票（報價／1 分 K／五檔／逐筆）、大盤指數、全部自選橫條代號。
// 串流狀態（live／dead／reconnecting）顯示在自選橫條右側；SSE 斷線時 3 秒輪詢接手（見下方 setInterval）。
function ensureStore() {
  if (W.store) return W.store;
  W.store = createQuoteStore({ onStatus: s => { W.streamStatus = s; paintStreamStatus(); } });
  return W.store;
}
function paintStreamStatus() {
  const el = document.getElementById('wv-stream'); if (!el) return;
  const s = W.streamStatus || 'connecting';
  el.className = `wv-stream-status${s === 'live' ? ' live' : s === 'dead' || s === 'reconnecting' ? ' dead' : ''}`;
  const t = document.getElementById('wv-stream-text');
  if (t) t.textContent = s === 'live' ? '即時' : s === 'dead' ? '斷線' : s === 'reconnecting' ? '重連中' : '連線中';
}
function teardownLive() {
  for (const un of W.storeUnsubs.splice(0)) { try { un(); } catch { } }
  W.subscribedChips = '';
}
function resubscribeLive() {
  if (!C || C.page() !== 'watch' || !W.id) return;
  ensureStore();
  const need = [...new Set([W.id, 'TAIEX', ...chipList().map(s => s.id)])].sort().join(',');
  if (need === W.subscribedChips) return; // 代號集合沒變就不重訂（篩選每打一個字不重建 SSE 連線）
  teardownLive();
  W.storeUnsubs.push(W.store.subscribe(W.id, onLiveEvent));
  W.storeUnsubs.push(W.store.subscribe('TAIEX', onIndexEvent));
  for (const s of chipList()) W.storeUnsubs.push(W.store.subscribe(s.id, onChipEvent));
  W.subscribedChips = need;
}
const barEpoch = hhmm => { const t = Date.parse(`${W.data?.date || ''}T${hhmm}:00+08:00`); return Number.isFinite(t) ? Math.floor(t / 1000) : null; };
function onLiveEvent(ev) {
  if (!ev || ev.id !== W.id || C?.page() !== 'watch' || !W.data) return;
  if (ev.type === 'quote') {
    W.data.quote = { ...(W.data.quote || {}), last: ev.last, change: ev.change, changePrice: ev.changePrice,
      open: ev.open ?? W.data.quote?.open, high: ev.high ?? W.data.quote?.high, low: ev.low ?? W.data.quote?.low,
      volume: ev.volume ?? W.data.quote?.volume, time: ev.time ?? W.data.quote?.time };
    const head = document.getElementById('wv-head'); if (head) head.outerHTML = headHTML();
  } else if (ev.type === 'bar') {
    if (W.intraApi) W.intraApi.onBar(ev.bar); // 當日走勢線一律是 1 分 K，即時更新
    if (W.period !== '1m' || !W.data.bars?.length) return; // 3 分以上等 15 秒 REST 刷新（伺服器負責合成週期 K 線）
    const t = barEpoch(ev.bar[0]); if (t == null) return;
    const nb = { time: t, open: ev.bar[1], high: ev.bar[2], low: ev.bar[3], close: ev.bar[4], volume: ev.bar[5] || 0 };
    const last = W.data.bars.at(-1);
    if (nb.time === last.time) W.data.bars[W.data.bars.length - 1] = { ...last, ...nb };
    else if (nb.time > last.time) W.data.bars.push(nb);
    else return;
    W.chartApi?.updateLastBar(nb);
    renderInstances();
  } else if (ev.type === 'book') {
    W.data.book = { bids: (ev.bids || []).map(([price, size]) => ({ price, size })), asks: (ev.asks || []).map(([price, size]) => ({ price, size })), time: ev.time };
    const book = document.getElementById('wv-book'); if (book) book.innerHTML = bookHTML(W.data);
  } else if (ev.type === 'tape') {
    if (!W.tapeRows) W.tapeRows = (W.data.tape || []).slice(0, 40);
    const head0 = W.tapeRows[0];
    if (!head0 || head0[0] !== ev.trade[0] || head0[3] !== ev.trade[3] || head0[4] !== ev.trade[4]) {
      W.tapeRows = [ev.trade, ...W.tapeRows].slice(0, 40);
      const tape = document.getElementById('wv-tape'); if (tape) tape.innerHTML = tapeHTML({ ...W.data, tape: W.tapeRows });
    }
  }
}
function onChipEvent(ev) {
  if (ev.type !== 'quote') return;
  paintChipQuote(ev.id, ev);
}
function paintChipQuote(id, q) {
  const chip = document.querySelector(`[data-wchip="${CSS.escape(id)}"]`);
  if (!chip) return;
  const b = chip.querySelector('.wv-px b'), s = chip.querySelector('.wv-px span');
  if (b) { b.textContent = fmt(q.last, 2); b.className = cls(q.change); }
  if (s) { s.textContent = pct(q.change); s.className = cls(q.change); }
}
function onIndexEvent(ev) {
  if (ev.type !== 'index' || C?.page() !== 'watch' || !W.data) return;
  W.data.indexQuote = { ...(W.data.indexQuote || {}), last: ev.last, change: ev.change, changePrice: ev.changePrice, time: ev.time };
  if (ev.minute?.m != null && ev.minute?.c != null) {
    const intra = W.data.indexIntraday;
    if (intra?.minutes) {
      const { m, c } = intra.minutes;
      if (m.at(-1) === ev.minute.m) c[c.length - 1] = ev.minute.c;
      else if (ev.minute.m > (m.at(-1) ?? -1)) { m.push(ev.minute.m); c.push(ev.minute.c); }
    }
  }
  const iq = document.getElementById('wv-idx-quote');
  if (iq) { const q = W.data.indexQuote; iq.innerHTML = q?.last != null ? `<b class="${cls(q.change)}">${fmt(q.last, 2)}</b> <span class="${cls(q.change)}">${q.changePrice > 0 ? '+' : ''}${fmt(q.changePrice, 2)}（${pct(q.change)}）</span>` : ''; }
  buildIdxChart();
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
  return list.map(s => {
    const live = W.store?.getQuote(s.id); // 即時報價優先：快照掛掉時橫條不再凍在昨日收盤
    const px = live?.last ?? s.quote?.close ?? s.daily?.price, ch = live?.change ?? s.quote?.change ?? s.daily?.change;
    return `<button class="wv-chip ${s.id === W.id ? 'selected' : ''}" data-wchip="${esc(s.id)}" aria-pressed="${s.id === W.id}"><span class="wv-name">${esc(s.name)}<span class="wv-code">${esc(s.id)}</span></span><span class="wv-px"><b class="${cls(ch)}">${px != null ? fmt(px, 2) : '—'}</b><span class="${cls(ch)}">${pct(ch)}</span></span><span class="wv-spark">${sparkSVG(s.spark, s.prev, { w: 38, h: 12, xs: s.sparkX })}</span></button>`;
  }).join('');
}
function paintStrip() { const el = document.getElementById('wv-chips'); if (el) el.innerHTML = chipsHTML(); const n = document.getElementById('wv-count'); if (n) n.textContent = `${chipList().length} 檔`; resubscribeLive(); }

// ---------- 頁面 ----------
function headHTML() {
  const d = W.data, q = d?.quote;
  if (!d) return `<div class="wv-head" id="wv-head"><h2>${esc(W.id || '')}</h2><span class="wv-meta">載入中…</span></div>`;
  return `<div class="wv-head" id="wv-head"><h2>${esc(d.name)} <span class="wv-meta">${esc(d.id)}</span></h2><span class="wv-px ${cls(q?.change)}">${q?.last != null ? fmt(q.last, 2) : '—'}</span><span class="wv-meta ${cls(q?.change)}">${q?.change != null ? `${q.changePrice > 0 ? '+' : ''}${fmt(q.changePrice, 2)}（${pct(q.change)}）` : ''}</span><span class="wv-meta">昨收 ${d.ref != null ? fmt(d.ref, 2) : '—'}　開 ${fmt(q?.open, 2)}　高 ${fmt(q?.high, 2)}　低 ${fmt(q?.low, 2)}　量 ${fmt(q?.volume)}　${q?.time || ''}</span></div>`;
}
function controlsHTML() {
  return `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:6px 0 8px"><div class="segmented" role="group" aria-label="K 線週期">${PERIODS.map(p => `<button data-wperiod="${p}" class="${W.period === p ? 'selected' : ''}" aria-pressed="${W.period === p}">${PERIOD_LABEL[p]}</button>`).join('')}</div><div class="actions"><button data-wtoggle="ma" aria-pressed="${W.showMA}" class="${W.showMA ? 'selected' : ''}">均線</button><button data-wtoggle="vol" aria-pressed="${W.showVol}" class="${W.showVol ? 'selected' : ''}">成交量</button><button data-wtoggle="macd" aria-pressed="${W.showMACD}" class="${W.showMACD ? 'selected' : ''}">MACD</button><button data-windicator>技術指標</button></div></div>`;
}
export function watchPage() {
  const st = C.state();
  if (!W.id) { W.id = (st.watchlist || [])[0] || '3406'; W.data = null; W.dataKey = ''; }
  const g = wg();
  queueMicrotask(() => syncWatchDOM());
  return `<div class="wv-strip"><input type="search" id="wv-filter" placeholder="篩選代碼或名稱" value="${esc(W.query)}" aria-label="篩選代碼或名稱"><select id="wv-group" aria-label="自訂族群"><option value="">全部自選（${st.watchlist.length}）</option>${g.groups.map(x => `<option value="${esc(x.id)}" ${W.group === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}<option value="none" ${W.group === 'none' ? 'selected' : ''}>未分組</option></select><span class="wv-count" id="wv-count">${chipList().length} 檔</span><span class="wv-stream-status" id="wv-stream"><span class="dot"></span><span id="wv-stream-text">連線中</span></span>${W.error ? `<span class="wv-count" style="color:var(--down)">${esc(W.error)}</span>` : ''}</div>
  <div class="wv-chips" id="wv-chips">${chipsHTML()}</div>
  <div class="wv-grid" id="wv-grid"></div>`;
}
function paintWatch() {
  const head = document.getElementById('wv-head'); if (head) head.outerHTML = headHTML();
  const book = document.getElementById('wv-book'); if (book && W.data) book.innerHTML = bookHTML(W.data);
  if (W.data) {
    const keyChanged = W.chartDataKey !== W.dataKey;
    if (W.data.tape && (W.tapeRows == null || keyChanged || W.streamStatus !== 'live')) W.tapeRows = W.data.tape.slice(0, 40);
    const tape = document.getElementById('wv-tape'); if (tape) tape.innerHTML = tapeHTML({ ...W.data, tape: W.tapeRows ?? W.data.tape });
  }
  const iq = document.getElementById('wv-idx-quote'); if (iq && W.data) { const q = W.data.indexQuote; iq.innerHTML = q?.last != null ? `<b class="${cls(q.change)}">${fmt(q.last, 2)}</b> <span class="${cls(q.change)}">${q.changePrice > 0 ? '+' : ''}${fmt(q.changePrice, 2)}（${pct(q.change)}）</span>` : ''; }
  paintStudies();
  buildIdxChart();
  paintStreamStatus();
  if (W.intraApi && W.data?.minutes) W.intraApi.setData({ minutes: W.data.minutes, ref: W.data.ref, open: W.data.open, close: W.data.close });
  if (W.chartApi && W.data?.bars?.length) {
    if (W.chartDataKey !== W.dataKey) {
      W.chartApi.setBars(W.data.bars);
      W.chartDataKey = W.dataKey;
      W.noOlder = false;
      renderInstances();
      if (W.drawingsApi && W.drawingsSymbol !== W.id) { W.drawingsApi.load(W.id); W.drawingsSymbol = W.id; }
    } else {
      W.chartApi.replaceBars(W.data.bars);
      renderInstances();
    }
  } else if (!W.chartApi && W.lib && W.data?.bars?.length && document.getElementById('wv-chart')) {
    // 進頁面時尚無 K 線（盤前／資料未到），輪詢拿到 bars 後才掛上圖表
    mountChart();
  }
}

// ---------- 格子工作區＋圖表掛載 ----------
function destroyChart() {
  if (W.drawKeyHandler) { try { document.removeEventListener('keydown', W.drawKeyHandler); } catch { } W.drawKeyHandler = null; }
  try { W.drawingsApi?.destroy(); } catch { }
  W.drawingsApi = null; W.drawBar = null;
  try { W.chartApi?.destroy(); } catch { }
  W.chartApi = null; W.chartEl = null;
  try { W.intraApi?.destroy(); } catch { }
  W.intraApi = null;
  W.instances = [];
}
function destroyLive() {
  destroyChart();
  try { W.gridApi?.destroy(); } catch { }
  W.gridApi = null; W.gridEl = null;
}
function mountDrawToolbar(el) {
  const bar = document.createElement('div');
  bar.className = 'wv-draw-toolbar';
  bar.innerHTML = Object.entries(DRAW_TOOLS).map(([tool, def]) => `<button type="button" data-wdraw="${tool}" title="${def.label}" aria-label="${def.label}">${def.label.slice(0, 1)}</button>`).join('');
  bar.addEventListener('click', e => {
    e.stopPropagation(); // 工具列在圖表容器內：點擊不能冒泡到圖表，否則畫線工具會誤判為圖上點擊
    const b = e.target.closest('[data-wdraw]'); if (!b || !W.drawingsApi) return;
    const tool = b.dataset.wdraw;
    W.drawingsApi.setTool(W.drawingsApi.getTool() === tool ? null : tool);
    refreshDrawToolbar();
  });
  el.appendChild(bar);
  W.drawBar = bar;
  refreshDrawToolbar();
}
function refreshDrawToolbar() {
  if (!W.drawBar) return;
  const active = W.drawingsApi?.getTool() || null;
  for (const b of W.drawBar.querySelectorAll('[data-wdraw]')) b.classList.toggle('selected', b.dataset.wdraw === active);
}
function mountChart() {
  destroyChart();
  const el = document.getElementById('wv-chart');
  if (!el) return;
  if (!W.lib) { el.innerHTML = `<div class="wv-empty">圖表元件載入失敗：${esc(W.libError || '尚未載入')}</div>`; return; }
  if (!W.data?.bars?.length) { el.innerHTML = '<div class="wv-empty">尚無 K 線資料。</div>'; return; }
  W.chartApi = createCandleChart({ el, lib: W.lib, onNeedOlder: loadOlderBars });
  W.chartEl = el;
  W.chartApi.setBars(W.data.bars);
  W.chartDataKey = W.dataKey;
  W.noOlder = false;
  rebuildInstances();
  W.drawingsApi = createDrawings({ chart: W.chartApi.getChart(), series: W.chartApi.getCandles(), onChange: () => { try { W.drawingsApi.save(W.id); } catch { } } });
  W.drawingsApi.load(W.id);
  W.drawingsSymbol = W.id;
  // Delete／Backspace 刪畫線時不能誤傷正在輸入的欄位（篩選框、設定表單）
  W.drawKeyHandler = e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    W.drawingsApi?.handleKeyDown(e);
    refreshDrawToolbar();
  };
  document.addEventListener('keydown', W.drawKeyHandler);
  mountDrawToolbar(el);
  W.intraApi = createIntradayLine({ el: document.getElementById('wv-intra') });
  if (W.data.minutes) W.intraApi.setData({ minutes: W.data.minutes, ref: W.data.ref, open: W.data.open, close: W.data.close });
}
function mountGrid() {
  const el = document.getElementById('wv-grid');
  if (!el) return;
  destroyLive();
  const candleEl = document.createElement('div');
  candleEl.className = 'wv-candle-panel';
  candleEl.innerHTML = `${headHTML()}${controlsHTML()}<div class="wv-studies" id="wv-studies"></div><div class="wv-chart" id="wv-chart"><div class="wv-empty">${W.libError ? `圖表元件載入失敗：${esc(W.libError)}` : '載入圖表元件中…'}</div></div><p class="fine">圖表由 TradingView Lightweight Charts 提供（<a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">tradingview.com</a>）· 均線與 MACD 由 lightweight-charts-indicators 計算 · 僅供看盤參考，不構成投資建議</p>`;
  const intraEl = document.createElement('div');
  intraEl.innerHTML = '<div id="wv-intra" style="height:100%"></div>';
  const taiexEl = document.createElement('div');
  taiexEl.innerHTML = '<div class="contentpad"><div id="wv-idx-quote" class="fine" style="margin-bottom:4px"></div><div class="wv-idxchart" id="wv-idx"></div></div>';
  const bookEl = document.createElement('div');
  bookEl.innerHTML = `<div class="contentpad" id="wv-book" style="height:100%;overflow:auto">${W.data ? bookHTML(W.data) : '<div class="empty">載入中…</div>'}</div>`;
  const tradesEl = document.createElement('div');
  tradesEl.innerHTML = `<div class="contentpad" id="wv-tape" style="height:100%;overflow:auto">${W.data ? tapeHTML(W.data) : '<div class="empty">載入中…</div>'}</div>`;
  W.gridApi = createGrid({
    el,
    panels: [
      { id: 'candle', title: 'K 線圖', element: candleEl },
      { id: 'intraday', title: '個股當日走勢', element: intraEl },
      { id: 'taiex', title: '加權指數', element: taiexEl },
      { id: 'book', title: '五檔報價', element: bookEl },
      { id: 'trades', title: '成交明細', element: tradesEl },
    ],
  });
  W.gridEl = el;
  mountChart();
}

// ---------- 圖表元件 ----------
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

// ---------- 指標實例（Phase 6） ----------
// 實例 = 一個顯示中的指標：內建（均線／成交量／MACD）或目錄指標，各自有自己的設定／顯示／移除，顯示在圖內圖例。
// 實例集合變動（開關／套用／移除）時重建副圖與 series；切週期／換股只換資料、不重建圖表。
const tailVal = pts => { for (let i = (pts || []).length - 1; i >= 0; i--) { const v = pts[i]?.value; if (typeof v === 'number' && Number.isFinite(v)) return v; } return null; };
function rebuildInstances() {
  if (!W.chartApi || !W.lib) return;
  const chart = W.chartApi.getChart(), { lwc } = W.lib;
  for (const inst of W.instances) {
    try { if (inst.renderer) inst.renderer.clear(); } catch { } // 目錄指標：清掉 series，空副圖一併移除
    for (const s of inst.series || []) { try { chart.removeSeries(s); } catch { } }
  }
  W.instances = [];
  try { const panes = chart.panes(); for (let i = panes.length - 1; i >= 1; i--) { try { if (panes[i].getSeries().length === 0) chart.removePane(i); } catch { } } } catch { }
  if (!W.data?.bars?.length) { W.chartApi.setLegendRows([]); return; }
  const addPane = h => { try { chart.addPane(); const i = chart.panes().length - 1; if (h) chart.panes()[i]?.setHeight(h); return i; } catch { return -1; } };
  if (W.showVol && !W.hidden.has('builtin:vol')) {
    const pane = addPane(W.volHeight);
    const s = chart.addSeries(lwc.HistogramSeries, { priceFormat: { type: 'volume' } }, pane);
    W.instances.push({ uid: 'builtin:vol', kind: 'builtin', key: 'vol', name: '成交量', visible: true, pane, series: [s] });
  }
  if (W.showMACD && !W.hidden.has('builtin:macd')) {
    const pane = addPane(110);
    const hist = chart.addSeries(lwc.HistogramSeries, { priceFormat: { type: 'price', precision: 2 } }, pane);
    const dif = chart.addSeries(lwc.LineSeries, { color: DIFC, lineWidth: 1 }, pane);
    const dea = chart.addSeries(lwc.LineSeries, { color: DEAC, lineWidth: 1 }, pane);
    W.instances.push({ uid: 'builtin:macd', kind: 'builtin', key: 'macd', name: `MACD ${W.macdFast}/${W.macdSlow}/${W.macdSignal}`, visible: true, pane, series: [hist, dif, dea] });
  }
  if (W.showMA && !W.hidden.has('builtin:ma')) {
    const ma5 = chart.addSeries(lwc.LineSeries, { color: MA5C, lineWidth: 1 });
    const ma20 = chart.addSeries(lwc.LineSeries, { color: MA20C, lineWidth: 1 });
    W.instances.push({ uid: 'builtin:ma', kind: 'builtin', key: 'ma', name: `均線 ${W.maFast}/${W.maSlow}`, visible: true, pane: 0, series: [ma5, ma20] });
  }
  for (const study of W.studies) {
    if (W.hidden.has(study.uid)) { W.instances.push({ uid: study.uid, kind: 'catalog', id: study.id, name: (registryEntry(study.id)?.shortName || registryEntry(study.id)?.name || study.id), visible: false, pane: -1, series: [], renderer: null, entry: registryEntry(study.id), inputs: study.inputs || {} }); continue; }
    const entry = registryEntry(study.id); if (!entry) continue;
    let pane = 0;
    if (!entry.overlay) pane = addPane(110);
    let renderer = null;
    try { renderer = new W.lib.IndicatorRenderer(chart, { paneIndex: pane, mainSeries: W.chartApi.getCandles() }); }
    catch (e) { study.error = e.message; continue; }
    W.instances.push({ uid: study.uid, kind: 'catalog', id: study.id, name: entry.shortName || entry.name, visible: true, pane, series: [], renderer, entry, inputs: study.inputs || {} });
  }
  renderInstances();
}
function renderInstances() {
  if (!W.chartApi || !W.lib || !W.data?.bars?.length) return;
  const bars = numBars(W.data.bars);
  for (const inst of W.instances) {
    if (!inst.visible) continue;
    if (inst.kind === 'builtin') renderBuiltin(inst, bars);
    else renderCatalogInstance(inst, bars);
  }
  updateLegendRows();
}
function renderBuiltin(inst, bars) {
  const { SMA, MACD } = W.lib;
  try {
    if (inst.key === 'vol') {
      inst.series[0].setData(bars.map(b => ({ time: b.time, value: b.volume, color: b.close >= b.open ? UP : DOWN })));
      inst.lastResult = { volume: bars.at(-1)?.volume ?? null };
    } else if (inst.key === 'ma') {
      const r5 = SMA.calculate(bars, { len: W.maFast, src: 'close' }), r20 = SMA.calculate(bars, { len: W.maSlow, src: 'close' });
      inst.series[0].setData(r5.plots.plot0); inst.series[1].setData(r20.plots.plot0);
      inst.lastResult = { ma5: tailVal(r5.plots.plot0), ma20: tailVal(r20.plots.plot0) };
    } else if (inst.key === 'macd') {
      const r = MACD.calculate(bars, { fastLength: W.macdFast, slowLength: W.macdSlow, signalLength: W.macdSignal });
      inst.series[0].setData(r.plots.plot0.map(p => ({ time: p.time, value: p.value, color: p.value >= 0 ? UP : DOWN })));
      inst.series[1].setData(r.plots.plot1); inst.series[2].setData(r.plots.plot2);
      inst.lastResult = { hist: tailVal(r.plots.plot0), dif: tailVal(r.plots.plot1), dea: tailVal(r.plots.plot2) };
    }
    inst.error = '';
  } catch (e) { inst.error = e.message || '計算失敗'; }
}
function renderCatalogInstance(inst, bars) {
  const study = W.studies.find(s => s.uid === inst.uid);
  if (!study || !inst.renderer) return;
  try {
    const result = inst.entry.calculate(bars, { ...inst.entry.defaultInputs, ...study.inputs }, chartContext());
    inst.renderer.render(inst.entry, result, bars, { inputs: study.inputs, reuseSeries: true });
    inst.lastResult = result;
    inst.inputs = study.inputs || {};
    inst.error = ''; study.error = '';
  } catch (err) {
    const missing = err?.name === 'MissingSymbolDataError' || (W.lib?.MissingSymbolDataError && err instanceof W.lib.MissingSymbolDataError);
    inst.error = missing ? '需要其他商品資料，暫不支援' : (err?.message || '計算失敗');
    study.error = inst.error;
  }
}
function updateLegendRows() {
  if (!W.chartApi) return;
  const rows = W.instances.map(inst => {
    let values = [], color = '#8fa3b8';
    if (inst.kind === 'builtin') {
      const r = inst.lastResult || {};
      if (inst.key === 'ma') { color = MA5C; values = [{ text: `${W.maFast} ${formatLegendValue(r.ma5)}`, color: MA5C }, { text: `${W.maSlow} ${formatLegendValue(r.ma20)}`, color: MA20C }]; }
      else if (inst.key === 'vol') { values = [{ text: `量 ${formatLegendValue(r.volume, 0)}`, color: '#8fa3b8' }]; }
      else if (inst.key === 'macd') { color = DIFC; values = [{ text: `DIF ${formatLegendValue(r.dif)}`, color: DIFC }, { text: `DEA ${formatLegendValue(r.dea)}`, color: DEAC }, { text: `柱 ${formatLegendValue(r.hist)}`, color: (r.hist ?? 0) >= 0 ? UP : DOWN }]; }
    } else {
      values = inst.visible && inst.lastResult ? studyLegendValues(inst.entry, inst.lastResult, inst.inputs || {}) : [];
      color = values[0]?.color || '#2962FF';
    }
    return {
      uid: inst.uid, name: inst.name, color, values: inst.visible ? values : [], visible: inst.visible,
      onSettings: uid => { const it = W.instances.find(x => x.uid === uid); if (!it) return; if (it.kind === 'builtin') openBuiltinSettings(it.key); else openStudySettings(uid); },
      onToggle: uid => { const it = W.instances.find(x => x.uid === uid); if (it) setInstanceVisible(it, !it.visible); },
      onRemove: uid => { const it = W.instances.find(x => x.uid === uid); if (!it) return; if (it.kind === 'builtin') toggleBuiltin(it.key); else removeStudy(uid); },
    };
  });
  W.chartApi.setLegendRows(rows);
}
function setInstanceVisible(inst, visible) {
  if (visible) W.hidden.delete(inst.uid); else W.hidden.add(inst.uid);
  inst.visible = visible;
  rebuildInstances();
}

// ---------- 技術指標套用 ----------
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
  rebuildInstances();
  C.toast(`已套用 ${entry.shortName || entry.name}`);
}
function removeStudy(uid) {
  W.studies = W.studies.filter(s => s.uid !== uid);
  W.hidden.delete(uid);
  saveStudies(); paintStudies();
  if (W.pickerMode === 'settings') { W.pickerMode = 'list'; W.pickerStudy = null; renderPicker(); }
  rebuildInstances();
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
  renderInstances();
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
  if (key === 'ma') { W.showMA = !W.showMA; savePref('nexus.watchMA', W.showMA ? '1' : '0'); W.hidden.delete('builtin:ma'); if (W.showMA) dropStudyById('sma', '均線開關已開啟，已移除目錄版 SMA'); }
  else if (key === 'vol') { W.showVol = !W.showVol; savePref('nexus.watchVol', W.showVol ? '1' : '0'); W.hidden.delete('builtin:vol'); }
  else if (key === 'macd') { W.showMACD = !W.showMACD; savePref('nexus.watchMACD', W.showMACD ? '1' : '0'); W.hidden.delete('builtin:macd'); if (W.showMACD) dropStudyById('macd', 'MACD 開關已開啟，已移除目錄版 MACD'); }
  else return;
  // 內建開關只是建／刪實例：不整頁重繪、不重建圖表；按鈕狀態就地更新
  const btn = document.querySelector(`[data-wtoggle="${key}"]`);
  const on = key === 'ma' ? W.showMA : key === 'vol' ? W.showVol : W.showMACD;
  if (btn) { btn.classList.toggle('selected', on); btn.setAttribute('aria-pressed', String(on)); }
  W.studiesHTML = ''; paintStudies();
  rebuildInstances();
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
  // 右上的迷你圖只畫當日走勢：不再退回日 K，避免分時資料短暫缺失時冒出舊的迷你 K 線
  const intra = W.data?.indexIntraday;
  if (intra?.minutes?.m?.length) { el.innerHTML = indexIntradaySVG(intra); return; }
  el.innerHTML = `<div class="wv-empty">${W.data ? '尚無指數當日走勢。' : '載入中…'}</div>`;
}
async function syncWatchDOM() {
  if (!C || C.page() !== 'watch') return;
  const el = document.getElementById('wv-grid');
  if (!el) return;
  try { await ensureLibs(); } catch { const e2 = document.getElementById('wv-chart'); if (e2 && !W.chartApi) e2.innerHTML = `<div class="wv-empty">圖表元件載入失敗：${esc(W.libError)}</div>`; }
  if (!W.gridApi || W.gridEl !== el) mountGrid();
  else if (!W.chartApi || W.chartEl !== document.getElementById('wv-chart')) mountChart();
  paintWatch();
}

// ---------- 事件 ----------
document.addEventListener('click', async e => {
  if (C && C.page() === 'watch') {
    refreshDrawToolbar(); // 畫完一筆工具自動解除，工具列的選取狀態跟著更新
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
    if (ds.wperiod && PERIODS.includes(ds.wperiod) && ds.wperiod !== W.period) { W.period = ds.wperiod; W.data = null; W.dataKey = ''; W.tapeRows = null; savePref('nexus.watchPeriod', ds.wperiod); await loadWatch(); C.redraw(); if (C.page() === 'watch') { await syncWatchDOM(); resubscribeLive(); } return; }
    if (ds.wtoggle) { toggleBuiltin(ds.wtoggle); return; }
    if (ds.wchip && ds.wchip !== W.id) { W.id = ds.wchip; W.data = null; W.dataKey = ''; W.tapeRows = null; await loadWatch(); C.redraw(); if (C.page() === 'watch') { await syncWatchDOM(); resubscribeLive(); } return; }
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
      W.studiesHTML = ''; paintStudies(); renderInstances();
    }
  }
});
// 設定表單在對話框裡：Enter 不送出、不換頁
document.addEventListener('submit', e => { if (e.target.id === 'ind-settings' || e.target.id === 'bi-settings') e.preventDefault(); });
// SSE 即時時 3 秒輪詢停用；SSE 斷線時輪詢接手報價／五檔／成交明細與最後一根 K 棒
setInterval(async () => {
  if (!C || document.hidden) return;
  if (C.page() !== 'watch') { teardownLive(); return; }
  if (!MK.isOpen()) return;
  if (W.store?.getStatus() === 'live') return;
  await loadWatch(); if (C.page() === 'watch') paintWatch();
}, 3000);
// 自選橫條每 10 秒更新
setInterval(async () => {
  if (!C || document.hidden || C.page() !== 'watch') return;
  await loadBoard(); paintStrip();
}, 10000);
// SSE 即時時每 15 秒用 REST 補一次週期 K 線（3 分以上由伺服器合成，非 1 分 K 的最後一根靠它更新）
setInterval(async () => {
  if (!C || document.hidden || C.page() !== 'watch' || !MK.isOpen()) return;
  if (W.store?.getStatus() !== 'live') return;
  await loadWatch(); if (C.page() === 'watch') paintWatch();
}, 15000);

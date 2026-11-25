// 即時看盤：可拖曳格子工作區（Phase 2，手寫 vanilla JS，不依賴 React／格子套件）。
//
// 本檔案分兩層：
//   1. 純版面計算（不碰 DOM，可單元測試）：createGridLayout / normalizeLayout /
//      serialize / parseLayout / stackForMobile / defaultLayout / getLayoutForWidth。
//   2. DOM 控制器 createGrid：把面板排進容器、拖曳／縮放、ResizeObserver 回報尺寸、
//      localStorage 持久化。
//
// ── 給整合者（watch.js）的掛載方式 ──────────────────────────────────────────
//   import { createGrid } from './grid.js';
//   const grid = createGrid({
//     el: document.querySelector('#wv-grid'),   // 容器，取代原本 .wv-layout 中間欄
//     panels: [
//       { id: 'candle',   title: 'K 線',     element: chartEl },
//       { id: 'intraday', title: '當日走勢', element: intradayEl },
//       { id: 'taiex',    title: '加權指數', element: taiexEl },
//       { id: 'book',     title: '五檔',     element: bookEl },
//       { id: 'trades',   title: '成交明細', element: tradesEl },
//     ],
//     onLayoutChange: (layout) => { /* 版面已持久化；layout 是 [{id,x,y,w,h}] */ },
//     onResize: (panelId, { width, height }) => {
//       // 面板像素尺寸變化（debounce 120ms），例如 chart.applyOptions({ width, height })
//     },
//   });
//   grid.getLayout();            // 目前桌面版面（深拷貝，[{id,x,y,w,h}]）
//   grid.setLayout(layout);      // 套用版面（陣列或 JSON 字串）；無效回傳 false
//   grid.addPanel({ id, title, element });  // 動態加面板（已存在則更新標題／內容）
//   grid.removePanel(id);        // 移除面板；不存在回傳 false
//   grid.refresh();              // 容器顯示／寬度變化後重算（例如從隱藏頁籤切回來）
//   grid.destroy();              // 拆掉監聽與格子 DOM（傳入的 element 會隨容器一併脫離文件）
//
// ── 版面單位 ────────────────────────────────────────────────────────────────
//   欄／列單位：x、y、w、h 都是整數格（x + w <= cols，w >= 1，h >= 1）。
//   像素換算：欄寬 = (容器寬 - gap * (cols - 1)) / cols；列高 = rowHeight。
//   預設 cols = 12、rowHeight = 120px、gap = 16px。
//
// ── 預設版面（桌面 12 欄） ──────────────────────────────────────────────────
//   candle   x:0 y:0 w:8 h:4   intraday x:8 y:0 w:4 h:2   taiex x:8 y:2 w:4 h:2
//   book     x:0 y:4 w:6 h:3   trades   x:6 y:4 w:6 h:3
//   手機（容器寬 < 768px）：單欄堆疊，順序 candle → intraday → taiex → book → trades；
//   堆疊是顯示時推導的，不寫入 localStorage，桌面版面不受影響。手機模式下拖曳／
//   縮放停用（單欄沒有水平移動的意義）。
//
// ── 持久化 ──────────────────────────────────────────────────────────────────
//   localStorage key：'nexus.watchGrid.v1'，值為 serialize(layout) 的 JSON 字串。
//   建立時若 key 存在且 parseLayout 驗證通過就採用，否則用預設版面；每次提交
//   （拖曳放開／縮放放開／add／remove／setLayout）後立即存檔並呼叫 onLayoutChange。
//
// ── 發出的 class（視覺樣式由整合者在 hud.css 補，定位全靠 inline style） ──
//   wv-grid（容器）、wv-grid-item、wv-grid-handle（標題列＝拖曳把手）、wv-grid-title、
//   wv-grid-body、wv-grid-resize（右下角縮放把手）、wv-grid-ghost（拖曳預覽框）、
//   wv-grid-mobile（容器在手機模式時附加）、wv-grid-dragging（拖曳中的面板附加）。
//
// 注意：本模組頂層不碰 window / document / localStorage，node 下 import 測試純函數是安全的。

export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 120;
export const GRID_GAP = 16;
export const MOBILE_BREAKPOINT = 768;
export const LAYOUT_KEY = 'nexus.watchGrid.v1';
export const HANDLE_HEIGHT = 28; // 標題列固定高度（inline style，不依賴 hud.css）

// 預設版面（桌面 12 欄）：candle 最大，intraday／taiex 在右上，book／trades 在下方。
export const DEFAULT_LAYOUT = [
  { id: 'candle', x: 0, y: 0, w: 8, h: 4 },
  { id: 'intraday', x: 8, y: 0, w: 4, h: 2 },
  { id: 'taiex', x: 8, y: 2, w: 4, h: 2 },
  { id: 'book', x: 0, y: 4, w: 6, h: 3 },
  { id: 'trades', x: 6, y: 4, w: 6, h: 3 },
];

// 兩個矩形（欄／列單位）是否重疊。
function collides(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function byYX(a, b) {
  return (a.y - b.y) || (a.x - b.x);
}

// ── 純版面計算 ──────────────────────────────────────────────────────────────

// 回傳一份新的預設版面（深拷貝，改動不影響 DEFAULT_LAYOUT）。
export function defaultLayout(cols = GRID_COLS) {
  return normalizeLayout(DEFAULT_LAYOUT.map((p) => ({ ...p })), cols);
}

// 整理版面：不過濾掉合法面板，只做三件事——
//   1. 清洗數字（非整數／缺值補預設，w/h 至少 1，x/y 至少 0）；
//   2. 夾在格子邊界內（x + w <= cols，w <= cols）；
//   3. 去重疊（依 y、x 排序，碰撞的往下推）再緊湊化（每個面板盡量往上移）。
// 不改動傳入的陣列與面板物件；id 重複時保留第一個；其餘欄位原樣保留。
export function normalizeLayout(panels, cols = GRID_COLS) {
  if (!Array.isArray(panels)) return [];
  const seen = new Set();
  const clean = [];
  for (const p of panels) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    let w = Math.floor(Number(p.w));
    let h = Math.floor(Number(p.h));
    let x = Math.floor(Number(p.x));
    let y = Math.floor(Number(p.y));
    if (!Number.isFinite(w) || w < 1) w = 1;
    if (!Number.isFinite(h) || h < 1) h = 1;
    if (!Number.isFinite(x)) x = 0;
    if (!Number.isFinite(y) || y < 0) y = 0;
    w = Math.min(w, cols);
    x = Math.min(Math.max(x, 0), cols - w);
    clean.push({ ...p, id: p.id, x, y, w, h });
  }
  clean.sort(byYX);
  // 去重疊：已放好的面板不動，碰撞的往下推一列直到不重疊。
  const placed = [];
  for (const p of clean) {
    const item = { ...p };
    while (placed.some((q) => collides(item, q))) item.y += 1;
    placed.push(item);
  }
  // 緊湊化：由上而下，每個面板盡量往上移，填掉空白列。
  for (const item of placed) {
    while (item.y > 0) {
      const trial = { ...item, y: item.y - 1 };
      if (placed.some((q) => q !== item && collides(trial, q))) break;
      item.y -= 1;
    }
  }
  placed.sort(byYX);
  return placed;
}

// 版面 → JSON 字串（只保留 id/x/y/w/h，其餘欄位不進 localStorage）。
export function serialize(layout) {
  if (!Array.isArray(layout)) throw new TypeError('serialize: layout 必須是陣列');
  return JSON.stringify(layout.map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h })));
}

// JSON 字串（或已解析的值）→ 版面陣列。容忍損毀／不完整資料：
// 解析失敗、不是陣列、空陣列、沒有任何合法項目時回傳 null，絕不丟錯；
// 合法項目保留（並經 normalizeLayout 整理），非法項目、重複 id 丟棄。
export function parseLayout(raw, cols = GRID_COLS) {
  try {
    let data = raw;
    if (typeof raw === 'string') {
      if (!raw.trim()) return null;
      data = JSON.parse(raw);
    }
    if (!Array.isArray(data) || data.length === 0) return null;
    const valid = data.filter(
      (p) =>
        p && typeof p === 'object' && typeof p.id === 'string' && p.id &&
        Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)) &&
        Number.isFinite(Number(p.w)) && Number.isFinite(Number(p.h)),
    );
    if (valid.length === 0) return null;
    return normalizeLayout(valid, cols);
  } catch {
    return null;
  }
}

// 窄螢幕單欄堆疊：依原本 y 再 x 排序，全部 x = 0、w = cols，y 依高度接續往下排。
export function stackForMobile(panels, cols = GRID_COLS) {
  if (!Array.isArray(panels)) return [];
  const sorted = panels
    .filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && p.id)
    .sort((a, b) => {
      const ay = Number.isFinite(a.y) ? a.y : 0;
      const by = Number.isFinite(b.y) ? b.y : 0;
      const ax = Number.isFinite(a.x) ? a.x : 0;
      const bx = Number.isFinite(b.x) ? b.x : 0;
      return (ay - by) || (ax - bx);
    });
  let y = 0;
  return sorted.map((p) => {
    const h = Math.max(1, Math.floor(Number(p.h)) || 1);
    const item = { ...p, x: 0, y, w: cols, h };
    y += h;
    return item;
  });
}

// 依容器寬度決定顯示版面：< 768px 堆疊，否則桌面版面。
export function getLayoutForWidth(layout, width, cols = GRID_COLS) {
  const panels = normalizeLayout(layout, cols);
  return width < MOBILE_BREAKPOINT ? stackForMobile(panels, cols) : panels;
}

// 版面引擎：把純函數綁定一組 cols / rowHeight / gap，另附像素換算。
//   engine.rectFor(panel, containerWidth) → { left, top, width, height }（px）
//   engine.cellAt(px, py, containerWidth)  → { x, y }（滑鼠位置對應的格子）
export function createGridLayout({ cols = GRID_COLS, rowHeight = GRID_ROW_HEIGHT, gap = GRID_GAP } = {}) {
  const colWidth = (containerWidth) => (containerWidth - gap * (cols - 1)) / cols;
  return {
    cols,
    rowHeight,
    gap,
    normalize: (panels) => normalizeLayout(panels, cols),
    serialize: (layout) => serialize(layout),
    parse: (raw) => parseLayout(raw, cols),
    stackForMobile: (panels) => stackForMobile(panels, cols),
    defaultLayout: () => defaultLayout(cols),
    layoutForWidth: (layout, width) => getLayoutForWidth(layout, width, cols),
    rectFor(panel, containerWidth) {
      const cw = colWidth(containerWidth);
      return {
        left: panel.x * (cw + gap),
        top: panel.y * (rowHeight + gap),
        width: panel.w * cw + (panel.w - 1) * gap,
        height: panel.h * rowHeight + (panel.h - 1) * gap,
      };
    },
    cellAt(px, py, containerWidth) {
      const cw = colWidth(containerWidth);
      return {
        x: Math.max(0, Math.round(px / (cw + gap))),
        y: Math.max(0, Math.round(py / (rowHeight + gap))),
      };
    },
  };
}

// ── DOM 控制器 ──────────────────────────────────────────────────────────────

function debounce(fn, ms) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function readStoredLayout() {
  try {
    return parseLayout(localStorage.getItem(LAYOUT_KEY));
  } catch {
    return null;
  }
}

function saveStoredLayout(layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, serialize(layout));
  } catch {
    // 私密瀏覽／容量滿：版面只留在記憶體，不影響操作。
  }
}

// createGrid({ el, panels, onLayoutChange, onResize, cols, rowHeight, gap, layout })
//   el：容器元素（整合者提供；本函數會加上 wv-grid class 與 position:relative）。
//   panels：[{ id, title, element }]，element 是面板內容的 DOM 節點，會被搬進格子 body。
//   onLayoutChange(layout)：每次提交後呼叫，layout 是桌面版面深拷貝（已持久化）。
//   onResize(panelId, { width, height })：面板 body 像素尺寸變化時呼叫（debounce 120ms）。
//   layout（選填）：初始版面，優先於 localStorage；不給則讀 localStorage，讀不到用預設版面。
// 回傳 { getLayout, setLayout, addPanel, removePanel, refresh, destroy }。
export function createGrid({
  el,
  panels = [],
  onLayoutChange,
  onResize,
  cols = GRID_COLS,
  rowHeight = GRID_ROW_HEIGHT,
  gap = GRID_GAP,
  layout: initialLayout,
} = {}) {
  if (!el || typeof el.appendChild !== 'function') {
    throw new TypeError('createGrid: 需要一個容器元素 el');
  }
  const engine = createGridLayout({ cols, rowHeight, gap });
  const panelIds = panels.map((p) => p.id);
  const items = new Map(); // id → { id, title, element, itemEl, bodyEl }

  // 初始桌面版面：指定 layout > localStorage > 預設；缺漏的面板補在最下方。
  let layout;
  {
    const stored = initialLayout !== undefined
      ? parseLayout(initialLayout, cols)
      : readStoredLayout();
    const base = (stored || []).filter((p) => panelIds.includes(p.id));
    const have = new Set(base.map((p) => p.id));
    let nextY = base.reduce((m, p) => Math.max(m, p.y + p.h), 0);
    for (const id of panelIds) {
      if (have.has(id)) continue;
      const def = DEFAULT_LAYOUT.find((d) => d.id === id);
      if (def) base.push({ ...def });
      else {
        base.push({ id, x: 0, y: nextY, w: Math.min(6, cols), h: 2 });
        nextY += 2;
      }
    }
    layout = normalizeLayout(base, cols);
  }

  let mobile = false;
  let lastWidth = -1;
  let destroyed = false;

  el.classList.add('wv-grid');
  el.style.position = 'relative';

  // 拖曳預覽框（拖曳時才顯示）。
  const ghost = document.createElement('div');
  ghost.className = 'wv-grid-ghost';
  ghost.style.cssText = 'position:absolute;display:none;pointer-events:none;z-index:5;' +
    'border:2px dashed rgba(34,230,255,.7);background:rgba(34,230,255,.12);border-radius:4px;box-sizing:border-box;';
  el.appendChild(ghost);

  function containerWidth() {
    const w = el.clientWidth;
    if (w > 0) return w;
    if (typeof window !== 'undefined' && window.innerWidth > 0) return window.innerWidth;
    return 960;
  }

  function showGhost(pos) {
    const r = engine.rectFor(pos, containerWidth());
    ghost.style.display = 'block';
    ghost.style.left = `${r.left}px`;
    ghost.style.top = `${r.top}px`;
    ghost.style.width = `${r.width}px`;
    ghost.style.height = `${r.height}px`;
  }

  function hideGhost() {
    ghost.style.display = 'none';
  }

  function displayLayout() {
    return mobile ? stackForMobile(layout, cols) : layout;
  }

  function render() {
    if (destroyed) return;
    const cw = containerWidth();
    const shown = displayLayout();
    el.classList.toggle('wv-grid-mobile', mobile);
    for (const pos of shown) {
      const item = items.get(pos.id);
      if (!item) continue;
      const r = engine.rectFor(pos, cw);
      const s = item.itemEl.style;
      s.left = `${r.left}px`;
      s.top = `${r.top}px`;
      s.width = `${r.width}px`;
      s.height = `${r.height}px`;
    }
    const rows = shown.reduce((m, p) => Math.max(m, p.y + p.h), 0);
    el.style.height = rows > 0 ? `${rows * rowHeight + (rows - 1) * gap}px` : '';
  }

  // 容器寬度變化 → 重算手機／桌面模式與像素位置（寬度不變時不重算，避免 RO 自激）。
  const onContainerResize = debounce(() => {
    if (destroyed) return;
    const w = containerWidth();
    const nowMobile = w < MOBILE_BREAKPOINT;
    if (w !== lastWidth || nowMobile !== mobile) {
      lastWidth = w;
      mobile = nowMobile;
      render();
    }
  }, 100);

  // 面板尺寸回報：收集 ResizeObserver 的最新尺寸，debounce 後一次交給整合者。
  const pendingResize = new Map();
  const flushResize = debounce(() => {
    if (destroyed || typeof onResize !== 'function') {
      pendingResize.clear();
      return;
    }
    for (const [id, size] of pendingResize) {
      try {
        onResize(id, size);
      } catch {
        // 整合者回呼出錯不影響格子本身。
      }
    }
    pendingResize.clear();
  }, 120);

  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === el) {
          onContainerResize();
          continue;
        }
        const id = entry.target.dataset && entry.target.dataset.panelId;
        if (!id || !items.has(id)) continue;
        const rect = entry.contentRect;
        pendingResize.set(id, {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
      if (pendingResize.size > 0) flushResize();
    });
    ro.observe(el);
  }
  const onWindowResize = () => onContainerResize();
  if (typeof window !== 'undefined') window.addEventListener('resize', onWindowResize);

  function commit(nextLayout) {
    layout = normalizeLayout(nextLayout, cols);
    render();
    saveStoredLayout(layout);
    if (typeof onLayoutChange === 'function') {
      try {
        onLayoutChange(getLayout());
      } catch {
        // 整合者回呼出錯不影響格子本身。
      }
    }
  }

  function getLayout() {
    return layout.map((p) => ({ ...p }));
  }

  // ── 面板 DOM ────────────────────────────────────────────────────────────
  function buildItem(panel) {
    const itemEl = document.createElement('div');
    itemEl.className = 'wv-grid-item';
    itemEl.dataset.panelId = panel.id;
    itemEl.style.cssText = 'position:absolute;box-sizing:border-box;display:flex;flex-direction:column;' +
      'overflow:hidden;min-width:0;min-height:0;';

    const handle = document.createElement('div');
    handle.className = 'wv-grid-handle';
    handle.style.cssText = `display:flex;align-items:center;gap:6px;flex:0 0 ${HANDLE_HEIGHT}px;` +
      'height:28px;padding:0 8px;cursor:grab;user-select:none;touch-action:none;';
    const title = document.createElement('span');
    title.className = 'wv-grid-title';
    title.textContent = panel.title || panel.id;
    handle.appendChild(title);
    itemEl.appendChild(handle);

    const body = document.createElement('div');
    body.className = 'wv-grid-body';
    body.dataset.panelId = panel.id;
    body.style.cssText = 'flex:1;min-height:0;position:relative;overflow:hidden;';
    if (panel.element) body.appendChild(panel.element);
    itemEl.appendChild(body);

    const resize = document.createElement('div');
    resize.className = 'wv-grid-resize';
    resize.style.cssText = 'position:absolute;right:0;bottom:0;width:16px;height:16px;' +
      'cursor:nwse-resize;touch-action:none;z-index:6;';
    itemEl.appendChild(resize);

    el.appendChild(itemEl);
    const item = { id: panel.id, title: panel.title || panel.id, element: panel.element, itemEl, bodyEl: body };
    items.set(panel.id, item);
    if (ro) ro.observe(body);
    attachDrag(handle, panel.id);
    attachResize(resize, panel.id);
    return item;
  }

  function removeItemDom(id) {
    const item = items.get(id);
    if (!item) return;
    if (ro) ro.unobserve(item.bodyEl);
    item.itemEl.remove();
    items.delete(id);
  }

  // ── 拖曳 ────────────────────────────────────────────────────────────────
  // 指標在標題列按下 → 以抓取點為錨點換算目標格子，ghost 顯示落點；
  // 放開時提交（碰撞的面板由 normalizeLayout 往下推），手機模式停用。
  let drag = null;
  function attachDrag(handle, id) {
    handle.addEventListener('pointerdown', (e) => {
      if (destroyed || mobile) return;
      if (e.button !== undefined && e.button !== 0) return;
      const pos = layout.find((p) => p.id === id);
      const item = items.get(id);
      if (!pos || !item) return;
      const containerRect = el.getBoundingClientRect();
      const itemRect = item.itemEl.getBoundingClientRect();
      drag = {
        id,
        w: pos.w,
        h: pos.h,
        origX: pos.x,
        origY: pos.y,
        offsetX: e.clientX - itemRect.left,
        offsetY: e.clientY - itemRect.top,
        containerRect,
      };
      item.itemEl.classList.add('wv-grid-dragging');
      item.itemEl.style.opacity = '0.5';
      showGhost(pos);
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        // 舊瀏覽器沒有 setPointerCapture：move 事件仍會冒泡到 handle，照常運作。
      }
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== id) return;
      const cw = containerWidth();
      const px = e.clientX - drag.containerRect.left - drag.offsetX;
      const py = e.clientY - drag.containerRect.top - drag.offsetY;
      const cell = engine.cellAt(px, py, cw);
      const x = Math.min(Math.max(cell.x, 0), cols - drag.w);
      const y = Math.max(cell.y, 0);
      showGhost({ x, y, w: drag.w, h: drag.h });
      drag.targetX = x;
      drag.targetY = y;
    });
    const endDrag = (commitIt) => {
      if (!drag || drag.id !== id) return;
      const item = items.get(id);
      const { origX, origY, targetX, targetY } = drag;
      drag = null;
      hideGhost();
      if (item) {
        item.itemEl.classList.remove('wv-grid-dragging');
        item.itemEl.style.opacity = '';
      }
      if (commitIt && targetX !== undefined && (targetX !== origX || targetY !== origY)) {
        commit(layout.map((p) => (p.id === id ? { ...p, x: targetX, y: targetY } : p)));
      } else {
        render();
      }
    };
    handle.addEventListener('pointerup', () => endDrag(true));
    handle.addEventListener('pointercancel', () => endDrag(false));
  }

  // ── 縮放 ────────────────────────────────────────────────────────────────
  // 右下角把手：拖曳中即時改 inline 尺寸（貼齊格子），放開時提交；手機模式停用。
  let resizing = null;
  function attachResize(handle, id) {
    handle.addEventListener('pointerdown', (e) => {
      if (destroyed || mobile) return;
      if (e.button !== undefined && e.button !== 0) return;
      const pos = layout.find((p) => p.id === id);
      const item = items.get(id);
      if (!pos || !item) return;
      const containerRect = el.getBoundingClientRect();
      const itemRect = item.itemEl.getBoundingClientRect();
      resizing = {
        id,
        x: pos.x,
        y: pos.y,
        origW: pos.w,
        origH: pos.h,
        itemLeft: itemRect.left - containerRect.left,
        itemTop: itemRect.top - containerRect.top,
        containerRect,
      };
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        // 見拖曳處註解。
      }
      e.preventDefault();
      e.stopPropagation();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!resizing || resizing.id !== id) return;
      const item = items.get(id);
      if (!item) return;
      const cw = containerWidth();
      const colW = (cw - gap * (cols - 1)) / cols;
      const px = e.clientX - resizing.containerRect.left - resizing.itemLeft;
      const py = e.clientY - resizing.containerRect.top - resizing.itemTop;
      const w = Math.min(Math.max(Math.round((px + gap) / (colW + gap)), 1), cols - resizing.x);
      const h = Math.max(Math.round((py + gap) / (rowHeight + gap)), 1);
      resizing.w = w;
      resizing.h = h;
      const r = engine.rectFor({ x: resizing.x, y: resizing.y, w, h }, cw);
      item.itemEl.style.width = `${r.width}px`;
      item.itemEl.style.height = `${r.height}px`;
    });
    const endResize = (commitIt) => {
      if (!resizing || resizing.id !== id) return;
      const { origW, origH, w, h } = resizing;
      resizing = null;
      if (commitIt && w !== undefined && (w !== origW || h !== origH)) {
        commit(layout.map((p) => (p.id === id ? { ...p, w, h } : p)));
      } else {
        render();
      }
    };
    handle.addEventListener('pointerup', () => endResize(true));
    handle.addEventListener('pointercancel', () => endResize(false));
  }

  // ── 公開 API ────────────────────────────────────────────────────────────
  for (const p of panels) buildItem(p);
  mobile = containerWidth() < MOBILE_BREAKPOINT;
  lastWidth = containerWidth();
  render();

  return {
    // 目前桌面版面深拷貝（手機模式下顯示的是其單欄堆疊推導，見 displayLayout）。
    getLayout,
    // 套用版面（陣列或 JSON 字串）；解析失敗回傳 false，不動現有版面。
    setLayout(next) {
      if (destroyed) return false;
      const parsed = parseLayout(next, cols);
      if (!parsed) return false;
      const ids = new Set(panelIds);
      const kept = parsed.filter((p) => ids.has(p.id));
      const have = new Set(kept.map((p) => p.id));
      let nextY = kept.reduce((m, p) => Math.max(m, p.y + p.h), 0);
      for (const id of panelIds) {
        if (have.has(id)) continue;
        kept.push({ id, x: 0, y: nextY, w: Math.min(6, cols), h: 2 });
        nextY += 2;
      }
      commit(kept);
      return true;
    },
    // 新增面板（已存在則更新標題／內容元素），補在最下方並提交。
    addPanel(panel) {
      if (destroyed || !panel || typeof panel.id !== 'string' || !panel.id) return false;
      const existing = items.get(panel.id);
      if (existing) {
        if (panel.title !== undefined) {
          existing.title = panel.title;
          const titleEl = existing.itemEl.querySelector('.wv-grid-title');
          if (titleEl) titleEl.textContent = panel.title;
        }
        if (panel.element && panel.element !== existing.element) {
          existing.bodyEl.replaceChildren(panel.element);
          existing.element = panel.element;
        }
        return true;
      }
      // 只追蹤內部 panelIds，不改呼叫端傳入的 panels 陣列。
      panelIds.push(panel.id);
      buildItem(panel);
      const nextY = layout.reduce((m, p) => Math.max(m, p.y + p.h), 0);
      commit([...layout, { id: panel.id, x: 0, y: nextY, w: Math.min(6, cols), h: 2 }]);
      return true;
    },
    // 移除面板；不存在回傳 false。
    removePanel(id) {
      if (destroyed || !items.has(id)) return false;
      removeItemDom(id);
      const idx = panelIds.indexOf(id);
      if (idx >= 0) panelIds.splice(idx, 1);
      commit(layout.filter((p) => p.id !== id));
      return true;
    },
    // 容器顯示／寬度變化後重算（例如從隱藏狀態切回來時 clientWidth 從 0 恢復）。
    refresh() {
      if (destroyed) return;
      lastWidth = containerWidth();
      mobile = lastWidth < MOBILE_BREAKPOINT;
      render();
    },
    // 拆掉監聽與格子 DOM；傳入的 element 會隨格子一併脫離文件（節點本身不銷毀）。
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (ro) ro.disconnect();
      if (typeof window !== 'undefined') window.removeEventListener('resize', onWindowResize);
      for (const id of [...items.keys()]) removeItemDom(id);
      ghost.remove();
      el.classList.remove('wv-grid', 'wv-grid-mobile');
      el.style.height = '';
      el.style.position = '';
    },
  };
}

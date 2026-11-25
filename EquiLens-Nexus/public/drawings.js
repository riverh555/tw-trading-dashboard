// 即時看盤主圖：畫線工具（Phase 4）。
//
// 給整合者（watch.js 接線用）的說明：
//   import { createDrawings } from './drawings.js';
//   // 在 buildMainChart() 之後、W.chart 與 W.series.candles 就緒後建立：
//   const drawings = createDrawings({
//     chart: W.chart,
//     series: W.series.candles,           // 注意：是 K 線 series 本身，不是 W.series 物件
//     onChange: () => drawings.save(W.id), // 任何異動後觸發（內部已 debounce 300ms 才寫檔）
//     // onTextRequest: (point, done) => done('自訂文字'), // 文字工具要自訂輸入框時才傳；不傳就用 window.prompt
//   });
//   drawings.load(W.id);                    // 進頁面／換股時讀回該股的畫線
//   // 換週期不用動：座標是 time（epoch 秒）＋price，換週期不會漂移。
//   // 工具列按鈕：drawings.setTool('trend')；取消：drawings.setTool(null)。
//   // 鍵盤：document.addEventListener('keydown', drawings.handleKeyDown)
//   //   （Delete／Backspace 刪選取的畫線，Esc 取消進行中的畫線或取消選取）。
//   // 銷毀圖表時（destroyMainChart）：drawings.destroy()。
//
// 畫線物件形狀：{ id, tool, points: [{ time, price }, ...], options: { color?, text? } }
//   - time 一律是 epoch 秒（日 K 也一樣，見 watch.js 的 numBars），price 是價格。
//   - id 由 newDrawingId() 產生，唯一字串。
// localStorage：每檔股票一個 key，格式 `nexus.watchDrawings.<symbol>`（例：nexus.watchDrawings.3406）。
//   換股時 load(新代碼) 讀該股的畫線；換週期不換 key，畫線保留。
//
// 工具一覽（括號內是完成所需點數）：
//   horizontal（1）橫線：單一價格，橫跨整個 pane；vertical（1）直線：單一時間，縱跨整個 pane；
//   trend（2）趨勢線；ray（2）射線：起點穿過第二點、向右無限延伸；
//   extended（2）延長線：兩點定斜率、左右無限延伸；
//   channel（3）通道：前兩點定底線，第三點定平行線的偏移；
//   box（2）矩形：兩對角點；fib（2）費波回撤：起點＝100%、終點＝0%；
//   text（1）文字：點一下後輸入文字；measure（2）測量：價差、漲跌幅、時間跨度。
//
// 完成一筆畫線後工具自動解除（單次使用），再畫需重新選擇工具。
// 進行中的畫線目前沒有預覽（v1 限制）；點選已畫好的線可選取，拖曳可整條移動。
// horizontal／vertical 用 chart.attachPrimitive（pane-spanning），其餘用 series.attachPrimitive。
// 注意：Lightweight Charts v5 的 chart primitive 會在每個 pane 都畫一次；若副圖（成交量／MACD）
// 出現多餘橫線，把 TOOLS 裡該工具的 paneSpanning 改 false 即可改回 series 掛載。
// 本檔不依賴 DOM 或 Lightweight Charts（純幾何函式可直接單元測試）；
// 只有 createDrawings 需要真的 chart／series，渲染與滑鼠互動無法在 node 測試，留給 River 實機檢查。

// ---------- 工具定義 ----------

// points：完成該工具需要的點數；paneSpanning：是否掛在 chart（跨 pane）而非 series 上。
export const TOOLS = {
  horizontal: { points: 1, paneSpanning: true, label: '橫線' },
  vertical: { points: 1, paneSpanning: true, label: '直線' },
  trend: { points: 2, paneSpanning: false, label: '趨勢線' },
  ray: { points: 2, paneSpanning: false, label: '射線' },
  extended: { points: 2, paneSpanning: false, label: '延長線' },
  channel: { points: 3, paneSpanning: false, label: '通道' },
  box: { points: 2, paneSpanning: false, label: '矩形' },
  fib: { points: 2, paneSpanning: false, label: '費波回撤' },
  text: { points: 1, paneSpanning: false, label: '文字' },
  measure: { points: 2, paneSpanning: false, label: '測量' },
};

export const DEFAULT_COLORS = {
  horizontal: '#2962ff', vertical: '#2962ff', trend: '#f0b90b', ray: '#f0b90b',
  extended: '#787b86', channel: '#2962ff', box: '#2962ff', fib: '#787b86',
  text: '#e5e7eb', measure: '#22e6ff',
};

// 該工具完成需要幾個點；未知工具回傳 null。
export function pointsRequired(tool) {
  const t = TOOLS[tool];
  return t ? t.points : null;
}

// localStorage key：nexus.watchDrawings.<symbol>
export function storageKey(symbol) {
  if (typeof symbol !== 'string' || !symbol) throw new TypeError('storageKey 需要非空字串 symbol');
  return `nexus.watchDrawings.${symbol}`;
}

let _idSeq = 0;
export function newDrawingId() {
  _idSeq = (_idSeq + 1) % 100000;
  return `d${Date.now().toString(36)}${_idSeq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

// ---------- 純幾何（不碰 DOM／LWC，可單元測試） ----------

const isPoint = p => !!p && typeof p === 'object'
  && Number.isFinite(p.time) && Number.isFinite(p.price);

function needPoint(p, name) {
  if (!isPoint(p)) throw new TypeError(`${name} 需要 { time, price }，且兩者皆為有限數字`);
}

// 費波回撤：起點 p0＝100%、終點 p1＝0%（所以 level 0 在 p1 的價格，level 100 在 p0 的價格）。
// 回傳 7 個 level，依 ratio 由 0 到 1 排列：[{ ratio, label, price }]。
export function fibLevels(p0, p1) {
  needPoint(p0, 'p0'); needPoint(p1, 'p1');
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const labels = ['0', '23.6', '38.2', '50', '61.8', '78.6', '100'];
  return ratios.map((ratio, i) => ({
    ratio,
    label: labels[i],
    price: p1.price + (p0.price - p1.price) * ratio,
  }));
}

// 通道偏移：底線穿過 p0、p1，平行線穿過 p2；回傳平行線相對底線的「垂直價差」（價格單位）。
// 也就是在任意時間 t：平行線價格＝底線價格＋offset。底線為垂直線（p0.time === p1.time）
// 時斜率無定義，回傳 null（渲染時只畫底線）。
export function channelOffset(p0, p1, p2) {
  needPoint(p0, 'p0'); needPoint(p1, 'p1'); needPoint(p2, 'p2');
  if (p1.time === p0.time) return null;
  const slope = (p1.price - p0.price) / (p1.time - p0.time);
  return p2.price - (p0.price + slope * (p2.time - p0.time));
}

// 測量：兩點間的價差、漲跌幅、時間跨度。
// barsApprox 是「約幾根 1 分 K」：timeSpanSec / 60 四捨五入；跨度超過一天時無法對應分 K，回傳 null。
// （日 K 的兩點通常跨數天，barsApprox 為 null 是預期的；要算日 K 根數請用日期差另外算。）
export function measureStats(p0, p1) {
  needPoint(p0, 'p0'); needPoint(p1, 'p1');
  const priceDiff = p1.price - p0.price;
  const timeSpanSec = Math.abs(p1.time - p0.time);
  return {
    priceDiff,
    pctChange: p0.price === 0 ? null : (priceDiff / p0.price) * 100,
    timeSpanSec,
    barsApprox: timeSpanSec < 86400 ? Math.round(timeSpanSec / 60) : null,
  };
}

// ---------- 序列化 ----------

// 畫線陣列 → JSON 字串；輸入不合法時回傳 '[]'，不拋錯。
export function serializeDrawings(drawings) {
  try {
    if (!Array.isArray(drawings)) return '[]';
    return JSON.stringify(parseDrawings(drawings));
  } catch { return '[]'; }
}

// JSON 字串（或已是陣列）→ 畫線陣列。容忍損毀／不完整資料：
// 垃圾字串、非陣列、缺 id、未知工具、沒有合法點的項目一律丟掉，絕不拋錯。
export function parseDrawings(raw) {
  let arr;
  try {
    if (raw == null) return [];
    arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const d of arr) {
    if (!d || typeof d !== 'object') continue;
    if (typeof d.id !== 'string' || !d.id) continue;
    if (!Object.prototype.hasOwnProperty.call(TOOLS, d.tool)) continue;
    if (!Array.isArray(d.points)) continue;
    const points = d.points.filter(isPoint).map(p => ({ time: p.time, price: p.price }));
    if (!points.length) continue;
    const options = {};
    if (d.options && typeof d.options === 'object') {
      if (typeof d.options.color === 'string') options.color = d.options.color;
      if (typeof d.options.text === 'string') options.text = d.options.text;
    }
    out.push({ id: d.id, tool: d.tool, points, options });
  }
  return out;
}

// ---------- Hit test（純函式：toXY 由呼叫端提供座標轉換，方便單元測試） ----------

// 判斷 (x, y)（邏輯像素）是否點中該畫線；tolerancePx 預設 8px。
// toXY: ({ time, price }) => ({ x, y }) | null（點在可視範圍外時回傳 null）。
export function hitTest(drawing, x, y, toXY, tolerancePx = 8) {
  if (!drawing || !Array.isArray(drawing.points) || !drawing.points.length) return false;
  if (typeof toXY !== 'function') return false;
  const tol = Number.isFinite(tolerancePx) && tolerancePx >= 0 ? tolerancePx : 8;
  const pts = drawing.points.map(toXY);
  const distToSeg = (ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
  };
  const distToLine = (ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(x - ax, y - ay);
    return Math.abs((x - ax) * dy - (y - ay) * dx) / len;
  };
  switch (drawing.tool) {
    case 'horizontal': {
      if (!pts[0]) return false;
      return Math.abs(y - pts[0].y) <= tol;
    }
    case 'vertical': {
      if (!pts[0]) return false;
      return Math.abs(x - pts[0].x) <= tol;
    }
    case 'trend':
    case 'measure': {
      if (!pts[0] || !pts[1]) return false;
      return distToSeg(pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= tol;
    }
    case 'ray': {
      if (!pts[0] || !pts[1]) return false;
      // 射線：起點之後的半直線；投影落在起點之前時算到起點的距離。
      const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.hypot(x - pts[0].x, y - pts[0].y) <= tol;
      const t = ((x - pts[0].x) * dx + (y - pts[0].y) * dy) / len2;
      if (t < 0) return Math.hypot(x - pts[0].x, y - pts[0].y) <= tol;
      return distToLine(pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= tol;
    }
    case 'extended': {
      if (!pts[0] || !pts[1]) return false;
      return distToLine(pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= tol;
    }
    case 'channel': {
      if (!pts[0] || !pts[1]) return false;
      if (distToLine(pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= tol) return true;
      if (!pts[2]) return false;
      // 平行線：穿過 p2、與底線同斜率的直線。
      return distToLine(pts[2].x, pts[2].y, pts[2].x + (pts[1].x - pts[0].x), pts[2].y + (pts[1].y - pts[0].y)) <= tol;
    }
    case 'box': {
      if (!pts[0] || !pts[1]) return false;
      const x0 = Math.min(pts[0].x, pts[1].x) - tol, x1 = Math.max(pts[0].x, pts[1].x) + tol;
      const y0 = Math.min(pts[0].y, pts[1].y) - tol, y1 = Math.max(pts[0].y, pts[1].y) + tol;
      return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    }
    case 'fib': {
      if (!pts[0] || !pts[1]) return false;
      const x0 = Math.min(pts[0].x, pts[1].x) - tol, x1 = Math.max(pts[0].x, pts[1].x) + tol;
      if (x < x0 || x > x1) return false;
      return fibLevels(drawing.points[0], drawing.points[1])
        .some(lv => { const py = toXY({ time: drawing.points[0].time, price: lv.price }); return py && Math.abs(y - py.y) <= tol; });
    }
    case 'text': {
      if (!pts[0]) return false;
      return Math.hypot(x - pts[0].x, y - pts[0].y) <= Math.max(tol, 12);
    }
    default:
      return false;
  }
}

// ---------- 渲染：Lightweight Charts Primitive ----------

// LWC v5 的 draw target：useBitmapCoordinateSpace 內的座標是實體像素，
// 邏輯座標要乘上 horizontalPixelRatio／verticalPixelRatio（見 vendored bundle 的實作）。
class DrawingPaneRenderer {
  constructor() { this._drawing = null; this._selected = false; this._chart = null; this._series = null; }
  setRefs(chart, series) { this._chart = chart; this._series = series; }
  setDrawing(drawing, selected) { this._drawing = drawing; this._selected = !!selected; }

  draw(target) {
    const d = this._drawing;
    if (!d || !Array.isArray(d.points) || !d.points.length) return;
    const chart = this._chart, series = this._series;
    if (!chart || !series || typeof chart.timeScale !== 'function') return;
    const ts = chart.timeScale();
    if (!ts || typeof ts.timeToCoordinate !== 'function') return;
    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr }) => {
      const Wpx = ctx.canvas.width, Hpx = ctx.canvas.height;
      const X = t => { let c = null; try { c = ts.timeToCoordinate(t); } catch { /* 時間超出範圍 */ } return c == null ? null : c * hr; };
      const Y = p => { let c = null; try { c = series.priceToCoordinate(p); } catch { /* 價格超出範圍 */ } return c == null ? null : c * vr; };
      let range = null;
      try { const r = ts.getVisibleRange?.(); if (r && Number.isFinite(r.from) && Number.isFinite(r.to)) range = { from: Math.min(r.from, r.to), to: Math.max(r.from, r.to) }; } catch { /* 取不到可視範圍就用原始點 */ }
      const color = d.options?.color || DEFAULT_COLORS[d.tool] || '#2962ff';
      const selected = this._selected;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(1, hr) * (selected ? 2 : 1);
      ctx.lineCap = 'butt';
      const fontPx = Math.max(10, Math.round(11 * vr));
      ctx.font = `${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const line = (ax, ay, bx, by) => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
      const seg = (p, q) => {
        const ax = X(p.time), ay = Y(p.price), bx = X(q.time), by = Y(q.price);
        if (ax == null || ay == null || bx == null || by == null) return false;
        line(ax, ay, bx, by); return true;
      };
      const priceOnLine = (p0, p1, t) => p0.price + (p1.price - p0.price) * (t - p0.time) / (p1.time - p0.time);
      // 把線段裁到可視時間範圍內（端點在畫面外時 timeToCoordinate 回傳 null，直接畫會整條消失）。
      const clip = (p0, p1) => {
        if (p1.time === p0.time) return null;
        let a = p0.time, b = p1.time;
        if (range) {
          if (Math.max(a, b) < range.from || Math.min(a, b) > range.to) return null;
          a = Math.max(a, range.from); b = Math.min(b, range.to);
        }
        return [{ time: a, price: priceOnLine(p0, p1, a) }, { time: b, price: priceOnLine(p0, p1, b) }];
      };
      const clippedLine = (p0, p1) => { const c = clip(p0, p1); return c ? seg(c[0], c[1]) : false; };
      const extendedLine = (p0, p1) => {
        if (!range || p1.time === p0.time) return clippedLine(p0, p1);
        return seg(
          { time: range.from, price: priceOnLine(p0, p1, range.from) },
          { time: range.to, price: priceOnLine(p0, p1, range.to) },
        );
      };
      const labelBg = (text, lx, ly) => {
        const w = ctx.measureText(text).width, pad = 3 * hr, h = fontPx + 2 * pad;
        ctx.save();
        ctx.fillStyle = 'rgba(3,6,12,0.78)';
        ctx.fillRect(lx - pad, ly - h + pad, w + pad * 2, h);
        ctx.fillStyle = color;
        ctx.fillText(text, lx, ly);
        ctx.restore();
      };
      const [p0, p1, p2] = d.points;
      switch (d.tool) {
        case 'horizontal': {
          const y = Y(p0.price);
          if (y != null) line(0, y, Wpx, y);
          break;
        }
        case 'vertical': {
          const x = X(p0.time);
          if (x != null) line(x, 0, x, Hpx);
          break;
        }
        case 'trend':
          if (p1) clippedLine(p0, p1);
          break;
        case 'ray': {
          if (!p1 || p1.time === p0.time) break;
          const endT = range ? range.to : p1.time + Math.abs(p1.time - p0.time);
          clippedLine(p0, { time: endT, price: priceOnLine(p0, p1, endT) });
          break;
        }
        case 'extended':
          if (p1) extendedLine(p0, p1);
          break;
        case 'channel': {
          if (!p1) break;
          extendedLine(p0, p1);
          const off = channelOffset(p0, p1, p2 || p0);
          if (off != null && p2) {
            extendedLine(
              { time: p0.time, price: p0.price + off },
              { time: p1.time, price: p1.price + off },
            );
          }
          break;
        }
        case 'box': {
          if (!p1) break;
          const x0 = X(p0.time), x1 = X(p1.time), y0 = Y(p0.price), y1 = Y(p1.price);
          if (x0 == null || x1 == null || y0 == null || y1 == null) break;
          ctx.save();
          ctx.globalAlpha = 0.08;
          ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
          ctx.restore();
          ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
          break;
        }
        case 'fib': {
          if (!p1) break;
          let tLo = Math.min(p0.time, p1.time), tHi = Math.max(p0.time, p1.time);
          if (range) {
            if (tHi < range.from || tLo > range.to) break;
            tLo = Math.max(tLo, range.from); tHi = Math.min(tHi, range.to);
          }
          const x0 = X(tLo), x1 = X(tHi);
          if (x0 == null || x1 == null) break;
          for (const lv of fibLevels(p0, p1)) {
            const y = Y(lv.price);
            if (y == null) continue;
            line(x0, y, x1, y);
            const text = `${lv.label}%  ${lv.price.toFixed(2)}`;
            const tw = ctx.measureText(text).width;
            ctx.fillText(text, Math.max(0, Math.min(x1 - tw - 4 * hr, Wpx - tw)), y - 3 * vr);
          }
          break;
        }
        case 'text': {
          const x = X(p0.time), y = Y(p0.price);
          if (x == null || y == null) break;
          ctx.font = `${Math.max(12, Math.round(13 * vr))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillText(d.options?.text || '', x + 2 * hr, y - 2 * vr);
          break;
        }
        case 'measure': {
          if (!p1) break;
          seg(p0, p1);
          const st = measureStats(p0, p1);
          const mx = X(p0.time), my = Y(p0.price), nx = X(p1.time), ny = Y(p1.price);
          if (mx == null || my == null || nx == null || ny == null) break;
          const span = st.barsApprox != null ? `${st.barsApprox} 分鐘`
            : st.timeSpanSec < 86400 ? `${(st.timeSpanSec / 3600).toFixed(1)} 小時`
            : `${(st.timeSpanSec / 86400).toFixed(1)} 天`;
          const pct = st.pctChange == null ? '' : `（${st.pctChange >= 0 ? '+' : ''}${st.pctChange.toFixed(2)}%）`;
          const text = `Δ ${st.priceDiff >= 0 ? '+' : ''}${st.priceDiff.toFixed(2)} ${pct} · ${span}`;
          labelBg(text, (mx + nx) / 2 + 4 * hr, (my + ny) / 2 - 4 * vr);
          break;
        }
        default:
          break;
      }
      // 選取中的畫線：在每個端點畫白色小方塊把手。
      if (selected) {
        const s = 5 * hr;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        for (const p of d.points) {
          const x = X(p.time), y = Y(p.price);
          if (x == null || y == null) continue;
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
          ctx.strokeRect(x - s / 2, y - s / 2, s, s);
        }
        ctx.restore();
      }
      ctx.restore();
    });
  }
}

class DrawingPaneView {
  constructor(renderer) { this._renderer = renderer; }
  renderer() { return this._renderer; }
  zOrder() { return 'top'; }
}

// 一筆畫線一個 Primitive；ISeriesPrimitive 介面（LWC v5）。
class DrawingPrimitive {
  constructor(drawing, ctx) {
    this._drawing = drawing;
    this._ctx = ctx; // { chart, series }：chart 掛載時 attached() 不給 series，用建構子傳入的補上
    this._renderer = new DrawingPaneRenderer();
    this._renderer.setDrawing(drawing, false);
    this._view = new DrawingPaneView(this._renderer);
    this._chart = null; this._series = null; this._requestUpdate = null;
    this._unsubs = [];
  }
  attached(params) {
    this._chart = params.chart || this._ctx.chart;
    this._series = params.series || this._ctx.series;
    this._requestUpdate = typeof params.requestUpdate === 'function' ? params.requestUpdate : null;
    this._renderer.setRefs(this._chart, this._series);
    // 座標軸變化時重畫：可視範圍／價格軸尺寸改變都會觸發 requestUpdate。
    const req = () => { try { this._requestUpdate?.(); } catch { /* 已卸載 */ } };
    try {
      const ts = this._chart?.timeScale?.();
      if (ts && typeof ts.subscribeVisibleLogicalRangeChange === 'function') {
        const h = () => req();
        ts.subscribeVisibleLogicalRangeChange(h);
        this._unsubs.push(() => { try { ts.unsubscribeVisibleLogicalRangeChange?.(h); } catch { /* 已卸載 */ } });
      }
    } catch { /* 舊版沒有這個訂閱 */ }
    try {
      const ps = this._series?.priceScale?.();
      if (ps && typeof ps.subscribeSizeChange === 'function') {
        const h = () => req();
        ps.subscribeSizeChange(h);
        this._unsubs.push(() => { try { ps.unsubscribeSizeChange?.(h); } catch { /* 已卸載 */ } });
      }
    } catch { /* 舊版沒有這個訂閱 */ }
  }
  detached() {
    for (const u of this._unsubs) { try { u(); } catch { /* 已卸載 */ } }
    this._unsubs = [];
    this._chart = null; this._series = null; this._requestUpdate = null;
  }
  paneViews() { return [this._view]; }
  updateAllViews() { this._renderer.setDrawing(this._drawing, this._selected); }
  hitTest(x, y) {
    if (!this._chart || !this._series) return null;
    const toXY = p => {
      try {
        const cx = this._chart.timeScale().timeToCoordinate(p.time);
        const cy = this._series.priceToCoordinate(p.price);
        if (cx == null || cy == null) return null;
        return { x: cx, y: cy };
      } catch { return null; }
    };
    try { return hitTest(this._drawing, x, y, toXY) ? { externalId: this._drawing.id } : null; } catch { return null; }
  }
  updateDrawing(drawing, selected) {
    this._drawing = drawing;
    this._selected = !!selected;
    this._renderer.setDrawing(drawing, selected);
    try { this._requestUpdate?.(); } catch { /* 已卸載 */ }
  }
}

// ---------- Controller ----------

// LWC 的 time 可能是 epoch 秒（本專案的日 K 已換算過，見 numBars）、
// 'YYYY-MM-DD' 字串或 BusinessDay 物件；統一換成 epoch 秒。
function toEpochSeconds(time) {
  if (typeof time === 'number') return time;
  if (typeof time === 'string') { const ms = Date.parse(time.length === 10 ? `${time}T00:00:00+08:00` : time); return Number.isFinite(ms) ? Math.floor(ms / 1000) : null; }
  if (time && typeof time === 'object' && Number.isFinite(time.year)) {
    const ms = Date.parse(`${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}T00:00:00+08:00`);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }
  return null;
}

export function createDrawings({ chart, series, onChange, onTextRequest } = {}) {
  if (!chart || !series) throw new TypeError('createDrawings 需要 chart 與 series（主圖 K 線 series）');
  let tool = null;
  let pending = []; // 進行中、還沒湊滿點數的畫線
  let selectedId = null;
  let currentSymbol = null;
  let saveTimer = null;
  let drag = null;
  let suppressClick = false;
  let destroyed = false;
  const drawings = new Map(); // id -> drawing
  const primitives = new Map(); // id -> { prim, target }
  const el = typeof chart.chartElement === 'function' ? chart.chartElement() : null;

  const getDrawings = () => [...drawings.values()].map(d => ({
    id: d.id, tool: d.tool,
    points: d.points.map(p => ({ time: p.time, price: p.price })),
    options: { ...d.options },
  }));
  const emitChange = () => {
    if (typeof onChange !== 'function') return;
    try { onChange(getDrawings()); } catch { /* 整合端回呼出錯不拖垮畫線 */ }
  };
  const scheduleSave = () => {
    if (typeof setTimeout !== 'function' || !currentSymbol) return;
    if (saveTimer != null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; save(); }, 300);
  };
  const attachOne = d => {
    const prim = new DrawingPrimitive(d, { chart, series });
    const target = TOOLS[d.tool].paneSpanning ? chart : series;
    target.attachPrimitive(prim);
    primitives.set(d.id, { prim, target });
  };
  const detachOne = id => {
    const entry = primitives.get(id);
    if (!entry) return;
    try { entry.target.detachPrimitive(entry.prim); } catch { /* 已卸載 */ }
    primitives.delete(id);
  };
  const replaceAll = list => {
    for (const id of [...primitives.keys()]) detachOne(id);
    drawings.clear();
    selectedId = null;
    pending = [];
    for (const d of parseDrawings(list)) {
      drawings.set(d.id, d);
      try { attachOne(d); } catch { drawings.delete(d.id); }
    }
  };
  const refreshPrimitive = id => {
    const entry = primitives.get(id);
    if (entry) entry.prim.updateDrawing(drawings.get(id), id === selectedId);
  };
  const setSelected = id => {
    if (selectedId === id) return;
    const prev = selectedId;
    selectedId = id;
    if (prev) refreshPrimitive(prev);
    if (id) refreshPrimitive(id);
  };
  const toXY = p => {
    try {
      const cx = chart.timeScale().timeToCoordinate(p.time);
      const cy = series.priceToCoordinate(p.price);
      if (cx == null || cy == null) return null;
      return { x: cx, y: cy };
    } catch { return null; }
  };
  const findHit = (x, y) => {
    const list = [...drawings.values()].reverse(); // 後畫的在上層，先命中
    for (const d of list) {
      try { if (hitTest(d, x, y, toXY)) return d; } catch { /* 跳過 */ }
    }
    return null;
  };
  // LWC click param → { time, price }；點在資料區外（time／price 換不到）回傳 null。
  const clickToPoint = param => {
    if (!param || !param.point || !Number.isFinite(param.point.x) || !Number.isFinite(param.point.y)) return null;
    let time = param.time != null ? toEpochSeconds(param.time) : null;
    if (time == null) {
      try { time = toEpochSeconds(chart.timeScale().coordinateToTime(param.point.x)); } catch { time = null; }
    }
    let price = null;
    try { price = series.coordinateToPrice(param.point.y); } catch { price = null; }
    if (time == null || price == null || !Number.isFinite(time) || !Number.isFinite(price)) return null;
    return { time: Math.round(time), price };
  };
  const pixelFromEvent = e => {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pointFromPixel = (x, y) => {
    let time = null, price = null;
    try { time = toEpochSeconds(chart.timeScale().coordinateToTime(x)); } catch { /* 超出範圍 */ }
    try { price = series.coordinateToPrice(y); } catch { /* 超出範圍 */ }
    if (time == null || price == null || !Number.isFinite(time) || !Number.isFinite(price)) return null;
    return { time: Math.round(time), price };
  };

  function addDrawing(d) {
    const [valid] = parseDrawings([d]);
    if (!valid) return null;
    drawings.set(valid.id, valid);
    try { attachOne(valid); } catch { drawings.delete(valid.id); return null; }
    emitChange();
    scheduleSave();
    return valid;
  }
  function completePending() {
    const pts = pending.slice();
    const activeTool = tool;
    pending = [];
    const finish = text => {
      const options = text ? { text } : {};
      addDrawing({ id: newDrawingId(), tool: activeTool, points: pts, options });
      setTool(null); // 完成一筆後自動解除工具
    };
    if (activeTool === 'text') {
      const point = pts[0];
      if (typeof onTextRequest === 'function') {
        onTextRequest(point, text => { if (typeof text === 'string' && text) finish(text); });
      } else if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
        let text = '';
        try { text = window.prompt('輸入文字', '') || ''; } catch { text = ''; }
        if (text) finish(text);
      }
      return;
    }
    finish('');
  }
  function handleChartClick(param) {
    if (destroyed) return;
    if (suppressClick) { suppressClick = false; return; } // 拖曳結束後的那次 click 不處理
    const pt = clickToPoint(param);
    if (tool) {
      if (!pt) return; // 工具已選但點在資料區外：忽略，等下一個有效點擊
      pending.push(pt);
      if (pending.length >= pointsRequired(tool)) completePending();
      return;
    }
    if (!pt || !param?.point) { setSelected(null); return; }
    const hit = findHit(param.point.x, param.point.y);
    setSelected(hit ? hit.id : null);
  }
  function handleKeyDown(event) {
    if (destroyed || !event) return;
    if (event.key === 'Escape') {
      if (pending.length) pending = [];
      else if (selectedId) setSelected(null);
      else if (tool) setTool(null);
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
      removeDrawing(selectedId);
    }
  }
  function onMouseDown(e) {
    if (destroyed || tool || !selectedId) return;
    const pos = pixelFromEvent(e);
    if (!pos) return;
    const hit = findHit(pos.x, pos.y);
    if (!hit || hit.id !== selectedId) return; // 只拖曳已選取的那條線
    const start = pointFromPixel(pos.x, pos.y);
    if (!start) return;
    drag = { id: hit.id, start, snapshot: hit.points.map(p => ({ ...p })), moved: false, startX: pos.x, startY: pos.y };
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  }
  function onMouseMove(e) {
    if (!drag) return;
    const pos = pixelFromEvent(e);
    if (!pos) return;
    const cur = pointFromPixel(pos.x, pos.y);
    if (!cur) return;
    if (Math.abs(pos.x - drag.startX) > 3 || Math.abs(pos.y - drag.startY) > 3) drag.moved = true;
    const dt = cur.time - drag.start.time, dp = cur.price - drag.start.price;
    const d = drawings.get(drag.id);
    if (!d) return;
    d.points = drag.snapshot.map(p => ({ time: p.time + dt, price: p.price + dp }));
    refreshPrimitive(drag.id);
  }
  function onMouseUp() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    if (!drag) return;
    const wasDrag = drag.moved;
    drag = null;
    if (wasDrag) {
      suppressClick = true; // 拖曳放開後會接著觸發 click，不要讓它取消選取
      emitChange();
      scheduleSave();
    }
  }
  function setTool(next) {
    if (next != null && !Object.prototype.hasOwnProperty.call(TOOLS, next)) {
      throw new TypeError(`未知畫線工具：${next}`);
    }
    tool = next;
    pending = [];
    return tool;
  }
  function setDrawings(list) {
    replaceAll(list);
    emitChange();
    scheduleSave();
    return getDrawings();
  }
  function load(symbol) {
    if (typeof symbol === 'string' && symbol) currentSymbol = symbol;
    let raw = null;
    try {
      const key = storageKey(currentSymbol);
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch { raw = null; }
    const list = parseDrawings(raw);
    replaceAll(list); // 讀檔不觸發 onChange，避免讀回後又立刻寫回
    return getDrawings();
  }
  function save(symbol) {
    if (typeof symbol === 'string' && symbol) currentSymbol = symbol;
    if (!currentSymbol) return false;
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(currentSymbol), serializeDrawings(getDrawings()));
      return true;
    } catch { return false; }
  }
  function removeDrawing(id) {
    if (!drawings.has(id)) return false;
    detachOne(id);
    drawings.delete(id);
    if (selectedId === id) selectedId = null;
    emitChange();
    scheduleSave();
    return true;
  }
  function clear() {
    replaceAll([]);
    emitChange();
    scheduleSave();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (saveTimer != null) { clearTimeout(saveTimer); saveTimer = null; }
    try { if (typeof chart.unsubscribeClick === 'function') chart.unsubscribeClick(handleChartClick); } catch { /* 已卸載 */ }
    if (el) {
      try { el.removeEventListener('mousedown', onMouseDown); } catch { /* 已卸載 */ }
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    for (const id of [...primitives.keys()]) detachOne(id);
    drawings.clear();
    drag = null;
  }

  if (typeof chart.subscribeClick === 'function') {
    try { chart.subscribeClick(handleChartClick); } catch { /* 沒有 click 訂閱也可用 handleChartClick 手動接 */ }
  }
  if (el && typeof el.addEventListener === 'function') {
    try { el.addEventListener('mousedown', onMouseDown); } catch { /* 拖曳不可用，點選仍可用 */ }
  }

  return {
    setTool,
    getTool: () => tool,
    getDrawings,
    setDrawings,
    load,
    save,
    clear,
    destroy,
    handleChartClick,
    handleKeyDown,
    removeDrawing,
    getSelected: () => selectedId,
  };
}

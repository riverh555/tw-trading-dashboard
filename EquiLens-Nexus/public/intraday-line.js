// 個股即時走勢（分時線）面板 — Phase 5：即時看盤格子工作區的「個股分時」面板。
//
// 跟 TAIEX 迷你圖（public/watch.js 的 indexIntradaySVG）同一個畫法：價格折線＋
// 昨收虛線＋最後一價圓點與數值，只是畫的是「目前這檔個股」不是指數，另外
// 加上底部成交量柱（量刻度取第 97 百分位，跟 public/intraday.js 的 intradaySVG
// 一樣，避免 09:00 集合競價那一分鐘把刻度撐爆）。顏色一律取 CSS 變數
//（var(--up) / var(--down) / var(--soft) / var(--muted) / var(--line)），
// 深淺主題不用另外寫 CSS；沿用 hud.css 已有的 .ia-ax（軸文字）與 .wv-idxline。
//
// ── API（給整合者：掛進格子面板、接報價中心 quote store）──────────────────
//   intradayLineSVG(d, { w = 340, h = 150 } = {})
//     純函式、無 DOM：把 intradayReport 形狀的 d 畫成 SVG 字串。
//     d = { minutes: { m: [分鐘…], c: [收價…], v: [量…] },
//           ref: 昨收, open: 開盤分鐘（台股 540）, close: 收盤分鐘（台股 810） }
//     m 是「分鐘-of-day」（09:30＝570）；c、v 與 m 等長、由舊到新。
//     沒有分鐘資料或 ref <= 0 時回傳 `<div class="empty">…</div>` 佔位。
//
//   appendBar(minutes, bar)
//     純函式：把一根即時 1 分 K 併進 minutes，回傳「新的」minutes 物件，
//     不動原輸入。bar = [HH:MM, 開, 高, 低, 收, 量]（quote store 的 bar 事件
//     格式）。同一分鐘→更新該分鐘的收價與量；新分鐘→按時間順序插入。
//     minutes 上其他與 m 等長的陣列欄位（如 vwap、group）也會跟著對齊，
//     新分鐘補 null。bar 格式錯誤時原樣回傳輸入。
//
//   createIntradayLine({ el, throttleMs = 1000 })
//     掛載元件，回傳 { setData(d), onBar(bar), destroy() }。
//     el：要放 SVG 的容器元素（grid panel 裡的 div）。
//     setData(d)：初次載入，用 GET /api/watch 回來的 intradayReport
//       （{ minutes, ref, open, close }）整幅重畫；setData 之前收到的
//       onBar 會先暫存，setData 時一併併入。
//     onBar(bar)：接 quote store 的 bar 事件（{ id, bar } 裡的 bar，
//       格式同 appendBar 的 bar；只有目前這檔的 bar 才餵進來），
//       用 appendBar 併入後重畫；重畫節流為最多 1 秒一次
//       （throttleMs 可調，測試用），中間的 bar 會合併成一次重畫。
//     destroy()：清掉待執行的節流重畫（面板移除時呼叫）。
//
// ── 掛載範例（整合者參考）───────────────────────────────────────────────
//   import { createIntradayLine } from './intraday-line.js';
//   const line = createIntradayLine({ el: document.getElementById('wv-intraday-line') });
//   line.setData(await (await fetch(`/api/watch?id=${id}&period=1m`)).json());
//   quoteStore.on('bar', ({ id, bar }) => { if (id === currentId) line.onBar(bar); });
//   // 換股時：line.setData(新檔的 intradayReport)；移除面板時：line.destroy()。
// ────────────────────────────────────────────────────────────────────────

// 數字格式化（跟 public/insight-ui.js 的 fmt 同一行為；本模組不 import 它，
// 讓純函式在 node 測試裡零依賴）。
const fmt = (v, n = 0) => v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: n, minimumFractionDigits: n });
const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const pctOf = (x, ref) => x == null || !(ref > 0) ? '—' : `${x >= ref ? '+' : ''}${fmt((x / ref - 1) * 100, 2)}%`;
// 價格小數位：百元股 1 位、百元以下 2 位（跟 TAIEX 迷你圖一致）。
const px = v => fmt(v, v >= 100 ? 1 : 2);

// "HH:MM" → 分鐘-of-day；已是數字時當作分鐘直接用；解析失敗回傳 null。
function minuteOf(t) {
  if (typeof t === 'number' && Number.isFinite(t)) return Math.floor(t);
  if (typeof t === 'string') {
    const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
    if (m) return Number(m[1]) * 60 + Number(m[2]);
  }
  return null;
}

// 個股分時線：價格折線＋昨收虛線＋最後一價＋底部量柱。
// 版面沿用 intradaySVG：左 44（價格軸）、右 50（漲跌幅軸）、價格區佔高約 74%，
// 下方留量區，中間 14px 間隔；x 軸固定開盤→收盤。
export function intradayLineSVG(d, { w = 340, h = 150 } = {}) {
  const M = d?.minutes, ref = d?.ref;
  if (!M?.m?.length || !(ref > 0)) return '<div class="empty">尚無當日走勢。</div>';
  const vals = (M.c || []).filter(v => v != null);
  if (!vals.length) return '<div class="empty">尚無當日走勢。</div>';
  const L = 44, R = 50, T = 8, gap = 14, hp = Math.round((h - T - 18) * 0.74), hv = h - T - 18 - hp - gap, x0 = L, x1 = w - R;
  const open = d.open ?? 540, close = d.close ?? 810, span = close - open || 1;
  const xOf = m => x0 + (Math.min(close, Math.max(open, m)) - open) / span * (x1 - x0);
  // y 軸以昨收為中心、上下對稱，至少留 1% 幅度，超出再放大 1.1 倍。
  const dev = Math.max(...vals.map(v => Math.abs(v - ref)), ref * 0.01) * 1.1;
  const yMax = ref + dev, yMin = ref - dev, yOf = v => T + (yMax - Math.min(yMax, Math.max(yMin, v))) / (yMax - yMin) * hp;
  const pts = M.m.map((m, i) => [xOf(m), yOf(M.c[i])]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts.at(-1)[0].toFixed(1)} ${yOf(ref).toFixed(1)} L${pts[0][0].toFixed(1)} ${yOf(ref).toFixed(1)} Z`;
  const last = vals.at(-1), col = last >= ref ? 'var(--up)' : 'var(--down)';
  const soft = last >= ref ? 'var(--up-soft, rgba(255,77,103,.14))' : 'var(--down-soft, rgba(32,217,139,.14))';
  const [lx, ly] = pts.at(-1);
  // x 軸：每整點一格（09、10、11、12、13，涵蓋開盤與收盤小時）。
  const hours = []; for (let m = Math.ceil(open / 60) * 60; m <= close; m += 60) hours.push(m);
  const grid = hours.map(m => `<line x1="${xOf(m).toFixed(1)}" x2="${xOf(m).toFixed(1)}" y1="${T}" y2="${T + hp + gap + hv}" stroke="var(--line)" stroke-width="1"/><text x="${xOf(m).toFixed(1)}" y="${h - 3}" text-anchor="middle" class="ia-ax">${String(m / 60).padStart(2, '0')}</text>`).join('');
  // y 軸：上／昨收／下三檔，左邊價格、右邊對昨收漲跌幅。
  const yLab = [[yMax, 'up'], [ref, ''], [yMin, 'down']].map(([v, c]) => `<text x="${L - 4}" y="${(yOf(v) + 4).toFixed(1)}" text-anchor="end" class="ia-ax ${c}">${px(v)}</text><text x="${x1 + 4}" y="${(yOf(v) + 4).toFixed(1)}" class="ia-ax ${c}">${pctOf(v, ref)}</text>`).join('');
  // 量柱：刻度取第 97 百分位 ×1.15（開盤集合競價那一分鐘常是其他分鐘的數十倍，超出的部分截頂）。
  const vols = (M.v || []).filter(v => v != null);
  const vs = vols.slice().sort((a, b) => a - b), vmax = Math.max(1, (vs[Math.floor((vs.length - 1) * 0.97)] ?? 0) * 1.15);
  const bw = Math.max(1, (x1 - x0) / span - 0.4), vy = T + hp + gap;
  const bars = M.m.map((m, i) => {
    const bh = Math.min(1, (M.v?.[i] ?? 0) / vmax) * hv;
    return bh > 0 ? `<rect x="${(xOf(m) - bw / 2).toFixed(1)}" y="${(vy + hv - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${i && M.c[i] < M.c[i - 1] ? 'var(--down)' : 'var(--up)'}" opacity=".55"/>` : '';
  }).join('');
  return `<svg class="wv-idxline" viewBox="0 0 ${w} ${h}" role="img" aria-label="個股當日走勢">
    ${grid}<line x1="${x0}" x2="${x1}" y1="${yOf(ref).toFixed(1)}" y2="${yOf(ref).toFixed(1)}" stroke="var(--soft)" stroke-dasharray="3 3"/>${yLab}
    <path d="${area}" fill="${soft}"/><polyline points="${line}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${col}"/>
    <text x="${x1 + 4}" y="${(yOf(last) + 4).toFixed(1)}" class="ia-ax ${last >= ref ? 'up' : 'down'}">${px(last)}</text>${bars}
  </svg>`;
}

// 把一根即時 1 分 K 併進 minutes：同一分鐘更新收價與量，新分鐘按時間插入。
// 回傳新物件，不動原輸入。
export function appendBar(minutes, bar) {
  if (!Array.isArray(bar) || bar.length < 6) return minutes;
  const mm = minuteOf(bar[0]), close = Number(bar[4]), volume = Number(bar[5]);
  if (mm == null || !Number.isFinite(close) || !Number.isFinite(volume)) return minutes;
  const m = [...(minutes?.m || [])], c = [...(minutes?.c || [])], v = [...(minutes?.v || [])];
  const at = m.indexOf(mm);
  if (at >= 0) { c[at] = close; v[at] = volume; }
  else {
    let ins = m.findIndex(x => x > mm); if (ins < 0) ins = m.length;
    m.splice(ins, 0, mm); c.splice(ins, 0, close); v.splice(ins, 0, volume);
  }
  const out = { ...(minutes || {}), m, c, v };
  // 其他與 m 等長的陣列欄位（vwap、group…）跟著對齊：新分鐘補 null。
  for (const k of Object.keys(minutes || {})) {
    if (k === 'm' || k === 'c' || k === 'v' || !Array.isArray(minutes[k])) continue;
    const arr = [...minutes[k]];
    if (at < 0) { let ins = m.indexOf(mm); arr.splice(ins, 0, null); }
    out[k] = arr;
  }
  return out;
}

// 掛載元件：setData 畫整幅，onBar 接即時 bar（節流重畫），destroy 清節流計時。
export function createIntradayLine({ el, throttleMs = 1000 } = {}) {
  if (!el) throw new Error('createIntradayLine: 需要 el（容器元素）');
  let data = null, pending = [], lastRender = 0, timer = null;
  const render = () => { lastRender = Date.now(); timer = null; el.innerHTML = intradayLineSVG(data); };
  return {
    setData(d) {
      data = d;
      for (const bar of pending) data = { ...data, minutes: appendBar(data?.minutes, bar) };
      pending = [];
      if (timer) { clearTimeout(timer); timer = null; }
      render();
    },
    onBar(bar) {
      if (!data) { pending.push(bar); return; } // 還沒拿到 /api/watch：先暫存
      data = { ...data, minutes: appendBar(data.minutes, bar) };
      const wait = throttleMs - (Date.now() - lastRender);
      if (wait <= 0) render();
      else if (!timer) timer = setTimeout(render, wait);
    },
    destroy() { if (timer) { clearTimeout(timer); timer = null; } },
  };
}

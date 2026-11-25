// 圖例數值：從目錄指標的 calculate 結果取每個 plot 的最後一個有限值，給圖內圖例顯示。
// 純函式（不依賴 DOM 或 Lightweight Charts），照 lightweight-charts-indicators 的 plotVisible 規則決定顯示與否，
// 只有一點不同：display 'data_window'／'status_line' 的 plot 在圖上不畫、但在圖例（狀態列）要顯示。
import { formatLegendValue } from './candle-chart.js';

// entry.plotConfig：[{id, title, color, display, visible}]；result.plots：{plotId: [{time, value, color?}]}；
// result.visibility：{inputName: bool}；inputs：該指標目前的參數（plotVisible 用它判斷具名開關）。
export function studyLegendValues(entry, result, inputs = {}) {
  const out = [];
  for (const def of entry?.plotConfig || []) {
    if (def.display === 'none') continue;
    let visible;
    if (def.visible === undefined || typeof def.visible === 'boolean') visible = def.visible ?? true;
    else if (inputs[def.visible] !== undefined) visible = Boolean(inputs[def.visible]);
    else if (result?.visibility?.[def.visible] !== undefined) visible = Boolean(result.visibility[def.visible]);
    else visible = (result?.plots?.[def.id] ?? []).some(p => p.value != null && !Number.isNaN(p.value));
    if (!visible) continue;
    const pts = result?.plots?.[def.id];
    if (!pts?.length) continue;
    let tail = null;
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      if (p && typeof p.value === 'number' && Number.isFinite(p.value)) { tail = p; break; }
    }
    if (!tail) continue;
    out.push({ text: `${def.title ?? def.id} ${formatLegendValue(tail.value)}`, color: tail.color ?? def.color ?? '#2962FF' });
  }
  return out;
}

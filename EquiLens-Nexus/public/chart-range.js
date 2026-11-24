// 即時看盤主圖：初始可見範圍的純計算，不碰 DOM，方便單元測試。
// Lightweight Charts 預設從第 0 根開始顯示，第一根 K 線容易貼在左緣被切掉；
// 左邊留幾根空白，第一根完整顯示，錨定在左側的表格也不會超出圖表左緣。
export const LEFT_PAD_BARS = 5;
export function initialVisibleRange(barCount, padBars = LEFT_PAD_BARS) {
  if (!Number.isFinite(barCount) || barCount <= 0) return null;
  const from = -padBars;
  return { from: from === 0 ? 0 : from, to: barCount - 1 }; // -0 視為 0，避免 deepStrictEqual 失敗
}

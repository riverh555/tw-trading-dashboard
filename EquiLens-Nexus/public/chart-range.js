// 即時看盤主圖：初始可見範圍的純計算（不碰 DOM，方便單元測試）。
// Lightweight Charts 預設從第 0 根開始顯示，第一根 K 線的中心貼在左緣、左半被切掉；
// 左邊留幾根 K 線的空白，第一根才完整顯示，錨在第一根的指標表格也有地方放。
export const LEFT_PAD_BARS = 5;
export function initialVisibleRange(barCount, padBars = LEFT_PAD_BARS) {
  if (!Number.isFinite(barCount) || barCount <= 0) return null;
  const from = -padBars;
  return { from: from === 0 ? 0 : from, to: barCount - 1 }; // -0 正規化為 0，避免 deepStrictEqual 失敗
}

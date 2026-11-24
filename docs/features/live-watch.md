# 即時看盤

在 MARKET 區用終端機式版面盯自選股的即時行情：K 線、五檔、成交明細與加權指數一次看。**僅供看盤，不下單**；也沒有下單介面或帳號連線。

## 在哪裡

電腦版左側 **MARKET → 即時看盤**。加入後自選股與研究族群資料沿用衡析原有的清單，不需要另外建立商品。

## 怎麼用／內容

版面分為三塊：

| 區塊 | 內容 |
|---|---|
| 上方自選橫條 | 依代碼或名稱篩選、選擇自訂族群（或「未分組」）；每檔顯示名稱、代號、最新價、漲跌幅與迷你走勢圖，點一下切換下方圖表個股 |
| 左側主圖 | 個股 K 線：1 分／3 分／5 分／15 分／60 分／日 K；均線（MA5／MA20）、成交量、MACD 可各自開關；游標移過顯示該根 K 線的開高低收 |
| 右側三欄 | 加權指數當日走勢（1 分線，含昨收基準線；沒有分時資料時退回日 K）、五檔報價、成交明細（時間｜買進價｜賣出價｜成交價｜單量；成交價依外盤紅、內盤綠上色） |

預設個股是自選清單的第一檔，沒有自選時用 `3406`；週期預設 5 分 K。週期、族群與各項開關存在瀏覽器本機（localStorage），下次開啟沿用。

## 運作方式

- 後端 `/api/watch?id=<代號>&period=<週期>` 一次回傳個股當日走勢、指定週期 K 線、五檔、成交明細與加權指數報價／日 K；五檔與成交明細沿用盤中雷達的同一份現場資料。
- `/api/chart` 由原本只支援日 K／5 分 K 擴充為 1m／3m／5m／15m／60m／day（非法值退回 5m）。3 分 K 由 1 分 K 合成；15 分以內取最近 3 個交易日，60 分取 10 個交易日，足夠計算 MA20。
- 盤中每 3 秒更新報價、五檔、成交明細與最後一根 K 棒；自選橫條每 10 秒更新。頁面不在前景或休市時不輪詢。
- 圖表由 Lightweight Charts 5.3.0（Apache-2.0）繪製，均線與 MACD 由 lightweight-charts-indicators 0.26.4（MIT）計算，搭配 oakscriptjs 0.19.0（MIT）與 fancy-canvas 2.1.0（MIT）；以 ESM importmap 載入，模組檔放在 `public/vendor/`，不連外部 CDN。伺服器的 Content Security Policy 以 importmap 內容 hash 允許這段必要的 inline script，不放寬 `unsafe-inline`。

## 設定

- 第一次使用（或換電腦、重新 clone 後）在 `EquiLens-Nexus/` 執行一次 `node tools/fetch-vendor.mjs`（或 `npm run fetch-vendor`），由 npm 下載並驗證上述鎖定版本的檔案。
- `public/vendor/` 不進版控（見 `EquiLens-Nexus/.gitignore`）；未下載時本頁 K 線區會顯示提示，其他功能不受影響。
- 即時報價來源沿用「資料與設定 → 資料來源」的盤中快照能力（富果、Twelve Data 或台新證券 Nova API 等）；沒有可用的盤中資料源時，五檔與成交明細可能為空。

## 資料來源與請求量

| 項目 | 來源 | 頻率 |
|---|---|---|
| 個股即時報價、五檔、成交明細 | 現有的盤中快照／WebSocket 資料源（見[資料來源與設定](settings.md)） | 盤中每 3 秒 |
| 自選橫條報價與迷你走勢 | `/api/board?group=watch` | 每 10 秒 |
| 分 K | 本機快取的 1 分 K／重建的 K 線；3 分由 1 分合成 | 隨輪詢更新 |
| 加權指數 | 現有的指數模組（當日 1 分走勢；沒有時退回日 K） | 隨輪詢更新 |

## 注意事項

- 僅看盤、不下單；畫面上的數字都是研究參考，不構成投資建議。
- 3 分 K 是當天由 1 分 K 合成，與券商終端機的定義可能略有差異。
- 圖表模組檔約 19 MB，第一次下載需要網路；版本鎖死以確保指標計算結果一致。

## 相關檔案

`EquiLens-Nexus/public/watch.js`、`public/index.html`（importmap）、`public/hud.css`（`.wv-*`）、`public/app.js`（頁面註冊）、`lib/candles.mjs`、`lib/daytrade.mjs`、`server.mjs`（`/api/watch`、`/api/chart` 與 vendor 靜態檔）、`tools/fetch-vendor.mjs`、`tests/candles.test.mjs`。

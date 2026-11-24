// 下載即時看盤的圖表元件：把 Lightweight Charts 等模組檔裝到 public/vendor/。
// 用法：node tools/fetch-vendor.mjs
// 套件版本鎖死（見 PINNED），由 npm 自行驗證完整性；重複執行安全，會先清掉舊檔再裝。
// 注意：public/vendor/ 不進版控（見 .gitignore），第一次套用 patch 或換電腦後都要跑一次；
// 未執行前看盤頁的 K 線區會顯示「圖表元件尚未下載」，其他功能不受影響。
// 授權：lightweight-charts 為 Apache-2.0（歸屬聲明見 public/vendor/NOTICE），
// 其餘三個為 MIT；fancy-canvas 的 npm 包內沒有附 LICENSE 檔，只有 package.json 寫 MIT。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'public', 'vendor');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// 鎖定版本（2026-11-24 自 npm 取得的版本；升級前請先在沙箱確認指標計算結果不變）
const PINNED = [
  { name: 'lightweight-charts', version: '5.3.0', license: 'Apache-2.0' },
  { name: 'lightweight-charts-indicators', version: '0.26.4', license: 'MIT' },
  { name: 'oakscriptjs', version: '0.19.0', license: 'MIT' },
  { name: 'fancy-canvas', version: '2.1.0', license: 'MIT' },
];

// 要從各套件複製的檔案（來源相對於 npm 安裝後的 node_modules/<套件>，目標相對於 public/vendor）
const FILES = [
  { pkg: 'lightweight-charts', from: 'dist/lightweight-charts.production.mjs', to: 'lightweight-charts/lightweight-charts.production.mjs' },
  { pkg: 'lightweight-charts-indicators', from: 'dist/index.mjs', to: 'lightweight-charts-indicators/index.mjs' },
  { pkg: 'lightweight-charts-indicators', from: 'dist/render.mjs', to: 'lightweight-charts-indicators/render.mjs' },
  { pkg: 'fancy-canvas', from: 'index.mjs', to: 'fancy-canvas/index.mjs' },
  { pkg: 'fancy-canvas', from: 'size.mjs', to: 'fancy-canvas/size.mjs' },
  { pkg: 'fancy-canvas', from: 'canvas-element-bitmap-size.mjs', to: 'fancy-canvas/canvas-element-bitmap-size.mjs' },
  { pkg: 'fancy-canvas', from: 'canvas-rendering-target.mjs', to: 'fancy-canvas/canvas-rendering-target.mjs' },
  { pkg: 'fancy-canvas', from: 'device-pixel-ratio.mjs', to: 'fancy-canvas/device-pixel-ratio.mjs' },
];
// oakscriptjs 只有編譯後的 ESM 需要：dist/esm 下的 .js 全部複製（.d.ts／.map 不用）
const OAK_ESM = 'dist/esm';

// importmap 用到的六個檔案（public/index.html），裝完逐一檢查
const EXPECTED = [
  'lightweight-charts/lightweight-charts.production.mjs',
  'fancy-canvas/index.mjs',
  'lightweight-charts-indicators/index.mjs',
  'lightweight-charts-indicators/render.mjs',
  'oakscriptjs/index.js',
  'oakscriptjs/script/index.js',
];

const jsOnly = (s) => { try { return fs.statSync(s).isDirectory() || s.endsWith('.js'); } catch { return false; } };
const mb = (n) => (n / 1024 / 1024).toFixed(1);

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-vendor-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'tw-vendor-fetch', private: true }));
    const specs = PINNED.map((p) => `${p.name}@${p.version}`);
    console.log(`下載圖表元件（${specs.join('、')}）…`);
    await run(NPM, ['install', '--no-save', '--no-audit', '--no-fund', ...specs], { cwd: tmp, stdio: 'inherit' });
    const nm = path.join(tmp, 'node_modules');

    // 重新產生 vendor 目錄（重複執行安全）
    for (const p of PINNED) fs.rmSync(path.join(VENDOR, p.name), { recursive: true, force: true });
    for (const f of ['LICENSE-lightweight-charts', 'LICENSE-lightweight-charts-indicators', 'LICENSE-oakscriptjs', 'NOTICE']) fs.rmSync(path.join(VENDOR, f), { force: true });
    fs.mkdirSync(VENDOR, { recursive: true });

    for (const f of FILES) {
      const src = path.join(nm, f.pkg, f.from), dst = path.join(VENDOR, f.to);
      if (!fs.existsSync(src)) throw new Error(`找不到 ${f.pkg} 的 ${f.from}（套件內容可能改版，請檢查後更新本檔）`);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
    fs.cpSync(path.join(nm, 'oakscriptjs', OAK_ESM), path.join(VENDOR, 'oakscriptjs'), { recursive: true, filter: jsOnly });
    for (const p of PINNED) {
      const lic = path.join(nm, p.name, 'LICENSE');
      if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(VENDOR, `LICENSE-${p.name}`));
    }
    fs.writeFileSync(path.join(VENDOR, 'NOTICE'), [
      'TradingView Lightweight Charts™',
      '',
      'Copyright (c) 2025 TradingView, Inc. https://www.tradingview.com/',
      '',
      '即時看盤的圖表元件（由 tools/fetch-vendor.mjs 下載，版本鎖死）：',
      ...PINNED.map((p) => `- ${p.name} ${p.version}（${p.license}）`),
      '',
    ].join('\n'));

    let total = 0;
    for (const rel of EXPECTED) {
      const p = path.join(VENDOR, rel);
      if (!fs.existsSync(p)) throw new Error(`裝完仍缺少 ${rel}`);
      total += fs.statSync(p).size;
      console.log(`  ${rel}（${mb(fs.statSync(p).size)} MB）`);
    }
    console.log(`done, files in public/vendor（共 ${mb(total)} MB）`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(`下載失敗：${e.message}\n請檢查網路後再執行一次 node tools/fetch-vendor.mjs。`); process.exit(1); });

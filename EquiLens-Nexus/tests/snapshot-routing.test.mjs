import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// 盤中即時報價路由：台新即時連線中就用台新，否則維持原來方式（排除台新）。
// 以暫存資料夾隔離設定，並覆寫 provider 的 isLive/snapshot 來模擬連線狀態（不連網）。
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'equilens-routing-test-'));
process.env.EQUITY_DATA_DIR = dir;
process.env.TAISHIN_PASSWORD = 'x';
process.env.FUGLE_API_KEY = 'x';

const { saveConfig, resetConfigCache } = await import('../lib/config.mjs');
const { data } = await import('../lib/providers/index.mjs');
const { default: taishin } = await import('../lib/providers/taishin.mjs');
const { default: fugle } = await import('../lib/providers/fugle.mjs');

const origTaishin = { isLive: taishin.isLive, snapshot: taishin.snapshot, warmup: taishin.warmup };
const origFugle = { snapshot: fugle.snapshot };

function setup(enabled = ['taishin', 'fugle']) {
  resetConfigCache();
  saveConfig({ providers: { enabled, prefer: {}, taishin: { personalId: 'A123456789', certPath: '/x.pfx' } } });
  taishin.isLive = origTaishin.isLive;
  taishin.snapshot = origTaishin.snapshot;
  taishin.warmup = async () => {};
  fugle.snapshot = origFugle.snapshot;
}

describe('snapshot routing (Taishin-first when live)', () => {
  before(() => setup());
  after(() => { taishin.isLive = origTaishin.isLive; taishin.snapshot = origTaishin.snapshot; taishin.warmup = origTaishin.warmup; fugle.snapshot = origFugle.snapshot; });

  it('台新即時連線中：用台新，mode 為 symbols', async () => {
    setup();
    taishin.isLive = () => true;
    taishin.snapshot = async () => [{ stock_id: '2330', source: 'taishin' }];
    fugle.snapshot = async () => [{ stock_id: '2330', source: 'fugle' }];
    const rows = await data.snapshot(['2330']);
    assert.equal(rows[0].source, 'taishin');
    assert.equal(data.snapshotMode(), 'symbols');
    assert.equal(data.source('snapshot'), 'taishin');
  });

  it('台新未連線：維持原來方式（富果），mode 為 market', async () => {
    setup();
    taishin.isLive = () => false;
    taishin.snapshot = async () => [{ stock_id: '2330', source: 'taishin' }];
    fugle.snapshot = async () => [{ stock_id: '2330', source: 'fugle' }];
    const rows = await data.snapshot(['2330']);
    assert.equal(rows[0].source, 'fugle');
    assert.equal(data.snapshotMode(), 'market');
    assert.equal(data.source('snapshot'), 'fugle');
  });

  it('台新連線中但快照失敗：退回富果，且台新只試一次（不重試）', async () => {
    setup();
    taishin.isLive = () => true;
    let calls = 0;
    taishin.snapshot = async () => { calls++; throw new Error('boom'); };
    fugle.snapshot = async () => [{ stock_id: '2330', source: 'fugle' }];
    const rows = await data.snapshot(['2330']);
    assert.equal(rows[0].source, 'fugle');
    assert.equal(calls, 1);
  });

  it('台新連線中但回空：退回富果', async () => {
    setup();
    taishin.isLive = () => true;
    taishin.snapshot = async () => [];
    fugle.snapshot = async () => [{ stock_id: '2330', source: 'fugle' }];
    const rows = await data.snapshot(['2330']);
    assert.equal(rows[0].source, 'fugle');
  });

  it('空代碼（全市場／指數）：不走台新，走原來方式', async () => {
    setup();
    taishin.isLive = () => true;
    taishin.snapshot = async () => [{ stock_id: '2330', source: 'taishin' }];
    fugle.snapshot = async () => [{ stock_id: '2330', source: 'fugle' }];
    const rows = await data.snapshot([]);
    assert.equal(rows[0].source, 'fugle');
  });

  it('只有台新一個來源：未連線時仍走台新（原來方式）', async () => {
    setup(['taishin']);
    taishin.isLive = () => false;
    taishin.snapshot = async () => [{ stock_id: '2330', source: 'taishin' }];
    const rows = await data.snapshot(['2330']);
    assert.equal(rows[0].source, 'taishin');
  });
});

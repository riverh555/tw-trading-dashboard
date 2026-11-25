import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tsMs, toSnapshot, errText, nativeErrText } from '../lib/providers/taishin.mjs';

// aggregates 範例格式見官方 WS 文件：欄位與 intraday/quote 相同，lastUpdated 為微秒
const agg = {
  date: '2023-05-29',
  symbol: '2330',
  openPrice: 560,
  highPrice: 565,
  lowPrice: 558,
  closePrice: 563,
  lastPrice: 563,
  change: 5,
  changePercent: 0.9,
  bids: [{ price: 562, size: 10 }],
  asks: [{ price: 563, size: 8 }],
  total: { tradeValue: 123456789, tradeVolume: 12345 },
  lastUpdated: 1685338200000000, // 微秒 → 2023-05-29 13:30:00（台北）
};

describe('tsMs', () => {
  it('微秒轉毫秒', () => assert.equal(tsMs(1685338200000000), 1685338200000));
  it('毫秒不變', () => assert.equal(tsMs(1685338200000), 1685338200000));
  it('秒轉毫秒', () => assert.equal(tsMs(1685338200), 1685338200000));
  it('無效值回 null', () => {
    assert.equal(tsMs(0), null);
    assert.equal(tsMs(null), null);
    assert.equal(tsMs('x'), null);
  });
});

describe('toSnapshot', () => {
  it('aggregates 轉快照：時間、價格、五檔、量額', () => {
    const row = toSnapshot('2330', agg);
    assert.equal(row.stock_id, '2330');
    assert.equal(row.date, '2023-05-29 13:30:00');
    assert.equal(row.open, 560);
    assert.equal(row.high, 565);
    assert.equal(row.low, 558);
    assert.equal(row.close, 563);
    assert.equal(row.change_price, 5);
    assert.equal(row.buy_price, 562);
    assert.equal(row.sell_price, 563);
    assert.equal(row.total_volume, 12.345);
    assert.equal(row.total_amount, 123456789);
  });
  it('沒有 lastPrice 時用 closePrice', () => {
    const row = toSnapshot('2330', { ...agg, lastPrice: undefined });
    assert.equal(row.close, 563);
  });
  it('沒有 lastUpdated 時用現在時間', () => {
    const row = toSnapshot('2330', { ...agg, lastUpdated: undefined });
    assert.match(row.date, /^202\d-\d\d-\d\d \d\d:\d\d:\d\d$/);
  });
  it('沒有五檔時買賣價為 null', () => {
    const row = toSnapshot('2330', { ...agg, bids: [], asks: [] });
    assert.equal(row.buy_price, null);
    assert.equal(row.sell_price, null);
  });
});

describe('errText', () => {
  it('{"code","message"} 攤平成 "代碼 訊息"', () => assert.equal(errText({ code: 'A00007', message: '尚未完成 API 簽署與認證' }), 'A00007 尚未完成 API 簽署與認證'));
  it('字串原樣回傳', () => assert.equal(errText('oops'), 'oops'));
  it('空值回 fallback', () => assert.equal(errText(null, 'fallback'), 'fallback'));
});

describe('nativeErrText', () => {
  it('原生錯誤的 code 屬性會一起顯示（實測 GenericFailure）', () => {
    const e = new Error('The cert file location my be wrong No such file or directory (os error 2)');
    e.code = 'GenericFailure';
    assert.equal(nativeErrText(e), 'GenericFailure：The cert file location my be wrong No such file or directory (os error 2)');
  });
  it('訊息是 {"code","message"} JSON 時解析', () => {
    const e = new Error('{"code":"01-010","message":"密碼錯誤1次"}');
    assert.equal(nativeErrText(e), '01-010 密碼錯誤1次');
  });
  it('一般訊息原樣回傳', () => {
    assert.equal(nativeErrText(new Error('plain')), 'plain');
  });
});

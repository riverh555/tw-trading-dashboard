import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_COLS,
  GRID_ROW_HEIGHT,
  GRID_GAP,
  MOBILE_BREAKPOINT,
  LAYOUT_KEY,
  DEFAULT_LAYOUT,
  createGridLayout,
  normalizeLayout,
  serialize,
  parseLayout,
  stackForMobile,
  defaultLayout,
  getLayoutForWidth,
} from '../public/grid.js';

// 注意：DOM 行為（拖曳／縮放／ResizeObserver）無法在 node 測試，
// 需由整合者在瀏覽器 live 驗證；此檔只測純版面計算。

test('grid: 預設版面符合 spec（candle 最大，右上 intraday／taiex，下方 book／trades）', () => {
  assert.equal(LAYOUT_KEY, 'nexus.watchGrid.v1');
  assert.equal(MOBILE_BREAKPOINT, 768);
  assert.equal(GRID_COLS, 12);
  assert.deepEqual(defaultLayout(), [
    { id: 'candle', x: 0, y: 0, w: 8, h: 4 },
    { id: 'intraday', x: 8, y: 0, w: 4, h: 2 },
    { id: 'taiex', x: 8, y: 2, w: 4, h: 2 },
    { id: 'book', x: 0, y: 4, w: 6, h: 3 },
    { id: 'trades', x: 6, y: 4, w: 6, h: 3 },
  ]);
  // defaultLayout 回傳深拷貝：改動不影響下一次呼叫與 DEFAULT_LAYOUT。
  const a = defaultLayout();
  a[0].w = 1;
  assert.equal(defaultLayout()[0].w, 8);
  assert.equal(DEFAULT_LAYOUT[0].w, 8);
});

test('grid: normalize 去重疊——碰撞的面板往下推，不重疊且保留原本順序意義', () => {
  const out = normalizeLayout([
    { id: 'a', x: 0, y: 0, w: 6, h: 2 },
    { id: 'b', x: 3, y: 0, w: 6, h: 2 }, // 與 a 重疊
    { id: 'c', x: 0, y: 2, w: 6, h: 2 }, // 原本在 a 下方
  ]);
  const byId = Object.fromEntries(out.map((p) => [p.id, p]));
  assert.equal(byId.a.y, 0);
  assert.equal(byId.b.y, 2); // 被 a 推到 a 下方
  assert.equal(byId.c.y, 4); // 再被 b 推下去
  // 任意兩面板皆不重疊
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const p = out[i], q = out[j];
      const overlap = p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y;
      assert.equal(overlap, false, `${p.id} 與 ${q.id} 仍重疊`);
    }
  }
});

test('grid: normalize 緊湊化——上方有空列就往上移', () => {
  const out = normalizeLayout([
    { id: 'a', x: 0, y: 5, w: 6, h: 2 },
    { id: 'b', x: 6, y: 5, w: 6, h: 3 },
  ]);
  assert.deepEqual(out.map((p) => [p.id, p.y]), [['a', 0], ['b', 0]]);
  // 有佔位的列不能穿越：b 在 a 下方時只能移到 a 正下方
  const out2 = normalizeLayout([
    { id: 'a', x: 0, y: 0, w: 12, h: 2 },
    { id: 'b', x: 0, y: 6, w: 6, h: 2 },
  ]);
  assert.equal(out2.find((p) => p.id === 'b').y, 2);
});

test('grid: normalize 夾在邊界內——超寬／超界／非法值', () => {
  const out = normalizeLayout([
    { id: 'wide', x: 0, y: 0, w: 99, h: 1 }, // w 夾到 cols
    { id: 'off', x: 11, y: 0, w: 4, h: 1 }, // x 夾到 cols - w
    { id: 'neg', x: -3, y: -2, w: 2, h: 1 }, // 負值夾到 0
    { id: 'zero', x: 0, y: 0, w: 0, h: 0 }, // w/h 至少 1
    { id: 'nan', x: 'a', y: undefined, w: NaN, h: null }, // 非數字補預設
  ]);
  const byId = Object.fromEntries(out.map((p) => [p.id, p]));
  assert.equal(byId.wide.w, 12);
  assert.equal(byId.off.x, 8);
  assert.equal(byId.neg.x, 0);
  assert.ok(byId.neg.y >= 0); // 與 wide 同列會被往下推，只保證不為負
  assert.equal(byId.zero.w, 1);
  assert.equal(byId.zero.h, 1);
  assert.equal(byId.nan.x, 0);
  assert.ok(byId.nan.y >= 0); // 與 wide 同列會被往下推，只保證不為負
  assert.equal(byId.nan.w, 1);
  assert.equal(byId.nan.h, 1);
  for (const p of out) assert.ok(p.x + p.w <= 12, `${p.id} 超出右界`);
});

test('grid: normalize 不改動輸入、保留額外欄位、重複 id 只留第一個', () => {
  const input = [
    { id: 'a', x: 0, y: 3, w: 4, h: 1, title: 'K 線' },
    { id: 'a', x: 0, y: 0, w: 4, h: 1 },
    { id: 'b', x: 0, y: 3, w: 4, h: 1 },
  ];
  const snapshot = JSON.stringify(input);
  const out = normalizeLayout(input);
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(out.length, 2);
  assert.equal(out.find((p) => p.id === 'a').title, 'K 線');
});

test('grid: serialize／parseLayout 來回一致', () => {
  const layout = defaultLayout();
  const raw = serialize(layout);
  assert.equal(typeof raw, 'string');
  assert.deepEqual(parseLayout(raw), layout);
  // 只保留 id/x/y/w/h：額外欄位不進 JSON
  assert.equal(JSON.parse(serialize([{ id: 'a', x: 0, y: 0, w: 1, h: 1, title: 'x' }]))[0].title, undefined);
  // 接受已解析的陣列
  assert.deepEqual(parseLayout(layout), layout);
});

test('grid: parseLayout 容忍損毀／不完整資料，永不丟錯', () => {
  for (const bad of [
    'not json', '{bad', '', '   ', null, undefined, 42, true,
    '{}', '[]', '[1, 2]', '[{"x":0}]', '[{"id":"a"}]',
    '[{"id":"a","x":"z","y":0,"w":1,"h":1}]', // 非數字座標
    '[{"id":123,"x":0,"y":0,"w":1,"h":1}]', // id 不是字串
  ]) {
    assert.equal(parseLayout(bad), null, `應回傳 null：${JSON.stringify(bad)}`);
  }
  // 部分合法：合法項目保留並整理，非法項目丟棄
  const partial = parseLayout(JSON.stringify([
    { id: 'a', x: 0, y: 0, w: 6, h: 2 },
    { id: 'b', x: 0, y: 0, w: 6, h: 2 }, // 與 a 重疊 → 往下推
    { nope: true },
    { id: 'a', x: 0, y: 9, w: 1, h: 1 }, // 重複 id → 丟棄
  ]));
  assert.deepEqual(partial.map((p) => [p.id, p.y]), [['a', 0], ['b', 2]]);
  // 數字字串也接受（緊湊化把單一面板推到 y=0）
  assert.deepEqual(
    parseLayout('[{"id":"a","x":"0","y":"1","w":"2","h":"3"}]'),
    [{ id: 'a', x: 0, y: 0, w: 2, h: 3 }],
  );
  // 超界值在 parse 後同樣被夾住
  assert.equal(parseLayout('[{"id":"a","x":10,"y":0,"w":6,"h":1}]')[0].x, 6);
});

test('grid: stackForMobile 單欄堆疊——依 y 再 x 排序，y 依高度接續', () => {
  const out = stackForMobile([
    { id: 'trades', x: 6, y: 4, w: 6, h: 3 },
    { id: 'book', x: 0, y: 4, w: 6, h: 3 },
    { id: 'taiex', x: 8, y: 2, w: 4, h: 2 },
    { id: 'intraday', x: 8, y: 0, w: 4, h: 2 },
    { id: 'candle', x: 0, y: 0, w: 8, h: 4 },
  ]);
  assert.deepEqual(
    out.map((p) => [p.id, p.x, p.y, p.w, p.h]),
    [
      ['candle', 0, 0, 12, 4],
      ['intraday', 0, 4, 12, 2],
      ['taiex', 0, 6, 12, 2],
      ['book', 0, 8, 12, 3],
      ['trades', 0, 11, 12, 3],
    ],
  );
  // 預設版面堆疊順序即 candle → intraday → taiex → book → trades
  assert.deepEqual(stackForMobile(defaultLayout()).map((p) => p.id),
    ['candle', 'intraday', 'taiex', 'book', 'trades']);
  assert.deepEqual(stackForMobile([]), []);
  assert.deepEqual(stackForMobile(null), []);
});

test('grid: getLayoutForWidth 以 768px 為界切換堆疊／桌面', () => {
  const layout = defaultLayout();
  assert.deepEqual(getLayoutForWidth(layout, 767).map((p) => p.id),
    ['candle', 'intraday', 'taiex', 'book', 'trades']);
  assert.equal(getLayoutForWidth(layout, 767)[0].w, 12);
  assert.deepEqual(getLayoutForWidth(layout, 768), layout);
  assert.deepEqual(getLayoutForWidth(layout, 1200), layout);
});

test('grid: createGridLayout 工廠綁定自訂 cols／rowHeight／gap', () => {
  const engine = createGridLayout({ cols: 6, rowHeight: 100, gap: 8 });
  assert.equal(engine.cols, 6);
  assert.equal(engine.rowHeight, 100);
  assert.equal(engine.gap, 8);
  // 6 欄下預設版面被夾到 6 欄內且去重疊
  const def = engine.defaultLayout();
  for (const p of def) assert.ok(p.x + p.w <= 6, `${p.id} 超出 6 欄`);
  assert.equal(engine.parse('[{"id":"a","x":5,"y":0,"w":4,"h":1}]')[0].x, 2);
  assert.deepEqual(engine.stackForMobile([{ id: 'a', x: 0, y: 0, w: 6, h: 1 }])[0].w, 6);
  // 像素換算：容器 640px、6 欄、gap 8 → 欄寬 100；x=1,w=2 → left 108、width 208
  assert.deepEqual(engine.rectFor({ x: 1, y: 2, w: 2, h: 3 }, 640),
    { left: 108, top: 216, width: 208, height: 316 });
  // 預設值與全域常數一致
  const d = createGridLayout();
  assert.equal(d.cols, GRID_COLS);
  assert.equal(d.rowHeight, GRID_ROW_HEIGHT);
  assert.equal(d.gap, GRID_GAP);
});

test('grid: serialize 非陣列時丟錯（parseLayout 才負責容錯）', () => {
  assert.throws(() => serialize(null), TypeError);
  assert.throws(() => serialize('[]'), TypeError);
});

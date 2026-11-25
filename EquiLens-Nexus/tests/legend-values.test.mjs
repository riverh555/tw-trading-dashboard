import test from 'node:test';
import assert from 'node:assert/strict';
import { studyLegendValues } from '../public/legend-values.js';

const entry = {
  plotConfig: [
    { id: 'plot0', title: 'DIF', color: '#2962ff' },
    { id: 'plot1', title: 'DEA', color: '#ff6d00' },
    { id: 'plot2', title: '柱', color: '#ff3d5a', display: 'none' },
    { id: 'plot3', title: '隱藏開關', color: '#888888', visible: 'showExtra' },
    { id: 'plot4', title: '資料窗', color: '#22e6ff', display: 'data_window' },
  ],
};
const result = {
  plots: {
    plot0: [{ time: 1, value: 1.2 }, { time: 2, value: null }, { time: 3, value: 1.5 }],
    plot1: [{ time: 1, value: 0.8 }, { time: 2, value: 0.9 }],
    plot2: [{ time: 1, value: 5 }],
    plot3: [{ time: 1, value: 7 }],
    plot4: [{ time: 1, value: 3.25 }],
  },
  visibility: {},
};

test('legend values: takes the last finite value per visible plot, skips display:none', () => {
  // 具名開關（visible: 'showExtra'）在 inputs 與 result.visibility 都沒給時，依 renderer 的規則退回「有資料就顯示」
  const vals = studyLegendValues(entry, result, {});
  assert.deepEqual(vals.map(v => v.text), ['DIF 1.50', 'DEA 0.90', '隱藏開關 7.00', '資料窗 3.25']);
  assert.equal(vals[0].color, '#2962ff');
});

test('legend values: named visibility input gates the plot', () => {
  assert.deepEqual(studyLegendValues(entry, result, { showExtra: true }).map(v => v.text),
    ['DIF 1.50', 'DEA 0.90', '隱藏開關 7.00', '資料窗 3.25']);
  assert.deepEqual(studyLegendValues(entry, result, { showExtra: false }).map(v => v.text),
    ['DIF 1.50', 'DEA 0.90', '資料窗 3.25']);
});

test('legend values: per-point color wins over the plot color; all-null plots are skipped', () => {
  const r = { plots: { plot0: [{ time: 1, value: 2, color: '#00ff00' }], plot1: [{ time: 1, value: null }] }, visibility: {} };
  const vals = studyLegendValues(entry, r, {});
  assert.deepEqual(vals, [{ text: 'DIF 2.00', color: '#00ff00' }]);
  assert.deepEqual(studyLegendValues(null, result, {}), []);
  assert.deepEqual(studyLegendValues(entry, null, {}), []);
});

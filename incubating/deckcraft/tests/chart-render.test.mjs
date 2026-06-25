import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderChart } from '../chart-render.mjs';

// 从 data-echarts 单引号属性里取出并解码 spec
function spec(html) {
  const m = html.match(/data-echarts='([^']*)'/);
  assert.ok(m, '应有 data-echarts 属性');
  const json = m[1].replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return JSON.parse(json);
}

test('发射 figure.dc-chart，spec 可被 JSON.parse', () => {
  const h = renderChart({ type: 'bar', title: '区域营收', categories: ['华北', '华东'], series: [{ name: '营收', values: [42, 100] }] });
  assert.ok(h.includes('class="dc-chart"') && h.includes('data-echarts='));
  const s = spec(h);
  assert.equal(s.type, 'bar');
  assert.equal(s.title, '区域营收');
  assert.deepEqual(s.categories, ['华北', '华东']);
  assert.equal(s.series[0].values[1], 100);
});

test('数值归一化：去千分位/百分号/货币符', () => {
  const s = spec(renderChart({ type: 'bar', categories: ['a', 'b', 'c'], series: [{ values: ['1,240', '41%', '￥50'] }] }));
  assert.deepEqual(s.series[0].values, [1240, 41, 50]);
});

test('非数字值 → 0，绝不产生 NaN', () => {
  const h = renderChart({ type: 'bar', categories: ['a', 'b'], series: [{ values: ['x', 50] }] });
  assert.ok(!h.includes('NaN'));
  assert.deepEqual(spec(h).series[0].values, [0, 50]);
});

test('支持多系列', () => {
  const s = spec(renderChart({ type: 'line', categories: ['1', '2'], series: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [3, 4] }] }));
  assert.equal(s.series.length, 2);
  assert.equal(s.series[1].name, 'B');
});

test('未知 type 回退 bar', () => assert.equal(spec(renderChart({ type: 'xxx', categories: ['a'], series: [{ values: [1] }] })).type, 'bar'));

test('容器内无脚本、无内联 SVG（渲染交给运行时 ECharts）', () => {
  const h = renderChart({ type: 'pie', categories: ['A', 'B'], series: [{ values: [3, 1] }] });
  assert.ok(!h.includes('<svg') && !h.includes('<script'));
});

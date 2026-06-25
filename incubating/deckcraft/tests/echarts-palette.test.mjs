import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from './helpers.mjs';

test('ECharts 调色板走 CSS 令牌单一源，不再硬编码 per-theme hex 字典', () => {
  const html = readTemplate();
  assert.ok(html.includes('function echartsPalette()'), '应有 echartsPalette() 令牌读取函数');
  assert.ok(!/const ECHARTS_THEMES\s*=/.test(html), '不应再有硬编码 ECHARTS_THEMES 字典');
  assert.ok(/echartsPalette\(\)\s*\{[\s\S]*?getPropertyValue/.test(html), 'echartsPalette 应用 getPropertyValue 读令牌');
  for (const tok of ['--accent', '--alt', '--amber', '--text-2', '--border-2', '--text', '--text-3', '--border']) {
    assert.ok(html.includes(`'${tok}'`), `echartsPalette 应读令牌 ${tok}（顺序无关）`);
  }
  assert.ok(/buildOption\(spec\)\s*\{/.test(html), 'buildOption 应只取 spec(不再传 themeKey)');
});

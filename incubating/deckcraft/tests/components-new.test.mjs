import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from './helpers.mjs';

test('.timeline / .steps 组件 CSS 存在', () => {
  const html = readTemplate();
  for (const sel of ['.timeline', '.timeline__item', '.timeline__label', '.timeline__content',
                     '.steps', '.steps__item', '.steps__n', '.steps__body']) {
    assert.ok(html.includes(sel), `缺组件 CSS: ${sel}`);
  }
});

test('.timeline / .steps 走主题令牌(无写死颜色)', () => {
  const html = readTemplate();
  assert.ok(/\.timeline__item::before[^}]*var\(--accent\)/s.test(html), 'timeline 圆点应走 var(--accent)');
  assert.ok(/\.steps__n[^}]*var\(--accent\)/s.test(html), 'steps 序号应走 var(--accent)');
  assert.ok(/\.steps__item[^}]*var\(--card-bg\)/s.test(html), 'steps 卡面应走 var(--card-bg)');
  // 两组件 CSS 段内不得出现 #hex 字面色
  const seg = html.slice(html.indexOf('.timeline {'), html.indexOf('/* 幕导航'));
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(seg), 'timeline/steps 段不得有写死十六进制色');
});

test('全局有序列表序号排除自带编号组件 .steps / .timeline（防双序号 / 圆点错位回归）', () => {
  const html = readTemplate();
  // .steps / .timeline 都是 <ol>，各自带编号（.steps__n 圆圈 / .timeline__item::before 圆点）。
  // 全局 `.slide ol > li::before { content: counter(dc) }` 若波及它们，会叠加出第二个序号、
  // 甚至以更高权重(0,1,3)压掉 .timeline 圆点 → 图钉错位。规则选择器必须显式排除这两类。
  const at = html.indexOf('content: counter(dc)');
  assert.ok(at > 0, '应存在渲染 counter(dc) 的有序列表序号规则');
  const brace = html.lastIndexOf('{', at);
  const prevEnd = html.lastIndexOf('}', brace);
  const selector = html.slice(prevEnd + 1, brace).trim();
  assert.ok(/:not\(\.steps\)/.test(selector) && /:not\(\.timeline\)/.test(selector),
    `counter(dc) 规则选择器须排除 .steps/.timeline（否则双序号），实际：${selector}`);
});

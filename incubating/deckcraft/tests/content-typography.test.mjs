import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from './helpers.mjs';
const tpl = readTemplate();

test('模板含内容排版选择器（列表 / 正文 / 卡内列表）', () => {
  for (const sel of ['.slide ul', '.slide li', '.slide ul ul', 'p.body', '.card li']) {
    assert.ok(tpl.includes(sel), `缺选择器: ${sel}`);
  }
});

test('列表 marker 用 var(--accent)、正文用 var(--text)，不硬编码颜色', () => {
  assert.ok(/\.slide ul > li::before[\s\S]{0,200}?background:\s*var\(--accent\)/.test(tpl),
    '列表 marker 应以 var(--accent) 着色');
  assert.ok(/p\.body\b[\s\S]{0,200}?color:\s*var\(--text\)/.test(tpl),
    'p.body 应以 var(--text) 着色');
});

test('内容排版段不含硬编码 hex 颜色（应全用主题令牌）', () => {
  const m = tpl.match(/\/\* CONTENT-TYPO-START \*\/[\s\S]*?\/\* CONTENT-TYPO-END \*\//);
  assert.ok(m, '应有 CONTENT-TYPO 标记包裹的内容排版段');
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(m[0]), '内容排版段不应出现硬编码 hex 颜色');
});

test('双栏列表能力存在（cols-2 走 columns 填满宽度）', () => {
  assert.ok(/\.slide ul\.cols-2[\s\S]{0,120}?columns:\s*2/.test(tpl),
    'ul.cols-2 应以 columns:2 排成双栏');
});

test('商务主题文字与 accent 不同色（回归：避免 text=accent 的单调）', () => {
  const m = tpl.match(/html\[data-theme='business'\]\s*\{[\s\S]*?\}/);
  assert.ok(m, '应有 business 主题块');
  const text = (m[0].match(/--text:\s*(#[0-9a-fA-F]{3,6})/) || [])[1];
  const accent = (m[0].match(/--accent:\s*(#[0-9a-fA-F]{3,6})/) || [])[1];
  assert.ok(text && accent, '应能读到 business 的 --text 与 --accent');
  assert.notEqual(text.toLowerCase(), accent.toLowerCase(),
    `business --text(${text}) 不应等于 --accent(${accent})——否则正文/标题/accent 同色单调`);
});

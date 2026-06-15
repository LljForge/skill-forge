import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate, extractThemeKeysFromCss } from './helpers.mjs';

test('readTemplate 返回非空 HTML 字符串', () => {
  const html = readTemplate();
  assert.ok(typeof html === 'string' && html.length > 500);
});

test('extractThemeKeysFromCss 能从 CSS 取出 data-theme key', () => {
  const keys = extractThemeKeysFromCss("html[data-theme='clean']{--bg:#fff} html[data-theme='fresh']{--bg:#f2faf6}");
  assert.deepEqual(keys.sort(), ['clean', 'fresh']);
});

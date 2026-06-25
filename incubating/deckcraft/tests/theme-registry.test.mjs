import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate, extractThemeKeysFromCss, extractThemeKeysFromMenu, extractThemeKeysFromAntiFlash } from './helpers.mjs';

const html = readTemplate();
const EXPECTED = ['clean', 'fresh', 'elegant', 'terminal', 'business', 'passion'];

test('CSS 主题块集合 == 期望集合', () =>
  assert.deepEqual(extractThemeKeysFromCss(html).sort(), [...EXPECTED].sort()));
test('切换器菜单顺序 == 期望顺序', () =>
  assert.deepEqual(extractThemeKeysFromMenu(html), EXPECTED));
test('防闪烁 THEMES 数组 == 期望顺序', () =>
  assert.deepEqual(extractThemeKeysFromAntiFlash(html), EXPECTED));
test('默认主题 clean 在数组首位', () =>
  assert.equal(extractThemeKeysFromAntiFlash(html)[0], 'clean'));

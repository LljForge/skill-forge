import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFixture } from './build-fixture.mjs';
import { appendTheme } from '../append-theme.mjs';
import { extractThemeKeysFromCss, extractThemeKeysFromMenu, extractThemeKeysFromAntiFlash } from './helpers.mjs';

const base = buildFixture();
const out = appendTheme(base, {
  key: 'custom-1', label: '我的紫', dot: '#7c3aed',
  vars: { '--bg':'#faf7ff','--text':'#2a1a4a','--text-2':'#6b5b8a','--accent':'#7c3aed','--alt':'#9333ea','--border':'#e6dcf7','--term-bg':'#f1e9ff' },
});

test('CSS 多出 custom-1', () => assert.ok(extractThemeKeysFromCss(out).includes('custom-1')));
test('菜单多出 custom-1', () => assert.ok(extractThemeKeysFromMenu(out).includes('custom-1')));
test('防闪烁数组多出 custom-1', () => assert.ok(extractThemeKeysFromAntiFlash(out).includes('custom-1')));
test('内容未变（section 数不变）', () => {
  const n = s => (s.match(/<section class="slide"/g) || []).length;
  assert.equal(n(out), n(base));
});

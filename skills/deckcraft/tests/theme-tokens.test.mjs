import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from './helpers.mjs';

const html = readTemplate();
const KEYS = ['clean', 'fresh', 'elegant', 'terminal', 'business', 'passion'];
const REQUIRED = ['--bg', '--text', '--text-2', '--accent', '--alt', '--border', '--term-bg'];

function blockOf(key) {
  const re = new RegExp(`html\\[data-theme=['"]${key}['"]\\]\\s*\\{([\\s\\S]*?)\\}`);
  const m = html.match(re);
  return m ? m[1] : null;
}

for (const key of KEYS) {
  test(`主题 ${key} 块存在且含全部契约令牌`, () => {
    const block = blockOf(key);
    assert.ok(block, `缺少 ${key} 主题块`);
    for (const tok of REQUIRED) assert.ok(block.includes(tok + ':'), `${key} 缺令牌 ${tok}`);
  });
}

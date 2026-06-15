import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from './helpers.mjs';

const html = readTemplate();
const MUST = [
  "[data-theme='elegant'] .lead::first-letter",   // 优雅·首字下沉
  "[data-theme='business'] .stage::before",        // 商务·留白（弱化网格）
  "[data-theme='passion'] .card",                  // 热情·硬投影卡
  "[data-theme='fresh'] .stage::after",            // 清新·光晕
];
for (const sel of MUST) {
  test(`含装饰选择器 ${sel}`, () => assert.ok(html.includes(sel), `缺 ${sel}`));
}

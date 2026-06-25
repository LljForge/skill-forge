import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFixture } from './build-fixture.mjs';

const out = buildFixture();
test('产出注入了 fixture 的 section.slide', () => assert.ok(out.includes('<section class="slide"')));
test('标题插槽已替换', () => assert.ok(!out.includes('<!-- DECKCRAFT_TITLE -->') && out.includes('<title>')));
test('幻灯片插槽已替换', () => assert.ok(!out.includes('<!-- DECKCRAFT_SLIDES -->')));
test('6 套主题块仍在', () => {
  for (const k of ['clean','fresh','elegant','terminal','business','passion'])
    assert.ok(out.includes(`data-theme='${k}'`));
});

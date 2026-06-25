import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTemplate } from './helpers.mjs';

const html = readTemplate();

for (const marker of [
  '<!-- DECKCRAFT_TITLE -->',
  '<!-- DECKCRAFT_SLIDES -->',
  '/* DECKCRAFT_CUSTOM_THEMES */',
  '<!-- DECKCRAFT_THEME_OPTIONS -->',
]) {
  test(`含插槽标记 ${marker}`, () => assert.ok(html.includes(marker)));
}

test('保留 stage 容器', () => assert.match(html, /<div class="stage" id="stage">/));
test('不再内联任何成品 section.slide（内容走插槽）', () =>
  assert.equal(html.includes('<section class="slide"'), false));
test('localStorage 键已改为 deckcraft-theme', () => {
  assert.ok(html.includes('deckcraft-theme'));
  assert.equal(html.includes('slides-theme'), false);
});

test('slide-body 图片有视口高度上限（防竖图溢出顶破页面）', () => {
  // 百分比 max-height 需祖先定高才生效；当图组嵌套在「图文混排 .cols」里
  // (.slide-body > .cols(文+图) > .cols(纯图) > img) 时中间层不定高，百分比链断裂
  // collapse 成 none，竖版手机截图便按宽度自然高顶破页面。直、嵌两条路径都须 vh 兜底。
  const direct = html.match(/\.slide-body img\s*\{([^}]*)\}/);
  assert.ok(direct, '应有 .slide-body img 规则');
  assert.match(direct[1], /max-height:\s*\d+vh/, '.slide-body img 的 max-height 须为视口单位(vh)');
  const strip = html.match(/:not\(:has\(> p\)\)\s*> img\s*\{([^}]*)\}/);
  assert.ok(strip, '应有图条 > img 规则');
  assert.match(strip[1], /max-height:\s*\d+vh/, '图条图片 max-height 须为视口单位(vh)，不得退回纯 100%');
});

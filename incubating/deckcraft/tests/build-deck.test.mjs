import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceSlots, inlineImages, resolveOutputPath, buildDeck } from '../build-deck.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync as wf } from 'node:fs';
import { tmpdir } from 'node:os';

const IMGDIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'img');
const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

const TPL = '<title><!-- DECKCRAFT_TITLE --></title><div class="stage" id="stage"><!-- DECKCRAFT_SLIDES --></div>';
test('replaceSlots 填入标题与 slides', () => {
  const out = replaceSlots(TPL, { title: '季度汇报', slides: '<section class="slide">x</section>' });
  assert.ok(out.includes('<title>季度汇报</title>') && out.includes('<section class="slide">x</section>'));
  assert.ok(!out.includes('<!-- DECKCRAFT_TITLE -->') && !out.includes('<!-- DECKCRAFT_SLIDES -->'));
});
test('replaceSlots 转义标题 HTML 元字符', () =>
  assert.ok(replaceSlots(TPL, { title: 'A & B <x>', slides: '' }).includes('<title>A &amp; B &lt;x&gt;</title>')));

test('inlineImages 本地 <img src>→data URI', () =>
  assert.match(inlineImages('<img src="pixel.png" alt="x">', IMGDIR), /<img src="data:image\/png;base64,[A-Za-z0-9+/=]+" alt="x">/));
test('inlineImages 不动 http/data', () => {
  const h = '<img src="https://e.com/a.png"><img src="data:image/png;base64,AAA">';
  assert.equal(inlineImages(h, IMGDIR), h);
});
test('inlineImages 缺文件原样保留', () =>
  assert.equal(inlineImages('<img src="missing.png">', IMGDIR), '<img src="missing.png">'));

test('用标题生成安全文件名', () => {
  const d = mkdtempSync(join(tmpdir(), 'dc-'));
  assert.equal(resolveOutputPath(d, '季度 业绩/报告'), join(d, '季度-业绩_报告.html'));
});
test('同名追加序号', () => {
  const d = mkdtempSync(join(tmpdir(), 'dc-'));
  wf(join(d, 'deck.html'), 'x');
  assert.equal(resolveOutputPath(d, 'deck'), join(d, 'deck-2.html'));
});
test('空标题回退 deck', () => {
  const d = mkdtempSync(join(tmpdir(), 'dc-'));
  assert.equal(resolveOutputPath(d, '   '), join(d, 'deck.html'));
});

test('buildDeck 灌装 + 内联图片 + 主题仍在', () => {
  const out = buildDeck({ templatePath: join(SKILL_DIR,'template.html'), title:'验收', slides:'<section class="slide"><img src="pixel.png"></section>', imageBaseDir: IMGDIR });
  assert.ok(out.includes('<title>验收</title>') && !out.includes('<!-- DECKCRAFT_SLIDES -->') && out.includes('data:image/png;base64,'));
  for (const k of ['clean','fresh','elegant','terminal','business','passion']) assert.ok(out.includes(`data-theme='${k}'`));
});

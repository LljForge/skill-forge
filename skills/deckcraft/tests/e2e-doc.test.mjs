import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDeck } from '../build-deck.mjs';
import { validateDeck } from '../validate-deck.mjs';
const HERE = dirname(fileURLToPath(import.meta.url)); const SKILL = join(HERE, '..');
test('sample-doc → slides → buildDeck → 良品', () => {
  const slides = readFileSync(join(HERE, 'fixtures', 'sample-doc.slides.html'), 'utf8');
  const deck = buildDeck({ templatePath: join(SKILL, 'template.html'), title: '2026 Q2 业务回顾', slides });
  const r = validateDeck(deck);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(r.sections >= 4);
  assert.ok(deck.includes('<title>2026 Q2 业务回顾</title>'));
});
test('sample-doc-rich → 厚 slides → buildDeck → 良品且含列表/正文', () => {
  const slides = readFileSync(join(HERE, 'fixtures', 'sample-doc-rich.slides.html'), 'utf8');
  const deck = buildDeck({ templatePath: join(SKILL, 'template.html'), title: 'AI 编程的工程化纪律', slides });
  const r = validateDeck(deck);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(r.sections >= 5, `期望 ≥5 页，实际 ${r.sections}`);
  assert.ok(/<li[ >]/.test(deck), '厚档应含 <li> 列表');
  assert.ok(/<ul>\s*<li[\s\S]*?<ul>/.test(deck), '厚档应含二级嵌套列表');
  assert.ok(/class="body"/.test(deck), '厚档应含 p.body 正文');
});

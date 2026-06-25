import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDeck } from '../validate-deck.mjs';
import { buildFixture } from './build-fixture.mjs';
test('阶段一 fixture 是良品', () => { const r = validateDeck(buildFixture()); assert.equal(r.ok, true, JSON.stringify(r.errors)); assert.ok(r.sections >= 1); });
test('未替换插槽报错', () => assert.equal(validateDeck('<!-- DECKCRAFT_SLIDES --><section class="slide"></section>').ok, false));
test('残留本地 <img> 报错', () => {
  const r = validateDeck(buildFixture().replace('</body>', '<img src="x.png"></body>'));
  assert.equal(r.ok, false); assert.ok(r.errors.some(e => e.includes('x.png')));
});
test('残留 mermaid 报错', () => {
  const r = validateDeck(buildFixture().replace('</body>', '<pre class="mermaid">flowchart LR</pre></body>'));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('mermaid')));
});
test('含图页缺 .slide-body 报错', () => {
  const deck = buildFixture().replace('</body>', '<section class="slide"><h2>图</h2><img src="data:image/png;base64,AAAA"></section></body>');
  const r = validateDeck(deck);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('slide-body')));
});
test('含图页有 .slide-body 通过', () => {
  const deck = buildFixture().replace('</body>', '<section class="slide"><h2>图</h2><div class="slide-body"><img src="data:image/png;base64,AAAA"></div></section></body>');
  const r = validateDeck(deck);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

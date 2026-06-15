import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readTemplate } from './helpers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export function buildFixture() {
  const tpl = readTemplate();
  const slides = readFileSync(join(HERE, 'fixtures', 'sample-slides.html'), 'utf8');
  return tpl
    .replace('<!-- DECKCRAFT_TITLE -->', 'deckcraft fixture deck')
    .replace('<!-- DECKCRAFT_SLIDES -->', slides);
}

// 直接运行时落盘，供浏览器打开
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(HERE, 'fixture-deck.html');
  writeFileSync(out, buildFixture(), 'utf8');
  console.log('wrote', out);
}

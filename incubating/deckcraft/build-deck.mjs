import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const MIME = { '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.avif':'image/avif' };
const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export function replaceSlots(template, { title, slides }) {
  return template.replaceAll('<!-- DECKCRAFT_TITLE -->', escapeHtml(title || 'deck')).replaceAll('<!-- DECKCRAFT_SLIDES -->', slides || '');
}
export function inlineImages(html, baseDir) {
  return html.replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/g, (tag, src) => {
    if (/^(https?:|data:)/i.test(src)) return tag;
    const file = join(baseDir, src);
    if (!existsSync(file)) return tag;
    const mime = MIME[extname(src).toLowerCase()] || 'application/octet-stream';
    const b64 = readFileSync(file).toString('base64');
    const dataUri = () => `src="data:${mime};base64,${b64}"`;
    return tag.replace(`src="${src}"`, dataUri).replace(`src='${src}'`, dataUri);
  });
}
export function resolveOutputPath(dir, title) {
  const safe = (title || '').trim().replace(/[\/\\:*?"<>|]+/g,'_').replace(/\s+/g,'-').slice(0,80).replace(/^[-_.]+|[-_.]+$/g,'') || 'deck';
  let p = join(dir, `${safe}.html`), n = 2;
  while (existsSync(p)) { p = join(dir, `${safe}-${n}.html`); n++; }
  return p;
}
export function buildDeck({ templatePath, slides, title, imageBaseDir }) {
  const tpl = readFileSync(templatePath, 'utf8');
  let html = replaceSlots(tpl, { title, slides });
  if (imageBaseDir) html = inlineImages(html, imageBaseDir);
  return html;
}
// realpathSync 把（可能经软链调用的）argv[1] 解析成真实路径，再与 import.meta.url 比对——
// 否则个人级软链部署（~/.claude/skills/deckcraft → 真实仓）下二者不等，CLI 块会被静默跳过。
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = {}; const argv = process.argv.slice(2);
  for (let i=0;i<argv.length;i++) if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i+1]; i++; }
  const slides = readFileSync(a.slides, 'utf8');
  const html = buildDeck({ templatePath: a.template, slides, title: a.title, imageBaseDir: a.images });
  const out = a.out || resolveOutputPath(a.dir || '.', a.title);
  writeFileSync(out, html, 'utf8'); console.log('wrote', out);
}

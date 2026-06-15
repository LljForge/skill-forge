const THEMES = ['clean','fresh','elegant','terminal','business','passion'];
export function validateDeck(html) {
  const errors = [];
  for (const m of ['<!-- DECKCRAFT_TITLE -->','<!-- DECKCRAFT_SLIDES -->']) if (html.includes(m)) errors.push(`未替换插槽: ${m}`);
  for (const k of THEMES) if (!html.includes(`data-theme='${k}'`)) errors.push(`缺主题: ${k}`);
  const sections = (html.match(/<section class="slide/g) || []).length;
  if (sections < 1) errors.push('没有任何 slide');
  const local = [...html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/g)].map(m=>m[1]).filter(s=>!/^(https?:|data:)/i.test(s));
  if (local.length) errors.push(`未内联本地图片: ${local.join(', ')}`);
  // 含图幻灯片必须把内容包进 .slide-body 定高弹性区，否则竖版截图会顶破页面、逼出滚动条。
  // 机制见 template.html 的 .slide-body：图片靠它按本页剩余空间 object-fit:contain 自适应缩放。
  const slideBlocks = html.match(/<section class="slide[\s\S]*?<\/section>/g) || [];
  const imgNoBody = slideBlocks.filter(s => /<img\b/.test(s) && !/\bslide-body\b/.test(s)).length;
  if (imgNoBody) errors.push(`${imgNoBody} 张含图幻灯片未用 .slide-body 包裹（图片需定高弹性区防溢出）`);
  if (/class=["']mermaid["']/.test(html)) errors.push('残留 mermaid（应改用 dc-graph 静态 SVG）');
  return { ok: errors.length===0, errors, sections };
}
import { fileURLToPath } from 'node:url';
import { readFileSync, realpathSync } from 'node:fs';
// 软链调用时 argv[1]（软链路径）≠ import.meta.url（真实路径），故先 realpathSync 归一，见 build-deck.mjs 同处注释。
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = validateDeck(readFileSync(process.argv[2], 'utf8'));
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1);
}

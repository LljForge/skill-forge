import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_PATH = join(HERE, '..', 'template.html');

export function readTemplate() {
  return readFileSync(TEMPLATE_PATH, 'utf8');
}

// 取所有 html[data-theme='KEY'] 里的 KEY（去重）。key 允许字母/数字/连字符（支持 custom-N）
export function extractThemeKeysFromCss(css) {
  const re = /html\[data-theme=['"]([a-z0-9-]+)['"]\]/g;
  const set = new Set();
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return [...set];
}

// 从切换器菜单按钮取 data-theme（按出现顺序，去重）
export function extractThemeKeysFromMenu(html) {
  const re = /class="skin__opt"[^>]*data-theme="([a-z0-9-]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

// 从防闪烁脚本取 THEMES 数组
export function extractThemeKeysFromAntiFlash(html) {
  const m = html.match(/var THEMES\s*=\s*\[([^\]]*)\]/);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
}

// 在产出 HTML 上追加一套自定义皮肤，三处同步注册。纯字符串操作，不改内容。
export function appendTheme(html, { key, label, dot, vars }) {
  const cssBlock =
    `html[data-theme='${key}'] {\n  ` +
    Object.entries(vars).map(([k, v]) => `${k}:${v};`).join(' ') +
    `\n}\n/* DECKCRAFT_CUSTOM_THEMES */`;
  const menuBtn =
    `<button class="skin__opt" data-theme="${key}"><span class="dot" style="background:${dot}"></span>${label}</button>\n    <!-- DECKCRAFT_THEME_OPTIONS -->`;

  let out = html
    .replace('/* DECKCRAFT_CUSTOM_THEMES */', cssBlock)
    .replace('<!-- DECKCRAFT_THEME_OPTIONS -->', menuBtn);

  // 防闪烁 THEMES 数组追加 key
  out = out.replace(/var THEMES\s*=\s*\[([^\]]*)\]/, (m, inner) =>
    `var THEMES = [${inner.replace(/\s+$/, '')}, '${key}']`);

  // 引擎内 THEME_KEYS 与 THEME_LABEL 同步（运行时切换器可见）
  out = out.replace(/const THEME_KEYS = \[([^\]]*)\]/, (m, inner) =>
    `const THEME_KEYS = [${inner}, '${key}']`);
  out = out.replace(/const THEME_LABEL = \{([^}]*)\}/, (m, inner) =>
    `const THEME_LABEL = {${inner}, '${key}':'${label}' }`);

  return out;
}

# deckcraft 自定义主题指南

自定义主题的完整循环：**描述风格 → 产出令牌 → 调用 `appendTheme` 注册 → 刷新验收 → 迭代**。

> 文中 `<SKILL>` 指代本 skill 所在目录的绝对路径（如 `~/.claude/skills/deckcraft`），`import` 时替换为真实路径。详见 `SKILL.md` 顶部「路径约定」。

整个过程**不重跑内容生成**，只修改已产出的 HTML 文件。

---

## 循环步骤

### 1. 描述风格

用自然语言描述目标视觉风格，例如：

> "午夜蓝 + 金色强调，商务正式感，暗底浅字"

### 2. 产出契约令牌

根据风格描述，产出一组 CSS 变量。**必填 7 个契约令牌**（`--bg --text --text-2 --accent --alt --border --term-bg`），缺一不可——每个的作用与对比度要求见 `themes.md`「契约令牌」节（单一权威源）。其余令牌（`--bg-alt`、`--bg-soft`、`--card-bg`、`--card-shadow`、`--term-text`、`--nav-bg`、`--grid-op`、`--kicker-h` 等）按需补充；未定义的会沿用 `:root` 或其他主题的值（不影响契约功能，视觉可能不完整）。

**可选装饰**：仅允许 CSS，**不得新增 DOM 节点**。装饰以 scoped 选择器 `[data-theme='<key>'] <element>` 的形式追加在 `vars` 外部（作为独立的 `<style>` 追加，或在调用 `appendTheme` 后手动 append）。例如：

```css
/* 首字下沉（仅纯 CSS，无新 DOM）*/
[data-theme='midnight'] .lead::first-letter {
  font-size: 2.8em;
  float: left;
  line-height: .8;
  padding: .05em .12em 0 0;
  color: var(--accent);
  font-weight: 900;
}
```

### 3. 调用 `appendTheme` 注册

使用 `append-theme.mjs` 导出的 `appendTheme(html, opts)` 函数，在**已产出文件**上三处同步注册。

**函数签名**：

```js
export function appendTheme(html, { key, label, dot, vars })
```

| 参数    | 类型     | 说明                                                  |
|---------|----------|-------------------------------------------------------|
| `html`  | `string` | 产出 HTML 文件的完整字符串内容                        |
| `key`   | `string` | 主题 key（仅小写字母和连字符，如 `custom-1`）        |
| `label` | `string` | 切换器中显示的中文名称，如 `午夜`                    |
| `dot`   | `string` | 切换器色点色值（CSS 颜色字符串，如 `#1a237e`）        |
| `vars`  | `object` | CSS 变量键值对，键含 `--`，值为 CSS 字符串            |

**返回值**：修改后的 HTML 字符串（原字符串不变，需写回文件）。

`appendTheme` 内部完成以下三处注册：

1. 在 `/* DECKCRAFT_CUSTOM_THEMES */` 注释前插入 `html[data-theme='<key>'] { … }` CSS 变量块（下次调用时注释仍保留，支持追加多套）。
2. 在 `<!-- DECKCRAFT_THEME_OPTIONS -->` 注释前插入 `.skin__opt` 按钮。
3. 将 `key` 追加到防闪烁脚本的 `var THEMES = […]` 数组，同时更新运行时引擎的 `THEME_KEYS` 与 `THEME_LABEL`。

**调用示例**（key 形如 `custom-1`）：

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { appendTheme } from '<SKILL>/append-theme.mjs';

const filePath = 'output/my-deck.html';
const html = readFileSync(filePath, 'utf8');

const updated = appendTheme(html, {
  key: 'custom-1',
  label: '午夜',
  dot: '#c8a44a',
  vars: {
    '--bg': '#0d1b2a',
    '--bg-alt': '#132236',
    '--bg-soft': '#1a2e44',
    '--text': '#e8dcc8',
    '--text-2': '#9aa4b2',
    '--text-3': '#6b7787',
    '--border': '#243548',
    '--border-2': '#2e4260',
    '--accent': '#c8a44a',
    '--alt': '#5b9bd5',
    '--amber': '#c8a44a',
    '--red': '#e05c5c',
    '--positive': '#4caf7d',
    '--positive-soft': 'rgba(76,175,125,.12)',
    '--positive-border': 'rgba(76,175,125,.35)',
    '--grid-op': '.2',
    '--glow-1': 'rgba(200,164,74,.08)',
    '--glow-2': 'rgba(91,155,213,.06)',
    '--card-bg': 'rgba(19,34,54,.9)',
    '--card-shadow': '0 16px 40px -20px rgba(0,0,0,.55)',
    '--term-bg': '#060e18',
    '--term-text': '#e8dcc8',
    '--term-c': '#6b7787',
    '--term-k': '#5b9bd5',
    '--term-g': '#4caf7d',
    '--term-p': '#e05c5c',
    '--term-shadow': '0 20px 50px -24px rgba(0,0,0,.6)',
    '--pill-to-bg': '#c8a44a',
    '--pill-to-fg': '#0d1b2a',
    '--pill-to-bd': '#c8a44a',
    '--nav-bg': '#132236',
    '--nav-shadow': 'none',
    '--kicker-h': '1px',
  },
});

writeFileSync(filePath, updated, 'utf8');
```

### 4. 刷新验证

用浏览器打开产出的 HTML 文件，按 **T** 键循环切换主题，或点击右上角切换器选择新主题，逐页验收：

- 底色、文字、边框对比度是否清晰
- `.kicker`、进度条、`.accent` 色是否统一
- `.card`、`.term`、`blockquote.quote` 在新主题下是否可读
- `.lead::first-letter` 等装饰是否按预期生效（如有）

### 5. 迭代

调整令牌值后重新调用 `appendTheme` 并写回文件（每次调用均基于上次产出的完整 HTML）；或直接在 HTML 文件中手动编辑 `html[data-theme='custom-1'] { … }` 块中的值后刷新浏览器。

---

## 约束与不变量

- **装饰只用 CSS，不新增 DOM**：自定义装饰通过 CSS 伪元素、`:first-letter`、`::before`/`::after` 等实现，不得向 `<div class="stage">` 或任何幻灯片内追加新 HTML 节点。
- **契约令牌必须全部定义**：7 个必填令牌（`--bg --text --text-2 --accent --alt --border --term-bg`）缺失会导致部分组件显示异常。
- **key 唯一且格式合法**：只使用小写字母和连字符（`[a-z][a-z0-9-]*`），避免与内置 6 个 key（`clean/fresh/elegant/terminal/business/passion`）重复。
- **不修改 `template.html`**：`appendTheme` 作用于产出文件（deckcraft 已生成的独立 HTML），不回写模板。
- **暗色主题**：若新主题是暗底，需在 CSS 中将 `--text` 设为浅色，但引擎不会自动添加 `.dark` 类（`.dark` 仅内置 `terminal` 触发）；若需要 `.dark` 驱动代码高亮，需在 `appendTheme` 调用后，手动修改防闪烁脚本和引擎内的 `DARK = ['terminal', '<key>']` / `DARK_THEMES` 数组。

# deckcraft 主题参考

## 主题一览

| key        | 中文名 | 色点     | 暗色 |
|------------|--------|----------|------|
| `clean`    | 简约   | `#2f6fe0` | —    |
| `fresh`    | 清新   | `#10a37f` | —    |
| `elegant`  | 优雅   | `#b0814e` | —    |
| `terminal` | 科技   | `#56d364` | ✓    |
| `business` | 商务   | `#283593` | —    |
| `passion`  | 热情   | `#dc2626` | —    |

**默认主题**：`clean`。  
**暗色主题**：仅 `terminal`（挂载 `.dark` 类，驱动代码高亮切换）。  
**localStorage key**：`deckcraft-theme`。

---

## 契约令牌

每套主题**必须**定义以下 7 个契约令牌，缺一不可：

| 令牌        | 作用                               |
|-------------|------------------------------------|
| `--bg`      | 页面底色                           |
| `--text`    | 主文字色（与 `--bg` 对比度须 ≥ 4.5:1）|
| `--text-2`  | 次级文字色（正文 `.lead`、卡片 `p`）|
| `--accent`  | 主强调色（链接、kicker、进度条）    |
| `--alt`     | 副强调色                           |
| `--border`  | 主边框色                           |
| `--term-bg` | 终端/代码块背景                    |

---

## 各主题完整令牌表

### clean · 简约（默认）

```css
html[data-theme='clean'] {
  --bg: #ffffff;
  --bg-alt: #f9fafb;
  --bg-soft: #f3f4f6;
  --text: #1f2328;
  --text-2: #5b6470;
  --text-3: #9ca3af;
  --border: #e5e7eb;
  --border-2: #d8dce2;
  --accent: #2f6fe0;
  --alt: #1a7f37;
  --amber: #9a6700;
  --red: #cf222e;
  --positive: #1a7f37;
  --positive-soft: rgba(26, 127, 55, .10);
  --positive-border: rgba(26, 127, 55, .35);
  --grid-op: .55;
  --glow-1: rgba(47, 111, 224, .07);
  --glow-2: rgba(26, 127, 55, .05);
  --card-bg: #ffffff;
  --card-shadow: 0 12px 30px -16px rgba(16, 24, 40, .16);
  --term-bg: #f3f4f6;
  --term-text: #1f2328;
  --term-c: #6b7280;
  --term-k: #0550ae;
  --term-g: #1a7f37;
  --term-p: #cf222e;
  --term-shadow: 0 18px 44px -22px rgba(16, 24, 40, .28);
  --pill-to-bg: #2f6fe0;
  --pill-to-fg: #ffffff;
  --pill-to-bd: #2f6fe0;
  --nav-bg: #ffffff;
  --nav-shadow: 0 2px 6px -2px rgba(16, 24, 40, .15);
  --kicker-h: 2px;
}
```

### fresh · 清新

```css
html[data-theme='fresh'] {
  --bg:#f2faf6; --bg-alt:#e9f6ef; --bg-soft:#e1f1e9;
  --text:#143329; --text-2:#4d6b60; --text-3:#8aa89c;
  --border:#cfe8dc; --border-2:#bfded0;
  --accent:#10a37f; --alt:#0e7490; --amber:#9a6700; --red:#cf222e;
  --positive:#10a37f; --positive-soft:rgba(16,163,127,.10); --positive-border:rgba(16,163,127,.35);
  --grid-op:.5; --glow-1:rgba(16,163,127,.08); --glow-2:rgba(52,211,153,.06);
  --card-bg:rgba(255,255,255,.80); --card-shadow:0 16px 30px -18px rgba(16,90,70,.45);
  --term-bg:#e7f4ee; --term-text:#143329; --term-c:#6b8c80; --term-k:#0e7490; --term-g:#10a37f; --term-p:#cf222e;
  --term-shadow:0 18px 40px -22px rgba(16,90,70,.4);
  --pill-to-bg:#10a37f; --pill-to-fg:#ffffff; --pill-to-bd:#10a37f;
  --nav-bg:#f2faf6; --nav-shadow:0 2px 6px -2px rgba(16,90,70,.18); --kicker-h:2px;
}
```

### elegant · 优雅

```css
html[data-theme='elegant'] {
  --bg:#faf6ee; --bg-alt:#f4ecdd; --bg-soft:#efe5d3;
  --text:#2c2620; --text-2:#6b5d4d; --text-3:#9c8d76;
  --border:#e3d7c4; --border-2:#d8c9b1;
  --accent:#b0814e; --alt:#8a6d44; --amber:#9a6700; --red:#a83232;
  --positive:#5f7d4f; --positive-soft:rgba(95,125,79,.12); --positive-border:rgba(95,125,79,.35);
  --grid-op:.4; --glow-1:rgba(176,129,78,.07); --glow-2:rgba(138,109,68,.05);
  --card-bg:#fffdf8; --card-shadow:0 14px 30px -18px rgba(120,90,40,.28);
  --term-bg:#f1e9da; --term-text:#2c2620; --term-c:#9c8d76; --term-k:#8a6d44; --term-g:#5f7d4f; --term-p:#a83232;
  --term-shadow:0 18px 40px -22px rgba(120,90,40,.3);
  --pill-to-bg:#b0814e; --pill-to-fg:#ffffff; --pill-to-bd:#b0814e;
  --nav-bg:#faf6ee; --nav-shadow:0 2px 6px -2px rgba(120,90,40,.2); --kicker-h:2px;
  --font-display:'Fraunces','Noto Serif SC',Georgia,serif;
}
```

> 注：`elegant` 额外覆盖 `--font-display` 为衬线字体族，其余主题不需要此令牌。

### terminal · 科技（暗色）

```css
html[data-theme='terminal'] {
  --bg: #0d1117;
  --bg-alt: #161b22;
  --bg-soft: #161b22;
  --text: #e6edf3;
  --text-2: #8b949e;
  --text-3: #6e7681;
  --border: #30363d;
  --border-2: #30363d;
  --accent: #56d364;
  --alt: #58a6ff;
  --amber: #d29922;
  --red: #ff7b72;
  --positive: #3fb950;
  --positive-soft: rgba(63, 185, 80, .14);
  --positive-border: rgba(63, 185, 80, .4);
  --grid-op: .13;
  --glow-1: rgba(63, 185, 80, .10);
  --glow-2: rgba(88, 166, 255, .08);
  --card-bg: linear-gradient(180deg, #161b22, rgba(22, 27, 34, .55));
  --card-shadow: 0 24px 60px -24px rgba(0, 0, 0, .7);
  --term-bg: #010409;
  --term-text: #e6edf3;
  --term-c: #6e7681;
  --term-k: #58a6ff;
  --term-g: #56d364;
  --term-p: #ff7b72;
  --term-shadow: 0 24px 60px -20px rgba(0, 0, 0, .7);
  --pill-to-bg: #3fb950;
  --pill-to-fg: #08160c;
  --pill-to-bd: #3fb950;
  --nav-bg: #161b22;
  --nav-shadow: none;
  --kicker-h: 1px;
}
```

> 暗色机制：切换到 `terminal` 时引擎同时在 `<html>` 上添加 `.dark` 类（供代码高亮使用），切换走时移除。

### business · 商务

```css
html[data-theme='business'] {
  --bg:#E8EAF6; --bg-alt:#eef0fb; --bg-soft:#e1e4f5;
  --text:#1e2547; --text-2:#5560a8; --text-3:#9197c4;
  --border:#d3d8f0; --border-2:#c5cae9;
  --accent:#3d5afe; --alt:#3949ab; --amber:#9a6700; --red:#cf222e;
  --positive:#2e7d32; --positive-soft:rgba(46,125,50,.10); --positive-border:rgba(46,125,50,.35);
  --grid-op:.5; --glow-1:rgba(40,53,147,.07); --glow-2:rgba(92,107,192,.06);
  --card-bg:rgba(255,255,255,.85); --card-shadow:0 12px 26px -16px rgba(40,53,147,.4);
  --term-bg:#eef0fb; --term-text:#283593; --term-c:#7782b8; --term-k:#3949ab; --term-g:#2e7d32; --term-p:#cf222e;
  --term-shadow:0 18px 40px -22px rgba(40,53,147,.35);
  --pill-to-bg:#283593; --pill-to-fg:#ffffff; --pill-to-bd:#283593;
  --nav-bg:#E8EAF6; --nav-shadow:0 2px 6px -2px rgba(40,53,147,.2); --kicker-h:2px;
}
```

### passion · 热情

```css
html[data-theme='passion'] {
  --bg:#fff5f2; --bg-alt:#ffece5; --bg-soft:#ffe3d9;
  --text:#3a1410; --text-2:#7a5345; --text-3:#a98575;
  --border:#f4dac8; --border-2:#efcab3;
  --accent:#dc2626; --alt:#ea580c; --amber:#b45309; --red:#b91c1c;
  --positive:#15803d; --positive-soft:rgba(21,128,61,.10); --positive-border:rgba(21,128,61,.35);
  --grid-op:.5; --glow-1:rgba(220,38,38,.08); --glow-2:rgba(234,88,12,.06);
  --card-bg:#ffffff; --card-shadow:0 12px 26px -16px rgba(180,70,10,.3);
  --term-bg:#fdeee7; --term-text:#3a1410; --term-c:#a98575; --term-k:#b91c1c; --term-g:#15803d; --term-p:#dc2626;
  --term-shadow:0 18px 40px -22px rgba(180,70,10,.35);
  --pill-to-bg:#dc2626; --pill-to-fg:#ffffff; --pill-to-bd:#dc2626;
  --nav-bg:#fff5f2; --nav-shadow:0 2px 6px -2px rgba(180,70,10,.2); --kicker-h:2px;
}
```

---

## 装饰（scoped CSS，不改 DOM）

装饰是少量 scoped CSS，附在 `<style>` 末尾，**仅通过 CSS 选择器作用于特定主题**，不新增任何 DOM 节点：

| 主题       | 装饰内容                                                                                                  |
|------------|-----------------------------------------------------------------------------------------------------------|
| `elegant`  | `[data-theme='elegant'] .lead::first-letter` 首字下沉（`font-size:2.8em`，浮左，`color:var(--accent)`）；`h2` 切换为衬线字体（`--font-display`）|
| `fresh`    | `[data-theme='fresh'] .stage::after` 覆写辉光渐变，添加右上角 + 左下角双向柔光层；内置图悬浮面板（见下）   |
| `business` | `[data-theme='business'] .stage::before` 将背景网格透明度减半（`opacity:calc(var(--grid-op) * .5)`），留更干净负空间；内置图悬浮面板（见下） |
| `passion`  | `[data-theme='passion'] .card` 硬投影：`box-shadow:5px 5px 0 var(--accent)`，边框色改为 `var(--text)`；内置图悬浮面板（见下） |
| `terminal` | 暗色来自 `.dark` 类 + `--term-*` 令牌组；`.dark` 触发代码高亮配色切换                                    |
| `clean`    | 无额外装饰                                                                                                |

> **内置图悬浮面板（`fresh` / `business` / `passion`）**：这三套页面底色偏浅、低饱和，`.dc-graph` / `.dc-chart` 若沿用 `var(--bg-alt)` 容器会与页底同质化、缺层次。装饰层把这两类图改成**悬浮白面板**——白底 `#fff` + 主色调投影 `var(--panel-shadow)` + 描边 `var(--panel-bd)` + `overflow:hidden` 圆角裁剪，用亮面与阴影把图从页面里「抬」出来；节点（`var(--bg-alt)`）也因此不再与画布同色。`--panel-bd` / `--panel-shadow` 两个令牌只在这三套主题里定义，scoped 选择器也只点名这三套，故 `clean` / `elegant` / `terminal` 与自定义主题不受影响。

---

## 新增主题需同步三处

新增一套主题时，必须在产出 HTML 的**三个位置**全部注册，缺一不可：

1. **`<style>` 内变量块**：添加 `html[data-theme='<key>'] { … }` CSS 变量声明（必须包含全部 7 个契约令牌）。插入点标记为 `/* DECKCRAFT_CUSTOM_THEMES */`（被追加到此注释之前）。

2. **切换器菜单**：在 `<!-- DECKCRAFT_THEME_OPTIONS -->` 注释处插入一个 `.skin__opt` 按钮：
   ```html
   <button class="skin__opt" data-theme="<key>"><span class="dot" style="background:<dot>"></span><label></button>
   ```

3. **防闪烁脚本 `THEMES` 数组**（页面 `<head>` 中内联运行）：将 `key` 追加到 `var THEMES = […]`，确保首帧渲染前 `localStorage` 值能被正确识别。运行时引擎的 `THEME_KEYS` 与 `THEME_LABEL` 也需同步（由 `appendTheme` 自动处理）。

推荐使用 `append-theme.mjs` 中的 `appendTheme()` 函数完成以上三处注册，见 `custom-theme.md`。

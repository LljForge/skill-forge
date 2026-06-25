---
name: deckcraft
description: Use when the user wants to turn material (pdf/docx/md/txt) into an HTML slide deck for a talk or report. Produces one self-contained .html with 6 built-in themes and a live theme switcher. Triggers - "做成幻灯片", "转成 PPT/演示", "生成 slides", "deckcraft".
---

# deckcraft · 资料转幻灯片

把用户的材料（md / txt / docx / pdf，单文件、多文件、目录通配）摄取成**一份自包含的 HTML 幻灯片**：单文件、6 套内置主题、运行时按 **T** 键实时换肤。deckcraft 自身**零运行时依赖（纯 Node）**，跨设备即拷即用；读取文档的能力委托给 document-skills。

本文件是触发后的运行脚本。详细 how-to 在 `references/` 里，本文件只编排步骤并指向它们。

> **路径约定**：下文 `<SKILL>` 指代本 skill 所在目录的绝对路径（触发时即已知，例如 `~/.claude/skills/deckcraft`）。**执行命令时把 `<SKILL>` 替换为该真实绝对路径**；输入材料 / 输出 deck 仍按你当前项目相对。脚本随 skill 走、引用一律相对 `<SKILL>`，故本 skill 放在任何位置（项目级 / 个人级软链 / 任意路径）都能跑。

---

## 何时触发 / 输入

用户想把资料做成幻灯片时触发（"做成幻灯片" / "转成 PPT/演示" / "生成 slides" / "deckcraft"）。

输入支持多来源：多个文件、目录、glob 通配（如 `materials/*.md`），默认合成**一份** deck，按主题逻辑而非文件边界重组。

**护栏**：当来源文件 **> 8 个**，或合计页数 **> 40 页** 时，**先停下来向用户确认范围与篇幅**（要全部还是哪几份？目标多少页？），不要默默吞掉一大批材料生成超长 deck。详见 `references/pipeline.md`（多来源合并 / 篇幅）。
**豁免**：若用户已经把**范围**（用哪些 / 全部）和**篇幅或形态**（"做一份总览演讲" / "约 15 页" / "尽量精简"）说清楚了，就不必再确认，直接按其意图做——护栏是为了避免"默默吞一大批"，不是强制多问一轮。

---

## 运行流程（编号步骤）

整条流程在临时工作目录 `./.deckcraft-tmp/`（`slides.html` + `img/`）里组装，最后清理。

### ⓪ 选定详略档（开始前）
抽取前先定**详略档**，它贯穿后续内容策略与版式：
- **默认提问**：用 AskUserQuestion 让用户三选一，每档附一句说明（阅读模式口径）：
  - **精简**：上台演讲的提词骨架——靠你现场讲，页面只给线索。
  - **标准（推荐）**：不在场也能读懂大意——每条一句说清主线。
  - **详尽**：独立成文的讲义——没有讲者也能读懂全部论证（含为什么 / 边界 / 例子）。

  （三档完整语义见 `references/pipeline.md`「详略三档」。）
- **豁免**：用户已在请求里表明详略（如"做份详尽讲义""精简点""详细些"）则**跳过提问**，直接按其意图——与"多来源护栏豁免"同一逻辑。
- 选定的档记在心里，③ 图表路由密度、④ 内容策略与版式映射都按它执行。

### ① 识别格式
按扩展名分流：md / txt / docx / pdf。

### ② 委托抽取（按 `references/extraction.md`）
- **md / txt**：直读文件内容。
- **pdf**：委托 `document-skills:pdf` 抽取文字 / 表格。
- **docx**：委托 `document-skills:docx` 抽取文字 / 表格。

deckcraft 自身不内置任何文档 / 压缩包解析器；document-skills 不可用时按本文「依赖与降级」处理。

### ③ 图表 H 路由（按 `references/extraction.md` 第四节决策树）
材料里每遇到一个图 / 表，**逐图判定**，四选一：**A** 嵌入图片 / **B** 原生数据图（`chart-render.mjs`）/ **C** 形状流程图（`graph-render.mjs`）/ **兜底**（LibreOffice 或文字占位）。**任何情况都不臆造数据。** 各路线的确切落地、节点 `type`、以及 `renderChart`/`graphToSvgBlock` 的**数据契约**（`values` 必须纯数字、`label` 必填，否则渲染 `NaN`/`"undefined"`）全部见 `extraction.md` 第四、五节——组 spec 前必读。

### ④ 内容策略 + 映射组件（按 `references/pipeline.md` 与 `references/components.md`）
- **内容策略（按 ⓪ 选定的档）**：所有材料都是连续文稿 → 归纳精炼，遵守**实质下限**——精炼 ≠ 只留标题，每页保留足以支撑主张的实质（详见 `references/pipeline.md`「实质下限」与「详略三档」）。仍守"每页一主张、要点 ≤6、不臆造数据、不混揉不同来源"。
- **版面即设计（你是设计师，不是填表器）**：每张幻灯片是一块 16:9 画布，目标是信息清晰、版面平衡、填满画布而不拥挤——横向用好宽屏（并排 / 分栏 / 图文左右），别默认把内容堆成左对齐的一窄列。组件是你的**调色板**（见 pipeline.md 第五节「版式调色板」与 `components.md`），各擅长表达不同意图；用哪个、怎么搭配、怎么填满版面，你自己判断，别套固定模板。
- 把拼好的幻灯片片段（一串 `<section class="slide">…</section>`）写入 `./.deckcraft-tmp/slides.html`。

### ⑤ 灌装
```bash
node <SKILL>/build-deck.mjs \
  --template <SKILL>/template.html \
  --slides ./.deckcraft-tmp/slides.html \
  --title "<标题>" \
  --images ./.deckcraft-tmp \
  --dir docs/decks
```
- 把两插槽替换 + 相对 `<img>` base64 内联（外链 `http:`/`https:`/`data:` 不动）。
- **陷阱：`--images` 指向工作目录 `./.deckcraft-tmp` 本身**（不是其下 `img/`），否则拼成 `img/img/...` 找不到文件。
- **陷阱：`build-deck.mjs` 不自建目录**——`--dir docs/decks` 前先 `mkdir -p docs/decks`。
- 落盘目录默认值、标题优先级、文件名安全化、`--out` 用法 → 见 `references/pipeline.md` 第六节。

### ⑥ 校验
```bash
node <SKILL>/validate-deck.mjs <产出.html>
```
必须输出 `ok: true`（退出码 0）。校验**六项**：两插槽已替换、6 套主题变量块齐全、至少一张 `.slide`、无残留未内联本地 `<img>`、**含图页须 `.slide-body` 包裹**、**无残留 `mermaid`**。**非 0 退出即失败**——按返回的 `errors` 修正 `./.deckcraft-tmp/slides.html`，重跑 ⑤⑥，直到 `ok: true`。

### ⑦ 设计自检：渲染 → 看图 → 调整（交付前）
模型容易"闭眼生成、从不看成品"。交付前像设计师一样**看一眼真实渲染**，对照设计目标调整——用一个"看成品"的能力，替代一堆预设的版式规则。
- **渲染并截图**：用本机 Playwright 打开 ⑤ 的产出。**关键：`domcontentloaded` 早于 ECharts/图片绘制，直接截会得到空白页**——`goto(url, wait_until="domcontentloaded")` 后必须再 `await document.fonts.ready` + 等 ~1s 让图表/图片绘制，并**断言当前页非空白**（`.slide.active` 内有可见文字或 `img/svg/.dc-chart`）再截。截**代表性页面**——最密页、最疏页，以及含图表 / 列表 / 对比的页各一张，用 Read 工具**实际看图**。本机无 Playwright 时，至少在浏览器人工过一遍，或请用户截图反馈。
- **对照目标自检**：半空页（内容只占左半）/ 溢出截断 / 碎片化（页太多太薄）/ 某主题下层次读不清 / 配色失衡。判断标准是"作为设计师看着平不平衡、清不清楚"，不是核对某条数字规则。
- **档位核对（对照 ⓪ 选定的档，逐页只看语义；判法按 `pipeline.md` 第二节三档表三轴）**：
  - **地板**：源章节的每条独立论点在 deck 里都还在吗（哪怕只剩线索）？丢了＝压过头，回源补。
  - **深度**：每条展开深度对不对档？（漂向详尽 / 漂向标准的判法见三档表「深度」列）
  - **粒度**：单元切得对不对档？**跨档对一眼**：精简顶层单元数应 ≤ 标准 ≤ 详尽，倒挂即错档（判法见三档表「粒度」列）。
  - 只看语义，**不看用了哪个版式组件**——形态对不对，第五节调色板在管。
- **调整**：发现问题改 `./.deckcraft-tmp/slides.html`，重跑 ⑤⑥，直到版面平衡、信息清晰再交付。

### ⑧ 交付（暂留临时目录）
最终交付物已 base64 内联、自包含，不再依赖临时目录。告知用户**产出路径**，并提示：「用浏览器打开，按 **T** 键切换 6 套主题」。
**先别删 `./.deckcraft-tmp/`**：里面的 `slides.html` 是可编辑的内容源，用户大概率会要求改某页（见下「预览 / 迭代」——改内容要回到 `slides.html` 重跑 ⑤⑥）。**等用户确认满意后再清理** `./.deckcraft-tmp/`（含 `img/`）。该目录已被 `.gitignore` 忽略，留着不会污染仓库。

---

## 预览 / 迭代

- **换主题**：6 套主题已内置，运行时按 **T** 键循环切换（或点右上角切换器），选择持久化到 `localStorage`。
- **自定义主题**：用 `append-theme.mjs` 的 `appendTheme(html, {key, label, dot, vars})` 在**已产出文件**上追加注册（CSS 变量块 + 切换器按钮 + 防闪烁数组三处同步），不重跑内容生成、不改 `template.html`。必填 7 个契约令牌，装饰只用 CSS、不新增 DOM。用法见 `references/custom-theme.md`。
- **改内容**：编辑 `./.deckcraft-tmp/slides.html` 后重跑 ⑤⑥。

---

## 依赖与降级

deckcraft 自身零运行时依赖（纯 Node），即拷即用；**读取**依赖 document-skills（pdf/docx）、**图片兜底**依赖 LibreOffice（可选）、**统计图**运行时依赖 ECharts CDN（缺网显示占位、不白屏）。**逐级降级的完整路径见 `references/extraction.md` 第七节**——任一依赖缺失都降级产出诚实可用的 deck，不崩。

---

## 参考

- `references/pipeline.md` —— 摄取管线：内容策略、结构约束、多来源合并、篇幅、版式调色板、输出落盘与命名。
- `references/extraction.md` —— 读取与图表：委托 document-skills 抽取、工作目录约定、图表 H 决策树、数据契约、逐级降级、清理。
- `references/themes.md` —— 6 套内置主题的 key / 中文名 / 色点 / 暗色一览与设计取向。
- `references/components.md` —— 版式组件清单：确切类名 + HTML 片段 + 适用场景（与 fixtures 一致）。
- `references/custom-theme.md` —— 自定义主题循环：契约令牌、`appendTheme` 用法、验收与约束。

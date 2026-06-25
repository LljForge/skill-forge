# deckcraft 读取与图表参考

本文件指导运行时模型把各种格式的原始材料**读出来**，并把材料里的图 / 表正确转化为 deckcraft 版式。

> 文中 `<SKILL>` 指代本 skill 所在目录的绝对路径（如 `~/.claude/skills/deckcraft`），执行命令 / `import` 时替换为真实路径；落盘材料（`./.deckcraft-tmp/` 等）仍按当前项目相对。详见 `SKILL.md` 顶部「路径约定」。
内容策略、版式映射、输出落盘见 `references/pipeline.md`；图表与图片对应的版式组件见 `references/components.md`。

核心原则：**deckcraft 自身只依赖 Node**，不带任何文档二进制解析能力。所有「打开文件、抽文字、抽图片」的脏活全部**委托给 document-skills**。这样跨设备只需 Node 即可运行 deckcraft 自己的脚本；读取能力取决于 document-skills 是否在该机器就绪。

---

## 一、读取：委托 document-skills

| 格式 | 怎么读 |
|------|--------|
| md / txt | **直读**：纯文本，直接读取文件内容。 |
| pdf | 委托 `document-skills:pdf`，抽取文字 / 表格。 |
| docx | 委托 `document-skills:docx`，抽取文字 / 表格。 |

明确边界：**deckcraft 不内置任何文档 / 压缩包解析器**（不解 zip、不解 OOXML、不跑解释型脚本）。跨设备只要有 Node 就能跑 deckcraft 的 `build-deck.mjs` / `validate-deck.mjs` / `chart-render.mjs` / `graph-render.mjs`；但**读取依赖 document-skills 在该机就绪**。document-skills 不可用时按本文末「逐级降级」处理。

---

## 二、工作目录约定

整条流程在临时工作目录里组装：

```
./.deckcraft-tmp/
  slides.html        ← 你拼好的幻灯片片段（喂给 build-deck.mjs 的 --slides）
  img/               ← 所有落盘图片；slide 里用 `img/xxx.png` 引用。build-deck 的 `--images` 给上层工作目录 `./.deckcraft-tmp`（不是这个 img/），由它拼出 `./.deckcraft-tmp/img/xxx.png`
    fig1.png
    chart2.png
    ...
```

pdf / docx 抽出的嵌入图片落到 `./.deckcraft-tmp/img/`；LibreOffice 兜底渲染的图也落这里。

---

## 三、图片处理

- 在 slide 片段里**一律用相对路径** `<img src="img/...">`（相对 build-deck 的 `--images ./.deckcraft-tmp` 基目录，解析为 `./.deckcraft-tmp/img/...`）。**别把 `img/` 写进 `--images`**，否则拼成 `img/img/...` 找不到文件。
- `build-deck.mjs` 灌装时由 `inlineImages` 把这些相对图片读出来 **base64 内联**进最终 HTML，从而产出单文件、自包含的 deck。
- **外链不动**：`http:` / `https:` / `data:` 开头的 `src` 原样保留，不内联。
- 文件不存在时 `inlineImages` 原样保留该 `<img>` 标签——但这会被 `validate-deck.mjs` 判为「未内联本地图片」报错，所以确保引用的图都真的落在 `./.deckcraft-tmp/img/` 里。

---

## 四、图表 H 决策树（核心）

材料里每遇到一个图 / 表，**逐图判定类型**，按下面四条路线择一处理。目标是让图表在最终 deck 里尽量「活」（可随主题换肤、可放大），实在不行才降级。

### A · 嵌入图片（位图截图 / 照片 / 无法解析的图）

→ 由 document-skills 把它**落盘**到 `./.deckcraft-tmp/img/` → 在 slide 里用相对 `<img src="img/...">` 引用 → `build-deck.mjs` 灌装时 **base64 内联**。
适用：原文就是一张图片、或下面 B/C 都读不出结构、但图片本体能拿到。
内嵌图片在 deck 里**默认可点击放大**（模板已给 `.slide img` 加了缩放样式与点击放大绑定，复用 `.dc-graph`/`.dc-chart` 同一个全屏遮罩）——无需额外属性，bare `<img>` 即可。需要题注时，包一层 `<figure class="dc-image"><img src="img/..."><figcaption>…</figcaption></figure>`。

### B · 原生数据图表（柱 / 折线 / 饼 等有底层数值的图）

→ 模型从 document-skills 抽出的**文字 / 数据表**里读出 `categories` 和 `series`（标签轴 + 一组或多组数值）→ 组出 spec → 调 `chart-render.mjs` 的 `renderChart(spec)` → 得到 `<figure class="dc-chart">` 占位，**运行时由 ECharts 渲染（支持多系列同图），随皮肤 `setTheme` 换肤自动变色**。

```js
import { renderChart } from '<SKILL>/chart-render.mjs';
const fig = renderChart({
  type: 'bar',                       // 'bar' | 'line' | 'pie'
  title: '季度新签约（家）',
  categories: ['华东', '华北', '西部'],
  series: [{ name: '新签约', values: [540, 320, 180] }],
});
// fig 是一段 <figure class="dc-chart">…</figure>，直接放进 slide 片段
```

适用：原图是数据图，且数值能从抽取文本 / 表格里读到。**注意数据契约（见第五节）。**

### C · 形状流程图（用方框 + 箭头画的流程 / 架构 / 关系图）

→ 模型据抽出的**文字 + 布局**推断出 `{nodes, edges}` → 调 `graph-render.mjs` 的 `graphToSvgBlock(graph)` → 得到构建期主题化 `<figure class="dc-graph">` 静态 SVG（`var()` 令牌随皮肤换色、矢量、点击放大），deck 内无运行时库。

节点 `type` 可选：`start` / `normal`（圆角矩形，默认；start 仅语义、外观同 normal）、`decision`（菱形判断）、`terminal`（accent 实心胶囊端点）。

```js
import { graphToSvgBlock } from '<SKILL>/graph-render.mjs';
const block = graphToSvgBlock({
  nodes: [
    { id: 1, label: '需求' },
    { id: 2, label: '设计' },
    { id: 3, label: '实现' },
    { id: 4, label: '验收', type: 'decision' },
  ],
  edges: [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 2, label: '不过' },
  ],
});
// block 是一段 <figure class="dc-graph">…<svg>…</svg></figure>，直接放进 slide 片段
```

适用：原图是流程 / 架构 / 关系图，能从文字和布局推断出节点与连线。**注意数据契约（见第五节）。**

### 兜底 · 数值 / 结构读不到

当 B、C 都读不到可靠的数值或结构时：

1. **若本机有 LibreOffice**（`command -v soffice || command -v libreoffice` 命中）→ 用 LibreOffice 把原图 / 原页渲染成图片，落到 `./.deckcraft-tmp/img/`，按路线 A 内联原图。
2. **否则** → 用文字结构占位（把能读到的标题 / 字段 / 行列以列表或两栏卡呈现），并附**可见提示**：「此处源为图/表，建议手动补」。绝不臆造图里的数值。

---

## 五、数据契约（重要硬性约束）

`renderChart` 和 `graphToSvgBlock` 对输入有硬要求，不满足会渲染异常。**组 spec / graph 之前必须先归一化。**

### renderChart 的 `series[].values` 必须是纯数字

- **纯数字**：不带千分位逗号、不带百分号、非负。
- 从抽取文本里读到 `1,240`、`41%`、`¥3.2万` 这类，要**先归一化**成 `1240`、`41`、`32000` 这样的纯数字再放进 `values`。
- 单位 / 符号放到 `title` 或 `categories` 里承载，例如 `title: '毛利率（%）'`、`categories: ['Q1','Q2','Q3']`。
- 否则 `renderChart` 内部 `Math.max(...vals)` / 高度百分比计算会得到 `NaN`，柱子 / 折线**不可见或错乱**。

```js
// 抽到的原始文本: 新客户 1,240 家；毛利率 41%
// 错误 ❌
renderChart({ type:'bar', categories:['新客户','毛利率'], series:[{ values:['1,240','41%'] }] });
// 正确 ✅（逗号、百分号去掉，单位进 categories / title）
renderChart({ type:'bar', title:'季度指标', categories:['新客户(家)','毛利率(%)'], series:[{ values:[1240, 41] }] });
```

---

## 六、诚实标注

图表保真**取决于数值能否从 document-skills 抽取结果里读到**：

- 读得到 → 走路线 B / C 渲染成活图表。
- 读不到 → 按兜底降级为**缩略图**（若原图可落盘，路线 A 内联）或**文字描述**（结构占位 + 「此处源为图/表，建议手动补」提示）。
- **任何情况下都不臆造数据**：不编百分比、不补缺失的轴值、不猜节点关系。宁可降级和如实标注，也不给用户一张「看起来精确其实编的」图。

---

## 七、依赖缺失逐级降级（不致命）

每一级依赖缺失都有降级路径，**不让流程崩溃**：

- **document-skills 不可用**（pdf/docx 读不了）→ 降级到能直读的部分（md/txt 仍可读）；对读不了的格式如实告知用户该机缺少对应 document-skills，给出纯文本能拿到的内容。
- **LibreOffice 缺失**（兜底渲染不可用）→ 退到文字结构占位 + 「此处源为图/表，建议手动补」。
- **数值 / 结构读不到** → 见图表 H 兜底分支。

逐级降级保证：即便依赖不全，也能产出一份**诚实、可用**的 deck，而不是直接失败。

---

## 八、清理

流程结束（deck 已落盘并通过 `validate-deck.mjs`）后，**删除临时工作目录** `./.deckcraft-tmp/`（含其下 `img/`）。最终交付物是单一自包含的 HTML，图片已全部 base64 内联，不再依赖临时目录。

# deckcraft 版式组件参考

组件清单，类名与 `tests/fixtures/` 的范例（`sample-slides.html` + 内容更厚的 `sample-doc-rich.slides.html`）一致。每节给出确切 HTML 片段 + 适用场景。

---

## 即兴组件契约（palette 没有的形态，必读）

本清单覆盖常见形态。**若材料需要这里没有的版式**，你可以手搓——但手搓组件**必须遵守一条契约，否则按 T 换肤时它不跟着变、破坏整套主题系统**（真实事故：曾有 deck 手搓 `timeline` / `feature-bar` 却写死颜色，6 套主题下纹丝不动）：

- **只用主题令牌着色，禁写死颜色**：背景 `var(--card-bg)` / `var(--bg-alt)`，文字 `var(--text)` / `var(--text-2)` / `var(--text-3)`，强调 `var(--accent)` / `var(--alt)`，边框 `var(--border)` / `var(--border-2)`。**不要写 `#xxxxxx` / `rgb(...)` 字面色。**
- **先复用已有类**：先看本清单能不能拼出来（`.cols` / `.card` / `ul` / `.timeline` / `.steps` 等），真没有再手搓。
- **含图或可能超高 → 进 `.slide-body`**，守住防溢出。

7 个契约令牌见 `themes.md`「契约令牌」节。遵守此契约，手搓组件就能和内置组件一样随 6 套 + 自定义主题正确换肤。

---

## 渐进揭示与分层

### `data-reveal style="--i:N"` — 逐元素入场动画

给任意元素添加 `data-reveal` 属性，它在幻灯片切入时触发 `rise` 动画（向上淡入）。`--i` 是顺序索引，每增加 1 延迟 80ms：

```html
<div class="kicker" data-reveal style="--i:0"><span>章节标签</span></div>
<h1 data-reveal style="--i:1">主标题</h1>
<p class="lead" data-reveal style="--i:2">副文本</p>
```

### `.frag` — 手动渐进揭示

`.frag` 元素（以及 `.step`）在翻页键按下时**逐个**显示，而非随幻灯片入场自动播放。适合逐步拆解论点：

```html
<div class="frag">第一步揭示的内容</div>
<div class="frag">第二步揭示的内容</div>
```

### `data-tier="main|deep"` — 内容层级标记

| 值     | 含义                               |
|--------|------------------------------------|
| `main` | 主线内容，必须讲                   |
| `deep` | 深度补充，时间不足可跳过           |

```html
<section class="slide" data-tier="main">…</section>
<section class="slide" data-tier="deep">…</section>
```

### `data-slide-theme` — 单页强制主题

在某张幻灯片上设置 `data-slide-theme`，该页激活时引擎强制切换到指定主题，离开时恢复全局主题：

```html
<section class="slide" data-slide-theme="terminal">…</section>
```

---

## 标题页

适合章节开场、主要论点引入。`.kicker` 为章节标签行（带左侧短横线装饰），`h1` 为大标题，`.lead` 为引言副文本：

```html
<section class="slide" data-tier="main">
  <div class="kicker" data-reveal style="--i:0"><span>deckcraft fixture</span></div>
  <h1 data-reveal style="--i:1">资料，<span class="accent">一键成稿</span></h1>
  <p class="lead" data-reveal style="--i:2">本页用于跨 6 套主题做可视验收：标题、要点、对照、数据、代码、引用、整图、流程图、收束。</p>
</section>
```

**适合表达**：每幕第一张内容页（幕封面后紧跟），或全篇开场。

---

## 幕封面 `.slide.cover`

`.slide.cover` 是**幕引导页**，引擎自动将所有 `.slide.cover` 收集到左上角幕导航菜单中，点击可直接跳转。`justify-content: center` 让内容垂直居中。

```html
<section class="slide cover" data-tier="main">
  <div class="cnum" aria-hidden="true">01</div>
  <div class="kicker"><span>第一幕</span></div>
  <h1 class="ctitle">版式词汇</h1>
</section>
```

**关键子元素**：
- `.cnum` — 大号半透明幕号（`opacity:.08`），绝对定位于右上角，纯装饰，`aria-hidden`
- `.kicker` — 幕标签（`<span>` 内为文本，引擎读取此文本构建导航菜单项）
- `.ctitle` — 幕主标题（引擎同样读取此文本）

**可选子元素**：`.clead`（副标题）、`.ctoc`（目录胶囊列表，`.t` 子项内含 `<b>` 强调序号）。

**适合表达**：每幕开头一张，驱动左上角幕导航。

---

## 要点卡 `.cols` / `.card`

两栏对照或多卡布局。`.cols` 是 `display:grid; grid-template-columns:1fr 1fr; gap:24px` 的容器；`.card` 是卡片单元：

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>要点卡 · 双栏</span></div>
  <h2>两栏对照</h2>
  <div class="cols">
    <div class="card"><div class="tag">老做法</div><h3>来回搬运</h3><p>你问 → 它答 → 你粘贴调试。</p></div>
    <div class="card new"><div class="tag">新做法</div><h3>自主执行</h3><p>给目标 → 它自己跑完。</p></div>
  </div>
  <p class="note">note 段落用于检查弱化文字在各主题下的可读性。</p>
</section>
```

**卡片子元素**：
- `.tag` — 等宽字体小标签（全大写，`var(--text-3)` 色）
- `h3` — 卡片主标题（`25px`，display 字体）
- `p` — 说明文字（`var(--text-2)` 色）

**`.card.new` 变体** — 正向对比卡，靠**绿色描边**（`var(--positive-border)`）+ `.tag` 转正向色来区分，**不加任何背景色**（卡片表面始终是中性的 `var(--card-bg)`，与普通卡一致）。

**适合表达**：新旧对比、双侧优劣、并排特性列举；需要三栏时 `.cols` 套三个 `.card`（CSS 在移动端自动折叠为单栏）。

---

## 要点列表 `ul` / `ol`（含二级嵌套）

承载"有实质的要点"——比卡片更省空间、可一页多条。每条建议「`<span class="lead-in">小标题</span>`：说明」结构：

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>核心机制</span></div>
  <h2>三道闸门</h2>
  <ul>
    <li><span class="lead-in">规范（SDD）</span>：先写清楚要做什么、边界在哪，再让 AI 动手。</li>
    <li><span class="lead-in">测试（TDD）</span>：用先写的失败测试卡住"看起来对"。
      <ul>
        <li>测试通过才算数，而不是 AI 自述完成。</li>
      </ul>
    </li>
  </ul>
</section>
```

- `ul`（无序）marker 为 `var(--accent)` 小方点；`ol`（有序）marker 为 `var(--accent)` 等宽序号。
- `.lead-in` / `<b>` / `<strong>` 在列表项内加粗为 `var(--text)`，做"小标题 + 说明"。
- **二级嵌套**（`li > ul`）：marker 变小、`var(--text-3)`，文字 `var(--text-2)`——当**一条主张下还要拆子点**时用；没有子点就别套。
- 每页要点 ≤6 条（一条主张下还要拆子点时可借嵌套承载）。

**双栏：`<ul class="cols-2">`（填满版面，避免只占左半）**——幻灯片是 16:9 宽屏，单栏短列表会把右半页空着。想让一组要点分两列铺满宽度时给列表加 `cols-2`（每个 `li` 不被拦腰断开），是填满画布、左右平衡的趁手工具之一：

```html
<h2>Skill 的本质</h2>
<ul class="cols-2">
  <li><span class="lead-in">渐进式披露</span>：平时只一行 description，触发时才注入正文。</li>
  <li><span class="lead-in">按需加载</span>：挂在需要的场景，不占常驻上下文。</li>
  <li><span class="lead-in">可组合</span>：多个 skill 叠加，像乐高拼工作流。</li>
  <li><span class="lead-in">挂接哲学</span>：创建姿势把你的方法论固化进去。</li>
</ul>
```

不带 `cols-2` 时列表限宽 70ch（单栏）；嵌套列表不要再套 `cols-2`。

**适合表达**：一组有实质的并列要点、机制拆解、清单。对比双方/三方用卡片更直观。

---

## 正文段落 `p.body`

可读的正文，比 `.lead`（副标题）小而正常、比 `.note`（弱化提示）更主体。当**需要一两句讲清背景 / 原因**时用：

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>为什么需要纪律</span></div>
  <h2>速度需要闸门</h2>
  <p class="body">AI 能高速产出代码，但它是概率性的——看起来对、不一定真对。没有确定性的闸门，速度只会更快地累积返工。</p>
  <p class="body">纪律的作用，是把概率性的能力约束进可验收的轨道。</p>
</section>
```

- `var(--text)` 色、行高 1.7、最大 68ch；多段用多个 `p.body`。
- **保持结构化**：即便要展开，也应"引导句 + 列表 + 必要展开"，不要无结构大段堆砌。

**适合表达**：需要一两句把背景 / 原因、或一个"为什么"讲清楚时。没有这种意图就不必用。

---

## 密集卡片（卡内列表）

卡片里放小列表，让对比卡承载更多实质（当对比双方各自有多条要点时）：

```html
<div class="cols">
  <div class="card">
    <div class="tag">老做法</div>
    <h3>来回搬运</h3>
    <ul>
      <li>你问 → 它答 → 你粘贴调试</li>
      <li>每一步都要人来回搬</li>
    </ul>
  </div>
  <div class="card new">
    <div class="tag">新做法</div>
    <h3>自主执行</h3>
    <ul>
      <li>给目标 → 它自己读文件、改码、跑测试</li>
      <li>人只在验收点介入</li>
    </ul>
  </div>
</div>
```

**适合表达**：对比双方各自有多条要点时，用卡内列表代替单行 `p`。

---

## 时间线 `.timeline`

竖向时间线，承载按时间 / 阶段推进的事件。每个 `.timeline__item` 含 `.timeline__label`（时间 / 阶段，mono + accent）+ `.timeline__content`（说明，`<b>` 提主词）。左轴线与圆点自动主题化（`var(--border)` / `var(--accent)`），随 T 换肤。

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>里程碑</span></div>
  <h2>项目时间线</h2>
  <ol class="timeline">
    <li class="timeline__item"><span class="timeline__label">2026-04</span><div class="timeline__content"><b>立项</b>：完成范围与排期评审。</div></li>
    <li class="timeline__item"><span class="timeline__label">2026-05</span><div class="timeline__content"><b>灰度</b>：核心链路上线，小流量验证。</div></li>
    <li class="timeline__item"><span class="timeline__label">2026-06</span><div class="timeline__content"><b>全量</b>：放量并复盘。</div></li>
  </ol>
</section>
```

**适合表达**：时间推进、阶段演进、版本 / 里程碑序列。

---

## 步骤条 `.steps`

横向步骤 / 流程条，承载有序操作步骤或并列要素（序号圆点 + 标题 + 说明）。`grid auto-fit` 自动按数量铺满宽度。每个 `.steps__item` 含 `.steps__n`（序号）+ `.steps__body`（`<b>` 标题 + `<p>` 说明）。卡面、序号、文字全主题化。

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>操作步骤</span></div>
  <h2>三步完成签约</h2>
  <ol class="steps">
    <li class="steps__item"><span class="steps__n">1</span><div class="steps__body"><b>扫码</b><p>用微信扫业务员提供的二维码。</p></div></li>
    <li class="steps__item"><span class="steps__n">2</span><div class="steps__body"><b>授权</b><p>弹出授权提示，点「授权登录」。</p></div></li>
    <li class="steps__item"><span class="steps__n">3</span><div class="steps__body"><b>进入</b><p>系统完成登录，进入首页。</p></div></li>
  </ol>
</section>
```

**适合表达**：操作步骤、流程阶段、并列要素——比裸 `ul` 更有「流程感」，无分支时比 `dc-graph` 轻。

---

## 数据 / KPI

大数字 KPI 卡，同样用 `.cols` + `.card`，`h3` 直接写数字：

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>数据 / KPI</span></div>
  <h2>季度业绩</h2>
  <div class="cols">
    <div class="card"><h3>1,240</h3><p>新客户 · 华东领跑</p></div>
    <div class="card"><h3>41%</h3><p>毛利率 · 同比 +6pt</p></div>
    <div class="card"><h3>18%</h3><p>营收同比 · 创新高</p></div>
  </div>
</section>
```

**适合表达**：结果汇报、指标对比、数字驱动的摘要页。三个数字时用三个 `.card`（`.cols` 默认两列，第三卡自动换行；若要强制三列可在 `.cols` 上额外指定 `style="grid-template-columns:repeat(3,1fr)"`）。

---

## 代码 / 终端 `pre.term > code`

```html
<section class="slide" data-tier="deep">
  <div class="kicker"><span>代码 / 终端</span></div>
  <h2>terminal 主题下的代码块</h2>
  <pre class="term"><code>$ deckcraft report.md
✓ 24 slides · 6 themes · done</code></pre>
</section>
```

`.term` 容器提供圆角边框 + `var(--term-bg)` 背景 + `var(--term-shadow)` 阴影；`<code>` 继承等宽字体。可用 `.term.full` 去掉 `max-width:780px` 限制铺满幻灯片宽度。

可用行内 `<span>` 着色：`.c`（注释色）、`.k`（关键字色）、`.g`（成功色）、`.p`（错误色），对应 `--term-c/k/g/p`。

**适合表达**：展示命令行输出、代码片段、配置示例。配合 `data-slide-theme="terminal"` 强制科技主题效果最佳。

---

## 引用 `blockquote.quote`

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>引用</span></div>
  <blockquote class="quote">把确定性的纪律，套在概率性的能力上。</blockquote>
</section>
```

`.quote` 是 display 字体 + accent 左边框 + theme-token 着色的**提炼句**，自带顶部间距与上方内容分隔。常跟在一组要点 / 一对对照卡之后，把这页收束成一句。

**适合表达**：列表 / 对比之后的一句提炼、收束、观点。需要**整页居中的大号金句**（过渡页 / 章节核心句）时用 `.bigquote`（更大号、限宽居中）。

---

## 内嵌图片 `<img>` / `figure.dc-image`

源文档里抽出的位图（截图 / 照片 / 无法解析的图）落盘后用相对路径引用，`build-deck.mjs` 灌装时 base64 内联（路线见 `extraction.md` 四·A）。图片自带**点击放大**——和 `.dc-graph`/`.dc-chart` 共用同一个全屏遮罩，无需额外属性或类。

**含图的页必须把标题以下的内容包进 `<div class="slide-body">`。** 这不是装饰，是**防溢出的结构保证**：竖版截图缩到满宽后天然很高，会顶破 16:9 页面、逼出滚动条；`.slide-body` 是个定高弹性区（吃掉标题以下的全部剩余高度），图片在里面用 `object-fit:contain` **按本页还剩多少空间自适应缩放**，永远完整可见、不溢出。少了它，`validate-deck` 会**直接报错拦下**。标题（`.kicker` / `h1` / `h2` / `.lead`）留在 `.slide-body` 外面。

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>架构</span></div>
  <h2>系统总览</h2>
  <div class="slide-body">
    <!-- 裸 <img> 即可，已自动具备点击放大 -->
    <img src="img/overview.png" alt="系统架构图">
  </div>
</section>
```

图文混排时，把**文字和图一起**放进 `.slide-body`（如 `.cols` 左文右图）——这样图会让出空间给文字、自己缩到合身，整页一并不溢出：

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>步骤</span></div>
  <h2>扫码登录</h2>
  <div class="slide-body">
    <div class="cols">
      <ul><li><span class="lead-in">第一步</span>：打开小程序</li>…</ul>
      <img src="img/login.png" alt="登录界面">
    </div>
  </div>
</section>
```

需要题注时在 `.slide-body` 内包一层 `figure.dc-image`（图本体仍可点击放大）：

```html
<div class="slide-body">
  <figure class="dc-image">
    <img src="img/overview.png" alt="系统架构图">
    <figcaption>图 1 · 系统架构总览</figcaption>
  </figure>
</div>
```

**一行多图**：把若干 `<img>` 直接放进一个 `.cols` 里即可（仍在 `.slide-body` 内），**不用手写 `grid-template-columns` / `gap`**——只含图片的 `.cols` 会自动渲染成「等高对齐、间距统一、居中」的图条，图按内容宽并排、行太宽自动等比收缩，省得你为图数调列数、为留白调间距。

```html
<div class="slide-body">
  <div class="cols">
    <img src="img/01.png" alt="第一步"><img src="img/02.png" alt="第二步"><img src="img/03.png" alt="第三步">
  </div>
</div>
```

**适合表达**：原文就是一张图、或结构读不出但图片本体能拿到的情形。能读出底层数据的柱/折线/饼优先走 `figure.dc-chart`，形状流程优先走 `figure.dc-graph`（矢量、随皮肤换肤），位图是兜底。

---

## 流程图 `figure.dc-graph`（由 `graph-render.mjs` 生成）

调 `graph-render.mjs` 的 `graphToSvgBlock({nodes, edges})` 在**构建期**生成一段主题化静态 SVG，包裹在 `<figure class="dc-graph">` 内——颜色全部用 CSS `var()` 令牌，随皮肤切换自动变色；矢量可放大，点击后全屏查看。产出 deck 内**无任何运行时库**负担（dagre 布局引擎已在构建期完成工作）。

节点 `type`（可选，默认 `normal`）：

| type | 形状 |
|------|------|
| `start` | 圆角矩形（仅语义，外观同 `normal`） |
| `normal` | 圆角矩形（默认） |
| `decision` | 菱形判断 |
| `terminal` | accent 实心胶囊端点 |

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>流程图</span></div>
  <h2>研发流程</h2>
  <!-- 下面这段 <figure class="dc-graph">…</figure> 是 graphToSvgBlock(graph) 的返回值，原样粘进来 -->
  <figure class="dc-graph">…<svg>…</svg></figure>
</section>
```

不要手写 `<svg>`，始终通过 `graphToSvgBlock` 生成。完整数据契约见 `extraction.md` 第五节。

**适合表达**：流程图、架构图、步骤关系图。

---

## 数据图表 `figure.dc-chart`（由 `chart-render.mjs` 生成）

不要手写图表 markup，调 `chart-render.mjs` 的 `renderChart(spec)` 拿到一个带 `data-echarts` 属性的 `<figure class="dc-chart">` 占位元素，deck 模板在运行时由 **ECharts 6**（CDN）渲染。支持**多系列同图**；按 **T 换肤时 ECharts 自动 `setTheme`** 跟随皮肤重绘；缺网时显示「图表需联网加载」占位，不影响其他内容。

chart 周围仍要照常给 `.kicker` / `h2` / 说明文字，别让图孤零零占页：

```html
<section class="slide" data-tier="main">
  <div class="kicker"><span>附录 · Skill 推荐</span></div>
  <h2>热度参考</h2>
  <!-- 下面这段 <figure class="dc-chart">…</figure> 是 renderChart(spec) 的返回值，原样粘进来 -->
  <figure class="dc-chart" data-echarts='{"type":"bar","title":"GitHub Star（千）",...}'></figure>
  <p class="note">8–12 个 skill 足矣，重在工作流。</p>
</section>
```

对应 `spec`（`values` 必须是纯数字）：
```js
renderChart({ type:'bar', title:'GitHub Star（千）',
  categories:['Superpowers','UI-UX Pro Max','vercel-labs'],
  series:[{ name:'Stars', values:[215, 87, 21] }] });
```

`type` 取 `bar` / `line` / `pie`；支持多组 `series`；配色随皮肤 `setTheme` 自动变色。完整数据契约（归一化）见 `extraction.md` 第五节。

**适合表达**：有底层数值要可视化的柱 / 折线 / 饼。形状流程图请用上面的 `figure.dc-graph`。

---

## 收束页

幻灯片末尾致谢/结束页，无特定专属类，用标准 `h2`（可选 `.lead`）组合，配合 `data-reveal` 入场：

```html
<section class="slide" data-tier="main">
  <h2 data-reveal style="--i:0">谢谢</h2>
</section>
```

**适合表达**：全篇最后一张，致谢。**不要在收束页堆操作提示**（翻页 / 换肤 / 全屏 / 放大等快捷键已常驻顶部 HUD，无需在页面正文重复）；若想补一句，写收束观点而非操作说明。

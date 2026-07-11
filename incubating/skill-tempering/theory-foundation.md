# 理论骨：7 核依据 + 6 先例借用（单一权威）

> **研究支撑、不随运行载入。** 本文件是 `skill-tempering` 全部理论依据的**唯一权威源**——7 核的「理论骨」、派生工序点名的「工业先例」，只在这里展开一句结论 + 出处 + 给本 skill 哪条做依据。`principles.md` / `derivation-protocol.md` / `audit-lens.md` / `SKILL.md` 一律一句话 + 指针回指本文件的 `#1`–`#7` 或「先例 ①–⑥」，**全仓不在别处复述理论**（守 #5：单一权威源）。
>
> **怎么读**：每条 = 一句结论（机制层）+ 出处 URL + 「给本 skill 哪条做依据」。不是论文综述——扼要、可追溯、够用即止。
>
> **可信度交代**：下列 URL 均于 2026-06-26 经 web 检索 / 抓取核实到一手或规范来源页（见文末「URL 核实方式」）。凡不确定深链一律退到该源的规范稳定页，不造看似精确的假链。

---

## 一、7 核理论骨（被 `principles.md` 的 #1–#7 反向指到）

### #1 自评不可信（generation ≠ judgment）

- **一句结论**：在缺外部反馈的「内省式自纠」设定下，LLM 不能可靠地纠正自己的推理，常越纠越差——产出方与裁判方必须分开。
- **出处**：Huang et al.《Large Language Models Cannot Self-Correct Reasoning Yet》，**ICLR 2024（同行评审 / peer-reviewed）**。arXiv 稳定链：<https://arxiv.org/abs/2310.01798>。
- **给本 skill 做依据**：principles.md **#1** 的承重梁——「无外部真值 → 退到诚实标低置信 / 交人，绝不自评放行」。也是派生工序 ③ 完整性 critic「不可只靠内省自封」、④ 证据来源二分「未经实证不冒充已验证、skill-tempering 自己不自跑取证」、⑤ 结晶治理「裁判角色 ≠ 当场派生者」、以及**三分诊归因闸「审计者自己判出的每条问题也不默认为真值,先归因」**的同一根理论。

### #2 完成判据（completion criterion）

- **一句结论**：要留住对 agent 的控制权，必须给迭代设死上限——无界自我循环（loopmaxxing）是已知反模式，对无法量化的目标尤其失效（缺退出条件）。
- **出处**：Anthropic《Building Effective AI Agents》——「常加停止条件（如最大迭代数 max iterations）以保持控制」：<https://www.anthropic.com/research/building-effective-agents>。anti-loopmaxxing（TechTalks，Ben Dickson）：<https://bdtechtalks.com/2026/06/22/ai-loop-engineering/>。
- **给本 skill 做依据**：principles.md **#2**——「含自检 / 迭代 / 重试循环者必须给机械可判的死上限；无界循环或无判据即缺陷」。

### #3 快乐路径之外（failure / absence path）

- **一句结论**：鲁棒性要求显式覆盖失败 / 前置缺失 / 能力不具备各分支，而非只规定顺利情形。
- **出处**：**设计内生纪律 · 无外部一手源。** 这条是本底座对「鲁棒性」的内生约束，design §2.1 原文即未挂外部理论骨；故据实标注为设计内生，不为凑引用而捏造一手源。其精神与 Anthropic 关于「为 agent 设护栏、防失控」的工程讨论一致（见 #2 同一篇 Building Effective AI Agents），但本核不依赖任何特定外部论断成立。
- **给本 skill 做依据**：principles.md **#3**——「为可预见的失败 / 缺失 / 不具备各定义显式行为（降级或优雅退出）」。也支撑派生工序 ① 失败形态表的 `condition-dependent` 行与种子库「副作用族 / 输入族」。

### #4 确定性归工具、判断归模型

- **一句结论**：能机械计算的事项归确定性调控（linter / 测试 / 类型检查等 computational 传感器），需推断的事项归推断式调控（LLM-as-judge 等 inferential 传感器）；两者错配即缺陷。
- **出处**：Birgitta Böckeler《Harness engineering for coding agent users》，martinfowler.com——computational vs inferential（确定性 vs 推断式）调控轴：<https://martinfowler.com/articles/harness-engineering.html>。
- **给本 skill 做依据**：principles.md **#4**（双向：该用工具时别让模型猜，该让模型判时别硬编死表）。也是派生工序「核 / 嗅机械化、派生 / 命脉判断留模型」的元方法——本工序自身即 #4 的活体应用。

### #5 单一权威源 · 守薄

- **一句结论**：每条判据 / 清单 / 动作只有一个权威家、别处只引不复述，是抗冗余、抗漂移的结构地基。
- **出处**：**设计内生纪律 · 无外部一手源。** 这条是底座抗熵增（蔓延 / 沉积 / 空转 / 重复四类）的内生结构纪律，design §2.1 原文即未挂外部理论骨；据实标注为设计内生，不捏造引用。其方向与「DRY / 单一事实来源（single source of truth）」这一软件工程通识同源，但本核不依赖任何特定外部出处成立——本文件自身正是这条纪律的活体范例（理论只在此展开一次）。
- **给本 skill 做依据**：principles.md **#5**——「禁复述、持续抗 sprawl / sediment / no-op / duplication」。也是派生工序 ⑤ 结晶治理「不自动回灌、防种子库无人负责地膨胀」的直接根据，以及全仓「指针回指、不二次定义」体例的元规则。

### #6 描述即激活闸

- **一句结论**：skill 的 name + description 是**触发器（trigger）不是摘要（summary）**——决定它能否在对的时机被唤起；模型有「欠触发（under-trigger）」倾向，描述要写成「何时该用它」。
- **出处**：Anthropic《Equipping agents for the real world with Agent Skills》（skill 创作 best-practices）：<https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills>。
- **给本 skill 做依据**：principles.md **#6**——「写成『何时用 X』触发器（正向触发词 + 负向边界 / 反例分流），非『本 skill 做 X』摘要」。

### #7 自包含 · 可移植

- **一句结论**：可移植 / 可分发要求运行期零外部依赖——「一个带 SKILL.md 的文件夹跨平台即装即用」的分发模型，正以「零外部依赖、自包含」为地基。
- **出处**：`npx skills` 跨平台分发模型（Vercel Labs 开放 agent skills 工具）：<https://github.com/vercel-labs/skills>。
- **给本 skill 做依据**：principles.md **#7**（唯一硬约束）——「零运行期外部 skill / 脚本 / 跨会话依赖；改一个 skill 必从它自身长出」。也是 §4 毕业焙烧「蜕掉对底座引用 → 出厂 skill 100% 自包含」的分发学根据。

---

## 二、6 先例借用（被 `derivation-protocol.md` 各「点名见」反向指到）

> 这 6 件是底座**借入的成熟工业 / 社区先例**（design §7.5「借入 6 升级件」）。每条标明它在派生工序的落点。

### 先例 ① superpowers「Match the Form to the Failure」（失败形态）

- **一句结论**：先分类 baseline 的**失败形态**，再据形态选指导形式——给一种失败上保险的写法，对另一种失败会反噬（flat「别做 X」治得了纪律滑坡，治不了产物形状错）。
- **出处**：obra/superpowers，`writing-skills/SKILL.md`：<https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md>。
- **落点**：derivation-protocol **① B「分叉轴 = 失败形态而非 skill 类型」**及其 4 行失败形态表（skips-rule / wrong-shape / omits-element / condition-dependent）。这是「失败形态是小而封闭集」的来源——本工序敢闭合之处。

### 先例 ② mattpocock 机制层（mechanism-layer）

- **一句结论**：给 LLM 的规则要写成**具体可执行的机制 / 指令**（带样例），而非抽象原则或「为什么」的解释——具体机制优于原则陈述。
- **出处**：Matt Pocock《Cursor Rules for Better AI Development》，Total TypeScript：<https://www.totaltypescript.com/cursor-rules-for-better-ai-development>（亦见其 aihero.dev 系列）。
- **落点**：design §7.6「机制层 pass」——7 核**全部按机制层措辞**（type-agnostic by construction）、通用核由 8 收为 7（A1+A2+C7 合并为 #1「自评不可信」），把「最尖的误配」焊进降级支消失。这是 principles.md 全篇「机制层、不贴类型标签」体例的方法论先例。

### 先例 ③ Biome `domains`（嗅探 / 三态）

- **一句结论**：按项目**可观测事实**（用了哪个框架 / 是否需项目级分析）来决定开哪些规则，而非让人贴身份标签；规则有 recommended / 显式开 / 显式关的分态。
- **出处**：Biome `domains`：<https://biomejs.dev/linter/domains/>。
- **落点**：derivation-protocol **① A「嗅可观测证据」**——「读事实、不贴类型标签」（产持久产物吗 / 产全称断言吗 / 落不可逆副作用吗……）。借的是「按事实嗅探、按需开闸」这一确定性归工具（#4）的工业思路。

### 先例 ④ Sentinel 强制力档（advisory / soft / hard）

- **一句结论**：策略的**强制力分三档**——advisory（仅告警、放行）/ soft-mandatory（须过、可留痕 override）/ hard-mandatory（必过、不可越）；档位与策略体本身解耦，由配置方现场指定。
- **出处**：HashiCorp Sentinel《Enforcement Levels》：<https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels>。
- **落点**：principles.md「强制力档取值」表（#1–#7 各默认档）+ derivation-protocol ② 种子库每条派生纪律所带的 `强制力档` + ②「边缘适用者一律降 `advisory`」。这是底座「同一条纪律对不同 skill 处置力度可变、且可现场 override 留痕」的直接借用。

### 先例 ⑤ RuboCop `NewCops: pending`（+ Google arbiter 复核）

- **一句结论**：新规则不自动生效——先以 **`pending`** 入库（默认不启用、只发提示），由显式配置 / 复核决定转正，避免「每次升级新规则突然全开」式无人负责的膨胀；冲突由**仲裁原则 / 角色**裁决（技术事实 > 风格指南 > 工程原则 > 既有一致性）。
- **出处**：RuboCop《Versioning》（`AllCops: NewCops: pending/enable/disable`）：<https://docs.rubocop.org/rubocop/latest/versioning.html>。Google eng-practices《The Standard of Code Review / Resolving Conflicts》（arbiter 仲裁层级）：<https://google.github.io/eng-practices/review/reviewer/standard.html>。
- **落点**：derivation-protocol **⑤ 结晶治理**三件套——`pending`（默认挂起、只对当次审计生效、不自动成全局默认）+ 留痕 + 复核（裁判角色，守 #1 产出 ≠ 裁判）。design 明示这是本方案**唯一没有现成成熟先例**的「结晶」部件，故借 RuboCop 的 pending + Google 的 arbiter 双先例**加治理闸**。

### 先例 ⑥ WCAG 分档 + 部分符合声明（statement of partial conformance）

- **一句结论**：符合性分档（A / AA / AAA，高档含低档全部）；当无法对全集声明全符合时，出一份**结构化「部分符合声明」**，诚实列明哪些未达、为何未达——它是「不符合的声明」，比假装全符合更可信。
- **出处**：W3C WAI《Understanding Conformance》（含 partial conformance statement）：<https://www.w3.org/WAI/WCAG21/Understanding/conformance>。
- **落点**：derivation-protocol **⑥ 盲区声明**——「永不宣称『已覆盖所有 skill 类型 / 所有适用纪律』，改附结构化部分符合声明，逐行列〔未覆盖项 / 理由 / 责任人〕」。这是 #1 + #5「不假装把开放集穷尽」在产物层的落地形态。

---

## 三、URL 核实方式（防幻觉留痕）

- **核实手段**：全部 URL 于 2026-06-26 经 WebSearch 检索命中标题 + 域名比对确认；mattpocock 机制层一条另经 WebFetch 抓取 totaltypescript.com 正文核对了「具体机制优于抽象原则」这一主旨。
- **未复用既有链接的原因**：`skills/codebase-exploration/theory-foundation.md` 全篇为 SAR / code-intelligence 谱系引用（Reflexion / Symphony / Kythe / SCIP 等），与本文件的 7 核 + 6 先例**无重叠 URL**，故无可沿用项，全部独立核实。
- **退链纪律**：Huang et al. 用 arXiv 稳定 abstract 链（id 真实可核）；mattpocock 退到其规范文章页 totaltypescript.com（而非易变的 newsletter 深链）；RuboCop / WCAG / Sentinel / Biome 均用各自官方文档的规范稳定页。无任何编造的精确深链。
- **诚实标注**：#3、#5 据 design §2.1 原文即无外部理论骨，明确标为「设计内生纪律 · 无外部一手源」，不为凑引用而捏造一手源（捏造引用是最严重失败）。

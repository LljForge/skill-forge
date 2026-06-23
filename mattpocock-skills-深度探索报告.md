# `mattpocock/skills` 深度探索报告

> 对 GitHub 项目 **[mattpocock/skills](https://github.com/mattpocock/skills)**（"Skills For Real Engineers"）的全面拆解。
> 探索方法：克隆全量源码 → 逐一深读全部 34 个技能的 `SKILL.md` 与全部辅助文件 → 5 路交叉综合（撰写规范 / 组合依赖 / 哲学定位 / 打包治理 / 反方核验）。所有引文均经过逐字核验。
> 探索日期：2026-06-21 ｜ 仓库版本：`v1.0.1`

---

## 0. 一句话定性

这是 Total TypeScript / AI Hero 作者 **Matt Pocock** 的一套**可分发的 Claude Code 技能插件**：34 个 agent skill，分 6 个桶（bucket），用 `npx skills@latest add mattpocock/skills` 安装。它的核心主张是 **"做真正的软件工程，而不是 vibe coding"**——把《务实程序员》《领域驱动设计》《极限编程》《软件设计哲学》几十年的工程基本功，压缩成"小、可改、可组合、模型无关"的提示词纪律，刻意**反对** GSD / BMAD / Spec-Kit 这类"接管流程"的重型框架。

它最与众不同的地方不是单个技能，而是**整体作为一个相互引用的生态系统**：有自己的元技能（教你怎么写技能）、自己的受控词汇表（带"禁用近义词"列表）、自己的治理不变量（哪些技能必须登记到哪里）、自己的"拒绝需求知识库"（`.out-of-scope/`），以及一条贯穿始终的 `grilling`（盘问）主线。

---

## 1. 项目本质与定位

### 1.1 它解决的 4 个失败模式（README 的核心论证）

README 用"问题 → 引经据典 → 解法"的结构，列出 AI 编码 agent 的四大失败模式，每个都配一句经典著作引文：

| # | 失败模式 | 经典引文 | 解法（技能） |
|---|---------|---------|------------|
| 1 | **Agent 没做我想要的**（对齐/沟通鸿沟） | "No-one knows exactly what they want" — 《务实程序员》 | **盘问会话**：`/grill-me`（非代码）、`/grill-with-docs`（带文档产出）。作者称这是"我最受欢迎的技能…每次要改动都用" |
| 2 | **Agent 太啰嗦**（缺共享语言，"20 个字说 1 个字的事"） | Eric Evans 论 ubiquitous language | **共享语言文档**：`CONTEXT.md` + ADR，内建于 `/grill-with-docs`，由 `/domain-modeling` 维护。README 称其为"本仓库最酷的技术，可能就是它" |
| 3 | **代码不工作**（无反馈回路，"盲飞") | "the rate of feedback is your speed limit" — 《务实程序员》 | **反馈回路**：`/tdd`（红-绿-重构）、`/diagnosing-bugs`（先建反馈回路再假设） |
| 4 | **造出一坨烂泥**（熵增，agent 加速软件腐化） | Kent Beck "Invest in the design every day" + Ousterhout "best modules are deep" | **持续关心设计**：`/to-prd` 先盘问改哪些模块、`/codebase-design` 提供深模块词汇、`/improve-codebase-architecture` 救火（"每隔几天跑一次"） |

收尾定调："Software engineering fundamentals matter more than ever."

### 1.2 反向定位：对抗重型流程框架

README 直接点名三个对手：

> "Approaches like GSD, BMAD, and Spec-Kit try to help by **owning the process**. But while doing so, they **take away your control** and make bugs in the process hard to resolve."

它的反向卖点是四个形容词：**small（小）、easy to adapt（易改）、composable（可组合）、model-agnostic（模型无关，"work with any model"）**，外加一句邀请："Hack around with them. Make them your own."

### 1.3 引用的工程经典谱系

- **《务实程序员》**（Thomas & Hunt）— 用了两次：没人知道自己要什么、反馈速率即速度上限
- **《领域驱动设计》**（Eric Evans）— ubiquitous language → `CONTEXT.md`
- **《极限编程解析》**（Kent Beck）— 每天投资设计；XP 的红-绿-重构是 `/tdd` 的底色
- **《软件设计哲学》**（John Ousterhout）— 深模块；是 `/codebase-design` 和 `/improve-codebase-architecture` 的脊梁；其 "Design It Twice" 章被 `DESIGN-IT-TWICE.md` 直接工程化
- 隐含：**Michael Feathers**（"seam" 缝隙概念）、**Martin Fowler**（微提交重构）

---

## 2. 仓库结构与治理模型

### 2.1 目录全景

```
mattpocock/skills/
├── .claude-plugin/plugin.json   ← Claude Code 插件清单（仅登记 17 个技能）
├── .changeset/                  ← Changesets 版本管理（含 1 个待发布的 triage 变更）
├── .github/workflows/release.yml← push main 自动开 "Version PR" 并打 git tag
├── .out-of-scope/               ← "拒绝需求"知识库（3 个文件）
├── docs/
│   ├── adr/0001-...md           ← 架构决策记录（自己也吃自己的狗粮）
│   └── invocation.md            ← user-invoked vs model-invoked 的权威定义
├── scripts/{link,list}-skills.sh← 本地软链 / 列表脚本
├── CLAUDE.md                    ← 仓库治理规则（桶 + 登记不变量）
├── CONTEXT.md                   ← 仓库自身的领域术语表（吃狗粮：Issue tracker/Issue/Triage role）
├── README.md                    ← 对外门面 + 哲学论证 + 技能索引
└── skills/
    ├── engineering/  (14 个)    ← 日常代码工作
    ├── productivity/ (5 个)     ← 日常非代码工作流
    ├── misc/         (4 个)     ← 留着但少用
    ├── personal/     (2 个)     ← 绑作者个人环境，不对外
    ├── in-progress/  (5 个)     ← 草稿，未成熟
    └── deprecated/   (4 个)     ← 已弃用
```

### 2.2 两条分发渠道（都不走 npm registry）

`package.json` 是 `"private": true`，changeset 是 `access: "restricted"`——**永远不会 `npm publish`**。同一套技能通过两条独立渠道分发：

1. **skills.sh 安装器**（面向用户）：`npx skills@latest add mattpocock/skills`——第三方 CLI 克隆 GitHub 仓库、把技能拷进用户项目。
2. **Claude Code 插件清单**：`.claude-plugin/plugin.json` 用 `skills[]` 数组显式列出 **17** 条相对路径（12 engineering + 5 productivity）。只有列进来的才作为插件技能暴露。

分发**以 GitHub 仓库为中心**：能装什么，取决于 (a) 哪些文件夹存在、(b) 哪些被登记进清单/README。

### 2.3 版本管理：Changesets + GitHub Action

- 工具：`@changesets/cli` + `@changesets/changelog-github`
- 关键配置：`privatePackages: { version: true, tag: true }`——让**私有包**也能被版本化并打 git tag（即使不发 npm）
- 发布流程：push 到 `main` → `changesets/action` 跑 `changeset version` 维护一个 "chore: version skills" 的 **Version PR**，再 `changeset tag`（注意是 **tag 不是 publish**）。所以"发布"= git tag + 版本化 CHANGELOG。
- CHANGELOG 印证迭代节奏：`1.0.0` 是一次大破坏性重构（新增 ask-matt/codebase-design/domain-modeling；删除 caveman/zoom-out；`diagnose`→`diagnosing-bugs`、`write-a-skill`→`writing-great-skills` 改名；术语从 Commands/Skills 改成 User-invoked/Model-invoked）；`1.0.1` 是把 `teach` 改成"复用优先"。

### 2.4 桶（bucket）即治理

CLAUDE.md 规定的**登记不变量**：

> `engineering/`、`productivity/`、`misc/` 里的每个技能**必须**同时出现在顶层 `README.md` **和** `plugin.json`；`personal/`、`in-progress/`、`deprecated/` 里的**绝不能**出现在两者中。

桶的位置就决定了：是否被分发、是否被 `link-skills.sh` 软链到本地、是否受登记检查。`deprecated/` 还被 `link-skills.sh` 额外硬排除。

### 2.5 `.out-of-scope/` —— 维护者的"说不"知识库

每个文件是一条**有据可查的拒绝**，固定结构：标题（边界）+ "Why this is out of scope"（理由）+ "Prior requests"（GitHub issue 编号）。已收录：

- `mainstream-issue-trackers-only.md` — 拒绝小众 issue tracker 后端（每个都是永久维护面，要持续对 to-prd/to-issues/triage 测试）；逃生口是 `local markdown` 和 `other/custom`。来源 **#99**（dex，当时 3 个月 ~300 star）。
- `question-limits.md` — 拒绝给盘问加问题数上限（开放式才是重点；自然语言随时叫停）。来源 **#44**（"Codex 一口气问了我 200 个问题"）。
- `setup-skill-verify-mode.md` — 拒绝给 setup 加 `--verify` 模式（prompt 驱动的 setup 会话里直接说"只核对不重写"即可）。来源 **#106**。

这套 KB 让维护者能"按引用拒绝"重复需求，并且被 `triage` 流程的 `wontfix`/去重逻辑直接消费。

### 2.6 ADR 实践

`docs/adr/0001` 记录的决策本身就很能说明问题：**只给硬依赖技能加 `/setup-matt-pocock-skills` 指针**（`to-issues`/`to-prd`/`triage`——没配置就产出错误结果），软依赖技能（`diagnose`/`tdd`/`improve-codebase-architecture`——缺了只是不够锐利）只用模糊散文提一句。理由是保持 token 轻量、避免到处 cargo-cult。

---

## 3. 核心设计哲学（最值得精读的部分）

整套仓库有一个**元技能** `writing-great-skills` 充当"为什么这些技能长这样"的理论层。它的思想是整个项目的灵魂。

### 3.1 根虚德：可预测性（Predictability）

> "A skill exists to **wrangle determinism out of a stochastic system**."（技能的存在是为了从随机系统里榨出确定性。）

可预测性被**精确定义**为：agent 每次跑都走**同一个过程**，而不是产出同一个输出。一个头脑风暴技能应当"可预测地发散"——token 在变，行为不变。其它一切目标（成本、可维护性）都是它的"症状而非对手"。术语表明确要求**避免**近义词 consistency / reliability / robustness / output-determinism。

### 3.2 两种稀缺资源：上下文负载 vs 认知负载

这是 user-invoked / model-invoked 之分的根本——**一个成本分配选择**：

- **Context Load（上下文负载）**：model-invoked 技能的 description 每一轮都占着上下文窗口（机器的注意力）。
- **Cognitive Load（认知负载）**：user-invoked 技能要靠人记住它存在（"人就是那个索引"）。它**不是要最小化的成本**——"它是人类能动性的代价"。

两者是"粒度的刹车"：model-invoked 多了挤窗口，user-invoked 多了压垮人脑。这直接推导出**为什么需要 router 技能**（`ask-matt`）：因为 user-invoked 技能彼此够不着，多到记不住时就要一个 router 把它们都点名。

### 3.3 user-invoked vs model-invoked（整个体系的中轴）

| | Model-invoked（默认） | User-invoked（`disable-model-invocation: true`） |
|---|---|---|
| 谁能触发 | **模型 或 人**（"model 触发总是包含 user 触发，不存在仅模型态"） | **只有人**敲名字 |
| description | 面向模型，富含触发短语 | 面向人，一行摘要，**剥掉触发词** |
| 成本 | 永久上下文负载 | 零上下文负载，但花认知负载 |
| 能否被别的技能调用 | **能**（有 description 才可被发现/调用）→ 可作"共享引用之家" | **不能**（没 description，谁都够不着）|

**决策法则**（出自 `invocation.md`）："**这个模型有没有可能自己主动伸手去够它？** 能就 model-invoked，只会手动触发就 user-invoked。"（注意："复用"是抽取技能的理由，不是这个判定的标准。）

**拓扑后果**：user-invoked 技能可以调用 model-invoked 技能，但**永远不能调用另一个 user-invoked 技能**。依赖一律用 **`/skill` 散文式调用**（"Run the `/grilling` skill"）表达，**禁止** `../other-skill/FILE.md` 这种跨目录深引用——"共享引用文档住在拥有它的技能里，别人通过调用那个技能去够，而不是跨文件夹连线"。

### 3.4 Leading Word（主导词 / Leitwort）

> "一个已经活在模型预训练里的紧凑概念，agent 跑技能时拿它来思考。"

例：`lesson`、`fog of war`（战争迷雾）、`tracer bullets`（曳光弹）、`tight`（紧）、`red`（红）、`proximal zone of development`（最近发展区）。把它**当 token 反复用、绝不当句子展开**，它就积累出一个分布式定义。它在 body 里锚定**执行**（每次出现都同一行为），在 description 里锚定**调用**（同一个词出现在你的 prompt、文档、代码里，agent 把这门共享语言和技能挂钩、触发更可靠）。

关键告诫："**自造词不调动任何先验——你用定义 token 付了预训练词免费给的东西。先伸手去够现成的词。**"

精彩的"坍缩"示例：把 "fast, deterministic, low-overhead" 坍缩成 **tight**（a tight loop）；把 "a loop you believe in" 坍缩成 **red**（回路在 bug 上变红，或者没有）——把一个模糊的门变成一个二元可观测状态。

### 3.5 No-Op 测试（逐句猎杀）

剪枝（Pruning）一节极其凶狠：

> "逐**句**而非逐行猎杀 no-op：对每一句单独跑 no-op 测试，一旦失败，**删掉整句，而不是从里面修字**。要狠——大多数失败的散文该删，而不是改写。"

no-op 测试本身："它相对默认行为改变了行为吗？"几个关键性质：

- 一行可以**完全相关却仍是 no-op**——相关性和 no-op 正交。
- 它是**相对模型的，不是相对读者的**："两个人争一行是不是 no-op，其实是在争默认行为是什么，靠跑技能解决，不靠辩论。"
- 与主导词交叉：**弱主导词就是一个 no-op**（agent 本来就挺 thorough 时还说 "be thorough"）——修法是换更强的词（`relentless`），不是换技术。

### 3.6 五大失败模式（诊断工具箱）

刻意区分四种"长"的成因：

| 失败模式 | 含义 |
|---------|------|
| **Premature Completion**（过早完成） | 步骤没做完就收尾。一场拔河：可见的后续步骤往前拉，完成判据的清晰度往后拽。**防御有先后**：先磨锐完成判据（便宜、局部），只有当它不可避免地模糊 **且** 你观察到了"赶工"，才把后续步骤藏起来（拆分） |
| **Duplication**（重复） | 同一意思出现 >1 处。是"主导词的意外反面"——主导词靠重复 token 故意抬升注意力，重复 meaning 则是 bug |
| **Sediment**（沉积） | 陈旧的层堆积，"因为加东西感觉安全、删东西感觉危险…是任何没有剪枝纪律的技能的默认命运" |
| **Sprawl**（蔓延） | "技能就是太长了，哪怕每一行都鲜活且唯一"。解药是信息阶梯（披露、按分支/序列拆） |
| **No-Op** | 模型默认就会做的一行——"你付出负载却什么都没说" |

### 3.7 其它锐利的撰写规范

- **信息阶梯**：in-skill step > in-skill reference > external reference，按"agent 多急着用"排序。
- **完成判据**分两个独立属性：**clarity（可核验吗？抗过早完成）** 和 **demand（要求多少？驱动 legwork）**——demand 哪怕在零步骤的纯参考里也能咬合（"每条规则都要应用")。
- **何时拆分**：按**调用**拆（有了独立主导词 / 别的技能要够它）或按**序列**拆（后续步骤诱发过早完成）。注意——藏后续步骤"只在真正的上下文边界（user-invoked 交接 或 子 agent 派发）才有效；inline 的 model-invoked 调用把后续步骤留在上下文里，什么都没清掉"。
- **进度披露**：这个技能自己把全部术语定义披露到 `GLOSSARY.md`，`SKILL.md` 保持可读——**自我示范**它鼓吹的"全参考"扁平排布。

---

## 4. 技能全景（34 个，按桶详解）

> 标注：🧑=user-invoked（只能人敲），🤖=model-invoked（模型可自触发）。"~N 行"为大致体量。

### 4.1 Engineering（14 个，日常代码工作）

**核心工作流技能（user-invoked）**

- **`ask-matt`** 🧑 ~62 行 —— **路由器/索引**，是整套 user-invoked 技能的拓扑图。名言 "You don't remember every skill, so ask." 把技能体系讲成"一条主流 + 两条汇入匝道 + 若干独立工具"，而非平铺菜单。引入 **"smart zone"（~120k token，模型还能锐利推理的窗口）** 概念，把路由决策和模型认知挂钩。金句："`/handoff` forks; `/compact` continues."（handoff 分叉新会话，compact 在原会话续）。
- **`grill-with-docs`** 🧑 ~7 行 —— 极简**组合技能**，整个 body 就一句："Run a `/grilling` session, using the `/domain-modeling` skill." 把"盘问设计"和"产出 ADR+术语表"变成同一个动作。
- **`improve-codebase-architecture`** 🧑 ~191 行 —— 扫描代码库找"加深机会"（把浅模块变深），渲染成**自包含可视化 HTML 报告**（Tailwind+Mermaid+手绘前后对比图，写到临时目录、不污染仓库），让用户选一个再进盘问环。核心信号是 **deletion test（删除测试）**："删掉它会让复杂度聚拢还是只是搬家？'聚拢'就是你要的信号。" 强制用 `/codebase-design` 词汇 + `CONTEXT.md` 领域名词（"the Order intake 模块"，不是 "the FooBarHandler" 也不是 "the Order service"）。语气硬规："The diagrams carry the weight…若一句话能变成 bullet 就变，bullet 能删就删。"
- **`setup-matt-pocock-skills`** 🧑 ~228 行 —— **一次性 per-repo 引导**，是整个工程套件的"配置编译器"。把三个仓库特定变量外化成提交进仓库的文件：issue tracker（gh/glab/.scratch/Other）、triage 标签词汇（5 个规范角色→真实标签字符串映射）、领域文档布局（单/多 CONTEXT）。纪律："一次只问一个决定，别一次抛三个"；"假设用户不懂这些术语"；幂等写入（已有 `## Agent skills` 块就原地更新不追加）。在 seed 模板里编码了真实跨工具怪癖（GitHub issue/PR 共享编号空间所以 `#42` 有歧义；GitLab close 不接受关闭评论）。
- **`to-prd`** 🧑 ~76 行 —— 把**当前对话**合成成 PRD 发到 tracker，打 `ready-for-agent` 标签。身份就是**不访谈**："Do NOT interview the user — just synthesize what you already know." 内嵌固定 PRD 模板；测试缝隙最小化启发式（"用尽可能高的缝隙；缝隙越少越好，理想是一个"）。
- **`to-issues`** 🧑 ~85 行 —— 把计划/PRD 拆成**独立可抓取的 issue**，每个都是**曳光弹垂直切片**（穿透 schema/API/UI/tests 的窄而完整路径），严禁横切。"独立可抓取""ready for AFK agents"——issue 是自治/并行工作单元。防过时规则："避免具体文件路径或代码片段——它们很快过时"，但有精确例外：当片段（状态机/reducer/schema/类型）比散文更精确地编码了一个决策时可内联。
- **`prototype`** 🧑 ~217 行 —— 写**一次性原型**回答一个具体问题。"A prototype is throwaway code that answers a question. **The question decides the shape.**" 二分支：状态/逻辑问题 → 终端 TUI（逻辑封在纯可移植模块里）；视觉问题 → 一条路由下的多个**结构性不同**的 UI 变体（`?variant=` 切换 + 浮动切换条，`NODE_ENV!=='production'` 才显示）。金句："Three slightly-tweaked card grids isn't a UI prototype, it's wallpaper."

**纪律技能（model-invoked，可被自触发/被别的技能调用）**

- **`diagnosing-bugs`** 🤖 ~177 行 —— 6 阶段调试纪律。核心是一个**反转**：在跑出一个"已经至少跑过一次、能在用户确切症状上变红"的命令之前，**禁止形成任何假设**。"Build the right feedback loop, and the bug is 90% fixed." 完成判据要你**粘贴真实已跑过的调用和输出**，不是承诺。含 10 级复现技术阶梯（失败测试 → curl → … → **人在回路 bash** 作最后手段），并带一个真实的 `hitl-loop.template.sh`：用 `step()`/`capture()` 把人当子程序，捕获值以 `KEY=VALUE` 回喂给 agent。打标日志 `[DEBUG-xxxx]` 便于一次 grep 清理。
- **`tdd`** 🤖 ~175 行 —— 严格红-绿-重构，一次一个测试。核心论点：测试要**通过公共接口验证可观察行为**，不验证实现细节——"重命名内部函数若测试挂了，那些测试测的是实现"。把"先写全部测试再写全部代码"命名为**横切**并痛斥（产出"想象出来的行为"的烂测试）。只在系统边界 mock，绝不 mock 自己的代码；通过接口验证（测 `createUser` 用 `getUser`，不要直接查库）。规划期调用 `/codebase-design` 找深模块机会。
- **`domain-modeling`** 🤖 ~133 行 —— **主动**构建/打磨领域模型并记 ADR。靠排除定义自己："仅仅*读* `CONTEXT.md` 取词汇不是这个技能…这个技能是当你*在改*模型时。" 五种并发行为：挑战与术语表冲突的词、把模糊词收敛到规范词、用边缘场景压测关系、拿代码反查用户说法的矛盾。**ADR 三门 AND 测试**（难逆 AND 出人意料 AND 真权衡），不满足就跳过。名言："The explicit no-s are as valuable as the yes-s"（记下被否的方案，挡住下一个工程师"修"掉故意为之的设计）。
- **`codebase-design`** 🤖 ~192 行 —— **共享架构词汇**：Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality，每个都带**禁用近义词**（别说 component/service/API/boundary）。**明确拒绝** Ousterhout 的"实现行数/接口行数"深度比（"奖励往实现里灌水"），改用**深度即杠杆**。名规："One adapter means a hypothetical seam. Two adapters means a real one."（一个适配器是假想缝隙，两个才是真缝隙）。含 DEEPENING.md（四类依赖→测试策略）和 DESIGN-IT-TWICE.md（派 3+ 并行子 agent 各给一个极端不同的设计约束）。

**未登记的"孤儿"技能（⚠️见 §7）**

- **`implement`** 🧑 ~16 行 —— 执行阶段的薄编排：照 PRD/issues 实现，能用 `/tdd` 就用（在预先约定的缝隙），分层验证节奏（频繁 typecheck/单测，末尾跑一次全量），完事用 `/review` 评审，提交到当前分支。**纯委托不重复**。
- **`resolving-merge-conflicts`** 🤖 ~15 行 —— 解决进行中的 merge/rebase 冲突。把冲突当**意图调和**而非文本合并："深入理解每边为什么改"（读 commit/PR/issue）。硬规："不要发明新行为。Always resolve；never --abort。"

#### Engineering 的端到端主流程（出自 ask-matt）

```
STAGE 0  配置（每仓库一次）  setup-matt-pocock-skills
STAGE 1  磨锐想法（一个不中断的上下文窗口）
         grill-with-docs [=grilling+domain-modeling]（有代码库）/ grill-me（无）
         可选岔路：handoff → prototype → handoff
STAGE 2  定规格            to-prd  → PRD 发到 tracker，打 ready-for-agent
STAGE 3  切片              to-issues → 拆成独立曳光弹 issue
         ──在此清空上下文；每个独立 issue 开一个全新 /implement──
STAGE 4  实现（每 issue 全新会话）
         implement ─→ tdd（内部调 codebase-design）
                   └→ review（Standards + Spec 并行子 agent）→ 提交
STAGE 5  入口/养护（匝道与回环）
         triage（处理你没创建的 issue/PR）→ 喂回 STAGE 4
         diagnosing-bugs → 架构性时交给 ↓
         improve-codebase-architecture → 浮现加深机会，回到 STAGE 1
         resolving-merge-conflicts（独立工具）
```

**关键上下文卫生规则**：grill→to-prd→to-issues 留在**同一个窗口**；然后清空、每个 issue 开全新 `implement`。`to-issues` 的产出已经是 agent-ready，所以**不要**对它们跑 `triage`——triage 只处理外部提交的 issue/PR。

### 4.2 Productivity（5 个，非代码工作流）

- **`grilling`** 🤖 ~11 行 —— **盘问引擎**（整个仓库复用最多的行为）。把计划当**决策树**逐枝遍历；**一次一个问题**（"一次问多个是令人困惑的"）；每个问题**附带你推荐的答案**；能从代码库查到的就去查别问人；持续到"达成共识"为止。注意 body 用第二人称对 agent 说话（"Interview me relentlessly"）。
- **`grill-me`** 🧑 ~8 行 —— 一行别名："Run a `/grilling` session." 给引擎一个好记的动词短语命令名 + 显式触发门。
- **`handoff`** 🧑 ~17 行 —— 把当前对话压成**交接文档**给另一个 agent 接力。优化对象是**另一个 LLM 而非人**；反重复（"用路径/URL 引用 PRD/ADR/issue，别复制内容"）；必含 "suggested skills" 段主动给下个 agent 引路；脱敏；写到**系统临时目录而非工作区**。frontmatter 带 `argument-hint`。
- **`teach`** 🧑 ~270 行 —— **有状态多会话教学**，把当前目录变成持久教学工作区（MISSION/RESOURCES/GLOSSARY/NOTES + reference/learning-records/lessons/assets），每个都有专门 FORMAT.md。深植学习科学：**ZPD（最近发展区）** 作目标函数、**fluency vs storage strength**、**desirable difficulty**。金句："Never trust your parametric knowledge."（知识必须来自 RESOURCES.md 的高信任源）"For acquiring knowledge, difficulty is the enemy…For skill acquisition, difficulty is the tool."（难度是按阶段翻转的拨盘）。测验题**每个选项等词长**防泄漏。学习记录是"教学的 ADR"，只在有**真正理解的证据**时才写（"Coverage is not learning"）。
- **`writing-great-skills`** 🧑 ~265 行 —— **元技能**（见 §3 已详述）。供给写技能的词汇和原则，自带 GLOSSARY.md。强自指/自我示范。

### 4.3 Misc（4 个，留着少用）

- **`git-guardrails-claude-code`** 🤖 ~121 行 —— 装一个 Claude Code **PreToolUse hook**（`block-dangerous-git.sh`），在执行前拦截危险 git 命令（push/reset --hard/clean/branch -D…）。脚本读 stdin 的 tool-call JSON、grep `DANGEROUS_PATTERNS` 数组、命中则 exit 2 + stderr 报 BLOCKED。屏蔽信息措辞刻意是**剥夺权威**而非警告："The user has prevented you from doing this."（注：脚本依赖 `jq` 无 fallback，grep 未锚定可能误伤）。
- **`migrate-to-shoehorn`** 🤖 ~119 行 —— 把测试里的 `as` 类型断言迁移到 `@total-typescript/shoehorn`（作者自己的库）。1:1 映射表：`as Type`→`fromPartial()`、`as unknown as Type`→`fromAny()`。"Test code only. Never use shoehorn in production code."
- **`scaffold-exercises`** 🤖 ~107 行 —— 给 AI Hero 课程仓库脚手架出 `exercises/` 目录树 + readme stub，跑私有 linter `pnpm ai-hero-cli internal lint` 直到绿。强耦合私有工具链，不可移植。
- **`setup-pre-commit`** 🤖 ~92 行 —— 配 Husky 预提交钩子（lint-staged + Prettier + typecheck + test）。锁文件探测包管理器；自适应（无 typecheck/test 脚本就省略）；幂等（已有 prettier 配置不覆盖）；最后那个提交本身就是端到端冒烟测试。

### 4.4 Personal（2 个，绑作者环境，不分发）

- **`edit-article`** 🧑 ~16 行 —— 文章编辑。把信息当 **DAG（有向无环图）**，段落顺序须遵守依赖；改前确认结构；硬约束**每段最多 240 字符**。（⚠️有疑似 bug：编号跳到 2a 后没收尾。）
- **`obsidian-vault`** 🤖 ~60 行 —— 操作作者特定 Obsidian 库（硬编码 WSL 路径 `/mnt/d/Obsidian Vault/AI Research/`）。哲学：**无文件夹、纯 wikilink + index 笔记**的知识图谱。

### 4.5 In-Progress（5 个，草稿，未成熟）

- **`decision-mapping`** 🧑 ~85 行 —— 把松散想法变成**研究 ticket 的有序地图**，逐个推进。**"战争迷雾"心智模型**：地图刻意在前沿之外不完整，解决 ticket 把前沿推进一格。每个 ticket 配一个 100K-token agent 会话；硬 STOP 在每个会话边界。（依赖 grilling/domain-modelling/prototype/to-prd。注意 `domain-modelling` 英式拼写不一致。）
- **`review`** 🤖 ~70 行 —— 沿**两条正交轴**评审改动：**Standards**（合不合仓库编码规范）和 **Spec**（忠不忠实于原始 issue/PRD）。两轴跑**并行子 agent**防上下文交叉污染，并排报告**不合并不重排**。三点 diff 比 merge-base；fail-fast 预检；每个子 agent 报告 ≤400 词。"clean code 实现了错的东西 = Standards 过 / Spec 挂"。
- **`writing-beats`** 🤖 ~53 行 —— 把文章当**节拍（beat）之旅**，选择冒险式逐拍写。"The pile is a quarry"（素材是采石场，是挖的不是抄的）；"never write ahead"；每次写前从盘重读保护用户编辑。
- **`writing-fragments`** 🤖 ~76 行 —— 盘问会话挖**碎片**（异质的写作小块），只追加到一个文件当未来文章的原料。"小说家的日记"模型；明确**拒绝**强加结构/大纲。
- **`writing-shape`** 🤖 ~65 行 —— 把一堆原料**逐段塑形**成文章。"This is a grilling session inverted"（盘问的对偶）；每个节拍都**出声争论**用什么格式（段落/列表/表格/callout/引用）；缺料就点名缺口、绝不编造。

### 4.6 Deprecated（4 个，已弃用——能看出作者思路演进）

- **`design-an-interface`** 🤖 ~95 行 —— 派并行子 agent 生成多个**极端不同**的接口设计（Ousterhout "Design It Twice" 工程化）。→ **已被折叠进 `codebase-design` 的 DESIGN-IT-TWICE.md**。
- **`qa`** 🤖 ~131 行 —— 对话式 QA，用户口述 bug、agent 后台 Explore 探代码、用 `gh issue create` 归档**对重构免疫**的用户视角 issue（无文件路径/行号）。"Do NOT ask the user to review first — just file."
- **`request-refactor-plan`** 🤖 ~69 行 —— 访谈出**微提交**重构计划归档为 GitHub issue。直接引 Fowler："make each refactoring step as small as possible, so that you can always see the program working."
- **`ubiquitous-language`** 🧑 ~94 行 —— 从对话抽 DDD 术语表写到 `UBIQUITOUS_LANGUAGE.md`，含"待避别名"列、示例对话。→ **被 `domain-modeling`/`CONTEXT.md` 取代**。

---

## 5. 组合与依赖关系

### 5.1 依赖图（hubs 与 sinks）

**被依赖最多的枢纽（hubs）**：
- **`grilling`** —— 被 grill-me、grill-with-docs、improve-codebase-architecture、triage、decision-mapping 调用（单一最被复用的行为）。
- **`setup-matt-pocock-skills`** —— to-prd、to-issues、triage、review 的配置骨干。
- **`domain-modeling`** —— 被 grill-with-docs、improve-codebase-architecture、triage、decision-mapping 调用。
- **`codebase-design`** —— 被 tdd 和 improve-codebase-architecture 调用。

**叶子（不调用任何技能）**：grilling、domain-modeling（只写文件）、codebase-design、prototype、handoff、resolving-merge-conflicts、teach、writing-great-skills。

### 5.2 "盘问家族"：一个引擎、两个壳、一个组合

| 技能 | 调用 | body | 复用 |
|------|------|------|------|
| `grilling` 🤖 | 自触发 | **全部访谈逻辑**（真相之源） | — |
| `grill-me` 🧑 | 手动 | 一行 "Run a `/grilling` session." | 调 grilling |
| `grill-with-docs` 🧑 | 手动 | 一行 "Run a `/grilling` session, using the `/domain-modeling` skill." | 调 grilling + domain-modeling |

引擎只住一处（grilling），所有人按名字把它拉进来——包括家族外的 improve-codebase-architecture / triage / decision-mapping。

### 5.3 共享设计层

- **`codebase-design`** 供给**架构名词**（Module/Seam/Depth…），被 tdd 和 improve-codebase-architecture 倚重。
- **`domain-modeling`** 供给**领域名词**（维护 CONTEXT.md + ADR），被 grill-with-docs / improve-codebase-architecture / triage / decision-mapping 调用。
- 二者并用："the Order intake 模块" = 领域名词 + 架构名词。很多技能只**被动读** CONTEXT.md/ADR（tdd、diagnosing-bugs、to-issues、to-prd、review）——这种只读习惯**故意不算** domain-modeling 本身。

### 5.4 setup 骨干的依赖不对称

`setup-matt-pocock-skills` 的 `dependsOn` 列的是它的**消费者**（"这些技能读我的产出"），是正常依赖边的**反向**——真正的运行时箭头是 to-prd/to-issues/triage/review **指向** setup。**硬依赖**（没它就产出错误）：to-prd、to-issues、triage、review。**软依赖**（缺了只是不锐利，"缺了就静默继续"）：tdd、diagnosing-bugs、improve-codebase-architecture、domain-modeling。盘问家族和纯词汇层对 setup **零依赖**。

---

## 6. 反复出现的设计模式 / 惯用法

这些跨多个技能复现的"指纹"，是整套设计的精华：

1. **盘问回路（grilling）** —— 一次一个问题的relentless 访谈，作为引擎被到处复用。
2. **ADR + CONTEXT.md 术语表** —— 领域词汇贯穿约 10 个技能；三门 ADR 测试是规范规则。
3. **垂直切片 / 曳光弹** —— to-issues 和 tdd 都强制薄端到端切片、痛斥横切。
4. **深模块 / 缝隙 / 杠杆 / 局部性** —— codebase-design 的闭合词汇（禁用 API/boundary/service），被 improve-codebase-architecture 和 tdd 复用。
5. **产物"持久优于精确"** —— "无文件路径/行号，它们会过时"出现在 triage/to-issues/to-prd/qa/request-refactor-plan，连"原型片段例外"都几乎逐字一致。
6. **自包含 HTML 报告写临时目录** —— improve-codebase-architecture（Tailwind+Mermaid）、teach（课程），共享"写 OS 临时目录、绝不进仓库"护栏（与 handoff 同）。
7. **状态机** —— triage（规范角色 + 标签间接层）、setup（编译标签词汇）。
8. **并行对抗子 agent** —— DESIGN-IT-TWICE、deprecated 的 design-an-interface、review（两轴）。强制发散、禁跨轴排名。
9. **HITL / 写前重读纪律** —— 写作三技能共享"每次写前从盘重读、绝不覆盖用户编辑、只追加"。
10. **薄组合/路由技能** —— ask-matt（路由）、grill-me/grill-with-docs（一行委托）、implement（串 tdd+review）。委托优于重复。
11. **`disable-model-invocation` 作为刻意的杠杆** —— 每个"我现在要做 X"的人面命令都设它；元技能把这理论化为上下文负载 vs 认知负载的权衡。
12. **惰性/幂等文件创建** —— domain-modeling、setup、teach 都"没真东西写就不脚手架""原地更新绝不重复"。

---

## 7. 问题、不一致与风险（务必知道）

### 7.1 登记不变量违例（6 处，已逐一核验）

CLAUDE.md 要求 engineering/productivity/misc 的技能必须同时进 README **和** plugin.json。实际 plugin.json 只登记 17 个（12 engineering + 5 productivity + **0 misc**）：

| 文件夹 | 在 plugin.json | 在 README | 判定 |
|--------|:---:|:---:|------|
| engineering/**implement** | ❌ | ❌ | 违例（完全孤儿） |
| engineering/**resolving-merge-conflicts** | ❌ | ❌ | 违例（孤儿；**有 1.0.0 CHANGELOG 条目宣布过却从未进清单——登记回归**） |
| misc/**git-guardrails-claude-code** | ❌ | ✅ | 违例（缺 plugin.json） |
| misc/**migrate-to-shoehorn** | ❌ | ✅ | 违例（缺 plugin.json） |
| misc/**scaffold-exercises** | ❌ | ✅ | 违例（缺 plugin.json） |
| misc/**setup-pre-commit** | ❌ | ✅ | 违例（缺 plugin.json） |

productivity 5 个、其余 12 个 engineering 干净一致。`personal/`/`in-progress/`/`deprecated/` 正确地未登记。

**含义**：通过 Claude Code 插件清单安装的人，**拿不到任何 misc 技能，也拿不到 `implement` 和 `resolving-merge-conflicts`**——而 `implement` 恰恰是工作流主线 STAGE 4 的入口。（通过 skills.sh 安装则按目录树走，可能不受影响。）

### 7.2 其它小瑕疵

- `teach/SKILL.md` 的工作区文件清单**漏列 GLOSSARY.md**，尽管 GLOSSARY-FORMAT.md 存在且被交叉引用。
- `decision-mapping` 的 dependsOn 用英式 `domain-modelling`，与实际 `domain-modeling` 拼写不一致。
- `edit-article` 编号跳到 2a 后未收尾循环/无最终装配步骤。
- `git-guardrails` 脚本依赖 `jq` 无 fallback，grep 未锚定，可能误伤含 `git push` 子串的命令。
- `obsidian-vault`/`scaffold-exercises` 硬编码私有路径/工具链，不可移植（已正确归入 personal/misc）。

### 7.3 战略性风险（反方核验）

1. **环境耦合很重，削弱了"小/可组合"卖点。** 工程套件其实是一个**紧绑的系统**：大多数技能依赖 setup 生成的 `docs/agents/*.md` + CONTEXT.md + docs/adr/ + issue tracker。你没法干净地单挑 `/to-issues` 或 `/triage`。"可组合"在套件内为真、跨套件较弱。**核心张力**：README 卖"摆脱流程框架"，自己却装了一套（更轻、但真实的）流程脚手架。
2. **"模型无关"实测薄弱。** 重度依赖子 agent 扇出、Agent 工具、~120k "smart zone" 假设——都是按 SOTA 前沿模型校准的。弱模型上盘问/诊断回路大概率退化。
3. **纪律负担/人在回路成本高。** 大量 user-invoked、一次一问、强制审批门——是认真工作的特性，但摩擦高，恰恰是 vibe-coding 吸引力的反面。
4. **成熟度/搅动信号。** 几个有分量的技能（review、decision-mapping）还在 in-progress；4 个 deprecated 显示近期大幅重构。JS/TS 生态偏向明显。
5. **只有鼓励、没有强制（除 git-guardrails 外）。** 核心纪律是模型可以漂移的散文指令，没有 harness 级保证 agent 真的盘问、真的先写失败测试、真的查 CONTEXT.md。可预测性靠 prompt 工艺（"leading words"）求得，天然比 GSD/BMAD/Spec-Kit 的确定性管道软。**Pocock 用确定性换取了控制/适应性**——是个站得住但他没在定位里完全承认的权衡。

---

## 8. 与同类技能集的对比（尤其 Anthropic "superpowers"）

**趋同进化**（各自独立到达同一答案）：
- **先盘问后动手**：Pocock 的 `grilling` ≈ superpowers 的 `brainstorming`。
- **TDD 一等公民**：双方都有 tdd / test-driven-development，红-绿-重构、"测行为不测实现"几乎同教义。
- **禁止跳到假设的调试纪律**：`diagnosing-bugs` ≈ `systematic-debugging`，都把假设形成门控在可复现信号之后。
- **证据先于断言**：Pocock 的完成门 ≈ superpowers 的 `verification-before-completion`。

**Pocock 的真正新颖处**：
1. **文档副产品作为杀手锏** —— CONTEXT.md（ubiquitous language）+ ADR，通过 domain-modeling 织进盘问回路。superpowers 没有真正对应物。这是一个不同的**持久产物**策略，赌"持久、有主见的术语表跨会话复利"。
2. **深模块词汇作为共享依赖** —— codebase-design 的**带禁用近义词的强制术语表**，还**明确拒绝** Ousterhout 的深度=行数比，改用"深度即杠杆"。比任何同类更锐利、更有主见的架构理论。
3. **improve-codebase-architecture 作为周期性养护** —— 带可视化 HTML 报告 + 删除测试，把架构评审当定期卫生回路。
4. **writing-great-skills 作为自觉的元技能** —— 自带严谨词汇（可预测性、上下文负载、主导词、no-op 测试）。这种反身性超过同类。
5. **拓扑/路由器（ask-matt）+ "smart zone"（~120k token）** 把路由决策和模型认知挂钩。

**净评估**：原则上与领域最佳实践高度趋同（先盘问、TDD、纪律化调试、先验证后断言）；真正新颖在于**持久 ubiquitous-language/ADR 产物策略 + 强主见深模块词汇 + 周期性架构养护 + 反身元技能层**。标志性风险是它悄悄重新引入了它所反对的东西——一套耦合、有主见的流程脚手架，只是更轻、由人驾驭而非自动化。**更诚实的定位应是**：不是"无流程"，而是"扎根工程经典、最小化、透明、可 hack、人留在回路里的流程"。

---

## 9. 对 skill-forge 的可借鉴点（结合你的工作）

> 你在做 skill-forge / skill-eval / module-spec-baseline 这类技能工程工具，以下是这套仓库里**可直接迁移**的实践：

1. **受控词汇 + 禁用近义词列表**：给关键概念定一个规范词、列出 `_Avoid_:` 别名。这是对抗"技能漂移"和"AI 啰嗦"的最便宜手段，可直接用在你的 spec-baseline / module-brief 产物里。
2. **no-op 逐句测试 + leading word 坍缩**：作为 skill-eval 的一条**自动审查规则**——"这一句相对默认行为改变行为了吗？没有就删"；"这串形容词能坍缩成一个预训练词吗？"。这是可量化的提示词质量信号。
3. **user-invoked vs model-invoked 的成本框架**：把"上下文负载 vs 认知负载"作为你给技能定 `disable-model-invocation` 的决策法则（"模型有没有可能自己主动够它？"），而不是凭感觉。
4. **`.out-of-scope/` 拒绝知识库**：给你的项目/技能加一个"说不登记表"（边界 + 理由 + 来源 issue），让重复需求按引用拒绝——和你的 `module-spec-baseline` 行为契约思路同源。
5. **登记不变量 + CI 校验**：CLAUDE.md 定了"必须同时进 README + plugin.json"却没有自动校验，结果出了 6 处违例。**教训**：任何"必须保持一致"的不变量都该有脚本/CI 守护，否则必然漂移——这正是 skill-eval 可以补的位。
6. **薄路由器 + 薄组合技能**：用 `ask-matt`（路由）、`grill-me`（一行别名）、`implement`（串联）的模式，把"编排"和"纪律"分离——纪律技能可复用、可被自触发，编排技能薄到只剩委托。
7. **完成判据要可核验**：把"完成"写成能粘贴证据的门（diagnosing-bugs 的"粘贴你已经跑过的命令"），而非"我觉得做完了"。

---

## 10. 附录

### 10.1 技能清单（34）

| 桶 | 技能 | 调用 |
|----|------|------|
| engineering | ask-matt, grill-with-docs, triage, improve-codebase-architecture, setup-matt-pocock-skills, to-issues, to-prd, prototype | 🧑 user |
| engineering | diagnosing-bugs, tdd, domain-modeling, codebase-design | 🤖 model |
| engineering | implement 🧑, resolving-merge-conflicts 🤖 | ⚠️ 未登记 |
| productivity | grill-me, handoff, teach, writing-great-skills | 🧑 user |
| productivity | grilling | 🤖 model |
| misc | git-guardrails-claude-code, migrate-to-shoehorn, scaffold-exercises, setup-pre-commit | 🤖 model（⚠️未进 plugin.json） |
| personal | edit-article 🧑, obsidian-vault 🤖 | 不分发 |
| in-progress | decision-mapping 🧑, review 🤖, writing-beats 🤖, writing-fragments 🤖, writing-shape 🤖 | 不分发 |
| deprecated | design-an-interface 🤖, qa 🤖, request-refactor-plan 🤖, ubiquitous-language 🧑 | 已弃用 |

### 10.2 关键链接

- 仓库：https://github.com/mattpocock/skills
- 安装：`npx skills@latest add mattpocock/skills`
- 安装器目录：https://skills.sh/mattpocock/skills
- 作者 newsletter：https://www.aihero.dev/s/skills-newsletter

### 10.3 探索方法论

克隆 `--depth 1` 全量源码 → 39 个 agent 并发分析（34 个逐技能深读 + 5 路交叉综合：撰写规范、组合依赖、哲学定位、打包治理、反方核验）→ 反方核验确认逐技能摘要"异常忠实、若有偏差是低估而非夸大"，全部金句逐字核对。本报告所有引文均来自源码。
```

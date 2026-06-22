# recon-driven-dev-inline 重构设计 — 融合 superpowers + mattpocock 的自包含流水线工作流

> 状态:设计稿 v2.2(在 v2.1 基础上纳入三透镜复审 + writing-great-skills 评判:缝隙改名/review.md 并回/B4 砍·per-task 闸补回 等已落 spec,其余手艺类发现编入 §12 实施期规则;无遗留阻断;待用户 review 门)
> 日期:2026-06-22
> 方法:基于 `superpowers:brainstorming` 流程,逐阶段与用户共同推导;每条决策均经用户显式批准。

---

## 0. 背景与目标

`skills/recon-driven-dev-inline` 是 `recon-driven-dev` 的**自包含 fork**(②④ 内联、零外部 Skill 依赖)。本次**重构**目标:在保留四阶段骨架精神的前提下,吸收 superpowers 与 mattpocock/skills 两套技能各自的优势,演化成一条**自包含、references 化的流水线式开发工作流**。

**与本次重构对应的两份外部蓝本:**
- **superpowers**:`brainstorming` / `writing-plans` / `executing-plans` / `subagent-driven-development`(下称 sdd)/ `finishing-a-development-branch` / `test-driven-development`。
- **mattpocock/skills**:`to-prd`(测试缝隙)/ `to-issues`(曳光弹切片)/ `codebase-design`(深模块词汇)/ `domain-modeling`(ADR)/ `review`(Standards+Spec)。

---

## 1. 定调与不变量

本次是**重构**:原 Skill 的各类护栏(尤其「薄」charter、「不写长期文档」)**不再是否决权,按「对新 Skill 好不好」逐条判,可丢**(`可丢` = 允许丢、非必须丢;经评估后判定保留的,在 §6 注明来龙去脉)。两类区分:

- **原 Skill 自身护栏** → 降级为「待评估」,谁让新 Skill 更好谁留(逐条处置见 §6)。
- **通用写 skill 手艺**(no-op 测试、单一权威源、渐进披露、leading word)→ 仍作审美应用,理由是「让 Skill 更好」而非「原 Skill 这么规定」。

**唯一不变的硬约束 = `自包含 / 零外部依赖`(`-inline` 的身份)。**
- 它**只挡「真去调用外部 skill」**;`CONTEXT.md`、深模块词汇这类是文件/散文,自己内联写出来不算外部依赖。
- 因此所有吸收 = **把好想法重写成内联契约**,绝不 `调用` superpowers/mattpocock 的技能。
- sdd 的 `scripts/`(task-brief / review-package 等)**只吸收其原则,不引入脚本**。
- **软依赖 + 降级范式**(沿用 ①③):凡需隔离 sub-agent 的能力(①侦查、③评审、⑤的 A2 整支评审、子 agent 实现分支),有隔离能力就派本 Skill 自带 prompt 体、用通用 `Task` 搬运;**无隔离能力则降级主会话自跑同一套契约**。

---

## 2. 新骨架(5 个独立阶段)

原「④ 落地」拆成两个平级独立阶段(④ 写计划、⑤ 实施);③ 评审改为可选。编号沿用 ①②③④⑤。

```
① 定向分析    → directed-report.md          [派 recon-agent]      ⏸ 质量门
② 需求+设计   → requirements.md + design.md  [内联对话 · HARD GATE] ⏸
      └──── ⏸ 评审决策点(A:据 ①② 信号给建议;用户拍板;判据住 requirements-design.md) ────┐
③ 评审(可选) → review.md                   [派 review-agent]     ⏸
④ 写计划      → tasks.md                     [拆任务 · ⏸ 审计划 · 末尾执行方式 ⏸]
⑤ 实施        → 代码 + 归档                  [gates + 非显性陷阱 · 两分支]  ⏸ 收口菜单 → ⏸ 归档
```

流向:`① → ② → (③?) → ④ → ⑤`,线性不回流(唯一例外:事实订正,见 §6)。

---

## 3. 披露模型 C(脊柱 + 渐进披露)

`SKILL.md` 保留**跨阶段的脊柱**,各阶段**细则下沉**到 reference。依据 `writing-great-skills` 的信息阶梯:每条路径都要的(脊柱)inline,只有进到某阶段才用的(细则)披露。

**脊柱(SKILL.md 保留)**:
- 流程图、阶段间衔接与所有 `⏸` 暂停。
- **起步约定**:AI 自定 kebab-case 短名 + 当天日期建 `docs/recon-driven-dev-inline/<YYYY-MM-DD>-<change-name>/`。
- **目录碰撞护栏**(防覆盖的真牙):该目录已存在(活跃或归档)就换名/加后缀,**别覆盖前一次产物**。
- **每阶段统一暂停模板**(✅满意 → 下一阶段 / ✏️需调整 → 告诉我哪里改)。
- 横跨全程的全局护栏(线性不回流 + 事实订正含订正落点映射(① 封存前草稿直接改、不计订正,②③④⑤ 各有落点)+ 修订后的「薄」几条,见 §6)。
- 每阶段一句话职责 + **指向 reference 的指针**;指针措辞点名「非默认的具体动作」(如 ① 行点名「**主会话实测门**(非泛质量门)详见 `directed-analysis.md`」,防模型见标记词就用泛标准过门、不进 reference 取具体动作)。

**披露(references/)**:每个阶段的契约 / 对话规则 / gates / 陷阱 / 判据。

> 上述三项基线能力(起步约定 / 目录碰撞护栏 / 暂停模板)在重构中**原样保留**,inline 在脊柱(每条路径都用),不下沉。

---

## 4. 文件结构

```
recon-driven-dev-inline/
├── SKILL.md                    # 脊柱(见 §3)
├── README.md / CHANGELOG.md
└── references/
    ├── directed-analysis.md    # ① 细则(派发路由 + 主会话实测门 + ①阶段封存/订正边界)
    ├── recon-agent.md          # ① 侦查 sub-agent 本体(已有,冻结不动)
    ├── requirements-design.md  # ② 细则(对话契约 + HARD GATE + 三硬规则 + 两份产物 + design.md 必覆盖清单【唯一权威】 + 评审决策点判据【唯一权威】 + ②自评)
    ├── review-agent.md         # ③ 设计评审 sub-agent 本体(已有,冻结不动;③ 的派发路由并入 SKILL.md 脊柱,不单开 review.md)
    ├── code-reviewer.md        # ⑤ 整支代码评审 sub-agent 本体(新增,A2;契约见 §5⑤)
    ├── planning.md             # ④ 写计划 细则(基线 6 条 + 路 3 分层计划 + 执行方式决策)
    ├── implementation.md       # ⑤ 实施 细则(两分支 gates + 非显性陷阱块)
    └── templates/
        ├── requirements.md     # ② 业务需求模板(已有,§5「非目标」已含)
        ├── review.md           # ③ 评审模板(纯填空,判据归 review-agent.md)
        └── code-review.md      # ⑤ A2 整支评审模板(新增,纯填空:两轴 + per-axis 结论;判据归 code-reviewer.md)
```

命名:content-based、无 `stage-` 前缀;`-agent.md`/`-reviewer.md` 后缀区分「sub-agent prompt 本体」与「阶段细则」。共 **7 个 reference + 3 个 template**;③ 因细则太薄(仅派发路由)不单开文件、并入脊柱(见 §5③),避免 No-Op 文件。

---

## 5. 逐阶段设计

### ① 定向分析 → `directed-report.md`

**决策:原样搬迁,不加料。** 理由:① 是本 Skill 最成熟、最独有的「皇冠」(recon-agent 四样契约 + 软硬分等 + 主会话实测门,两套对手都无对等物)。

- **结构搬迁**:① 细则(派发路由、agent 降级、**主会话实测门**、**① 阶段的封存/订正边界**)→ `directed-analysis.md`;脊柱留 ① 流程行 + `⏸ 质量门` + 一句话职责 + **点名「主会话实测门」的指针**(见 §3)。
- **跨阶段的事实订正总账留脊柱**(§6);`directed-analysis.md` 只持「① 阶段证伪/封存」这一段,不持全程订正落点。
- **`recon-agent.md` 冻结不动。**
- **明确否决**:git 历史侦查信号(否,见 §9)。

### ② 需求 + 设计 → `requirements.md` + `design.md`

**保留(superpowers `brainstorming`,② 已有,经核对全数对齐)**:一次一问(多选优先)/ 2-3 方案带取舍 / HARD GATE / 「太简单」override / 范围分解触发器 / 分节呈现 / ② 轻量自评。

**吸收(mattpocock):**
- **候选 1 · 测试缝隙线**:`design.md` 谈出**测试缝隙**(在哪测、mock 哪里、缝隙越少越好/理想=1),其**确认融入 ② 既有的设计分节确认流**(是分节确认的一节,**不另起独立 `⏸`**,与基线「别在 ② 停点之外再叠一道」相容)。→ 跨阶段焊接到 ⑤(§7)。**测试缝隙即下文「design.md 必覆盖清单」第④要素,是同一条,勿在 ② 内重复落两处。**
- **候选 2 · 深模块设计词汇(精简)**:设计对话用「深模块 / **窄接口** / 深度即杠杆(非行数比)」当**透镜**(源 `codebase-design`)。**用「窄接口」指接口暴露面,绝不复用「缝隙」一词——「缝隙」一词只留给候选 1 的测试缝隙(test seam),一词一义**;两者本就不同轴(一谈架构接口、一谈在哪测),命名分清后无需任何「勿混淆」散文消歧。**可观察落点**:在 `design.md` 的「关键决策」里要求**一句深度/接口自陈**(如「本方案接口暴露面=N、为何算深模块」),落必覆盖清单要素②。**不搬完整词汇表 + 禁用近义词**(理由见 §9)。
- **候选 3 · ADR(中间路线)**:`design.md` 的关键决策按 ADR 精神记「决策 + **被否方案 + 为什么**」(源 `domain-modeling`)。**仍在本次产物目录内、随改动归档,不引入跨会话持久层。**

**`design.md` 结构 = 必覆盖清单(form-flexible,反掉原「design 不设骨架」护栏)**:不规定章节,但**必须覆盖** 4 要素——① 架构/数据流 ② 关键决策 + 被否方案 + 理由(含候选 2 的深度/接口自陈)③ ① 锚定层(要改的契约子集 + 自行补探到 ① 没列的新发现)④ 测试缝隙;**形态按复杂度伸缩**。这是 `writing-great-skills` 的「用 completion criterion 的 demand 轴约束扁平内容('每条都要覆盖'),而非章节骨架」。
- **单一权威源**:必覆盖清单**只住 `requirements-design.md` 一处**(以「检查锚点」式轻量列表呈现,便于 ②自评/④自评/③定向报告验收对照);其余三方一律**以指针引用、不重列**(解原 §11-Q1:呈现形态已定为轻量检查锚点)。

**② 端信号产出义务(链3 的 ② 端,见 §7)**:② 的产物/自评须让以下信号对 ③ 评审决策点**可读取**——① 暴露的协同护栏 / 反直觉陷阱 / `[未核验]`(承自 directed-report),与 ② 的**测试缝隙数 / ADR 决策数 / 爆炸半径**(测试缝隙数、ADR 决策数由必覆盖清单要素④/②承载,爆炸半径由要素③ ①锚定层承载)。否则 §5③「据 ①② 内容给建议」在 ② 侧无据可依。

**结构搬迁**:② 全部细则 → `requirements-design.md`;脊柱留 ② 流程行 + `⏸` + `HARD GATE` 标记词(完整规则住 reference,脊柱只亮牌不复述)。

### ③ 评审(可选) → `review.md`

**内容维持现状**:`review-agent.md` 判据(三维度:完整性/一致性/可实施性 + 定向报告验收 + 三档结论)已成熟,且它是**设计评审**(评 ② 的产物),与 superpowers `requesting-code-review`、mattpocock `review`(均为**实现后**代码评审)不同——那俩对应 ⑤ 的 A2。`review-agent.md` 冻结不动。**否决**:给 review-agent 加「测试缝隙/ADR」探针(三维度已天然涵盖 design.md 全部内容)。

**改为可选(pre-decided)** + **决策点走 A(带推荐)**:在 ② 的 `⏸` 之后插入一个**评审决策点**,skill **据 ①② 内容**给「建议评审 / 可安全跳过」+ 理由,**用户拍板**。
- **判据(信号清单 + 代价提示)单一权威源 = `requirements-design.md` 末尾**(它是 ② 出口、决策点紧随 ②`⏸` 触发、②自评上下文也在此)。脊柱只放一句「据 ①② 信号给评审建议,判据见 `requirements-design.md`」;`review.md` **只管"选了评审后的派发路由"、不持有"要不要评审"的判据**(避免「决定要不要进 ③ 的判据藏在 ③ 才读的文件里」的时序错位)。§7 链3 不复述信号,改为指针。
- 强烈建议评审的信号:① 协同护栏 / 反直觉陷阱 / `[未核验]`;② 触多测试缝隙 / 多个 ADR 决策 / 爆炸半径大。可安全跳过:改动小 / 单测试缝隙 / 无非显性坑。
- **代价提示(写进判据)**:跳过 ③ = 丢掉「定向报告验收」(查 design 有没有静默违反 ① 的坑/护栏),而 ② 自评**不覆盖**这一项——故「① 坑多」被设为强烈建议评审的信号,是有意的安全网。

**结构搬迁**:③ 的派发路由很薄,**并入 SKILL.md 脊柱 ③ 行指针**(与 ① 派发同范式、共用一段「派发/降级」表述,**不单开 `review.md` 文件**——否则就是个只剩两行路由的 No-Op 文件);脊柱里 ③ 流程行标「可选」+ 前置评审决策 `⏸`(其判据指针指向 `requirements-design.md`)。`review-agent.md` 与 `templates/review.md` 不动。

### ④ 写计划 → `tasks.md`

**定位**:原 ④ 落地的「拆 tasks」步,是当前最薄弱点,也是 `writing-plans` + `to-issues` 各有方法论之处。

**基线吸收(无论怎么执行,计划都写这 6 条):**
1. **曳光弹垂直切片**(来源 `to-issues`):每个任务是穿透各层的薄端到端切片、各自可演示/可验,**不按技术层横切**。*极小改动退化*:改动小到一个原子 commit 时,曳光弹退化为单切片(右尺寸原则——只在评审者可能通过 A 驳回 B 处切——自然吸收此情形),不强行套「垂直切片+各自可演示」。
2. **任务右尺寸**(`writing-plans`):任务 =「值得一个新评审者过一道闸的最小单元——只在『评审者可能通过 A 却驳回 B』处切」。
3. **prefactor 先行**(`to-issues`):先让改动变容易,再做容易的改动。
4. **文件结构图**(`writing-plans`):列任务前先映射「建/改哪些文件 + 各自职责」,**按职责切、不按层切**(此「按职责不按层」在 planning.md **单点声明**,基线第 1 条切片引用它、不另说一遍,避免局部 duplication)。
5. **每任务验收标准(checkbox)+ 依赖顺序**(`to-issues`):把「可测」落成验收;blocker 先排。**无占位符 + 可验收 checkbox 是两分支都要的计划卫生底线**(不是路 3 子 agent 才升级——否则内联分支允许占位符计划,会削弱 ④`⏸` 审计划这道最便宜拦截点)。
6. **④ 自评**(对称 ② 自评):**限定「设计↔任务机械对账」**——设计每条 → 有任务接;任务间类型/签名一致。**不复跑 ③ 的深度判据**(那是 ③/code-reviewer 的活,搬进来 = 第二权威源)。

**路 3 · 分层计划(随执行方式升级):**
- 基线 6 条**总写**。
- ④ 结尾加**执行方式 `⏸`**:内联 vs 每任务一个新子 agent(= `writing-plans` 的 execution handoff,把执行选择**前移到 ④ 末**,以便按选择写对计划)。
- **选了子 agent 才把计划升级到自包含**:每任务补 `Interfaces`(Consumes/Produces **精确签名**)+ **任务级完整文件路径**(喂零上下文 per-task 子 agent)。*(注:无占位符已是基线底线,见基线第 5 条;路 3 升级专指 Interfaces 精确签名 + 完整路径。)*

**结构搬迁**:④ 细则 → `planning.md`;脊柱留 ④ 流程行 + `⏸ 审计划` + 执行方式 `⏸`。产物仍叫 `tasks.md`(内容变厚)。

### ⑤ 实施 → 代码 + 归档

**两条执行分支**(④ 末尾选出):

- **内联分支**:沿用现有 gates——clean-baseline / ISOLATE(优先原生 worktree 工具)/ TDD 铁律 / per-task 两阶段评审 / continuous execution / FINISH 闭合菜单 / 归档——**已覆盖 `executing-plans` + `finishing-a-development-branch`**;per-task 两阶段评审(spec 符合 + 代码质量)**与 sdd 的 per-task 两态评审同构,且本 Skill 已落为有序硬闸**。
- **子 agent 分支**:在交接护栏基础上,按下方 B 系列补厚。**per-task 两阶段评审(spec 符合 + 代码质量)作为两分支共有硬闸照常生效**(子 agent 分支由派发的实现/评审子 agent 承担,判据仍住 `implementation.md`、不复述)——别因分支重构静默丢了这道基线闸。

**A3(已锁,跨阶段链)**:TDD 铁律改为「**在 ② 预先约定的缝隙**上写失败测试」。

**两分支通用吸收:**
- **A1 · 计划冲突预检(pre-flight)**(来源 sdd Pre-Flight + `executing-plans`「先批判性审计划」):⑤ 开跑前,做**跨「计划 ↔ 全局约束 ↔ 评审 rubric」的冲突预检**(任务互斥 / 违反全局约束 / **计划强制了评审视为缺陷之物**)。**承重在两个反默认动作**:① **一次批量问**用户(不中途逐条打断)② **扫干净则静默继续**(不汇报)。
  - 与 ④自评的分工:**④自评 = 计划自身完备性**(覆盖/签名,写计划时做);**A1 = 跨计划↔约束↔rubric 的冲突预检**(执行前做)——两者不重叠。
  - 内联分支**同样执行 A1**(执行前的冲突预检与执行方式无关)。
- **A2 · 收尾前整支代码评审**(来源 sdd「broad final review」+ mattpocock `review` 的 Standards+Spec 两轴)。**新增自包含 `code-reviewer.md`**,契约钉死如下:

  | 维度 | 定法 |
  |---|---|
  | 严重度词表 | 发现级复用本 Skill 既有「**阻断/须改/可改**」(与 review-agent.md 同语言,不引第三套词) |
  | 判据两轴(rubric 自住 `code-reviewer.md`,不止给标签) | **Standards 轴(代码质量)**:判代码是否合仓库既有规范;**无文档化规范则退回通用质量基线**(错误处理 / 边界 / DRY 不过度抽象 / 类型安全);**跳过 linter/formatter 已强制项**、不重复报。**Spec 轴(对设计忠实)**:(a) `design.md` 必覆盖清单逐条接住没(缺失/半成)(b) scope creep(造了没要的)(c) 实现与 design 主张矛盾。**spec 源 = 本次 `design.md` / `requirements.md`**(自包含轨无蓝本依赖的 docs/agents/issue-tracker.md,显式切本地产物)。两轴作为**同一 prompt 内两个评审段落**、**不派两个子 agent**(守自包含/轻) |
  | 结论形态(不跨轴 rerank) | **按轴各给一个 per-axis 结论**(Standards 一档 / Spec 一档),并排呈现;阻断/须改/可改在**轴内**用,**不跨轴取最严、不合并成单一总体档**——保留 mattpocock `review` 的「两轴分离」不变量(跨轴合并会让一轴掩盖另一轴) |
  | 输出形态 | 沿用 `review-agent.md` 五段式(角色/入口/出口/判据/边界)+ 回主 agent 简短结论;**填空骨架外置到 `templates/code-review.md`**(与 `review-agent.md`→`templates/review.md` 同构) |
  | 评审范围 | 本次分支 `merge-base..HEAD`;**BASE = 本分支起点 commit**(如 `git merge-base <主干> HEAD`,主干参照按 ⑤ 收口分支态定、**别默认 main**;detached-HEAD / 独立子仓按非显性陷阱块口径)。主会话用**原生 git**(非脚本)取 diff 写文件传路径(复用 B1;**禁落 `.git/`**) |
  | 触发 | FINISH 前**派隔离子 agent 跑自带 `code-reviewer.md`**(通用 `Task` 搬运);**无隔离能力降级主会话自跑判据**(与 §1 软依赖范式对齐)。**派/降级只看隔离能力,与 ④ 选的执行分支(内联/子 agent)正交**——内联执行完、若有隔离能力,A2 照样派独立 reviewer(冷视角防 per-task 漏的跨任务/集成问题) |
  | 回流 | 任一轴的阻断/须改 → 修 → 复评;可改 → 记账本 / 收口菜单前提示 |

**三评审构造的判据分工(防漂移,设计期定死,非留到实现)**:
- `review-agent.md` = **设计期**评 `design.md`(三维度,冻结)。
- per-task 两阶段 = **逐任务**评单任务对设计的符合度(基线 ⑤ gate 5)。
- `code-reviewer.md` = **整支**宽口径代码质量 + spec 符合性(A2)。
- 三者各自唯一权威 prompt 体,SKILL.md / 模板只路由不复述(承自 §6「判据不复述」护栏)。

**子 agent 分支吸收(原则非脚本,守自包含):**
- **B1 · 产物以文件交接,不靠粘贴**(sdd「File Handoffs」):任务 brief / 实现报告 / diff 都**写成文件传路径**,不粘进派发 prompt(粘贴物会常驻主控上下文、每轮重读)。**不引入 sdd 的 `scripts/`,自己写文件;文件一律落本次产物目录、禁落 `.git/`**(规避 harness 保护路径写禁)。
- **B2 · 不替评审者预判**(sdd):派评审子 agent 时绝不写「别报 X / 这条最多算 Minor」,让评审者自己提、再裁。
- **B3 · 持久进度账本(收)**(sdd「Durable Progress」):已完成任务记进**本次产物目录**的账本文件,抗 compaction。**生命周期:随产物目录一起归档**(与「per-change scratch」「不跨会话持久」自洽)。**陷阱块补一条**:账本是 git-ignored scratch,丢弃档 / `git clean -fdx` 会清掉,需从 `git log` 恢复;**禁落 `.git/`**。
- **B4 · 按角色选模型(砍为一句提及)**(sdd「Model Selection」):派子 agent 时**若 harness 支持则显式指定模型**(否则继承会话默认的最贵模型)——仅此一句;**不展开三级映射**(增量低、为「薄」让路),无此能力时自然失效。
- **B5 · 结构化实现者四态协议**(`DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`):**不收**——现状「卡住别静默重派、换上下文/模型/更小任务」已抓住精髓,四态协议比收益重。

**结构搬迁**:⑤ 细则(两分支 gates + 非显性陷阱块)→ `implementation.md`;脊柱留 ⑤ 流程行 + `FINISH ⏸` + `归档 ⏸`。**非显性陷阱块原样保留**(worktree 检测假阳性 / `.worktrees` gitignore / 收口顺序 / 清理 provenance / 丢弃打字确认 / TDD 反合理化红旗 / 独立子仓 / false-① -premise pause),**新增账本 scratch 一条**(见 B3)。

---

## 6. 全局护栏(修订后,住脊柱)

- ✅ **报告必须落「发现」**(落点现状 / 实答 / 锚点)—— 保留。
- ✅ **`① → ② → (③?) → ④ → ⑤` 线性不回流**,各阶段在出口守住自己产物质量 —— 保留(流向更新为 5 阶段)。
- ✅ **事实订正(线性不回流的唯一例外,跨全程,总账住脊柱)**—— 保留并**重映射到 5 阶段**:directed-report 封存后任何环节用证据推翻其一条事实主张,就地追加订正块、原文标 `[已订正]`;**落点**——②③ 阶段证伪在对应 `⏸` 落、**④ 写计划 / ⑤ 实施途中**推翻 → 主会话落订正块、动摇设计就暂停 surface(④ 复用 ⑤ 的 false-premise pause 范式);① 封存前为草稿、直接改不计订正;核验与落订正由主会话做,评审 sub-agent 只记进 review.md。
- ✅ **起步约定 / 目录碰撞护栏 / 暂停模板** —— 三项现有能力**原样保留**(§3 脊柱清单已枚举)。
- ✅ **「薄」降级为审美**(非否决权);其「防膨胀」职能由**实施期单路径承载软上限**接替(见 §12-F);❌ 表逐条复核(下)。
- ❌ **别给定向分析加判断规则表 / 检索套路** —— 保留(① 仍原样搬迁、保持薄)。
- ❌ **别让半成品报告进 ②** —— 保留(① 质量门真卡)。
- 🔁 **`design.md` 的结构约束改为「必覆盖清单(demand 轴)」**,不用章节模板也不再「完全无骨架」(修订原「别套死骨架」护栏,见 §5②);清单单一权威源在 `requirements-design.md`。
- ❌ **别把判据复述进 SKILL.md / 模板**(单一权威源)—— 保留;覆盖 `review-agent.md`(三维度)、**per-task 两阶段判据(住 `implementation.md`,承基线 ⑤ gate 5)**、`code-reviewer.md`(两轴)、评审决策点判据(住 `requirements-design.md`)、design.md 必覆盖清单(住 `requirements-design.md`)——各有唯一家,SKILL.md / 模板只路由不复述。
- ❌ **别把 provenance / 借鉴出处写进 agent 本体**(`recon-agent.md` / `review-agent.md` / `code-reviewer.md`)—— 保留,出处归 CHANGELOG。
- ❌ **别让评审 sub-agent 替 ① 重做系统钻取** —— 保留。
- 🔁 **④⑤ 的实现步骤本 Skill 内联拥有,不委托外部技能**(自包含)—— 保留并扩展到 ④⑤ 两阶段;本次新增的吸收**全部是内联重写**,未引入任何外部 skill 调用或脚本。
- 🔁 **不引入跨会话持久件 / 不发持久编号** —— 原「不读/不写长期文档」护栏**经 §1 降级评估后,判定保留其「不跨会话持久」精神**(故明确否决项目级持久 `CONTEXT.md`/ADR,见 §9);**B3 进度账本为本次产物目录内 per-change scratch、随归档,不在此约束内**(非跨会话持久件)。

---

## 7. 跨阶段链(衔接物,三条均两端落点)

1. **② 测试缝隙 → ⑤ TDD**:② 端在候选 1 / design.md 必覆盖清单第④要素焊死;⑤ 端在 A3「在 ② 预先约定的缝隙上写失败测试」消费。
2. **④ 执行方式 → ⑤ 分支**:④ 端在末尾执行方式 `⏸` 选出内联/子 agent + 决定计划是否升级自包含;⑤ 端据此走对应分支(§5④/§5⑤)。
3. **①② 信号 → ③ 决策点**:**② 端**在 §5② 的「② 端信号产出义务」兑现(让信号可读);**③ 端**在评审决策点消费(判据住 `requirements-design.md`,本节不复述、仅指针)。

---

## 8. 吸收来源对照

| 吸收点 | 来源 | 落点 |
|---|---|---|
| 一次一问 / 2-3 方案 / HARD GATE / 范围分解 / 分节呈现 / 自评 | superpowers `brainstorming` | ②(已有) |
| 测试缝隙 + 与用户确认 | mattpocock `to-prd` | ② design.md → ⑤ TDD |
| 深模块 / 窄接口 / 深度即杠杆(精简透镜 + 自陈落点) | mattpocock `codebase-design` | ② design 对话 + design.md 关键决策 |
| ADR「决策+被否方案+为什么」(中间) | mattpocock `domain-modeling` | ② design.md |
| 曳光弹垂直切片 / prefactor / 验收 + 依赖序 | mattpocock `to-issues` | ④ 基线 |
| 任务右尺寸 / 文件结构图(按职责切) / 自包含任务(Interfaces) / 计划自审 / execution handoff | superpowers `writing-plans` | ④ 基线 + 路 3 |
| 内联执行 gates / 收口 | superpowers `executing-plans` + `finishing-a-development-branch` | ⑤ 内联分支(已覆盖) |
| 冲突预检 / 整支终评 / 文件交接 / 不预判 / 进度账本 / 按角色选模型 | superpowers sdd | ⑤ A1/A2/B1/B2/B3/B4 |
| 整支代码评审 Standards+Spec 两轴 | mattpocock `review` | ⑤ A2(`code-reviewer.md`) |
| 信息阶梯 / 渐进披露 / no-op / 单一权威源 / leading word | mattpocock `writing-great-skills` | 全局方法论(§3/§6) |

---

## 9. 明确否决清单(防 scope creep)

- ❌ **项目级持久 `CONTEXT.md` / ADR 库**:与「单次改动即时轨 / 用完即弃」定位冲突。仅取 ADR「记下被否方案」的精神进**本次** design.md(§5②候选 3 中间)。
- ❌ **`codebase-design` 完整词汇表 + 禁用近义词**:其价值在「跨技能共享语言一致」,本 Skill 是自包含单体、收益有限;只取已在模型预训练里的 leading word(深模块/缝隙)。
- ❌ **B5 结构化四态协议**:比收益重。
- ❌ **① 引入 git 历史侦查信号**:让 ① 变重、与「薄」冲突。
- ❌ **给 `review-agent.md` 加测试缝隙/ADR 探针**:三维度已涵盖。
- ❌ **引入 superpowers 的 `scripts/`**(task-brief / review-package):破坏自包含;只吸收其「以文件交接」原则。
- ❌ **真去调用任何外部 skill**:违背唯一硬约束。

---

## 10. 非目标 / 不在本次范围

- 不改 `recon-agent.md` / `review-agent.md` 的判据语义(冻结)。
- 不引入跨会话/跨改动状态。
- 不追踪上游 `recon-driven-dev` 演进(冻结快照定位不变)。
- 不做定量 benchmark;本次定位为**结构重构 + 能力吸收**,诚实定性为工程收益。

---

## 11. 原开放问题处置(已收敛)

- **Q1(design.md 必覆盖清单呈现形态)** → 已定:轻量「检查锚点」式列表,单一权威源在 `requirements-design.md`(§5②/§6)。
- **Q2(code-reviewer.md 与 review-agent.md 分工)** → 已定:三评审构造判据分工 + code-reviewer.md 契约锚点(§5⑤)。
- **Q3(B3 账本与归档关系)** → 已定:账本随产物目录一起归档,陷阱块补 scratch 护栏(§5⑤ B3 / §6)。

> 无遗留开放问题;若 review 门发现新空洞再回填。

---

## 12. 实施期 writing-great-skills 合规规则(写 SKILL.md + references 时逐条落实)

> 这些发现**只能对真实散文/真实文件落实**,在设计稿上空谈无意义。写每个文件时照做,落地后**对真实的 SKILL.md + references 再跑一轮 writing-great-skills 终评**。本附录属设计稿、不进 Skill 正文(故不增 Skill 的 Sprawl)。

**A. Context Pointer 措辞硬规则(wgs#2)** —— 所有指向 must-have reference 的脊柱指针,措辞都须**点名该 reference 里的非默认具体动作**(非类别词),否则弱指针 + must-have 目标 = 变量 bug。逐一兑现:
- ① 指针点「主会话实测门(非泛质量门)」(§3 已示范);
- ③ 决策点指针点「跳过 ③ 会丢**定向报告验收**这个代价」;
- 链3 ② 端指针点「产出哪几个具体信号(协同护栏 / `[未核验]` / 测试缝隙数)」。

**B. Co-location · 事实订正归位(wgs#5)** —— 「① 封存/订正边界」收进脊柱 §6 事实订正块(它是该概念在 ① 的一条 caveat),`directed-analysis.md` 用指针引;**别把单一概念劈在两层阶梯上**。

**C. provenance / no-op 护栏扩到全文件(wgs#6)** —— 「别把出处 / 借鉴 / §交叉引用写进可执行正文」从「仅 agent 本体」**扩到全部落地文件**(脊柱 + 所有 reference);出处只进 CHANGELOG。落地时逐行跑 no-op 测试:删掉它行为变不变,不变即删(本设计稿里密集的「承基线 gate5」「与§1对齐」等自指注释**绝不可**抄进 Skill 正文)。

**D. code-reviewer.md / A2 契约补全(三透镜轮 4 须改)** ——
- **自描述边界行**:`code-reviewer.md` 与 `review-agent.md` 完全同构,含开头那条「从『## …』起为 prompt 体、blockquote 元注释不喂 agent」的自描述行(派发态/降级态双消费靠它);
- **Spec 轴四要素尺**:四要素作为 `design.md` **自身的检查锚点会被写进每份 design.md**,Spec 轴只核「design.md 自带锚点逐条接住没」——尺随产物走、不构成第二权威源;
- **per-task 两阶段评审两分支共有**(已在 §5⑤ 子 agent 分支补回);
- **A2 BASE 兜底**:未起独立分支(用户拒隔离 / 原地执行)时,A2 的 BASE = ⑤ 开跑前记录的起点 commit(承 B3 账本),而非默认 `merge-base main`。

**E. 完成判据 / no-op 收尾(wgs niceToHave)** ——
- A2 **复评**给 checkable 终止判据(只核销上一轮标记的阻断/须改 delta,不重开全轴扫描);
- `code-reviewer.md` Standards 轴通用基线逐句 no-op 测试,只留真·反默认动作(仓库既有规范优先、跳过 linter 已强制项);
- 候选 2「深度/接口自陈」落地时升级为**可检查**(逐项列)或干脆砍掉(只留有 ⑤TDD 真实下游的候选 1);
- 「① 出口必有一道实测门、不拖下游」这条**不变量留脊柱**(动作细则可下沉);
- 落地确认旧「完全无骨架」表述被**真删除**,不与新「必覆盖清单」并存(防自相矛盾 sediment)。

**F. Sprawl 总量验收(wgs#3,接替「薄」的刹车)** —— 落地后对每条 branch(内联 / 子 agent)**实测单次 run 实际载入的 reference 行数**,设一个「单路径承载」软上限;超了就回头评 B 系列里增量价值偏低项(如 B4)能否再降级。**不新增 router**(单技能不到那量级)、**不预防性拆 ⑤ 内部**(反增 Sprawl)。

# recon-driven-dev 整改 · 批次 B（阶段状态机）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **本 plan 只覆盖批次 B。** 整改共 6 批(0/A/B/C/D/E),按 writing-plans 的 Scope Check「一批一计划、各自可独立测试」拆分。批次 A 的 plan 在同目录 `plan.md`;批次序、证伪宿主与各批范围见 `design.md` §13;跨批进度见 `progress.md`;批次×spec§×文件×回归验证×验收对照见 `batch-map.md`。**批次 C/E 的 plan 待本批实跑证伪后就地写,批次 D 待真实 Codex trace。**

**Goal:** 把 recon-driven-dev 的五阶段流转从「线性不回流」口号固化成一台**状态机**——每个状态与用户选择只有一个合法下一状态、消除「不得回流」与「必须回写②」的矛盾、让 compaction 后能仅据 run-state 与产物机械恢复当前阶段。

**Architecture:** 纯 Skill 文档编辑(改 Skill 自己)。落地 design §8 五阶段状态机 + §7 per-change 状态模型;不新建文件,改 6 个运行文件(SKILL.md + 4 个阶段 reference + runtime-contract.md)与 1 个模板(run-state.md)。无可跑的自动化测试;"验证" = 锚点 grep + `MAINTAINING.md` 7 条改后验证 rubric(含消费者映射)+ **批次 B 单宿主实跑**(Claude Code 跑一个会触发「③有条件通过」的任务,验回流收敛与老直线路径均未坏)。各阶段状态转移判据单一权威落对应 reference、脊柱只亮当前态与合法下一态。

**Tech Stack:** Markdown(`skills/recon-driven-dev/`);核验用 `grep` / `git`。

## Global Constraints

逐条来自已获批 `design.md`(同目录)与 `skills/recon-driven-dev/MAINTAINING.md`,每个任务隐含遵守:

- **自包含性【唯一硬约束】**:不引入任何外部 skill 调用 / 脚本 / 跨会话持久件依赖。run-state.md 仍是 per-change、随本次产物目录走、归档即弃(design §7)。
- **单一权威源(design §8 纲)**:各阶段状态转移判据的唯一家在对应 reference——①→`directed-analysis.md`、②③→`requirements-design.md`(+ ③ 判据本体在 `review-agent.md`)、④→`planning.md`、⑤→`implementation.md`;§7 通用状态模型(枚举语义 + compaction 恢复口径)住 `runtime-contract.md`。**SKILL.md 脊柱只亮当前态与合法下一态、不复述转移表**(design §8 开头单一权威纲)。
- **分层归位**:运行流转落脊柱/reference、通用状态模型落 runtime-contract、字段落模板、治理规则落 MAINTAINING。
- **薄账(design §4.3)**:`runtime-contract.md` 新增的「状态模型」段属**按需读**(compaction 恢复 / 任务续接时才读),不进起步常载两段;脊柱状态亮牌只加「当前态 + 合法下一态」一行量级、不搬转移表。
- **批次 B 边界**:本批只落 **design §8 定义的状态机 + §7 状态模型**。**IP-R02(⑤ 续做/修订后 design 信号尾·tasks·review 三处失同步)不并入本批**——它留打磨轨 BACKLOG#2 第三面(2026-07-13 定,见 progress.md)。⑤ 的实施顺序细节(clean-baseline/verification-mode 等)属**批次 C**,本批不动 `implementation.md` 除「受控回路不改 ⑤ 既有闸」的确认外的内容。Codex 相关仍属**批次 D**。
- **诚实定性**:本批是**运行行为变更**(改了 ①封存时机、②③闭合、③回流、④审批顺序),CHANGELOG 须如实标注;跨宿主效果本批不宣称(design §17)。
- **顺带闭合 BACKLOG#7**:design §8.2 明确「残留未核验」定义(核销表未证据关闭 + 仍影响决策),正是 BACKLOG#7(残留 `[未核验]` 计数语义无定义)的对口修法——本批落地即闭合 BACKLOG#7,须在 CHANGELOG 记出列、并从 BACKLOG 删该条(收尾 Task B7)。

---

### Task B1: ① 封存序——用户批准后才封存（directed-analysis.md + SKILL.md）

**Files:**
- Modify: `skills/recon-driven-dev/references/directed-analysis.md`（「封存边界」段，末段）
- Modify: `skills/recon-driven-dev/SKILL.md`（「事实订正」段封存句，约第 138 行）

**Interfaces:**
- Consumes: 无（① 阶段自身状态流）。
- Produces: ① 阶段状态流 `recon-draft → main-gate-passed → user-approved → sealed`（design §8.1）落 directed-analysis.md 为单一权威。封存时机从「过主会话实测门即封存」后移到「用户批准后才封存」。下游 B6 的 run-state 状态模型引用此为 ① 的 phase-specific 转移。

- [ ] **Step 1: directed-analysis.md 封存边界改为「用户批准后封存」**

`references/directed-analysis.md` 找到「封存边界」段现文（`**过门即封存**:报告一过这道门进入 ②,`directed-report.md` 视为封存。过门前它还是草稿、就地直接改、不计订正;封存后…`），把封存时机后移、写清 ① 的四状态流：

```markdown
## 封存边界（① 状态流 · 单一权威）

① 的状态流:**recon-draft → main-gate-passed → user-approved → sealed**(design §8.1)。

- 主会话实测门通过 = `main-gate-passed`,此时**先把报告交用户审阅、尚未封存**。
- 用户要求修改 → 回 `recon-draft`,改后**重过实测门**(不是直接改完就进②)。
- 只有**用户批准后**(`user-approved`)才把 `directed-report.md` 封存(`sealed`)。
- 封存前(含 `main-gate-passed` 待用户审阅期)它还是草稿、就地直接改、不计订正。
- 封存后任何环节用证据推翻它写下的一条事实主张,走「事实订正」——**全程订正总账(各阶段落点 + 范式)见 SKILL.md「事实订正」,本文不持全程落点**。
```

- [ ] **Step 2: SKILL.md 事实订正段封存句对齐**

`SKILL.md`「事实订正」段找到 `directed-report 一过 ① 质量门进入 ②,即视为**封存**。` → 改为 `directed-report 经**用户批准**进入 ②(① 状态流 sealed,见 `directed-analysis.md` 封存边界),即视为**封存**。`

同段末尾 `**① 封存前** directed-report 还是草稿、**直接改不计订正**(此即 ① 阶段的封存边界,`directed-analysis.md` 用指针引、不另持一份)。` 保持不变（它已是指针式、单一权威在 directed-analysis）。

- [ ] **Step 3: 锚点核验 + 单一权威自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "recon-draft → main-gate-passed\|用户批准后\|经\*\*用户批准\*\*进入" skills/recon-driven-dev/references/directed-analysis.md skills/recon-driven-dev/SKILL.md
grep -c "recon-draft → main-gate-passed → user-approved → sealed" skills/recon-driven-dev/references/directed-analysis.md
```
Expected: 状态流四态串**只在 directed-analysis.md 出现一次**（脊柱只指针、不复述状态流）；SKILL.md 封存句已含「用户批准」。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/directed-analysis.md skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): 批次B-① 封存序改为用户批准后才封存

design §8.1:recon-draft→main-gate-passed→user-approved→sealed;主会话实测门过后
先交用户审阅、用户批准才封存,要求修改则回 recon-draft 重过门。状态流单一权威落
directed-analysis,SKILL 事实订正句只对齐封存时机、指针引。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B2: ②批准闭合 + ③决策顺序 + 未核验核销表（requirements-design.md + SKILL.md）

**Files:**
- Modify: `skills/recon-driven-dev/references/requirements-design.md`（必覆盖清单 + 评审决策点判据两处）
- Modify: `skills/recon-driven-dev/SKILL.md`（② 段 ⏸ 与「评审决策点」段，约第 90–94 行）

**Interfaces:**
- Consumes: ① 封存产物（B1）。
- Produces: ② 阶段状态流 `requirements/design-draft → user-approved → review-decision`（design §8.2）；`design.md` 必覆盖清单新增「未核验项核销表」（原条目/当前状态/证据/是否仍影响决策）；「残留未核验」的机械定义（**闭合 BACKLOG#7**）。B3 的回流处置消费本任务定义的 `user-approved` 与核销表。

- [ ] **Step 1: 必覆盖清单加「未核验项核销表」（design §8.2）**

`references/requirements-design.md`「`design.md` 必覆盖清单」四要素后，追加第 ⑤ 项：

```markdown
- **⑤ 未核验项核销表** —— 把 `directed-report` 里带进 ② 的 `[未核验]` 逐条列成表,每条记:**原条目 / 当前状态(已证据关闭 / 仍未核验)/ 证据(file:line 或查询)/ 是否仍影响当前设计判断**。这张表是「残留未核验」计数的唯一账(定义见下「评审决策点判据」),②自评、③定向报告验收都据它核。
```

- [ ] **Step 2: 评审决策点判据里钉死「残留未核验」定义（闭合 BACKLOG#7）**

同文件「评审决策点判据」段，在「强烈建议评审的信号」前插入定义句：

```markdown
**「残留 `[未核验]`」的机械定义(单一权威 · 消解计数漂移)**:指 `directed-report` 中**尚未在必覆盖清单⑤核销表被证据关闭、且仍影响当前设计判断**的条目——按此口径数,不是 raw `[未核验]` 标记总数(已被 ADR 令其无关的、已升 `[实测]` 的都不计)。DP1 决策点消费的「残留数」以此为准、可对核销表逐条对账。
```

- [ ] **Step 3: SKILL.md ②③ 顺序闭合——两份未批准前不问③**

`SKILL.md` 找到 ② 段 `**⏸** 两份产出后暂停让用户过目;别在这道停点之外再叠一道。` → 改为亮出 ② 状态流与闭合规则：

```markdown
**⏸ ②(状态流:requirements/design-draft → user-approved → review-decision)**:两份产出后暂停让用户**批准或退修**;**两份未获用户批准前,不问是否跳过③**。可在同一条消息呈现两个有序选择,但语义必须是——**先批准 / 退修设计;仅当已批准,才决定是否评审**。别在这道停点之外再叠一道。
```

- [ ] **Step 4: 锚点核验 + 单一权威自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "未核验项核销表\|残留 \`\[未核验\]\`」的机械定义\|requirements/design-draft → user-approved → review-decision" skills/recon-driven-dev/references/requirements-design.md skills/recon-driven-dev/SKILL.md
```
Expected: 核销表(清单⑤)与残留定义**只在 requirements-design.md 各一处**；SKILL.md ② 段含状态流串 + 「未批准前不问③」。人工确认残留定义未在别处重复（BACKLOG#7 的计数语义只此一家）。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/requirements-design.md skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): 批次B-②批准闭合 + 未核验核销表(闭合 BACKLOG#7)

design §8.2:②状态流 draft→user-approved→review-decision;两份未批准前不问③,同消息
两选择语义先批准设计再决定评审。必覆盖清单加⑤未核验核销表,评审决策点钉死「残留
[未核验]」机械定义(核销表未关闭+仍影响决策)——顺带闭合 BACKLOG#7 计数语义漂移。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B3: ③ 回流受控回路 + 两轮上限（requirements-design.md + SKILL.md）

**Files:**
- Modify: `skills/recon-driven-dev/references/requirements-design.md`（新增「③ 结论回流处置」段）
- Modify: `skills/recon-driven-dev/SKILL.md`（③ 段 ⏸，约第 100–102 行）

**Interfaces:**
- Consumes: ③ 评审 sub-agent 产出的三档结论 + 修订清单（`review-agent.md` 判据⑤，本批不改其判据）；② 的 `user-approved` 与核销表（B2）。
- Produces: ③ 三档→合法下一状态的受控回路（design §8.3），含两轮上限。`review-agent.md` 只判不控（维持现状：输出三档，不做回流编排）；回流编排判据单一权威落 requirements-design.md（它是 ②③ 闭合的家）。

- [ ] **Step 1: requirements-design.md 新增「③ 结论回流处置」段**

`references/requirements-design.md` 文末追加（回流编排是 ②③ 闭合的活、判据住此；`review-agent.md` 仍只输出三档、不控回路）：

```markdown
## ③ 结论回流处置（受控回路 · 单一权威）

评审 sub-agent 回三档结论后,主会话据下表处置(每档只有一个合法下一状态):

| ③ 结论 | 合法下一状态 |
|---|---|
| 通过 | 进入 ④ |
| 有条件通过 | 回 ② 修订 requirements/design → 用户重新批准 → 复评(再派评审 sub-agent) |
| 不通过 | 必须回 ② 修订或经用户终止,**不得直接进入 ④** |

**③→② 是正式受控回路**(不再受「线性不回流」口号排斥;脊柱口号已改写为「线性主干 + 受控回路(仅③→②、≤2 轮)」)。但**「把关不堆下游」底线不动**:受控回路只允许 ③ 把**设计层修订**退回 ②,**仍保留「③ 不替 ① 重做系统钻取」禁令**(全量摸底是 ① 的活、评审 sub-agent 只对正在判的主张做定点源码核验、不回流补摸)。

**两轮上限**:同一轮评审最多**自动修订 / 复评两次**;第三次仍未清零则**暂停**,把未清项、证据与选择(继续修 / 降范围 / 终止)交用户。轮次记进 run-state 的「修订/复评轮次」字段。
```

- [ ] **Step 2: SKILL.md ③ 段 ⏸ 亮牌回流受控回路**

`SKILL.md` 找到 ③ 段 `它产 `review.md` + 三档结论(通过 / 有条件通过 / 不通过)+ 修订清单,回主 agent 一段简短结论。判据全住 [`references/review-agent.md`]…后两档不自动分流,在下面这道 `⏸` 由用户据修订清单定是否回写 ② 改设计。` → 改为亮出受控回路 + 两轮上限指针：

```markdown
它产 `review.md` + 三档结论(通过 / 有条件通过 / 不通过)+ 修订清单,回主 agent 一段简短结论。**判据**全住 [`references/review-agent.md`],**三档→合法下一状态的受控回路 + 两轮上限**住 [`references/requirements-design.md`]「③ 结论回流处置」,脊柱不复述:通过→④;有条件通过 / 不通过→回 ② 修订、用户重新批准、复评(仅 ③→②、≤2 轮),第三次未清零暂停交用户。**③ 仍不替 ① 重做钻取**(见全局护栏)。
```

- [ ] **Step 3: 锚点核验 + 单一权威 / 派发-降级自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "③ 结论回流处置\|两轮上限\|受控回路" skills/recon-driven-dev/references/requirements-design.md skills/recon-driven-dev/SKILL.md
grep -c "自动修订 / 复评两次\|≤2 轮\|最多" skills/recon-driven-dev/references/requirements-design.md
```
Expected: 回流处置表 + 两轮上限**只在 requirements-design.md 出现（判据一处）**，SKILL.md ③ 段是指针式亮牌。人工确认 `review-agent.md` 未被改（它只判不控，回流编排不属 sub-agent prompt）。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/requirements-design.md skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): 批次B-③ 回流受控回路 + 两轮上限

design §8.3:通过→④;有条件通过/不通过→回②修订→重新批准→复评(仅③→②、≤2轮),
第三次未清零暂停交用户。回流编排判据落 requirements-design(②③闭合的家),review-agent
维持只判不控,脊柱指针亮牌。保留「③不替①重做钻取」禁令。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B4: ④ 六步顺序——执行方式前移、用户只批最终形态（planning.md + SKILL.md）

**Files:**
- Modify: `skills/recon-driven-dev/references/planning.md`（「分层计划」与「⏸ 执行方式决策」两段，重排为 §8.4 六步）
- Modify: `skills/recon-driven-dev/SKILL.md`（④ 段两道 ⏸，约第 104–111 行）

**Interfaces:**
- Consumes: ③ 通过后的 design（B3）。
- Produces: ④ 六步顺序（design §8.4）：生成基线结构 → 选执行方式 → 定稿 tasks → 子 agent 补 Interfaces → 机械对账 → 用户批准最终计划。用户只批**最终执行形态**、不批半成品。⑤ 消费定稿后的 tasks.md（本批不改 ⑤ 顺序，属批次 C）。

- [ ] **Step 1: planning.md 落 ④ 六步顺序**

`references/planning.md`「分层计划(随执行方式升级)」段与其后的「⏸ 执行方式决策」段，重写为一条明确的六步序（把「选执行方式」前移到定稿/对账之前、「用户批准」置最后）：

```markdown
## ④ 顺序（design §8.4 · 用户只批最终形态）

基线六条是「每部分怎么写」;它们之上的**停点顺序**是:

1. **生成基线任务结构**(基线六条:曳光弹切片 / 右尺寸 / prefactor / 文件结构图 / 验收+依赖 / ④自评的**结构**先立)。
2. **⏸ 选执行方式**:**内联**(主上下文逐任务跑)vs **每任务一个新子 agent**。前移到定稿之前,是为了按选择把计划写对——选了子 agent,计划要升级到自包含。这个选择同时决定 ⑤ 走哪条执行分支。
3. **按选择定稿 tasks.md**:选内联→基线六条即够;选子 agent→每任务补 `Interfaces`(Consumes/Produces 的精确签名:函数名、参数与返回类型)+ 任务级完整文件路径。
4. **子 agent 模式补精确 Interfaces 与完整路径**(内联模式跳过)。
5. **机械对账**(④自评):设计每条→有任务接;任务间引用的类型/签名/文件名一致。**限机械对账、不复跑 ③ 的深度判据**(方案好坏是 ③/整支评审的活,搬进来 = 第二权威源)。
6. **⏸ 用户批准最终计划**:用户只批准**最终执行形态**的 tasks.md,不批准后置升级前的半成品计划。

> 无占位符 + 可验收 checkbox 是两条执行分支都要的计划卫生底线(见基线第 5 条),不是子 agent 才升级;内联分支若允许占位符计划,会削弱这道最便宜拦截点。
```

（原「基线计划六条」小节标题与六条内容保留在其上方不动；本段替换的是原「分层计划」+「⏸ 执行方式决策」两段。）

- [ ] **Step 2: SKILL.md ④ 段两道 ⏸ 重排（执行方式在前、批最终计划在后）**

`SKILL.md` 找到 ④ 段两条 ⏸（`- **⏸ 审计划**——写码前最便宜的拦截点,审过再往下。` 与 `- **⏸ 执行方式**:计划末尾选…`），重排为「先选执行方式、后批最终计划」：

```markdown
细则(基线计划六条 / ④ 六步顺序 / 分层升级)见 [`references/planning.md`](references/planning.md)。脊柱亮两道停点的**顺序**:

- **⏸ 执行方式**(先):基线结构立好后选**内联** vs **每任务一个新子 agent**——按选择把计划写对(子 agent 要自包含),并决定 ⑤ 走哪条执行分支。
- **⏸ 审最终计划**(后):对定稿+对账后的**最终 tasks.md** 审批,写码前最便宜的拦截点。**用户只批最终执行形态、不批半成品**(六步顺序住 reference)。
```

- [ ] **Step 3: 锚点核验 + 阶段衔接自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "④ 顺序（design §8.4\|用户只批\|⏸ 执行方式\|⏸ 审最终计划" skills/recon-driven-dev/references/planning.md skills/recon-driven-dev/SKILL.md
```
Expected: planning.md 六步序在位、执行方式为步 2、用户批准为步 6；SKILL.md ④ 段 ⏸ 顺序为「执行方式 → 审最终计划」。人工确认脊柱只亮顺序、六步细则住 planning.md（不复述）。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/planning.md skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): 批次B-④ 六步顺序(执行方式前移、用户只批最终形态)

design §8.4:基线结构→选执行方式→定稿→补Interfaces→机械对账→用户批准。执行方式
⏸ 前移到定稿之前(按选择写对计划),用户批准置最后、只批最终执行形态不批半成品。
六步住 planning.md,脊柱只亮两道⏸顺序。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B5: 脊柱「线性不回流」口号改写（SKILL.md）

**Files:**
- Modify: `skills/recon-driven-dev/SKILL.md`（流程图下方流向句第 30 行、全局护栏第 131 行）

**Interfaces:**
- Consumes: B3 定义的受控回路（③→②、≤2 轮）。
- Produces: 脊柱口号从「线性不回流」改写为「线性主干 + 受控回路(仅③→②、≤2 轮)」（design §4.2/§8.3），消除口号与受控回路的矛盾；「③ 不替 ① 重做钻取」禁令保留不动。

- [ ] **Step 1: 流程图下方流向句改写**

`SKILL.md` 找到 `流向:`① → ② → (③?) → ④ → ⑤`,**线性不回流**(唯一例外:事实订正,见末尾全局护栏)。` → 改为：

```markdown
流向:`① → ② → (③?) → ④ → ⑤`,**线性主干 + 受控回路**——回路仅 `③ → ②`(设计层修订、≤2 轮,判据见 `requirements-design.md`「③ 结论回流处置」);事实订正是另一条跨全程例外(见末尾全局护栏)。
```

- [ ] **Step 2: 全局护栏「线性不回流」句改写**

`SKILL.md` 全局护栏找到 `**各阶段在出口守住自己产物的质量、不把把关堆到下游**——③ 不打回 ① 补摸底,② 的盲区 ② 自己探。(`① → ② → (③?) → ④ → ⑤` 线性不回流见上方流程图;唯一例外是下方「事实订正」。)` → 改为：

```markdown
**各阶段在出口守住自己产物的质量、不把把关堆到下游**——② 的盲区 ② 自己探;**③ 只把设计层修订退回 ②(受控回路、≤2 轮),仍不打回 ① 补摸底**(全量摸底是 ① 的活)。(主干 `① → ② → (③?) → ④ → ⑤` 线性,`③ → ②` 是唯一受控回路见上方流程图;事实订正是另一条跨全程例外,见下方。)
```

紧邻的 `❌ **别让评审 sub-agent 替 ① 重做系统钻取**…` 行**保留不动**（③ 不回流补摸底的禁令单一权威在此）。

- [ ] **Step 3: 锚点核验 + 矛盾消解自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "线性不回流" skills/recon-driven-dev/SKILL.md ; echo "exit=$?（期望无输出 / exit=1）"
grep -n "线性主干 + 受控回路\|③ → ②.*唯一受控回路\|受控回路(仅③→②\|受控回路、≤2 轮" skills/recon-driven-dev/SKILL.md
```
Expected: `线性不回流` 全清（无残留旧口号）；新口号「线性主干 + 受控回路」在流向句与护栏各一处。人工确认：与 B3 的「有条件通过/不通过→回②」不再矛盾（design §13 完成判据「不再同时出现不得回流与必须回写②的矛盾」）。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): 批次B-改写「线性不回流」口号为线性主干+受控回路

design §4.2/§8.3:流向句与全局护栏的「线性不回流」→「线性主干 + 受控回路(仅③→②、
≤2轮)」,消除与 B3 受控回路的矛盾;保留「③不替①重做钻取」禁令不动。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B6: IP-R03 状态模型落地——兑现 run-state 已埋指针（runtime-contract.md + run-state 模板）

**Files:**
- Modify: `skills/recon-driven-dev/references/runtime-contract.md`（新增「per-change 状态模型」段，按需读）
- Modify: `skills/recon-driven-dev/references/templates/run-state.md`（末句指针确认可解析）

**Interfaces:**
- Consumes: B1–B4 定义的各阶段 phase-specific 状态流（① 在 directed-analysis、②③ 在 requirements-design、④ 在 planning）。
- Produces: runtime-contract.md 的「per-change 状态模型」段（design §7）——通用状态枚举语义 + compaction 恢复口径，作为 run-state 模板「语义与合法转移由 runtime-contract 持有」那句指针的**落地目标**（关闭 IP-R03 的悬空指针）。**注**：这里只放**通用枚举语义 + 恢复口径**；各阶段的 phase-specific 转移表仍住对应 reference（B1–B4），runtime-contract 不复制（守 design §8 单一权威）。

- [ ] **Step 1: runtime-contract.md 新增「per-change 状态模型」段（按需读）**

`references/runtime-contract.md`「路径事实」段之后、隔离/dirty 段之前，插入状态模型段（标明是**按需读**、不进起步常载；照 design §7）：

```markdown
## per-change 状态模型（按需读:compaction 恢复 / 任务续接时读）

run-state.md 是本次变更的运行状态(非跨项目长期上下文)。字段 `phase`(①–⑤)与 `state` 组成一个状态点。

**`state` 枚举语义**(通用、跨阶段一致):

| state | 语义 |
|---|---|
| draft | 当前 phase 的产物在写、未过本阶段质量门 |
| gated | 过了本阶段质量门、待用户批准 |
| user-approved | 用户已批准本阶段产物 |
| superseded | 本版被回流修订取代(如 ③ 有条件通过后回 ② 的旧版设计) |
| completed | 五阶段走完、已归档 |
| aborted | 用户中止 |

**各阶段的 phase-specific 合法转移**(谁的下一态是谁)住对应 reference,本段**不复制**:① 见 `directed-analysis.md` 封存边界(recon-draft→main-gate-passed→user-approved→sealed);②③ 见 `requirements-design.md`(②状态流 + ③ 结论回流处置、≤2 轮);④ 见 `planning.md`(六步顺序)。

**compaction 恢复口径**:恢复后只据 run-state 的 `phase` + `state` + 已落盘产物机械判断当前位置——`phase` 定在第几阶段,`state` 定该阶段处于草稿/待批/已批/被取代,对照该阶段 reference 的转移表取合法下一步;不靠会话记忆。用户中止(`aborted`)时给保留草稿 / 归档草稿 / 删除本次未提交产物三个显式选项,破坏性删除仍需明确确认。
```

- [ ] **Step 2: run-state 模板末句指针确认可解析**

`references/templates/run-state.md` 末句现为 `> 字段的**语义与合法转移**由 `../runtime-contract.md`(路径 / 状态)与各阶段 reference 持有;本模板只提供写入位。` —— 现在 runtime-contract 已有「状态模型」段承接，指针可解析。**核对 `state` 字段行的枚举**（模板第 8 行 `<draft | gated | user-approved | superseded | completed | aborted>`）与 Step 1 状态模型表的六个枚举**逐字一致**（防 `complete`/`completed` 这类漂移）；不一致则以状态模型表为准改模板。指针句本身无需改（目标已落地）。

- [ ] **Step 3: 锚点核验 + 薄账 / 单一权威自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "per-change 状态模型\|compaction 恢复口径\|本段\*\*不复制\*\*\|本段.*不复制" skills/recon-driven-dev/references/runtime-contract.md
# 枚举一致性:两处都应列出同样六个 state
grep -o "draft | gated | user-approved | superseded | completed | aborted" skills/recon-driven-dev/references/templates/run-state.md skills/recon-driven-dev/references/runtime-contract.md
```
Expected: 状态模型段在位、含「本段不复制」的单一权威声明（转移表仍在各阶段 reference）；模板与状态模型的六个枚举逐字一致。人工确认：状态模型段在起步常载两段（能力握手 + 路径事实）**之外**、标了「按需读」（薄账不破）。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/runtime-contract.md skills/recon-driven-dev/references/templates/run-state.md
git commit -m "fix(recon-driven-dev): 批次B-IP-R03 状态模型落地、兑现 run-state 悬空指针

design §7:runtime-contract 新增「per-change 状态模型」段(按需读)——通用 state 枚举
语义 + compaction 恢复口径,承接 run-state 模板『语义与合法转移由 runtime-contract
持有』那句原本悬空的指针。各阶段 phase-specific 转移表仍住对应 reference、本段不复制
(守 §8 单一权威);模板 state 枚举与状态模型逐字对齐,消 complete/completed 漂移。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B7: 批次 B 收尾（7 rubric + CHANGELOG v0.6.0 + BACKLOG#7 出列 + 单宿主实跑）

**Files:**
- Modify: `skills/recon-driven-dev/CHANGELOG.md`（顶部新增批次 B 条目 v0.6.0）
- Modify: `skills/recon-driven-dev/BACKLOG.md`（删 #7、记出列）
- Update: 同目录 `progress.md`（批次 B 行标 done + 记实跑 trace 路径）

**Interfaces:**
- Consumes: Task B1–B6 全部改动。
- Produces: 批次 B 的 CHANGELOG 条目 + BACKLOG#7 出列留痕 + 一次单宿主实跑证伪记录 + progress.md 状态推进。

- [ ] **Step 1: 过 MAINTAINING 改后验证 rubric（批次 B 相关条 + 消费者映射）**

按 `MAINTAINING.md`「改后验证 rubric」逐条核，结论记进 commit message：
- **A1 自包含**【硬约束】:无外部 skill/脚本;状态机全内联 → 应通过。
- **A2 单一权威**:① 状态流仅 directed-analysis、②③闭合+回流仅 requirements-design、④六步仅 planning、通用状态模型仅 runtime-contract;SKILL 脊柱只亮当前态+合法下一态。**消费者映射**:改了 ①封存时机 → SKILL 事实订正句按名对齐;改了口号 → 流向句+护栏两处;残留定义 → DP1 判据消费。逐一确认无漏、无第二处判据。
- **A3 分层归位**:流转落脊柱/reference、通用状态模型落 runtime-contract、字段落模板 → 应通过。
- **A4 派发-降级对称**:③ 评审派发/降级未动(review-agent 只判不控);受控回路是主会话编排、与派发正交 → 应通过。
- **A5 阶段衔接·不回流**:主干线性未破;新增 `③→②` 是**受控回路**(≤2 轮、仅设计层)、与「③不打回①」禁令并存不矛盾(design §13 完成判据核对) → 应通过。
- **B1 可执行性**:状态流/回流表/六步序均为可机械判断的转移 → 应通过。
- **B2 单路径承载**【防膨胀】:脊柱净增 = 各阶段一行状态亮牌 + 口号改写(不增行);runtime-contract 状态模型段属**按需读**、不进常载。**完整字节核账仍留批次 E §4.3 兑现** → 本批标「结构就绪、待 E 兑现」。

任一条不过 → 回对应 Task 就地修，改完重跑本步。

- [ ] **Step 2: 顶部插入批次 B CHANGELOG 条目 v0.6.0**

`CHANGELOG.md` 顶部（v0.5.9 正上方）插入：

```markdown
## v0.6.0 — 整改批次 B:阶段状态机(①封存序 + ②③闭合 + ③回流 + ④审批 + 两轮上限 + 口号改写)

**what**:
- ① 封存序:recon-draft→main-gate-passed→user-approved→sealed,主会话实测门过后先交用户审阅、用户批准才封存(design §8.1)。
- ② 批准闭合:状态流 draft→user-approved→review-decision,两份未批准前不问③;必覆盖清单加⑤未核验核销表,钉死「残留[未核验]」机械定义。
- ③ 回流:三档→合法下一状态受控回路(通过→④;有条件通过/不通过→回②修订→重新批准→复评),两轮上限、第三次暂停交用户(design §8.3)。
- ④ 六步顺序:执行方式⏸前移到定稿之前、用户批准置最后、只批最终执行形态(design §8.4)。
- 脊柱「线性不回流」口号→「线性主干 + 受控回路(仅③→②、≤2轮)」,消除口号与回流矛盾;保留「③不替①重做钻取」禁令。
- IP-R03:runtime-contract 新增「per-change 状态模型」段(按需读),兑现 run-state 模板原本悬空的状态转移指针。

**why**:修 design §1 的流程闭环根因——「线性不回流」口号与「③有条件通过须回写②」互斥、①封存时机早于用户批准、compaction 后无机械恢复口径。各阶段转移判据单一权威落对应 reference、脊柱只亮当前态+合法下一态。

**顺带**:闭合 BACKLOG#7(残留[未核验]计数语义无定义)——design §8.2 的核销表+残留定义正是其对口修法。

**诚实定性**:**运行行为变更**(①封存/②③闭合/③回流/④审批顺序);跨宿主效果本批不宣称。守自包含 + 单一权威(转移判据各归其家、脊柱不复述)。B2 薄账结构就绪、完整核账待批次 E。
```

- [ ] **Step 3: BACKLOG#7 出列**

`BACKLOG.md` 删除「## 7. ② 向评审决策点产出的『残留 `[未核验]` 计数』无定义…」整条，在其位置或变更区留一行出列留痕：`#7(残留 [未核验] 计数语义无定义)→ 2026-07-13 整改批次 B 落地 design §8.2 核销表+残留机械定义出列,详见 CHANGELOG v0.6.0。`

- [ ] **Step 4: 批次 B 单宿主实跑证伪（回归验证，见 batch-map.md 批次 B 行）**

在 Claude Code(单宿主可验)拿一个**会触发「③有条件通过」的任务**跑一遍五阶段,重点观测:
1. **回流收敛**:③ 有条件通过 → 回 ② 修订 → 重新批准 → 复评,≤2 轮内收敛;第三次未清零真的暂停交用户;
2. **老直线路径未坏**:一个 ③ 直接通过的简单任务仍能 ①→②→③→④→⑤ 顺跑;
3. **口号矛盾已消**:全程无「既要回写②又不得回流」的自相矛盾指令;
4. **④ 审批顺序**:执行方式在定稿前选、用户批的是最终 tasks.md;
5. **compaction 恢复**:中途按 run-state 的 phase+state 能机械判断当前阶段与合法下一步。

把实跑监督笔记落 `docs/recon-driven-dev-eval/<date>-batchB-<task>/`,路径记进 progress.md 批次 B 行。**发现退化 → 只回退批次 B、不动其他。**

- [ ] **Step 5: Commit + 推进 progress.md**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/CHANGELOG.md skills/recon-driven-dev/BACKLOG.md docs/superpowers/recon-driven-dev-remediation/progress.md
git commit -m "docs(recon-driven-dev): 批次B 收尾——CHANGELOG v0.6.0 + BACKLOG#7 出列 + 实跑留痕

过 MAINTAINING rubric(批次B相关条,B2 结构就绪待E兑现);BACKLOG#7 出列(design §8.2
核销表+残留定义落地);单宿主实跑证伪已记 progress。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（写完计划后自查）

**1. Spec coverage**（对 design §13 批次 B 范围 + 完成判据）：
- 修①封存顺序 → Task B1 ✓（recon-draft→main-gate-passed→user-approved→sealed）
- 闭合②批准与③决策 → Task B2 ✓（②状态流 + 未批准前不问③ + 核销表 + 残留定义）
- 明确③回流 → Task B3 ✓（三档→下一状态受控回路）
- 调整④最终计划审批 → Task B4 ✓（六步、执行方式前移、只批最终形态）
- 给回路加两轮上限 → Task B3 ✓（≤2 轮、第三次暂停）
- 改写脊柱「线性不回流」口号、保留「③不替①重做钻取」禁令 → Task B5 ✓
- 完成判据「每个状态和用户选择只有一个合法下一状态」→ B1（①四态）+ B3（③三档表）+ B4（六步）✓；「不再同时出现不得回流与必须回写②的矛盾」→ B5 口号改写 + B3 受控回路，B5 Step3 显式核对 ✓；「compaction 后能仅据 run-state 与产物恢复当前阶段」→ B6 状态模型 + 恢复口径，B7 Step4 实跑第 5 点验 ✓
- IP-R03（批次 B 范围内的额外输入）→ Task B6 ✓；BACKLOG#7 顺带闭合 → Task B2 落地 + B7 出列 ✓
- 无遗漏。IP-R02 明确划归打磨轨 BACKLOG#2（Global Constraints 已声明），非本批漏项。

**2. Placeholder scan**：无 TBD/TODO 作为交付内容；每个编辑步给出精确锚点（当前文串 → 目标文串）+ 新增段全文。`<下一版本号>` 已具体化为 v0.6.0（CHANGELOG 顶为 v0.5.9）。✓

**3. Type consistency**：状态枚举贯穿一致——run-state 模板第 8 行的 `draft|gated|user-approved|superseded|completed|aborted` 与 B6 状态模型表六枚举逐字同（B6 Step2 显式核对）；① 四态串 `recon-draft→main-gate-passed→user-approved→sealed` 在 B1 定义、B6 状态模型段引用同串；「受控回路(仅③→②、≤2 轮)」措辞在 B3/B5/CHANGELOG 一致。✓

---

## Execution Handoff

批次 B plan 就绪。执行由用户在需要时启动。两种执行方式（写码时选）：
1. **Subagent-Driven（推荐）**——每任务派 fresh 子 agent + 两阶段评审。
2. **Inline Execution**——本会话内按 executing-plans 批量执行、checkpoint 复审。

**批次 B 跑完并单宿主实跑证伪后**，再回来就地写批次 C 的 plan（见 progress.md「下一步」）。批次 C = 实现与验证契约（task-agent/reviewer + 三 verification-mode + 终态快照/复评 + BASE=START_SHA）。

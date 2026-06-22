# recon-driven-dev-inline 重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 `superpowers:subagent-driven-development`(推荐)或 `superpowers:executing-plans` 逐任务实施。步骤用 checkbox(`- [ ]`)跟踪。
> **内容权威 = 设计稿** [`docs/superpowers/specs/2026-06-22-recon-driven-dev-inline-refactor-design.md`](../specs/2026-06-22-recon-driven-dev-inline-refactor-design.md)(下称 SPEC)。本计划**不重复粘贴文件正文**(那会与 SPEC 重复、违反 DRY);每个任务指向 SPEC 的权威小节作内容来源,本计划只负责**任务切分 + 文件间接口 + §12 落实 + 逐文件验收门**。

**Goal:** 把 `skills/recon-driven-dev-inline` 从「四阶段全内联 SKILL.md」重构为「五阶段、披露模型 C(脊柱 + references)、融合 superpowers + mattpocock 优势」的自包含流水线工作流。

**Architecture:** SKILL.md 收为跨阶段脊柱(流程图 + 全局护栏 + ⏸ + 指针);各阶段细则下沉 references/;新增 ④ 写计划、⑤ 实施两阶段及 A2 整支评审(`code-reviewer.md`)。冻结 `recon-agent.md` / `review-agent.md` / `templates/{requirements,review}.md`。

**Tech Stack:** 纯 Markdown(agent skill);无构建/无单测套件——「测试」= 对真实散文跑 §12 规则自检 + 机械 grep + writing-great-skills 终评 + dogfood 干跑。

## Global Constraints(每个任务隐含包含)

- **唯一硬约束 = 自包含/零外部依赖**:不 `调用` 任何外部 skill、不引入 sdd 的 `scripts/`;所有吸收 = 内联重写。(SPEC §1)
- **全程简体中文**(项目 `principles.md`)。
- **披露模型 C**:每条路径都要的 → 脊柱 inline;只某阶段用的 → references 下沉。(SPEC §3)
- **单一权威源**:每个判据/清单恰一个家,SKILL.md / 模板**只路由不复述**。(SPEC §6)
- **冻结不动**:`references/recon-agent.md`、`references/review-agent.md`、`references/templates/requirements.md`、`references/templates/review.md`——**任何任务都不得修改这 4 个**。
- **缝隙一词一义**:「缝隙」只指**测试缝隙**;接口暴露面用「**窄接口**」。(SPEC §5②)
- **§12 实施期 wgs 规则全程适用**:A 指针措辞硬规则 / B 事实订正归位 / C provenance·no-op 护栏扩全文件 / D code-reviewer 契约 4 项 / E 完成判据收尾 / F 单路径承载软上限。(SPEC §12)
- **产物目录命名空间**:`docs/recon-driven-dev-inline/`(skill 运行期产物,与本计划无关)。

## §12-C 红线(贯穿所有写文件任务)

设计稿里的自指注释(`承基线 gate5`、`与§1对齐`、`解原§11-Q1`、`复用 B1`、`wgs#x`、`§5⑤` 等)是**给设计稿审查者看的 provenance**,**绝不可出现在任何 skill 落地文件**。出处只进 CHANGELOG。每个写文件任务的验收都含这条 grep:

```bash
grep -nE '承基线|与\s*§|解原|复用\s*B[0-9]|wgs#|§[0-9]|候选\s*[123]|路\s*3|A[12]\b|B[1-5]\b' \
  skills/recon-driven-dev-inline/SKILL.md skills/recon-driven-dev-inline/references/*.md
# 期望:无命中(命中即 provenance/编号泄漏进正文,删之——只保留行为指令)
```

---

### Task 1: SKILL.md 脊柱骨架 + 全局护栏

**Files:**
- Rewrite: `skills/recon-driven-dev-inline/SKILL.md`(现 147 行,全内联 → 脊柱)
- Frozen(不碰): references/ 下 4 个冻结文件

**Produces(后续任务消费的接口):**
- 5 阶段流程图与编号(① 定向分析 / ② 需求+设计 / ③ 评审·可选 / ④ 写计划 / ⑤ 实施);
- **指针措辞规约(§12-A)**:每个指向 must-have reference 的脊柱指针都点名该 reference 里的**非默认具体动作**——后续每个阶段任务的 reference 必须命名与指针一致的锚;
- **「派发/降级范式」共用表述**(① 与 ③ 共用,见 SPEC §1 软依赖);
- 全局护栏文本(线性不回流 / 事实订正总账含 ②③④⑤ 落点 + ① 封存前不计 / 修订后「薄」+ §12-F 软上限提法);
- 三项基线能力 inline:起步约定 / **目录碰撞护栏** / 暂停模板(SPEC §3,原样保留)。

**Steps:**
- [ ] **1. 起草脊柱**:照 SPEC §2(骨架)+ §3(脊柱清单)+ §6(全局护栏)写 SKILL.md——流程图、阶段一句话职责 + ⏸、全局护栏、三项基线能力、各阶段指向 references 的指针(此刻 references 尚未建,指针先按规约写好,后续任务建文件兑现)。
- [ ] **2. §12-A 自检**:逐个指针确认措辞点名「非默认具体动作」(① 点「主会话实测门(非泛质量门)」;③ 决策点点「跳过会丢定向报告验收」;链3 ②端点「产出协同护栏/`[未核验]`/测试缝隙数」)。类别词指针一律改写。
- [ ] **3. 事实订正落点(§12-B)**:总账落脊柱、覆盖 ②③④⑤ 各落点(④/⑤ 途中推翻→主会话落订正块、动摇设计暂停 surface),① 封存前草稿不计;directed-analysis.md 仅用指针引(下任务建)。
- [ ] **4. no-op + provenance 自检**:对每行跑 no-op 测试(删了行为变不变,不变即删);跑 §12-C grep,清零泄漏。
- [ ] **5. Commit**:`git add skills/recon-driven-dev-inline/SKILL.md && git commit -m "refactor(rdd-inline): SKILL.md 收为跨阶段脊柱 + 全局护栏"`

**Verification:**
- `grep -c '⏸' SKILL.md` ≥ 5(每阶段暂停在);`grep -n '目录碰撞\|换名\|别覆盖' SKILL.md` 有命中(防覆盖真牙在);§12-C grep 零命中。
- 人核:SKILL.md 不含任何阶段的细则正文(契约/判据/gates 都只有指针,无展开)。

---

### Task 2: ① directed-analysis.md(原样搬迁)

**Files:**
- Create: `skills/recon-driven-dev-inline/references/directed-analysis.md`
- Modify: `skills/recon-driven-dev-inline/SKILL.md`(① 行指针定稿)

**Consumes:** Task 1 的 ① 指针(「主会话实测门」)。
**Produces:** `directed-analysis.md` 锚(派发路由 / 主会话实测门 / ① 阶段封存边界),供脊柱指针指向。

**Steps:**
- [ ] **1. 抽取**:把**现 SKILL.md ① 节**(派发 recon-agent 路由、agent 软依赖降级、主会话实测门、① 封存边界)逐字迁入 directed-analysis.md——**语义不动**(SPEC §5① 决策=原样搬迁),只搬家 + 适配指针。
- [ ] **2. Co-location(§12-B)**:「① 封存/订正边界」作为「① 阶段的一条 caveat」由脊柱 §事实订正用指针引,directed-analysis.md 内保留该段但标明「全程订正总账见脊柱」,不持全程落点。
- [ ] **3. §12-A**:确认脊柱 ① 指针点名「主会话实测门(非泛质量门)、含扫 MCP 只读手段实测 `[未核验]` 条这一非默认动作」。
- [ ] **4. provenance/no-op 自检** + §12-C grep。
- [ ] **5. Commit**:`refactor(rdd-inline): ① 细则下沉 directed-analysis.md(原样搬迁)`

**Verification:** diff 比对现 SKILL.md ① 节 ↔ directed-analysis.md,确认是搬迁非改写(无新增判断规则表——SPEC §6 ❌护栏);`recon-agent.md` 未被触碰(`git diff --stat` 不含它)。

---

### Task 3: ② requirements-design.md

**Files:**
- Create: `skills/recon-driven-dev-inline/references/requirements-design.md`
- Modify: `SKILL.md`(② 行指针 + HARD GATE 标记词;评审决策点指针)

**Consumes:** Task 1 脊柱 ② / ③ 决策点指针。
**Produces:** ② 细则单一权威家,内含 4 个【唯一权威】块,后续被多方指针引用:
- **design.md 必覆盖清单**(4 要素,检查锚点式,SPEC §5②);
- **评审决策点判据**(信号清单 + 代价提示,SPEC §5③——③ 决策点、④自评、③定向报告验收都指针引此);
- ② 对话契约 + HARD GATE + 三硬规则 + ②自评 + ②端信号产出义务。

**Steps:**
- [ ] **1. 起草**:照 SPEC §5②/§5③ 写——保留 superpowers brainstorming 那批;吸收测试缝隙(确认融入分节流、不叠停点)/ 窄接口透镜 / ADR 中间;design.md 必覆盖清单(form-flexible);评审决策点判据落本文件末尾。
- [ ] **2. 缝隙一词一义自检**:`grep -n '缝隙' requirements-design.md` 每条命中必是**测试缝隙**语境;接口暴露面处用「窄接口」。
- [ ] **3. 单一权威源**:必覆盖清单 + 评审决策点判据**只此一处**;脊柱/其他 reference 只指针。确认未把判据复述进脊柱。
- [ ] **4. §12-D(Spec 轴尺)预备**:必覆盖清单写成「会被写进每份 design.md 的检查锚点」形态(供 Task 6 的 code-reviewer Spec 轴「核 design.md 自带锚点」用,尺随产物走)。
- [ ] **5. provenance/no-op 自检** + §12-C grep。
- [ ] **6. Commit**:`refactor(rdd-inline): ② 细则下沉 requirements-design.md(融测试缝隙/窄接口/ADR/必覆盖清单)`

**Verification:** `grep -n '缝隙' requirements-design.md` 全为测试缝隙;评审决策点判据在本文件、脊柱 ③ 决策点仅指针(`grep` 脊柱无信号清单复述)。

---

### Task 4: ③ 评审接线(派发并入脊柱)

**Files:**
- Modify: `SKILL.md`(③ 流程行标「可选」+ 评审决策 ⏸ + ③ 派发路由并入脊柱,与 ① 派发共用「派发/降级范式」表述)
- Frozen: `review-agent.md` / `templates/review.md` 不碰

**Consumes:** Task 3 的评审决策点判据指针;Task 1 的派发/降级范式。
**Produces:** 脊柱内 ③ 段(可选门 + 派发路由)——**不新建 review.md 文件**(SPEC §5③,避免 No-Op 文件)。

**Steps:**
- [ ] **1. 接线**:SKILL.md ③ 段写——评审决策 ⏸(据 ①② 信号给建议、用户拍板,判据指针指向 requirements-design.md)+ 选了评审后的派发路由(派 review-agent.md / 无隔离降级,复用与 ① 同一段「派发/降级范式」表述、不另写一遍)。
- [ ] **2. 确认** review-agent.md / templates/review.md **零改动**;③ 产物仍是运行期 `review.md`(写进产物目录,非 references)。
- [ ] **3. §12-A** ③ 决策点指针点名「跳过会丢定向报告验收」代价;**§12-C** grep。
- [ ] **4. Commit**:`refactor(rdd-inline): ③ 评审改可选 + 派发路由并入脊柱(消 No-Op 文件)`

**Verification:** `ls references/ | grep -c '^review.md$'` = 0(未建多余文件);`git diff --stat` 不含 review-agent.md / templates/review.md。

---

### Task 5: ④ planning.md(写计划 · 新阶段)

**Files:**
- Create: `skills/recon-driven-dev-inline/references/planning.md`
- Modify: `SKILL.md`(④ 行 + ⏸ 审计划 + 执行方式 ⏸)

**Consumes:** Task 1 脊柱 ④ 指针。
**Produces:** ④ 细则 = 基线 6 条 + 路 3 分层 + 执行方式决策(SPEC §5④);产出物 `tasks.md` 的形态约定;**执行方式 ⏸ 的两支(内联 / 子 agent)**——Task 7 的 ⑤ 两分支据此触发。

**Steps:**
- [ ] **1. 起草**:照 SPEC §5④ 写——基线 6 条(曳光弹切片含极小改动退化 / 右尺寸 / prefactor / 文件结构图「按职责切」单点声明 / 验收+依赖序+无占位符底线 / ④自评限「机械对账」)+ 路 3(执行方式 ⏸ 前移、选子 agent 才升级到 Interfaces 精确签名)。
- [ ] **2. duplication 自检**:「按职责不按层」只在 planning.md 单点声明,曳光弹条引用它、不重述(SPEC §5④ 第4条);④自评不复跑 ③ 深度判据。
- [ ] **3. provenance/no-op 自检** + §12-C grep。
- [ ] **4. Commit**:`feat(rdd-inline): ④ 写计划阶段 planning.md(曳光弹切片+writing-plans+路3分层)`

**Verification:** `grep -c '按职责' planning.md` = 1(单点声明);执行方式 ⏸ 两支清晰可被 ⑤ 引用。

---

### Task 6: ⑤ A2 评审 sub-agent — code-reviewer.md + 模板

**Files:**
- Create: `skills/recon-driven-dev-inline/references/code-reviewer.md`
- Create: `skills/recon-driven-dev-inline/references/templates/code-review.md`

**Consumes:** Task 3 的 design.md 必覆盖清单形态(Spec 轴尺)。
**Produces:** `code-reviewer.md`(A2 整支评审 sub-agent 本体)+ `templates/code-review.md`(填空骨架)——Task 7 的 ⑤ A2 触发指向它们。

**Steps:**
- [ ] **1. 起草 code-reviewer.md**:照 SPEC §5⑤ A2 契约表 + §12-D 写——**自描述边界行**(从 `## 现在执行`/等价起为 prompt 体、blockquote 元注释不喂 agent,与 review-agent.md 同构);两轴 rubric 自带(Standards:仓库规范优先/无则通用基线/跳过 linter 已强制;Spec:核 **design.md 自带检查锚点**逐条接住 / scope creep / 与 design 矛盾,**spec 源=本次 design.md/requirements.md**);**per-axis 结论不跨轴 rerank**;评审范围 `merge-base..HEAD` + **BASE 兜底**(未起独立分支时=⑤起点 commit);复评 checkable 终止判据(只核上轮 delta)。
- [ ] **2. 起草 templates/code-review.md**:纯填空(两轴段落 + per-axis 结论 + 逐条发现),判据归 code-reviewer.md、模板不复述(SPEC §6 单一权威源)。
- [ ] **3. Standards 轴 no-op 收尾(§12-E)**:逐句 no-op 测试通用基线,只留真·反默认动作。
- [ ] **4. provenance/no-op 自检** + §12-C grep;确认严重度复用「阻断/须改/可改」、不引第三套词。
- [ ] **5. Commit**:`feat(rdd-inline): ⑤ A2 整支评审 code-reviewer.md(两轴 per-axis 不跨轴)+ 模板`

**Verification:** code-reviewer.md 开头有自描述边界行;`grep -n '三档总体\|取最严' code-reviewer.md` 零命中(per-axis、不 rerank);Spec 轴写「核 design.md 自带锚点」而非内联复述四要素。

---

### Task 7: ⑤ implementation.md(实施 · 新阶段)+ ⑤ 接线

**Files:**
- Create: `skills/recon-driven-dev-inline/references/implementation.md`
- Modify: `SKILL.md`(⑤ 行 + FINISH ⏸ + 归档 ⏸)

**Consumes:** Task 5 执行方式 ⏸ 两支;Task 6 的 code-reviewer.md / code-review.md;Task 3 的测试缝隙(A3)。
**Produces:** ⑤ 细则 = 两分支 gates + 非显性陷阱块 + A1/A2/B1-B4;**per-task 两阶段评审判据的家**(承基线 gate5)。

**Steps:**
- [ ] **1. 起草**:照 SPEC §5⑤ 写——内联分支 gates(clean-baseline/ISOLATE/**A3:在②预先约定的测试缝隙上 TDD**/per-task 两阶段评审/continuous/FINISH 菜单/归档)+ 子 agent 分支(**per-task 两阶段评审两分支共有**、B1 文件交接禁落 `.git/`、B2 不预判、B3 账本随归档 + scratch 护栏、**B4 一句提及**)+ A1 预检 + A2 触发(派 code-reviewer.md / 降级,与执行分支正交)。
- [ ] **2. 非显性陷阱块**:原样保留 8 条 + 新增账本 scratch 一条(SPEC §5⑤)。
- [ ] **3. 单一权威源**:per-task 判据住本文件、code-reviewer 判据不复述进本文件(只指针「派 code-reviewer.md」)。
- [ ] **4. provenance/no-op 自检** + §12-C grep。
- [ ] **5. Commit**:`feat(rdd-inline): ⑤ 实施阶段 implementation.md(两分支 gates+陷阱块+A1/A2/B1-B4)`

**Verification:** `grep -n '预先约定的测试缝隙' implementation.md` 命中(A3 跨阶段链兑现);per-task 两阶段评审在**两分支**都出现;`grep -n 'scripts/\|review-package\|task-brief' implementation.md` 零命中(守自包含、不引脚本)。

---

### Task 8: README.md 重写 + CHANGELOG.md 条目

**Files:**
- Rewrite: `skills/recon-driven-dev-inline/README.md`(导航:5 阶段 + 新目录结构 + 与 recon-driven-dev 关系)
- Modify: `skills/recon-driven-dev-inline/CHANGELOG.md`(新增条目,what+why+借鉴溯源)

**Steps:**
- [ ] **1. README**:更新总览/流程图/目录结构为 5 阶段 + 7 references;`本文件只做导航,完整规则见 SKILL.md`。
- [ ] **2. CHANGELOG**:新增条目——主题(融合 superpowers+mattpocock 的自包含流水线)、what(5 阶段/披露 C/A1-A2/B1-B4/code-reviewer)、why、**借鉴溯源**(出处归此,正文已去 provenance)、诚实定性(结构重构+能力吸收)、引用 SPEC 路径。
- [ ] **3. Commit**:`docs(rdd-inline): README 五阶段导航 + CHANGELOG 重构条目`

**Verification:** README 目录结构与实际 `ls references/` 一致(7 + templates 3);CHANGELOG 承载全部借鉴溯源(正文文件 §12-C grep 仍零命中)。

---

### Task 9: 终验 —— §12 全文件 sweep + wgs 终评 + dogfood

**Files:** 只读核验,无改动(发现问题则回对应任务修)

**Steps:**
- [ ] **1. §12-C/§12-A 全文件 sweep**:对 SKILL.md + 全部新 references 跑 provenance grep(零命中)+ 逐指针核措辞;`grep -rn '缝隙' skills/recon-driven-dev-inline/` 全为测试缝隙。
- [ ] **2. §12-F 单路径承载量测**:`wc -l` 算「内联分支单次 run 载入」(SKILL.md + 命中阶段 references)与「子 agent 分支」两条路径行数;记录为软上限基线;若某条明显超重,回评 B 系列降级。
- [ ] **3. wgs 终评(对真实文件)**:对落地后的 SKILL.md + references 复跑 writing-great-skills 四维评判(可派 workflow);目标:无新 No-Op/Duplication/单一权威源违例。
- [ ] **4. dogfood 干跑**:挑 1 个小改动场景,在脑内/干跑走一遍 ①→⑤,确认指针都解析、阶段衔接通、A2 能据 code-reviewer.md 落笔。
- [ ] **5. 冻结确认**:`git log --stat` 全程未改 recon-agent.md / review-agent.md / templates/{requirements,review}.md。
- [ ] **6. Commit**(如有修正):`chore(rdd-inline): 终验修正(wgs 终评 + §12 sweep)`

**Verification:** wgs 终评四维 ≥ 合格、无阻断/须改残留;4 个冻结文件 `git diff main -- <them>` 为空。

---

## Self-Review(写完计划自检)

**1. Spec coverage:** SPEC §5①→T2、§5②→T3、§5③→T3/T4、§5④→T5、§5⑤→T6/T7、§3 脊柱→T1、§6 护栏→T1、§4 文件结构→全程、§12 实施规则→各任务内嵌 + T9 sweep。✅ 无遗漏小节。
**2. Placeholder scan:** 无 TBD/TODO;每任务有具体文件、具体 SPEC 锚、具体 grep 验收。内容正文不在计划里粘贴是**有意的 DRY**(SPEC 是单一权威),非占位符。
**3. Type consistency(此处=文件名/锚/leading word 一致):** 文件名全程一致(directed-analysis / requirements-design / planning / implementation / code-reviewer / templates/code-review);冻结清单 4 个一致;「缝隙=测试缝隙、窄接口=接口暴露面」一词一义贯穿;「派发/降级范式」① 与 ③ 共用同一表述。✅

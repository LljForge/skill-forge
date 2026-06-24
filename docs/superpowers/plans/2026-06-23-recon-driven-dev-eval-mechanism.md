# recon-driven-dev 实战驱动打磨机制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 recon-driven-dev 建立常驻的"实战驱动打磨"维护资产(覆盖账本 + BACKLOG + 实测打磨协议),让任意真实开发任务跑这个 skill 时能系统捕获→分诊→修复→沉淀其自身缺陷。

**Architecture:** 纯文档交付——3 个新建/改动落在 skill 包的维护资产层(运行时不读),1 处改 README 导航。无代码、无运行时行为变更。内容设计权威 = 已提交的 design doc [`docs/superpowers/specs/2026-06-23-recon-driven-dev-eval-mechanism-design.md`](../specs/2026-06-23-recon-driven-dev-eval-mechanism-design.md);本计划只做任务编排、文件骨架与验收,不重抄判据。

**Tech Stack:** Markdown。无测试框架——每个任务的"验收"用 `grep` 核对结构存在 + 与 design 一致 + 解耦/占位自查,替代单元测试。

## Global Constraints

> 每个任务的要求都隐含包含本节。值均从 design doc §0/§3/§8/§9 逐字提取。

- **机制完全从 recon-driven-dev 自身长出;绝不耦合其他 skill**——文档/构件/措辞不得引用、对齐、参照任何外部 skill(不出现`姊妹`/`借鉴`/`对齐姊妹`/`fork` 等措辞)。
- **不用「薄度」**;防膨胀概念一律用 skill 自身的「单路径承载软上限」。
- **机制全部资产运行时不读**——SKILL.md 不得引用它们;任何执行路径单次 run 的 reference 载入量零增。
- **不引入外部 skill 调用 / 脚本 / 评测框架**;不在 SKILL.md 运行脊柱里增加任何机制内容。
- **内容单一权威源**:设计权威 = 上述 design doc;实施后 `MAINTAINING.md`「实测打磨协议」节成为**操作权威**,design doc 退为 specs 历史。plan 与文件互不复述判据。
- **全程简体中文**(`.claude/rules/principles.md`)。

---

## File Structure

| 文件 | 动作 | 职责 | 运行时读? |
|---|---|---|---|
| `skills/recon-driven-dev/EVAL-COVERAGE.md` | 新建 | 覆盖账本:32 路径单元 × 触发态,实测进度的单一载体 | 否 |
| `skills/recon-driven-dev/BACKLOG.md` | 新建 | 搁置候选改造项备忘 | 否 |
| `skills/recon-driven-dev/MAINTAINING.md` | 改(末尾追加一节) | 「实测打磨协议」——监督/复盘/分诊/处置/验证/收敛的操作权威 | 否 |
| `skills/recon-driven-dev/README.md` | 改(2 处) | 目录结构补两行 + 维护资产说明挂协议指针 | 否 |

任务序:先建被引用的资产(账本、BACKLOG),再写引用它们的协议,最后改 README 导航。每个任务一个独立 commit。

---

### Task 1: 覆盖账本 EVAL-COVERAGE.md

**Files:**
- Create: `skills/recon-driven-dev/EVAL-COVERAGE.md`

**Interfaces:**
- Consumes: design doc §4(路径单元定义、四态覆盖手段、列结构、32 单元全集)。
- Produces: 一张 32 行覆盖账本,供 Task 3 协议节按名引用(协议的"回填账本"步骤写它)。列名固定:`# | 路径单元 | 类型 | 计划手段 | 触发 | 指令够用? | 关联改进点 | 最近实跑`。

- [ ] **Step 1: 写文件**

完整写入以下内容(32 行单元号/名/类型/计划手段逐字取自 design §4.3;触发态初值全 `·未触发`):

```markdown
# 覆盖账本(EVAL-COVERAGE)

> recon-driven-dev 实测进度的单一载体。元层维护资产,**运行时不读**。
> 路径单元定义、四态覆盖手段、收敛判定的权威见实测打磨协议(`MAINTAINING.md`「实测打磨协议」节)。
> 「触发」四态:`✓真实 / ▲人造 / ◇走查 / ·未触发`;「指令够用?」:`是 / ⚠有缺陷(挂改进点号) / —未判`。
> **地板达成** = 每格「触发」≥`◇` 且「指令够用?」不带 `⚠`。

| # | 路径单元 | 类型 | 计划手段 | 触发 | 指令够用? | 关联改进点 | 最近实跑 |
|---|---|---|---|---|---|---|---|
| ①a | 派 recon-agent 侦查 | 主干 | ✓ | ·未触发 | — | | |
| ①b | 无 Task 能力 → 降级主会话自跑侦查 | 冷门·降级 | ◇ | ·未触发 | — | | |
| ①c | 主会话实测门:对 `[未核验]` 软推断当场取真值比对 | 主干 | ✓ | ·未触发 | — | | |
| ①d | 报告不过门 → 打回 recon-agent 重摸 | 冷门·失真 | ◇ | ·未触发 | — | | |
| ②a | 内联对话澄清(一次一问 / 方案分节) | 主干 | ✓ | ·未触发 | — | | |
| ②b | HARD GATE:用户批准前不写任何代码 | 主干 | ✓ | ·未触发 | — | | |
| ②c | 自行补探 ① 未覆盖代码 + design.md 前向记录 | 主干 | ✓ | ·未触发 | — | | |
| ②d | 两产物 · design.md 必覆盖清单(四要素) | 主干 | ✓ | ·未触发 | — | | |
| ②e | 向评审决策点产出信号(测试缝隙数 / ADR 数 / 爆炸半径) | 主干 | ✓ | ·未触发 | — | | |
| DP1 | 评审决策点 = 建议评审 | 主干 | ✓ | ·未触发 | — | | |
| DP2 | 评审决策点 = 建议可跳过(→ 不派 ③) | 主干·alt | ✓ | ·未触发 | — | | |
| ③a | 派 review-agent | 主干 | ✓ | ·未触发 | — | | |
| ③b | 无隔离能力 → 降级主会话自评 | 冷门·降级 | ◇ | ·未触发 | — | | |
| ③c | 结论 = 通过 | 主干 | ✓ | ·未触发 | — | | |
| ③d | 结论 = 有条件/不通过 → ⏸ 由用户定是否回写 ② | 冷门·失真 | ◇ | ·未触发 | — | | |
| ④a | 拆 tasks(曳光弹切片 + 右尺寸 + 验收/依赖序) | 主干 | ✓ | ·未触发 | — | | |
| ④b | 审计划 ⏸ | 主干 | ✓ | ·未触发 | — | | |
| ④c | 执行方式 = 内联 | 主干·alt | ✓ | ·未触发 | — | | |
| ④d | 执行方式 = 子 agent(升级到自包含 Interfaces + 任务级完整路径) | 冷门·alt | ▲ | ·未触发 | — | | |
| ⑤a | clean-baseline + ISOLATE(优先原生 worktree 工具) | 主干 | ✓ | ·未触发 | — | | |
| ⑤b | TDD:在 ② 预先约定的测试缝隙上写失败测试 | 主干 | ✓ | ·未触发 | — | | |
| ⑤c | per-task 两阶段评审(spec 符合 + 代码质量) | 主干 | ✓ | ·未触发 | — | | |
| ⑤d | 实施前冲突预检(一次批量问 + 扫净静默继续) | 主干 | ✓ | ·未触发 | — | | |
| ⑤e | 内联分支执行 | 主干 | ✓ | ·未触发 | — | | |
| ⑤f | 子 agent 分支执行(以文件交接 / 不预判 / 进度账本) | 冷门 | ▲ | ·未触发 | — | | |
| ⑤g | 收尾前整支评审:派 code-reviewer(Standards + Spec 两轴) | 主干 | ✓ | ·未触发 | — | | |
| ⑤h | 无隔离能力 → 整支评审降级主会话自跑 | 冷门·降级 | ◇ | ·未触发 | — | | |
| ⑤i | FINISH 收口 = 本地合并 / push+PR | 主干 | ✓ | ·未触发 | — | | |
| ⑤j | FINISH 收口 = 保留 / 丢弃 | 冷门 | ▲ | ·未触发 | — | | |
| ⑤k | 归档 ⏸(本次目录移进 `_archived/`) | 主干 | ✓ | ·未触发 | — | | |
| X1 | 事实订正:②③ 阶段证伪 directed-report 的事实主张 | 跨阶段·失真 | ◇ | ·未触发 | — | | |
| X2 | 事实订正:④⑤ 途中推翻 → 主会话落订正块 + 暂停 surface | 跨阶段·失真 | ◇ | ·未触发 | — | | |

## 进度小结(随实跑更新)
- 地板(每格 ≥◇ 且不带 ⚠):0/32
- 天花板(被碰过的格连续 2 轮无新 skill 缺陷):未达
```

- [ ] **Step 2: 验收——结构与计数核对**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
echo "数据行数(应 32):"; grep -cE "^\| (①|②|③|④|⑤|DP|X)" skills/recon-driven-dev/EVAL-COVERAGE.md
echo "触发态初值应全未触发(非 ·未触发 的数据行数应为 0):"; grep -E "^\| (①|②|③|④|⑤|DP|X)" skills/recon-driven-dev/EVAL-COVERAGE.md | grep -vc "·未触发"
echo "计划手段计数 ✓/▲/◇:"; grep -oE "\| (✓|▲|◇) \|" skills/recon-driven-dev/EVAL-COVERAGE.md | sort | uniq -c
```
Expected: 数据行 32;非未触发行 0;`✓`×22 `▲`×3 `◇`×7。

- [ ] **Step 3: 解耦 + 占位自查**

Run:
```bash
grep -nE "super-dev|姊妹|借鉴|对齐姊|fork|薄度|TBD|TODO|待定|待补" skills/recon-driven-dev/EVAL-COVERAGE.md && echo "⚠ 命中" || echo "✓ 干净"
```
Expected: `✓ 干净`。

- [ ] **Step 4: Commit**

```bash
git add skills/recon-driven-dev/EVAL-COVERAGE.md
git commit -m "feat(recon-driven-dev): 新增覆盖账本 EVAL-COVERAGE(32 路径单元初版·全未触发)"
```

---

### Task 2: 候选优化清单 BACKLOG.md

**Files:**
- Create: `skills/recon-driven-dev/BACKLOG.md`

**Interfaces:**
- Consumes: design doc §6.2(BACKLOG 条目结构:problem 事实 / 候选修法 A/B/C / 搁置原因或待触发条件)。
- Produces: 空骨架 + 文件头 + 条目模板,供 Task 3 协议节的"处置门槛—搁置"步骤按名写入。

- [ ] **Step 1: 写文件**

完整写入:

```markdown
# 候选优化清单(BACKLOG)

> 实测打磨中发现、经分诊确认为 skill 缺陷、但**暂且搁置**(涉护栏权衡 / 动骨架 / 单样本不足以定方向 / 需多实跑样本佐证)的候选改造项。
> 元层维护者备忘,**运行时不读**。处置门槛与分诊判据的权威见 `MAINTAINING.md`「实测打磨协议」节。
> 条目随实跑增,经评审采纳后移入 `CHANGELOG.md`、并从本清单删。

<!-- 条目模板(复制后填写):
## N. <标题>(来源:<date> 实跑 · <阶段/路径单元号> 发现)
**问题事实**:<skill 指令本身的什么缺陷,带现场证据>
**候选修法**(讨论于 <date>,未定):
- A. …
- B. …
- C. …
**搁置原因 / 待触发条件**:<为何不当场改;攒够什么样本或想清什么权衡再动>
-->

_(暂无搁置条目)_
```

- [ ] **Step 2: 验收 + 自查**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -q "运行时不读" skills/recon-driven-dev/BACKLOG.md && grep -q "候选修法" skills/recon-driven-dev/BACKLOG.md && echo "✓ 结构齐" || echo "⚠ 缺结构"
grep -nE "super-dev|姊妹|借鉴|对齐姊|fork|薄度|TODO|TBD" skills/recon-driven-dev/BACKLOG.md && echo "⚠ 命中" || echo "✓ 干净"
```
Expected: `✓ 结构齐` 与 `✓ 干净`。

- [ ] **Step 3: Commit**

```bash
git add skills/recon-driven-dev/BACKLOG.md
git commit -m "feat(recon-driven-dev): 新增候选优化清单 BACKLOG(空骨架+条目模板)"
```

---

### Task 3: MAINTAINING.md 增「实测打磨协议」节

**Files:**
- Modify: `skills/recon-driven-dev/MAINTAINING.md`(在文件末尾追加一节)

**Interfaces:**
- Consumes: design doc §2(拓扑+两道防污染闸)、§5(监督协议+监督笔记/改进点清单模板)、§6(三分诊+处置门槛+改后验证 rubric)、§7(收敛判定);以及 Task 1 的 `EVAL-COVERAGE.md`、Task 2 的 `BACKLOG.md`(按名引用)。
- Produces: 实测打磨的**操作单一权威**——其余文件(账本/BACKLOG/监督笔记)只引用本节,不复述判据。

**实施说明(关键)**:把 design doc §2/§5/§6/§7 的设计语气**改写为维护者可直接照做的操作祈使文本**(动作工单,非陈述体),按下方骨架落成本节。design doc 实施后归 specs 历史、不再维护;本节成为权威。**不得引用 design doc 路径**(它会归档)。监督笔记/改进点清单两个模板按 design §5.1/§5.3 逐字落入本节。

- [ ] **Step 1: 追加「实测打磨协议」节**

在 `MAINTAINING.md` 末尾追加一节,标题 `## 实测打磨协议(实测整个 skill 时读)`,按以下骨架填充(每个子节内容来源已标注):

```
## 实测打磨协议(实测整个 skill 时读)

> 导语:本节是"拿真实开发任务实测并打磨本 skill"的操作权威。两道防污染闸——会话分离、三分诊——保证实测纯净、且任务特例/模型失误不污染 skill。

### 何为"实测到位"(成功标准)            ← design §1
  地板(覆盖账本每格 ≥◇ 不带 ⚠)+ 天花板(连续 2 轮无新 skill 缺陷)。

### 总览:两会话分离                       ← design §2
  实测会话(纯净跑+记笔记)→ 改进点清单(交接物)→ 打磨会话(改 skill)。

### 实测会话:监督协议                      ← design §5
  - 现场层:每 ⏸ 主 agent 附一行「skill 体验自评」→ 监督笔记。
  - 复盘层:整任务跑完派隔离复盘 agent,只评 skill 指令本身、不评业务代码,补 `▲复盘补`。
    (隔离派发是本 skill 既有范式;无隔离能力降级主会话自跑。)
  - 监督笔记模板(逐字落入)、改进点清单模板(逐字落入)。 ← design §5.1 / §5.3

### 打磨会话:分诊 → 处置 → 验证 → 沉淀      ← design §6
  - 三分诊:skill 缺陷 / 任务特例 / 模型失误;仅 skill 缺陷入修复。
  - 处置门槛:局部低风险 → 当场改+CHANGELOG;涉护栏·动骨架·单样本不足 → 进 BACKLOG.md。
  - 改后验证 rubric(逐字落入,7 条):
      A 结构契约没破:自包含性 / 单一权威源 / 分层归位 / 派发-降级对称 / 阶段衔接·不回流
      B 改动本身够格:可执行性 / 单路径承载
    验证怎么跑:受影响阶段消费者映射 + 派隔离对抗 agent 逐条过 rubric;诚实定性(能力 vs 工程收益)。
  - 回填 EVAL-COVERAGE.md(触发态 + 指令够用 + 改进点号 + 日期)。

### 收敛判定                               ← design §7
  地板 + 天花板皆达 → 宣布"当前版本实测到位",转低频维护;skill 大改后受影响路径单元触发态重置。
```

填充时:`### 改后验证 rubric` 的 7 条要逐字写全(自包含性/单一权威源/分层归位/派发-降级对称/阶段衔接·不回流/可执行性/单路径承载),措辞取自 design §6.3；监督笔记模板、改进点清单模板取自 design §5.1/§5.3 的代码块。按名引用写 `EVAL-COVERAGE.md` 和 `BACKLOG.md`(相对文件名,同目录)。

- [ ] **Step 2: 验收——节与子节齐备**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
for kw in "实测打磨协议" "监督协议" "三分诊" "处置门槛" "改后验证" "收敛判定" "EVAL-COVERAGE.md" "BACKLOG.md"; do
  grep -q "$kw" skills/recon-driven-dev/MAINTAINING.md && echo "✓ $kw" || echo "⚠ 缺 $kw"
done
echo "7 条 rubric 维度:"; for r in "自包含性" "单一权威源" "分层归位" "派发-降级对称" "阶段衔接" "可执行性" "单路径承载"; do grep -q "$r" skills/recon-driven-dev/MAINTAINING.md && echo "  ✓ $r" || echo "  ⚠ 缺 $r"; done
```
Expected: 全部 `✓`。

- [ ] **Step 3: 解耦 + 占位 + "不引 design 路径" 自查**

Run:
```bash
grep -nE "super-dev|姊妹|借鉴|对齐姊|fork|薄度|TBD|TODO|待定|待补|specs/2026-06-23" skills/recon-driven-dev/MAINTAINING.md && echo "⚠ 命中" || echo "✓ 干净"
```
Expected: `✓ 干净`(尤其不得出现 `薄度`,不得引用 design 的 specs 路径)。

- [ ] **Step 4: Commit**

```bash
git add skills/recon-driven-dev/MAINTAINING.md
git commit -m "feat(recon-driven-dev): MAINTAINING 增「实测打磨协议」节(监督/分诊/验证/收敛操作权威)"
```

---

### Task 4: README.md 导航 + 维护资产指针

**Files:**
- Modify: `skills/recon-driven-dev/README.md`(目录结构块 + 维护资产说明各一处)

**Interfaces:**
- Consumes: Task 1/2/3 产出的三个文件名。
- Produces: 无下游(导航终点)。

- [ ] **Step 1: 目录结构补两行**

在 `README.md` 目录结构块中,`MAINTAINING.md` 那行之后插入两行(对齐既有缩进与注释风格):

```
├── BACKLOG.md                  # 候选优化清单(实测搁置项 · 运行时不读)
├── EVAL-COVERAGE.md            # 覆盖账本(32 路径单元 × 触发态 · 运行时不读)
```

- [ ] **Step 2: 维护资产说明挂协议指针**

在 README 描述 MAINTAINING.md 的句子处,补一句:实测打磨怎么做(监督/分诊/验证/收敛)见 `MAINTAINING.md`「实测打磨协议」节;实测进度见 `EVAL-COVERAGE.md`、搁置项见 `BACKLOG.md`。(措辞与 README 既有风格一致,不复述判据。)

- [ ] **Step 3: 验收 + 自查**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
for kw in "BACKLOG.md" "EVAL-COVERAGE.md" "实测打磨协议"; do grep -q "$kw" skills/recon-driven-dev/README.md && echo "✓ $kw" || echo "⚠ 缺 $kw"; done
grep -nE "super-dev|姊妹|借鉴|对齐姊|fork|薄度" skills/recon-driven-dev/README.md && echo "⚠ 命中" || echo "✓ 干净"
```
Expected: 三个 `✓` + `✓ 干净`。

- [ ] **Step 4: Commit**

```bash
git add skills/recon-driven-dev/README.md
git commit -m "docs(recon-driven-dev): README 目录补 BACKLOG/EVAL-COVERAGE + 挂实测打磨协议指针"
```

---

## Self-Review

**1. Spec coverage**(design §8 落地清单逐项映射):
- §8.1 MAINTAINING 增「实测打磨协议」节 + README 挂指针 → Task 3 + Task 4 ✓
- §8.2 新建 BACKLOG.md → Task 2 ✓
- §8.3 新建 EVAL-COVERAGE.md(32 单元全集、全未触发) → Task 1 ✓
- §8.4 README 目录补两行 → Task 4 ✓
- §8.5 监督笔记/改进点清单模板 → Task 3 Step 1(逐字落入协议节);实例每次实跑时按模板在 `docs/recon-driven-dev-eval/<date>-<task>/` 产生,不在本计划建文件 ✓
- §8「不做」三条 → Global Constraints 已固化 ✓

**2. Placeholder scan:** 计划内无 TBD/TODO;`<date>`/`<task>`/`N.` 是文件内模板占位(本就该在)。Task 3 用"骨架+内容来源指针"而非重抄协议全文——这是 Global Constraints「单一权威源」的有意取舍(design doc 同仓可读),非占位失败;骨架已给全部子节标题与来源锚点,执行者零歧义。

**3. Type consistency:** 账本列名(`# | 路径单元 | 类型 | 计划手段 | 触发 | 指令够用? | 关联改进点 | 最近实跑`)在 Task 1 定义、Task 3「回填账本」按同名引用;四态符号 `✓/▲/◇/·未触发` 全计划一致;rubric 7 维度名 Task 3 Step 1 与 Step 2 验收一致。

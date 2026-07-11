# recon-driven-dev：② 澄清硬闸 + ⑤ 分支命名规范 · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 recon-driven-dev 补两条护栏——② 遇实质不确定必须先问用户（校准式「别猜先问」硬规则），⑤ 建隔离分支从当前 HEAD 切并用 `<type>/<change-name>` 命名——对齐 superpowers 做法。

**Architecture:** 纯 Skill 文档编辑（改 Skill 自己），改 3 个运行文件 + 1 个 CHANGELOG。无可跑的自动化测试；"验证"= 锚点 grep 核验 + `MAINTAINING.md` 的 7 条改后验证 rubric（含消费者映射）。判据单一权威落 reference、脊柱只亮牌/nod。

**Tech Stack:** Markdown（`skills/recon-driven-dev/`）；核验用 `grep` / `git`。

## Global Constraints

以下逐条来自已获批 spec `docs/superpowers/specs/2026-07-11-recon-clarify-gate-and-branch-naming-design.md` 与 `MAINTAINING.md`，每个任务隐含遵守：

- **自包含性【唯一硬约束】**：不引入任何外部 skill 调用 / 脚本 / 跨会话持久件依赖。
- **单一权威源**：澄清判据只住 `requirements-design.md`、分支规范只住 `implementation.md`；`SKILL.md` 脊柱**只亮牌 / nod、不复述判据**。不制造第二权威源。
- **分层归位**：运行约束落脊柱、判据落 reference（治理规则落 `MAINTAINING.md`、本次不涉及）。
- **不改 BASE 口径**：`implementation.md` 的 `merge-base <主干> HEAD`、"主干别默认 main、按收口分支态定" 保持不动。
- **不动**：② 自评四类卫生扫描、⑤ FINISH 收口菜单。
- **诚实定性**：本次是**运行行为变更 / 能力提升**（非纯元层），CHANGELOG 须如实标注。
- **change-name 语义**：`<change-name>` 指「起步」在 `docs/recon-driven-dev/<YYYY-MM-DD>-<change-name>/` 生成的那个 kebab-case 短名；分支名复用它但**不带日期**。

---

### Task 1: ② 澄清硬闸（`requirements-design.md` 第 4 条硬规则 + 红旗表 + 脊柱亮牌）

**Files:**
- Modify: `skills/recon-driven-dev/references/requirements-design.md`（「三条硬规则」区，约 19-23 行）
- Modify: `skills/recon-driven-dev/SKILL.md`（② 段 HARD GATE 行后，约 70 行）

**Interfaces:**
- Consumes: 现有 `design.md` 必覆盖清单②（关键决策+被否+理由）与 ② 接棒纪律"够不着则在 design.md 显式记"——新硬规则的「ADR 逃生阀」按名挂这两处，不新造结构。
- Produces: 一条名为「别猜、先问（don't guess）」的硬规则 + 一张反合理化红旗表（供 ② 运行时读）；脊柱一行同名亮牌。

- [ ] **Step 1: 改「三条硬规则」标题为「四条硬规则」**

在 `references/requirements-design.md` 找到：

```
## 三条硬规则(强模型为"帮上忙"最爱跳过,必须明写)
```

替换为：

```
## 四条硬规则(强模型为"帮上忙"最爱跳过,必须明写)
```

- [ ] **Step 2: 在「范围分解触发器」bullet 后追加第 4 条硬规则 + 红旗表**

找到该区最后一条 bullet（`范围分解触发器`……`分解后逐个子项目走本轨。`），在其后紧接插入：

```

- **别猜、先问(don't guess)**:设计对话中撞到**实质不确定 / 分叉**(选它会改需求 / 方向、爆炸半径或接口形态)——**先问用户,不自行拍板当既成事实**。有合理默认可自决,但须按 ADR 记进 `design.md` 必覆盖清单②(决策 + 被否方案 + 理由),让用户在 `⏸` 看得见你替他拍了什么。两条出口(**问** / **ADR 记**)必走其一,绝不静默拍板。(承 superpowers `executing-plans`「Ask for clarification rather than guessing」+ `brainstorming` Q&A;逃生阀承本文件必覆盖清单② 与接棒纪律。)

**反合理化红旗**(强模型最爱把模糊点自己拍掉,一律是红旗、非豁免):

| 冒出的念头 | 现实 |
|---|---|
| "这个显然就该 X" | 是实质分叉就 surface,"显然"是你的默认、不是用户的 |
| "用户八成想要 Y" | 猜想 ≠ 确认;无明显默认就问 |
| "先按常见做法做,回头再改" | 静默拍板;要么问、要么 ADR 记 |
| "问了显得没主见" | 漏问才是缺陷;带推荐地问才是专业 |
```

- [ ] **Step 3: 脊柱 ② 段加一行亮牌**

在 `SKILL.md` 找到 ② 段的 HARD GATE 行：

```
**HARD GATE**:呈现需求 + 设计并经**用户**(非模型自判)批准前,**不写任何实现 / 脚手架 / 代码**——完整规则住 reference,脊柱只亮牌。
```

在其后紧接插入一行（同样"只亮牌、判据住 reference"）：

```

**别猜先问硬闸**:设计对话遇实质不确定 / 分叉,先问用户、有合理默认也须 ADR 记录,**绝不静默拍板**——判据(含反合理化红旗)住 reference。
```

- [ ] **Step 4: 锚点核验**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "四条硬规则" skills/recon-driven-dev/references/requirements-design.md
grep -n "别猜、先问" skills/recon-driven-dev/references/requirements-design.md
grep -n "反合理化红旗" skills/recon-driven-dev/references/requirements-design.md
grep -n "别猜先问硬闸" skills/recon-driven-dev/SKILL.md
```
Expected: 四条命中各 1 处；脊柱亮牌不含判据复述（人工确认那行只指路、不重列红旗内容）。

- [ ] **Step 5: 单一权威自核**

人工确认：脊柱新增行**没有**复述红旗表或 ADR 判据（只一句指向 reference）；逃生阀措辞按名指向"必覆盖清单②"（该名在 `requirements-design.md` 存在）。若脊柱复述了判据 → 收回到只亮牌。

- [ ] **Step 6: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/requirements-design.md skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): ② 加「别猜先问」澄清硬闸(校准式 + 红旗表)

治他模型跑 ② 时遇不确定自作主张:三硬规则→四硬规则,新增祈使式硬规则
(承 superpowers executing-plans「don't guess」)+ ADR 逃生阀(挂必覆盖清单②)
+ 反合理化红旗表;脊柱同名亮牌、判据只住 reference。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: ⑤ 分支命名规范（`implementation.md` ISOLATE 闸 + 脊柱 nod）

**Files:**
- Modify: `skills/recon-driven-dev/references/implementation.md`（ISOLATE 闸，第 23 行那条）
- Modify: `skills/recon-driven-dev/SKILL.md`（⑤ 段两分支共有硬闸行，约 103 行）

**Interfaces:**
- Consumes: 「起步」生成的 `<change-name>`（分支名复用它）；现有 ISOLATE 的"优先原生 worktree → git worktree 兜底"路由；现有 BASE 口径（不改）。
- Produces: ISOLATE 闸内新增「从当前 HEAD 切 + `<type>/<change-name>` 命名」两个可执行动作；脊柱一处 nod。

- [ ] **Step 1: ISOLATE 闸补建分支动作**

在 `references/implementation.md` 找到 ISOLATE 那条（第 2 条硬闸）：

```
2. **ISOLATE**:别直接在 main / master 上动手。先检测是否已隔离 → **优先用原生 worktree 工具** → 没有才 `git worktree` 兜底;普通 checkout 里建 worktree 前先征得用户同意(除非已声明偏好)。
```

替换为：

```
2. **ISOLATE**:别直接在 main / master 上动手。先检测是否已隔离 → **优先用原生 worktree 工具** → 没有才 `git worktree` 兜底;普通 checkout 里建 worktree 前先征得用户同意(除非已声明偏好)。**起隔离分支从当前 HEAD 切**(承接你所在分支、**不强制回到 main**;`git worktree add -b <name>` 的 `-b` 默认即从当前 HEAD 切)。**分支名 = `<type>/<change-name>`**——`type ∈ {feature, fix, chore, docs, refactor}`(按本次改动性质选),`<change-name>` **复用起步生成的那个**(与产物目录 `<YYYY-MM-DD>-<change-name>` 的 change-name 同名、kebab-case,**分支不带日期**),如 `feature/clarify-gate`。收尾 BASE 口径见下「收尾前整支代码评审」段(已"别默认 main"、不在此重复)。
```

- [ ] **Step 2: 脊柱 ⑤ 段 ISOLATE nod**

在 `SKILL.md` 找到：

```
- **两分支共有硬闸**:clean-baseline、ISOLATE(优先原生 worktree 工具)、**在 ② 预先约定的测试缝隙上写失败测试**(TDD)、per-task 两阶段评审(spec 符合 + 代码质量)。
```

替换为：

```
- **两分支共有硬闸**:clean-baseline、ISOLATE(优先原生 worktree 工具、从当前 HEAD 切、`<type>/<change-name>` 分支名)、**在 ② 预先约定的测试缝隙上写失败测试**(TDD)、per-task 两阶段评审(spec 符合 + 代码质量)。
```

- [ ] **Step 3: 锚点核验 + BASE 未动核验**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "从当前 HEAD 切" skills/recon-driven-dev/references/implementation.md
grep -n "type/<change-name>\|<type>/<change-name>" skills/recon-driven-dev/references/implementation.md skills/recon-driven-dev/SKILL.md
grep -n "别默认 main\|merge-base" skills/recon-driven-dev/references/implementation.md
```
Expected: 前两条命中；第三条仍显示原 BASE 口径句**原样存在**（确认 BASE 未被改）。

- [ ] **Step 4: 单一权威自核**

人工确认：分支规范只落 `implementation.md` ISOLATE 闸一处；脊柱只 nod（不复述 type 集合的语义细则）；BASE 口径未被复制/改动。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/implementation.md skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): ⑤ ISOLATE 闸补分支命名规范(从当前 HEAD 切 + type/<change-name>)

治建分支无命名规范:对齐 superpowers「以当前分支为准、描述性名」——
从当前 HEAD 切(非强制 main)+ 分支名 <type>/<change-name>(复用起步 change-name);
BASE 口径不动(本就别默认 main);脊柱 nod。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: CHANGELOG 立条目 + `MAINTAINING.md` 7 条改后验证 rubric

**Files:**
- Modify: `skills/recon-driven-dev/CHANGELOG.md`（顶部新增 v0.5.8 条目）

**Interfaces:**
- Consumes: Task 1 / Task 2 的全部改动（本任务是收尾闸）。
- Produces: v0.5.8 CHANGELOG 条目；一份通过的 7 条 rubric 核验记录。

- [ ] **Step 1: 过 `MAINTAINING.md` 改后验证 rubric（全 7 条 + 消费者映射）**

按 `MAINTAINING.md`「3. 改后验证 rubric」逐条核，把结论写进本步骤的 commit message 或临时记（scratchpad）：

- A1 自包含性【唯一硬约束】：无外部 skill / 脚本 / 持久件 → 应通过。
- A2 单一权威源：澄清判据仅 `requirements-design.md`、分支规范仅 `implementation.md`；脊柱只亮牌/nod。**消费者映射**：改了 ② 硬规则 → 谁按名消费？②自评/③定向报告验收/⑤ TDD 读"必覆盖清单②"——本次未改清单②的名，无需同步。改了 ISOLATE → ⑤ 实施一条链消费，`code-reviewer.md` 只接收主会话取好的 diff、不读分支名规则，无需同步。
- A3 分层归位：运行约束落脊柱、判据落 reference → 应通过。
- A4 派发-降级对称：本次不涉派发侧契约 → N/A。
- A5 阶段衔接·不回流：线性没破；② 信号产出义务、⑤ 测试缝隙约定均未动 → 应通过。
- B6 可执行性：新增均为祈使动作工单（"先问用户"/"从当前 HEAD 切"/"分支名=…"）→ 应通过。
- B7 单路径承载【防膨胀】：② 路径 +~6 行、⑤ 路径 +~3 行，未破软上限 → 应通过。

任一条不过 → 回 Task 1/2 就地修，改完重跑本步。

- [ ] **Step 2: 顶部插入 v0.5.8 CHANGELOG 条目**

在 `skills/recon-driven-dev/CHANGELOG.md` 的 `记 what + why...` 行之后、`## v0.5.7` 之前，插入：

```
## v0.5.8 — 补两条运行护栏:② 澄清硬闸「别猜先问」+ ⑤ 分支命名规范(对齐 superpowers)

**what**:
- **② 澄清硬闸(`requirements-design.md` 三硬规则→四硬规则)**:新增「别猜、先问(don't guess)」硬规则——遇实质不确定/分叉先问用户、不自行拍板;有合理默认可自决但须按 ADR 记进必覆盖清单②。配反合理化红旗表(4 行)。脊柱 ② 段同名亮牌、判据只住 reference。
- **⑤ 分支命名(`implementation.md` ISOLATE 闸)**:补「起隔离分支从当前 HEAD 切(不强制回 main)+ 分支名 `<type>/<change-name>`(type∈{feature,fix,chore,docs,refactor}、change-name 复用起步生成的)」。脊柱 ⑤ ISOLATE 一行加 nod。BASE 口径不动(本就别默认 main)。

**why**:用户通过他模型实测报两个现场问题——① ② 遇不确定不问、自作主张(结构层"一次一问"已有,缺命令层那句祈使被提升为硬规则);② ⑤ 建分支无命名规范。参照本地 superpowers 仓对齐:问题①承 `executing-plans`「Ask for clarification rather than guessing」+ `brainstorming` Q&A;问题②承 `using-git-worktrees`(`-b` 默认从当前 HEAD 切、描述性名)+ `finishing-a-development-branch`(BASE 不假设 main)。校准式(ADR 逃生阀)防矫枉过正成"事事都问"。

**诚实定性**:**运行行为变更 / 能力提升**(非纯元层)——② ⑤ 运行行为各加一道护栏;守自包含(零外部依赖、承 superpowers 是借鉴非调用)+ 单一权威(澄清判据仅 requirements-design、分支规范仅 implementation、脊柱只亮牌/nod)+ 防膨胀(②+~6 行、⑤+~3 行)。
```

- [ ] **Step 3: 核验 CHANGELOG 格式**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "## v0.5.8\|## v0.5.7" skills/recon-driven-dev/CHANGELOG.md
```
Expected: v0.5.8 在 v0.5.7 正上方（第一处命中是 v0.5.8）。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/CHANGELOG.md
git commit -m "docs(recon-driven-dev): CHANGELOG v0.5.8——② 澄清硬闸 + ⑤ 分支命名

过 MAINTAINING 7 条改后验证 rubric(含消费者映射)无破;诚实定性=运行行为变更/能力提升。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（写完计划后自查）

**1. Spec coverage**（逐条对 spec 落点清单 §6 + 验收 §7）：
- spec §3.1 第 4 条硬规则 → Task 1 Step 1-2 ✓
- spec §3.2 红旗表 → Task 1 Step 2 ✓
- spec §3.3 脊柱亮牌 → Task 1 Step 3 ✓
- spec §4.1 ISOLATE 从当前 HEAD 切 + `<type>/<change-name>` → Task 2 Step 1 ✓
- spec §4.2 BASE 不改 → Task 2 Step 3 核验（grep 确认原句在）✓
- spec §4.3 脊柱 nod → Task 2 Step 2 ✓
- spec §6 CHANGELOG → Task 3 Step 2 ✓
- spec §5 / §7 MAINTAINING 7 rubric → Task 3 Step 1 ✓
- 无遗漏。

**2. Placeholder scan**：无 TBD/TODO；每个编辑步给出精确原文→新文全文，无"类似 Task N"。✓

**3. Type consistency**：贯穿使用 `<change-name>`（不带日期）、`<type>/<change-name>`、type 集合 `{feature,fix,chore,docs,refactor}`、"必覆盖清单②" 命名一致；脊柱术语"别猜先问硬闸"与 reference"别猜、先问"同源。✓

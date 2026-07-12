# recon-driven-dev 整改 · 批次 A（工作区地基）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **本 plan 只覆盖批次 A。** 整改共 6 批(0/A/B/C/D/E),按 writing-plans 的 Scope Check「一批一计划、各自可独立测试」拆分。批次序、证伪宿主与各批范围见同目录 `design.md` §13;跨批进度与「下一步写谁的 plan」见同目录 `progress.md`;批次×spec§×文件×回归验证×验收的对照见 `batch-map.md`。**批次 B/C/E 的 plan 就地即时写(前一批实跑验证后再写),批次 D 待真实 Codex trace。**

**Goal:** 给 recon-driven-dev 铺好工作区地基——去安装根硬编码、加 preflight 与 run-state、把隔离从⑤前移到起步、统一 START_SHA/WORK_ROOT/ARTIFACT_ROOT,让①至⑤跑在同一受控快照上。

**Architecture:** 纯 Skill 文档编辑(改 Skill 自己)。新建 2 个文件(run-state.md 模板 + runtime-contract.md 起步常载骨架)、改 6 个运行文件。无可跑的自动化测试;"验证" = 锚点 grep + `MAINTAINING.md` 7 条改后验证 rubric(含消费者映射)+ **批次 A 单宿主实跑**(Claude Code 跑一个简单单仓任务,含 dirty 与干净两态)。判据单一权威落 reference、脊柱只亮牌/路由。

**Tech Stack:** Markdown(`skills/recon-driven-dev/`);核验用 `grep` / `git`。

## Global Constraints

逐条来自已获批 `design.md`(同目录)与 `skills/recon-driven-dev/MAINTAINING.md`,每个任务隐含遵守:

- **自包含性【唯一硬约束】**:不引入任何外部 skill 调用 / 脚本 / 跨会话持久件依赖。run-state.md 是 per-change、随本次产物目录走、归档即弃(同进度账本豁免),**不是跨项目长期上下文**(design §7)。
- **单一权威源**:路径/工作区/状态判据只住 `runtime-contract.md` 与 `implementation.md`;脊柱只亮牌/路由、不复述(design §8 单一权威纲)。
- **分层归位**:运行约束落脊柱、判据落 reference、治理规则落 MAINTAINING。
- **薄账(design §4.3)**:`runtime-contract.md` 起步只常载「能力握手 + 路径事实」两段;权限边界/宿主适配示例/降级细则按需读、不进常载。`run-state.md` 是写入模板、跨阶段只读回已写字段。
- **批次 A 边界**:本批只落**单宿主(Claude)可验**的地基与 Claude 能力映射骨架;**Codex 能力映射、文件系统不共享降级、工具名→能力名全量抽象属批次 D**,本批遇到就标 `<!-- 批次 D 补 -->` TODO、不在本批写死。
- **不动 BASE 语义细节**:BASE 固定为 START_SHA 属**批次 C**;本批只负责在 preflight *记录* START_SHA,不改 implementation.md 的整支评审取 diff 逻辑。
- **诚实定性**:本批是**运行行为变更 / 正确性修复**(非纯元层),CHANGELOG 须如实标注;跨宿主效果本批不宣称(design §17)。
- **change-name 语义**:`<change-name>` 指起步生成的 kebab-case 短名;产物目录 `docs/recon-driven-dev/<YYYY-MM-DD>-<change-name>/`。

---

### Task A1: 去安装根硬编码 + README 过期路径（纯清理 · 独立可验）

**Files:**
- Modify: `skills/recon-driven-dev/README.md`（第 66 行 `~/.claude/skills/` 前提句、第 78 行 `incubating/recon-driven-dev` 路径）
- Modify: `skills/recon-driven-dev/references/review-agent.md:22`（模板路径）
- Modify: `skills/recon-driven-dev/references/code-reviewer.md:21`（模板路径）
- Modify: `skills/recon-driven-dev/references/templates/review.md:4`（判据路径）
- Modify: `skills/recon-driven-dev/references/templates/code-review.md:4`（判据路径）

**Interfaces:**
- Consumes: 无（起手清理）。
- Produces: 全仓 `grep -rn "~/.claude" skills/recon-driven-dev` 归零；README 无 `incubating/recon-driven-dev`。后续任务不依赖本任务产物，可独立提交。

- [ ] **Step 1: 把 5 处 `~/.claude/skills/recon-driven-dev/...` 绝对模板路径改为 skill 内相对路径**

四处引用模板/判据的绝对路径 → 改为相对本文件的路径。逐个替换：

`references/review-agent.md:22` 中 `~/.claude/skills/recon-driven-dev/references/templates/review.md` → `templates/review.md`（review-agent.md 与 templates/ 同在 references/ 下）。

`references/code-reviewer.md:21` 中 `~/.claude/skills/recon-driven-dev/references/templates/code-review.md` → `templates/code-review.md`。

`references/templates/review.md:4` 中 `~/.claude/skills/recon-driven-dev/references/review-agent.md` → `../review-agent.md`。

`references/templates/code-review.md:4` 中 `~/.claude/skills/recon-driven-dev/references/code-reviewer.md` → `../code-reviewer.md`。

- [ ] **Step 2: README 第 66 行安装前提句去硬编码**

`README.md:66` 找到 `前提:recon-driven-dev 已装到 ~/.claude/skills/(任何项目的会话都能调用)。` → 改为不绑定具体安装根的表述：`前提:recon-driven-dev 已按你宿主的 skill 装载方式装好(任何项目的会话都能调用)。`

- [ ] **Step 3: README 第 78 行过期 Skill 路径改为 skills/**

`README.md:78` 找到 `Skill 位置:`/Users/lilongjian/Projects/AI/skill-forge/incubating/recon-driven-dev`` → 改为 `Skill 位置:`skills/recon-driven-dev`(本仓已毕业,不再在 incubating/)`。

- [ ] **Step 4: 锚点核验**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -rn "~/.claude" skills/recon-driven-dev/ ; echo "exit=$?（期望无输出 / exit=1）"
grep -rn "incubating/recon-driven-dev" skills/recon-driven-dev/README.md ; echo "exit=$?（期望无输出）"
```
Expected: 两条 grep 均无输出（`~/.claude` 全清、README 无 incubating 路径）。CHANGELOG.md 里的历史记述 `~/.claude` 属沿革留痕、不在清理范围。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/README.md skills/recon-driven-dev/references/review-agent.md skills/recon-driven-dev/references/code-reviewer.md skills/recon-driven-dev/references/templates/review.md skills/recon-driven-dev/references/templates/code-review.md
git commit -m "fix(recon-driven-dev): 批次A-去安装根硬编码 + README 过期路径

5 处 ~/.claude 绝对模板路径→skill 内相对路径;README incubating/→skills/。
纯清理、不改运行行为。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task A2: 新建 `run-state.md` 模板（per-change 运行状态）

**Files:**
- Create: `skills/recon-driven-dev/references/templates/run-state.md`

**Interfaces:**
- Consumes: 无（模板本体）。
- Produces: 一份含 design §7 全字段的写入模板，供 Task A4（preflight 创建它）、批次 B（阶段/状态字段）、批次 C（verification-mode 字段）按名写入。字段名即契约：`change-name` / `phase` / `state` / `SOURCE_ROOT` / `WORK_ROOT` / `ARTIFACT_ROOT` / `START_SHA` / `INITIAL_STATUS` / `HOST` / `verification-mode` / `verification-profile`。

- [ ] **Step 1: 写模板全文**（内容锚点见 design §7，字段逐条落）

创建 `references/templates/run-state.md`，正文为一份**填空模板 + 一句用途说明**（判据不复述、只放字段与合法取值枚举）：

```markdown
# run-state · <change-name> · <YYYY-MM-DD>

> 本次变更的运行状态（per-change scratch，落本次产物目录、随归档清；**非跨项目长期上下文**）。
> 每次用户暂停前先更新本文件，保证 compaction / 任务恢复后能机械判断当前状态。判据不在此复述——只记事实字段。

- change-name / date: <…> / <YYYY-MM-DD>
- phase: <① | ② | ③ | ④ | ⑤>
- state: <draft | gated | user-approved | superseded | completed | aborted>
- SOURCE_ROOT: <用户原始工作区绝对路径>
- WORK_ROOT: <①至⑤实际执行工作区绝对路径>
- ARTIFACT_ROOT: <本次产物目录绝对路径>
- START_SHA: <本次改动开始前精确 HEAD>
- INITIAL_STATUS: <任务开始前 git status 摘要>
- HOST: <宿主类型 + 能力降级项 + isolation-waiver（若有）>
- 用户批准版本: requirements=<版本/摘要> design=<…> tasks=<…>
- ③ 执行: <是 / 否 + 原因>
- ④ 执行方式: <内联 | 每任务一个新子 agent>
- verification-mode: <automated-tdd | executable-check | manual-evidence>
- verification-profile: <scoped/full/lint/format/typecheck/build 各自适用范围+预期+时限，或不可执行原因>
- baseline 已知失败: <…>
- 修订/复评轮次: <…>
- FINISH 选择: <本地合并 | push+PR | 保留 | 丢弃>
```

> 字段的**语义与合法转移**由 runtime-contract.md（路径/状态）与各阶段 reference 持有；本模板只提供写入位。

- [ ] **Step 2: 锚点核验**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -c "START_SHA\|verification-mode\|isolation-waiver\|WORK_ROOT" skills/recon-driven-dev/references/templates/run-state.md
```
Expected: ≥4（关键字段齐）。人工确认无判据复述（只有字段名 + 取值枚举）。

- [ ] **Step 3: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/templates/run-state.md
git commit -m "feat(recon-driven-dev): 批次A-新建 run-state.md 模板(per-change 运行状态)

design §7 全字段填空模板;per-change scratch、随归档清、非持久上下文;
只放字段+取值枚举、判据不复述。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task A3: 新建 `runtime-contract.md` 起步常载骨架（能力握手 + 路径事实 · Claude 映射）

**Files:**
- Create: `skills/recon-driven-dev/references/runtime-contract.md`

**Interfaces:**
- Consumes: 无（契约本体）。
- Produces: 起步常载两段——「能力握手表」（6 能力名 + 语义，design §5.1）与「路径事实清单」（SKILL_ROOT/SOURCE_ROOT/WORK_ROOT/ARTIFACT_ROOT/START_SHA/INITIAL_STATUS/HOST，design §5.3）。供 Task A4 的 preflight 消费。**Codex 能力映射、文件系统不共享降级、权限边界细则标 `<!-- 批次 D 补 -->`。**

- [ ] **Step 1: 写「能力握手」段（起步常载）**

创建 `references/runtime-contract.md`，首段为能力名接口表（照 design §5.1）：

```markdown
# 运行前置契约（宿主能力握手 + 路径事实）

> **起步常载**:只读下面「能力握手」与「路径事实」两段。权限边界、宿主适配示例、降级细则在本文件后段、**按需/异常分支才读**(薄账 design §4.3)。

## 能力握手（用能力名、不绑具体工具名）

| 能力 | 语义 |
|---|---|
| spawn-fresh-agent | 派一个真正不继承主会话历史的子 agent |
| read-search | 读取文件并搜索代码，不限定具体工具名 |
| write-owned-file | 仅写本任务明确拥有的文件 |
| run-command | 执行只读检查、测试与 git 命令 |
| isolate-workspace | 创建或进入隔离工作区 |
| shared-artifact-path | 主/子 agent 可访问同一产物路径 |

**Claude Code 映射(参考、非判据)**:Task→spawn-fresh-agent;Read/Grep/Glob→read-search;Write→write-owned-file;Bash→run-command;原生 worktree 工具→isolate-workspace。

<!-- 批次 D 补:Codex 能力映射(零历史 sub-agent / shell search / patch / git);宿主强制流程优先;spawn-fresh-agent 不可用与文件系统不共享的降级路径(design §5.1) -->
```

- [ ] **Step 2: 写「路径事实」段（起步常载）**

紧接追加（照 design §5.3）：

```markdown
## 路径事实（preflight 必确定并写入 run-state.md）

- SKILL_ROOT:当前已加载 SKILL.md 所在目录（**不猜安装根**）
- SOURCE_ROOT:用户原始工作区
- WORK_ROOT:①至⑤实际执行的工作区
- ARTIFACT_ROOT:本次产物目录绝对路径
- START_SHA:本次改动开始前精确 HEAD
- INITIAL_STATUS:任务开始前工作区状态
- HOST:宿主类型与能力降级项

任何 reference 或模板不得再猜 `~/.claude/skills` 等安装根。
```

- [ ] **Step 3: 权限边界段占位（后段、非常载）**

追加一段标题 + 批次 D TODO（避免本批写死跨宿主内容，但先占好位）：

```markdown
## 权限边界与降级（按需读、不进常载）

<!-- 批次 D 补:prompt 工具列表是能力需求非 ACL;子 agent 只读权限不可配时主会话核对流程(design §5.2);spawn-fresh-agent/文件系统降级(design §5.1) -->
```

- [ ] **Step 4: 锚点核验 + 薄账自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "spawn-fresh-agent\|SKILL_ROOT\|批次 D 补" skills/recon-driven-dev/references/runtime-contract.md
```
Expected: 能力名、路径名、批次 D TODO 各命中。人工确认：常载两段之外的内容都在「按需读」标题下或 TODO 里（薄账兑现的结构前提）。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/runtime-contract.md
git commit -m "feat(recon-driven-dev): 批次A-新建 runtime-contract.md 起步骨架

能力握手表(6 能力名+Claude 映射)+ 路径事实清单;常载两段、余按需读(薄账);
Codex 映射/降级/权限细则标批次 D TODO。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task A4: preflight gate（SKILL.md 起步路由 + 顺序）

**Files:**
- Modify: `skills/recon-driven-dev/SKILL.md`（「起步:建本次产物目录」段，约 43-45 行）

**Interfaces:**
- Consumes: `runtime-contract.md`（能力握手 + 路径事实）、`templates/run-state.md`（写入位）。
- Produces: 脊柱一个 preflight 路由钩子（只路由、细则住 runtime-contract.md），把起步顺序改为 design §6.1 的 7 步：检测→判归属→建 WORK_ROOT→记 START_SHA→建 ARTIFACT_ROOT→创建 run-state→进①。

- [ ] **Step 1: 起步段前置 preflight 路由**

`SKILL.md` 找到「起步:建本次产物目录」段现文（`AI 直接为本次改动定个 kebab-case 短名…别覆盖前一次的产物。`），在其前插入 preflight 路由块（**只亮顺序 + 指针，细则住 runtime-contract.md**）：

```markdown
## 起步:preflight gate(五阶段之前的前置门)

进①前先按 [`references/runtime-contract.md`](references/runtime-contract.md) 完成能力握手与路径事实,顺序:

1. 检测 repo / 分支 / detached-HEAD / 现有 worktree / dirty status;
2. 判断初始未提交改动是否属于本任务(归属见 runtime-contract);
3. 建立或确认 WORK_ROOT;
4. 记录 START_SHA;
5. 在 WORK_ROOT 下创建 ARTIFACT_ROOT(本次产物目录);
6. 用 [`references/templates/run-state.md`](references/templates/run-state.md) 建 run-state.md;
7. 进入阶段①。

**preflight 是 gate、不是第六阶段**;细则(能力握手 / 路径 / dirty 归属三分支 / 降级)单一权威在 runtime-contract.md,脊柱不复述。
```

- [ ] **Step 2: 原「起步:建本次产物目录」段收敛为 ARTIFACT_ROOT 命名规则**

原段落里「定 kebab-case 短名 + 冠日期 + 目录已存在就换名」的产物命名规则**保留**（它是 ARTIFACT_ROOT 的命名细则），但把标题降级、并点明它是 preflight 第 5 步的展开，避免与新 preflight 段重复顺序。将原标题 `## 起步:建本次产物目录` 改为 `### ARTIFACT_ROOT 命名(preflight 第 5 步展开)`。

- [ ] **Step 3: 锚点核验 + 单一权威自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "preflight gate\|START_SHA\|ARTIFACT_ROOT 命名" skills/recon-driven-dev/SKILL.md
```
Expected: preflight 路由、START_SHA、命名小节各命中。人工确认脊柱 preflight 段**只列 7 步顺序 + 指针**，不复述 runtime-contract 的能力握手表 / dirty 归属判据。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): 批次A-加 preflight gate(脊柱起步路由)

进①前 7 步 preflight(检测→判归属→WORK_ROOT→START_SHA→ARTIFACT_ROOT→run-state→①);
只路由、判据住 runtime-contract.md;原产物命名收为 preflight 第5步展开。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task A5: 前移隔离 + dirty worktree 三分支（implementation.md + SKILL.md）

**Files:**
- Modify: `skills/recon-driven-dev/references/implementation.md`（ISOLATE 硬闸，第 23 行那条 + 共有硬闸序号）
- Modify: `skills/recon-driven-dev/SKILL.md`（⑤ 段共有硬闸行，约 105 行）

**Interfaces:**
- Consumes: preflight 记录的 WORK_ROOT / START_SHA / INITIAL_STATUS（Task A4）。
- Produces: ISOLATE 不再是⑤的闸，改为 preflight 阶段动作;⑤ 只保留 clean-baseline（在最终 WORK_ROOT 内运行）。dirty worktree 三分支(属本任务/无关/归属不清)判据落 runtime-contract.md 或 implementation.md（择一，不两处）。

- [ ] **Step 1: implementation.md 的 ISOLATE 闸改为「消费 preflight 结果」**

`references/implementation.md` 找到「共有硬闸」第 2 条 ISOLATE（`2. **ISOLATE**:别直接在 main / master 上动手…`整条），改为指回 preflight：

```markdown
2. **ISOLATE(已在 preflight 完成)**:隔离在起步 preflight 就已建立(design §6.1),⑤ 不再新建 worktree,只在 preflight 定下的 WORK_ROOT 内落地。分支从 START_SHA 所在 HEAD 切、`<type>/<change-name>` 命名等细则仍住 preflight/runtime-contract;⑤ 只**确认** WORK_ROOT 与依赖就绪。dirty worktree 的三分支归属(属本任务 / 无关 / 归属不清)判据见 runtime-contract.md,不在此复述。
```

- [ ] **Step 2: clean-baseline 条补「在最终 WORK_ROOT 内运行」**

同文件「共有硬闸」第 1 条 clean-baseline（`1. **clean-baseline**:进工作区后先跑现有测试…`）末尾补一句：`——本闸在 preflight 定下的最终 WORK_ROOT 内、依赖就绪后运行(隔离已前移,不再等到此刻建工作区)。`

- [ ] **Step 3: SKILL.md ⑤ 段共有硬闸行去掉 ISOLATE、指向 preflight**

`SKILL.md` 找到 ⑤ 段「两分支共有硬闸」行（`clean-baseline、ISOLATE(优先原生 worktree 工具、从当前 HEAD 切、`<type>/<change-name>` 分支名)、…`），把 ISOLATE 从⑤硬闸移除、改为一句 nod：

```markdown
- **两分支共有硬闸**:clean-baseline(在 preflight 定下的 WORK_ROOT 内跑)、**在 ② 预先约定的测试缝隙上写失败测试**(TDD)、per-task 两阶段评审(spec 符合 + 代码质量)。**隔离已在起步 preflight 完成**(不再是⑤的闸)。
```

- [ ] **Step 4: dirty 三分支判据落一处（runtime-contract.md）**

`references/runtime-contract.md` 的「路径事实」段后、批次 D TODO 前，追加 dirty 归属判据（design §6.2，本批就近落它、因它是 preflight 消费的地基）：

```markdown
## dirty worktree 归属（preflight 判，落一处）

初始工作区有未提交改动时:
- **属于本任务且实施须承接**:不从裸 HEAD 建新 worktree 后静默丢失;让用户选「原隔离工作区继续」或「先把改动形成可追踪快照」。
- **与本任务无关**:不自动 stash/reset/stage/commit;新工作区从 START_SHA 建、①也只读新工作区。
- **归属不清**:暂停、列文件、交用户判断。
```

- [ ] **Step 5: 锚点核验 + 派发-降级/单一权威自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "ISOLATE(已在 preflight 完成)\|隔离已在起步 preflight\|dirty worktree 归属" skills/recon-driven-dev/references/implementation.md skills/recon-driven-dev/SKILL.md skills/recon-driven-dev/references/runtime-contract.md
```
Expected: 三处各命中。人工确认：ISOLATE 细则/ dirty 判据**只在 runtime-contract 一处**（implementation 与脊柱只 nod/指针）；未破「派发只看隔离能力」的既有对称。

- [ ] **Step 6: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/implementation.md skills/recon-driven-dev/SKILL.md skills/recon-driven-dev/references/runtime-contract.md
git commit -m "feat(recon-driven-dev): 批次A-隔离前移至 preflight + dirty 三分支归属

ISOLATE 从⑤前移到起步 preflight,⑤ 只在最终 WORK_ROOT 跑 clean-baseline;
dirty worktree 三分支归属判据落 runtime-contract 一处;脊柱/implementation 只 nod。
修①-⑤工作区/产物分裂、dirty 静默丢失的根因。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task A6: 批次 A 收尾（消费者映射 + 7 rubric 相关条 + CHANGELOG + 单宿主实跑）

**Files:**
- Modify: `skills/recon-driven-dev/CHANGELOG.md`（顶部新增批次 A 条目）
- Modify: `skills/recon-driven-dev/README.md`（目录结构树补 runtime-contract.md 与 run-state.md 两行）
- Update: 同目录 `progress.md`（批次 A 行标 done + 记实跑 trace 路径）

**Interfaces:**
- Consumes: Task A1–A5 全部改动。
- Produces: 批次 A 的 CHANGELOG 条目 + 一次单宿主实跑证伪记录 + progress.md 状态推进。

- [ ] **Step 1: README 目录树补两个新文件**

`README.md` 「目录结构」的 `references/` 树里，`recon-agent.md` 行后补 `├── runtime-contract.md    # preflight 能力握手 + 路径事实(起步常载)`；`templates/` 下 `code-review.md` 行后补 `└── run-state.md       # per-change 运行状态(preflight 建、随归档清)`。

- [ ] **Step 2: 过 MAINTAINING 改后验证 rubric（批次 A 相关条 + 消费者映射）**

按 `MAINTAINING.md`「3. 改后验证 rubric」逐条核，结论记进 commit message：
- **A1 自包含**【硬约束】:无外部 skill/脚本;run-state.md 是 per-change scratch(同进度账本豁免)→ 应通过。
- **A2 单一权威**:路径/dirty 判据仅 runtime-contract、ISOLATE 仅 preflight;脊柱/implementation 只 nod。**消费者映射**:改了起步顺序 → SKILL.md 起步段 + implementation ISOLATE/clean-baseline + directed-analysis(①读 WORK_ROOT)按名消费;逐一确认无漏、无第二处判据。
- **A3 分层归位**:preflight 路由落脊柱、契约落 runtime-contract、字段落模板 → 应通过。
- **A4 派发-降级对称**:本批未动派发侧契约(Codex 降级属批次 D)→ N/A。
- **A5 阶段衔接**:线性未破;②信号义务、⑤测试缝隙约定未动;起步→①接缝新增,①改读 WORK_ROOT → 确认 directed-analysis 已按名读 → 应通过。
- **B1 可执行性**:新增均为动作工单(检测/记录/建目录)→ 应通过。
- **B2 单路径承载**【防膨胀】:常载净增 = runtime-contract 两段 + run-state 写入(非通读);**本批只结构上保证"余按需读",完整字节核账留批次 E §4.3 兑现** → 本批标「结构就绪、待 E 兑现」。

任一条不过 → 回对应 Task 就地修，改完重跑本步。

- [ ] **Step 3: 顶部插入批次 A CHANGELOG 条目**

`CHANGELOG.md` 顶部（最新版本条目正上方）插入：

```markdown
## <下一版本号> — 整改批次 A:工作区地基(preflight + 隔离前移 + run-state + 去硬编码)

**what**:
- 去 5 处 ~/.claude 安装根硬编码、README incubating/→skills/(纯清理)。
- 新建 runtime-contract.md(能力握手 6 能力名 + 路径事实,起步常载;Codex 映射/降级标批次 D TODO)与 run-state.md 模板(design §7 全字段,per-change scratch)。
- 加 preflight gate:进①前 7 步(检测→判归属→WORK_ROOT→START_SHA→ARTIFACT_ROOT→run-state→①);脊柱只路由。
- 隔离从⑤前移到 preflight,①-⑤跑同一 WORK_ROOT/ARTIFACT_ROOT;dirty worktree 三分支归属判据落 runtime-contract 一处。

**why**:修 design §1 的两个根因——①-④在原 checkout 产文档、⑤才建 worktree 导致代码快照/产物/工作区分裂、dirty 改动可能静默丢失;安装根硬编码伤可移植性。

**诚实定性**:**运行行为变更 / 正确性修复**(非纯元层);跨宿主效果本批不宣称(Codex 映射属批次 D)。守自包含(run-state 是 per-change scratch)+ 单一权威(路径/dirty 仅 runtime-contract、脊柱只路由)。B2 薄账结构就绪、完整核账待批次 E。
```

- [ ] **Step 4: 批次 A 单宿主实跑证伪（回归验证，见 batch-map.md 批次 A 行）**

在 Claude Code 里拿一个**简单单仓任务**跑一遍五阶段，重点观测（batch-map.md 批次 A 的 ⚠️ 条）：
1. 五阶段产物是否都落在同一个 ARTIFACT_ROOT、彼此可寻；
2. preflight 记的 START_SHA == 开工前 `git rev-parse HEAD`；
3. 干净工作区跑简单任务时 preflight 不啰嗦；
4. **开工前故意留 dirty 改动** → 确认既没被丢、也没被误提交；
5. 去硬编码/相对路径后 Claude 侧照跑无碍。

把实跑监督笔记落 `docs/recon-driven-dev-eval/<date>-<task>/`，路径记进 progress.md 批次 A 行。**发现退化 → 只回退批次 A、不动其他。**

- [ ] **Step 5: Commit + 推进 progress.md**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/CHANGELOG.md skills/recon-driven-dev/README.md docs/superpowers/recon-driven-dev-remediation/progress.md
git commit -m "docs(recon-driven-dev): 批次A 收尾——CHANGELOG + README 目录树 + 实跑留痕

过 MAINTAINING rubric(批次A相关条,B2 结构就绪待E兑现);单宿主实跑证伪已记 progress。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（写完计划后自查）

**1. Spec coverage**（对 design §13 批次 A 范围 + 完成判据）：
- 新建 run-state.md 模板 → Task A2 ✓
- 去工具名与安装根硬编码 → Task A1（安装根 ✓；**工具名→能力名全量抽象属批次 D**，本批只落 runtime-contract 能力握手骨架 = Task A3 ✓，边界已在 Global Constraints 声明）
- 加 preflight → Task A4 ✓
- 前移隔离并统一 START_SHA/WORK_ROOT/ARTIFACT_ROOT → Task A4（顺序）+ Task A5（ISOLATE 前移）✓
- 完成判据「dirty 不静默丢失」→ Task A5 + A6 Step4 实跑 ✓；「①-⑤单一 WORK_ROOT/ARTIFACT_ROOT」→ Task A4/A5 ✓；「START_SHA 与实际 HEAD 一致」→ A6 Step4 实跑 ✓
- 无遗漏（工具名全量抽象明确划归批次 D，非本批漏项）。

**2. Placeholder scan**：无 TBD/TODO 作为交付内容；`<!-- 批次 D 补 -->` 是**有意的跨批边界标记**（design §13 定的降级骨架先行），非占位符偷懒；每个编辑步给出精确锚点 + 新文全文。✓

**3. Type consistency**：字段名贯穿一致——run-state.md 定义的 `START_SHA`/`WORK_ROOT`/`ARTIFACT_ROOT`/`verification-mode` 与 runtime-contract.md 路径事实、preflight 7 步、CHANGELOG 同名；能力名 `spawn-fresh-agent` 等六个与 design §5.1 同源。✓

---

## Execution Handoff

批次 A plan 就绪。执行由用户在需要时启动（本轮属批次 0，不自动进入实施）。两种执行方式（写码时选）：
1. **Subagent-Driven（推荐）**——每任务派 fresh 子 agent + 两阶段评审，符合本 skill ⑤ 的 per-task 评审范式。
2. **Inline Execution**——本会话内按 executing-plans 批量执行、checkpoint 复审。

**批次 A 跑完并单宿主实跑证伪后**，再回来就地写批次 B 的 plan（见 progress.md「下一步」）。

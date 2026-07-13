# Codex 家族收敛到 incubating skill —— Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 codex-* 开发/审查家族从 `~/.claude/commands/` 全局命令收敛到本仓 `incubating/` skill —— 4 退役 + 3 新建。

**Architecture:** 保真搬迁(`cp` 源命令 → 目标 skill 路径,再对少数引用点做确切 old→new 改写),而非重写正文。task-review 降级为 codex-task 的内部 references;codex-task / codex-batch 转为 skill;codex-review 直接归档。改写只碰:frontmatter(命令型→skill 型)、`本命令`→`本 Skill`、以及对 `/codex-review`·`/security-review`·`task-review` 命令名·`~/.claude/commands/codex-task.md` 死路径这几处引用。

**Tech Stack:** Markdown skill 文件;`cp` + Edit 工具 + `grep` 验证;`git`(仓库内产物)+ 文件系统 `mv`(仓库外全局命令归档)。

## Global Constraints

- **语言**:全程简体中文(仓库 `principles.md`)。
- **保真优先**:命令→skill 仅搬迁 + 本计划枚举的确切改写;分工总则、三条铁律、sidecar 台账、`[~]` 崩溃恢复、计划定位正则、双模、flags、安全关键判定清单一律**原样保留**,不借机改动。
- **不自动触发**:codex-task / codex-batch 的 `description` 末尾必含「**不自动触发,由用户显式调用。**」
- **自包含·不点名外部指令**:skill 正文不引用外部命令/skill 的 slash 名。上线闸门等收尾建议改为**通用表述**、由用户显式发起,不点名 `/codex-review`、`/security-review`。**功能依赖除外并保留**:`subagent_type: codex:codex-rescue`、`/codex:status`、codex companion 定位式;codex-batch↔codex-task 的家族内委托(以 skill 名/仓库路径引用,非 slash 外部指令)。
- **退役 = 归档不硬删**:全局命令 `.md` 重命名为 `.md.bak-<YYYYMMDD>-retired`。
- **接受 gap**:本轮后 `/codex-task`·`/codex-batch`·`/codex-review` 均不可调用,直至家族毕业到 `skills/` + symlink(毕业为本轮范围外的后续闭合动作)。
- **分支**:已在 `codex-family-to-incubating-skills` 分支上;所有 commit 落此分支。
- **commit 规范**:Conventional Commits 前缀 + 中文描述,末尾附 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

## File Structure

| 文件 | 责任 | 来源 |
|---|---|---|
| `incubating/codex-task/references/task-reviewer.md`(新建) | codex-task 的内部任务级审查模板(reviewer prompt + 收集/派发/输出格式) | 剥离自 `~/.claude/commands/task-review.md` |
| `incubating/codex-task/SKILL.md`(新建) | codex-task 单任务实现流程 skill;step 4 改为读上面的 references 自派 subagent | 迁自 `~/.claude/commands/codex-task.md` |
| `incubating/codex-batch/SKILL.md`(新建) | codex-batch 编排层 skill;委托路径改指 codex-task SKILL.md | 迁自 `~/.claude/commands/codex-batch.md` |
| `incubating/codex-code-review/BACKLOG.md`(改) | 更新"退役立场"一行 + 加家族毕业追踪项 | 现有 |
| `~/.claude/commands/{codex-review,codex-task,task-review,codex-batch}.md`(归档) | 4 个全局命令重命名退役 | 现有 |

**任务顺序(线性依赖)**:Task 1(references)→ Task 2(codex-task,依赖 1 的路径)→ Task 3(codex-batch,依赖 2 的路径)→ Task 4(BACKLOG + 归档,依赖 1–3 产物就位)。

---

### Task 1: task-reviewer.md 内部审查模板(降级 task-review)

**Files:**
- Create: `incubating/codex-task/references/task-reviewer.md`(源:`~/.claude/commands/task-review.md`)

**Interfaces:**
- Consumes: 无(首个任务)。
- Produces: `incubating/codex-task/references/task-reviewer.md` —— Task 2 的 step 4 读它。

- [ ] **Step 1: 建目录并保真拷贝源命令**

```bash
mkdir -p incubating/codex-task/references
cp ~/.claude/commands/task-review.md incubating/codex-task/references/task-reviewer.md
```

- [ ] **Step 2: 基线 grep(确认待剥离串存在)**

Run:
```bash
grep -nE 'category:|/task-review|claude-review|本命令' incubating/codex-task/references/task-reviewer.md
```
Expected: 有命中(frontmatter `category:`、手动 `/task-review` 示例、`claude-review` 独立声明、`本命令`)—— 这些正是本任务要清除的。

- [ ] **Step 3: 替换 frontmatter + 引言(去命令外壳、去独立声明、去手动语义)**

Edit old_string:
```
---
name: "Task Review (任务粒度审查)"
description: "派 general-purpose subagent 对单个任务的产出做结构化审查(借 superpowers);纯执行器,接改动范围+任务要求"
category: Review
tags: [task, review, subagent]
---

对**单个任务的产出**做独立审查:派一个 fresh-context 的 **general-purpose subagent**,对照任务要求审该任务的改动,回结构化结论。**纯审查执行器**——不定位任务、不抽 brief、不 commit、不改码;那些是调用方(如 `codex-task`)的事。

**本命令与 `codex-review`/`claude-review` 相互独立**:它们是广域审(审任意改动/PR),本命令是任务粒度的窄领域,互不调用、互不混。

**跨引擎由调用方保证,本命令不判断引擎**:`codex-task` 里 writer=codex → 派 Claude subagent 天然跨引擎;手动审 Claude 自己写的码 → 同引擎 fresh-context 独立审。
```
new_string:
```
# task-reviewer(codex-task 内部审查模板)

> 本文件是 **codex-task 的内部 references**,非独立命令/skill——不自动触发、无手动入口。由 codex-task step 4 读入,据此派一个 fresh-context 的 **general-purpose subagent**,对照任务要求审该任务的改动,回结构化结论。**纯审查执行器**——不定位任务、不抽 brief、不 commit、不改码;那些是调用方(codex-task)的事。

**跨引擎由调用方保证,本参考不判断引擎**:codex-task 里 writer=codex → 派 Claude subagent 天然跨引擎。
```

- [ ] **Step 4: 去掉 Input 段的手动调用示例(改动范围行)**

Edit old_string:
```
- **改动范围**:缺省 = 工作区未提交改动 + untracked;或 `<base>..<head>` / 单 commit SHA(审已提交改动:后延审、历史任务)。
  - 手动:`/task-review`(工作区)、`/task-review a1b2c3d..e4f5678`(SHA 范围)。
```
new_string:
```
- **改动范围**:缺省 = 工作区未提交改动 + untracked;或 `<base>..<head>` / 单 commit SHA(审已提交改动:后延审、历史任务)。
```

- [ ] **Step 5: 去掉 focus 行的手动调用示例**

Edit old_string:
```
- **审查重点(focus)**:如安全关键清单;调用方注入或手动附加(`/task-review 重点看认证绕过`)。
```
new_string:
```
- **审查重点(focus)**:如安全关键清单;调用方(codex-task)注入。
```

- [ ] **Step 6: `本命令`→`本参考`(剩余两处:派发段与铁律)**

Edit old_string:
```
用 Agent 工具、`subagent_type: general-purpose`、有界任务 `run_in_background: false`(超大改动可 background)。用下方**内联 reviewer 模板**组装 prompt——**不读 superpowers 文件**,本命令自洽。read-only 靠模板铁律约束。
```
new_string:
```
用 Agent 工具、`subagent_type: general-purpose`、有界任务 `run_in_background: false`(超大改动可 background)。用下方**内联 reviewer 模板**组装 prompt——**不读 superpowers 文件**,本参考自洽。read-only 靠模板铁律约束。
```

Edit old_string:
```
- **跨引擎由调用方保证**,本命令不判断引擎。
```
new_string:
```
- **跨引擎由调用方保证**,本参考不判断引擎。
```

- [ ] **Step 7: 验证 —— 待剥离串清零 + 关键内容仍在**

Run:
```bash
echo "--- 应为空 ---"; grep -nE 'category:|/task-review|claude-review|本命令' incubating/codex-task/references/task-reviewer.md || echo "CLEAN"
echo "--- 应命中(模板与自包含性保留) ---"; grep -nE '内联 reviewer 模板|Assessment|read-only|codex-task 内部审查模板|不读 superpowers' incubating/codex-task/references/task-reviewer.md
```
Expected: 第一组 `CLEAN`(无命中);第二组多行命中。

- [ ] **Step 8: Commit**

```bash
git add incubating/codex-task/references/task-reviewer.md
git commit -m "feat(codex-task): 降级 task-review 为 codex-task 内部审查模板 references

$(printf '剥离命令外壳/手动入口/独立声明,保留 reviewer 模板与自包含性。\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: incubating/codex-task/SKILL.md(迁 codex-task 命令)

**Files:**
- Create: `incubating/codex-task/SKILL.md`(源:`~/.claude/commands/codex-task.md`)

**Interfaces:**
- Consumes: `incubating/codex-task/references/task-reviewer.md`(Task 1;step 4 读它派 subagent)。
- Produces: `incubating/codex-task/SKILL.md`,skill 名 `codex-task` —— Task 3 委托它、Task 4 归档前校验它。

- [ ] **Step 1: 保真拷贝源命令(目录已由 Task 1 建好)**

```bash
cp ~/.claude/commands/codex-task.md incubating/codex-task/SKILL.md
```

- [ ] **Step 2: 基线 grep(确认待改写串存在)**

Run:
```bash
grep -nE '/codex-review|security-review|本命令|category:|调 `task-review`|传给 `task-review`' incubating/codex-task/SKILL.md
```
Expected: 命中 frontmatter `category:`、line 10/12/161 `本命令`、step 4 的 `task-review`、line 143 的 `/codex-review`·`security-review`、line 129 的 `/codex-review`。

- [ ] **Step 3: 替换 frontmatter(命令型 → skill 型 + 不自动触发)**

Edit old_string:
```
---
name: "Codex Task (Claude 头尾 + codex 自测)"
description: "codex 全包实现并自测,Claude 只做头尾 + 安全关键任务跨引擎审查;工具无关推进实现计划"
category: Development
tags: [codex, sdd, subagent, review]
---
```
new_string:
```
---
name: codex-task
description: codex 全包实现并自测,Claude 只做头尾 + 安全关键任务跨引擎审查;工具无关推进实现计划中的单个任务。**不自动触发,由用户显式调用。**
---
```

- [ ] **Step 4: 删除对 /codex-review 的独立声明段(原 line 10)**

Edit old_string:
```
**本命令与 `/codex-review` 相互独立——不互相调用、不共享文件依赖,只共享下方铁律。**

```
new_string:（空字符串,整段连同其后空行一并删除）
```

```

- [ ] **Step 5: `本命令`→`本 Skill`(剩余两处:分工总则标题、成批推进段)**

Edit old_string:
```
## 分工总则（本命令的核心）
```
new_string:
```
## 分工总则（本 Skill 的核心）
```

Edit old_string:
```
**连续推进整个计划**（多任务、遇 checkpoint 停车）见 `/codex-batch`——它编排本命令的单任务流程,复用同一 sidecar 台账。
```
new_string:
```
**连续推进整个计划**（多任务、遇 checkpoint 停车）见姊妹 skill **codex-batch**——它编排本 Skill 的单任务流程,复用同一 sidecar 台账。
```

- [ ] **Step 6: 自由模式段的 task-review 引用改写(原 line 34 内一句)**

Edit old_string:
```
**步骤 4** 传给 `task-review` 的任务要求同样用**内联任务描述**替代 `task-<N>-brief.md` 路径
```
new_string:
```
**步骤 4** 派 subagent 审时,任务要求同样用**内联任务描述**替代 `task-<N>-brief.md` 路径
```

- [ ] **Step 7: 改写 step 4 标题**

Edit old_string:
```
### 4. 安全关键任务:跨引擎审 = 调 `task-review`
```
new_string:
```
### 4. 安全关键任务:跨引擎审(读 `references/task-reviewer.md` 自派 subagent)
```

- [ ] **Step 8: 改写 step 4 正文块(调 task-review → 内联派发)**

Edit old_string:
```
- 安全关键 / `--secure` → 调 **`task-review`**(它派 general-purpose subagent 结构化审 codex 写的码)。这是"Claude 审 codex 写的码",引擎分离字面成立(writer=codex ≠ reviewer=Claude subagent)。传给 `task-review`:
  - **改动范围**:默认工作区未提交改动(codex 未 commit);untracked 由 `task-review` 自行收集并要求 subagent `Read`。
  - **任务要求**:本任务 `task-<N>-brief.md` 路径,作 plan-alignment 对照。
```
new_string:
```
- 安全关键 / `--secure` → **读 `references/task-reviewer.md` 模板,自己派 general-purpose subagent 结构化审 codex 写的码**。这是"Claude 审 codex 写的码",引擎分离字面成立(writer=codex ≠ reviewer=Claude subagent)。填充模板时:
  - **改动范围**:默认工作区未提交改动(codex 未 commit);先收集 untracked,把这些路径显式列入 prompt 并要求 subagent `Read`。
  - **任务要求**:本任务 `task-<N>-brief.md` 路径(自由模式用内联任务描述),作 plan-alignment 对照。
```

- [ ] **Step 9: 改写 step 5 论证(去 /codex-review 提法)**

Edit old_string:
```
- **安全关键任务**的 Critical/Important(裁决为「现修」时):**一律退回 codex writer 修 + 重新自测,controller 不直接改安全关键代码**;修完由 `task-review`(Claude)复审通过才 commit——writer=codex、reviewer=Claude 始终成立,跨引擎不破。理由:Claude 直改安全码只能再交 Claude `task-review`(同引擎),或跨命令调 `/codex-review`(破坏 codex-task↔codex-review 独立性),两者都不可取,故安全码写权保持在 codex。
```
new_string:
```
- **安全关键任务**的 Critical/Important(裁决为「现修」时):**一律退回 codex writer 修 + 重新自测,controller 不直接改安全关键代码**;修完由 Claude subagent(按 `references/task-reviewer.md`)复审通过才 commit——writer=codex、reviewer=Claude 始终成立,跨引擎不破。理由:Claude 直改安全码后只能再交 Claude 复审(同引擎),失去引擎分离,故安全码写权保持在 codex。
```

- [ ] **Step 10: 改写软交接(去点名外部指令,通用化)**

Edit old_string:
```
> 本轮涉及 N 个安全关键任务。建议收尾手动跑 `/codex-review` 或 `/security-review` 做上线闸门。
```
new_string:
```
> 本轮涉及 N 个安全关键任务。建议收尾另做一次独立的上线闸门审查(安全 / 跨引擎总审),作为独立关切由用户显式发起。
```

- [ ] **Step 11: 验证 —— 外部引用清零、命令名残留清零、功能依赖与关键结构保留**

Run:
```bash
echo "--- 应为空(外部指令/命令外壳/命令名残留) ---"
grep -nE '/codex-review|security-review|本命令|category:' incubating/codex-task/SKILL.md || echo "CLEAN-1"
echo "--- task-review 命中应全部是 task-reviewer.md ---"
grep -n 'task-review' incubating/codex-task/SKILL.md
echo "--- 应命中(不自动触发 + 功能依赖 + 关键结构保留) ---"
grep -nE 'name: codex-task|不自动触发|references/task-reviewer.md|codex:codex-rescue|/codex:status|\.codex-task/' incubating/codex-task/SKILL.md
```
Expected: 第一组 `CLEAN-1`;第二组每一行都含 `task-reviewer.md`(无裸 `task-review`);第三组多行命中。

- [ ] **Step 12: Commit**

```bash
git add incubating/codex-task/SKILL.md
git commit -m "feat(codex-task): 迁 codex-task 命令为 incubating skill

命令型 frontmatter→skill 型(含不自动触发);step 4 改为读 references/task-reviewer.md
自派 subagent;去 /codex-review 引用、软交接通用化;保留 codex companion 功能依赖。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: incubating/codex-batch/SKILL.md(迁 codex-batch 命令)

**Files:**
- Create: `incubating/codex-batch/SKILL.md`(源:`~/.claude/commands/codex-batch.md`)

**Interfaces:**
- Consumes: `incubating/codex-task/SKILL.md`(Task 2;委托路径指它)、`references/task-reviewer.md`(经 codex-task 间接引用)。
- Produces: `incubating/codex-batch/SKILL.md`,skill 名 `codex-batch`。

- [ ] **Step 1: 建目录并保真拷贝源命令**

```bash
mkdir -p incubating/codex-batch
cp ~/.claude/commands/codex-batch.md incubating/codex-batch/SKILL.md
```

- [ ] **Step 2: 基线 grep(确认待改写串存在)**

Run:
```bash
grep -nE '~/\.claude/commands|/codex-review|security-review|本命令|category:|task-review' incubating/codex-batch/SKILL.md
```
Expected: 命中 frontmatter、line 10/13/41 `本命令` 与死路径、多处 `task-review`、line 65 `/codex-review`·`security-review`。

- [ ] **Step 3: 替换 frontmatter(命令型 → skill 型 + 不自动触发)**

Edit old_string:
```
---
name: "Codex Batch (沿计划连续推进 + checkpoint 停车)"
description: "编排 codex-task 沿实现计划连续推进多任务,遇 checkpoint 硬停交人裁决;台账续跑、安全审内联即时、--max 上下文预算"
category: Development
tags: [codex, sdd, orchestration, batch]
---
```
new_string:
```
---
name: codex-batch
description: 编排 codex-task 沿实现计划连续推进多任务,遇 checkpoint 硬停交人裁决;台账续跑、安全审内联即时、--max 上下文预算。**不自动触发,由用户显式调用。**
---
```

- [ ] **Step 4: 改写引言(本命令→本 Skill,去 codex-review/task-review 独立声明)**

Edit old_string:
```
**本命令是 `codex-task` 的编排层——单向委托 codex-task 的单任务流程,自己只加「循环 + checkpoint + 停车/续跑」。** 与 `codex-review`/`task-review` 相互独立:不直接调用它们(task-review 由 codex-task 在任务内部调,codex-review 归收尾软交接)。
```
new_string:
```
**本 Skill 是 codex-task 的编排层——单向委托 codex-task 的单任务流程,自己只加「循环 + checkpoint + 停车/续跑」。** codex-task 的任务内审查(按其 `references/task-reviewer.md` 派 subagent)与收尾上线闸门均由 codex-task 定义,本 Skill 不另设、不点名外部指令。
```

- [ ] **Step 5: 改写委托关系(死路径 → incubating SKILL.md;本命令→本 Skill)**

Edit old_string:
```
- **委托而非复制**:每个任务都走 **codex-task 定义的单任务流程**(见 `~/.claude/commands/codex-task.md` 的「执行流程」step 0–6);本命令**不重述**那些步骤,需要细节时 `Read` codex-task.md。codex-task 演进,本命令自动跟随。
```
new_string:
```
- **委托而非复制**:每个任务都走 **codex-task 定义的单任务流程**(见 `incubating/codex-task/SKILL.md` 的「执行流程」step 0–6);本 Skill**不重述**那些步骤,需要细节时 `Read` 该 SKILL.md。codex-task 演进,本 Skill 自动跟随。
```

- [ ] **Step 6: 改写"内联连续跑"(task-review 子代理措辞)**

Edit old_string:
```
- **内联连续跑,不套娃**:主线在循环里逐任务跑 codex-task 流程;codex 实现子代理、task-review 审查子代理照旧在**每个任务内部**派发。**不**再 spawn 一层「执行子代理」整包跑 codex-task。
```
new_string:
```
- **内联连续跑,不套娃**:主线在循环里逐任务跑 codex-task 流程;codex 实现子代理、codex-task 内部按 `references/task-reviewer.md` 派的审查子代理照旧在**每个任务内部**派发。**不**再 spawn 一层「执行子代理」整包跑 codex-task。
```

- [ ] **Step 7: 改写主循环第 1 步(task-review 措辞 + 本命令→本 Skill)**

Edit old_string:
```
1. **跑 codex-task 单任务流程 step 0–6**(抽 brief → 派 codex 实现+自测 → 收据校验 →(安全关键则内联 task-review)→ 裁决 → commit + 台账 `[x]`)。安全关键判定与 task-review 调用**完全依 codex-task 定义**,本命令不另设。
```
new_string:
```
1. **跑 codex-task 单任务流程 step 0–6**(抽 brief → 派 codex 实现+自测 → 收据校验 →(安全关键则 codex-task 内部按 `references/task-reviewer.md` 派 subagent 审)→ 裁决 → commit + 台账 `[x]`)。安全关键判定与任务内审查**完全依 codex-task 定义**,本 Skill 不另设。
```

- [ ] **Step 8: 改写 checkpoint 集合(task-review 措辞)**

Edit old_string:
```
- 安全关键任务 task-review 出 **Critical/Important**。
```
new_string:
```
- 安全关键任务的任务内审查出 **Critical/Important**。
```

- [ ] **Step 9: 改写尾软交接(去点名外部指令,通用化)**

Edit old_string:
```
一轮结束若涉及 N 个安全关键任务,打一行:建议收尾手动跑 `/codex-review` 或 `/security-review` 做上线闸门(与 codex-task 一致,不重复内联)。
```
new_string:
```
一轮结束若涉及 N 个安全关键任务,打一行:建议收尾另做一次独立的上线闸门审查(安全 / 跨引擎总审),作为独立关切由用户显式发起(与 codex-task 一致,不重复内联)。
```

- [ ] **Step 10: 改写 flags 汇总 `--secure` 行(task-review 措辞)**

Edit old_string:
```
| `--secure` | 强制所有任务按安全关键处理(每个内联 task-review) |
```
new_string:
```
| `--secure` | 强制所有任务按安全关键处理(每个任务内部按 `references/task-reviewer.md` 派 subagent 审) |
```

- [ ] **Step 11: 改写"独立性守恒"两行(跨 skill 措辞 + 去 codex-review 点名)**

Edit old_string:
```
- **codex-batch → codex-task**:唯一允许的跨命令调用(编排层单向委托)。
- **不**直接调 task-review(codex-task 在任务内部调)、**不**调 codex-review(广域,归软交接)。
```
new_string:
```
- **codex-batch → codex-task**:唯一允许的跨 skill 委托(编排层单向委托)。
- 任务内审查由 codex-task 按 `references/task-reviewer.md` 自行派发,本 Skill 不另调;上线闸门为独立关切,不在本 Skill 内联发起、不点名外部指令。
```

- [ ] **Step 12: 验证 —— 死路径/外部引用/命令名残留清零,关键结构保留**

Run:
```bash
echo "--- 应为空(死路径/外部指令/命令外壳) ---"
grep -nE '~/\.claude/commands|/codex-review|security-review|本命令|category:' incubating/codex-batch/SKILL.md || echo "CLEAN-1"
echo "--- task-review 命中应全部是 task-reviewer.md ---"
grep -n 'task-review' incubating/codex-batch/SKILL.md
echo "--- 应命中(不自动触发 + 委托路径 + 关键结构) ---"
grep -nE 'name: codex-batch|不自动触发|incubating/codex-task/SKILL.md|checkpoint|\.codex-task' incubating/codex-batch/SKILL.md
```
Expected: 第一组 `CLEAN-1`;第二组每一行都含 `task-reviewer.md`;第三组多行命中。

- [ ] **Step 13: Commit**

```bash
git add incubating/codex-batch/SKILL.md
git commit -m "feat(codex-batch): 迁 codex-batch 命令为 incubating skill

frontmatter→skill 型(含不自动触发);委托路径 ~/.claude/commands/codex-task.md
→ incubating/codex-task/SKILL.md;task-review 措辞改为任务内 references 派发;
去 /codex-review 点名、软交接通用化。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 更新 BACKLOG + 归档退役 4 个全局命令(cutover)

**Files:**
- Modify: `incubating/codex-code-review/BACKLOG.md`(第 3 行 + 新增家族毕业追踪项)
- Archive(仓库外,文件系统 `mv`):`~/.claude/commands/{codex-review,codex-task,task-review,codex-batch}.md`

**Interfaces:**
- Consumes: Task 1–3 的三个新产物(归档前须全部就位且 grep-clean)。
- Produces: 退役后的命令面(family 全体不可调用,gap 生效)。

- [ ] **Step 1: cutover 前终检(三新产物就位 + 全局 grep-clean)**

Run:
```bash
ls incubating/codex-task/SKILL.md incubating/codex-task/references/task-reviewer.md incubating/codex-batch/SKILL.md
echo "--- 跨文件残留终检,应 CLEAN ---"
grep -rnE '/codex-review|security-review|~/\.claude/commands|本命令' incubating/codex-task incubating/codex-batch && echo "!!! 有残留,先修再 cutover" || echo "CLEAN"
```
Expected: 三个路径均存在;残留终检输出 `CLEAN`。**非 CLEAN 则回对应 Task 修完再继续,不得归档。**

- [ ] **Step 2: 更新 BACKLOG 退役立场 + 加家族毕业追踪项**

Edit `incubating/codex-code-review/BACKLOG.md` old_string:
```
- [ ] 两 Skill 毕业到 `skills/` 后,退役旧命令 `~/.claude/commands/codex-review.md`(暂留至毕业,避免青黄不接)。
```
new_string:
```
- [x] ~~两 Skill 毕业到 `skills/` 后退役旧命令 codex-review(暂留至毕业避免青黄不接)~~ —— **立场已变更**(见 `docs/superpowers/specs/2026-07-13-codex-family-commands-to-incubating-skills-design.md`):2026-07-13 codex-family 收敛改为**先退役全局命令、接受毕业前不可调用 gap**;codex-review 命令已随家族一并归档退役。
- [ ] **家族毕业(gap 闭合)**:把 codex-code-review / codex-design-review / codex-task / codex-batch 一并毕业到 `skills/` + symlink,恢复可调用。
```

- [ ] **Step 3: Commit BACKLOG**

```bash
git add incubating/codex-code-review/BACKLOG.md
git commit -m "chore(codex-family): BACKLOG 记录退役立场变更 + 家族毕业追踪项

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: 归档退役 4 个全局命令(仓库外,重命名不硬删)**

Run:
```bash
D=$(date +%Y%m%d)
for c in codex-review codex-task task-review codex-batch; do
  mv ~/.claude/commands/$c.md ~/.claude/commands/$c.md.bak-$D-retired
done
```

- [ ] **Step 5: 验证命令面已清空**

Run:
```bash
ls ~/.claude/commands/ | grep -E '^(codex-review|codex-task|task-review|codex-batch)\.md$' && echo "STILL PRESENT (FAIL)" || echo "RETIRED OK"
echo "--- 归档物应在 ---"; ls ~/.claude/commands/ | grep -E 'bak.*retired'
```
Expected: `RETIRED OK`;归档 `.bak-<日期>-retired` 文件列出。
> 注:此步为仓库外文件系统操作,无 git commit;验证靠 `ls`。此后 `/codex-task`·`/codex-batch`·`/codex-review` 不可调用 = 已接受的 gap,由"家族毕业"后续闭合。

---

## Self-Review(对照 spec 核查)

**1. Spec coverage:**
- 4 退役 → codex-review(Task 4 归档)、codex-task(Task 2→归档 Task 4)、task-review(Task 1 降级→归档 Task 4)、codex-batch(Task 3→归档 Task 4)。✅
- 3 新建 → task-reviewer.md(T1)、codex-task/SKILL.md(T2)、codex-batch/SKILL.md(T3)。✅
- 引用改写总表每一行 → 均落到 T2/T3 的具体 Edit 步(含 codex-task:10/34/118–125/129/143、codex-batch 路径/10/14/41/54/65/77/82)。✅
- 转换原则(保真、命令→skill 语气、不自动触发、自包含不点名外部指令、功能依赖保留)→ Global Constraints + 各 Edit + 验证 grep。✅
- 退役=归档不硬删、接受 gap、毕业为后续 → Task 4 + BACKLOG。✅
- BACKLOG 更新 + 取代旧 split-spec 立场 → Task 4 Step 2。✅

**2. Placeholder scan:** 无 TBD/TODO;每个改写步给出确切 old→new;bulk 内容由 `cp` 保真承载,非占位。✅

**3. Type/名称一致性:** 全程 `incubating/codex-task/references/task-reviewer.md`、`incubating/codex-task/SKILL.md`、`incubating/codex-batch/SKILL.md`、skill 名 `codex-task`/`codex-batch` 一致;codex-batch 委托路径与 T2 产出路径一致。✅

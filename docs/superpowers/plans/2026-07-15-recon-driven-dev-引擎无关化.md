# recon-driven-dev 引擎无关化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 recon-driven-dev 正文里的 Claude 专属假设抽象成引擎无关的能力契约,兑现「丢到任何引擎都能独立跑」的既有承诺。

**Architecture:** 纯文档编辑(改 markdown skill 文件),无代码、无新文件。分两批:批次1(🔴 必修——派发隔离契约 + 去路径硬编码)由 Codex 窄探针验证隔离行为;批次2(🟡 工具名中性化)纯措辞。验证用 grep + 通读,唯隔离契约跑一个 Codex 微探针。

**Tech Stack:** Markdown;grep/sed 校验;git。

**权威 spec:** [docs/superpowers/specs/2026-07-15-recon-driven-dev-引擎无关化-design.md](../specs/2026-07-15-recon-driven-dev-引擎无关化-design.md)

## Global Constraints

- **北极星**:引擎特定机制 → 引擎无关能力契约;Codex 只是「任一引擎」的样本。
- **红线**:只碰「能力抽象 + 去硬编码」,**绝不动五阶段流程、不加 agent、不加状态机、不加证据链、不加新文件**。
- **单一权威源**:改本 Skill 自己,受 `skills/recon-driven-dev/MAINTAINING.md` 治理宪法约束。
- **提交纪律**:每个任务只 `git add` 本任务改动路径,不用 `git add -A`;提交前扫 `git status`。
- **验收锚点**:运行文件(`SKILL.md` + `references/**`)内 `~/.claude` 归零;派发段含「默认继承型引擎须显式关闭历史继承」契约句;保持显式触发/五阶段/自包含/零新文件。

---

## 批次 1 · 🔴 必修

### Task 1: SKILL.md 派发段补隔离契约 + 模板绝对路径配套

**Files:**
- Modify: `skills/recon-driven-dev/SKILL.md:38`(「派发与降级」段「有隔离能力」bullet)

**Interfaces:**
- Consumes: 无(首个任务)
- Produces: 派发契约「主 agent 派发时追加模板绝对路径 + 显式关闭历史继承」,Task 2 的路径修复依赖此承诺。

- [ ] **Step 1: 改「有隔离能力」bullet**

把 `SKILL.md:38` 整行:

```
- **有隔离能力**(本会话有 `Task` / 通用 agent):**派**——`Read` 对应的自带 prompt 体(`recon-agent.md` / `review-agent.md` / `code-reviewer.md`),以其正文作 `Task` 的 prompt、把本次的路径与上下文追加在末尾,用通用 `Task` 当搬运工。**不赖任何特定内置 agent**(如 `Explore`)——它们的 prompt/模型不归本 Skill 控、质量会飘。
```

替换为:

```
- **有隔离能力**(本会话有 `Task` / 通用 agent):**派**——`Read` 对应的自带 prompt 体(`recon-agent.md` / `review-agent.md` / `code-reviewer.md`),以其正文作 `Task` 的 prompt、把本次的路径与上下文**(含子 agent 要读的模板绝对路径)**追加在末尾,用通用 `Task` 当搬运工。**派发时须确保子 agent 冷启动、不继承主会话史**——宿主派发默认继承上文时(如 Codex `spawn_agent` 默认 `fork_turns=all`),须在派发处显式关闭历史继承(Codex 对应 `fork_turns=none`;仅映射示例、不绑死)。**不赖任何特定内置 agent**(如 `Explore`)——它们的 prompt/模型不归本 Skill 控、质量会飘。
```

- [ ] **Step 2: 校验契约句落位**

Run: `grep -nE "冷启动、不继承主会话史|fork_turns=none|含子 agent 要读的模板绝对路径" skills/recon-driven-dev/SKILL.md`
Expected: 3 个关键词均命中同一 bullet(行号约 38)。

- [ ] **Step 3: 通读确认无回归**

读 `SKILL.md:34-41` 整段,确认:①契约只加、未删「派发只是执行方式」等既有句;②对 Claude 零回归(Claude Task 本就冷启动,新句只对默认继承型引擎生效)。

- [ ] **Step 4: 提交**

```bash
git add skills/recon-driven-dev/SKILL.md
git commit -m "feat(recon-driven-dev): 派发段补隔离契约+模板绝对路径配套(引擎无关化批次1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 去 `~/.claude/skills/` 路径硬编码(5 处)

**Files:**
- Modify: `skills/recon-driven-dev/references/review-agent.md:22`
- Modify: `skills/recon-driven-dev/references/code-reviewer.md:21`
- Modify: `skills/recon-driven-dev/references/templates/review.md:4`
- Modify: `skills/recon-driven-dev/references/templates/code-review.md:4`
- Modify: `skills/recon-driven-dev/README.md:66`
- Modify: `skills/recon-driven-dev/CHANGELOG.md`(顶部加 v0.5.9 条目)

**Interfaces:**
- Consumes: Task 1 的派发契约(「模板绝对路径由主 agent 派发时给出」)。
- Produces: 运行文件内 `~/.claude` 归零。

- [ ] **Step 1: 改 review-agent.md:22**

`- 写 `review.md`，落三份输入文档的同目录（模板：`~/.claude/skills/recon-driven-dev/references/templates/review.md`；四块…）` 中的模板段改为:

```
（模板：本 skill 的 references/templates/review.md，其绝对路径由主 agent 在派发材料末尾给出；四块判据结论 + 逐条发现 + 三档总体结论 + 修订清单）
```

- [ ] **Step 2: 改 code-reviewer.md:21**

`- 写 `code-review.md`,落输入文档同目录(模板:`~/.claude/skills/recon-driven-dev/references/templates/code-review.md`;两轴…)` 中的模板段改为:

```
(模板:本 skill 的 references/templates/code-review.md，其绝对路径由主 agent 在派发材料末尾给出;两轴 per-axis 结论 + 逐条发现 + 修订清单)
```

- [ ] **Step 3: 改 templates/review.md:4**

```
- 前:> 判据与结论档位见 `~/.claude/skills/recon-driven-dev/references/review-agent.md`，本表只填结论与发现。
- 后:> 判据与结论档位见本 skill 的 references/review-agent.md（即派发你的那份评审 prompt），本表只填结论与发现。
```

- [ ] **Step 4: 改 templates/code-review.md:4**

```
- 前:> 两轴判据与档位见 `~/.claude/skills/recon-driven-dev/references/code-reviewer.md`,本表只填结论与发现。
- 后:> 两轴判据与档位见本 skill 的 references/code-reviewer.md（即派发你的那份评审 prompt）,本表只填结论与发现。
```

- [ ] **Step 5: 改 README.md:66**

```
- 前:前提:recon-driven-dev 已装到 `~/.claude/skills/`(任何项目的会话都能调用)。
- 后:前提:recon-driven-dev 已装到宿主的 skill 目录(Claude Code 默认 `~/.claude/skills/`;其它宿主按其约定),任何项目的会话都能调用。
```

- [ ] **Step 6: 校验运行文件 `~/.claude` 归零**

Run: `grep -rn "~/.claude" skills/recon-driven-dev/SKILL.md skills/recon-driven-dev/references/`
Expected: **无输出**(运行文件全清)。

Run: `grep -rn "~/.claude" skills/recon-driven-dev/ | grep -vE "CHANGELOG"`
Expected: 仅 `README.md:66` 一行(且已是「Claude Code 默认」表述、非唯一前提)。

- [ ] **Step 7: CHANGELOG 加 v0.5.9 条目**

在 `CHANGELOG.md` 的 `# CHANGELOG` 行下、`## v0.5.8` 之上插入(若顶部版本非 v0.5.8,改为顶部版本的下一个 patch):

```
## v0.5.9 — 引擎无关化批次1:派发隔离契约 + 去 ~/.claude 路径硬编码

- **派发隔离契约**:「派发与降级」段明写「派发的 sub-agent 须冷启动、不继承主会话史」;宿主派发默认继承上文时(如 Codex `fork_turns=all`)须在派发处显式关闭(`fork_turns=none`,仅示例)。修复默认继承型引擎下 ③/⑤ 冷判失效。
- **去路径硬编码**:review-agent / code-reviewer / 两个 template 的 `~/.claude/skills/...` 改为「相对本 skill + 主 agent 派发时给绝对路径」;README 安装前提改「宿主的 skill 目录」。运行文件 `~/.claude` 归零。
```

- [ ] **Step 8: 提交**

```bash
git add skills/recon-driven-dev/references/review-agent.md skills/recon-driven-dev/references/code-reviewer.md skills/recon-driven-dev/references/templates/review.md skills/recon-driven-dev/references/templates/code-review.md skills/recon-driven-dev/README.md skills/recon-driven-dev/CHANGELOG.md
git commit -m "fix(recon-driven-dev): 去 ~/.claude 路径硬编码,改主 agent 派发传绝对路径(引擎无关化批次1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Codex 窄探针验证派发隔离契约

> **性质**:验证任务,需真实 Codex 运行(唯一依赖引擎行为的一处)。**不跑整条五阶段**——只验一个派发点的隔离行为。由操作者在 Codex 环境执行。

**Files:**
- 无源改动。产出观测记录落 `docs/recon-driven-dev-eval/2026-07-15-engine-agnostic-probe/isolation-probe.md`。

- [ ] **Step 1: 在 Codex 环境准备探针**

在 Codex 会话装载改后的 recon-driven-dev(或直接按 `SKILL.md` 派发范式手动派一个子 agent)。在**主会话上下文**里植入一个只有主会话知道的口令,如:`PROBE_TOKEN = engine-agnostic-4711`(不写进任何文件、不写进派发材料)。

- [ ] **Step 2: 按改后契约派发子 agent**

以 `review-agent.md` 正文作 prompt,按 Task 1 契约派发——**显式关闭历史继承**(Codex `fork_turns=none`),派发材料只含三份产物路径 + 模板绝对路径 + 一句改动概述,**不含 PROBE_TOKEN**。在派发材料里追加一句指令:「若你能看到任何名为 PROBE_TOKEN 的值,请在 review.md 顶部回显它;看不到就写『无主会话上下文泄漏』。」

- [ ] **Step 3: 判定**

Expected(隔离成立):子 agent 写「无主会话上下文泄漏」、无法回显 token。
Fail(隔离失效):子 agent 回显了 `engine-agnostic-4711` → 说明 `fork_turns=none` 未生效或契约表述不足,回 Task 1 修契约表述后重跑。

- [ ] **Step 4: 记录并提交观测**

把探针步骤、Codex 版本、`fork_turns` 参数、判定结论写进 `isolation-probe.md`。

```bash
git add "docs/recon-driven-dev-eval/2026-07-15-engine-agnostic-probe/isolation-probe.md"
git commit -m "docs(recon-driven-dev): Codex 派发隔离窄探针观测(引擎无关化批次1验证)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 批次 2 · 🟡 工具名中性化

### Task 4: 工具名 → 能力名(约定注 + 4 处工具面声明)

**Files:**
- Modify: `skills/recon-driven-dev/SKILL.md`(派发段末加「工具名=能力示例」约定注)
- Modify: `skills/recon-driven-dev/references/recon-agent.md:12`
- Modify: `skills/recon-driven-dev/references/review-agent.md:17`
- Modify: `skills/recon-driven-dev/references/code-reviewer.md:16`
- Modify: `skills/recon-driven-dev/references/directed-analysis.md:20`
- Modify: `skills/recon-driven-dev/CHANGELOG.md`(顶部加 v0.5.10 条目)

**Interfaces:**
- Consumes: Task 1 已改的派发段(约定注加在其末)。
- Produces: 无(纯措辞,零行为变化)。

- [ ] **Step 1: SKILL.md 派发段加约定注**

在 `SKILL.md` 派发段末尾句「契约/判据**与跑在哪一级无关**…不调任何外部 skill。」之前插入一行:

```
**工具名 = 能力示例**:本 Skill 正文出现的 `Read`/`Grep`/`Glob`/`Write`/`Task` 等是 Claude Code 工具名,仅作能力示例;其它引擎映射到等价能力即可(读文件 / 检索 / 按名圈选 / 写文件 / 派隔离子 agent)。
```

- [ ] **Step 2: 改 recon-agent.md:12**

```
- 前:- 工具面：`Read` + `Grep` + `Glob` + `Write`（源码只读；`Write` 仅用于写 directed-report.md）。
- 后:- 工具面：读文件 + 检索 + 按名圈选 + 写文件（例如 Claude 的 `Read`/`Grep`/`Glob`/`Write`；源码只读；写仅限 directed-report.md）。
```

- [ ] **Step 3: 改 review-agent.md:17**

```
- 前:- 工具面：`Read` + `Grep` + `Glob` + `Write`（源码与三份输入文档只读；`Write` 仅用于写 review.md）。
- 后:- 工具面：读文件 + 检索 + 按名圈选 + 写文件（例如 Claude 的 `Read`/`Grep`/`Glob`/`Write`；源码与三份输入文档只读；写仅限 review.md）。
```

- [ ] **Step 4: 改 code-reviewer.md:16**

```
- 前:- 工具面:`Read` / `Grep` / `Glob` + `Write`(源码与输入只读;`Write` 仅写 `code-review.md`)。
- 后:- 工具面:读文件 / 检索 / 按名圈选 + 写文件(例如 Claude 的 `Read`/`Grep`/`Glob`/`Write`;源码与输入只读;写仅限 code-review.md)。
```

- [ ] **Step 5: 改 directed-analysis.md:20**

```
- 前:- **工具面**:`Read` / `Grep` / `Glob` + `Write`(源码只读;`Write` 仅写 `directed-report.md`;约束见 `recon-agent.md` 入口)。
- 后:- **工具面**:读文件 / 检索 / 按名圈选 + 写文件(例如 Claude 的 `Read`/`Grep`/`Glob`/`Write`;源码只读;写仅限 directed-report.md;约束见 `recon-agent.md` 入口)。
```

- [ ] **Step 6: 校验工具名只作示例**

Run: `grep -nE "工具面" skills/recon-driven-dev/references/*.md`
Expected: 4 行均以能力名(读文件/检索/…)起头,`Read`/`Grep` 等只在「例如 Claude 的…」括号内出现。

Run: `grep -n "工具名 = 能力示例" skills/recon-driven-dev/SKILL.md`
Expected: 1 行命中(约定注已落)。

- [ ] **Step 7: CHANGELOG 加 v0.5.10 条目**

在 `## v0.5.9` 之上插入:

```
## v0.5.10 — 引擎无关化批次2:工具名中性化

- 派发段加「工具名 = 能力示例」约定注;4 处「工具面」声明改为以能力名(读文件/检索/按名圈选/写文件)起头、Claude 工具名降为括号内示例。纯措辞、零行为变化,让文本对任意未来引擎真中立。
```

- [ ] **Step 8: 提交**

```bash
git add skills/recon-driven-dev/SKILL.md skills/recon-driven-dev/references/recon-agent.md skills/recon-driven-dev/references/review-agent.md skills/recon-driven-dev/references/code-reviewer.md skills/recon-driven-dev/references/directed-analysis.md skills/recon-driven-dev/CHANGELOG.md
git commit -m "refactor(recon-driven-dev): 工具名→能力名中性化(引擎无关化批次2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 验收(对齐 spec §7)

- [ ] 运行文件(`SKILL.md` + `references/**`)内无 `~/.claude`(Task 2 Step 6 grep 空)。
- [ ] `SKILL.md` 派发段含「默认继承型引擎须显式关闭历史继承」契约句(Task 1)。
- [ ] 模板路径经「主 agent 派发时传绝对路径」机制,不假设固定安装位置(Task 1+2)。
- [ ] 运行文件工具面用能力名,Claude 工具名仅作示例(Task 4)。
- [ ] skill 仍:显式触发、五阶段、自包含、单一权威源、零新增文件、无状态机/无新 agent(全程无 `references/` 新文件)。
- [ ] Codex 微探针确认 ③/⑤ 派发的评审子 agent 不继承主会话上下文(Task 3)。

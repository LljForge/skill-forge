# recon-driven-dev 整改 · 批次 C（实现与验证契约）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **本 plan 只覆盖批次 C。** 整改共 6 批(0/A/B/C/D/E),按 writing-plans 的 Scope Check「一批一计划、各自可独立测试」拆分。批次 A/B 的 plan 在同目录 `plan.md` / `plan-B.md`;批次序、证伪宿主与各批范围见 `design.md` §13;跨批进度见 `progress.md`;批次×spec§×文件×回归验证×验收对照见 `batch-map.md`。**批次 D 待真实 Codex trace,批次 E 待本批实跑证伪后就地写。**

**Goal:** 把 ⑤ 实施从「单一 TDD 假设 + merge-base 猜起点 + 复评只核旧 delta」升级成一套**实现与验证契约**——三种 verification-mode 各有合法闭合路径、每任务有独立两轴评审(实现与评审 prompt 分家)、整支评审 BASE 钉死 START_SHA 且终态证据覆盖 committed/staged/unstaged/untracked、复评既核旧发现也扫修复带出的新问题。

**Architecture:** 纯 Skill 文档编辑(改 Skill 自己)。落地 design §9(验证契约)+ §10(每任务实现与评审)+ §11(整支评审与终态证据)+ §8.5(⑤ 顺序)。**新建 2 个 sub-agent prompt**(`task-agent.md` + `task-reviewer.md`),**改 4 个运行文件**(`implementation.md` + `code-reviewer.md` + `SKILL.md` ⑤段 + `templates/code-review.md`)+ `CHANGELOG.md`。无可跑的自动化测试;"验证" = 锚点 grep + 单一权威自核 + **批次 C 单宿主实跑**(TDD/manual 路径在 Claude Code 可验;子 agent 执行 + 终态覆盖建议与批次 D 合并在 Codex 跑一次)。

**Tech Stack:** Markdown(`skills/recon-driven-dev/`);核验用 `grep` / `git`。

## Global Constraints

逐条来自已获批 `design.md`(同目录)与 `skills/recon-driven-dev/MAINTAINING.md`,每个任务隐含遵守:

- **自包含性【唯一硬约束】**:不引入任何外部 skill 调用 / 脚本 / 跨会话持久件依赖。`task-agent.md` / `task-reviewer.md` 是本 Skill 自带的 sub-agent prompt,以文件交接、不粘贴、不引脚本(design §10)。
- **单一权威源(design §9/§10/§11 纲)**:
  - **verification-mode / verification-profile 执行契约** → `implementation.md`「验证契约」段(§9);声明落 run-state 已有的 `verification-mode` / `verification-profile` 字段(批次 A 建的模板已含,**本批不改 run-state 模板**)。
  - **per-task 两轴评审判据**(Spec + Quality、严重度三档、两轮上限、内联非独立评审标注) → `task-reviewer.md`(§10.2);**每任务实现契约**(输入 7 / 输出 6 / 不自宣通过) → `task-agent.md`(§10.1)。
  - **整支评审两轴 + BASE + 完整终态快照 + 复评** → `code-reviewer.md`(§11);BASE 永远 = preflight 的 START_SHA(§11.1)。
  - `implementation.md` 的 per-task 闸与收尾段、`SKILL.md` ⑤ 脊柱、`code-review.md` 模板**只路由/填空、不复述**上述判据。
- **分层归位**:运行流转落脊柱/reference、sub-agent 判据落各 agent 本体、字段落模板(run-state 已有,不动)、治理规则落 MAINTAINING。
- **薄账(design §4.3)**:`task-agent.md` / `task-reviewer.md` 是**派发时才读**的 sub-agent prompt(不进主会话起步常载);`implementation.md`「验证契约」段属⑤执行期读。**§4.3 完整字节核账仍待批次 E**,本批不做量化核算。
- **批次 C 边界**:只落 design §9/§10/§11/§8.5。**不碰 `requirements-design.md`**——verification-mode 的「design.md 须声明一种」义务借道已有的必覆盖清单④(测试缝隙 + 降级形态,批次 B 已定)与 run-state 已有字段,不新增改 ②。**不碰 `recon-agent.md` / Codex 能力映射 / frontmatter**(批次 D)。**IP-R02**(⑤ 续做/修订后 design 信号尾·tasks·review 三处失同步)仍留打磨轨 **BACKLOG#2**、不并入。**MAINTAINING 7 rubric 完整跑 + §4.3 薄账核账**留批次 E。
- **诚实定性**:本批是**运行行为变更**(⑤ 执行契约:三 verification-mode / per-task 双 agent / BASE=START_SHA / 完整终态快照 / 复评口径),CHANGELOG 须如实标注。子 agent 执行分支 + 终态覆盖**建议 Codex 实跑**(与批次 D 合并);单宿主仅 TDD/manual 路径可验。跨宿主效果本批不宣称(design §17)。

---

### Task C1: 三 verification-mode 执行契约（implementation.md · §9）

**Files:**
- Modify: `skills/recon-driven-dev/references/implementation.md`（新增「验证契约」段;改「共有硬闸」闸 3「TDD 铁律」为「按 verification-mode 实施」）

**Interfaces:**
- Consumes: run-state 的 `verification-mode` / `verification-profile` 字段(批次 A 模板已有);② 必覆盖清单④测试缝隙的降级判断(批次 B 已定)。
- Produces: ⑤ 的三 verification-mode 执行契约(automated-tdd / executable-check / manual-evidence)+ verification-profile 记录义务,住 `implementation.md`「验证契约」段为单一权威。下游 C4（per-task 闸）与 C5→C6（脊柱亮牌）引用「按 design 声明的 mode 实施」。

- [ ] **Step 1: implementation.md 新增「验证契约」段**

`references/implementation.md` 在「共有硬闸」段**之前**(即「实施前:计划冲突预检」段与「共有硬闸」段之间)插入新段:

```markdown
## 验证契约（三 verification-mode + verification-profile · 单一权威）

⑤ 按 **design.md 声明的 verification-mode** 实施(声明落 run-state 的 `verification-mode` 字段;② 产 design 时据必覆盖清单④「测试缝隙 + 降级形态」定,preflight/② 后填)。三选一:

| 模式 | 适用条件 | 规则 |
|---|---|---|
| automated-tdd | 有可执行测试 runner + 稳定测试缝隙 | 失败测试 → 确认按预期失败 → 最小实现转绿 → 重构保持绿 |
| executable-check | 可用命令 / 编译 / lint / 查询 / 快照验证,但不适合常规单测 | 先记录失败证据 → 修改 → 同一检查通过 |
| manual-evidence | 无 runner / 纯文档 / 客观无法自动执行 | 事先批准步骤 + 预期结果 + 实际证据 + 未覆盖风险 |

- **只有 automated-tdd 适用「生产代码先于失败测试写则删掉重来」规则**(下方陷阱块「TDD 反合理化红旗」仅约束此模式);executable-check / manual-evidence 不套删码规则,但**各自的「先证据、后改」纪律照走**(executable-check 先落失败证据、manual-evidence 先批准步骤与预期)。
- **verification-profile**(落 design.md 或 run-state 的 `verification-profile` 字段):`scoped tests / full tests / lint / format check / typecheck / build`,每条记**适用范围 + 预期结果 + 最长运行时间**;无法执行的记**原因 + 替代证据**。现有测试 / 全测试**不再作为无范围、无时间上限的模糊命令**。
- 收尾整支 reviewer 只有收到某项检查**已成功运行的证据**(verification-profile 结果),才能跳过机器已覆盖的发现——判据住 `code-reviewer.md`,本文不复述。
```

- [ ] **Step 2: 改「共有硬闸」闸 3「TDD 铁律」为「按 verification-mode 实施」**

`references/implementation.md`「共有硬闸」段找到闸 3 现文(`3. **TDD 铁律**:每个特性 / 修复**先写失败测试 → 亲眼看它按预期失败 → 写最小代码转绿(输出干净)→ 重构保持绿**。**失败测试写在 ② 预先约定的测试缝隙上**(`design.md` 必覆盖清单④ 谈定的那个缝隙);修 bug 先用失败测试复现。`),整条替换为:

```markdown
3. **按 verification-mode 实施**:据 run-state 声明的 mode 走上方「验证契约」三路径之一。**automated-tdd**——每个特性 / 修复先写失败测试 → 亲眼看它按预期失败 → 写最小代码转绿(输出干净)→ 重构保持绿;失败测试写在 ② 预约的测试缝隙上(必覆盖清单④),修 bug 先用失败测试复现。**executable-check / manual-evidence**——按验证契约各自的「先证据、后改」纪律走,不套 automated-tdd 的删码规则。
```

- [ ] **Step 3: 锚点核验 + 单一权威自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "三 verification-mode\|automated-tdd\|executable-check\|manual-evidence\|按 verification-mode 实施" skills/recon-driven-dev/references/implementation.md
grep -rc "automated-tdd\|executable-check\|manual-evidence" skills/recon-driven-dev/references/requirements-design.md
```
Expected: implementation.md 含「验证契约」段三模式 + 闸 3 已改「按 verification-mode 实施」;requirements-design.md **零命中**(verification-mode 契约不外溢到 ②、批次 C 不碰它)。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/implementation.md
git commit -m "feat(recon-driven-dev): 批次C-① 三 verification-mode 执行契约落 implementation.md

design §9:automated-tdd/executable-check/manual-evidence 三路径 + verification-profile
记录义务;闸3从单一TDD假设改为按 design 声明的 mode 实施。声明借 run-state 已有字段,
不外溢改 requirements-design.md。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C2: 新建 task-agent.md（每任务实现子 agent · §10.1）

**Files:**
- Create: `skills/recon-driven-dev/references/task-agent.md`

**Interfaces:**
- Consumes: 主会话派发时追加的七项输入(见下)。
- Produces: 每任务实现子 agent 的自包含 prompt。子 agent 分支派它实现单任务、回六项输出、**不自宣通过评审**;内联分支主会话按同一输入/输出契约自实现。下游 C5（implementation.md 闸 4)路由到本文件为实现契约单一权威。

- [ ] **Step 1: 写 task-agent.md 全文**

新建 `references/task-agent.md`,内容:

````markdown
# 每任务实现 sub-agent（⑤ 子 agent 执行分支 · 每任务实现的本体）

> 本文件即每任务实现 sub-agent 的 prompt（从「## 现在执行」起为 prompt 体；本行 blockquote 是给维护者的元注释、不喂给实现 agent）。仅「每任务一个新子 agent」执行分支派它;内联分支由主会话自己按同一输入/输出契约实现。评审判据不在此——per-task 两轴评审住 `task-reviewer.md`,本文只产实现、不自判通过。

## 现在执行

读完下方追加的任务正文与路径,在 WORK_ROOT 内实现**本任务**,按 verification-mode 验证,产出下方「出口」六项回主 agent。**立即开始、勿待命**;缺任一必需输入(任务正文 / WORK_ROOT / verification-mode)→ 不动手、只回「RETRY：缺 \<X\>」。你**不宣布自己通过评审**——评审是 `task-reviewer.md` 那个独立 agent 的活。

## 角色

你是本任务的实现 agent,只做**当前这一个任务**。不读计划文件全文、不继承主会话历史——你要的全在下方追加的任务正文里。同一工作区**不与其它实现 agent 并行**。

## 入口（主会话派发时追加 · 七项）

- 当前任务**完整正文**(不是让你去读 tasks.md,是把本任务整段贴给你);
- WORK_ROOT 与 ARTIFACT_ROOT 绝对路径;
- **精确 Interfaces**(本任务消费 / 产出的函数签名、参数与返回类型);
- **允许修改的文件**(本任务拥有的路径白名单;白名单外只读);
- verification-mode / verification-profile(automated-tdd / executable-check / manual-evidence + 各检查的范围 / 预期 / 时限);
- task 起点 SHA;
- 本任务**不应触碰**的用户已有改动(别碰坏无关的未提交内容)。

## 出口（回主 agent · 六项）

- **实际改动的文件清单**;
- **验证命令与结果**(按 verification-mode 的证据形态:测试输出 / 检查通过 / manual 步骤+预期+实际);
- **与计划的偏离及理由**(无则「无」);
- **commit SHA**,或**未 commit 的明确原因**;
- **blocker 与剩余风险**(无则「无」);
- 一句「实现完成、待 task-reviewer 评审」——**不自判通过**。

## 边界

只实现本任务、不顺手改白名单外文件、不做全量重构;不引脚本(自己写文件);产物文件落 ARTIFACT_ROOT、**禁落 `.git/`**;实现完**不自宣通过评审**,交 `task-reviewer.md`。
````

- [ ] **Step 2: 锚点核验**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
test -f skills/recon-driven-dev/references/task-agent.md && echo "created"
grep -c "不自判通过\|不宣布自己通过\|不自宣通过" skills/recon-driven-dev/references/task-agent.md
grep -n "七项\|六项" skills/recon-driven-dev/references/task-agent.md
```
Expected: 文件已建;"不自宣通过评审"语义在位(≥2 处);入口七项 / 出口六项俱全(§10.1)。

- [ ] **Step 3: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/task-agent.md
git commit -m "feat(recon-driven-dev): 批次C-② 新建 task-agent.md（每任务实现子 agent）

design §10.1:入口七项/出口六项/实现 agent 不自宣通过评审。子 agent 分支派它、
内联分支主会话按同一契约自实现。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C3: 新建 task-reviewer.md（每任务两轴评审子 agent · §10.2）

**Files:**
- Create: `skills/recon-driven-dev/references/task-reviewer.md`

**Interfaces:**
- Consumes: 本任务正文 + 批准的 design/tasks + 本任务实现报告(+ 改动 diff 路径)。
- Produces: per-task 两轴(Spec + Quality)评审判据、统一严重度三档与轴结论映射、两轮上限、内联非独立评审标注——单一权威。下游 C5（implementation.md 闸 4)路由到本文件;C6 脊柱亮牌指向它。

- [ ] **Step 1: 写 task-reviewer.md 全文**

新建 `references/task-reviewer.md`,内容:

````markdown
# 每任务评审 sub-agent（⑤ per-task 两轴评审的本体 · 判据单一权威源）

> 本文件即每任务评审 sub-agent 的 prompt（从「## 现在执行」起为 prompt 体；本行 blockquote 给维护者、不喂给评审 agent）。per-task 两轴(Spec + Quality)判据只住这里——SKILL.md ⑤ 与 implementation.md 只派发/路由、不复述。**区别于收尾前整支评审**(那是 `code-reviewer.md`,评全分支;本文只评单个已实现任务)。

## 现在执行

读完下方追加的任务正文、批准的 design/tasks 与本任务实现报告(+ 改动 diff 路径),依次判 **Spec** 与 **Quality** 两轴,各出一档结论 + 逐条发现,回主 agent 一段简短结论。**立即开始、勿待命**;缺任务正文或 design → 只回「RETRY：缺 \<X\>」。

## 角色

你是本任务的评审 agent,冷判**这一个已实现任务**对批准设计的符合度 + 代码质量。没参与写它、不继承会话历史。可定点开源码核验正在判的那条,**不做全量摸排**。

## 判据（同一 fresh reviewer 依次两轴 · 不派两个）

### 轴一 · Spec（对批准设计 / 任务忠实）

- **缺做**:本任务正文 / design 要的没做全;
- **超范围**:造了设计没要的东西(scope creep);
- **与批准设计 / 任务冲突**:实现跟 design.md / 本任务正文相悖。

### 轴二 · Quality（代码质量）

- 正确性、边界条件、错误处理、类型安全、维护性;
- 仓库有文档化规范则**优先按它**,无则退**通用质量基线**(DRY 但别过度抽象到反而难读);
- 跳过 linter / formatter 已强制的项(机器已管、报了是噪声)。

## 严重度与轴结论（统一词表 · 与整支评审同一套）

- 严重度:**阻断** = 动摇任务 / 使结果不可交付 · **须改** = 实质缺口、修完才可进入下一任务 · **可改** = 可选改进、不阻塞;
- 轴结论映射:有**阻断** → 阻断;无阻断但有**须改** → 须改;仅**可改**或无发现 → 通过;
- **两轴各自独立出档、不归并**。

## 复评（回流 · 两轮上限）

任一轴出阻断 / 须改 → 主会话修 → 复评。**同一发现最多自动修复 / 复评两次**;第三次仍未清零则**暂停交用户**(未清项 + 证据 + 选择:继续修 / 降范围 / 终止)。任一阶段未清**不进下一任务**。

## 独立性降级（内联执行分支）

内联执行无法提供独立 reviewer 时,主会话自评这两轴,但**必须在产物标「非独立评审」**——最终收尾前的整支 reviewer(`code-reviewer.md`)**不得因 per-task 已自评而省略**。

## 边界

只判不产代码;源码只定点核验、不做全量摸排;结论进本任务评审记录,**不改 design / tasks**;per-task 评审**不替代**收尾整支评审。
````

- [ ] **Step 2: 锚点核验 + 严重度词表一致性**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
test -f skills/recon-driven-dev/references/task-reviewer.md && echo "created"
grep -n "阻断\|须改\|可改" skills/recon-driven-dev/references/task-reviewer.md | head -3
grep -n "非独立评审\|两轮\|不得因.*省略" skills/recon-driven-dev/references/task-reviewer.md
```
Expected: 文件已建;严重度三档「阻断/须改/可改」与 `code-reviewer.md`（整支）**同一词表**;内联「非独立评审」+ 两轮上限 + 整支不得省略(§10.2)在位。

- [ ] **Step 3: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/task-reviewer.md
git commit -m "feat(recon-driven-dev): 批次C-③ 新建 task-reviewer.md（每任务两轴评审子 agent）

design §10.2:Spec+Quality 两轴、统一严重度三档与轴映射、两轮上限、内联非独立评审
标注且整支不得省略。严重度词表与 code-reviewer.md 同一套。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C4: 整支评审判据升级（code-reviewer.md · §11.1/§11.2/§9.2/§11.3）

**Files:**
- Modify: `skills/recon-driven-dev/references/code-reviewer.md`（入口 / Standards 轴验证证据 / 复评段）

**Interfaces:**
- Consumes: 主会话取好的完整终态证据(START_SHA..HEAD + 未提交/未跟踪补丁)+ verification-profile 结果。
- Produces: 整支评审的**输入完整性**(START_SHA + committed/staged/unstaged/untracked + 范围说明五项)、**验证证据门**(凭 profile 成功证据才跳机器覆盖项)、**复评口径**(§11.3 核旧 + 新扫描 + 扩出重跑)——单一权威。下游 C5（implementation.md 收尾段)与 C6（模板/脊柱)路由到此、不复述。

- [ ] **Step 1: 改「入口」——BASE=START_SHA + 完整终态证据 + 范围说明五项**

`references/code-reviewer.md`「## 入口」段找到第一条现文(`- 输入:本次分支改动的 **diff 文件路径**(范围 `merge-base..HEAD`,主会话已取好)+ 本次 `design.md` + `requirements.md` 路径 + 一句改动概述。`),整条替换为:

```markdown
- 输入:本次分支改动的**完整终态证据**——`START_SHA..HEAD` diff **+ staged / unstaged / untracked 补丁**(主会话已取好,**BASE = preflight 记录的 START_SHA**,§11.1,不再事后 `git merge-base` 猜起点)+ 本次 `design.md` + `requirements.md` 路径 + 一句改动概述。**范围说明须含五项**:START_SHA / HEAD / staged·unstaged·untracked 状态 / 终态 patch 路径 / verification-profile 结果。
```

- [ ] **Step 2: 改「轴一 · Standards」——验证证据门（§9.2）**

`references/code-reviewer.md`「### 轴一 · Standards」段找到现文(`- **跳过 linter / formatter 已强制的项**——机器已管,别重复报(报了是噪声)。`),整条替换为:

```markdown
- **跳过 linter / formatter 已强制的项**——但**只在收到该检查已成功运行的证据(verification-profile 结果)时才跳**;无成功证据则该项**照判**(§9.2:机器覆盖的发现,没有成功运行证据不得预设已过)。
```

- [ ] **Step 3: 改「复评」——§11.3 不走过场**

`references/code-reviewer.md`「## 复评（回流后)」段整段替换为:

```markdown
## 复评（回流后 · 不走过场 · §11.3）

任一轴出**阻断 / 须改** → 主会话修 → 复评,依序:

1. **重新生成终态快照**(改动后的 committed + staged + unstaged + untracked);
2. **核销旧发现**(上一轮标的阻断 / 须改改没改掉);
3. 对修复**实际触及的文件 + 邻接范围**做**新缺陷扫描**(不止核旧 delta——修复常带出新问题);
4. 修复**扩出原文件或改变接口**时,**重跑两轴完整评审**;
5. 更新 `code-review.md` 为**终态结论**。

**不得只核旧 delta 后立即宣布完成**。可改项不卡复评。
```

- [ ] **Step 4: 锚点核验 + 冲突消除自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "START_SHA\|完整终态证据\|范围说明须含五项\|已成功运行的证据\|新缺陷扫描\|不得只核旧 delta" skills/recon-driven-dev/references/code-reviewer.md
grep -n "merge-base\|只核销上一轮" skills/recon-driven-dev/references/code-reviewer.md
```
Expected: 前一组命中(入口/验证证据/复评 §11.3 三处已落);后一组 **code-reviewer.md 内零命中**(旧 merge-base 入口与「复评只核销上一轮 delta」已被替换,§11.3 与旧口径的直接冲突消除)。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/code-reviewer.md
git commit -m "feat(recon-driven-dev): 批次C-④ 整支评审判据升级 code-reviewer.md（BASE/终态/验证证据/复评）

design §11.1 BASE=START_SHA(不再 merge-base 猜);§11.2 完整终态证据 committed/staged/
unstaged/untracked + 范围说明五项;§9.2 凭 profile 成功证据才跳机器覆盖项;§11.3 复评
核旧+新缺陷扫描+扩出重跑,消除旧「只核上轮 delta」口径。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C5: implementation.md 收尾段接契约（per-task 闸路由 + BASE + 终态 + 复评路由 · §8.5/§10/§11）

**Files:**
- Modify: `skills/recon-driven-dev/references/implementation.md`（闸 4 per-task 评审;「收尾前整支代码评审」段)

**Interfaces:**
- Consumes: C1 的 verification-mode 契约、C2 `task-agent.md`、C3 `task-reviewer.md`、C4 `code-reviewer.md`（BASE/终态/复评判据)。
- Produces: implementation.md 的 per-task 闸从内联判据改为**路由**到 task-agent/task-reviewer;收尾整支评审段 BASE 钉 START_SHA、取完整终态证据、复评路由到 code-reviewer 的 §11.3。**判据不在 implementation.md 复述**(单一权威守在各 agent 本体)。

- [ ] **Step 1: 改闸 4「per-task 两阶段评审」为路由到 task-agent / task-reviewer**

`references/implementation.md`「共有硬闸」段找到闸 4 现文(`4. **per-task 两阶段评审(两分支共有 · 按序)**:每个任务实现 + commit 后——**先 spec 符合性评审**…别因分支重构静默丢了它。`),整条替换为:

```markdown
4. **per-task 两轴评审(两分支共有 · 按序)**:每个任务实现 + commit 后过 **Spec 符合 + Quality 质量** 两轴——判据、严重度三档、两轮上限、内联「非独立评审」标注**单一权威住 [`task-reviewer.md`](task-reviewer.md)**,每任务实现子 agent 的输入 / 输出契约住 [`task-agent.md`](task-agent.md),本文只路由、不复述。**子 agent 分支**:派 task-agent 实现、派 task-reviewer 评审。**内联分支**:主会话按同一两轴自评、**标「非独立评审」**(收尾整支 reviewer 不得因此省略)。有发现 → 改 → 复评,任一阶段未清**不进下一任务**;实现 agent 不自宣通过。这道评的是**每个已实现任务对设计的符合度**——区别于 ② 自评、③(评设计本身)、收尾整支评审(评全分支)。
```

- [ ] **Step 2: 改「收尾前整支代码评审」段——BASE=START_SHA + 完整终态快照**

`references/implementation.md`「收尾前整支代码评审」段找到「取 diff」现文那条(`- **取 diff**:主会话用**原生 git**(非脚本)取 `merge-base..HEAD` 的 diff…而非默认 `merge-base main`。`),整条替换为:

```markdown
- **取终态证据**:整支评审前须满足其一——(1) 本任务所有改动已提交、工作区无本任务未提交内容;或 (2) 生成一份**同时覆盖 committed / staged / unstaged / untracked 的完整终态证据**(§11.2)。主会话用**原生 git**(非脚本)据 **BASE = preflight 记录的 START_SHA**(§11.1,不再事后 `git merge-base` 猜起点;用户明确把分支上多笔既有提交纳入本任务时,在 preflight 选更早的显式 BASE 并记理由)取 `START_SHA..HEAD` diff + 未提交 / 未跟踪补丁,写成文件传路径给 reviewer(**禁落 `.git/`**;落本次产物目录、随归档保留)。reviewer 范围说明须列五项:START_SHA / HEAD / staged·unstaged·untracked 状态 / 终态 patch 路径 / verification-profile 结果(判据住 `code-reviewer.md`,本文不复述)。
```

- [ ] **Step 3: 改「回流」条——复评路由到 code-reviewer §11.3**

`references/implementation.md`「收尾前整支代码评审」段找到「回流」现文那条(`- **回流**:任一轴的阻断 / 须改 → 修 → 复评(复评只核上轮 delta);可改 → 记进度账本…否则归档里 review 与代码自相矛盾。**`),整条替换为:

```markdown
- **回流与复评**:任一轴阻断 / 须改 → 修 → 复评。**复评判据**(重新生成终态快照、核销旧发现、对修复触及文件 + 邻接范围做**新缺陷扫描**、修复扩出原文件 / 改接口时**重跑两轴完整评审**、更新 code-review.md 终态)**单一权威住 [`code-reviewer.md`](code-reviewer.md)「复评」段、本文不复述**——**不得只核旧 delta 就宣布完成**(§11.3)。可改 → 记进度账本 / 收口菜单前提示。**任一轴改了码(须改修复 / 可改采纳),归档前重取终态 patch 覆盖归档、逐条核 code-review.md 状态对齐 diff 终态**——改了的标「已核销 / 已采纳」、不留评审前残值。
```

- [ ] **Step 4: ⑤ 顺序对齐 §8.5 自核 + 锚点核验**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "task-reviewer.md\|task-agent.md\|START_SHA\|完整终态证据\|复评判据.*code-reviewer\|不得只核旧 delta" skills/recon-driven-dev/references/implementation.md
grep -n "merge-base..HEAD\|复评只核上轮 delta\|先 spec 符合性评审" skills/recon-driven-dev/references/implementation.md
```
Expected: 前一组命中(闸 4 路由 / BASE / 终态 / 复评路由已落);后一组**零命中**(旧 merge-base 取 diff、闸 4 内联判据、复评只核 delta 已被路由替换)。人工核 ⑤ 闸序符合 §8.5(消费 run-state+tasks → 预检 → 确认 WORK_ROOT+依赖 → clean-baseline → 按 mode 实施 → 每任务实现+两轴评审 → 完整终态快照 → 整支评审 → 复评核销 → FINISH → 归档)。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/references/implementation.md
git commit -m "feat(recon-driven-dev): 批次C-⑤ implementation.md 收尾段接契约（闸4路由/BASE/终态/复评路由）

per-task 闸4 判据抽到 task-reviewer.md+task-agent.md、本文只路由;收尾整支评审 BASE
钉 START_SHA、取完整终态证据(committed/staged/unstaged/untracked);复评判据路由到
code-reviewer.md §11.3。⑤ 闸序对齐 §8.5。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C6: 路由与模板同步（SKILL.md ⑤段 + templates/code-review.md · design §16 末步）

**Files:**
- Modify: `skills/recon-driven-dev/SKILL.md`（⑤ 段脊柱亮牌两处)
- Modify: `skills/recon-driven-dev/references/templates/code-review.md`（评审范围补五项)

**Interfaces:**
- Consumes: C1–C5 落定的契约与判据。
- Produces: 脊柱 ⑤ 亮牌指向三 verification-mode 与 task-agent/task-reviewer、BASE=START_SHA;code-review 模板范围填空对齐 §11.2 五项。**脊柱/模板只路由/填空、不复述**(design §16:先改权威、最后同步路由与模板)。

- [ ] **Step 1: SKILL.md ⑤段硬闸亮牌——三 mode + task 双 agent 指针**

`SKILL.md`「## ⑤ 实施」段找到「两分支共有硬闸」现文那条(`- **两分支共有硬闸**:clean-baseline(在 preflight 定下的 WORK_ROOT 内跑)、**在 ② 预先约定的测试缝隙上写失败测试**(TDD)、per-task两阶段评审(spec 符合 + 代码质量)。**隔离已在起步 preflight 完成**…`),把 TDD 与 per-task 两处改为:

```markdown
- **两分支共有硬闸**:clean-baseline(在 preflight 定下的 WORK_ROOT 内跑)、**按 design 声明的 verification-mode 实施**(automated-tdd 在 ② 预约测试缝隙上写失败测试 / executable-check / manual-evidence,三路径判据住 [`references/implementation.md`](references/implementation.md)「验证契约」)、**per-task 两轴评审**(Spec + Quality,判据住 [`references/task-reviewer.md`](references/task-reviewer.md)、实现契约住 [`references/task-agent.md`](references/task-agent.md))。**隔离已在起步 preflight 完成**(不再是 ⑤ 的闸;建立/分支名/dirty 归属细则住 `references/runtime-contract.md`)。
```

- [ ] **Step 2: SKILL.md ⑤段收尾亮牌——BASE=START_SHA + 终态覆盖**

`SKILL.md`「## ⑤ 实施」段找到「收尾前」现文那条(`- **收尾前**:派隔离子 agent 跑 [`code-reviewer.md`](references/code-reviewer.md) 做整支代码评审(Standards + Spec 两轴),无隔离能力降级主会话自跑——**派/降级只看隔离能力,与 ④ 选的执行分支正交**。`),整条替换为:

```markdown
- **收尾前**:派隔离子 agent 跑 [`code-reviewer.md`](references/code-reviewer.md) 做整支代码评审(Standards + Spec 两轴),无隔离能力降级主会话自跑——**派/降级只看隔离能力,与 ④ 选的执行分支正交**。**BASE = preflight 的 START_SHA、终态证据覆盖 committed/staged/unstaged/untracked**(判据住 code-reviewer.md)。
```

- [ ] **Step 3: templates/code-review.md 评审范围补五项**

`references/templates/code-review.md`「## 评审范围」段现文(`- 分支 diff:`<BASE>..HEAD`　|　设计依据:`design.md` + `requirements.md``)整段替换为:

```markdown
## 评审范围
- BASE = START_SHA:`<START_SHA>`　|　HEAD:`<HEAD>`
- 终态覆盖:committed / staged / unstaged / untracked　|　终态 patch:`<路径>`
- verification-profile 结果:`<各检查 范围/预期/实际/时限,或不可执行原因>`
- 设计依据:`design.md` + `requirements.md`
```

同文件顶部第 3 行 blockquote 现文(`> 收尾前整支评审本次分支改动(`merge-base..HEAD`),由 ⑤ 整支评审 sub-agent 产出。`)改为:

```markdown
> 收尾前整支评审本次分支改动(`START_SHA..HEAD` + 未提交/未跟踪),由 ⑤ 整支评审 sub-agent 产出。
```

- [ ] **Step 4: 锚点核验 + 单一权威自核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -n "verification-mode\|task-reviewer.md\|task-agent.md\|START_SHA" skills/recon-driven-dev/SKILL.md
grep -n "START_SHA\|终态覆盖\|verification-profile" skills/recon-driven-dev/references/templates/code-review.md
grep -c "automated-tdd.*executable-check.*manual-evidence\|| automated-tdd |" skills/recon-driven-dev/SKILL.md
```
Expected: SKILL.md ⑤段亮牌指向三 mode + task-agent/task-reviewer + START_SHA;模板范围含五项;**SKILL.md 不复述 verification-mode 三模式表**(第三条 grep 零命中——脊柱只亮名 + 指针,表住 implementation.md)。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/SKILL.md skills/recon-driven-dev/references/templates/code-review.md
git commit -m "feat(recon-driven-dev): 批次C-⑥ 脊柱与模板同步（三mode/task双agent/BASE=START_SHA）

SKILL.md ⑤段亮牌指向三 verification-mode + task-agent/task-reviewer + BASE=START_SHA、
终态覆盖;code-review 模板范围补五项。脊柱/模板只路由填空、不复述判据(design §16)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C7: CHANGELOG v0.7.0 + 批次收尾对账

**Files:**
- Modify: `skills/recon-driven-dev/CHANGELOG.md`（v0.6.1 上方插入 v0.7.0)

**Interfaces:**
- Consumes: C1–C6 全部落定。
- Produces: 批次 C 的 what/why/诚实定性;实跑证伪待 fresh runner 的钩子。

- [ ] **Step 1: CHANGELOG 插入 v0.7.0**

`CHANGELOG.md` 在 `## v0.6.1` 行**上方**插入:

```markdown
## v0.7.0 — 整改批次 C:实现与验证契约(三 verification-mode + per-task 双 agent + BASE/终态/复评)

**what**:
- ⑤ 验证契约:三 verification-mode(automated-tdd / executable-check / manual-evidence)各有合法闭合路径 + verification-profile 记录义务;闸3 从单一 TDD 假设改为「按 design 声明的 mode 实施」,仅 automated-tdd 套删码规则(design §9)。
- 每任务实现与评审分家:新建 `task-agent.md`(实现契约:入口7/出口6/不自宣通过)与 `task-reviewer.md`(Spec+Quality 两轴/严重度三档/两轮上限/内联非独立评审),implementation.md 闸4 改路由(design §10)。
- 整支评审 BASE 钉 preflight 的 START_SHA(不再 merge-base 猜);终态证据覆盖 committed/staged/unstaged/untracked + 范围说明五项;凭 verification-profile 成功证据才跳机器覆盖项(design §11.1/§11.2/§9.2)。
- 复评重做:核旧发现 + 对修复触及文件/邻接做新缺陷扫描 + 扩出/改接口重跑两轴,消除旧「只核上轮 delta」口径(design §11.3)。
- 脊柱 ⑤ 亮牌与 code-review 模板同步(只路由/填空、不复述)。

**why**:修 design §1 的实现-验证根因——单一 TDD 假设排斥无 runner 场景、merge-base 事后猜起点会漏本次真实改动、复评只核旧 delta 放过修复带出的新问题。各判据单一权威落各 agent 本体,脊柱/implementation 只路由。

**诚实定性**:**运行行为变更**(⑤ 执行契约)。单宿主可验 TDD/manual 路径;**子 agent 执行分支 + 终态覆盖建议 Codex 实跑(与批次 D 合并)**。守自包含 + 单一权威;§4.3 薄账完整核账与 MAINTAINING 7 rubric 留批次 E。**单宿主实跑证伪待 fresh runner 跑一个多任务/含验证降级的任务后回填。**
```

- [ ] **Step 2: 全批锚点终核**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
# 新建两文件在位
ls skills/recon-driven-dev/references/task-agent.md skills/recon-driven-dev/references/task-reviewer.md
# 三 mode 唯一权威在 implementation.md、脊柱不复述表
grep -rl "| automated-tdd |" skills/recon-driven-dev/
# BASE=START_SHA 全链一致、无残留 merge-base 取 diff
grep -rn "merge-base..HEAD" skills/recon-driven-dev/references/ skills/recon-driven-dev/SKILL.md
```
Expected: 两新文件在位;`| automated-tdd |` 表**仅 implementation.md 一处**(单一权威);`merge-base..HEAD` 作为整支评审取 diff 口径**零残留**(陷阱块里若仍有 detached-HEAD 语境的 merge-base 提法属正常、非本项)。

- [ ] **Step 3: Commit**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev/CHANGELOG.md
git commit -m "docs(recon-driven-dev): 批次C-⑦ CHANGELOG v0.7.0（实现与验证契约）

what/why/诚实定性:运行行为变更;单宿主可验 TDD/manual,子 agent+终态覆盖建议 Codex
实跑(与批次 D 合并);实跑证伪待 fresh runner。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

对照 design §9/§10/§11/§8.5 完成判据(§13 批次 C 条 + §15 总体验收相关条)逐条核:

| design 完成判据 | 落在 Task | 核 |
|---|---|---|
| automated / executable-check / manual 三路径均可闭合(§9.1) | C1 | ✅ 验证契约三模式表 + 各自纪律 |
| verification-profile 记录范围/预期/时限(§9.2) | C1 | ✅ 记录义务 + 整支跳过凭证据 |
| per-task 实现与评审 prompt、输入、输出、档位齐全(§10) | C2 + C3 | ✅ task-agent 入7/出6、task-reviewer 两轴三档两轮 |
| 内联与子 agent 均有逐任务评审(§10.2) | C3 + C5 | ✅ 内联标「非独立评审」、整支不得省略 |
| 整支评审 BASE 固定 START_SHA 或显式覆盖(§11.1) | C4 + C5 + C6 | ✅ 三处一致钉 START_SHA |
| 终态证据覆盖 committed/staged/unstaged/untracked(§11.2) | C4 + C5 | ✅ 完整终态快照 + 范围说明五项 |
| 复评既核旧发现也检查修复引入的新问题(§11.3) | C4 + C5 | ✅ 核旧 + 新缺陷扫描 + 扩出重跑 |
| ⑤ 顺序对齐 §8.5 十一步 | C5 Step 4 | ✅ 人工核闸序 |

**单一权威自核**:三 mode 表仅 implementation.md;per-task 判据仅 task-reviewer.md、实现契约仅 task-agent.md;整支 BASE/终态/复评仅 code-reviewer.md;脊柱/模板/implementation 路由段无复述(各 Task Step 的第二组 grep 验残留清零)。

**边界自核**:未碰 requirements-design.md(verification-mode 声明借 run-state 已有字段)、未碰 recon-agent.md/frontmatter/Codex(批次 D)、IP-R02 仍留 BACKLOG#2、§4.3 核账与 7 rubric 留批次 E。

**Placeholder 扫描**:两新文件全文已给、无 TBD;每 Task 的改写均含完整目标 markdown。

## Execution Handoff

**Plan 完成、保存在 `docs/superpowers/recon-driven-dev-remediation/plan-C.md`。两种执行方式:**

1. **Inline Execution(本批推荐)** — 用 superpowers:executing-plans 在当前会话按 C1–C7 顺序执行,带 checkpoint。理由同批次 B:纯文档 prose、多 Task 共享 implementation.md/SKILL.md 需连贯、上下文在手。
2. **Subagent-Driven** — 每 Task 一个 fresh subagent + 两阶段评审。

选定后按对应 sub-skill 走。**代码落地后 → 单宿主实跑证伪**(TDD/manual 路径 Claude Code 可验;子 agent 执行 + 终态覆盖建议 Codex 与批次 D 合并跑),按 batch-map 批次 C ⚠️ 五条(老 TDD 未坏 / BASE 正面回归含 untracked / 三模式各自闭合 / per-task 评审真在跑 / 复评不走过场)出观测回执,**不由改 skill 的人自验**。

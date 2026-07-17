---
name: codex-batch
description: 编排 codex-task 沿实现计划连续推进多任务,遇 checkpoint 硬停交人裁决;台账续跑、安全审内联即时、--max 上下文预算。**本 Skill 不自动触发，由用户显式调用。**
---

在「Claude 头尾 + codex 逐任务实现」的分工上再加一层**编排**:沿实现计划的台账**连续推进多个任务**,遇 checkpoint 硬停、把发现交你裁决。**目标:无人值守推进大半个计划,只在真正需要人的点停车。**

**本 Skill 是 codex-task 的编排层——单向委托 codex-task 的单任务流程,自己只加「循环 + checkpoint + 停车/续跑」。** codex-task 的任务内审查(按其 `references/task-reviewer.md` 派 subagent)与收尾上线闸门均由 codex-task 定义,本 Skill 不另设、不点名外部指令。

## 与 codex-task 的关系（核心）
- **委托而非复制**:每个任务都走 **codex-task 定义的单任务流程**(其 SKILL.md 的「执行流程」step 0–6);本 Skill**不重述**那些步骤,需要细节时 `Read` codex-task 的 SKILL.md（**按名找、别假定安装路径**——各 agent 平台的 skills 目录不同）。codex-task 演进,本 Skill 自动跟随。
- **内联连续跑,不套娃**:主线在循环里逐任务跑 codex-task 流程;codex 实现子代理、codex-task 内部按 `references/task-reviewer.md` 派的审查子代理照旧在**每个任务内部**派发。**不**再 spawn 一层「执行子代理」整包跑 codex-task。
- **复用同一台账**:不新建台账,直接读写 codex-task 的 sidecar 台账 `<计划目录>/.codex-task/<计划名>/progress.md`;与单独跑 `/codex-task next` 完全互通。

## 三条铁律（继承 codex-task + 编排层附加）
- **writer ≠ reviewer 且不同引擎**:codex 写、Claude 审(安全关键任务)。
- **checkpoint 硬停,绝不跳过继续**:实现计划任务前后依赖,跳过依赖项会在错误基础上累积;遇 checkpoint 停整个批量。
- **主线上下文预算**:批量会累积主线上下文,`--max`(默认 3)到顶即软停,保护主线质量。

## 输入 · 调用形态
| 调用 | 说明 |
|---|---|
| `/codex-batch` | 从台账第一个未完成任务起连续推进,默认 `--max 3` |
| `/codex-batch --from 3 --to 8` | 限定本次循环任务范围为 3–8 号 |
| `/codex-batch --max 0` | 关闭上下文预算,一路推到底或首个 checkpoint |
| `--plan/--branch/--secure/--lite` | 语义同 codex-task,透传 |

## 执行流程

### 0. 前置（一次）
- **分支安全**:主干(`main`/`master`/`prod`)且未给 `--branch` → **停**,要求分支名;绝不自动切。`--branch` 的授权与创建/切换动作见 codex-task 的 `--branch` 定义,不复述。
- **定位计划**:复用 codex-task 的计划定位(`--plan` 优先,否则探测 `docs/superpowers/plans/*.md`、`docs/recon-driven-dev/*/tasks.md` 等 + 最近修改;多个/模糊则询问)。
- **台账初始化 + 读取**:首读前先执行 codex-task step 0 的 **sidecar exclude + 台账首跑初始化**(台账不存在则从计划生成);**遇 `[~]` 先按 codex-task 的「`[~]` 崩溃恢复」表恢复**,再找第一个非 `[x]` 任务作为起点(受 `--from/--to` 约束)。
- **`--from N` 依赖守卫**:用 `--from N` 时,校验任务 <N 全部 `[x]`;有非 `[x]` 前置 → **硬停**列出,请用户先处理台账或改用正常续跑(不新增依赖图/`--force`)。
- 初始化「本轮已推进计数」= 0。

### 1. 主循环（每轮一个任务）
对起点起的每个非 `[x]` 任务:
1. **跑 codex-task 单任务流程 step 0–6**(抽 brief → 派 codex 实现+自测 → 收据校验 →(安全关键则 codex-task 内部按 `references/task-reviewer.md` 派 subagent 审)→ 裁决 → commit + 台账 `[x]`)。安全关键判定与任务内审查**完全依 codex-task 定义**,本 Skill 不另设。
2. **checkpoint 判定**(§2):
   - **命中** → **硬停**,输出裁决单(§3),退出循环。
   - **未命中** → 该任务已 commit + 台账 `[x]`;「本轮已推进计数」+1。
3. **软停判定**:计数达 `--max`(默认 3;`--max 0` 不限)→ 软停(裁决单原因栏标「达 --max 上限」),退出循环。
4. 否则进入下一任务。

台账全 `[x]`(或区间 `[N,M]` 跑完)→ 报告「推进完毕」+ 尾软交接(§4)。

### 2. Checkpoint 集合（硬停）
终态→动作依 codex-task 的 §2.5「Codex 终态 → controller 动作」表;本节列的是其中触发**整批硬停**的子集。遇任一即停,不再推进后续:
- codex 返回 `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`。
- 收据 / 测试校验失败(测试未过、改动越界、**声称的 `Targets` 不存在或不相关**)。
- 安全关键任务的任务内审查出 **Critical/Important**。
- 前置检查失败(如主干分支且未给 `--branch`)。

### 3. 裁决单（停车时输出）
- **停在哪**:任务号 + 标题。
- **停车原因**:哪类 checkpoint / 软停 + 具体发现。
- **本轮已推进**:哪几个任务,各自 commit hash / 测试摘要 / 审查结论。
- **待裁决 + 建议**:现修 / 派 codex 修 / 接受风险并记账 / 补上下文。
- **续跑**:处理完再次 `/codex-batch` 即从台账接续。

### 4. 尾 · 软交接
一轮结束若涉及 N 个安全关键任务,打一行:建议收尾另做一次独立的上线闸门审查(安全 / 跨引擎总审),作为独立关切由用户显式发起(与 codex-task 一致,不重复内联)。

## 状态与续跑
唯一状态 = codex-task 台账(`[ ]`/`[~]`/`[x]`)。**不建断点文件、不引第二真相源**。停车恢复 = 处理完重跑 `/codex-batch`,从第一个非 `[x]` 接续。

## flags 汇总
| flag | 作用 |
|---|---|
| `--plan <path>` | 显式指定计划文件(透传 codex-task) |
| `--branch <name>` | 语义完全同 codex-task(授权创建/切换;dirty/detached/worktree 只报告不切) |
| `--from N --to M` | 限定本次循环任务范围;不建断点文件,续跑靠台账 |
| `--max K` | 上下文预算:连续推进至多 K 个任务后软停;默认 3,`--max 0` 关闭 |
| `--secure` | 强制所有任务按安全关键处理(每个任务内部按 `references/task-reviewer.md` 派 subagent 审) |
| `--lite` | 透传 codex-task 轻量模式;安全任务 `--lite` 跳审需二次确认 |

## 独立性守恒
- **codex-batch → codex-task**:唯一允许的跨 skill 委托(编排层单向委托)。
- 任务内审查由 codex-task 按 `references/task-reviewer.md` 自行派发,本 Skill 不另调;上线闸门为独立关切,不在本 Skill 内联发起、不点名外部指令。
- 不新建台账、不引第二状态源。

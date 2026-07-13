# Codex 家族:全局命令收敛到 incubating skill —— 设计文档

- 日期:2026-07-13
- 状态:设计定稿(待写实施计划)
- 起点:四个用户级命令 `~/.claude/commands/` 下的 `codex-review.md`、`codex-task.md`、`task-review.md`、`codex-batch.md`
- 取代:本 spec 就"何时退役 codex-review 命令"这一点,**取代** `2026-07-11-codex-cross-engine-review-split-design.md` 的"暂留至毕业再退役"立场——本轮改为"先退役、后毕业"。

## 背景与问题

用户已把跨引擎审查命令 `codex-review` 拆成一对情境对偶的自包含 Skill(`incubating/codex-code-review`、`incubating/codex-design-review`),旧 `codex-review` 命令由此变为冗余、可退役。顺此方向,用户要把整个 codex-* 开发/审查家族从全局命令收敛进本仓 `incubating/`:

1. `codex-review` —— 直接退役(替代已存在)。
2. `task-review` —— 重定位为"只在 codex-task 内部使用、不自动触发":降级为 codex-task 的 references 文件,不再作为独立命令/skill 被匹配触发。
3. 连带:`codex-task` 命令本身迁为 `incubating/codex-task` 独立 Skill;`codex-batch`(codex-task 的编排层)一并迁为 `incubating/codex-batch` 独立 Skill——否则它会变成指向死路径的"活着但已破"的命令。

## 关键前提:incubating 不可调用(决定"退役时机"这条轴)

探明的激活机制:`~/.claude/skills/X` 都是**符号链接** → 仓库 `skills/X`;**在 `skills/` 且被 symlink 的 skill 才可被调用**。`incubating/X` **没有 symlink,是纯暂存文档,不可调用**。

由此,把家族落进 `incubating/` 并**立即退役全局命令**,意味着本轮结束后 `/codex-task`、`/codex-batch`、`/codex-review` **全部不可调用**,直至家族毕业到 `skills/` + symlink。

**这一 gap 是用户在充分知情下明确接受的决策**(备选"先毕业再退役"无 gap、"暂不退役只改引用"无 gap 均被否)。本 spec 据此设计,并把 gap 与毕业后续列为一等关切(见"退役、Gap 与毕业后续")。

## 转换原则(贯穿所有迁移)

1. **保真优先**:命令→skill 是**搬迁 + 必要改线**,不重设计行为。各命令的分工总则、铁律、sidecar 台账、计划定位正则、双模、flags、安全关键判定清单——原样保留。
2. **命令语气 → skill 语气**:正文 `本命令` → `本 Skill`;frontmatter 由 command 型(`category`/`tags`)改为 skill 型(`name` + 触发导向的 `description`)。
3. **不自动触发**:codex-task / codex-batch 的 `description` 末尾显式写「**不自动触发,由用户显式调用**」——与 recon-driven-dev 及 codex-code-review/codex-design-review 家族同一套规矩。这正是用户担心 task-review 乱触发所要的同一机制。
4. **自包含·不点名外部指令**:迁移后 skill 正文**不引用其它命令/skill 名**。上线闸门等收尾建议改为**通用表述**、由用户显式发起,不点名 `/codex-review`、`/security-review` 之类外部指令。
   - **边界(功能依赖不算违背)**:codex-task 对 **codex 插件 companion** 的使用是其引擎依赖,保留不动——`subagent_type: codex:codex-rescue`、`/codex:status`、companion 定位式。codex-batch **委托 codex-task** 是家族内既定关系("委托而非复制"),保留。

## 端到端结果清单(4 退役 + 3 新建)

| 全局命令(退役 → 归档) | 去向 |
|---|---|
| `codex-review.md` | 直接退役;无迁移(替代已在 incubating) |
| `codex-task.md` | → 新建 `incubating/codex-task/SKILL.md` |
| `task-review.md` | → 降级为 `incubating/codex-task/references/task-reviewer.md` |
| `codex-batch.md` | → 新建 `incubating/codex-batch/SKILL.md` |

`incubating/codex-code-review`、`incubating/codex-design-review` 两 skill 本轮**不改行为**,仅在 `codex-code-review/BACKLOG.md` 加一行同步退役立场变更。

## 组件一:incubating/codex-task/SKILL.md

由 `codex-task.md` 迁入。

- **frontmatter**:`name: codex-task`;`description` = 现描述 + 「不自动触发,由用户显式调用」。
- **step 4 改线(核心)**:现「安全关键任务:跨引擎审 = 调 `task-review`」→ 改为「**读 `references/task-reviewer.md` 模板,自己派 general-purpose subagent 审**」。step 4 承接 task-review 原有逻辑:收集范围内改动、untracked 显式列入并要求 `Read`、派 fresh-context read-only subagent、收结构化结论(Strengths / Issues 分级 / Assessment)。引擎分离不破:writer=codex ≠ reviewer=Claude subagent。
- **§2.5 终态表、step 3 收据校验、step 5 裁决与修复**:逻辑不变,仅改写其中对 `/codex-review` 的散文引用(见"引用改写总表")。
- **软交接(原 143 行)**:去掉点名的外部指令,改为通用上线闸门表述,例:「本轮涉及 N 个安全关键任务;建议收尾另做一次独立的上线闸门审查(安全/跨引擎总审),作为独立关切由用户显式发起。」
- **保留不动**:分工总则、三条铁律、双模(计划/自由)、sidecar 台账与 `[~]` 崩溃恢复表、计划定位正则、安全关键判定清单、flags 汇总、对 codex companion 的功能依赖。

## 组件二:incubating/codex-task/references/task-reviewer.md

由 `task-review.md` 剥离命令外壳而成,作为 codex-task 的**内部产物**(非用户面)。

- **剥离**:frontmatter、手动 `/task-review`/`/task-review <sha>` 入口示例、与 `codex-review`/`claude-review` 的独立声明。
- **保留**:内联 reviewer 模板(资深审查者 prompt + Strengths/Issues(Critical·Important·Minor)/Assessment 输出格式 + 铁律)、收集范围内改动的机械步骤、read-only 约束、"跨引擎由调用方保证"的说明、"模板内联自洽、不依赖 superpowers 文件"的自包含性质。
- **定位效果**:不再作为独立 command/skill 被匹配触发 —— 即"只在 codex-task 中使用、不自动触发"。

## 组件三:incubating/codex-batch/SKILL.md

由 `codex-batch.md` 迁入。

- **frontmatter**:`name: codex-batch`;`description` = 现描述 + 「不自动触发,由用户显式调用」。
- **硬路径改线**:现 `Read ~/.claude/commands/codex-task.md` → 改为 `Read incubating/codex-task/SKILL.md`(孵化期的仓库相对定位;毕业 symlink 后此路径需一并改指 `~/.claude/skills/codex-task/SKILL.md` 或按 skill 名委托 —— 归入"毕业后续"闭合)。委托关系不变("委托而非复制"codex-task 的 step 0–6;codex-task 演进本 Skill 自动跟随)。
- **task-review 提法改写**:凡把 task-review 当独立命令名之处(如"task-review 审查子代理在每个任务内部派发"),改为「codex-task 在任务内部按其 `references/task-reviewer.md` 派 subagent 审」。
- **codex-review / 上线闸门提法**:去掉点名的 `/codex-review`、`/security-review`,同 codex-task 软交接口径改为不点名的通用表述。
- **保留不动**:与 codex-task 的委托关系、循环 + checkpoint + 停车/续跑、复用同一 sidecar 台账、`--max` 上下文预算、flags。

## 引用改写总表(每处旧引用 → 新态)

| 处 | 旧 | 新 |
|---|---|---|
| codex-task:10 | 「与 /codex-review 相互独立」声明 | 删(codex-review 已退役) |
| codex-task:118–125 | step 4「调 task-review」 | 「读 references/task-reviewer.md,自己派 general-purpose subagent 审」 |
| codex-task:129 | 论证含「跨命令调 /codex-review」 | 改写:安全码写权留 codex 以保 writer=codex≠reviewer=Claude;去掉 /codex-review 提法 |
| codex-task:143 | 软交接「手动跑 /codex-review 或 /security-review」 | 不点名外部指令的通用上线闸门表述 |
| codex-task:34 | 自由模式「步骤 4 传给 task-review 的任务要求…」 | 改为「步骤 4 派 subagent 时用内联任务描述作对照」(task-review 已内化) |
| codex-batch:「Read …/codex-task.md」 | 全局命令路径 | `incubating/codex-task/SKILL.md` |
| codex-batch:10 | 「与 codex-review/task-review 相互独立…」 | 改写为家族内部关系表述,不点名外部指令 |
| codex-batch:14/41/54/77 | task-review 作独立命令名 | 「codex-task 内部按 task-reviewer.md 审」 |
| codex-batch:65 | 上线闸门「手动跑 /codex-review 或 /security-review」 | 不点名外部指令的通用上线闸门表述 |
| codex-batch:82 | 「不直接调 task-review、不调 codex-review」 | 「上线闸门为独立关切,不在本 Skill 内联发起」(不点名) |

> 注:所有对 `/codex-review` 的引用均为**散文**(独立声明、论证、软建议),无程序化硬调用 —— 退役 codex-review 不断执行,只需散文改写。

## 退役、Gap 与毕业后续

- **退役 = 归档,不硬删**:四个 `.md` 重命名为 `.md.bak-<日期>-retired`(承本目录既有 `.bak` 惯例,可逆、不进命令面)。
- **Gap 明示**(已被用户接受):本轮后 `/codex-task`、`/codex-batch`、`/codex-review` 全部不可调用,直至家族毕业。
- **文档一致性**:更新 `incubating/codex-code-review/BACKLOG.md`(其"两 Skill 毕业后再退役旧命令、暂留避免青黄不接"的前提已被本轮"先退役、接受 gap"覆盖);本 spec 于顶部注明取代旧 split-spec 的"暂留至毕业"立场。
- **追踪后续(本轮范围外)**:新增一条毕业清单项——把 codex-code-review / codex-design-review / codex-task / codex-batch 一并毕业到 `skills/` + symlink,恢复可调用。此为 gap 的闭合动作,单独一轮做。

## 风险 / 边界

- **最大风险**:家族全体非可调用期。已明示、已被用户接受,靠"毕业后续"闭合。
- **命名共存**:recon-driven-dev 亦有 `references/task-reviewer.md`,与本 `incubating/codex-task/references/task-reviewer.md` **目录不同、不冲突**(仅同名,scope 隔离)。
- **两 review skill 不动**:codex-code-review / codex-design-review 本轮仅在其一的 BACKLOG 加一行,行为零改动。

## 明确不做(YAGNI)

- **不毕业到 skills/**:本轮只落 incubating + 退役命令;毕业 symlink 是单列的后续闭合动作。
- **不重设计行为**:命令→skill 为保真搬迁 + 必要改线,不借机改动分工/铁律/收据/台账等既有机制。
- **不给 codex-task 正文点名任何外部命令/skill**:上线闸门等收尾建议一律通用化、由用户显式发起。

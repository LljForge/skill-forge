# 设计 — recon-driven-dev 跨宿主运行契约与流程闭环整改

> 日期：2026-07-12
> 对象：skills/recon-driven-dev
> 性质：改 Skill 自己，受 skills/recon-driven-dev/MAINTAINING.md 治理宪法约束
> 来源：对 Skill 全部 16 份 Markdown 的路线 A 静态审查；重点检查 Codex 可执行性、跨宿主可移植性、阶段状态机、工作区证据链与评审闭环

## 1. 背景与结论

recon-driven-dev 的五阶段骨架成立，问题主要集中在阶段间的承重契约：

1. 运行文本宣称可丢到任何环境独立运行，但实际写入了 Claude Code 的工具名、安装路径与派发假设。
2. 阶段①至④先在原 checkout 产文档，阶段⑤才从 HEAD 建 worktree，代码快照、产物目录和实施工作区可能分裂。
3. ①封存、②批准、③回流、④执行方式选择等状态转移存在未闭合或互相冲突的规则。
4. 自动化 TDD 与无 runner 时的手工验证降级互相冲突。
5. per-task 两阶段评审是硬闸，却没有实现 agent、评审 agent、输入、输出和终止条件。
6. 整支评审的 BASE、终态 diff 与复评口径不能稳定覆盖实际最终改动。

本整改不推翻五阶段，而是在其外侧补运行契约、在阶段接缝补状态机、在实施期补验证与证据闭环。

## 2. 方案选择

### 2.1 备选方案

| 方案 | 做法 | 优点 | 代价 |
|---|---|---|---|
| A. 最小补丁 | 只改硬编码路径、明显矛盾和过期文案 | 改动最小、落地快 | 工作区、状态机与评审契约仍脆弱 |
| B. 契约重整 | 保留一份五阶段核心，新增宿主能力、状态、评审和证据契约 | 解决根因，Claude 与 Codex 共享一个权威核心 | 涉及多份运行 reference，需要分批验证 |
| C. 双版本 | Claude 与 Codex 各维护一套 Skill | 每个平台短期好适配 | 判据重复、长期漂移，违背单一权威源 |

### 2.2 决策

采用方案 B。

理由：

- 保留五阶段与现有产物体系，避免重写已经实测过的业务骨架。
- 把宿主差异收敛在一份运行契约，而不是污染每个阶段。
- 把状态转移、验证模式和 diff 口径改成可机械核对的事实。
- 不制造 Claude/Codex 两套判据，不增加运行期外部 Skill 或脚本依赖。

## 3. 目标与非目标

### 3.1 目标

整改完成后：

1. Claude Code 与 Codex 均能从同一份 Skill 解析出合法执行路径。
2. 运行契约使用能力名，不把 Task、Read、Grep、Glob、Write 等具体工具名当通用接口。
3. 每次运行都明确 SKILL_ROOT、SOURCE_ROOT、WORK_ROOT、ARTIFACT_ROOT 与 START_SHA。
4. 阶段①至⑤基于同一受控代码快照，dirty worktree 不会被静默丢弃或夹带。
5. 每个用户暂停、批准、回流、跳过和终止都有唯一合法下一状态。
6. 自动化 TDD、可执行检查和手工证据三种验证路径均可闭合。
7. per-task 与整支评审都有明确的裁判、输入、输出、严重度映射和重试上限。
8. 最终评审证据覆盖 committed、staged、unstaged 和 untracked 的本任务终态。
9. Skill 仍保持显式触发、五阶段、自包含与单一权威源。

### 3.2 非目标

- 不增加第六个业务阶段；运行前置动作属于五阶段之前的 preflight gate。
- 不改变 directed-report.md、requirements.md、design.md、review.md、tasks.md 和 code-review.md 的核心职责。
- 不拆成 Claude/Codex 两份 Skill。
- 不引入运行期外部脚本、长期项目上下文库或强制外部 Skill 依赖。
- 不在本次整改中一次性清空 BACKLOG 的全部历史候选项。
- 不修改与 recon-driven-dev 无关的 incubating/codex-code-review 与 incubating/codex-design-review 工作区改动。

## 4. 目标文件结构

### 4.1 新增文件

| 文件 | 单一职责 | 运行时读取 |
|---|---|---|
| references/runtime-contract.md | 宿主能力握手、路径、工作区、状态、权限与降级契约 | 是，起步时 |
| references/task-agent.md | 每任务实现子 agent 的自包含 prompt | 仅子 agent 分支 |
| references/task-reviewer.md | 每任务 Spec + Quality 两轴评审 prompt | 阶段⑤每任务 |
| references/templates/run-state.md | 本次运行状态、批准记录、路径、SHA 与验证模式模板 | 是，跨阶段 |

### 4.2 主要修改文件

| 文件 | 主要改动 |
|---|---|
| SKILL.md | 增 preflight 路由、状态转移亮牌、调整阶段④⑤顺序、收窄跨环境承诺 |
| references/directed-analysis.md | 用户批准后再封存；完成性措辞降为高召回摸排 |
| references/recon-agent.md | 工具能力化；输出检索边界与未覆盖区，不再无证据承诺全集 |
| references/requirements-design.md | 闭合未核验项核销、验证模式、②批准与③决策顺序 |
| references/review-agent.md | 明确 fresh-context 前置、档位映射、回流与输入失败行为 |
| references/planning.md | 执行方式选择前移到最终计划批准之前 |
| references/implementation.md | preflight 消费、ISOLATE/baseline 顺序、task reviewer、终态快照、复评上限 |
| references/code-reviewer.md | 输入完整性、严重度映射、验证证据、修复范围回归扫描 |
| references/templates/review.md | 与新总体档位映射对齐 |
| references/templates/code-review.md | 与两轴档位、核销状态、验证证据对齐 |
| README.md | Claude/Codex 安装与能力映射，删除过期路径 |
| MAINTAINING.md | 新运行契约的消费者映射与改后验证要求 |
| EVAL-COVERAGE.md | 新增 preflight、状态恢复、三验证模式、终态快照路径单元 |
| BACKLOG.md | 关闭已被本整改吸收的主体，保留未解决子面 |
| CHANGELOG.md | 记录分批运行语义变化、证据与诚实定性 |

## 5. 运行前置契约

### 5.1 宿主能力握手

runtime-contract.md 使用能力名定义最小接口：

| 能力 | 语义 |
|---|---|
| spawn-fresh-agent | 派一个真正不继承主会话历史的子 agent |
| read-search | 读取文件并搜索代码，不限定具体工具名 |
| write-owned-file | 仅写本任务明确拥有的文件 |
| run-command | 执行只读检查、测试与 git 命令 |
| isolate-workspace | 创建或进入隔离工作区 |
| shared-artifact-path | 主/子 agent 可访问同一产物路径 |

宿主适配示例只用于说明映射，不成为判据：

- Claude Code 可把 Task、Read、Grep、Glob、Write 映射到上述能力。
- Codex 可把零历史 sub-agent、shell search、patch/write 与 git 能力映射到上述能力。

宿主强制流程优先于 Skill 内部偏好。若宿主要求使用特定 planning、TDD、worktree、verification 流程或分支前缀，主会话应把其产物映射到本轨已有的同名 gate，而不是重复增加第二道设计、评审或暂停。resolved branch name 与所采用的宿主规则写入 run-state.md。

若宿主不能保证 spawn-fresh-agent，则所有需要独立裁判的步骤走降级路径，并在产物中标明：

> 非独立评审：当前宿主不能提供零历史裁判，本结论置信度降低，最终判断保留给用户。

prompt 中写不要本会话历史不能替代宿主级真正隔离。

若宿主能派 fresh agent、但主/子 agent 不共享文件系统，则文件交接降级为：

1. 主会话把必要输入作为受控正文或宿主支持的附件交给子 agent；
2. 子 agent 返回结构化完整产物，而非只回摘要；
3. 主会话负责落盘到 ARTIFACT_ROOT；
4. 落盘后按产物契约复核完整性。

不能共享文件且不能返回完整结构化产物时，视为不具备该类隔离能力，走主会话降级。

### 5.2 权限边界

prompt 内的工具列表只是能力需求，不是安全 ACL。

若宿主不能给子 agent 配置只读权限，主会话必须：

1. 派发前记录 git status 和预期输出文件；
2. 派发后核对工作区与外部动作；
3. 发现非预期修改立即停止，不自动清理用户改动。

读取 MCP、数据库或其他外部系统时，只能使用用户已授权范围内、确认零写入的现成能力。环境或数据范围不清楚时保留未核验，不猜生产环境。

### 5.3 路径和工作区事实

preflight gate 必须确定并写入 run-state.md：

- SKILL_ROOT：当前已加载 SKILL.md 所在目录；
- SOURCE_ROOT：用户原始工作区；
- WORK_ROOT：①至⑤实际执行的工作区；
- ARTIFACT_ROOT：本次产物目录的绝对路径；
- START_SHA：本次改动开始前精确 HEAD；
- INITIAL_STATUS：任务开始前工作区状态；
- HOST：宿主类型与能力降级项。

任何 reference 或模板不得再猜 ~/.claude/skills 等安装根。

## 6. 工作区与产物生命周期

### 6.1 顺序

运行起步顺序改为：

1. 检测 repo、分支、detached HEAD、现有 worktree 与 dirty status；
2. 判断初始未提交改动是否属于本任务；
3. 建立或确认 WORK_ROOT；
4. 记录 START_SHA；
5. 在 WORK_ROOT 下创建 ARTIFACT_ROOT；
6. 创建 run-state.md；
7. 进入阶段①。

ISOLATE 不再等到阶段⑤才发生。

阶段⑤的 clean-baseline 仍保留，但必须在最终 WORK_ROOT 内、依赖已就绪后运行。

### 6.2 dirty worktree

初始工作区有未提交改动时：

- 属于本任务且实施必须承接：不能从裸 HEAD 建新 worktree后静默丢失；需用户选择在原隔离工作区继续，或先把改动形成可追踪快照。
- 与本任务无关：不得自动 stash、reset、stage 或 commit；新工作区从 START_SHA 建立，阶段①也只读新工作区。
- 归属不清：暂停并列出文件，交用户判断。

### 6.3 用户拒绝隔离

用户可显式拒绝 worktree，但该路径必须：

- 记录 isolation-waiver；
- 保存 START_SHA 与 INITIAL_STATUS；
- 每次提交只 stage 本任务拥有的路径；
- FINISH 菜单移除依赖独立 worktree 的动作；
- 不宣称标准 ISOLATE gate 已满足。

### 6.4 产物归档

ARTIFACT_ROOT 在同一 WORK_ROOT 中只有一份。归档前：

1. 完成终态 patch、评审与核销；
2. 明确产物是否随代码提交；
3. 再移动到 docs/recon-driven-dev/_archived/；
4. worktree 清理不得先于产物迁移和保存。

保留、push+PR 两档继续保留工作区；本地合并或丢弃时，先保存/归档产物再清工作区。

## 7. per-change 状态模型

run-state.md 是本次变更的运行状态，不是跨项目长期上下文。

至少记录：

- change-name 与日期；
- 当前阶段；
- 当前状态：draft、gated、user-approved、superseded、completed、aborted；
- SOURCE_ROOT、WORK_ROOT、ARTIFACT_ROOT、START_SHA；
- 用户批准的 requirements/design/tasks 版本或摘要；
- ③是否执行及原因；
- ④执行方式；
- verification-mode 与 verification-profile；
- baseline 已知失败；
- 修订/复评轮次；
- FINISH 选择；
- 宿主能力降级和 isolation-waiver。

每次用户暂停前先更新 run-state.md，保证 compaction 或任务恢复后能机械判断当前状态。

用户中止时，状态记 aborted，并给保留草稿、归档草稿、删除本次未提交产物三个显式选项；破坏性删除仍需明确确认。

## 8. 五阶段状态机

### 8.1 阶段①

状态流：

> recon-draft → main-gate-passed → user-approved → sealed

- 主会话质量门通过后先交用户审阅。
- 用户要求修改：回 recon-draft，修改后重新过质量门。
- 只有用户批准后才封存 directed-report.md。
- 封存后新发现仍前向写 design；证伪旧事实才走事实订正。

### 8.2 阶段②与评审决策

状态流：

> requirements/design-draft → user-approved → review-decision

- 两份文档未批准前，不询问是否跳过③。
- 可以在同一条消息中呈现两个有序选择，但语义必须是：先批准/退修设计；仅批准时再决定是否评审。
- design.md 增未核验项核销表，记录原条目、当前状态、证据与是否仍影响决策。
- 残留未核验定义为：directed-report 中尚未在该核销表被证据关闭、且仍影响当前设计判断的条目。

### 8.3 阶段③

| 结论 | 下一状态 |
|---|---|
| 通过 | 进入④ |
| 有条件通过 | 修订 requirements/design → 用户重新批准 → 复评 |
| 不通过 | 必须修订或终止，不得直接进入④ |

③到②修订是正式受控回路，不再受线性不回流口号排斥。

同一轮评审最多自动修订/复评两次；第三次仍未清零则暂停，把未清项、证据和选择交用户。

### 8.4 阶段④

顺序改为：

1. 生成基线任务结构；
2. 选择内联或每任务一个新子 agent；
3. 按选择定稿 tasks.md；
4. 子 agent 模式补精确 Interfaces 和任务级完整路径；
5. 对最终 tasks.md 做机械对账；
6. 用户批准最终计划。

用户只批准最终执行形态，不批准后置升级前的半成品计划。

### 8.5 阶段⑤

顺序为：

1. 消费 run-state 与最终 tasks.md；
2. 计划冲突预检；
3. 确认 WORK_ROOT 与依赖就绪；
4. clean-baseline；
5. 按 verification-mode 实施；
6. 每任务实现与两轴评审；
7. 生成完整终态快照；
8. 整支两轴评审；
9. 修订、复评与证据核销；
10. FINISH；
11. 归档。

## 9. 验证契约

### 9.1 verification-mode

design.md 必须声明一种模式：

| 模式 | 适用条件 | 规则 |
|---|---|---|
| automated-tdd | 有可执行测试 runner 和稳定测试缝隙 | 失败测试 → 确认按预期失败 → 最小实现 → 转绿 → 重构 |
| executable-check | 可用命令、编译、lint、查询或快照验证，但不适合常规单测 | 先记录失败证据 → 修改 → 同一检查通过 |
| manual-evidence | 无 runner、纯文档或客观无法自动执行 | 事先批准步骤、预期结果、实际证据和未覆盖风险 |

只有 automated-tdd 适用生产代码先写则删掉重来的规则。

### 9.2 verification-profile

design.md 或 run-state.md 记录：

- scoped tests；
- full tests；
- lint；
- format check；
- typecheck；
- build；
- 每条命令的适用范围、预期结果和最长运行时间；
- 无法执行的原因及替代证据。

现有测试或全测试不再作为无范围、无时间上限的模糊命令。

整支 reviewer 只有收到某项检查已成功运行的证据，才能跳过机器已经覆盖的发现。

## 10. 每任务实现与评审

### 10.1 task-agent.md

输入：

- 当前任务完整正文；
- WORK_ROOT 与 ARTIFACT_ROOT；
- 精确 Interfaces；
- 允许修改的文件；
- verification-mode/profile；
- task 起点 SHA；
- 本任务不应触碰的用户已有改动。

输出：

- 实际改动文件；
- 验证命令与结果；
- 与计划的偏离及理由；
- commit SHA，或未 commit 的明确原因；
- blocker 与剩余风险。

实现 agent 不自行宣布通过评审。

### 10.2 task-reviewer.md

同一个 fresh reviewer 依次判两轴：

- Spec：缺做、超范围、与批准设计/任务冲突；
- Quality：正确性、边界、仓库规范、错误处理、类型和维护性。

严重度统一：

- 阻断：动摇任务或使结果不可交付；
- 须改：实质缺口，修完才可进入下一任务；
- 可改：可选改进，不阻塞。

轴结论映射：

- 有阻断 → 阻断；
- 无阻断但有须改 → 须改；
- 仅可改或无发现 → 通过。

同一发现最多自动修复/复评两次；未清则交用户。内联执行无法提供独立 reviewer 时，必须标非独立评审，最终整支 reviewer 不得因此省略。

## 11. 整支评审与终态证据

### 11.1 BASE

BASE 永远使用 preflight 记录的精确 START_SHA，不再事后用 git merge-base 主干 HEAD 猜测本次起点。

若用户明确把已有分支上的多笔提交全部纳入本任务，必须在 preflight 选择更早的显式 BASE，并记录理由。

### 11.2 完整终态快照

整支评审前必须满足其一：

1. 本任务所有改动已形成提交，工作区无本任务未提交内容；或
2. 生成一份同时覆盖 committed、staged、unstaged 与 untracked 的完整终态证据。

reviewer 的范围说明必须列出：

- START_SHA；
- HEAD；
- staged/unstaged/untracked 状态；
- 终态 patch 路径；
- verification-profile 结果。

### 11.3 复评

发现修复后：

1. 重新生成终态快照；
2. 核销旧发现；
3. 对修复实际触及的文件和邻接范围做新缺陷扫描；
4. 修复扩出原文件或改变接口时，重跑两轴完整评审；
5. 更新 code-review.md 为终态结论。

不得只核旧 delta 后立即宣布完成。

## 12. 描述与单一权威源收敛

### 12.1 触发描述

frontmatter 调整为：

- 仅用户显式调用；
- 适用于需要完整侦察、设计、计划和实施闭环的开发任务；
- 不用于只读解释、单纯诊断或用户明确要求跳过设计/实施的任务；
- 无必需外部 Skill 依赖；
- 支持满足 runtime-contract 最小能力的宿主，不再声称无条件适配任何环境。

### 12.2 完整性措辞

按主题摸全集改为：

> 对需求主题做高召回摸排，列明搜索根、命中载体、调用/消费面、未覆盖区与置信度。

除非存在可机械核验的完整引用图或载体清单，否则不得产全称覆盖声明。

### 12.3 文档清理

- 删除 runtime 和模板中的 ~/.claude 硬编码。
- README 分别给 Claude/Codex 安装与能力映射示例。
- 修正 README 中不存在的 incubating/recon-driven-dev 路径。
- SKILL.md 路由不携带三/四等易漂移数量。
- EVAL-COVERAGE 持有路径库存与四态图例；MAINTAINING 持有地板、天花板和收敛规则。
- 活跃 BACKLOG/EVAL 用文件名 + 标题/条款名作主锚点，行号仅辅助。

## 13. 分批实施

### 批次 A：宿主与工作区契约

范围：

- 新建 runtime-contract.md 和 run-state.md 模板；
- 去工具名与安装根硬编码；
- 加 preflight；
- 前移隔离并统一 START_SHA、WORK_ROOT、ARTIFACT_ROOT。

完成判据：

- Claude/Codex 均能映射最小能力；
- dirty worktree 不会静默丢失或被错误提交；
- 阶段①至⑤只使用一个 WORK_ROOT 和一个 ARTIFACT_ROOT。

### 批次 B：阶段状态机

范围：

- 修①封存顺序；
- 闭合②批准与③决策；
- 明确③回流；
- 调整④最终计划审批；
- 给回路加两轮上限。

完成判据：

- 每个状态和用户选择只有一个合法下一状态；
- 不再同时出现不得回流与必须回写②的矛盾；
- compaction 后能仅据 run-state 与产物恢复当前阶段。

### 批次 C：实现与验证契约

范围：

- 新建 task-agent.md 与 task-reviewer.md；
- 引入三种 verification-mode；
- 统一严重度映射；
- 重做终态快照与复评。

完成判据：

- automated、executable-check、manual 三条路径均可闭合；
- 内联与子 agent 执行均有明确逐任务评审；
- 终评能覆盖未提交和未跟踪的本任务终态。

### 批次 D：维护资产收口

范围：

- README、模板、描述与权威源清理；
- BACKLOG/EVAL/CHANGELOG 更新；
- 跑 MAINTAINING 全 7 条改后验证 rubric；
- 做消费者映射。

完成判据：

- 无不可达引用和过期运行说明；
- 每条判据只有一个权威家；
- 已被整改吸收的 BACKLOG 主体有关闭或迁移记录。

## 14. 验证方案

### 14.1 静态场景走查

至少逐条走查：

1. Codex，真正零历史 reviewer；
2. Claude Code，原工具映射；
3. 原工作区存在用户未提交改动；
4. 已处于既有功能分支；
5. 无测试 runner，只能 manual-evidence；
6. ③有条件通过并回修；
7. ④选择子 agent 后再批准最终计划；
8. 整支评审修码并新增 untracked 文件；
9. 用户拒绝 worktree；
10. push/PR 不可用，降级保留分支；
11. 子 agent 与主会话不共享文件系统；
12. reviewer 连续两轮未能清零发现。

### 14.2 真实实跑

真实验证至少使用两个不同任务：

- 任务一：简单、单仓、有自动化测试，建议在 Claude Code 跑；
- 任务二：多任务、子 agent 执行，包含评审修订或验证降级，建议在 Codex 跑。

两次实跑都要产生监督笔记与 improvements.md，并按 MAINTAINING 三分诊处理。

真实 trace 完成前，只能宣称静态整改完成，不得宣称跨宿主实测到位。

## 15. 总体验收标准

- [ ] frontmatter 不再无条件宣称丢到任何环境。
- [ ] runtime 文件无 ~/.claude 安装根硬编码。
- [ ] 通用判据不把 Task/Read/Grep/Glob/Write 当能力检测条件。
- [ ] Codex/Claude 都有明确能力映射。
- [ ] fresh reviewer 有宿主级隔离要求和诚实降级。
- [ ] preflight 记录 WORK_ROOT、ARTIFACT_ROOT、START_SHA 与初始状态。
- [ ] dirty worktree 有归属判断，不自动 stash/reset/夹带提交。
- [ ] 阶段①用户批准后才封存。
- [ ] 阶段③三档结论均有唯一转移，回流最多两轮。
- [ ] 阶段④批准的是最终执行形态。
- [ ] 三种 verification-mode 均有合法路径。
- [ ] per-task 实现与评审 prompt、输入、输出和档位齐全。
- [ ] 整支评审 BASE 固定为 START_SHA 或显式覆盖值。
- [ ] 终态证据覆盖 committed/staged/unstaged/untracked。
- [ ] 复评既核旧发现，也检查修复引入的新问题。
- [ ] README、模板、EVAL、BACKLOG 与当前运行语义一致。
- [ ] MAINTAINING 的 7 条改后验证 rubric 全部通过。
- [ ] 至少完成 Claude 与 Codex 各一次真实实跑后，才可标跨宿主实测到位。

## 16. 发布与回退

- 四个批次各自独立提交，禁止一个提交混完全部运行语义。
- 每批改动先做消费者映射，再改权威文件，最后同步路由与模板。
- 某批走查失败时只回退该批，不撤销已验证通过的前批。
- 不使用 reset --hard、checkout -- 或自动清理用户工作区。
- CHANGELOG 对每批分别记录 what、why、验证证据与诚实定性。

## 17. 诚实定性

本整改属于运行契约重整与流程正确性修复，包含真实行为变更，不是纯文档整理。

预期收益：

- 能力提升：跨宿主执行、真正 fresh reviewer、验证降级、状态恢复；
- 正确性修复：工作区快照、阶段转移、计划审批、BASE 与终态证据；
- 工程收益：路径收敛、单一权威、维护资产去漂移。

在完成真实实跑前，所有跨宿主效果均为设计推定，不能据本设计稿直接宣称已经验证。

# ⑤ 实施 细则（两条执行分支 gates + 通用吸收 + 非显性陷阱块）

> ⑤ 阶段的细则,由 SKILL.md ⑤ 指针引入。两分支(内联 / 子 agent)由 ④ 末执行方式 `⏸` 选出。per-task 两轴评审判据住 `task-reviewer.md`、实现契约住 `task-agent.md`,收尾前整支评审判据住 `code-reviewer.md`——本文只路由、不复述。每个 gate 写"达成什么 / 何时停",具体怎么做(TDD 红绿、git / worktree 命令)模型自己会、不在此教。

## 实施前:计划冲突预检（两分支都做）

⑤ 开跑前、写第一行码前,做一遍跨「**计划 ↔ 全局约束 ↔ 评审 rubric**」的冲突预检:

- 任务之间有没有互斥;
- 有没有任务违反全局约束;
- 计划有没有强制了"评审会视为缺陷"的东西。

承重在两个**反默认动作**:

- **一次批量问**用户——把发现的冲突攒成一批问,**别中途逐条打断**实施;
- **扫干净就静默继续**——没冲突别汇报"我检查了没问题"。

与 ④ 自评的分工:④ 自评 = 计划**自身**完备性(覆盖 / 签名,写计划时做);本预检 = **跨**计划 ↔ 约束 ↔ rubric 的冲突(执行前做)。两者不重叠。

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

## 共有硬闸（两分支都生效 · 依序）

1. **clean-baseline**:进工作区后**先跑现有测试确认绿底,再写新码**;红底 → 停下问用户(继续 / 先查)——否则分不清新坏旧坏。**本闸在 preflight 定下的最终 WORK_ROOT 内、依赖就绪后运行**(隔离已前移,不再等到此刻建工作区)。
2. **ISOLATE(已在 preflight 完成)**:隔离在起步 preflight 就已建立(design §6.1),⑤ 不再新建 worktree,只在 preflight 定下的 WORK_ROOT 内落地——建立细则(优先原生 worktree 工具 → `git worktree` 兜底、从 START_SHA 所在 HEAD 切、`<type>/<change-name>` 分支名、dirty 三分支归属、isolation-waiver)单一权威住 [`runtime-contract.md`](runtime-contract.md),此处不复述;⑤ 只**确认** WORK_ROOT 与依赖就绪。收尾 BASE 口径见下「收尾前整支代码评审」段(已钉 START_SHA、不在此重复)。
3. **按 verification-mode 实施**:据 run-state 声明的 mode 走上方「验证契约」三路径之一。**automated-tdd**——每个特性 / 修复先写失败测试 → 亲眼看它按预期失败 → 写最小代码转绿(输出干净)→ 重构保持绿;失败测试写在 ② 预约的测试缝隙上(必覆盖清单④),修 bug 先用失败测试复现。**executable-check / manual-evidence**——按验证契约各自的「先证据、后改」纪律走,不套 automated-tdd 的删码规则。
4. **per-task 两轴评审(两分支共有 · 按序)**:每个任务实现 + commit 后过 **Spec 符合 + Quality 质量** 两轴——判据、严重度三档、两轮上限、内联「非独立评审」标注**单一权威住 [`task-reviewer.md`](task-reviewer.md)**,每任务实现子 agent 的输入 / 输出契约住 [`task-agent.md`](task-agent.md),本文只路由、不复述。**子 agent 分支**:派 task-agent 实现、派 task-reviewer 评审。**内联分支**:主会话按同一两轴自评、**标「非独立评审」**(收尾整支 reviewer 不得因此省略)。有发现 → 改 → 复评,任一阶段未清**不进下一任务**;实现 agent 不自宣通过。这道评的是**每个已实现任务对设计的符合度**——区别于 ② 自评、③(评设计本身)、收尾整支评审(评全分支)。
5. **continuous execution**:开跑后一路做到底,**别在任务间反复问"要继续吗"**;只在 blocker(缺依赖 / 反复验证失败 / 指令不清 / 计划有洞)时停下——计划错**上报用户**、别静默绕过。

## 收尾前整支代码评审（派 `code-reviewer.md`）

FINISH 前,对本次分支的整支改动做一道宽口径冷视角评审:

- **触发与派 / 降级**:派隔离子 agent 跑 `code-reviewer.md`(按 SKILL.md「派发与降级」走),无隔离能力降级主会话自跑判据。**派 / 降级只看隔离能力,与 ④ 选的执行分支正交**——内联执行完、若有隔离能力,照样派独立 reviewer(冷视角防 per-task 漏的跨任务 / 集成问题)。
- **取终态证据**:整支评审前须满足其一——(1) 本任务所有改动已提交、工作区无本任务未提交内容;或 (2) 生成一份**同时覆盖 committed / staged / unstaged / untracked 的完整终态证据**(§11.2)。主会话用**原生 git**(非脚本)据 **BASE = preflight 记录的 START_SHA**(§11.1,不再事后 `git merge-base` 猜起点;用户明确把分支上多笔既有提交纳入本任务时,在 preflight 选更早的显式 BASE 并记理由)取 `START_SHA..HEAD` diff + 未提交 / 未跟踪补丁,写成文件传路径给 reviewer(**禁落 `.git/`**;落本次产物目录、随归档保留)。reviewer 范围说明须列五项:START_SHA / HEAD / staged·unstaged·untracked 状态 / 终态 patch 路径 / verification-profile 结果(判据住 `code-reviewer.md`,本文不复述)。
- **判据**:两轴(Standards + Spec)+ per-axis 结论住 `code-reviewer.md`,本文不复述。
- **回流与复评**:任一轴阻断 / 须改 → 修 → 复评。**复评判据**(重新生成终态快照、核销旧发现、对修复触及文件 + 邻接范围做**新缺陷扫描**、修复扩出原文件 / 改接口时**重跑两轴完整评审**、更新 code-review.md 终态)**单一权威住 [`code-reviewer.md`](code-reviewer.md)「复评」段、本文不复述**——**不得只核旧 delta 就宣布完成**(§11.3)。可改 → 记进度账本 / 收口菜单前提示。**任一轴改了码(须改修复 / 可改采纳),归档前重取终态 patch 覆盖归档、逐条核 code-review.md 状态对齐 diff 终态**——改了的标「已核销 / 已采纳」、不留评审前残值。

## 收口与归档

6. **FINISH 闭合菜单**:全部任务做完——**先复验全测试绿 → 检测工作区 / 分支态 → 给固定闭合菜单**(本地合并 / push+PR / 保留原样 / 丢弃;detached-HEAD / 外部托管则**去掉"本地合并"**)**→ 精确执行所选一项**。**绝不在收尾抛开放式"接下来干嘛"**。
7. **归档**:分支收口后把本次目录移进 `docs/recon-driven-dev/_archived/`(目录名已带日期、直接移;产物文档是否 commit 按所在仓惯例一并定)。**⏸ 收尾前确认**。

## 子 agent 分支:交接护栏 + 吸收

选了"每任务一个新子 agent"执行时,在共有硬闸之上加:

- **交接护栏**:每个 sub-agent 给**全任务文本 + 场景上下文**(别让它读计划文件或继承会话史);同一工作区**不并行**跑多个实现 agent;卡住的 agent **别静默原样重派**——换更多上下文 / 更强模型 / 更小任务。
- **以文件交接、不靠粘贴**:任务 brief / 实现报告 / diff 都**写成文件传路径**,不粘进派发 prompt(粘贴物会常驻主控上下文、每轮重读)。**不引入任何脚本,自己写文件;文件一律落本次产物目录、禁落 `.git/`**。
- **不替评审者预判**:派评审子 agent 时绝不写"别报 X / 这条最多算小问题",让评审者自己提、再裁。
- **进度账本**:已完成任务记进**本次产物目录**的账本文件,抗 compaction;**随产物目录一起归档**。
- **按角色选模型**:派子 agent 时若 harness 支持则显式指定模型(否则继承会话默认的最贵模型)。

## 非显性陷阱（模型不会主动想到,保留）

- **worktree 检测假阳性**:`GIT_DIR != GIT_COMMON` 在 **submodule** 里也成立 → 下结论前用 `git rev-parse --show-superproject-working-tree` 排除(返回路径 = 在 submodule、按普通仓处理)。
- **项目内 `.worktrees/`** 须**先 gitignore 并提交**,再在其下建 worktree(否则 worktree 内容被提交进仓);用 `git check-ignore` 验。harness / 全局托管的目录不必查。
- **收口顺序**:要集成则**先合并 → 在合并结果上验测试 → 再移除 worktree → 最后删分支**(先删分支会因 worktree 仍引用而失败)。
- **清理 provenance 门**:**只清你自己建的** worktree;push+PR 与"保留原样"两档**必须留着** worktree(用户要据 PR 反馈迭代);只在合并 / 丢弃两档清;`git worktree remove` 前先 `cd` 回主仓根、再 `git worktree prune`。
- **丢弃需打字确认**(如用户键入 `discard`)才执行任何破坏性删除,别凭一句随口的"行"就强删分支 / 移 worktree。
- **TDD 反合理化红旗**:「待会儿测 / 已手测过 / 太简单不用测 / 删码可惜 / TDD 教条我务实」一律是**红旗、非豁免**;若生产代码先于失败测试写了,**删掉重来**(别"留作参考"或"改改用")。测**真实行为**而非 mock 调用次数;一个测试一个行为;难测 = 设计味道(解耦 / 注入依赖)、非跳过理由。
- **独立子仓 caveat**:代码在被 `.gitignore` 排除的独立子仓里时,worktree / 提交 / 收口都对**子仓**做(对容器仓做盖不到子仓里的代码)。
- **false-① -premise pause**:实现中若发现 design 建在 ① 的错误前提上——**暂停、surface 给用户**(续做 / 回 ②③),按 SKILL.md「事实订正」留痕,别静默绕过、也别自行重判。
- **进度账本是 scratch**:账本落在本次产物目录、是 git-ignored scratch;丢弃档 / `git clean -fdx` 会清掉它,需要时从 `git log` 恢复已完成任务;**禁落 `.git/`**。

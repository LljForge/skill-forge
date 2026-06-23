# CHANGELOG

记 what + why，不写过程流水账。

## v0.4.1 — 全局护栏拆出「维护宪法」(运行护栏 / 治理规则按受众分家)

**主题**：SKILL.md「全局护栏」原先混着两类约束——给**运行时 AI** 的跨阶段硬闸、给**维护者**的 skill 治理规则(防膨胀 / 单一权威源 / provenance 归处)。后者与「跑五阶段流水线」无关、却随 SKILL.md 每次运行载入。本次按受众拆开。

**what**：
- **新增 `MAINTAINING.md`**——维护宪法(改本 Skill 自己时读 · 不随运行载入):收原护栏中的「薄是审美 / 单路径承载软上限」「别给定向分析加判断规则表」「design.md 必覆盖清单形态」「判据单一权威源 · 只路由不复述」「provenance 归 CHANGELOG」,及「否决持久 `CONTEXT.md` / ADR 库」的设计取向。
- **SKILL.md「全局护栏」只留运行时护栏**:① 报告质量尺、各阶段出口守质量 · 回流禁、③ 评审边界、④⑤ 内联拥有 · 不加冗余评审、不引持久件,+ 事实订正块;顶部加一句指针引向 `MAINTAINING.md`。
- **删 1 条纯冗余**:「别让半成品报告进 ②」与 SKILL.md ① 段(主会话实测门)+ `references/directed-analysis.md` 逐字重复——约束由二者持有,护栏处不再复述(它本身恰违反「判据单一权威」)。
- **瘦身 3 条**:剥掉与流程图重复的「线性不回流」前导式、「本次吸收全部内联重写」施工记录、「否决 `CONTEXT.md` / ADR 库」设计理由(后者移入 `MAINTAINING.md`)。
- README 目录结构补 `MAINTAINING.md` 一行。

**why**：运行脊柱只该承载跑流水线要的东西;skill 治理规则是改 skill 时才读的,留在脊柱既占运行上下文又模糊了「护栏」的受众。拆开后两边各自单一受众、互不串味。文件拓扑对齐姊妹 skill `recon-super-dev`(其同有 `MAINTAINING.md`)。

**诚实定性**：纯文档结构整理(按受众分家 + 去重),**流程 / 判据 / 契约零语义变更**;运行时载入的护栏集合在语义上是原集合的去重子集。

## v0.4.0 — 改名 recon-driven-dev-inline → recon-driven-dev + 与其他 skill 完全解耦

**主题**：上游 `recon-driven-dev`（编排版）已改名 `recon-super-dev`,腾出的名由本自包含版承接;同时与其他 skill 完全解耦——README 不再以"fork 从属"自况,改纯描述本 skill 自身。

**what**：
- **改名**：目录 `skills/recon-driven-dev-inline/` → `skills/recon-driven-dev/`;frontmatter `name` / 标题;产物目录命名空间 `docs/recon-driven-dev-inline/` → `docs/recon-driven-dev/`;`references/` 内 4 处硬编码模板路径(`~/.claude/skills/recon-driven-dev/...`);`~/.claude/skills/` 软链接重建。
- **解耦**：删 README「与 recon-driven-dev 的关系」段——改名后"本 skill 是 recon-driven-dev 的 fork"自指矛盾;README 现纯描述本 skill 自身、不提任何其他 skill。
- **历史档案按原貌保留**：`docs/superpowers/` 下 4 个 spec/plan 历史文件、本 CHANGELOG v0.1.0–v0.3.0 历史条目均不动（记录的是"-inline 时代"的事实）。

**注（消除历史歧义）**：本 CHANGELOG v0.1.0–v0.3.0 里出现的"recon-driven-dev"指**上游**（其时本 skill 名为 recon-driven-dev-inline）;上游现已改名 `recon-super-dev`,本 skill 现名 `recon-driven-dev`。早期条目按历史保留、不回改。

**诚实定性**：纯改名 + 文档解耦,**流程 / 判据 / 契约零语义变更**。

## v0.3.0 — 重构为五阶段自包含流水线（融合 superpowers + mattpocock）

**主题**：在保留四阶段骨架精神上,演化为**五阶段、披露模型 C（脊柱 + references 下沉）、吸收 superpowers 与 mattpocock/skills 各自优势**的自包含流水线工作流。

**what**：
- **骨架 4→5 阶段**：原「④ 落地」拆为「④ 写计划」+「⑤ 实施」两个独立阶段；「③ 评审」改为**可选**,由 ② 出口的评审决策点据 ①② 信号给建议、用户拍板。
- **披露模型 C**：SKILL.md 收为跨阶段**脊柱**（流程图 / 全局护栏 / ⏸ / 指针,147→137 行）,各阶段细则下沉 `references/`；指针均点名该 reference 里**非默认的具体动作**（如「主会话实测门、非泛质量门」「跳过 ③ 丢定向报告验收」）。
- **新增 reference**：`directed-analysis.md`(①) / `requirements-design.md`(②) / `planning.md`(④) / `implementation.md`(⑤) / `code-reviewer.md`(⑤ 整支评审 sub-agent 本体) / `templates/code-review.md`。共 7 reference + 3 template。
- **② 吸收**：测试缝隙（在哪测 / mock 哪里 / 理想=1,焊到 ⑤ TDD）、深模块 / 窄接口透镜、ADR「决策 + 被否方案 + 为什么」、`design.md`「必覆盖清单」（form-flexible 检查锚点替代僵化骨架,反掉原「design 不设骨架」与「完全无骨架」两旧表述）。
- **④ 新阶段**：曳光弹垂直切片（含极小改动退化）/ 任务右尺寸 / prefactor / 文件结构图（按职责切）/ 验收 + 依赖序（无占位符=两分支底线）/ ④自评（限设计↔任务机械对账）；分层计划——选子 agent 执行才升级到自包含（Interfaces 精确签名 + 任务级完整路径）。
- **⑤ 新阶段**：实施前**计划冲突预检**（一次批量问 + 扫净静默继续）、收尾前**整支代码评审**（`code-reviewer.md` 两轴 Standards+Spec、per-axis 不跨轴归并、BASE 兜底）、子 agent 分支的以文件交接 / 不预判 / 进度账本 / 按角色选模型；原内联 gates + 非显性陷阱块保留,补「进度账本是 scratch」一条。
- **单一权威 + 派发降级范式**：派发 / 降级提为脊柱单点声明（①③⑤整支评审共用）；三评审构造（`review-agent.md` 设计期 / per-task 逐任务 / `code-reviewer.md` 整支）判据各自唯一权威,脊柱与模板只路由不复述。

**why**：原版四阶段全内联 SKILL.md 在「④ 落地」一段最薄弱、单文件渐胀；借两套成熟技能的方法论补强写计划 / 实施,用披露模型 C 收住脊柱可读性。守住唯一硬约束——**自包含 / 零外部依赖**：吸收一律内联重写,不调任何外部 skill、不引入任何脚本。

**借鉴溯源**：
- **superpowers**：`brainstorming`（②对话契约,原已有）/ `writing-plans`（④右尺寸 / 文件结构图 / 自包含任务 / execution handoff）/ `executing-plans` + `finishing-a-development-branch`（⑤内联 gates / 收口）/ `subagent-driven-development`（⑤计划冲突预检 / 整支终评 / 文件交接 / 不预判 / 进度账本 / 按角色选模型）。
- **mattpocock/skills**：`to-prd`（测试缝隙）/ `to-issues`（曳光弹切片 / prefactor / 验收+依赖序）/ `codebase-design`（深模块 / 窄接口透镜）/ `domain-modeling`（ADR 中间路线）/ `review`（整支 Standards+Spec 两轴）/ `writing-great-skills`（方法论：信息阶梯 / 渐进披露 / no-op 测试 / 单一权威源 / leading word）。
- 明确**砍掉**的过重件：项目级持久 `CONTEXT.md` / ADR 库、`codebase-design` 完整词汇表 + 禁用近义词、结构化四态实现者协议、① 引入 git 历史侦查信号、引入外部 `scripts/`、给 `review-agent.md` 加测试缝隙/ADR 探针。

**冻结不动**：`recon-agent.md` / `review-agent.md` / `templates/{requirements,review}.md` 四个文件语义一字未改（它们也是本次写作的声音范本）。

**诚实定性**：**结构重构 + 能力吸收**,非能力跃升或定量提升；不跑 benchmark。

**设计与计划溯源**：全程经 `superpowers:brainstorming` → `writing-plans`,设计稿 [`docs/superpowers/specs/2026-06-22-recon-driven-dev-inline-refactor-design.md`](../../docs/superpowers/specs/2026-06-22-recon-driven-dev-inline-refactor-design.md)（v2.2,经 4 轮对抗评审收敛）、实施计划 [`docs/superpowers/plans/2026-06-22-recon-driven-dev-inline-refactor-plan.md`](../../docs/superpowers/plans/2026-06-22-recon-driven-dev-inline-refactor-plan.md)（9 任务）。

## v0.2.1 — review-agent.md 补派发祈使（防空转 · PATCH）

**主题**：`references/review-agent.md` 文件头补一句动作工单,防评审 sub-agent 派发后只待命不开评。

**what**：文件头补 `## 现在执行` 一句（读三份→按判据评→产 review.md→回简短结论;立即开始勿待命;缺档回 RETRY），把出口契约前置到第一眼可见;元注释「prompt 体从 ## 角色起」同步改为「从 ## 现在执行起」。判据/出口/边界正文一字未动。

**why**：本 Skill 的 review-agent.md 与委托版共享同款,委托版实跑（GMZB master-data ehr-promote-echat-sync）暴露其首次派发只回问候、0 工具调用——通篇「角色/判据」陈述体、缺动作指令,LLM 拿到职位说明书式 prompt 合理反应是「待命」。补文件头工单即修。本变体同步该改、与委托版保持一致。

**诚实定性**：纯 prompt 工程补丁（加动作触发 + 出口前置），判据语义未动,非能力变更。

## v0.2.0 — ① 定向分析自实现为侦查 sub-agent（去内置 Explore 依赖）

**主题**：把 ① 的现状侦察从"派给内置 `Explore`/`Task`"重构成"派一份本 Skill 自带的侦查 agent 本体"，与 ③ 的 `review-agent.md` 范式对称。

**what**：
- 新增 `references/recon-agent.md`——① 定向侦查 sub-agent 的 prompt 本体（四样契约 / 软硬分等 / 探查纪律 / 出口自检 / 边界的单一权威）。SKILL.md ① 瘦身为**只派发/路由**（Read recon-agent.md 作 `Task` prompt）+ **主会话独守的软推断实测门 / 事实订正落点**。
- **去 `Explore` 化**：删 ① 原"内置 `Explore`/`Task` 派发 → 主 grep"两级降级里的 Explore 首选分支；改为"通用 `Task` 当搬运工跑自带 recon-agent.md，无 `Task` 能力 → 主 agent inline 跑同一套契约"。不再赖任何特定内置 agent（其 prompt/模型不归本 Skill 控、质量会飘）。
- 四样契约 / 软硬分等**逐字迁入** recon-agent.md（语义不动），只从 SKILL.md ① 搬家、不重写。
- 探查面收敛到 harness 自带 `Read`/`Grep`/`Glob`，**不引入任何外部 CLI**（ast-grep 之类）；探查纪律只留"先广后窄 / 命中清单优先 / 不脑补清单外文件"。
- 同步去 Explore / 补 recon-agent.md：SKILL.md:26、README 自包含段与目录结构。

**why**：① 是仓里唯一还赖内置 `Explore` 的阶段，③ 早已自实现（`review-agent.md`）。拉齐到同一范式——侦查质量由自带 prompt 焊死、不随内置 agent 的黑盒模型漂；且仍零外部依赖、可移植。

**诚实定性**：纯结构重构（搬家 + 去 Explore 依赖 + 与 ③ 对称化），**① 的侦查契约一字未改语义**，非能力变更。

**借鉴溯源**：自实现 + 派发兜底范式 ← 本仓 ③/`review-agent.md`；"宁可自造也不用内置 Explore"的判断 ← `parcadei/continuous-claude-v3@explore`；叶子不向下派 ← `ruvnet/ruflo@agent-code-analyzer`；先广后窄 / 命中清单优先 ← `lum1104/understand-anything` + `404kidwiz/...@codebase-exploration`。明确**砍掉**的过重件：深度分档、commit hash 钉时点、第二份机读产物、ast-grep 外部依赖、tree-sitter 流水线——回归"侦查 agent 本身不宜过重"。

## v0.1.0 — 初版（自包含 fork）

**主题**：从 `recon-driven-dev` fork 出零外部依赖的自包含版。

**what**：
- 去掉"编排外部 Skill"的角色。② 把"委托 `superpowers:brainstorming`"改写成**内联对话契约**（一次一问 → 2-3 方案 → 分节呈现；HARD GATE / "太简单"override / 范围分解触发器；`design.md` 内容由本 Skill 自产）。④ 把"全委托 superpowers 实现链"改写成**内联 gates + 非显性陷阱块**（拆计划⏸ → clean-baseline → ISOLATE（优先原生 worktree 工具）→ TDD 铁律 → per-task 两阶段评审 → continuous execution → FINISH 闭合菜单 → 归档）。
- ① 去掉 `feature-dev:code-explorer` 软依赖，收成"内置 Explore/Task 派发 → 主上下文 grep"两级降级。③ 沿用评审 sub-agent + 判据单一权威（`review-agent.md`），并**改写两条原指回源 skill 的硬编码路径**为 fork 自身。
- 产物目录改用自有命名空间 `docs/recon-driven-dev-inline/`，与原版零撞车。
- 护栏：反转"design.md 骨架"与"④ 实现链"两条（原版理由建于 superpowers 存在，fork 已无外部链可委托）。

**why**：可移植性——要在没装 superpowers 的环境里也能跑完整条轨。

**诚实定性**：本版相对原版是**工程收益（可移植 / 零依赖 / 自包含），非能力跃升**。流程编排件、触发稳定，不跑定量 benchmark。

**冻结快照**：①③ 与模板是从 `recon-driven-dev`（v1.5.x 期）复制而来——这违背"超集应共用一份文件"的去重原则，是**可移植性 vs 单一权威源的有意取舍**（零依赖就无法与宿主共享一份文件）。本 fork 定位为**冻结快照，不自动追踪上游**；上游若有重要演进，按需手动回灌。

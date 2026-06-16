# CHANGELOG

记 what + why，不写过程流水账。

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

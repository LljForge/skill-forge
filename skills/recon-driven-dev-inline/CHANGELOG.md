# CHANGELOG

记 what + why，不写过程流水账。

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

# 批次 C 观测回执 · markdown-toc

> 本次在阶段③第六轮评审“不通过”后由用户终止。状态只按实际触发判，不把设计预约当作运行证据。

| # | 观测项 | 结论 | 现场证据 |
|---|---|---|---|
| ① | 老 TDD 未坏 | **未触发** | design v6 已声明 task1/task2=`automated-tdd`，但未进入④/⑤；HEAD 仍等于 START_SHA，无 `src/`、`tests/` 或红→绿输出。不能据设计文本判“过”。 |
| ② | BASE 正面回归 | **未触发** | preflight 明确 `START_SHA=289d70d948c59dc40d62242e2d4702475324b4ce`，故意的 `unrelated-preflight-note.txt` 一直为 untracked；但未触发⑤整支 code-reviewer，故不能判整支评审 BASE 通过。另附终止态快照证明 committed/staged/unstaged/untracked 覆盖和 sentinel 未漏。 |
| ③ | 三模式各自闭合 | **未触发** | manual-evidence 已在 design 事先写明步骤、预期、证据和风险；automated-tdd 也已预约测试缝隙，但任务在③终止，二者均无实际证据，不能判闭合。executable-check 本次本就未选。 |
| ④ | per-task 评审真在跑 | **未触发** | 用户在入口已指定“每任务一个新子 agent”，run-state 保留该选择；但 tasks.md 尚未生成，task-agent/task-reviewer 从未派发，没有 Spec+Quality 产出。 |
| ⑤ | 复评不走过场 | **未触发** | ⑤整支 code-reviewer 与其修后复评从未触发。③的六轮 fresh 设计评审均是完整重判、确有新发现，但它们不是批次 C 要验的代码复评，不能冒充⑤证据。 |

## 顺带观察：④执行方式时点

用户在任务入口硬指定“每任务一个新子 agent”，run-state 从 preflight 起记录该约束；但阶段③未通过，④没有生成基线/定稿 tasks.md，也没有发生“先选执行方式→升级 Interfaces/完整路径→审批最终 tasks.md”。结论：**未触发，不能判时序通过**。

## 🔶D-gap（不计五条）

- runtime-contract 只有 Claude 映射；本次需主会话自行把 Codex multi-agent、exec/apply_patch、git worktree 映射到能力名。
- ① fresh recon-agent 完成通知先于文件同步；主会话立即读取绝对路径报不存在，稍后又出现错名 `direct-report.md`。缺少 Codex 产物同步时点/取回指引。

## 终止态证据

- START_SHA：`289d70d948c59dc40d62242e2d4702475324b4ce`
- HEAD：`289d70d948c59dc40d62242e2d4702475324b4ce`（与 START_SHA 相同；无实现提交）
- 状态清单：`/Users/lilongjian/Projects/AI/skill-forge/docs/recon-driven-dev-eval/2026-07-14-batchC-markdown-toc/terminal-status.txt`
- committed/staged/unstaged/untracked 完整补丁：`/Users/lilongjian/Projects/AI/skill-forge/docs/recon-driven-dev-eval/2026-07-14-batchC-markdown-toc/terminal-state.patch`
- sentinel：`unrelated-preflight-note.txt`，必须在状态清单与 untracked patch 中同时出现。

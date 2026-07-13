# 批次 A 观测回执 · 2026-07-13 · customer-ownership-info

> 终态判定。🔶D-gap 只作为批次 D 信号，不计入下列五条。代码/产物 worktree 已按用户选择移除，以下归档证据保存在各仓 `feature/customer-ownership-info` 分支。

## 五条观测

1. **过**｜① `directed-report.md`、② `requirements.md`/`design.md`、③ `review.md`、④ `tasks.md`、⑤ `code-review.md`/三份 `whole-branch.diff`/`run-state.md` 全程位于同一 `ARTIFACT_ROOT=/private/tmp/edoc-customer-ownership-info/docs/recon-driven-dev/2026-07-13-customer-ownership-info`；收口时整体移动到同一个 `_archived/2026-07-13-customer-ownership-info`，外层归档提交 `ec0ce104d415fb21e078e1be53731e0f1e5f482d` 一次纳入 10 个文件，彼此仍可按同目录文件名寻址。
2. **过**｜preflight 开工前外层 `git rev-parse HEAD` 现场值为 `9815b030c274523acb23946877156d52651f3a8f`；`run-state.md` 的 `START_SHA` 为同一完整 SHA，外层任务分支也从该 SHA 起步，归档提交父提交即该起点。
3. **过**｜开工前脏改动均未丢、未夹带：小程序原仓终态仍为 `M project.config.json`，其任务分支起点到 `dfb12b2` 的文件清单不含该文件；Web 原仓终态仍为 `M package.json`、`M yarn.lock`，其任务分支起点到 `587cfbb` 的清单不含二者；外层未跟踪 `docs/2026优化需求/` 仍在，外层任务分支只提交归档目录。外层另两份开工前已修改文档在执行期间由外部提交 `a28f8ec` 纳入 `main/origin/main`，不在本任务分支提交中；后端原仓保持起点 SHA 且干净。
4. **不过**｜本次现场不满足该条的验证前提：开工前外层、小程序、Web 均有未提交改动，任务又横跨三个代码仓及主数据/渠道/实名认证链，不是“干净工作区简单任务”。preflight 实际没有追问已可从现场判定的 dirty 归属，也没有批量提出无关问题，但单次样本不能为“干净 + 简单”场景提供有效现场证据，因此按证据不足判不过，而非把 🔶D-gap 或业务澄清算作失败。
5. **过**｜隔离在 preflight 起步即建立：外层、后端、小程序工作路径分别为 `/private/tmp/edoc-customer-ownership-info`、其下 `edoc-be`、`edoc-weixin-fe`；① 的零历史 recon-agent 读取这些 `WORK_ROOT` 路径并把 `directed-report.md` 落到同一 `ARTIFACT_ROOT`。`run-state.md` 的①门记录和报告内绝对锚点均以 `/private/tmp/edoc-customer-ownership-info` 开头。Web worktree 是实施期用户扩大范围后仍在同一既有 `WORK_ROOT` 内补建，不改变①已经在隔离区执行的事实。

## 🔶D-gap（不计入五条）

- `runtime-contract.md` 只有 Claude Code 能力映射，并有 Codex 映射待补注释；本次使用 `fork_turns=none` 作为 spawn-fresh-agent、命令读取/搜索、补丁写文件、`git worktree` 隔离、共享文件系统作为 shared-artifact-path。

## 现场事实账

- 开工前外层仓 HEAD：`9815b030c274523acb23946877156d52651f3a8f`。
- 隔离外层 worktree 建立后 HEAD：`9815b030c274523acb23946877156d52651f3a8f`，分支 `feature/customer-ownership-info`。
- 后端隔离 HEAD：`200ceb305e61b3fc0e4ae106477320427a63f01f`；小程序隔离 HEAD：`8e4e215e94a834388b47a4f12ea62aa64fecf24b`。
- Web 隔离 HEAD：`0a92aaf75c569fbc428339e398decabd493da034`（实施期经用户批准扩大范围后补建）。
- `ARTIFACT_ROOT`：`/private/tmp/edoc-customer-ownership-info/docs/recon-driven-dev/2026-07-13-customer-ownership-info`。
- ① 产物：`ARTIFACT_ROOT/directed-report.md`；报告全部电子签业务锚点以 `/private/tmp/edoc-customer-ownership-info` 开头，证明 ① 在 WORK_ROOT 运行。
- 原始工作区 dirty 快照：外层 2 个已修改文档 + 1 个未跟踪需求文件；`edoc-fe` 为 `package.json`、`yarn.lock`；`edoc-weixin-fe` 为 `project.config.json`；`edoc-be` 干净。
- 任务分支终态：外层 `ec0ce104d415fb21e078e1be53731e0f1e5f482d`；后端 `9b4527690389f8c5fa006e054555207c959b9c45`；小程序 `dfb12b232439d133b31f761c71062f9b424b5535`；Web `587cfbb8a2a8e67151450a3dda3b241a2321e02a`。四个 worktree 已移除，四个分支均保留。

# run-state · <change-name> · <YYYY-MM-DD>

> 本次变更的运行状态（per-change scratch，落本次产物目录、随归档清；**非跨项目长期上下文**）。
> 每次用户暂停前先更新本文件，保证 compaction / 任务恢复后能机械判断当前状态。判据不在此复述——只记事实字段。

- change-name / date: <…> / <YYYY-MM-DD>
- phase: <① | ② | ③ | ④ | ⑤>
- state: <draft | gated | user-approved | superseded | completed | aborted>
- SOURCE_ROOT: <用户原始工作区绝对路径>
- WORK_ROOT: <①至⑤实际执行工作区绝对路径>
- ARTIFACT_ROOT: <本次产物目录绝对路径>
- START_SHA: <本次改动开始前精确 HEAD>
- INITIAL_STATUS: <任务开始前 git status 摘要>
- HOST: <宿主类型 + 能力降级项 + isolation-waiver（若有）>
- 用户批准版本: requirements=<版本/摘要> design=<…> tasks=<…>
- ③ 执行: <是 / 否 + 原因>
- ④ 执行方式: <内联 | 每任务一个新子 agent>
- verification-mode: <automated-tdd | executable-check | manual-evidence>
- verification-profile: <scoped/full/lint/format/typecheck/build 各自适用范围+预期+时限，或不可执行原因>
- baseline 已知失败: <…>
- 修订/复评轮次: <…>
- FINISH 选择: <本地合并 | push+PR | 保留 | 丢弃>

> 字段的**语义与合法转移**由 `../runtime-contract.md`（路径 / 状态）与各阶段 reference 持有；本模板只提供写入位。

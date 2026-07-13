# 实测监督笔记 · 2026-07-13 · batchA-customer-ownership-info

> 实跑 recon-driven-dev 全程的现场记录。元层维护资产，归档即弃。采用 exception-only：顺畅停点不记行。

## 走过的路径单元

- preflight gate
- ①a（派零历史 recon-agent 侦查）
- ①c（主会话实测门：源码/参考仓取值；只读数据库超时后按契约保留未核验）
- ②a（内联逐问澄清与四节确认）
- ②b（用户批准需求/设计前未写实现）
- ②c（补探测试设施、二维码消费面和小程序基础库）
- ②d（requirements/design 四要素落盘）
- ②e（残留未核验/测试缝隙/ADR/爆炸半径信号已显式产出）
- DP1（① 坑/未核验与② 复杂度触发建议评审，用户选择进入评审）
- ③a（派零历史 review-agent）
- ③d（结论不通过，按修订清单交用户决定是否回写②）
- ②a/②c/②d/②e（用户裁决纳入 edoc-manage 渠道维护；回写 v2 并再次过需求/设计门）
- ③a/③d（派新的零历史 review-agent 复评；v2 结论不通过，回到业务/依赖裁决门）
- ②a/②d/②e（用户完成来源优先级与 firstValid 裁决；回写 requirements/design v3 并再次过门）
- ③a/③d（派全新零历史 review-agent 评审 v3；结论通过，0 阻断、0 须改、1 建议）
- ④（按基线六条生成分层实施计划；执行方式留到阶段末裁决）
- ⑤（用户选择内联；实施前冲突预检无冲突，进入 clean-baseline）

## 逐 ⏸ 体验自评

<!-- 仅在卡住、指令含糊或降级未走通时追加一行现场证据。 -->

- ⏸ ③复评｜卡住：`review.md` 发现现表无经理来源标记，`belong_busi_manager=旧渠道经理` 无法区分渠道自动值与同工号显式绑定；同时 `/api/searchEmployee` 手机号路径只返回 `firstValid`，本地无法观察候选是否重复，须业务/依赖裁决后才能回写②。
- ⏸ ⑤实施｜指令含糊：已批准设计排除 `edoc-fe` 且规定 `updateManagerInfo` 不反写个人经理，但现有 `FormEdit.jsx:244-274` 的负责人新增请求先不带经理调用 `saveOrUpdate`、再依赖不存在的响应 `id` 调 `updateManagerInfo`，无法触发“首次关联经理仅填空”；按 false-premise pause 交用户裁决，获准把 Web 首次保存订正纳入 v4/T8 后闭合。

## preflight 异常（非 ⏸）

- 🔶D-gap｜`references/runtime-contract.md` 的能力握手仅有 Claude 映射，并留有“批次 D 补：Codex 能力映射”注释；本次需自行把 `fork_turns=none`、只读命令、补丁写入、`git worktree` 与共享文件系统映射到契约能力。
- 环境权限｜首次 `git worktree add` 返回 `cannot lock ref ... unable to create directory for .git/refs/heads/...`；`git show-ref --heads` 证明不存在同名叶子分支，按 Codex 沙箱流程授权后原命令成功。初次误判为分支冲突，复核后已纠正，判为模型现场判断失误，不归因 skill。

# 实测监督笔记 · 2026-07-14 · batchB-preserve-login-source-account

> 实跑 recon-driven-dev 全程的现场记录。元层维护资产，归档即弃。采用 exception-only：仅记录卡住、指令含糊或降级失败。

## 走过的路径单元

- preflight：能力握手、dirty 归属、worktree 隔离、run-state 建立。
- ①a（派 recon-agent）、①c（主会话实测门）。
- ②a、②b、②c、②d、②e；DP1（建议评审）。
- ③a（共派 3 个 fresh review-agent）、③d（有条件通过回②，共 2 次修订/复评循环）、③c（最终通过）。
- ④a（基线 tasks）、④b（最终计划审批）、④c（先选内联再定稿）。
- 未触发：DP2、①b/①d、③b、④d、全部⑤、X1/X2。

## 逐 ⏸ 体验自评

- ②⏸ 含糊：`requirements-design.md:52` 写“**四要素**必须覆盖”，但紧接 `:54-58` 实际枚举 ①–⑤ 五项；本次保守覆盖五项，未阻塞流程。 [→ IP-01]
- ③复评⏸ 含糊：`SKILL.md` 与 `review-agent.md` 每轮都指定写同一个 `review.md`，受控回路却未规定多轮证据如何留存；若直接复评会覆盖首轮“有条件通过”现场，本次额外复制为 `review-r1.md`、`review-r2.md`、`review-r3.md`。 [→ IP-02]

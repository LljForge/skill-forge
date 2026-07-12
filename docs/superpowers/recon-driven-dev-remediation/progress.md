# recon-driven-dev 整改 · 进度表（跨会话续接入口）

> **新会话从这里开始。** 一眼看清:整改走到哪批、下一步做什么、哪批已有 plan、哪批还等实跑。
> 本目录四件套:[`design.md`](design.md)(已获批设计 · 权威)· [`plan.md`](plan.md)(逐批实施计划)· 本文件(进度)· [`batch-map.md`](batch-map.md)(批次×spec§×文件×回归验证×验收对照)。

## 这是什么

对 `skills/recon-driven-dev` 的运行契约整改,分 **6 批**(0/A/B/C/D/E)推进。核心排序原则(design §13):**单宿主(Claude)就能证伪的真 bug 先落地、每批各配一次真实实跑,再动下一批;跨宿主契约(批次 D)先只落降级骨架、待真实 Codex trace 才补实。** 每批独立提交,某批失败只回退该批(design §16)。

## 批次状态板

| 批次 | 内容 | 证伪宿主 | plan 就绪? | 代码落地? | 实跑证伪? | 状态 |
|---|---|---|---|---|---|---|
| **0** | 前置修订 + 工作台(调 spec + 写 plan + 建进度/对照表) | 单宿主(纯文档) | — | — | — | ✅ 完成 |
| **A** | 工作区地基(preflight + 隔离前移 + run-state + 去硬编码) | 单宿主可验 | ✅ 见 plan.md | ✅ A1–A6 已提交 | ⬜ 待用户实跑 | 🟡 代码就绪·待实跑 |
| **B** | 阶段状态机(①封存序 + ②③闭合 + ③回流 + ④审批 + 两轮上限 + 口号改写) | 单宿主可验 | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始 |
| **C** | 实现与验证契约(task-agent/reviewer + 三 verification-mode + 终态快照/复评 + BASE=START_SHA) | TDD/manual 单宿主;子agent 建议 Codex | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始 |
| **D** | 跨宿主契约补实(Codex 能力映射 + 文件系统降级 + 工具名→能力名全量) | **需 Codex 实跑** | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始(前置骨架在 A 已落) |
| **E** | 维护资产收口(README/模板/描述 + BACKLOG/EVAL/CHANGELOG + §4.3 薄账兑现 + 7 rubric) | 单宿主可验 | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始 |

> 图例:✅ 完成 · 🟡 进行中 · ⬜ 未做。「代码落地」= 该批所有 Task commit;「实跑证伪」= 按 batch-map.md 该批 ⚠️ 条真跑一遍无退化。

## 下一步（续接指令）

**当前:** 批次 A 代码已落地(Task A1–A6 逐任务提交:去硬编码 / run-state 模板 / runtime-contract 骨架 / preflight gate / 隔离前移)。**卡在单宿主实跑证伪**——尚未跑。

**下一动作:** 做**批次 A 单宿主实跑证伪**(inline 执行的 A6 Step 4)——拿一个真实开发任务在 Claude Code 跑一遍 recon-driven-dev 五阶段,按 [`batch-map.md`](batch-map.md) 批次 A 的 ⚠️ 五条验(产物不散落 / START_SHA 记准 / dirty 不丢不误提 / preflight 不啰嗦 / Claude 行为不变),监督笔记落 `docs/recon-driven-dev-eval/<date>-<task>/`、路径回填本表。**发现退化 → 只回退批次 A。**

**再往后:** 批次 A 实跑证伪通过后,回本目录**就地写批次 B 的 plan**(把 plan.md 追加批次 B 段,或另起 `plan-B.md`),同法推进 C → D → E。**不要提前把 B/C/D/E 全部 plan 写死**——每批等前一批实跑反馈,避免返工(design §13)。

## 跨会话续接协议

新会话接手时:
1. 读本文件「批次状态板」定位当前批;
2. 读 [`design.md`](design.md) 对应 §(权威设计,不复述在本表);
3. 若当前批 plan 已就绪 → 按 plan 执行;plan 未写 → 用 `/writing-plans` 就地写该批 plan(参照 batch A 的 Task 结构);
4. 每批落地后按 [`batch-map.md`](batch-map.md) 该批「回归实跑」逐条验,结果回填本表 + 记 trace 路径;
5. 只有 A/B/C/E(单宿主批)实跑证伪 + D 真实 Codex trace 都过,才可按 design §15/§17 宣称「跨宿主实测到位」;之前只能称「静态改完」。

## 变更记录（本表自身）

- 2026-07-12:批次 0 建立四件套;spec 落三条修订(薄账 §4.3 / 批次序+证伪宿主 §13 / 接缝口号 §4.2·§8);spec 从 `specs/` 移入本目录为 design.md;批次 A plan 就绪。
- 2026-07-12:批次 A 代码落地(A1–A6 提交,CHANGELOG v0.5.9);隔离细则 + 分支命名 + dirty 归属迁入 runtime-contract 单一权威。**待单宿主实跑证伪。**

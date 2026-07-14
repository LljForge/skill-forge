# recon-driven-dev 整改 · 进度表（跨会话续接入口）

> **新会话从这里开始。** 一眼看清:整改走到哪批、下一步做什么、哪批已有 plan、哪批还等实跑。
> 本目录:[`design.md`](design.md)(已获批设计 · 权威)· 逐批 plan([`plan.md`](plan.md)=批次 A、[`plan-B.md`](plan-B.md)=批次 B,后续批就地续写)· 本文件(进度)· [`batch-map.md`](batch-map.md)(批次×spec§×文件×回归验证×验收对照)· [`batch-A-validation.md`](batch-A-validation.md)(批次 A 实跑观测规格)。

## 这是什么

对 `skills/recon-driven-dev` 的运行契约整改,分 **6 批**(0/A/B/C/D/E)推进。核心排序原则(design §13):**单宿主(Claude)就能证伪的真 bug 先落地、每批各配一次真实实跑,再动下一批;跨宿主契约(批次 D)先只落降级骨架、待真实 Codex trace 才补实。** 每批独立提交,某批失败只回退该批(design §16)。

## 批次状态板

| 批次 | 内容 | 证伪宿主 | plan 就绪? | 代码落地? | 实跑证伪? | 状态 |
|---|---|---|---|---|---|---|
| **0** | 前置修订 + 工作台(调 spec + 写 plan + 建进度/对照表) | 单宿主(纯文档) | — | — | — | ✅ 完成 |
| **A** | 工作区地基(preflight + 隔离前移 + run-state + 去硬编码) | 单宿主可验 | ✅ 见 plan.md | ✅ A1–A6 已提交 | 🟢 4/5 硬过·#4 待补样本 | 🟢 实质通过·带尾账 |
| **B** | 阶段状态机(①封存序 + ②③闭合 + ③回流 + ④审批 + 两轮上限 + 口号改写)+ IP-R03 状态模型 | 单宿主可验 | ✅ 见 plan-B.md | ✅ B1–B7 + 收尾补强(v0.6.1) | 🟢 4/5 硬过·②未触发记尾账 | 🟢 实质通过·带尾账 |
| **C** | 实现与验证契约(task-agent/reviewer + 三 verification-mode + 终态快照/复评 + BASE=START_SHA) | TDD/manual 单宿主;子agent 建议 Codex | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始 |
| **D** | 跨宿主契约补实(Codex 能力映射 + 文件系统降级 + 工具名→能力名全量) | **需 Codex 实跑** | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始(前置骨架在 A 已落) |
| **E** | 维护资产收口(README/模板/描述 + BACKLOG/EVAL/CHANGELOG + §4.3 薄账兑现 + 7 rubric) | 单宿主可验 | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始 |

> 图例:✅ 完成 · 🟡 进行中 · ⬜ 未做。「代码落地」= 该批所有 Task commit;「实跑证伪」= 按 batch-map.md 该批 ⚠️ 条真跑一遍无退化。

## 下一步（续接指令）

**当前:** 批次 B 实跑证伪**实质通过**——fresh runner 跑了一个「③有条件通过」真实任务(preserve-login-source-account,trace: [`docs/recon-driven-dev-eval/2026-07-14-batchB-preserve-login-source-account/`](../../recon-driven-dev-eval/2026-07-14-batchB-preserve-login-source-account/))。5 条中 ①回流收敛 / ③口号矛盾消 / ④审批顺序 / ⑤compaction恢复 **硬过**;②老直线路径**未触发**(主任务专走回流 + ④批准即停、无「③直通」简单样本,runner 拒绝冒充)——**证据不足非回归、不回退**(与批次 A 判定口径对称)。复盘暴露批次 B **自身**两处收尾缺陷,已就地补强并提交(CHANGELOG v0.6.1,commit 5aa78ca):IP-02(受控回路评审证据逐轮留存)、IP-01(必覆盖清单计数)。

**尾账(不阻塞往下):**
1. **②「③直通简单样本」未触发**:补一个「③首轮直接通过」的简单样本坐实「老直线路径未坏」——可与批次 A 遗留的 #4「干净工作区+简单任务」样本**合并成一次轻量跑**(host 无关,Claude Code 自跑即可)。
2. **IP-R01 / IP-R02**(批次 A 复盘挖出、非本批回归)仍挂 BACKLOG#5 / #2 打磨轨,不阻塞。

**下一动作:** 就地**写批次 C 的 plan**(实现与验证契约:task-agent/reviewer + 三 verification-mode + 终态快照/复评 + BASE=START_SHA),用 `/writing-plans` 参照批次 A/B 的 Task 结构。批次 C 证伪宿主 = TDD/manual 单宿主可验;子 agent 建议 Codex。

**再往后:** 批次 C 代码落地 → 单宿主实跑证伪 → 同法推进 D → E。**不要提前把 D/E 全部 plan 写死**——每批等前一批实跑反馈(design §13)。**②/#4 合并样本仍挂尾账、可顺带补。**

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
- 2026-07-13:批次 A 实跑证伪(Codex,跨 4 独立 git 仓真实任务,trace `docs/recon-driven-dev-eval/2026-07-13-batchA-customer-ownership-info/`)。判定:**5 条 1/2/3/5 硬过,#4 证据不足(样本非"干净+简单")非回归 → 不回退**。分流:
  - 🔶 **IP-D01**(D-gap):runtime-contract 只有 Claude 映射,Codex 自映射走通 → 批次 D 输入(预期)。
  - **IP-R01**(高,多独立 git 仓拓扑):preflight 路径事实只容单 WORK_ROOT/一分支 → **BACKLOG#5 又一不同任务样本**,交打磨会话累积/评估出列。
  - **IP-R02**(高,⑤ false-premise 续做后 design/tasks/review 失同步)→ **BACKLOG#2 第三面第二样本**,交打磨会话按其既定红线(落 implementation.md、非 SKILL 事实订正)评估出列。**不并入批次 B**(2026-07-13 定:批次 B 只做 design §8 状态机、不跨整改/打磨两轨)。
  - **IP-R03**(中,run-state 模板指向的状态机在 runtime-contract 为空)→ **批次 B 范围**(把 design §7 状态模型落进 runtime-contract、兑现已埋指针);批次 A 不订正(改则 churn,根因是"批次 B 未建"非"批次 A 写错")。
  - **尾账 #4**:补一个"干净+简单"小样本坐实 preflight 不啰嗦(host 无关)。
- 2026-07-13:批次 B plan 就绪(`plan-B.md`,7 任务 B1–B7)。范围 = design §8 状态机 + IP-R03 状态模型;IP-R02 明确不并入(留打磨轨)。B2 顺带闭合 BACKLOG#7(§8.2 核销表+残留定义)。**待实施 + 单宿主实跑证伪。**
- 2026-07-13:批次 B 代码落地(B1–B7 逐任务提交,CHANGELOG v0.6.0)。①封存序改用户批准后封存 / ②③闭合 + 核销表 / ③受控回路≤2轮 / ④六步执行方式前移 / 口号改写「线性主干+受控回路」/ IP-R03 状态模型落 runtime-contract。BACKLOG#7 出列。执行中补了 3 处 plan 漏列的一致性(④流程图、事实订正标题、README 口号)。**待 fresh runner 单宿主实跑证伪(不由改 skill 的人自验)。**
- 2026-07-14:批次 B 单宿主实跑证伪(fresh runner,任务 preserve-login-source-account,trace `docs/recon-driven-dev-eval/2026-07-14-batchB-preserve-login-source-account/`)。判定:**5 条 ①③④⑤ 硬过、②(老直线路径)未触发·证据不足非回归 → 不回退**(与批次 A 口径对称)。复盘暴露批次 B **自身**两处收尾缺陷,就地补强(CHANGELOG v0.6.1,commit 5aa78ca):
  - **IP-02**(中,受控回路可审计性):③受控回路只记轮次、未规定评审证据逐轮留存 → `requirements-design.md`「③结论回流处置」补「每轮评审证据逐轮留存」(评审 sub-agent 无状态只写 review.md、主会话逐轮归档 review-r<N>.md);review-agent.md 元注释加指针、run-state 模板轮次字段补对齐。
  - **IP-01**(低,文字):必覆盖清单「四要素」→「五条」(B2 加⑤核销表后计数漏改)。
  - **尾账**:②「③直通简单样本」未触发,记尾账、可与 #4「干净+简单」合并一次轻量跑补验。

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
| **B** | 阶段状态机(①封存序 + ②③闭合 + ③回流 + ④审批 + 两轮上限 + 口号改写)+ IP-R03 状态模型 | 单宿主可验 | ✅ 见 plan-B.md | ⬜ | ⬜ | 🟡 plan 就绪·待实施 |
| **C** | 实现与验证契约(task-agent/reviewer + 三 verification-mode + 终态快照/复评 + BASE=START_SHA) | TDD/manual 单宿主;子agent 建议 Codex | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始 |
| **D** | 跨宿主契约补实(Codex 能力映射 + 文件系统降级 + 工具名→能力名全量) | **需 Codex 实跑** | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始(前置骨架在 A 已落) |
| **E** | 维护资产收口(README/模板/描述 + BACKLOG/EVAL/CHANGELOG + §4.3 薄账兑现 + 7 rubric) | 单宿主可验 | ⬜ 待写 | ⬜ | ⬜ | ⬜ 未开始 |

> 图例:✅ 完成 · 🟡 进行中 · ⬜ 未做。「代码落地」= 该批所有 Task commit;「实跑证伪」= 按 batch-map.md 该批 ⚠️ 条真跑一遍无退化。

## 下一步（续接指令）

**当前:** 批次 A 实跑证伪**实质通过**——Codex 跑了一次跨 4 独立 git 仓的真实任务(trace: [`docs/recon-driven-dev-eval/2026-07-13-batchA-customer-ownership-info/`](../../recon-driven-dev-eval/2026-07-13-batchA-customer-ownership-info/))。5 条中 1/2/3/5 **硬过**;第 4 条(preflight 不啰嗦)**因样本非"干净+简单"判证据不足、非回归**(回执有正面附带证据:3 仓 dirty 复杂场景下 preflight 仍未乱问)。**机制无退化 → 不回退。**

**尾账(两笔,不阻塞往下):**
1. **#4 待补样本**:补一个"干净工作区 + 简单任务"的小样本坐实 preflight 不啰嗦(host 无关,Claude Code 自跑即可)。
2. **复盘挖出 3 个新缺陷**(非批次 A 回归、非 D-gap,见下"变更记录")——按归属分流,不阻塞批次 A 判定。

**下一动作:** 就地**写批次 B 的 plan**(阶段状态机 = design §8)。批次 B 吸收 **IP-R03**(在 runtime-contract 建 §7 状态模型、兑现 run-state 模板已埋的指针)作为额外 scope;**IP-R02 不并入**(留打磨轨 BACKLOG#2)。**#4 小样本可与批次 B 并行补。**

**再往后:** 同法推进 C → D → E。**不要提前把 C/D/E 全部 plan 写死**——每批等前一批实跑反馈(design §13)。

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

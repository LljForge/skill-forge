# 实测监督笔记 · 2026-07-15 · enterprise-used-name-qcc-switch
> 实跑 recon-driven-dev 全程的现场记录。元层维护资产，归档即弃。

## 走过的路径单元

- ①a、①c、②a、②b、②c、②d、②e、DP1、③a、③d、④a、④b、④c、⑤a、⑤b、⑤c、⑤d、⑤e、⑤g、⑤j（归档路径待最终确认后补记）

## 逐 ⏸ 体验自评

- 阶段①⏸  卡：首次以 `fork_turns=none` 派发侦查 agent 后，主 agent 连续多轮未收到协作邮箱消息且未见 `directed-report.md`，遂中断并收束范围重派。事后重建确认它并未死锁：第 11/21 组读取后证据已够，仍继续扩查 10 组；自身虽发过 commentary，但主 agent 未在协作邮箱看到，且中断发生在准备 `apply_patch` 前。现场表象“卡住”校准为“模型延迟停止/物化 + 主 agent 中断时机 + 过程不可观测”的组合。[→ IP-01]
- 阶段⑤基线闸  卡：`implementation.md` 要求“进工作区后先跑现有测试；失败即暂停”，默认 Maven 因私服不可达且离线来源校验失败，指定 Maven/settings 后又因 JDK 17 与缺少 reactor 依赖编译失败；收到现场环境信息后，以指定 Maven/settings + 完整 Zulu JDK 8 + `-am` 通过（10/10），未接受红底。复盘校准为项目构建环境特例，skill 的红底暂停机制已正常触发。[→ IP-02]

## 复盘层

- 派发参数：`spawn_agent(task_name="supervision_retrospective", fork_turns="none")`，输入监督笔记、实走路径单元、全部业务产物、原始需求、MAINTAINING.md 及本次路径直接引用的运行材料；显式关闭主会话历史继承。
- 复盘结论：新增 1 条指令接缝——③ 非通过结论经用户部分采纳/部分豁免后，缺少逐项处置状态及最终放行状态的交接要求，导致旧 `review.md` 与进入④后的设计基线失配。[→ IP-03 ▲复盘补]
- 归因校准：IP-01 的主近因是侦查 agent 过度扩查、未及时按四样收束；进一步深究后改为混合归因，详见下节，不再单因归为模型失误。IP-02 的 Maven/settings/JDK/reactor 参数属项目环境特例，clean-baseline 红底暂停机制本身已正常触发。

## 阶段① agent 卡住深究

- **事实重建**：首次 agent 无工具挂起、网络等待、子任务等待或阻断异常；实际有两次大输出截断（约 10k/12k tokens）和两组错误路径探测，均通过窄检索/`rg` 恢复，只增加读取次数。它共完成 21 组主要动作，第 11 组结束时已覆盖前端按钮、Controller、百融/QCC 链、主表/曾用名写回、事务/审计、EDP 日志、调用消费面及测试锚点，足以写四样；第 12–21 组继续补查配置、当前用户设施、DDL/迁移、测试设施、批量结果 VO、Axios、详情生命周期、线程池和百融其余接口调用统计。
- **为何看起来无响应**：agent 自身发过 3 条 commentary，但没有通过协作邮箱向主 agent 发送阶段状态；当前宿主下主 agent 无法据此区分“正常深入”和“已经失去收束”。`recon-agent.md:20-21` 只规定最终写报告和回一段摘要，本来也没有中间回报契约。
- **模型贡献（高）**：它把写报告错误地安排成“所有检索完成后的单次动作”，没有在样①载体均有锚点与消费实答后执行现有出口自检，也没有把 `[未核验]`/“够不着 + 原因”当作停止阀。
- **skill 指令贡献（中，诱发而非充分原因）**：`SKILL.md:17,60`、`directed-analysis.md:7` 与 `recon-agent.md:7,16,29,35` 反复强调“全集 / 答全才够 / 宁可多摸 / 清单外照问 / 地板非天花板”；载体集合由 agent 动态发现，每个新载体又要求追消费方，形成“新发现→新载体→新消费面→新发现”的递归前沿。另一方面，`recon-agent.md:39-46` 已有四样出口自检和未核验机制，且重派能完成，所以现有证据不足以直接判 skill 缺陷。
- **主 agent 贡献（中，放大时长）**：没有预先约定可观测的阶段边界或停止信号，只以“连续等待仍无产物”判断失速；中断点恰在原 agent 准备写入前，直接造成首次工作没有落盘。中断不解释为何过度扩查，但解释为何最终完全无报告并需要重派。
- **宿主贡献（低因果、中可观测性影响）**：派发、中断、重派均正常，无消息丢失证据；问题在于子 agent commentary 不等同于发给父 agent 的协作消息，放大了黑箱感，但不导致其继续扩查。
- **最强反事实**：只改变首次模型的停止决策——第 11 组后立刻执行现有出口自检并写报告——最可能避免事故；只增加消息可见性或更早超时只能更早发现/中断，不能保证报告产生。
- **待验证实验**：固定同一仓库快照做双臂冷启动；A 组复用原派发材料，B 组只追加“四样已齐且核心链均有锚点实答后立即写报告，其余列未覆盖线索”。预先比较首次落盘时间、核心证据闭合后的旁支检索次数、报告是否一次过现有质量门。首次逐字 prompt 未留档，正式实验前需先固定可复现 prompt；未做 A/B 前，IP-01 只标“模型失误为主、疑似 skill 诱发条件”，不提前改 skill。

## 引擎无关化验收(Codex)

### A. 派发隔离

- ①侦查首次派发：`spawn_agent(task_name="directed_recon", fork_turns="none")`；派发材料只含任务绝对路径、仓库绝对路径、skill 内 `recon-agent.md` 绝对路径、产物绝对路径和侦查范围，显式关闭历史继承。该 agent 在报告产生前无响应并被中断，未取得口令反证，故本次只能判“隔离参数成立、运行结果无从判定”。
- ①侦查重派：`spawn_agent(task_name="directed_recon_retry", fork_turns="none")`；仍显式关闭历史继承。主会话私有口令 `PROBE=engine-agnostic-4711` 未写入派发材料；子 agent 回报看不到主会话历史和任何未派发口令，判“隔离成立”。
- ③设计评审：`spawn_agent(task_name="design_review", fork_turns="none")`；派发材料只含 requirements/design、评审 prompt、模板及输出绝对路径，显式关闭历史继承。未派发上述口令；子 agent 回报未看到派发材料之外的主会话历史，判“隔离成立”。
- ⑤整支评审：`spawn_agent(task_name="whole_branch_review", fork_turns="none")`；派发材料只含三仓 diff、requirements/design、评审 prompt、模板及输出绝对路径，显式关闭历史继承。未派发上述口令；子 agent 回报看不到主会话历史、隐藏 probe 或口令，判“隔离成立”。

### B. 模板路径解析

- ③ `review.md`：主 agent 派发时追加模板绝对路径 `/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev/references/templates/review.md`；评审 agent 成功读取并按其写入 `review.md`，明确未使用或撞到 `~/.claude` / `incubating/`。判“路径修复成立”。
- ⑤ `code-review.md`：主 agent 派发时追加模板绝对路径 `/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev/references/templates/code-review.md`；评审 agent 成功读取并按其写入、复评覆盖 `code-review.md`，明确未使用或撞到 `~/.claude` / `incubating/`。判“路径修复成立”。
- 本次全流程未发现残留的 `~/.claude` 或 `incubating/` 陈旧路径。

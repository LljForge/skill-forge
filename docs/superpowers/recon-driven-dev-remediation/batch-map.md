# recon-driven-dev 整改 · 批次对照表

> 每批一张卡:**实现哪些 spec§ · 触碰哪些文件 · 回归实跑盯什么(⚠️) · 验收判据(✅)**。
> 落地某批时对着它验;⚠️ 是"老功能有没有被搞坏"(回归),✅ 是"新东西对不对"(验收)。进度看 [`progress.md`](progress.md),设计权威看 [`design.md`](design.md)。

---

## 批次 0 · 前置修订与工作台

- **spec§**:三条修订落 §4.2 / §4.3 / §8 / §13;工作台建四件套。
- **触碰文件**:`design.md`(spec 三修订)、`plan.md`、`progress.md`、`batch-map.md`。
- **⚠️ 回归**:纯文档,无运行回归。核对 spec 内部互链未断(§13↔§16 批次名一致、§8↔§4.2 口号一致)。
- **✅ 验收**:四件套齐、progress 可作唯一续接入口、plan 每批带回归闸。

---

## 批次 A · 工作区地基（⚠️ 重点批 · 含三大主干回归点）

- **spec§**:§5(运行前置契约)、§6(工作区与产物生命周期)、§7(run-state)、§12.3(去硬编码)。
- **触碰文件**:新建 `references/runtime-contract.md`、`references/templates/run-state.md`;改 `SKILL.md`、`references/implementation.md`、`README.md`、`references/review-agent.md`、`references/code-reviewer.md`、`references/templates/{review,code-review}.md`、`CHANGELOG.md`。
- **⚠️ 回归实跑**(Claude Code 跑简单单仓任务,含 dirty 与干净两态):
  1. **产物没散落**——五阶段产物都落同一 ARTIFACT_ROOT、彼此可寻(隔离前移没把①-④与⑤分裂成两处);
  2. **起点记准**——preflight 的 START_SHA == 开工前 `git rev-parse HEAD`;
  3. **dirty 正面验证**——开工前故意留未提交改动,确认既没被悄悄丢、也没被误提交;
  4. **啰嗦度**——干净工作区跑简单任务,preflight 不问一堆没必要的问题;
  5. **Claude 行为不变**——去硬编码/相对路径后照跑无碍、没因抽象找不到工具。
- **✅ 验收**(design §13 完成判据 + §15 相关条):`grep ~/.claude` 归零;dirty worktree 有归属判断、不自动 stash/reset/夹带;①-⑤只用一个 WORK_ROOT/ARTIFACT_ROOT;preflight 记 WORK_ROOT/ARTIFACT_ROOT/START_SHA/初始状态。

---

## 批次 B · 阶段状态机（⚠️ 中等 · 盯回流与封存）

- **spec§**:§8(五阶段状态机)、§4.2(SKILL.md 口号改写)。
- **触碰文件**:`SKILL.md`(线性口号→受控回路、状态亮牌)、`references/directed-analysis.md`(①封存序)、`references/requirements-design.md`(②批准③决策 + 核销表)、`references/review-agent.md`(③三档 + 回流 + 两轮上限)、`references/planning.md`(④审批前移)、`CHANGELOG.md`。
- **⚠️ 回归实跑**(用一个会触发「③有条件通过」的任务在 Claude Code 跑):
  1. **老直线路径没坏**——③直接"通过"时仍一路 ③→④→⑤,没因回流逻辑卡住/反复确认;
  2. **新回流能收敛**——③"有条件通过"→回②改→重批→复评走完,**最多两轮就停下交用户**;
  3. **封存时机对**——用户批准后才封存 directed-report,封存后改设计走前向记录;
  4. **中断能恢复**——compaction 后靠 run-state 认出当前阶段、不错乱重跑。
- **✅ 验收**:每个状态/用户选择只有一个合法下一状态;不再同时出现"不得回流"与"必须回写②"的矛盾;①用户批准后才封存;③三档均有唯一转移、回流≤2 轮;**保留「③不替①重做钻取」禁令**(把关不堆下游底线)。

---

## 批次 C · 实现与验证契约（⚠️ 重点批 · 含 BASE/终态回归点）

- **spec§**:§9(验证契约)、§10(每任务实现与评审)、§11(整支评审与终态证据)、§8.4/8.5(④⑤顺序)。
- **触碰文件**:新建 `references/task-agent.md`、`references/task-reviewer.md`;改 `references/implementation.md`(verification-mode、终态快照、复评上限、④⑤顺序)、`references/code-reviewer.md`(输入完整性、严重度、验证证据、修复回归扫描)、`references/templates/code-review.md`、`CHANGELOG.md`。
- **⚠️ 回归实跑**(多任务、子 agent 执行、无测试 runner 逼出 manual;建议 Codex 跑、与批次 D 合并):
  1. **老 TDD 路径没坏**——有测试的任务仍走"先写失败测试→转绿",没被新增两模式搞乱;
  2. **BASE 正面回归**——整支评审起点用批次 A 的 START_SHA(不再猜 merge-base);范围盖住**未提交 + 未跟踪**文件,**故意留个 untracked 新文件**验证没漏;
  3. **三模式各自闭合**——尤其 manual 模式事先说清步骤+预期+证据、不含糊放行;
  4. **per-task 评审真在跑**——每任务过"符合设计+代码质量"两道,新 agent 有实际产出;
  5. **复评不走过场**——改完一个发现后既核旧、也扫改动带出的新问题。
- **✅ 验收**:automated/executable-check/manual 三路径均可闭合;内联与子 agent 均有逐任务评审;整支评审 BASE 固定为 START_SHA 或显式覆盖;终态证据覆盖 committed/staged/unstaged/untracked;复评既核旧发现也检查新问题。

---

## 批次 D · 跨宿主契约补实（⚠️ 需真实 Codex 实跑）

- **spec§**:§5.1(能力握手降级)、§5.2(权限边界)、§12.1(触发描述收窄)、§4.2(recon-agent 工具能力化)。
- **触碰文件**:`references/runtime-contract.md`(补 Codex 映射 + 文件系统降级 + 权限边界,批次 A 的 TODO)、`references/recon-agent.md`(工具名→能力名)、各 agent 本体工具面能力化、`SKILL.md` frontmatter(收窄"任何环境")、`CHANGELOG.md`。
- **⚠️ 回归实跑**(真实 Codex 跑一个多任务 + 子 agent 任务):
  1. **Claude 侧没退化**——能力名抽象补实后,Claude Code 跑起来跟批次 A/B/C 后一致;
  2. **Codex 能映射最小能力**——spawn-fresh-agent / read-search / write-owned-file / run-command 都能落到 Codex 对应能力;
  3. **降级真触发**——文件系统不共享或不能派 fresh agent 时,走结构化产物交接/主会话降级,并在产物标"非独立评审";
  4. **frontmatter 诚实**——不再无条件宣称"丢到任何环境"。
- **✅ 验收**:Claude/Codex 均能从同一 Skill 映射最小能力;fresh reviewer 有宿主级隔离要求 + 诚实降级;通用判据不把 Task/Read/Grep/Glob/Write 当能力检测条件;**至少一次真实 Codex trace 跑通**(否则只能称静态改完,design §17)。

---

## 批次 E · 维护资产收口

- **spec§**:§4.3(薄账兑现)、§12.3(文档清理)、§15(总体验收)、§16(发布回退)。
- **触碰文件**:`README.md`、`MAINTAINING.md`(消费者映射 + 改后验证要求)、`EVAL-COVERAGE.md`(新增 preflight/状态恢复/三验证模式/终态快照路径单元)、`BACKLOG.md`(关闭已吸收主体)、`CHANGELOG.md`、各模板终校。
- **⚠️ 回归**:纸面对账为主,无运行回归。核对无不可达引用、无过期运行说明。
- **✅ 验收**:每条判据只有一个权威家;**§4.3 薄账真兑现**——实测内联/子 agent 两条路径常载 reference 字节量、对照 MAINTAINING 软上限,B·单路径承载条通过;**MAINTAINING 全 7 条改后验证 rubric 通过**;README/模板/EVAL/BACKLOG 与当前运行语义一致;已吸收的 BACKLOG 主体有关闭/迁移记录。

---

## 全局红线（每批都适用 · design §16）

- 🔁 单宿主可验批(A/B/C/E)落地后**立即配一次真实实跑证伪,再动下一批**;跨宿主批(D)真实 Codex trace 前只提交降级骨架、标 TODO。
- 🔁 某批实跑发现退化 → **只回退该批**,不撤销已验证通过的前批。
- ⛔ 全程不用 `reset --hard` / `checkout --` / 自动清理去动用户工作区;破坏性删除需打字确认。
- 🔁 每批 CHANGELOG 分别记 what / why / 验证证据 / 诚实定性。

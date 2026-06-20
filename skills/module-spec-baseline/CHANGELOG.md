# CHANGELOG — module-spec-baseline

> 正文（SKILL.md / agents / references）只写当下规则；版本演进、为什么这么改记在这。

## v1.2.0 — 出站横切契约扫描 + 行为优先表达（优化批 B1）

基线实测:5 模块系统性漏掉「出站/横切」契约(事务回滚/审计留痕/配置开关·凭据/出站签名/MQ发布·异步),业务面齐、横切面薄。本批补这一层:

- `structural-agent.md` 加 §2.5「横切契约扫描」:对照维度登记表按栈线索 grep + **深读到真身**,记入 scratchpad「横切契约」段;反幻觉红线钉「看到注解就臆测」(事务套异步不生效、过滤器空壳),不能确认标 `[待验证]`。
- `spec-synthesis-agent.md` 把横切契约按行为优先写成 Scenario(如「部分失败时整体回滚」「返回成功≠下游就绪」);**防假 YES**:`[待验证]`/空壳的不得写成肯定 SHALL。
- 验收口径(实测改定):二值网格(`binary-grid-ruler.workflow.js`,3 遍多数票,已校验 96% 稳)量「写没写」+ 翻绿格 grounding 抽查量「对不对」,两道一起防"写了但不成立"。

## v1.1.0 — 维度登记表 + 决策落盘（优化批 B0·地基）

以 GitNexus 为对照的 spec-baseline 复盘（见 `skill-forge/docs/module-spec-baseline-optimization/`）发现两个结构性问题：① 发现机制只有「HTTP 端点 + 回调/状态」两扇门，非 HTTP 入口与横切契约整类漏；② 范围/能力划分决策不落盘、不可复现。本批是后续优化的地基，**刻意不改分析 agent 行为**（数字不动，重跑仅作回归确认）：

- 新增 `references/behavior-dimensions.md`：行为维度的单一登记处，**独立于栈策略包**（栈包管「怎么找」、本表管「找什么」）。只登记模型系统性易漏的维度（非 HTTP 入口、横切契约、错误/格式契约），不堆全——契合「只补模型导不出的」。后续批次逐步把它接入各分析 agent。
- SKILL.md 新增 `{{DECISIONS_DIR}}`：Step 3 的 `MODULE_SCOPE` 与 A-4 的 `CAPABILITY_PLAN` 写入留存决策文件（不随 scratchpad 清理），重跑同模块先读复用 → 划分可复现，解决「换人/换会话重跑划分漂移」。

## v1.0.0

首版。从 `module-depth-analysis` 拆分而来（设计：`docs/superpowers/specs/2026-06-15-mda-split-module-brief-and-spec-baseline-design.md`）。

**定位**：把老模块逆向成 openspec specs 基线，直写 `openspec/specs/<capability>/spec.md`，过 `openspec validate --strict`，为老项目引入 openspec、后续走标准 change 流程打底。

**继承 MDA 机器的按需子集**：
- 保留：boundary / structural / domain 三个分析 agent、栈策略库（web/orm/rpc）、技术栈检测器、agent-preamble。
- 砍掉：frontend-agent（specs 描述系统可观察行为，不建模 UI）、business 综合、§8 陷阱护栏综合、PO 字段全量穷举。
- 重定位：verification-agent 从「收集 bug 写 pending-findings」改为「grounding 校验（每条需求/场景落到真实代码）+ 跨层契约一致性」。
- 新增：A-4 能力划分确认、spec-synthesis-agent（产 openspec specs，替代 design/business 综合）、references/openspec-spec-format.md（输出契约）。

**关键设计取舍**：
- 基线**直写主规范 `specs/`**，不走 bootstrap change 仪式——基线是"记录现状"而非"提案变更"，没有可记录的决策/任务，走 change 会出现空的 proposal/tasks。
- 产物单元是 **capability（行为域）**、不是 module——一个模块按行为域拆多个 capability，kebab-case 按行为命名、全局平铺。
- **行为优先边界**（openspec 官方 Behavior-First Specification Boundary）：specs 只写外部可观察行为契约，类名/方法名/SQL/内部结构不进 spec、留 scratchpad 作 grounding 取证。这是与 MDA design（白盒）的根本区别。
- openspec validator 死规定来自对 openspec CLI v1.3.1 的实测（非仅文档）：每需求含 SHALL/MUST（ERROR）、每需求 ≥1 场景（ERROR）、场景正好 4 个井号（少了静默失败）、Purpose ≥50 字符（strict 下 WARNING 即失败）。
- scratchpad 落 `openspec/.spec-baseline-scratchpad/`（**在 `specs/` 之外**）——否则 `openspec validate` 会把它当 capability 目录误报。

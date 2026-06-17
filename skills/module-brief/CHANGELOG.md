# CHANGELOG — module-brief

> 正文（SKILL.md / agents / references）只写当下规则；版本演进、为什么这么改记在这。

## v1.0.1

dogfood（mdm-employee）反馈：survey-agent 把一条偏通用的陷阱（`@MapperScan` 注册新 DAO）保留并自加一句"这条偏通用规范"，而非按模块替换测试删掉。根因是 design-format 的入选测试只说"通用→删"、没堵死"保留+标注"这条折中路径。已收紧 design-format §5 入选测试：**边界性通用项一律直接删、不许保留再标注**，并把 `@MapperScan` 列为通用项示例。

## v1.0.0

首版。从 `module-depth-analysis` 拆分而来（设计：`docs/superpowers/specs/2026-06-15-mda-split-module-brief-and-spec-baseline-design.md`）。

**定位**：给人快速建模块认知，产出 requirements.md（业务视角）+ design.md（技术白盒，末尾精简「陷阱与护栏」小节）。一次性、可随时重生成、刻意不那么细。

**为什么是全新轻量 skill、不继承 MDA 机器**：
- 给人快速建认知本就不需要深度机器——读 Controller/Service 自己就能总结（设计哲学："别教模型已知"）。深度策略库/检测器/多 agent 编排是 module-spec-baseline 把行为精确落成 scenario 时才需要的。
- 自包含、不跨目录引用 MDA：管线只 1 个 survey agent（读模块 + 写两份文档），不并行、不验证、不接缝 join、无 scratchpad。

**从 MDA 借思路、不搬重机制**：
- 定位（归一化/存在性/过窄过宽预判/范围确认）内联进 SKILL，不写 module_aliases、不缓存 stack-profile、不起 boundary agent。
- 栈识别内联为 survey 一段提示（认特征即可），不引策略库。
- 反幻觉/扫描卫生/失败前缀内联进 survey，砍掉 MDA preamble 的多 agent 一致性、跨模块深浅自判。
- 状态建模只"点名全部 + 挑核心画一个"，砍全字段穷举/消费覆盖求差集/反模式全量清单。
- 陷阱小节保留"模块替换测试 + 协同护栏三段式 + ❌通用/✅特有对照"，砍符号锚点机械可验、完备性对账门、≤14 条软目标——降为"只留 top 几条"。

**刻意砍掉的细节**（相对 MDA）：PO 字段全量穷举、全部状态机、跨层/跨模块接缝校验、verification 兜底。要这些深度与可验证规范基线，用 module-spec-baseline。

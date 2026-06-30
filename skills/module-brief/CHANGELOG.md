# CHANGELOG — module-brief

> 正文（SKILL.md / references）只写当下规则；版本演进、为什么这么改记在这。

## v1.0.6 — 立「简报（brief）」主导词，收敛满地的"轻量"重复与沉积

纯表述重构，不动 4 步流程 / 核对门 / references 骨架，**行为不变**——目的是让"简报粒度"这个执行行为靠一个主导词更可靠地复现。

- **立主导词对 `brief ≠ spec`**：全文散落 7+ 处的"轻量 / 刻意不做 / 点到为止 / 不穷举 / 一次性 / 绰绰有余"，都是在反复表达同一个品质，而 skill 名字 `module-brief` 自带的"简报"一词从未被启用。本版把这些统一收敛为"**简报**"一词的复现，并显式与姊妹 skill 的产物 `spec`（规范基线）对立——一对现成的主导词。
- **消重（duplication）**：SKILL.md 原「**刻意不做**」整段删除，内容各归其位——design 写作取舍清单交 `references/design-format.md`（该处标为**单一真相源**、SKILL.md 仅引用）；"不对账 / grep 自核"归 Step 3 与单上下文 blockquote；"去 spec-baseline / code-review"路由并入「brief ≠ spec」段（原与「分工」段三处重复，合一）。
- **去沉积（sediment）**：「不派子 agent」由散落 5 处收敛为单上下文 blockquote 一处硬声明。同时补记一笔关键变化——v1.0.3 当年靠 skill-eval manifest 在**工具层**去掉了 Task；但 v1.0.5 移除 skill-eval 后，**真实环境的 Agent 工具已可用**，该约束须靠正文留住（故 blockquote 显式写"真实环境有 Agent 工具，但这里刻意不用"），但说一次即够，不必 5 处复述。
- **description 瘦身**：砍掉两份文档的字段级 identity（"分层结构、关键类、核心调用链、数据模型概览"——body 表格已有）、三条同义触发短语合一，front-load「模块简报」。

**为什么**：这些"轻量"申明是同一品质的反复表述（writing-great-skills 框架下的 duplication + sediment），不是新信息；靠主导词 `brief` 一词即可锚定，省 token 又给模型一个更锐的行为挂钩。`brief`（给人速读的简报）与 `spec`（机器可验的规范）本就隐含在两个姊妹 skill 的名字里，显式成对后认知更清晰，且不违反"两者运行时独立、无读写依赖"。

### 附：端到端 A/B 实测（master-data/employee）与顺手补的两处既有缺口

本版改完做了一次新旧版 A/B 端到端回归实测——同一真实模块（GMZB master-data 的 employee 子域，扁平分层 + 共用网关 ApiController + ccm/budget 同名 VO 边界）、同范围、同指令，旧版（HEAD）与新版各跑一遍完整 4 步，再四官评审。

**回归结论：零行为回归。** 两版基础行为全一致（单上下文无 fan-out、核对门真跑、design 五节齐全、范围划界都正确排除 ccm/budget 同名 VO、简报粒度都守住）。反幻觉官独立 grep 复核新版 design.md 的 120 个标识 + 7 条高风险陷阱，逐条落到 `文件:行号`，零漏网幻觉。回归官报的产物差异（如 keyFieldEquals 是否写成独立陷阱条）经 grep 证实两版 design 都提了该标识，属 LLM run 间内容抖动、非重构删步（陷阱 / 待确认相关指令本版零改动）。

**顺手补的两处缺口（实测暴露，均 skill 既有、非本版重构引入）：**

1. **requirements 禁码自检漏裸字面量**：A/B 双版 requirements.md 都把 `ALL`（枚举值）、`1900-01-01`（魔法日期）这类代码裸字面量泄漏进业务文档——原自检清单只点了类名 / 方法 / SQL / HTTP，没堵枚举值 / 配置码 / 魔法值。已在 requirements-format 抽象层次约束表 + 自检补这一类，并给业务改法示例。
2. **核对门假阴性红旗**：新版执行时首轮 `rg` 因「多路径位置参数 + `--`」写法全 MISS（0% 命中假象），靠人工识破才绕过——核对门对命令写法脆弱、假阴性会误导（判文档全错或反向放过）。已在 Step 3 加一条红旗：命中率异常低先怀疑命令写法、换写法重核，而非据此判错（只给「先疑工具」的自检动作，不规定 `rg` 语法）。

## v1.0.5 — 去 headless 模式（解除 skill-eval 耦合）

Step 1 删除 `$EVAL_HEADLESS`/`$EVAL_PRESET`/`$EVAL_OUT` 的 headless 分支，回归纯交互定位；变量表 `{{OUTPUT_DIR}}` 去掉 headless 落点，仅保留 `{{PROJECT_ROOT}}/docs/module-brief/{{MODULE_NAME}}/`。references 两处把已删的 `survey-agent`（v1.0.3 移除）幽灵引用改为「主上下文（Step 2）」。

**为什么**：headless 模式只为 skill-eval 批跑而存在，本身无真实用户场景；skill-eval 已整体移除，该模式即死代码。它还是历次 headless derail 的温床——其中「corpus 环境暴露 → 范围困惑 → 误弹 AskUserQuestion」缺陷（master-data/ccm-paybill 与 GMZB-NJZL/edoc-template 跨项目各复现一次）随本模式删除而**从根上消失，无需再补指令栅栏**（与本 skill「修架构、不堆『教已知』指令」的一贯哲学一致）。删除后 module-brief 回归单一交互职责，更干净。

## v1.0.4 — 新增写后核对门

流程由 3 步扩为 4 步：在"写两份文档"之后、"报告"之前插入 Step 3「核对门」——对 `design.md` 的代码标识逐个跑 `rg -i`（内容）+ `find -iname`（文件名）反查，命中保留、查无就地标 `[待确认]`；报告步追加命中率作为可信度指标。

**为什么**：模型自觉标 `[待确认]` 防不住自信编造的类名/方法名/表名/列名（自己监考自己），用一道廉价 grep 反查兜底。`rg -i` 与 `find -iname` 两条细节缺一会误报：SQL 表名/列名常与代码大小写不一致；`XxxMapper` 这类标识往往只作 `XxxMapper.xml` 文件名存在、内容里查不到。

**刻意只做"核对门"、不做事实抽取前置**：曾探索过"写文档前先 grep 抽事实清单 / 栈包（stack pack）"的更重方案，经实测数据否决、已搁置——本版只加"写完之后的自核"，不引入任何写前事实抽取。核对门符合 skill 既有轻量性格：几条 rg + 一次 find 的自核，仍单上下文、不派子 agent、不做完整性对账门。配套改：SKILL.md 概述由"3 步"改"4 步"、改写原"不起验证…"一句以消解与核对门的字面矛盾（仍不起独立验证 agent / 不做接缝 join / 不做对账门，但写完做廉价 grep 自核）；design-format 自检加"核对门已过"一条。

## v1.0.3 — 去子 agent 化（彻底单上下文）

取消「主上下文派 survey-agent」架构，改为主上下文一气干完「定位 + 读 + 写」。`agents/survey-agent.md` 内容并入 SKILL.md Step 2 并删除。

**为什么**：实测单模块工作量（读十几个文件 + 写两份文档）单上下文绰绰有余，派子 agent 的「上下文隔离 / 并行」价值对本 skill 不成立（主上下文定位后再无其他职责）。而「派 agent」恰是 headless 下两个缺陷的**共同根**：① fan-out 空间——主上下文误判模块规模、起多个 survey-agent 批量分析（run `20260618-093505` 实证：隔离历史 docs 后 derail 仍换模块复发，因模型能从单个模块名脑补出同系列）；② OUTPUT_DIR 跨上下文传递 → 落点丢失。去子 agent 后两者**从架构上消失**，且不降质（同模型同指引，主/子上下文读写无差别，反而省了范围/落点的传递损耗）。配套 harness 侧（skill-eval v0.2.3）：manifest 给 module-brief 去掉 `Task` 工具（想 fan-out 都没工具）+ Write 落点白名单。

> v1.0.2 的 headless 落点 `echo "$EVAL_OUT"` 解析保留（改为主上下文自用）。交互模式一并单上下文化（牺牲「子 agent 护用户会话上下文」的弱价值换简单）。顺带把原 survey-agent 里「本项目特例 ApiController」（GMZB 特有，违反通用 skill 项目无关原则）通用化为「如 CLAUDE.md 所述的项目约定」。

## v1.0.2

skill-eval 首次真实自举（交接包 C1）反馈：headless 批跑产物未落 `$EVAL_OUT`、被批跑误判失败。**有效修复**：SKILL.md Step 1 headless 明确用 `echo "$EVAL_OUT"` 解析**绝对路径**后再传 survey-agent（不传字面 `$EVAL_OUT`——子 agent 进程未必继承该 env），消除落点对 env 隐式继承的依赖。

> 同轮曾据「survey-agent 自行 fan-out」诊断加过「禁再派子 agent / 落点唯一」约束，经验证（run `20260618-023704`）**证伪**——company 仍起 4 个 survey-agent，根因在**主上下文**误判多模块、非 survey-agent；且那些约束 SKILL 本已隐含（属「教已知」，违反设计哲学），已回滚。真根因（headless 无人值守可靠性 / corpus 环境暴露）取证中，留待后续版本。

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

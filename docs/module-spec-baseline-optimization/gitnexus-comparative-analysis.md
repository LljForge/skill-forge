# 以 GitNexus 为标尺,反观 module-brief / module-spec-baseline / codebase-exploration

> 初步分析报告(investigation 阶段产物,**未定方案**)
> 日期:2026-06-18
> 调查对象:[abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus)(`gitnexus@1.6.7`,PolyForm 非商业许可)
> 目的:拿一个成熟稳定的"代码认知"系统当对照,找出这三个 skill 的盲区与可借鉴点
> 调查方式:浅克隆全仓 + 5 个并行 agent 分维度深读真实源码(本报告所有 `file:line` 证据均来自实读)

---

## 0. 这三个 skill 现在分别在哪

| skill | 家 | 产出 | 定位 |
|---|---|---|---|
| `module-brief` | `skill-forge/skills/module-brief` | requirements.md(业务视角) + design.md(技术白盒,末尾含「陷阱与护栏」) | 给人快速建立某模块认知;一次性、可随时重生成、刻意不那么细 |
| `module-spec-baseline` | `skill-forge/skills/module-spec-baseline` | `openspec/specs/<capability>/spec.md`(外部可观察行为契约) | 把模块现状逆向成 openspec 规范基线 |
| `codebase-exploration` | **GMZB 本地** `.claude/skills/codebase-exploration`(尚未提升到 skill-forge) | `docs/codebase-map.md`(模块划分 + 模块间依赖矩阵) | 首次接手者的探索草稿、自称非权威 |

三者共同形态:**LLM 读代码、一遍过、直接产出 Markdown**。这是后文一切判断的前提。

---

## 1. 核心结论:差距的根子在"事实底座",不在文档写法

GitNexus 的产出之所以稳,是因为它把流程切成两段:

```
代码 ──(tree-sitter + 作用域解析 + Leiden 社区检测 + 图遍历)──▶ 持久化知识图谱(事实底座)
                                                                      │
                                                          LLM 只在已验证事实上做叙述
                                                          (提示词反复钉:引用真实函数名、不准编造 API)
```

- 事实抽取与事实校验,由**图**负责,客观、可查询、可增量。
- LLM 只做"把图里的事实翻译成人话",且被提示词约束在事实范围内。

我们这三个 skill 是**单段**:同一次 LLM 调用里既抽事实又做叙述,没有独立校验层。

> **这条不对称(asymmetry)是全篇的钥匙。** GitNexus 的多数"亮点"——增量刷新、影响面分析、污点链、Leiden 模块划分、BFS 执行流提取——本质都是**图带来的能力,不是文档写法带来的**。因此"GitNexus 有而我们没有"绝不等于"我们该补上":凡是依赖图引擎的,搬过来要么做不到,要么就是把一次性文档生成器改造成一个常驻代码分析引擎,与 `module-brief`「一次性、刻意不那么细」的定位正面冲突。

调查中 5 个 agent 普遍偏热情,给了不少"也建个调用图跑 Leiden / 上 keep-marker 增量刷新"之类的建议。本报告对这些做了**显式过滤**(见 §4),只保留对"一次性 LLM 文档生成器"真正成立、且不违背既有设计哲学(极简、项目无关、只教模型导不出的知识)的部分。

---

## 2. 五个对位维度的调查发现(浓缩)

### 维度一 · 文档生成子系统(↔ module-brief)
GitNexus 的 wiki 生成(`gitnexus/src/core/wiki/`)关键设计:
- **防编造是工程化的,不靠 LLM 自律**:提示词钉死 "Reference actual function names... do NOT invent APIs"(`prompts.ts:42`);且先用图查询喂给 LLM **真实导出符号清单**(`graph-queries.ts:73-104`)当事实锚,再让它叙述。
- **章节自由 + 事实受限**:结构 "you decide the sections",但调用图/执行流作为 "reference for accuracy, but do NOT mechanically list"(`prompts.ts:43`)——给依据、不强制罗列。
- 其余(4 层 grouping→module→parent→overview 提示词结构、增量 commit 去重、HTML viewer、mermaid-sanitizer)**与 module-brief 不对位**:module-brief 输入就是单个指定模块,无需分组/父模块/总览;增量/viewer 是产品机器。

### 维度二 · 图 schema 与关系分类法(↔ codebase-exploration 依赖矩阵 / design.md 调用链)
GitNexus 跟踪 **32 种节点类型 + 30 种关系类型**(单张 `CodeRelation` 表 + `type` 属性区分,`schema-constants.ts:49-86`)。除了常规 `CALLS`/`IMPORTS`/`EXTENDS`,它显式建模了几类**结构性 import 之外的关系维度**,正是我们文档容易漏的:
- `HANDLES_ROUTE`——API 路由端点 → 处理器
- `QUERIES`——函数 → ORM 模型(数据访问)
- `METHOD_OVERRIDES` / `METHOD_IMPLEMENTS`——多态/覆写链
- `EMITS_EVENT` / `BINDS_EVENT_HANDLER`——事件系统
- `STEP_IN_PROCESS` / `ENTRY_POINT_OF`——执行流步骤与入口

**注意区分**:适合写进人看文档的是 `IMPORTS`/`CALLS`/`HANDLES_ROUTE`/`EXTENDS`/`QUERIES` 这类宏观关系;`CFG`/`REACHING_DEF`/`TAINTED`/`POST_DOMINATE` 等基本块级关系只对机器查询有意义,**写进文档是噪音**。

### 维度三 · 模块边界 / 入口点 / 执行流 / DAG 编排(↔ codebase-exploration 模块划分、design.md 调用链)
- **模块边界**:Leiden 社区检测跑在 `CALLS`/`EXTENDS`/`IMPLEMENTS` 图上(`community-processor.ts:230-287`),按**真实调用耦合**而非目录分组。→ 纯图算法,**不可直接搬**;但"按耦合而非目录看模块边界"这个**视角**可启发。
- **入口点打分**:`finalScore = baseScore × exportMultiplier × nameMultiplier × frameworkMultiplier`(`entry-point-scoring.ts:100-160`)。信号:调用比(出多入少)、是否导出、命名模式(`handle*`/`*Controller` 加分,`get*`/`*Util` 减分)、框架标志。→ 这套信号**可转译成给 LLM 的判定清单**,客观定位调用链起点。
- **执行流**:BFS 前向溯源 + 去重(`process-processor.ts:346-450`)把离散调用串成主干路径。→ BFS 需图,**算法不可搬**;"先定入口、再顺调用链、去掉工具函数噪音"的**方法论**可借。
- **DAG 编排**:14 阶段显式声明依赖、拓扑排序、运行时只暴露已声明依赖以防隐式耦合(`pipeline.ts`、`runner.ts:183-188`)。→ 一种工程纪律,与 LLM skill 的多步流程编排弱相关,优先级低。

### 维度四 · 面向 agent 的护栏与导航(↔ module-brief 陷阱与护栏)
- **`GUARDRAILS.md`**:每条坑写成 **触发条件 → 处置指令 → 原因**;顶部 "Non-negotiables" 用 RFC-2119 的 Never/MUST。
- **`ARCHITECTURE.md` 的 "Where to change what"**:一张 **修改意图 → 起始代码位置** 的导航表(按意图组织,不按目录)。
- **自动生成 AGENTS.md/CLAUDE.md** 的设计原则(基于其 eval 数据):内联关键工作流、RFC-2119 命令式、三层边界(Always/When/Never)、控制在 120 行内、给确切命令、自检清单。
- 陷阱来源是**人工经验 + 静态分析推导**混合,而非纯 LLM 主观总结。

### 维度五 · MCP 工具集 = "关于代码库,哪些问题值得被回答"(↔ 三个 skill 共用)
17 个工具(`tools.ts:80-802`)本质是一份"值得回答的问题清单":`impact`(改动爆炸半径)、`context`(符号 360°)、`trace`(两符号最短路)、`shape_check`(响应结构 vs 消费方是否一致)、`detect_changes`、`route_map`、`explain`(污点链)等。
- **最有价值的不是新增功能,而是一条分界线**:这些问题里,`impact`/`detect_changes`/"谁现在调用我"这类**答案随代码变**——做成实时查询是对的,写进静态文档**立刻过时、是负资产**。

---

## 3. 过滤后真正能借的(按既有设计哲学保留)

### 🟢 直接能借 —— 纯提示词/产出结构,零基建

| 借鉴点 | 出处 | 落到哪 |
|---|---|---|
| **防编造纪律 + 事实锚**:写文档前先让 LLM 枚举真实导出符号/关键类清单,再据此叙述;提示词钉"引用真实名、不准发明 API" | `prompts.ts:42`、`graph-queries.ts:73-104` | module-brief(design.md 保真度) |
| **"想改 X → 去 Y" 导航表**:按修改意图组织、指向起始代码位置 | `ARCHITECTURE.md` Where-to-change-what | module-brief(design.md);**这是"装模型导不出的知识",最契合设计哲学** |
| **三层护栏 Always/When/Never + 触发→处置→原因 + RFC-2119** | `GUARDRAILS.md` | module-brief(陷阱与护栏小节升级) |

### 🟡 该借,但要转译成"给 LLM 的判定准则",不是搬算法

| 借鉴点 | 出处 | 转译成 |
|---|---|---|
| **入口点 4 信号** → LLM 判定清单,客观定位调用链起点 | `entry-point-scoring.ts:100-160` | module-brief / codebase-exploration |
| **关系维度 checklist**:写文档时主动去找 路由处理 / 数据访问(ORM) / 方法覆写 / 事件 这几类,而非只画 import | `schema-constants.ts:49-86` | codebase-exploration(依赖矩阵维度) / module-brief(design.md) |
| **"按耦合而非目录看模块边界"** 的视角(非算法) | `community-processor.ts:230-287` | codebase-exploration |

### 🔴 减法纪律(最有价值且 agent 没强调)

**静态 vs 实时的分界**:`impact`、"谁现在调用我"、调用者数量这类**随代码漂移**的答案,**不该写进任何静态文档**。这告诉三个 skill **该往文档里少塞什么**,契合"正文只写当下稳定规则"的写作规约。

---

## 4. 明确拒绝/慎重的(agent 越界建议)

| 建议 | 为何拒绝/慎重 |
|---|---|
| 建调用图 + 跑 Leiden 做模块划分、BFS 提执行流 | "变成 GitNexus";agent 自己也承认"非有图算法不可";与一次性定位冲突,基建成本极高 |
| keep-marker + git-diff 增量刷新 | module-brief 明确是"一次性、可随时重生成";加 keep-marker 反而违背其设计 |
| HTML viewer / mermaid-sanitizer 代码 | GitNexus 产品机器,与文档生成无关 |
| 4 层文档提示词结构(grouping→parent→overview) | module-brief 输入即单个模块,这几层不适用,属过度套用 |
| git-log 热点 / 测试覆盖挖陷阱 | 思路有趣但重,超出"一次性读码"范围,先存疑 |

---

## 5. 摆在面前的真正岔路(待讨论,未决)

不是"抄哪条",而是一个方向选择:

- **路线 A — 守住"文档生成器"定位**:只吸收 §3(防编造纪律、导航表、护栏结构、关系维度 checklist、静态/实时分界)。低成本、不背离哲学,保真度与实用度可上一台阶。
- **路线 B — 给 LLM 加一层轻量事实底座**:写文档**之前**用 grep/ctags/tree-sitter 跑廉价预扫,产出结构化清单(导出符号、调用边、路由表),让叙述有据可依。是 A 与"完整 GitNexus"之间的中间态,能实质缩小不对称,但引入预处理步骤——一个真实的架构决定。

**初步倾向**:先把路线 A 吃透(本身就有明显增量、零风险),把 B 作为后续可选项单独评估。最终由 skill 所有者拍板。

---

## 6. GitNexus 如何解决"项目无关性"(及对我们的转译)

> 这一节回答 §5 路线 B 留下的关键疑问:抽取的价值来自栈特定 pattern,而这正反项目无关——GitNexus 支持 15+ 语言、多框架还不被绑死,它怎么做到的?(基于深读 `language-config.ts`/`language-provider.ts`/`tree-sitter-queries.ts`/`framework-detection.ts`/`pipeline-phases/{routes,orm,tools}.ts`)

### 6.1 它的解法:不是二选一,而是分层叠加

GitNexus 的项目无关性**不靠"做得通用",而靠"在一个稳定契约背后堆一堆具体特化,再垫一层通用地板"**。四层:

```
① 稳定契约     = 输出 schema(node/edge 类型)         ← 项目无关的不变量,一切收敛到这
② 通用地板     = tree-sitter + 统一 capture tag       ← 每语言查询都吐同一套 tag
                  (@definition.class / @call.name …)     (下游代码完全不按语言分支)
③ 可插拔特化   = per-语言 provider + per-框架抽取器     ← route-extractors/ 一框架一文件
                  检测命中→启用→各自独立纯函数→阶段聚合    (加栈=新文件+注册,不改既有代码)
④ 优雅降级     = 不认识的语言→跳过;认识但无框架→        ← 覆盖度优雅退化,从不失败
                  照样拿通用调用图,只是没路由/ORM 富集
```

核心一句(其 ARCHITECTURE.md 原话精神):**"语言无关 = 统一 schema + 通用符号抽取;栈特定 = 检测 + 特化抽取器 + 聚合,但不碰通用层。"**

体量参考:`tree-sitter-queries.ts` ~1770 行(16 语言合一);`type-extractors/` ~7257 行(均摊每语言 ~450 行,有 `shared.ts` 共用基础);`route-extractors/` ~1765 行(每框架 200–550 行,Laravel 最重)。**它的特化是精准 AST 抽取引擎,所以重。**

它**没选"通用浅抽取"**——通用层(只有 Function/Class/Call)是地板不是产品,价值全在 ③ 的特化里。

### 6.2 转译到我们(只有 grep、无 tree-sitter)

(a)/(b) 的纠结被这个分层化解:不用二选一,照搬分层即可。但要按"只有正则"的现实校正三处:

1. **我们的"通用地板"更薄,"稳定契约"要更重**。正则抽框架路由实测约 60–70%、会误判注释/字符串里的 `@Get`、做不了跨文件的边。所以重心从抽取层移到①**稳定契约**(事实清单结构 + 文档骨架)与后置核验。
2. **用核验门替代缺失的 AST 精度**。GitNexus 靠 AST 保证"抽出即对";我们写完后把文档自己的每个标识 grep 回仓库核验、查无的标 `[待确认]`——这是正则世界里"事实可信"的等价物,且项目无关。抽取尽力而为,核验兜底。
3. **我们的"栈 pattern 包"轻一个数量级**。GitNexus 一框架 200–550 行 AST 引擎;我们的"包"本质是**一份栈特定提示 + 几条 rg 命令模板**(如 `stacks/spring-mybatis.md`:路由在 `@*Mapping`、表名在 `@TableName`、对外 API 走网关 Controller)——是"抽取提示"不是"抽取引擎",加栈成本极低,没匹配就退通用地板。维护成本担忧基本消解。

### 6.3 落到 module-brief 的目标分层

```
通用地板(任意栈,纯 rg):抽 类/函数声明清单                  ← 总是跑,项目无关
栈包(检测命中才加):Spring→路由/表名;MyBatis→mapper/表;…    ← 可插拔,尽力而为
   └─ 二者汇成一份「模块事实清单」(稳定契约,项目无关结构)
LLM 据清单叙述 + 连调用链(清单当正向锚,不封顶)
写完核验:文档每个代码标识 grep 回仓库,查无的标 [待确认]      ← 项目无关,补精度
```

**结构上完全项目无关**(地板/检测/分派/核验都通用),栈相关性全锁在可插拔的轻量 pattern 包里——与 GitNexus 同一哲学,用 grep + 后置核验替换 tree-sitter + AST 精度。

---

## 7. 待逐个 skill 深谈时要回答的问题

- **module-brief**:导航表 / 护栏结构 / 防编造,具体长什么样?拿 GMZB 真实模块比对着定型。
- **codebase-exploration**:依赖矩阵要不要加"路由/数据访问"维度?会不会过度复杂化?它还没提升到 skill-forge,要不要一并处理。
- **module-spec-baseline**:GitNexus 里**没有直接对应物**(它不产"外部可观察行为契约")——这块对照价值最低,需单独想清楚拿 GitNexus 的什么来比(可能是 `Route.responseKeys`/`shape_check` 这类契约一致性视角)。

---

## 8. 实测结论(2026-06-19 dogfood):核对门胜出,前置抽取搁置

拿 GMZB organization 模块做了 A/B dogfood:把 §6.3 设想的"事实清单前置 + LLM 据清单写 + 核对门"切成两件套,对照"旧方式(LLM 自己读自己写、自觉标 `[待确认]`)",并用 opus / haiku 各跑一轮(共 4 份 design.md)。

**两维度成绩(精确率=写的标识真不真;召回率=隐藏事实覆盖)**:

| 文档 | 精确率 | 召回率(8 个隐藏事实) |
|---|---|---|
| NEW-opus(给清单) | 97% | 8/8 |
| OLD-opus(旧方式) | **100%** | 8/8 |
| NEW-haiku | 97% | 7/8 |
| OLD-haiku | 97% | 8/8 |

**结论:两件套一胜一负。**

- 🟢 **核对门——验证有用,采纳**。修掉两个实现 bug(需查文件名、对标识大小写不敏感)后,在 4 份文档上每次都精准抓到真编造、零误报:haiku 旧方式编的 `fk_org_parent`(虚构外键)、`recalcOrgLevel`(虚构方法,真名 `callStoreProcess`),以及 NEW 脑补的视图列 `org_name_1/5`,全被抓。便宜、项目无关、可外推到另两个 skill。这是从 GitNexus 真正该借的——"事实必须经验证",我们用事后 grep 实现。
- 🔴 **事实抽取前置 + 栈包——本次未证明价值,搁置**。精确率/召回率都没因清单提升;两个 agent(连 haiku)都认真读了代码、自己就挖出了视图/存储过程/跨表。它的理论价值(抬地板/稳定)防的是"草草读/读一半/截断"的烂场景,而尽力而为的 subagent 无法触发该场景——故为"未能证明有用",非"证明无用"。但其成本(栈包、维护、项目无关张力、复杂度)是实打实的。

**撞上既有设计哲学**:"只补模型自己导不出的东西"。模型能自读的(类/表/调用链)→ 前置抽取是替模型做它已做得好的事,无增量;模型不可靠的(拦住自己的自信编造)→ 核对门补的正是这个。**核对门过哲学测试,前置抽取没过。**

**落地决定**:
1. **核对门(原 Step 4)即做进 module-brief**,并外推到 codebase-exploration / module-spec-baseline。
2. **前置抽取 + 栈包转为"待触发备选"**:留触发条件——核对门在真实评测批里跑起来后,若"查无"数据显示某些模块/弱模型确在大量编造,即为回头做前置抽取的证据(届时有 miss 数据当弹药)。

> 即:§2–§3、§6.3 设想的"重那半"(抽取+栈包)被真实数据否掉,只留"轻那半"(核对门)。详见 [module-brief-redesign-draft.md](module-brief-redesign-draft.md) 顶部结论。

---

## 9. 核对门外推实测:codebase-exploration → 不加(2026-06-19)

把核对门外推到 codebase-exploration 前,先做了 OLD/NEW 对抗实验(Workflow,opus×1+haiku×3 现产 GMZB 跨模块依赖矩阵 → "边核验门"逐边审:源类文件是否真引用目标类),再人工裁定。

**实验数据(修正门 = 认 class|interface|enum 后)**:

| run | 模型 | 边数 | 真未通过 | 占比 |
|---|---|---|---|---|
| opus-1 | opus | 98 | 4 | ~4% |
| haiku-2 | haiku | 45 | 0 | 0% |
| haiku-3 | haiku | 102 | 18 | ~18% |
| haiku-1 | haiku | 384 | 149 | ~39%(暴走) |

**两个发现**:
- **A. 矩阵错误风险真实且随模型变弱/过度生成飙升**——haiku-1 虚构 384 条边、近四成不成立;报警率干净区分可信(opus 4%)与垃圾(haiku 39%)矩阵。比 module-brief 那次"错误没冒头"强得多。
- **B. 但单类粒度边核验门太吵,不能逐条删边**——已证实它误伤**真实模块依赖**:矩阵锚点是"代表性证据类"非"穷尽引用点",`trip→paybill`(真引用在 `CcmTripBillSearchVO` 非锚点 `CcmTripBillService`)、`tms→company`(真引用在 `TmsApiService` 非锚点 `TmsNbizTxFlowService`)都是真边、被门误判存疑。**照搬 module-brief 那种"逐条标 `[待确认]`"会冤枉真边**。

**决定:不加**。理由——① 逐条门会误伤真边(发现 B);② 唯一噪声鲁棒的用法是"整张矩阵报警率→可信度计量器",但其价值只在弱模型/headless 态显形,而 codebase-exploration 常态是**主 agent(强模型)**在跑、对应 opus 态 ~4% 报警(还含锚点误伤),日常边际价值不大;③ 投入产出不划算。工程修正(class|interface|enum 定位)留作记录,若将来真要做计量器再用。

**module-spec-baseline**:更不适用——产物是刻意脱离实现的行为契约(无代码标识可 grep),且已有两层完整性门。核对门外推到此**亦不做**。

> 结论:核对门只落在 **module-brief**(标识密集、grep 可核、已采纳)。另两个 skill 经分析/实测均不加。GitNexus 借鉴一事到此收口。

---

## 附:复现信息
- 全仓浅克隆:`/tmp/gitnexus-repo`(如需继续深读)
- 关键文件:`gitnexus/src/core/wiki/{generator,prompts,graph-queries}.ts`、`gitnexus/src/core/lbug/schema.ts`、`gitnexus-shared/src/lbug/schema-constants.ts`、`gitnexus/src/core/ingestion/{community-processor,entry-point-scoring,process-processor,pipeline}.ts`、`gitnexus/src/mcp/tools.ts`、根目录 `ARCHITECTURE.md`/`GUARDRAILS.md`/`DoD.md`

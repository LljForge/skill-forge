# codebase-exploration 理论底座

> 生成于 2026-06-24。这是一份**研究支撑文档、非 skill 版本变更**——为 D4–D7 + ②④ 的优化(现在与未来)建立「理论依据 + 成熟项目支撑」,避免盲改。
>
> **来源**:6 维度并行 web 深挖(SAR 谱系 / code-intelligence / 模块映射 / 大图认知 / 跨栈 / LLM-era)+ 逐维对抗式事实核验。核验结论:keyClaims 绝大多数经一手源 confirmed,少数精度问题已在本文修正(见 §6)。
>
> **怎么用**:动某个缺口前翻对应节——看前人怎么解、可直接借鉴的范式、以及别人踩过的坑。这是参照不是实现规范;真要落地仍按本 skill 纪律配 dogfood。
>
> **解耦补注(2026-06-25, v1.1)**:本 skill 已与 `/module-brief` **彻底解耦、自包含**——产物不再产出任何 `/module-brief` 命令,「上手顺序」改为通用三态(✅深读 / ⚖️你定 / ⬜略读),粒度约束的依据由「下游单次可消化」改述为「一次专注精读可消化」。下文凡涉「下游」,**统一指「模块级深析/精读」这一通用动作**(把单个模块读进上下文深读的任何人或工具),不绑定特定 Skill;D5/D7/②④ 的相关范式据此泛化(SAR 谱系里「置信标记 + 导向下游核实」的人机分工本就是通用设计,与具体下游工具无关)。

---

## 1. 元定位:本 skill 在 SAR 谱系的坐标

本 skill 不是凭空发明,它是 **Software Architecture Recovery / Reconstruction(SAR,架构恢复/重构)** 这个有 30 年文献的领域的 LLM 化实例。用三个经典框架给它立坐标:

| 框架 | 出处 | 给本 skill 的定位 |
|---|---|---|
| **SAR 过程分类法** | Ducasse & Pollet, IEEE TSE 2009(CSMR 2007) | 本 skill = **bottom-up + quasi-automatic**;输入=源码/manifest/命名规范;输出=**Visual Software Views + Analysis**,**不做 Conformance** |
| **Symphony 视图驱动重构** | van Deursen, Hofmeister, Koschke, Moonen, Riva, WICSA 2004 | 产物 = Symphony 的 **target view(as-implemented architecture)**;「慢变纪律闸」≈ Symphony 的 viewpoint 定义(哪些信息进视图**由问题驱动**) |
| **Software Reflexion Models** | Murphy, Notkin, Sullivan, FSE 1995(TSE 2001 扩展;2011 获 SIGSOFT 回顾影响奖) | 本 skill 停在 reflexion 的 **source→target 抽象一侧**,不引入 hypothetical view、不算 convergence/divergence/absence ——它是**「无参照系的 bottom-up 恢复器」** |

**这个定位的两个硬含义:**

1. **多数缺口(D4 / D6 / D7)本质是同一类问题:「source viewpoint 定义不全」或「mapping 没落到真实源码」。** 可统一按 Symphony + Reflexion 的 map 纪律修补,而不是各打各的补丁。
2. **「置信标记 + 导向下游模块级深析核实」的人机分工是符合谱系现实的设计,不是偷懒。** SAR 学界公认全自动高保真恢复尚不可得——自动聚类技术的 MoJoFM 普遍只有 ~38–70%(多份基准研究支撑)。本 skill 在边界处把判断权交人/下游,正是对这一现实的正确响应。守住「无参照系 bottom-up 恢复器」这条边界,**不要硬拗去做 conformance / top-down**。

---

## 2. 贯穿性发现:D6 与 D7 是同一理论缺位的两面

六个维度**独立收敛**到同一条:Reflexion Model 的铁律是 **「map 条目必须 resolve 到真实 source 实体,否则工具报错」**。本 skill 恰恰缺了这道约束:

- **D6**(写横切锚点包路径却不回查)= 写了一条**无法在 source model 里 resolve** 的 map 条目。
- **D7**(造 kebab 逻辑名却丢掉它到源码的映射)= 给了一个**无法 resolve 的高层名**。

工业界对「引用→定义」**从不靠名字匹配**,而是「派生 + 可重放核对」:Kythe 用 VName(含规范化 path)把位置绑定到唯一符号;SCIP 严格区分 **global symbol**(带完全限定、跨文件可 resolve)与 **local symbol**(仅文档内有效);LSP 返回真实 Location;Structure101 的 Architecture Overlay 让逻辑 cell 挂一条可校验的物理 pattern、**漂移即报违规**;Citation-Grounding(2025)要求每条结论锚定真实 file/symbol。

**结论:D6/D7 不是两个独立小修补,而是「给本 skill 补上 reflexion 的 map-resolution 约束」这一件事的两面。** 这给「D6/D7 最该先做」提供了远比「高频低风险」更深的理论根基——它是一个有 30 年文献背书、且在六个维度收敛的统一机制。

---

## 3. 逐缺口:理论 → 成熟项目 → 可借鉴范式 → 坑

### D6 — 锚点路径可验证

- **理论**:Reflexion 的 map-resolution;code intelligence 的符号解析(Kythe VName、SCIP global/local、LSP、SCIP snapshot 的「重建-贴回-golden 比对」);citation-grounding。
- **可借鉴范式**:加一道**路径接地闸**——凡写进产物的包路径/锚点类名,落笔前用一次 `grep`/`find` 反查**全限定路径**(`com.x.y.SecurityConfig` 整串,而非只 grep 类名),**名∧路径双命中**才写实;不命中或歧义则标「路径存疑/降置信」。把它做成 §5.5.1 完整性闸的一个「位置型断言」分支。
- **坑**:① grep 到类名 ≠ 路径对(同名类跨包、内部类、重构后移包);必须校验完整路径串与真实文件对齐。② 冷/陈旧索引会「静默返回错误且报成功」(agent-lsp 实测)——反查须基于完整候选集(§5.5.1 已有此纪律)。③ LLM 凭记忆写路径有实测 ~20% 虚构率 → 必须外接真实 grep 接地,不能「检索像就算」。

### D7 — 逻辑名 ↔ 物理 scope 映射

- **理论**:Reflexion 的 **map 文件**(逻辑实体名 + 绑定到物理源码的选择器);4+1 视图的 logical view(逻辑名)vs development view(包路径)——逻辑名在源码里**不字面存在是规范的**;SCIP global vs local;实体链接的 canonical 锚。
- **可借鉴范式**:把 1.B **已经算出**的「kebab → 类名前缀 scope」作为**一等产物**输出(reflexion-style map):每行 `<kebab> ← class=^<类名前缀> | dir=<包路径正则>`;「上手顺序」点出该 kebab 时**就近附该 scope**,下游用物理选择器 grep 而非 grep 不存在的 kebab。逻辑名保留为人类可读标签,但**必须成对携带可 resolve 的真实锚**。
- **坑**:① RMTool 经验——前缀选择器默认两端隐式通配,**必须 `^` 锚定起点**(`^AppCenter`),否则过匹配吞无关类。② 扁平分层下前缀可能多对一/有歧义,map 条目要记清前缀边界。③ 别走另一极端用超长完全限定名破坏可读性(SCIP 正是为可读性放弃数字 ID)。

### D4 — 跨栈边(多栈仓前端→后端)

- **理论**:retroactive linking(延迟解析跨服务链接);Stack Graphs 的「各栈独立子图 + 跨子图显式连边」;Glean 的「底层存各语言 fact、统一视图靠派生」;消费者驱动契约(OpenAPI / proto / Pact)。跨栈边运行时跨网络解析、端点是配置产物,**纯 import 图必然缺这类边**——这是建模缺一类边,不是漏扫。
- **可借鉴范式**:把「单一权威源」重构为**两层**——「分栈原始事实(import,强)+ 跨栈派生缝合边(候选,弱)」。§5.1 加两个信号槽:前端**出站 HTTP 调用槽**(fetch/axios/RestTemplate/Feign + URL 模板)、后端 **endpoint 声明槽**(`@*Mapping` 路径);合并阶段按 `client URL path+method ⨝ endpoint path+method` 做一次**延迟匹配**;来源优先级:**契约文件 > 源码 URL 匹配 > 命名推测**。§6 诚实改为「栈内 import 边为权威源;跨栈 HTTP 边为候选边,置信单独标」。
- **坑**:URL 动态拼接 / 路径变量 / 网关重写 / 类级+方法级路由拼接 / 常量未解析——静态法对这些**公认必漏**(AutoOAS、Respector 实证)。跨栈边必须标**低置信 + 召回上限**(纳入 §5.5.1「已知缺口」),**绝不能与栈内 import 边同等权威呈现**,否则重蹈「§6 名不副实」。

### D5-A — 超大仓卡片折叠

- **理论**:Shneiderman 的 Visual Information-Seeking Mantra(概览优先→缩放过滤→按需细节,1996)+ Furnas 的 Degree-of-Interest(显示量 = 先验重要性 − 到焦点距离,1986)+ Miller 7±2;cluster ensembles 的 consensus 视图;Aider RepoMap 的「PageRank 重要度排序 + token 预算裁剪」;DSM(Steward 1981 → Lattix/Structure101 工业化)的分区矩阵。
- **可借鉴范式**:在「二·模块总览」与「五·上手顺序」之间加一个**分组概览层**——按伞形包/层把 N 个模块聚成 **5–9 个区**(对齐 Miller),每区只列「区名 + 一句 + 模块数」;**只有高扇出 hub / 逻辑域才出 8 行卡片**,外围折叠成一行(名 + 一句 + 「按需深读」)。第六节依赖矩阵升级为**折叠式分区矩阵**(区×区,拓扑排序使反向边落上三角)。判「详写 vs 一行」用扇入/中心度(粗 PageRank),呼应已有三态。
- **坑**:① **折叠是展示层操作,绝不倒灌改 1.B 的边界判定**(守灵魂第 2 条:边界由度量定)。② 外围**留地标、不删条目**(Furnas:折叠 = 降细节密度 ≠ 删条目;否则违「总览覆盖所有顶层单元」自检)。③ **反向边永远冒泡到顶层可见**,不被折叠藏掉(Lattix/Structure101:循环必须算到顶层指标;否则漏标真双向环违 §5.5.1)。④ 折叠取舍标准须**机械可复现**(扇入/中心度),不让 LLM 主观挑「重要的」。

### D5-B — 单域超大模块 vs 下游容量

- **理论**:**内聚边界**(MQ 最大化 / Parnas 信息隐藏)与**簇容量**是**正交两件事**——MQ 只算边密度、不含容量项;ACDC(Tzerpos & Holt, WCRE 2000)单独引入结构性容量上界做「可理解性」闸;Structure101 用 Fat 阈值**标记而非强拆**;ArchAgent(arXiv 2601.13007)用 **token 预算 + 自适应分组**(组间 ~10% 重叠 + DFS 保组独立)替代文件数阈值;RepoAgent 用**拓扑序 + 增量摘要**降载超窗依赖链。
- **可借鉴范式**:**双闸正交**——内聚闸说「该是一个模块」(保持不拆),容量闸独立、触发时**只标注不改边界**:给单域大模块标「体量超单次精读容量,建议按子域拓扑/入口分批深读」。容量阈值用 **token 预算**(下游真实约束)而非文件数。这正是「删硬阈值后没给替代」的那块替代。
- **坑**:被删的硬阈值之所以误伤,是因为它被当成**「拆模块的判据」**;正确用法是当**「折叠/分卷读触发器」**。新机制必须区分「多域伞形包(该切边界)」与「单域大模块(不切边界、只分层降载)」——**大 ≠ 多域**,本 skill 已识破此点,别又退回文件数阈值。分片沿包/类硬切会割裂调用链(用拓扑序 + 重叠);token 估算须实测(呼应「必留数字写前 grep 核准」)。

### D8 — 注入限定符与循环依赖标志(`@Lazy` 类)

- **理论**:依赖抽取的**强度/方向精度**(Lutellier et al. 依赖精度对照——不同抽取器对同一边判定不一致、易误判强度/漏边);框架特有语义:Spring `@Lazy` 是**为打破循环依赖而引入的延迟代理注入**,它在依赖图上恰恰**标记了一条环边**——语义是「真注入 + 循环嫌疑」、不是「弱依赖」。同理 `@Qualifier`/`@Primary` 是消歧限定符、不改变注入这一事实。
- **可借鉴范式**:**限定符注解只修饰、不否定注入**——`@Autowired @Lazy` / 构造参数 `@Lazy` 仍判 `Injected`、不降 `Import-only`(§1.C);且 `@Lazy` 跨域边作为**环/反向边高信号嫌疑**优先进 §1.D 完整性闸候选集(Spring 里加 `@Lazy` 往往正因存在循环依赖)。机械层(§5.1)把 `@Lazy` 纳入注入锚点 grep,保证含构造参数 `@Lazy` 的边也进候选集。
- **坑**:① `@Lazy` 可不带 `@Autowired`(构造参数 `@Lazy`、单构造器自动注入)→ 只 grep `@Autowired` 会漏,须把 `@Lazy` 自身列为注入锚点。② `@Lazy` 边是真双向环高发处,降档 + 漏报会让读者看不到循环耦合——正是 1.D 反向异味闸要防的(v0.7.1 降档纪律的**限定符变体**)。③ **别矫枉过正把所有 `@Lazy` 都标危险反向异味**——@Lazy 仅是环嫌疑信号,是否「地基→顶层」危险反向仍按 1.D 层级直觉判(相邻 hub/编排层的环可能是健康编排耦合)。**实证来源**:slp dogfood(v0.12)抓到 `project-application → clue` 的 `@Autowired @Lazy` 边被误降 `Import-only` + projapp↔clue 的 @Lazy 环漏报,v0.13 据此修。

### ②④ — 入口与执行流 / API 表面(未来能力槽)

- **理论**:tree-sitter tags 的 role/kind(区分定义/引用/调用);call-path tracing(RepoGraph/Codebase-Memory 已含 CALLS 边与 route 节点);API 表面的成熟工业定义(Respector/AutoOAS:类级+方法级路由拼接后的完整 path + method + 数据模型);契约文件(OpenAPI/proto/Pact)作为现成权威清单。
- **可借鉴范式**:**②入口与执行流** 借 ArchAgent 的「识别 top-level 入口 + 追下游调用链」/ call-path 有界 k-hop 追踪,**只记慢变骨架链**;把入口识别从「名字模式 grep」(§5.2)升级为 tree-sitter「结构化 role.kind 捕获」,减少把工具方法误判为入口。**④API 表面** 优先复用契约文件(有则直接当 API 清单),无则源码静态抽取(类级+方法级路由拼接),**先认全类目(鉴权/路由/消费者/MQ)再各类枚举**(呼应 §5.5.1);**④ 与 D4 的后端 endpoint 槽复用同一信号源**,建 ④ 时顺带产出跨栈边的后端锚点,一举两得。
- **坑**:执行流是**易变细节**(随提交变),强写进慢变地图会迅速过时——只画「从哪进、过哪几层」的抗重构骨架,逐行调用栈留给下游模块级深析(守慢变闸,别重蹈 impact/精确计数被排除的覆辙)。API 静态抽取有「常量未解析 / Spring profile 条件路径 / 参数封装进对象」的失败模式,须标低置信、不自称已抓全。

---

## 4. 优先级:理论支撑后的再确认

| 缺口 | 理论支撑后的判断 |
|---|---|
| **D6 + D7** | **最该先做**。不仅高频低风险,更是**同一理论缺位(reflexion map-resolution)的两面**、有 30 年文献背书、修法在六维度收敛。是「补一个统一机制」而非「打两个补丁」 |
| **D4** | 范式成熟(retroactive linking + 契约优先),但属**新增信号槽 + 跨栈匹配 + §6 重构**,改动面大;且与 ②④ 后端 endpoint 槽同源,宜与 ④ 一并设计。**与你的多栈专项一起做** |
| **D5-A / D5-B** | 范式成熟(折叠层 / 双闸正交),但触发场景在超大仓(盯 slp);**信号驱动再做**。D5-A 经 slp(v0.12)dogfood 实证「分组总览+置信排序+分层 triage 表」三重降噪已守住「5 分钟读懂」,**BACKLOG#2 出列** |
| **D8(`@Lazy` 等限定符/环标志)** | **已修(v0.13)**:限定符只修饰不否定注入 + @Lazy 作环高信号入反向候选集;slp dogfood 复验 |
| **②④** | 真·能力扩张,有成熟图/契约表征可借;独立立项 |

**贯穿所有缺口的元结论**:本 skill 的「诚实标低置信 + 导向下游」被 SAR 学界现实(自动恢复 MoJoFM ~38–70%)**正面背书**——不是缺陷,是符合谱系现实的设计。

---

## 5. 关键参照清单(可追溯)

**经典理论**
- Software Reflexion Models — Murphy, Notkin, Sullivan, FSE 1995 / TSE 2001
- Symphony: View-Driven SAR — van Deursen et al., WICSA 2004
- SAR Process-Oriented Taxonomy — Ducasse & Pollet, IEEE TSE 2009
- ACDC(comprehension-driven clustering,容量上界) — Tzerpos & Holt, WCRE 2000
- Bunch / MQ(Modularization Quality) — Mancoridis et al.
- 4+1 View Model — Kruchten 1995
- Information Hiding — Parnas 1972
- Visual Information-Seeking Mantra — Shneiderman 1996;DOI — Furnas 1986;7±2 — Miller 1956
- DSM(Design Structure Matrix) — Steward 1981

**工业级 code intelligence / 架构工具**
- Kythe(Google,VName/anchor)、SCIP & LSIF(Sourcegraph,global vs local symbol)、LSP、Stack Graphs(GitHub)、Glean(Meta)
- Lattix / Structure101(DSM + Architecture Overlay 逻辑↔物理 pattern)、CodeCity
- Aider RepoMap(tree-sitter 抽签名 + PageRank + token 预算)

**LLM-era(2024–2026)**
- ArchAgent: Scalable Legacy SAR with LLMs — arXiv 2601.13007(adaptive grouping)
- Distributed/Polyglot Multi-Repo Microservice Reconstruction — arXiv 2602.08166(retroactive linking)
- ArTEMiS / ExArch — ICSA 2025(ARDoCo 组,LLM 做架构组件 NER + trace-link,F1≈0.86)
- CATMA: Conformance Analysis for Microservices — arXiv 2401.09838
- Chain of Agents — NeurIPS 2024
- 经典依赖精度对照 — Lutellier et al., ICSE 2015 / TSE 2017

---

## 6. 可信度与边界(诚实交代)

- **整体可信度高**:6 维度 keyClaims 绝大多数由一手源(原论文 / 工具官方文档 / arXiv 全文)逐条 confirmed;code-intelligence、跨栈、LLM-era 三维全部 confirmed。
- **已修正的精度问题**(均为归并/年份偏差,非幻觉):
  - 自动 SAR 准确率「MoJoFM ~38–70%」**成立且多研究支撑**,但其中 ACDC≈55.94% / RELAX≈70.59% / ARC≈58.76% 这组**具体数字实出自 RELAX 论文**,不应整组归到 Lutellier ICSE2015/TSE2017 名下。本文只引用「~38–70%」这一稳健区间。
  - **ACDC 年份 = WCRE 2000**(非 1995/1999)。
  - ArTEMiS / ExArch 的 F1 分数勿张冠李戴(ExArch≈0.86、ArTEMiS≈0.81、TransArC=0.87);本文只用「逻辑名↔代码实体可作可评测 precision/recall 任务」这一定性结论。
  - 多语言架构重建的两篇(arXiv 1808.01210 表式调用图 vs 2602.08166 模块化 extractor)是**不同范式**,勿笼统并入同一条;「静态法漏隐藏/配置依赖」的归因按各自论文表述拆清。
  - **CATMA 内部算法未逐字核实**(PDF 为二进制流,特性表述基于检索摘要)——引用其「微服务 conformance 分析」定位时按此打折。
- **边界**:本文是**理论依据 + 范式参照**,不是实现规范。任何缺口真要落地,仍须按本 skill 的契约纪律(尤其触及 1.A–1.D 防脚本化血泪段或慢变闸时)单独成版、自带 dogfood 复验。

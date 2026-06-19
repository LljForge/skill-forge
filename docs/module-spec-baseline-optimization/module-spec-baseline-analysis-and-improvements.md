# module-spec-baseline 分析与改进建议

> investigation 阶段产物 · **本轮只分析不改代码**
> 日期:2026-06-20
> 触发:以成熟代码分析引擎 [GitNexus](https://github.com/abhigyanpatwari/GitNexus) 为对照,系统评估 module-spec-baseline 的"分析能力"与"维度覆盖"——先把大方向定准,再打磨细节。
> 关联:[gitnexus-comparative-analysis.md](gitnexus-comparative-analysis.md)(2026-06 前序对照,聚焦"核对门/前置抽取"两个战术,已收口)。本报告是更上层的复盘:**整个 skill 各阶段的分析能力 + 分析维度的完整性**,刻意不被前序战术结论框住。

---

## 0. 一句话结论

spec-baseline 把"**它看得见的东西**"(对外 HTTP 查询/保存 + 状态机)逆向得相当扎实;但它的**发现机制只有两扇门——HTTP 端点(structural)+ 回调/状态(domain)**。凡是不从这两扇门进来的行为,一概不进分析视野。结果:一整片真实存在的行为(**非 HTTP 入口** + **横切契约**)在基线里整类缺失。**这是结构性盲区,不是分析精度问题**——把状态机/调用链分析做到 2 倍准,也补不上"整类行为没被看见"。

---

## 1. 方法

1. **通读 skill 现状**:SKILL.md(4 Phase、5 agent 编排)+ 五个 agent 模板 + references(openspec 输出契约、状态分类)+ shared(agent-preamble、tech-stack-detector、web/orm/rpc 策略包)。
2. **深读 GitNexus 真实源码**(浅克隆 `/tmp/gitnexus-repo`):图 schema、ingestion 14 阶段、route/orm 抽取、社区检测、入口打分、wiki 生成、跨栈分层架构。
3. **真实模块净跑验证**:在 GMZB `ccm.paybill` 模块上,**原样、零引导**跑 skill 的事实采集层(boundary + structural + domain 三个真 agent),观察产出。
4. **维度完整性穷举审计**(多 agent workflow):把"一个后端模块所有外部可观察行为"穷举成 36 个维度,逐条同时判定 **(a) skill 抓不抓 + (b) GMZB 真实代码有没有**,用真实命中/文件路径佐证,杜绝"理论盲区空操心"。

---

## 2. 被审计对象:spec-baseline 的五阶段与现状

产物 = `openspec/specs/<capability>/spec.md`(外部可观察行为契约,过 `openspec validate --strict`)。流程:

| 阶段 | 做什么 | 采集的维度 |
|---|---|---|
| **A 定位 + 分能力** | 模块定位、范围预判(过窄/过宽)、`MODULE_SCOPE` 敲定、按行为域分 capability(含扫公共网关 ApiController) | — |
| **B 行为分析(并行)** | `structural-agent` + `domain-agent` | structural:HTTP 端点(方法+路径+请求/响应类型)、出站远程调用、跨模块同进程依赖、PO-DB Schema、DB 侧逻辑;domain:状态机(真/派生位/反模式)、状态消费覆盖差集、字段约束、回调事件 |
| **C 综合 + grounding** | `spec-synthesis-agent` 写 spec → `verification-agent` 逐条 grounding + 跨层契约一致性 + 行为域完整性回扣 | — |
| **D 校验 + 报告** | `openspec validate --strict` 强制门 | — |

**关键观察**:整套"行为发现"围绕两类入口组织——**HTTP 端点**(structural 的起点)与**回调/状态**(domain 的起点)。这决定了后面所有发现的边界。

---

## 3. GitNexus 对照:能学的 vs 学不来的

### 3.1 根本不对称

GitNexus 的准/稳,根子在它把流程切两段:**代码 →(tree-sitter + 作用域解析 + 图遍历)→ 精确知识图谱(事实底座)→ LLM 只在已验证事实上叙述**。spec-baseline 是**单段**:同一次 LLM 调用里既抽事实又叙述,无独立事实层。

→ 所以 GitNexus 的多数"亮点"(增量刷新、影响面、污点链、Leiden 模块划分、BFS 执行流)**是图带来的,不是分析方法带来的**。照搬 = 重做一个 GitNexus,与 spec-baseline 定位冲突。**能学的是它分析时的几条纪律,不是它的图引擎。**

### 3.2 五阶段定位(GitNexus 在每步的本事 → 大方向)

| spec-baseline 阶段 | GitNexus 的本事 | 现状 | 大方向 |
|---|---|---|---|
| 划范围 + 分能力 | 按**真实调用耦合**自动归堆(Leiden),给入口**客观打分** | LLM 读类名 + 人工敲定行为域 | 用客观信号校准划分(轻量版:入口打分信号 → LLM 判定清单)。**详见 §8** |
| 挖结构事实 | 先把符号**解析到真身**再断言关系;路由/ORM 各有专门抽取器 | LLM 直接读、直接断言 | 对关键关系(跨模块写入、对外端点)加"下结论前先回代码确认"纪律 |
| 挖领域事实 ⭐ | 把"谁读谁写某字段"当成图里的边(数据流),状态有没有人消费**能算出来** | 最难最易错的活,全靠 LLM 边读边凑(模板自承"ORM 层 gating 易扫漏") | GitNexus 分析能力**对得最准**的一处,最值得把这步做扎实 |
| 写成契约 | 只在已验证事实上叙述,提示词死钉"用真名、别编 API" | 已有行为优先 + grounding 自检 | **基本不缺**,微调 |
| 核对 | 事实是图验证过的 | grounding + 完整性回扣 + openspec 强校验,**三道门** | **比 GitNexus 还重,不用学** |

**小结**:该学的功力集中在**前三步(挖事实)**,后两步我们已够强甚至更强。

---

## 4. 核心发现:维度完整性审计(最重要)

把"后端模块所有外部可观察行为"穷举为 36 维,逐条对"skill 抓不抓 + GMZB 真有没有"。结果:**真正抓好的只有 6 个,确认的真盲区约 18 类**(skill 没采集 + GMZB 确实在跑)。

### 4.1 根因:两扇门模型

skill 发现行为只走 **HTTP 端点** 和 **回调/状态** 两扇门。漏的东西正好分两大堆:

**堆一 · 横切契约(跨所有端点、对接方最需要的那半张契约,最致命)**
"每个接口都隐含、但 spec 里一个字没有"——

| 维度 | GMZB 真实证据 |
|---|---|
| **请求字段校验**(传什么会被拒) | 157 处 JSR-303 注解(`CcmPayBillPO.java:38` @NotBlank)+ 94 文件手工校验 + 网关 `@Valid` |
| **错误响应契约**(出错返什么码) | 全局 `ExceptionController`(6 个 @ExceptionHandler 显式映射 401/404/400/500)+ `ResultCode` 枚举 + `Result.fail` 521 处 |
| **成功响应信封**(报文形态) | 双套 `Result{success/code/msg/data}`(qfc 83 次 + 本地 20 次)+ @JsonFormat 533 处 |
| **鉴权前置条件** | `ShiroConfig` anon 白名单 10 处 + `/**` 兜底需 JWT;`JWTFilter` 无 token 返 401 |
| **令牌生命周期** | `JWTUtils.java:93` 有效期 12h,过期统一 401,无 refresh |
| **缓存读一致性** | `DictionaryService` @Cacheable 却无 @CacheEvict → 改完有"读旧值"窗口 |
| **并发/锁** | @Version 乐观锁 3 处 + Redisson 分布式锁 4 个服务(`TaskSyncJobService.java:88`) |
| **幂等/去重** | `CcmVoucherService.java:67` 按 srcNumber+type 去重;mapper `on duplicate key` 106 处 |
| **事务回滚/补偿** | @Transactional 16 文件 / rollbackFor 30 处,事务内含出站副作用 |
| **配置开关分叉** | `EnterpriseService.java:125` @Value `edp.callEnabled` gate 外呼(且 domain 默认 true、controller 默认 false 不一致) |
| **环境/Profile 差异** | dev 64 key vs demo 10,53 个 dev-only(`dmp.syncData.cron` 等仅 dev 跑) |
| **文件格式列契约** | @ExcelProperty 1195 处(列序/表头一变对接就破) |
| **时间格式** | @JsonFormat 533 处几乎全钉 `timezone="GMT+8"`,跨 179 文件 |

**堆二 · 非 HTTP 入口(整类后台行为,发现机制根本碰不到)**

| 维度 | GMZB 真实证据 |
|---|---|
| **定时/调度(cron)** | `TripScheduleTask`(差旅同步)、`BillComparisonTask`(月度对账后发企微通知) |
| **消息队列消费 + 出站发布 + 异步最终一致** | 活链:`TmsApiService.java:231` 落库后发 MQ → `RabbitMqProducer` convertAndSend → `RabbitMqConsumer` @RabbitListener 消费调 BFE 制证。"返回成功 ≠ 下游已就绪" |
| **审计/日志留痕副作用** | `ApiOperateLogAspect`(@Around 自动给 @ApiOperateType 端点写 BaseActionLog)+ 15+ MdmLog 镜像表 |
| **对账/补偿/重试自愈** | `TmsTaskSyncJobController.java:48` /taskPaymentCompensate + `TmsApiService.java:254` 重试循环 + nack 重投 |
| 启动初始化钩子 | @PostConstruct 等(本项目影响小) |

### 4.2 覆盖地图

- **✅ 已覆盖到位(6)**:同步 HTTP 入口、状态机转换与拒绝面、状态消费覆盖与不可达态、PO-DB Schema 与 DB 侧逻辑、跨模块同进程依赖、入站回调/Webhook。
- **🟡 部分覆盖(沾边不系统)**:出站失败传播/超时降级、事务边界、文件导入/导出入口、成功/错误响应契约、回调验签与应答时序、分页/排序/过滤语义。
- **🔴 真盲区(无采集方)**:见 §4.1 两堆。

### 4.3 诚实边界(别去补的)

- **GMZB 本身没有、空操心**:限流/防刷(Sentinel 全注释、无依赖)、多租户隔离(硬编码单租户;spec 反而**不该臆测** searchEnterprise 有身份过滤)、版本/向后兼容(无 /v1、无 @Deprecated)。
- **本就该排除在行为契约外**:前端 UI、代码质量——skill 排除合理。
- **⚠️ 一条反向纠正**:skill 把"**安全**"整体排除是**排过头了**。JWT 401、回调验签、anon 白名单是**黑盒可复现的端点前置契约**,不是"代码安全审计",应当作行为契约采,不该跟"安全"一起被扔(对应盲区:鉴权/令牌/验签)。

---

## 5. 验证记录:paybill 净跑(一个工作例)

在 `ccm.paybill` 上零引导净跑采集层,grep 三份 scratchpad 的鉴权维度:**鉴权 0 条真命中 vs 业务状态/错误 84 条**。证实:鉴权维度从未进采集视野(Shiro/JWT 在 `bootstrap/config/`,在任何业务模块作用域之外,无 agent 会去看)。

**意外发现**:[`JWTFilter.isAccessAllowed` 恒 `return true`](../../../../GMZB/master-data/master-data-be/master-data-service-bootstrap/src/main/java/com/itgfin/config/JWTFilter.java),真鉴权判断被注释 → 守卫实际是空壳、端点不设防。这反证一个重要纪律:**横切维度若要补,必须深读到真身**(看到 isAccessAllowed 被注释),否则照 ShiroConfig 写"SHALL 要求 JWT"就是**编造一条不存在的契约**——补维度不能浅尝,否则比不补更危险。

---

## 6. 改进建议(大方向,非实现方案)

按优先级:

1. **R1 · 把"两扇门"扩成"多入口"发现模型**(最深、最该先想清楚):增加非 HTTP 入口的采集——定时/调度、MQ 消费与发布、应用事件/异步、启动钩子。这是改 skill 的**发现机制本身**。
2. **R2 · 增设"横切契约"采集层**:校验/错误码/响应信封/鉴权/缓存/并发/事务/配置开关/格式——这些跨端点、对接方最需要。它们大概率**不是 per-module agent 能顺手带出的**,需要专门的横切扫描思路。
3. **R3 · 借 GitNexus 的分析纪律(不依赖图也能落地的)**:① 关系按类型分开抽(别混进"调用");② 下结论前先回代码确认(resolve-before-assert);③ 知道自己没覆盖什么、可优雅降级(coverage 可度量)。
4. **R4 · 纠正"安全"过度排除**:把黑盒可观察的端点前置契约(鉴权门/验签/anon)从"安全审计"里摘出来,纳入行为契约采集。
5. **R5 · 守住诚实边界**:§4.3 列的"别补的"不要建采集方;补维度必须深读到真身(见 §5 教训)。

> **R6 · 维度扩展会放大两个底层设计的压力**:① 非 HTTP 入口、MQ、缓存、调度这些都是**栈相关**的(RabbitMQ vs Kafka、@Scheduled vs Quartz),会直接压到**跨栈设计**;② 入口变多、横切契约跨包,会直接压到**模块范围划分**(scope 圈错则维度再全也白搭)。故这两块单列深入调查 ↓

---

## 7. 深入调查：跨栈设计

### 一句话结论

spec-baseline 已经长出了 GitNexus 跨栈架构的"上半截"（检测 + 策略包 + 优雅降级），设计纪律基本对路、可继续吃 GitNexus 的红利；但它的策略包只围着"两扇门"（HTTP 入站 + RPC 出站 + ORM 数据形状）转，维度集合被框死，而 GMZB 的真实代码恰恰在"非 HTTP 入口"和"横切契约"两片留白里堆了最重、最碎、最非标的东西（金蝶 SOAP 259 个 stub、5 种远程调用、3 种 Excel 库、RabbitMQ+定时任务）。要扩维度，撑得住的是这套结构，撑不住的是两条被 GMZB 顶上台面的隐含要求：降级必须可见可计数、同维度多实现必须累加不互斥，外加一条 properties/profile 这类非源码契约要开第二通道。

---

### ① 现状：spec-baseline 的跨栈机制是什么

**它是"一处检测 + 一包策略 + agent 各取所需"的三段式，和 GitNexus 同构，但只搭了底层架构的上半截。**

- **检测只有一处。** `tech-stack-detector.md` 在主上下文里跑（不起 agent），顺着"后端根→web 框架→ORM→RPC→结构→前端"逐步 grep/glob，把结果写进 `.stack-profile.yml`，可手改覆盖、可二次复用。识别特征（认哪个注解、哪个依赖关键词）的权威只在这一处，策略文件一律"不重复识别"。
- **策略包是 7 张"分析提示卡"，不是引擎。** 全部是纯 Markdown、12-33 行、零代码零 AST。每张只装四样东西：关键词召回底线、自然语言追链指令、栈特有陷阱、输出表头。真正"读代码"的动作由通用 agent + 原生 Grep/Read 完成——策略只给 LLM 一张召回清单和一点 grounding。
- **agent 把策略路径当变量代入。** boundary/structural/domain 三个 agent 在固定步骤里 `Read {{某STRATEGY_PATH}}`，再照里头的模式执行。

**覆盖矩阵**只有三个维度、两三种技术：web（spring-boot / spring-mvc）、orm（mybatis 系合一 / jpa）、rpc（feign / dubbo / none）。

这是典型的"轻提示"而非"重引擎"：加一个维度内的新技术（比如 rpc 加 gRPC）极轻——写一张 20 行卡片 + 检测器加个分支即可，基本不碰既有文件。

---

### ② GitNexus 借鉴：哪些能照搬，哪些学不来

GitNexus 的四层是"统一图谱 schema ← 作用域解析 ← 语言 provider ← tree-sitter 查询"，靠"输出契约先稳 + tree-sitter 通用地板 + per 栈可插拔抽取器 + 不认识就降级"扛跨栈。

**能直接照搬的（纯设计纪律，和"用不用 AST"无关）：**

1. **输出契约先冻结，发现机制再扩。** GitNexus 先定死 44 种节点/21 种关系、所有抽取器都收敛到同一组结构体。对 spec-baseline = 先定死"每条行为契约的固定字段"（入口类型/触发条件/鉴权/错误码/格式），发现逻辑随便加，产物形态不变。
2. **检测→分派→特化三段式。** GitNexus 的检测半截（认路径、认注解字面量）根本不用 AST，纯字符串匹配——这恰是 grep-only 的 skill 最该抄的"地板信号"。spec-baseline 的 detector 已经是这个形态，方向对。
3. **未命中要优雅降级而非漏/崩。** GitNexus 不认识就 return null、退回中性倍率 1.0，绝不报错也绝不乱猜。spec-baseline 的 `rpc/none.md` 已是显式降级件，雏形已有。
4. **一栈一文件 + 注册表，新增不动既有。** GitNexus 加一门语言 = 加枚举 + 建一个 provider 文件 + 注册表加一行，漏注册会变成编译错误。spec-baseline 已经是"新策略 = 新文件 + detector 加映射"。

**学不来的（依赖 AST，grep-only 拿不到）：**

- tree-sitter 的统一 capture tag 本身——靠 AST 节点类型精确捕获类/方法，grep 没有这种结构精度。
- 类层级/作用域解析、类前缀与方法路由的父子归并、类型推断——这些是图谱级语义，grep 没有作用域概念。
- 写完回仓库 grep 自查的"核对门"在 spec-baseline 这里只能靠 agent 反幻觉约定兜，强度天然弱于真抽取器。

**还有一条要诚实记下：GitNexus 自己也偏 web 路由 + ORM。** 全 ingestion 目录 grep `@Scheduled / @RabbitListener / @Cacheable` 零命中，Java provider 的框架特征表只有 HTTP 注解和 JAX-RS。**它的盲区和 spec-baseline 的盲区高度同构**——所以"非 HTTP 入口 + 横切契约"这片，没法从 GitNexus 抄到现成清单，只能借它的机制、维度得自己补。

---

### ③ 缺口：维度扩展后，现策略包到底撑不撑得住

先看 spec-baseline 自身的结构性裂缝，再用 GMZB 真实数据压一遍。

**裂缝一：维度集合被"两扇门"框死，且有一处悬空引用。** 整套机制只服务 HTTP 入站、RPC 出站、ORM 数据形状三类发现；MQ/调度/启动入口、鉴权/校验/错误码/缓存/并发/事务/配置开关/数据格式这些维度，连容器都没有。更扎眼的是：`boundary-agent.md` 嘴上写着要识别"定时任务"，但它读的 spring 策略卡关键词表里根本没有任何 `@Scheduled`/cron 关键词——声明要找却没给找的依据，这是设计性裂缝不是笔误。

**裂缝二：维度和 agent 产物 schema 硬绑定。** 每张策略卡的"输出"节直接就是某 agent 产物里的表头。新维度若无处安放章节就无家可归——这让"加维度"牵动 agent 输出契约，削弱了"加文件不改既有"的纯度。换句话说：维度内加技术很轻，但**开一个全新维度是结构性扩展**（动 detector 新增 Step、动 agent 新增分析段和输出章节、动 SKILL.md 透传变量），不是纯插件。

**用 GMZB 真实数据压：** 仅一个项目、一种语言（Java）、一个宿主框架（Spring Boot），就已经横跨至少 8 个独立技术族，且多数维度内部还不止一种实现：

| 维度 | GMZB 实际用了什么 | 量级 |
|---|---|---|
| 非 HTTP 入口 | RabbitMQ（`@RabbitListener`）+ Spring `@Scheduled` + properties cron | 现"两扇门"全漏：MQ 1 处、调度任务 6 个、3 条 cron × 4 套 profile |
| 远程出站 | **5 种并存**：Feign / Apache HttpClient / hutool HttpRequest / 自研 HttpUtils / CXF-SOAP | Feign 仅 1，HTTP 客户端 24 文件，**金蝶 SOAP stub 259 文件** |
| 文件 | **3 种 Excel 库混用**：easyexcel / hutool-poi / apache-poi | 11 / 3 / 8 |
| 缓存 | **3 套并存**：`@Cacheable` / 裸 RedisTemplate / Redisson | 声明式 1，命令式 6+10 文件 |
| 鉴权 | Shiro + 自研 JWTFilter | 各 20 文件 |
| 配置契约 | properties + 4 套 profile（cron、OSS 开关、各下游对接开关） | 完全在 Java AST 之外 |

这把三个真相顶上了台面：

- **每个新维度都强栈相关，而且"维度→栈"是一对多，不是一对一。** 光"远程契约"这一个维度，在 GMZB 就要写 5 个特化分支（Feign 注解接口、HttpClient 链式调用、hutool 静态方法、自研工具类、SOAP/WSDL stub，在 AST 上是 5 种完全不同的形状）；"缓存"里声明式能靠注解抽、命令式只能靠调用模式启发式认，根本不是同一类抽取逻辑。所以 GitNexus 的"一框架一文件"在 GMZB 实际是"一库一抽取器"。
- **"优雅降级"在这种项目里 = 静默丢契约，而且专丢最重的那块。** GMZB 最重的金蝶 259 stub、自研 HttpUtils，恰恰是最非标、最容易"不认识"的。若降级只是"跳过不报"，spec-baseline 会把整个金蝶集成契约面洗没了却显得"跑通了"——这比报错更危险。
- **配置/cron 这类契约压根不在 Java 源码里。** 它们在 properties + 4 套 profile 差异里，要的是 properties 解析 + profile 比对，整个跳出 tree-sitter / 源码扫描这层地板。

结论：现策略包的**思路方向对、且是唯一能扛住 GMZB 这种碎片化的结构**——若不分库特化、想用一套通用规则抽"远程契约"，在 GMZB 上必然只识别出 Feign 那 1 处、漏掉 258+ 文件。但它**当前形态扛不住**，因为上面三条隐含要求一条都没坐实。

---

### ④ 改进大方向（几条，非实现方案）

1. **维度和栈解耦，让"维度"成为一等公民。** 把现在被 web/rpc/orm 框死的维度集合，扩成一张可枚举的"维度 × 栈"清单——非 HTTP 入口（MQ/调度/启动）、横切契约（鉴权/校验/错误码/缓存/并发/事务/配置开关/格式）各自立项。新增一类维度 = 表里加一类触发器，套同一套"grep 友好触发器 + 统一契约字段"的纪律，不动既有发现门。
2. **同维度多实现要累加、不互斥。** 文件维度 3 库、远程维度 5 库可能同模块甚至同类共存，策略包不能"匹配到第一个就停"，要全部跑、结果合并。这要求每个维度下挂一组并列的栈触发器，而不是单选。
3. **降级必须显式、可见、可计数。** 把 GitNexus 的"return null 中性兜底"升级成"产出一份降级清单"：已识别 N 种入口/出站、还有 M 处无法归类的可疑调用点（点名文件）。绝不能静默吞掉金蝶/自研这类最重最非标的契约——目标是宁可标"未识别"也不能"优雅漏报"。
4. **为非源码契约开第二通道。** properties + 多 profile 里的 cron、OSS 开关、下游对接开关都是外部可观察行为契约的一部分，但不在 Java AST 里。需要一条独立于源码扫描的"配置契约源"通道（properties 解析 + profile 差异比对），与源码策略包并列。
5. **先把输出契约钉死，再扩发现机制。** 照 GitNexus 纪律，先冻结每条行为契约的固定字段（入口类型/触发条件/鉴权/错误码/格式），解开"维度与 agent 产物 schema 硬绑定"——让新维度有统一的产物去处，而不是每开一个维度就改一次 agent 输出表头。
6. **补一道 grep 自查的核对门。** spec-baseline 没有 AST 抽取层，召回全靠 LLM 守"关键词表底线"，漏召静默。可借 GitNexus"写完回仓库验"的纪律，在 agent 产物落地后用关键词表回 grep 一遍仓库、比对召回数，把弱约定升级成可执行的核对门（这是 grep-only 也能做、且 GMZB 数据证明最该做的一条）。

---

## 8. 深入调查：模块范围划分

### 一句话结论

现状"机器产候选、人一次性提问拍板"的范式，最底层的硬伤是**决策不落盘→基线划分不可复现、无证据链**；而 GMZB 的真实结构（masterdata 巨包占全仓 56%、同包跨业务依赖零 import 标记、共用网关、字段主权跨包、入口四散）会让"先圈范围再分析"在五个地方崩。GitNexus 的"按真实耦合而非目录分边界 + 客观入口信号"是对的方向、可转译成判定清单，但它的图算法学不来，且它对入口的框架信号表同样只重 HTTP。

### ① 现状：怎么圈范围、怎么分能力、靠什么信号、自己承认会在哪崩

module-spec-baseline 干两件事：先**圈范围**（这个模块到底包含哪些文件），再**分能力**（把这些文件归并成几个行为契约 capability）。两件事都是同一个套路——**机器只产候选，人通过一次性提问拍板**。

圈范围的信号链：用户给个模块名 → 机器用 grep 在 `service/dao/controller` 包路径里找这个名字命不命中 → 机器做两侧启发式预判（"过窄"=几乎没有实现，疑似空壳；"过宽"=类名一看就横跨多个不相关业务域），任一命中就停下来让人确认 → 最后一次 AskUserQuestion，由用户敲定哪些前缀纳入、哪些排除。这里有个关键的自我设限：**判过宽过窄"不设文件数阈值"，纯靠"读一遍类名看是不是一个内聚域"**（SKILL.md:94、100）。

分能力的信号链：机器 grep 本模块的对外入口面（Controller、Service 对外方法），**并强制连公共网关 ApiController 一起扫**（这是项目特例，硬编码在 skill 里），然后按"行为域"把入口归并、用 kebab 命名，最后又是一次 AskUserQuestion 让用户敲定 capability 列表。

它自己写明了五类失败模式并各有兜底：扁平分层（模块≠目录，按类名前缀划界）、过窄空壳、过宽伞形、公共网关漏扫、共享枚举跨模块漏判；外加跨模块 case 回调藏在中央分发器、裸串状态、行为域完整性回扣门。**值得注意的是它没有兜住的根问题**：两处拍板都是一次性提问、**决策不落盘**（Step 3 明写"不写 module_aliases"，CAPABILITY_PLAN 跑通即清理），所以同一模块换个人、换次会话重跑，grep 候选一样但人选可能不同——**基线划分不收敛、不可复现、无证据链回溯"为什么这样切"**。这是比任何单个失败模式都更底层的硬伤。

### ② GitNexus 借鉴：哪些能转译成给 LLM 的判定清单，哪些是图算法学不来的

GitNexus 解决"边界/入口"用的是图算法，思路上有三点正面冲击 module-spec-baseline 的现状：

**第一，"按耦合而非目录划边界"它用算法证明了。** GitNexus 的 Leiden 社区检测完全不看目录——只在"谁调用谁、谁继承谁、谁实现谁"这张真实关系图上聚类，目录**只在事后给簇起名字时才出现**，而且显式跳过 `core/utils/common/shared` 这种通用目录名（community-processor.ts:369）。这条直接可写进 skill：**别按 `controller/service/dao` 分层或包目录切 capability，要按"哪些类互相调用、共享同一组 PO/表、围绕同一业务名词"来聚**。

**第二，"入口靠多信号判定，而非凭名字猜"这套结构可以整体抄成 checklist。** GitNexus 给每个候选入口算 `正向信号 × 导出 × 命名 × 框架位置`，关键是它**带一份负向黑名单**（`get/set/is/has` 访问器、`format/parse/validate` 转换器、`*Util/*Helper`、`_` 私有约定一律降权，entry-point-scoring.ts:56-72），还有**测试文件整批排除**。LLM 凭名字猜入口时最容易把工具函数误判成入口，这份黑名单正好补这个洞。

**第三，也是最有价值的——"框架/路径=强入口信号"这个机制可以扩到它自己漏掉的地方。** GitNexus 把"Spring `*/controller/*.java`=入口"这类框架约定编码成可查表，但它自己只重 HTTP（routes/tools），cron/MQ/启动入口只能靠 `main/start` 命名碰运气。**机制是对的、表是不全的**——`@Scheduled`/`@RabbitListener`/`@KafkaListener`/`ApplicationRunner` 同样是注解可识别的客观信号，skill 把这张框架信号表补全，就能用一个通用机制覆盖非 HTTP 入口，而不是像现在这样靠硬编码 ApiController 一条特例逐个打补丁。另外"跨边界的流程更重要"（cross_community 标记）也可转译成 spec 优先级：优先描述跨 capability 的端到端流程。

**学不来的部分要拎清楚，别误当缺失去补**：Leiden 社区检测、调用比打分（`被调出/(被调入+1)`）、cohesion/modularity 量化分、BFS 多路径追踪——这四样全部依赖**完整全图 + 迭代算法**。LLM 读单个模块时根本拿不到全局的"谁跨模块调了它"，无法在 prompt 里心算几千节点的最优划分。所以 skill 该借的是 GitNexus 的**判定结构**（清单化的正负信号、框架表、按耦合聚），不是它的**算法**。

### ③ 缺口：GMZB 的真实结构会让现状在哪里崩

把 GMZB 的代码摆出来，现状的"先圈范围再分析"在五个地方崩，且全有实证：

**1. 包≠模块，圈范围第一步就断。** 最大的 `com.itgfin.masterdata` 包有 669 个 java 文件（占全仓 56%），但它二级子包只有 `service/dao/po/vo` 这种技术分层目录，**没有任何业务子域子目录**；内部至少塞了 9 个互不相关的子域（员工、组织、企业客户、银行账户、字典编码、应用中心、同步日志……）。"包→scope"的默认映射在这里彻底失效，子域边界只能靠类名前缀启发式——而 `Base*` 前缀横跨 7 个子域、`MdmLog*` 是切面式日志不是业务，**前缀本身就不可靠**。现状判过宽"不设阈值、读类名"，面对 669 个混编文件既不可靠也不可重复。

**2. 同包跨业务依赖在 import 图上完全隐形——最危险的一项。** `EnterpriseService` 注入 12 个依赖，其中 **8 个的 import 行数为 0**（BaseAreaService、DictionaryService、MdmCodeService、EnterpriseSourceService 等），因为它们和 EnterpriseService 同在扁平的 `service/` 包下，**Java 同包引用不产生 import 语句**。任何靠"扫 import 划边界"的 scope 推断都会系统性漏掉这 8 条跨子域边，圈出一个"看起来自洽、实际漏了一半上游"的假范围。这正好踩中 GitNexus 借鉴里"按耦合划边界"的软肋——**连 GitNexus 那种精确调用图都依赖能解析出调用关系，而这里的耦合在源码层面零标记**（无 import、无注解、无目录），人和工具都难自查。

**3. 共用网关让"一 Controller 一模块入口"的假设全面失效。** `ApiController`（503 行）注入 13 个不同业务的 Service、暴露 18 个 `searchXxx/saveXxx` 端点。圈 employee 范围时必须从这一个文件里**按行精确切出 27 处** employee 相关端点——整文件圈入会误并另外 8 个子域，整文件忽略会漏掉 employee 一半的对外契约。现状靠硬编码一条 ApiController 特例堵这个洞，但这说明发现机制本身缺通用的"隐藏入口"识别能力。

**4. 字段主权与包边界错位，契约该挂谁名下没有确定答案。** `ccm.budget` 的 `BudgetOrderDetailService` 直接 import paybill 的 PO，把整个 `CcmPayBillPO` 当入参，逐字段读 `isWriteOff/invoiceType/expenseNumber` 等做业务判断。这条契约的**语义主权在 paybill，消费侧在 budget**——只圈 budget 会把 paybill 的字段语义误记成 budget 自有规则，只圈 paybill 又看不到这个消费关系。

**5. 入口四散，缺任一类都漏一片契约。** 同一个 employee 业务的入口横跨四处：自有 Controller（6 文件 38 端点）、共享网关 ApiController（27 处）、同步 Controller 群（TaskSyncJob/SyncApi/SyncKingDee/SyncCcmFun）、非 HTTP 入口（MQ 监听 + `@Scheduled`）。更刁的是**唯一活跃的 `@RabbitListener` 物理躺在 `masterdata/config/RabbitMqConsumer`，驱动的却是 TMS/BFE 业务**——圈 tms/bfe 按包根本找不到它的 MQ 入口，圈 masterdata 又会把 TMS/BFE 入口误算进来。

### ④ 改进大方向（几条，非实现方案）

1. **给"圈范围/分能力"加客观锚点，别全押在人的一次性口头判断上。** 现状判过宽过窄"不设阈值、读类名"导致不可复现。可引入 GitNexus 式的轻量耦合信号（共享调用、共用 PO/表、共围业务名词）作为聚类依据，让"为什么这样切"有可观测证据，而不是只有人脑里的"内聚域"直觉。
2. **决策要落盘留痕。** 范围纳排和 capability 列表这两次拍板的结果与依据应持久化（哪怕轻量），让同模块重跑能收敛、能回溯——这是当前最底层的硬伤，且与"巨包判定缺客观信号"是同一个根。
3. **把入口发现从"grep 猜名字"升级成"框架信号表 + 正负信号清单"。** 抄 GitNexus 的判定结构：正向（导出/public、`handle*/on*/process*`、框架注解位置）加权 + 负向（`get/set/is`、`*Util/*Helper`、转换器）降权 + 测试整批排除。关键是**把框架表从 HTTP 扩到 `@Scheduled`/`@RabbitListener`/`ApplicationRunner`**，用一个通用机制覆盖非 HTTP 入口，取代逐个硬编码特例（如 ApiController）。
4. **承认"同包零 import 依赖""字段主权跨包"这类源码无标记的关系是范式天花板，显式标注存疑而非静默闭合。** 既然连图算法都靠解析关系吃饭，而这些关系在 GMZB 源码层零标记，skill 不应假装范围已闭合——应像 GitNexus"低置信关系降级"那样，把推断不到的跨子域边显式列为"存疑/待人裁决"，绝不静默当成边界闭合，否则下游所有维度都建在错范围上。
5. **入口枚举要强制覆盖"四类位置"清单**（自有 Controller + 共享网关按行切 + 同步 Controller 群 + MQ/定时），并把"入口可能错置在他包 config 下"列为已知陷阱——缺任一类即视为范围未闭合。

---

## 9. 优化前基线(2026-06-20 实测)

目的:**先建可复测的基线,优化后同尺重测才知道有没有效果、对不对。** 对照件:[baseline-2026-06-20.json](baseline-2026-06-20.json)(5 张打分卡 + GitNexus 结构事实 + 总览)。

### 9.1 测量方案(锁定的"尺")

对 5 个代表模块(tms / ccm-trip / ccm-budget / ccm-paybill / mdm-enterprise)**零盲区引导、净跑**完整 skill 管线,每模块产 `openspec/specs/` + 一张固定**打分卡**:维度覆盖(✅全/🟡部分/🔴盲区)、HTTP 入口完整度、非 HTTP 入口完整度、真盲区数、编造数、`validate --strict` 结果。

**GitNexus 在对照里的真实角色(已查实,非想当然)**:对后端 `analyze` 建图(2.99 万节点 / 7.59 万边 / 32.5 秒,无嵌入)。在 Java/Spring 上——
- ❌ **端点/路由/ORM = 0**(Route=0、HANDLES_ROUTE=0、QUERIES=0):**不能**当端点或行为契约的 oracle(它路由抽取是 JS/PHP 专属)。讽刺的是,这恰是 spec-baseline 最在乎的层。
- ✅ **调用图当依赖完整度 oracle**:CALLS 1.5w / ACCESSES 2.1w 是**解析过、不靠 import** 的,实测逮到 `EnterpriseService` 的同包零 import 依赖(BaseAreaService/DictionaryService/MdmCodeService/EnterpriseSourceService 等 11 个),正好补 §8 说的 grep 盲区。
- ✅ **骨架计数当结构分母**:每模块类/方法数(tms 86类/235方法、budget 130/451、paybill 48/171…)。

### 9.2 基线结果

| 模块 | validate | 维度(✅/🟡/🔴) | HTTP端点完整度 | 非HTTP入口 | 真盲区 | 编造 |
|---|---|---|---|---|---|---|
| tms | 全过 | 8 / 4 / 6 | 77/77 (100%) | 0/0 N/A | 6 | 1 |
| ccm-trip | 全过 | 11 / 5 / 7 | 19/19 (100%) | 2/2 (100%) | 8 | 0 |
| ccm-budget | 全过 | 11 / 5 / 7 | 90/100 (90%) | 0/0 N/A | 6 | 2 偏差 |
| ccm-paybill | 全过 | 12 / 3 / 8 | 34/34 (100%) | 0/0 N/A | 4 | 1 精度 |
| mdm-enterprise | 全过 | 12 / 3 / 7 | 13/14 (93%) | 0/0 N/A | 6 | 2 硬编造 |
| **合计** | **5/5** | — | **233/244 ≈95%** | 2/2 | **30** | **6**(硬编造2) |

**跨模块共性盲区(普遍漏)**,按命中模块数:
1. **事务边界 @Transactional —— 5/5 全漏**(主单+明细批量落库的原子性契约全程缺席)。
2. **审计留痕 —— 4/5 漏**(入站 @ApiComeinLog + 出站 mdmLogSyncApi 每笔外呼请求/响应/耗时/状态码)。
3. **配置开关 / 外部凭据 —— 4/5 漏**(@Value/@ConfigurationProperties 注入的外呼地址、密钥、cron、落库旁路开关)。
4. **出站令牌/签名加密 —— 3/5 漏**(tms secretKey 签名、budget access_token、enterprise dynamicSecret 验签)。
5. **响应信封结构、并发治理具体上限 —— 普遍 🟡 部分**。

> 一句话:**业务"做什么"抓得准,实现层"怎么保证/靠什么开关/出站怎么签名留痕"系统性抓不全。** 印证 §4 的"横切契约盲区"。

**最完整 ccm-paybill**(横切命中最多、状态机六态齐、几无编造);**最差 mdm-enterprise**(唯一 2 处"与代码相反"硬编造:导入非法实为静默成功却写成"显式拒绝";异步并发写成同步;漏一个真实端点 `/taskGetQccMessage`)。

### 9.3 优化验收标尺(优化后该看哪几个数字)

**必须降**:真盲区总数 30 → 显著下降(主砍共性 top4);编造 6 → **硬编造归零**(enterprise 那 2 处是回归红线)。
**必须守(防顾此失彼)**:HTTP 端点完整度 ≈95% 不能跌;`validate --strict` 5/5 不能挂;trip 非 HTTP 入口 2/2 的标杆其它模块若有同类入口也要达到。
**验收判据**:盲区降、硬编造归零,**而**端点完整度与 strict 通过率纹丝不动 = 净改进;若盲区降了但端点或编造变差 = 顾此失彼、不算数。

---

## 附:复现信息

- skill 源:`/Users/lilongjian/Projects/AI/skill-forge/skills/module-spec-baseline/`
- GitNexus 浅克隆:`/tmp/gitnexus-repo`;GMZB 后端结构图索引:`master-data-be/.gitnexus/`(`gitnexus cypher/context/impact` 可查;`gitnexus clean` 可删)
- GMZB 后端:`master-data-be/`
- **基线对照件**:`skill-forge/docs/baseline-2026-06-20.json`(优化后同尺重测的对比基准)
- **基线产出**:`master-data/openspec/specs/`(5 模块 specs)+ `master-data/openspec/.spec-baseline-scratchpad/`(中间产物)
- 维度审计 workflow:`spec-baseline-dimension-completeness`(36 维 × 真实代码验证)
- 基线生成 workflow:`spec-baseline-current-baseline`(5 模块净跑 + 打分卡)

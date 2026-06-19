# module-brief 重设计草案 —— 事实接地的分层流程

> ⚠️ **结论(2026-06-19 dogfood 后,已收缩范围)**:本草案的"重那半"——**事实抽取前置(Step 2)+ 栈包(§3)**——经 GMZB organization 模块 A/B 实测(opus+haiku 共 4 份文档),**精确率/召回率均无增量,已搁置**(转"待触发备选",触发条件见分析报告 §8)。
> **实际推进的只有"轻那半":核对门(Step 4)**——已被数据背书(零误报、稳定抓真编造),即做进 module-brief,并外推到 codebase-exploration / module-spec-baseline。
> 下面的 Step 1/2/3、§1 词汇表、§3 栈包属**已探索但暂不实施**的设计记录,保留备查。**只有 Step 4 是当前要落地的。**

---

> 状态:设计稿(部分搁置,见上)。来源:[gitnexus-comparative-analysis.md](gitnexus-comparative-analysis.md) §6–§8。
> 日期:2026-06-19

## 0. 这次改什么、为什么

**核心问题**:现版 module-brief 是"LLM 一遍过",LLM 同时当事实来源和叙述者,`[待确认]` 全靠自觉——准与稳同卡在这。

**改法(借 GitNexus 的分层,用 grep + 后置核验替换 tree-sitter + AST 精度)**:把流程切成"确定性抽事实 → LLM 据实叙述 → 确定性核验",并定一个**项目无关的最小事实词汇表**当稳定契约,栈相关性全锁进可插拔的轻量 pattern 包。

**明确接受的代价**:module-brief 告别"轻量单上下文一遍过"的旧身份,变多阶段。但仍**单上下文、不派子 agent**(抽取=几条 rg,核验=一轮 grep,都廉价)。

---

## 1. 稳定契约:最小事实词汇表

事实清单(中间产物)只认这套词汇。**它是项目无关的结构**;具体怎么抽由栈包决定。

```
节点(~6 类)
  module-file    模块内文件
  type           class / interface / enum / struct
  operation      function / method
  entrypoint     对外入口:route / handler / 网关 API 方法
  datastore      数据存储:表 / model / collection
  externaldep    外部依赖:远程 client(feign/http/wsdl/mq…)

关系(~5 类) —— 标注可靠度,决定谁来填
  DEPENDS         file→file(import/依赖)         【rg 可靠】
  EXPOSES         entrypoint→operation(路由→处理方法)【栈包可靠】
  EXTENDS/OVERRIDES type→type(继承/覆写)          【rg 较可靠】
  PERSISTS        operation/file→datastore(读写哪张表)【候选,半可靠】
  CALLS           operation→operation(调用)        【rg 抽不准 → 留给 LLM】

明确不要:BasicBlock / CFG / REACHING_DEF / TAINTED 这一整层(机器查询专用,人读是噪音)
```

**关键认知**:节点抽得准(声明式语法),边抽不准(尤其 CALLS)。所以事实清单**强在节点、弱在边**;调用链(CALLS)主要由 LLM 据已验证的节点名去连。

**事实清单形态**:临时产物(写到 `{{OUTPUT_DIR}}/.factsheet.md` 或纯 in-context),**不是持久库**。每条事实带证据 `file:line`。示例片段:

```yaml
# 模块事实清单(自动抽取,尽力而为,可能漏/可能误 —— 仅作 LLM 正向锚)
types:
  - {name: BaseOrganizationService, kind: class, at: ".../service/BaseOrganizationService.java:NN", exported: true}
entrypoints:
  - {name: "searchOrganization", kind: gateway-api, at: ".../controller/ApiController.java:224"}
  - {route: "/baseOrganizationSrcMap POST /search", kind: route, handler: "...", at: ".../BaseOrganizationSrcMapController.java:46"}
datastores:
  - {name: base_organization, at: ".../po/BaseOrganizationPO.java:31"}
  - {name: base_organization_src_map, at: ".../po/BaseOrganizationSrcMapPO.java:26"}
edges_reliable:
  - {EXPOSES: "/baseOrganizationSrcMap/search → BaseOrganizationSrcMapController#search"}
```

---

## 2. 新执行流(5 步,单上下文)

```
Step 1  定位确认(+ 栈识别 → 选 pack)        ← 基本沿用现版
Step 2  事实抽取(通用地板 + 栈包 → 事实清单)  ← 新增,确定性
Step 3  LLM 据清单叙述 + 连调用链 + 写两份文档  ← 原写作步,改为"据清单"
Step 4  核验门(文档标识 grep 回仓库)          ← 新增,确定性,项目无关
Step 5  报告(含核验统计)                      ← 增核验数字
```

### Step 1 · 定位确认(沿用 + 强化栈识别)
- 模块名 / 范围 / 输出目录:同现版(含 headless 模式读 `$EVAL_PRESET`/`$EVAL_OUT`)。
- **栈识别上升为关键步**:识别结果决定 Step 2 加载哪个栈包。识别不出 → 只跑通用地板。

### Step 2 · 事实抽取(确定性,产事实清单)

**2a. 通用地板(任意栈,纯 rg,总是跑)**
按已识别语言用通用声明 pattern 抽 `type` / `operation` 节点 + `DEPENDS`(import)边。例(Java):
```bash
# 类/接口/枚举声明
rg --type java -g '!target' -n '^\s*(public|private)?\s*(abstract|final)?\s*(class|interface|enum)\s+\w+' <scope>
# 方法签名(粗)
rg --type java -g '!target' -n '(public|private|protected).*\w+\s*\(' <scope>
```
> 地板尽力而为;漏抽不致命,Step 4 会从另一头补。

**2b. 栈包(检测命中才加,富集 entrypoint/datastore/externaldep + 可靠边)**
加载 `references/stacks/<stack>.md`,按其 rg 模板抽。以 `spring-mybatis` 为例(命令均在 GMZB 后端实测可用):
```bash
# entrypoint: 路由
rg --type java -g '!target' -n '@(Get|Post|Put|Delete|Request)Mapping' <scope>
# entrypoint: 网关对外方法(栈包提示"留意是否有集中网关 Controller",具体类名归项目 CLAUDE.md)
rg --type java -g '!target' -n 'public .*\b(search|save|query)\w*\(' <gateway-controller>
# datastore: 实体→表
rg --type java -g '!target' -n '@TableName\(value\s*=\s*"\w+"' <scope>/po/
# externaldep: Feign
rg --type java -g '!target' -n '@FeignClient' <scope>
# EXPOSES 边:mapper XML / DAO 方法 ↔ 路由
find <scope> -name '*Mapper.xml' -not -path '*/target/*'
```
**产出**:把 2a+2b 结果汇成 §1 的事实清单(临时文件)。

### Step 3 · LLM 据清单叙述 + 连边 + 写文档
- LLM **仍读代码**(理解语义/业务),但**符号以事实清单为正向锚**。
- **锚的规则:正向、不封顶**。清单里有的符号 = 已验证、优先引用;清单没有的(正则漏抽,如继承自 `BaseMapper` 的 CRUD)**允许 LLM 引入**,但不带"已验证"光环,须过 Step 4 核验。**绝不能因"不在清单里"就把真实符号压成 `[待确认]`**(那是把漏抽当成不存在)。
- **CALLS 由 LLM 连**:据清单里已验证的 operation 节点,把 Controller→Service→DAO 主干串起来(§3 调用链)。
- **按需叙述,禁机械罗列**:事实清单是**取材库不是模板**;选哪些讲、讲多深仍按 module-brief"点到为止不穷举"。把清单平铺成表 = 违规。
- 写 requirements.md(禁标识)+ design.md(允许标识,末尾陷阱与护栏)。格式仍见 `references/{requirements,design}-format.md`。

### Step 4 · 核验门(确定性,项目无关)
- **只核验 design.md**(requirements.md 无代码标识,跳过)。
- 抽出 design.md 里所有代码标识(`ClassName` / `method()` / `表名` / `mapper.xml#id`),逐个 `rg` 回模块范围:
  - 命中 → 保留。
  - 查无 → 标 `[待确认]`(或删),并计入核验报告。
- **项目无关**:核验的是"文档自己的声称 vs 仓库真相",不依赖任何栈假设。
- 这一步同时补两个短板:正则抽取的栈相关漏洞、LLM 连 CALLS 时的编造风险。

### Step 5 · 报告
两份文档路径 + 概况 + **核验统计**(标识总数 / 命中 / 标记 `[待确认]` 数 / 命中率)。命中率成为该次产出的"可信度指标"。

---

## 3. 栈包格式(`references/stacks/<stack>.md`)

每个包是**提示 + rg 模板**,不是代码。骨架:
```markdown
# 栈包:spring-mybatis

## 检测信号(任一命中即启用)
- 路径/文件:pom.xml 含 mybatis-plus;存在 *-domain/*-app 子模块
- 内容标志:@SpringBootApplication、@Mapper、@TableName

## 抽取模板(填事实词汇表)
| 词汇槽 | rg 命令 | 备注 |
|---|---|---|
| entrypoint(route)   | `@(Get\|Post\|...)Mapping` | … |
| entrypoint(gateway) | 留意集中网关 Controller(具体类名见项目 CLAUDE.md) | 不硬编码项目特有类名 |
| datastore           | `@TableName\(value="…"\)` | 精确 |
| externaldep         | `@FeignClient` / CXF WSDL stub | … |

## 已知盲区(诚实声明)
- 继承自 BaseMapper 的 CRUD 方法无声明、抽不到 → 靠 LLM + Step4 补
```

**项目无关纪律**:包里只放**栈/框架级**模式(`@TableName` 属于 MyBatis);**项目特有事实**(具体网关类名、具体表前缀)一律不入包,归项目 CLAUDE.md——延续既有"通用 skill 须项目无关"原则。

**初始随包发**:`spring-mybatis`(dogfood 目标)+ 通用地板兜底。其余栈按需逐个加,加包不改主流程、不动 writer。

---

## 4. 相对现版的增删

| 项 | 变化 |
|---|---|
| Step 数 | 3 → 5(插入"事实抽取"和"核验门") |
| 新增 reference | `references/factsheet-schema.md`(词汇表)、`references/stacks/spring-mybatis.md` |
| design-format.md | §2/§3/§4 写作要点补"据事实清单、正向不封顶";自检加"核验门已过" |
| 反幻觉条 | 从"自觉标 `[待确认]`" 升级为 "正向锚 + 后置核验" |
| 单上下文/不派子 agent | **保持不变** |
| 轻量"点到为止" | **保持不变**(词汇表是取材库非模板) |
| headless 评测模式 | 保持兼容(Step1 读 preset;Step2/4 照跑) |

---

## 5. 待你拍板的开放点

1. **词汇表粒度**(§1):~6 节点 / ~5 关系,够不够 / 多不多?(尤其 `externaldep`、`PERSISTS` 要不要保留)
2. **事实清单落不落盘**:写 `.factsheet.md` 临时文件(可调试、可复查)vs 纯 in-context(更轻)。倾向落盘但产物目录要标记为临时/可删。
3. **核验门对"查无标识"的处置**:标 `[待确认]` vs 直接删。倾向标记(保留线索,人来定),但会让文档带 `[待确认]` 噪点。
4. **初始栈包范围**:只发 spring-mybatis + 通用地板,还是同时补一个非 Java 栈(如 ts-node/express)来验证"分层真的项目无关"?
5. **要不要顺带把 codebase-exploration 也纳入同一套词汇表**(它的依赖矩阵正好能用 DEPENDS/EXPOSES/PERSISTS 当列)——还是先只做 module-brief、稳定后再外推。
```

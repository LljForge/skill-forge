# codebase-exploration v0.6.0 全面改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `codebase-exploration` 从「Java 绑定的一次性非权威探索草稿」重构为「跨栈、更可靠、靠慢变内容纪律不易过时的活地图」，含能力 ①模块测绘(跨栈) + ⑤约定与横切机制，作人/AI 双受众的项目资产。

**Architecture:** 共享基础设施（信号配方层 / 慢变纪律闸 / 双受众活文档产物契约）× N 能力。信号配方层走 (iii) 混合：通用名模式抄 GitNexus（重表述）+ 蒸馏框架约定速查表当派生种子 + 长尾运行时派生 + Java 首份结晶。测绘方法主干（依赖矩阵 1.A–1.D）沿用 v0.5.0，只把 1.A 机械采集改为「跑配方信号槽」。

**Tech Stack:** 纯 Markdown skill（SKILL.md + references/example.md + CHANGELOG.md）。无代码、无 pytest。**"测试" = ① 每节对照「验收标准」自检；② dogfood 重跑（GitNexus 证跨栈、Java 仓库证非回归）。** 验证产物（生成的 codebase-map.md）作证据、不入 skill 提交。

**这是 SKILL.md 的渐进重写**：每个 SKILL.md 任务产出一个**完整的节**（无占位符），文件按节增量替换；重写期间文件可能少节但每个在场的节都完整。最后一个 SKILL.md 任务做整体连贯性收口。源 spec：`docs/superpowers/specs/2026-06-21-codebase-exploration-overhaul-design.md`。

## Global Constraints

- **轻量本色**：grep+LLM、零依赖、不接 GitNexus、不上 tree-sitter、不下钻代码细节（细节委托 `/module-brief`）。
- **慢变内容纪律闸**：只写抗重构结构（边界/职责/依赖形状与方向/分层/入口约定/横切约定/实体↔模块归属/真陷阱）；剔除易变细节（行号/精确文件类计数/穷举 PO 列表/随提交而变的度量/实现细节）。全文度量数字 ≤ ~8 处。
- **机械/智能分工铁律（守 v0.3.x 血泪）**：配方只定「grep 什么」（机械，可借 Bash）；归并/强度/反向异味/约定识别仍是 agent 现场智能判，**禁脚本化**（禁写一站式大脚本、禁把智能子任务塞进 Python）。
- **守 v0.3.4**：契约措辞强度别砍——「机械 vs 智能」分工陈述、「别把智能任务脚本化」的论证句必须显式留在 SKILL.md。
- **许可证护栏**：GitNexus 为 PolyForm Noncommercial；**不抄其源码、不 vendoring、不依赖**；借「框架怎么摆文件」这类公共事实约定，用自己的话重表述。
- **契约不变**：下游仍 `/module-brief <模块>`；与 `module-brief`/`module-spec-baseline` 三者互不依赖不变。
- **版本**：v0.6.0。
- **文件**：仅改 `skills/codebase-exploration/{SKILL.md, references/example.md, CHANGELOG.md}`。

---

## File Structure

| 文件 | 职责 | 本计划动作 |
|---|---|---|
| `skills/codebase-exploration/SKILL.md` | skill 主体（灵魂/能力框架/信号配方层/①②⑤测绘法/慢变闸/产物 schema/自检） | 渐进重写（Task 1–8） |
| `skills/codebase-exploration/references/example.md` | 产物格式锚点示例 | 重写为**跨栈(TS)**示例（Task 9） |
| `skills/codebase-exploration/CHANGELOG.md` | 变更日志（历史不改写，前插新版） | 前插 v0.6.0 条目（Task 10） |
| 〔证据，不提交进 skill〕生成的 `codebase-map.md` | dogfood 验证产物 | Task 11–12 产出、留作证据 |

执行前先读：现 `skills/codebase-exploration/SKILL.md`（v0.5.0，193 行）、`references/example.md`（205 行）、`CHANGELOG.md`（v0.1.0–v0.5.0），以掌握既有「灵魂三底线 / 依赖矩阵 1.A–1.D / 7 节产物 / 卡片模板 / 栈陷阱」措辞强度与待保留契约。

---

### Task 1: SKILL.md — frontmatter description + 灵魂定位反转

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（frontmatter + 开头「灵魂」节）

**Interfaces:**
- Produces: 新 `description`（触发场景 + 跨栈 + 活地图/AI 指引 + 能力 ①⑤）；新「灵魂」节（定位=活文档、校准收窄、慢变纪律入魂、读者优先/边界用度量定保留）。后续任务引用「灵魂」第 2 条 scope 与「读者优先」。

- [ ] **Step 1: 改写 frontmatter `description`**

  保留现有「主动触发场景」措辞强度（"我刚接手这个项目"/"画个项目地图"等），并入：跨栈适用（不再限 Java）、产物是「不易过时的活地图，可作项目资产 + AI 编程指引」、当前能力 = ①模块测绘(跨栈) + ⑤约定与横切机制。**保留**末句与邻居 skill 的分工导向（`module-brief` 深入单模块 / `module-spec-baseline` openspec 基线）。

- [ ] **Step 2: 改写「灵魂」节（定位反转 + 校准收窄）**

  必须包含这些要点（用 SKILL 现有的强措辞风格写实）：
  - 标题/定位从「探索草稿·非权威·可能错」→「**项目结构地图（活文档）**」：记录慢变的架构结构，可作人接手的资产 + AI 编码的架构指引。
  - **三底线保留但调整**：① 读者优先（讲业务不讲分析过程，度量是分析者工具不入产物）——不变；② 边界用度量定、不甩读者（"该合该分"由 skill 定）——不变；③ **校准收窄**：置信标记（高/中/低）**只留在真正模棱两可的边界**，去掉一刀切「草稿·非权威」自贬；慢变纪律天然抬高权威度（易变细节已被剔除）；要核实细节 → `/module-brief`。
  - **慢变纪律入魂**一句：地图只写抗重构的慢变结构，这既是不易过时的根、也是后文「能力准入闸」的依据。
  - **保留**与邻居 skill 的分工表（codebase-exploration / module-brief / module-spec-baseline 三行，互不依赖）。

- [ ] **Step 3: 验收自检（对照标准）**

  逐条核对，全 PASS 才算完成：
  - [ ] description 含「跨栈」「活地图/AI 指引」「①⑤ 能力」，保留主动触发措辞 + 邻居分工导向。
  - [ ] 灵魂节定位是「活文档/资产/AI 指引」，**无**「探索草稿·非权威·可能错」的一刀切自贬。
  - [ ] 置信标记被明确收窄到「模棱两可的边界」。
  - [ ] 读者优先 + 边界用度量定 两条底线**仍在**；邻居分工表**仍在**。

- [ ] **Step 4: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "refactor(codebase-exploration): 定位反转草稿→活文档 + 校准收窄 + description 跨栈化 (v0.6.0 WIP)"
```

---

### Task 2: SKILL.md — 能力框架 + 慢变纪律准入闸

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（「能力清单」节 + 新增「慢变纪律闸」节）

**Interfaces:**
- Consumes: Task 1 的「灵魂·慢变纪律入魂」。
- Produces: 能力清单（① + ⑤ 在场，②③④ 留槽）；「慢变纪律闸」节含**进/出表** + 准入原则 + impact 排除示例。后续 Task 5/6（①⑤测绘法）与 Task 7（产物 schema）引用此闸。

- [ ] **Step 1: 改写「能力清单」节**

  - 表述为**多能力探索框架**（沿用现有"加节不动骨架"骨架表述）。
  - 本轮在场：**① 模块测绘（跨栈化）** + **⑤ 约定与横切机制**。
  - **未来能力槽（留槽不建）**：② 入口与执行流 / ③ 数据模型 / ④ API 表面——一行点名，注明"加节不动骨架，待后续单独开"。
  - 一句**准入原则**前置：任一能力当且仅当能在「慢变·高层·抗重构」粒度表达，才准进地图。

- [ ] **Step 2: 新增「慢变纪律闸」节（进/出表 + 准入闸）**

  内容须含这张表（**逐字**）：

  | 进（抗重构的慢变结构） | 出（易变细节，交 `/module-brief`） |
  |---|---|
  | 模块边界与职责、分层 | 行号、精确文件/类计数 |
  | 依赖**形状与方向** | 穷举 PO/类清单 |
  | 入口约定、横切约定 | 随提交而变的度量 |
  | 核心实体↔模块归属 | 具体实现细节 |
  | 真陷阱（同表多映射 / hub / 触发器隐式耦合） | — |

  并写明：① 这张表**既是产物过滤器、也是能力准入闸**；② **impact（影响面/改动半径）因随每次提交而变、落「出」栏，故排除在地图之外**（留 `/module-brief` 或临时查询）——这条排除就是闸门的示范；③ 度量数字处理沿用现规则（翻成读者结论、全文 ≤ ~8 处）。

- [ ] **Step 3: 验收自检**
  - [ ] 能力清单：①⑤ 在场、②③④ 显式留槽、准入原则前置。
  - [ ] 进/出表逐字在场；impact 排除有明确陈述并归因到慢变闸。
  - [ ] 度量 ≤ ~8 处规则保留。

- [ ] **Step 4: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "feat(codebase-exploration): 能力框架(①⑤+②③④留槽) + 慢变纪律准入闸(进出表, impact 排除)"
```

---

### Task 3: SKILL.md — 信号配方层 §5（信号槽 + 通用名模式）

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（新增「信号配方层」节，第一半）

**Interfaces:**
- Produces: 通用信号槽表 + 通用入口点/噪音名模式（可直接 grep 的正则）。Task 4 续写本节的「框架速查表 + 派生协议 + 护栏」；Task 5/6 的测绘法消费这些信号槽。

- [ ] **Step 1: 写「信号配方层」节引子 + 通用信号槽表**

  引子：本 skill **不携带 16 份硬编码栈配方**；携带「通用信号槽模型 + 通用名模式 + 框架约定速查表（种子）+ 派生协议 + Java 首份结晶参考」。配方只回答「这个栈里，每个信号槽该 grep 什么」。

  逐字写入信号槽表：

  | 信号槽 | 服务能力 | Java 参考填法 | 跨栈含义 |
  |---|---|---|---|
  | 模块单元 | ① | package 目录 | 该栈"候选模块边界"是什么（TS 特性目录 / Go package / Python package） |
  | 导入依赖边 | ① | `import <root>.` | 跨文件/模块依赖怎么表达 |
  | 依赖装配（强度） | ① | `@Autowired`/`@Resource`/构造注入 | 依赖怎么接线 → 定 Injected vs Import-only |
  | 入口点 | ①⑤ | Controller / `@Scheduled` / main | 路由/CLI/定时/消费者/main |
  | 数据访问 | ① | MyBatis / `@TableName` | ORM/repo → 表/实体映射（辅助锚定模块） |
  | 自声明清单 | ① | Maven `<modules>` / `@ComponentScan` | 构建/模块声明（起骨架） |
  | 横切件 | ⑤ | `@Aspect` / HandlerInterceptor | AOP/middleware/拦截器/装饰器/filter/guard |
  | 约定锚点 | ⑤ | base 类 / 全局异常处理器 / SecurityConfig | 认证/错误/日志/配置/事务/缓存 在哪定义 |

- [ ] **Step 2: 写「通用名模式」子段（直接可 grep）**

  说明这些是真·语言无关、已被 16 栈验证的入口/噪音名模式（用自己的话表述，正则为公共事实）：

  入口点通用名模式：
  - `^(main|init|bootstrap|start|run|setup|configure)$`（忽略大小写）
  - `^handle[A-Z]`、`^on[A-Z]`、`Handler$`、`Controller$`
  - `^(process|execute|perform|dispatch|trigger|fire|emit)[A-Z]`

  噪音/工具名模式（**降权**，非入口）：
  - `^(get|set|is|has|can|should|will|did)[A-Z]`、`^_`
  - `^(format|parse|validate|convert|transform)`（i）、`^(log|debug|error|warn|info)$`（i）
  - `^(to|from)[A-Z]`、`^(encode|decode)`（i）、`^(serialize|deserialize)`（i）
  - `Helper$`、`Util$`、`Utils$`、`^utils?$`、`^helpers?$`

  注明：每栈在通用模式基础上**叠加**该栈特有入口名（如有），不替换。

- [ ] **Step 3: 验收自检**
  - [ ] 信号槽表逐字在场（8 槽、服务能力标注、Java 参考填法、跨栈含义）。
  - [ ] 通用入口/噪音模式完整、表述为「公共事实重述」而非「抄 GitNexus 代码」。
  - [ ] 明确「不携带 16 份硬编码栈配方」。

- [ ] **Step 4: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "feat(codebase-exploration): 信号配方层(上)—通用信号槽表 + 跨栈通用名模式"
```

---

### Task 4: SKILL.md — 信号配方层 §5（框架速查表 + 派生协议 + 护栏）

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（续写「信号配方层」节，第二半）

**Interfaces:**
- Consumes: Task 3 的信号槽 + 通用名模式。
- Produces: 蒸馏框架约定速查表、栈探测规则、运行时派生协议、Java 结晶参考指针、许可证 + 机械/智能护栏。Task 5（①）消费框架速查表的入口/数据访问条目；Task 6（⑤）消费横切条目。

- [ ] **Step 1: 写「框架约定速查表（派生种子）」子段**

  说明：从公共框架约定蒸馏（覆盖广度对标 GitNexus 的 ~13 生态），**作派生起点、非穷举**；agent 探测到栈后查表起步、现场补。逐字写入紧凑速查表：

  | 栈 | 入口/路由约定 | 依赖装配 | 数据访问 | 横切件 |
  |---|---|---|---|---|
  | JS/TS | Next.js `pages/*`·`app/**/page.*`·`app/**/route.ts`(api)·`layout.*`；Expo `*+api.*`/screens；Express/MVC `routes/`·`controllers/`·`handlers/` | NestJS `@Injectable`/构造注入；否则手工 wiring | Prisma/TypeORM/Drizzle；`schema.prisma` | NestJS guard/interceptor/middleware；Express middleware |
  | Python | Django `views.py`·`urls.py`；FastAPI/Flask `@app.get`/`APIRouter`；入口 `main.py`/`manage.py` | 多显式构造；FastAPI `Depends` | SQLAlchemy/Django ORM | 装饰器 / middleware |
  | Go | `main.go`；handlers/routes/controllers 目录；gin/echo/fiber 路由 | 显式构造/wire | gorm/sqlx | middleware 链 |
  | Java/Spring（**Java 结晶参考**） | `@RestController`/`@Controller`·`@Service`·`@Scheduled` | `@Autowired`/`@Resource`/构造注入 | MyBatis/`@TableName`/JPA | `@Aspect`/HandlerInterceptor；全局异常处理器；SecurityConfig |

  注明：新栈缺行 → 照槽模型 + 通用名模式现场派生；某栈跑顺了**结晶**进本表成第二份参考。

- [ ] **Step 2: 写「栈探测」子段**

  按 manifest 探测：`pom.xml`/`build.gradle`→Java；`package.json`+`tsconfig`→TS；`pyproject.toml`/`requirements.txt`→Python；`go.mod`→Go；……多栈仓库**各跑各配方再合并**（合并时模块单元按各自栈边界、跨栈依赖边按文件归属栈判强度）。

- [ ] **Step 3: 写「护栏」子段（许可证 + 机械/智能铁律，守 v0.3.x/v0.3.4）**

  **逐字保留这两条契约措辞强度**（不得精简为一句）：
  - **机械/智能分工铁律**：配方只定「grep 什么」（机械，1.A 用 Bash grep 已足够）；归并/强度/反向异味/约定识别是**当前 agent 的智能任务**（需项目特有锚 PO/语境/拓扑判断），**不要做成脚本**（脚本化需硬编码项目锚表、违通用定位）。**禁把"派生配方"当借口把智能归并也机械化。** 未来某子动作反复机械重复才考虑建辅助脚本，现在不预设。
  - **许可证护栏**：不抄 GitNexus 源码、不依赖它；借的是「框架怎么摆文件」这类公共约定事实，用自己的话重表述。

- [ ] **Step 4: 验收自检**
  - [ ] 框架速查表逐字在场（≥4 栈，Java 标为结晶参考）。
  - [ ] 栈探测规则按 manifest，含多栈合并说明。
  - [ ] **机械/智能铁律 + 禁脚本化论证句完整在场**（对照现 CHANGELOG v0.3.4 的措辞强度，未被精简）。
  - [ ] 许可证护栏在场。

- [ ] **Step 5: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "feat(codebase-exploration): 信号配方层(下)—框架速查表 + 栈探测 + 机械/智能铁律 + 许可证护栏"
```

---

### Task 5: SKILL.md — 能力① 跨栈模块测绘（1.A recipe 化 + 保留 Java 深度）

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（「能力①：模块测绘」节，含测绘两步 + 栈陷阱 + 信号源）

**Interfaces:**
- Consumes: 信号配方层（Task 3/4）、慢变闸（Task 2）。
- Produces: 跨栈测绘法（1.A 改 recipe-driven，1.B–D 保留智能判定 + Java 陷阱）。Task 7 产物 schema 的卡片/矩阵消费其输出。

- [ ] **Step 1: 改写「核心认知 + 关键架构约束 + 测绘两步」**

  - 保留「包 ≠ 模块」「模块粒度 = `/module-brief` 单次可消化」「伞形包拆够」核心认知。
  - **1.A 采集（机械）改为 recipe 驱动**：跑配方「导入依赖边 + 依赖装配 + 数据访问」信号槽的 grep（Java 仍用 import 全集 + **扁平分层同包补扫**；其它栈用各自配方）。**保留**扁平分层同包补扫的完整契约句（grep import 必漏同包互调，需按类名补扫）。
  - **1.B–D（智能）逐字保留措辞强度**：归子模块（包即模块 / 扁平分层按类名前缀 + 锚 PO 交叉判）、强度分档（Injected/Import-only/Adapter）、反向异味标注（基础设施<底层<编排<顶层 直觉粗排 + 双向耦合若一方是横切/日志出站视作正向）。把这些表述为**跨栈通用 + Java 为锚例**（不删 Java 锚例，标注"以 Java 为例，其它栈同理按各自配方"）。
  - 保留「关于辅助脚本（防误用）」整段（v0.3.4 已证不可砍）。

- [ ] **Step 2: 改写「信号源」+「栈陷阱」**

  - 信号源：起骨架（自声明清单：`@ComponentScan`/Maven `<modules>` / TS workspaces / go.mod）、纵向绑定（ORM 映射/注入边）、跨切面=共享度、三视角交叉（代码关系/路由树/数据）。**非 Java 栈：换该栈 ORM/DI/路由，原理同**——这句保留并强化为跨栈总则。
  - 栈陷阱：保留全部现有条目（伞形包 / 扁平分层 / 适配器集合 / `Base*` 假前缀 / 审计层伪装 + **写入路径必 grep 核实** / 扁平 CRUD 编排外移 / 同表多 PO / **依赖方向必出依赖矩阵不望名生义**）。把每条标注「Java 为典型例，跨栈同理」，并对明显 Java 专属的（MyBatis 同表多 PO、触发器）注明"对应栈的同类陷阱由配方/agent 识别"。

- [ ] **Step 3: 验收自检**
  - [ ] 1.A 改为 recipe 驱动；扁平分层同包补扫契约句**完整保留**。
  - [ ] 1.B–D 智能判定 + 双向耦合豁免 + 「关于辅助脚本」段**完整保留**（措辞强度对照 v0.3.4 未退化）。
  - [ ] 栈陷阱全条目在场，且非 Java 栈泛化句在场（"换该栈 ORM/DI/路由原理同"）。
  - [ ] 无任何「写一站式大脚本」或「1.B–D 脚本化」的诱导。

- [ ] **Step 4: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "feat(codebase-exploration): 能力①跨栈测绘—1.A recipe 化 + 保留 Java 智能判定/陷阱/防脚本契约"
```

---

### Task 6: SKILL.md — 能力⑤ 约定与横切机制

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（新增「能力⑤：约定与横切机制」节）

**Interfaces:**
- Consumes: 信号配方层「横切件 + 约定锚点」槽（Task 3/4）、慢变闸（Task 2）。
- Produces: ⑤ 测绘法。Task 7 产物 schema 第三节消费其输出。

- [ ] **Step 1: 写「能力⑤」节**

  须含：
  - **测绘什么（慢变）**：① 横切件（AOP/middleware/拦截器/装饰器/guard/filter——"请求先过谁"）；② 项目约定（认证/错误处理/日志/配置/事务/缓存——每条**在哪定义 + 怎么遵守**）。
  - **信号**：横切件槽 + 约定锚点槽（种子来自框架速查表）+ 现有「共享度抓横切」法（被多文件引用 = 横切）。
  - **慢变纪律**：只记「机制 + 定义点（代表锚点）+ 怎么遵守（一句）」，**不穷举使用点**。给一个**可执行约定规则**范例（逐字）：
    > `认证 — 所有 Controller 经 JwtAuthFilter（security/JwtAuthFilter）；加新接口默认受保护，放行须进 SecurityConfig 白名单。`
  - **校准（延续灵魂）**：约定确认不了标**存疑**、绝不脑补；**写入路径必 grep 核实**（trigger/AOP/拦截器，呼应 v0.1.1）。
  - **边界**：⑤「不当业务模块」，与 ① 业务卡片分开。

- [ ] **Step 2: 验收自检**
  - [ ] 横切件 + 6 类项目约定（auth/error/log/config/事务/缓存）齐。
  - [ ] 强调「机制+定义点+怎么遵守」、不穷举使用点；可执行约定规则范例在场。
  - [ ] 校准存疑 + 写入路径 grep 核实 在场；「不当业务模块」在场。

- [ ] **Step 3: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "feat(codebase-exploration): 能力⑤约定与横切机制—约定即 AI 规则 + 校准存疑"
```

---

### Task 7: SKILL.md — 产物 schema（7 节 + 卡片 + 矩阵 + §7 新鲜度 + AGENTS.md 指针）

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（「产物 schema」节，含七节表 / 卡片模板 / 矩阵 schema / 处理段）

**Interfaces:**
- Consumes: ①⑤ 测绘法、慢变闸。
- Produces: `docs/codebase-map.md` 的完整产物契约。Task 8 自检引用此 schema；Task 9 example.md 实例化此 schema。

- [ ] **Step 1: 写七节产物表（演进自现 7 节）**

  逐字写入：

  | 节 | 内容 |
  |---|---|
  | 一 技术栈与分层 | 栈 / 构建运行 / 分层，一行带过 |
  | 二 模块总览 + 模块清单 | ① 能力：跨栈模块单元 + 读者卡片（边界/职责/入口/依赖摘要/置信） |
  | 三 约定与横切机制 | ⑤ 能力：横切件 + 项目约定（auth/error/log/config/事务/缓存），各一句作用 + 怎么遵守 |
  | 四 改动前必读 / 陷阱 | 慢变真陷阱（同表多映射命名误导 / 核心 hub / 触发器隐式耦合 / 编排位置） |
  | 五 上手顺序 | 拓扑序从第六节派生、按层分组每层一表；末列 ✅跑/⚖️你定/⬜不跑 + 理由 + `➡️ /module-brief` 命令 + 顶部三态图例 |
  | 六 模块依赖矩阵 | 依赖**形状**：`源模块 \| 目标 \| 强度(Injected/Import-only/Adapter) \| 代表锚点`；单一权威源；**代表非穷举** |
  | 七 新鲜度与重生 | 见 Step 3 |

  **文件头**：`generated_by`/`generated_at` frontmatter + 头部声明改为「**项目结构地图（活文档）**」（去「探索草稿·非权威」一刀切自贬，仅保留"可疑边界已标低置信，核实见 /module-brief"）。

- [ ] **Step 2: 写卡片模板 + 矩阵 schema + 三态/拓扑处理段**

  - **卡片模板**（≤8 行，逐字）：

  ```
  ### `<模块 kebab>` <名>（<伞形包名> 子模块）　置信：<高/中/低>
  - **干什么**：一句业务人话（20–50 字）
  - **入口**：主要入口 2–3 个（读流程从这进）
  - **锚 实体/表**：核心 2–3 个，带 [来源] 一句
  - **依赖摘要**：1 行业务侧重（全集见第六节）
  - ⚠️ **要注意**（若有）：具体陷阱一行一条
  ```
  伞形包子模块标题带 `(<伞形包名> 子模块)`；独立单一模块不带括号。

  - **第六节矩阵 schema**（逐字含强度档定义 + 完整度契约）：跨子模块依赖必须全列（含 Import-only 弱依赖）；adapter 标 `Adapter`；本子模块内 import 不列；反向依赖标 `(反向异味)`；**锚点取代表、非穷举**。
  - **三态/拓扑处理段**：保留现有 ✅跑/⚖️你定/⬜不跑 三态逻辑（扇出 OR 逻辑厚薄取或、hub 薄却最该析护栏、薄底座说明情况交读者、守边界注），命令 `/module-brief`。

- [ ] **Step 3: 写第七节「新鲜度与重生」（逐字模板）**

  ```
  ## 七、新鲜度与重生
  - 本地图基于 commit `<生成时 HEAD 短哈希>` 生成（generated_at: <日期>）。
  - **该刷新吗**：跑 `git diff --stat <commit>..HEAD`，若出现**模块目录增删**或 **manifest（pom/package.json/go.mod/pyproject）变更** → 结构可能变了，建议刷新。仅业务逻辑改动、无新增/删除模块 → 慢变结构通常仍准。
  - **一键重生**：重跑 `codebase-exploration`（覆盖本文件）。
  ```
  并写一句**AGENTS.md/CLAUDE.md 指针**指令：生成后在项目 `AGENTS.md`/`CLAUDE.md` 加一行指针「架构地图见 `docs/codebase-map.md`」（若文件存在；不并入正文、不覆盖既有内容）。

- [ ] **Step 4: 验收自检**
  - [ ] 七节表逐字在场（三节=⑤升级、七节=新鲜度新增）；文件头=活文档、无一刀切自贬。
  - [ ] 卡片模板 ≤8 行、锚点字段跨栈化（"实体/表"非仅"PO"）。
  - [ ] 矩阵 schema 含「代表非穷举」；三态逻辑 + hub 护栏完整保留。
  - [ ] 第七节新鲜度模板逐字在场；AGENTS.md 指针指令在场（一行指针、不并入）。

- [ ] **Step 5: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "feat(codebase-exploration): 产物 schema—7节演进(⑤升级三节+新鲜度七节) + 活文档头 + AGENTS.md 指针"
```

---

### Task 8: SKILL.md — 自检 checklist 更新 + 整体连贯收口

**Files:**
- Modify: `skills/codebase-exploration/SKILL.md`（「自检」节 + 通读全文收口）

**Interfaces:**
- Consumes: 前 7 任务全部产出。
- Produces: 反映 ①⑤/跨栈/慢变闸/新鲜度/定位反转的自检；最终连贯的 SKILL.md。

- [ ] **Step 1: 改写「自检」节（分析者内部 checklist，不入产物）**

  在保留现有有效条目基础上，增改为反映新设计（每条仍以"不入 codebase-map.md"为前提）：
  - [ ] 文件头=活文档 + frontmatter（含生成时 commit）；**无**一刀切「草稿·非权威」自贬。
  - [ ] 全局总览覆盖所有顶层模块单元（按检测到的栈）；适配器集合未混进业务模块。
  - [ ] 伞形包拆够（单一业务域，`/module-brief` 单次可消化）。
  - [ ] 卡片 ≤8 行、未塞易变细节（行号/精确计数/穷举清单/grep 命令/判型依据）。
  - [ ] 第六节依赖矩阵完整（跨子模块全列、强度全标、反向异味标、**锚点取代表**）。
  - [ ] 第五节拓扑序从第六节派生、无矛盾；三态 + hub 护栏在。
  - [ ] **第三节⑤**：横切件 + 项目约定齐，每条「机制+定义点+怎么遵守」、未穷举使用点、确认不了标存疑。
  - [ ] **第七节新鲜度**在场（commit + 漂移自检 + 一键重生）。
  - [ ] **慢变闸生效**：通读产物，「出」栏的易变细节是否漏入？度量 ≤ ~8 处；全文 0 处"需人裁决/需业务确认"。
  - [ ] 每模块有置信；读者优先回看（新人 5 分钟读懂"有哪些模块/各自干啥/怎么调/改哪有坑/从哪读起 + 守什么约定"）。
  - 保留「自检失败收敛重修，上限 3 次，仍不达标如实报告」。

- [ ] **Step 2: 整体连贯通读**

  通读整份新 SKILL.md，确认：节序顺畅（灵魂→能力框架+慢变闸→信号配方层→①→⑤→产物 schema→自检）、无残留 v0.5.0 旧措辞（如仍写"探索草稿·非权威"为定位、仍写死 Java-only 信号且无跨栈泛化）、无内部矛盾、无占位符。修正发现的不一致。

- [ ] **Step 3: 验收自检**
  - [ ] 自检 checklist 覆盖 ①⑤/跨栈/慢变闸/新鲜度/定位反转。
  - [ ] 全文无 v0.5.0 残留旧定位、无占位符、节序连贯。

- [ ] **Step 4: Commit**

```bash
git add skills/codebase-exploration/SKILL.md
git commit -m "feat(codebase-exploration): 自检 checklist 更新(①⑤/跨栈/慢变闸/新鲜度) + 全文连贯收口"
```

---

### Task 9: references/example.md — 重写为跨栈(TS)示例

**Files:**
- Rewrite: `skills/codebase-exploration/references/example.md`

**Interfaces:**
- Consumes: Task 7 的产物 schema。
- Produces: 一份**非 Java（TS/Node 服务）**虚构示例，实例化新 schema——证明去 Java 绑定 + 展示活文档头/⑤节/新鲜度脚。

- [ ] **Step 1: 重写 example.md**

  - **构造一个虚构 TS/Node 后端**（如 Fastify/NestJS + Prisma + Redis + BullMQ），**明确标注"虚构·格式示例"**（脱敏、不指真实项目）。
  - **文件头**：frontmatter（`generated_by`/`generated_at`/`stack: typescript`/生成时 commit）+ 「**项目结构地图（活文档）**」声明（非"探索草稿·非权威"）。
  - **七节齐**：一 技术栈与分层；二 模块总览+若干 TS 模块卡片（kebab、锚"实体/表"用 Prisma model）；**三 约定与横切机制**（如：认证=Fastify `authPlugin`、错误=全局 `errorHandler`、日志=`pino` logger、配置=`config/env`、事务=Prisma `$transaction`、缓存=`cacheService`——各"机制+定义点+怎么遵守"）；四 改动前必读；五 上手顺序（三态表 + `/module-brief` 命令）；六 模块依赖矩阵（TS import/DI 锚点，代表非穷举）；**七 新鲜度与重生**（commit + 漂移自检 + 重生）。
  - 体现慢变纪律：无行号/精确计数/穷举清单；度量 ≤ ~8 处。

- [ ] **Step 2: 验收自检**
  - [ ] 是**非 Java(TS)** 示例、标注"虚构·格式示例"。
  - [ ] 文件头=活文档 + 生成时 commit；七节齐含⑤节与新鲜度节。
  - [ ] 卡片锚点用 TS/Prisma（非 PO/MyBatis）；矩阵锚点 TS 化、代表非穷举。
  - [ ] 慢变纪律体现（无易变细节、度量 ≤ ~8）。

- [ ] **Step 3: Commit**

```bash
git add skills/codebase-exploration/references/example.md
git commit -m "docs(codebase-exploration): example.md 重写为跨栈 TS 示例(证去 Java 绑定) + ⑤节 + 新鲜度节"
```

---

### Task 10: CHANGELOG.md — 前插 v0.6.0 条目

**Files:**
- Modify: `skills/codebase-exploration/CHANGELOG.md`（顶部前插，**不改写 v0.1.0–v0.5.0 历史**）

**Interfaces:**
- Consumes: Task 1–9 实际改动。

- [ ] **Step 1: 前插 v0.6.0 条目**

  按现有 CHANGELOG 体例（背景 / 实际改动表 / 设计决策记录 / 取证 / 已知妥协），写实：
  - **背景**：四轴动因（去 Java 绑定 / 能力扩展过慢变闸 / 更可靠高层 / 不易过时活资产+AI 指引）；GitNexus 深挖为灵感（借知识目录、不接引擎）。引用 spec `docs/superpowers/specs/2026-06-21-codebase-exploration-overhaul-design.md`。
  - **实际改动表**：SKILL.md（信号配方层(iii)混合 / 能力框架①⑤+慢变准入闸 / 产物 schema 三节升级+七节新增 / 定位反转）、example.md（跨栈 TS 重写）。
  - **设计决策记录**：D1–D8（路线 A、慢变准入闸、①⑤+②③④留槽、(iii)混合借 GitNexus、慢变纪律为主、独立产物+AGENTS.md 指针、定位反转、不另起机器层）。
  - **守护护栏**：明记「守 v0.3.4——机械/智能分工 + 防脚本化契约措辞强度未砍」。
  - **取证（待执行）**：跨栈 dogfood on GitNexus（Task 11）、Java 非回归 dogfood on edoc-be（Task 12）。
  - **已知妥协**：跨栈派生覆盖不确定（逐步结晶）、定位反转 vs 校准张力（慢变闸抬权威+置信收窄化解）、矩阵代表锚点轻触类名。
  - **诚实定性**：能力+跨栈+定位的真·重构，非连带收口。

- [ ] **Step 2: 验收自检**
  - [ ] v0.5.0 及以下历史**未被改写**；v0.6.0 前插在顶。
  - [ ] 五段体例齐；守 v0.3.4 护栏明记；诚实定性在。

- [ ] **Step 3: Commit**

```bash
git add skills/codebase-exploration/CHANGELOG.md
git commit -m "docs(codebase-exploration): CHANGELOG v0.6.0—跨栈+多能力+不易过时活地图全面改造"
```

---

### Task 11: 验证 — 跨栈 dogfood on GitNexus（TS monorepo）

**Files:**
- 产出（证据，不提交进 skill）：`/tmp/cbx-validate/gitnexus-codebase-map.md`

**Interfaces:**
- Consumes: 新 SKILL.md（Task 1–8）。

- [ ] **Step 1: 跑新 skill 于 GitNexus**

  目标仓库 `/tmp/gitnexus-research/gitnexus`（TS monorepo，确认存在；不存在则按本计划开头方式重 clone）。按新 SKILL.md 全程跑一遍，产物写到 `/tmp/cbx-validate/gitnexus-codebase-map.md`。

- [ ] **Step 2: 断言（对照已验证的 GitNexus 模块知识 + 设计要求）**

  逐条核（依据本会话 `GitNexus-深度设计文档.md` 的已验证结构）：
  - [ ] **去 Java 绑定成立**：栈探测判为 TS；无 `@Autowired`/MyBatis/PO 等 Java-only 假设残留；模块单元按 TS 目录/特性切。
  - [ ] **模块测绘合理**：识别出 ingestion/pipeline、scope-resolution、lbug(图存储)、mcp(工具)、search/embeddings、group(跨仓)、cli 等主模块单元（与已验证结构大致吻合）。
  - [ ] **依赖方向**：能反映「cli → core → lbug」「mcp/serve/cli 三接口汇聚 LocalBackend」类的高层方向（非望名生义）。
  - [ ] **能力⑤产出**：识别出约定/横切（如 worker pool 解析路径、单写/池化只读 adapter、stdout sentinel 保护 JSON-RPC 等横切机制）至少 3 条，"机制+定义点+怎么遵守"。
  - [ ] **慢变纪律生效**：无行号/精确计数/穷举清单；度量 ≤ ~8 处。
  - [ ] **新鲜度节 + 活文档头**在场。

- [ ] **Step 3: 记录证据**

  把断言结果（PASS/FAIL + 关键质性观察）记进 Task 12 完成后的汇总（或附 CHANGELOG v0.6.0「取证」段补一句实测结论）。**若 FAIL**：定位是配方层覆盖不足还是方法主干漏跨栈泛化，回对应 Task 修，迭代≤2 次后如实报告。

---

### Task 12: 验证 — Java 非回归 dogfood on edoc-be

**Files:**
- 产出（证据，不提交进 skill）：`/tmp/cbx-validate/edoc-be-codebase-map.md`

**Interfaces:**
- Consumes: 新 SKILL.md（Task 1–8）。

- [ ] **Step 1: 跑新 skill 于 Java 仓库**

  目标 `/Users/lilongjian/Projects/edoc-be`（本地 Java/Maven 仓库，已确认有 `pom.xml`）。按新 SKILL.md 跑一遍，产物 `/tmp/cbx-validate/edoc-be-codebase-map.md`。
  > 注：v0.5.0 的「≥87 边」基线属另一仓库（master-data-be），**不可移植到 edoc-be**；本任务做**质性非回归**，非复刻 87 数字。若用户手上有原 master-data-be 仓库，可另跑核 ≥87 边。

- [ ] **Step 2: 断言（Java 配方未退化）**

  - [ ] **Java 配方仍生效**：import 全集 + 扁平分层同包补扫（若该仓是扁平分层）、`@Autowired`/`@Resource` 注入边定强度、MyBatis/`@TableName` 锚表。
  - [ ] **依赖矩阵完整**：跨子模块依赖全列、强度档（Injected/Import-only/Adapter）齐、反向异味标注（若有）。
  - [ ] **Java 陷阱仍触发**：审计层伪装/同表多 PO/触发器写入路径 grep 核实（按该仓实际命中情况，未脑补）。
  - [ ] **能力⑤产出** + **慢变纪律生效** + **活文档头/新鲜度节**在场。
  - [ ] **未因加速降质**：1.B–D 仍智能判定，未退化成一站式大脚本（核对过程无 30–60 行 Python 端到端脚本）。

- [ ] **Step 3: 记录证据 + 收口**

  汇总 Task 11+12 结论。**全 PASS**：v0.6.0 落定，CHANGELOG「取证」段补实测一句。**有 FAIL**：回对应 Task 修，迭代≤2 次；仍不达标如实报告"该栈测绘置信低 / 需后续结晶配方"（诚实 > 假装完成）。

---

## Self-Review

**1. Spec coverage（逐节对照 spec → 任务）**
- §3 D1 路线 A 演进 → Task 5（保留方法主干）✓；D2 慢变准入闸 → Task 2 ✓；D3 ①⑤+②③④留槽 → Task 2/5/6 ✓；D4 (iii)混合 → Task 3/4 ✓；D5 慢变纪律为主 → Task 2/7 ✓；D6 独立产物+指针 → Task 7 ✓；D7 定位反转 → Task 1/7 ✓；D8 不另起机器层 → Task 7（纪律 markdown）✓。
- §5 信号配方层 → Task 3/4 ✓；§6 能力① → Task 5 ✓；§7 能力⑤ → Task 6 ✓；§8 慢变闸 → Task 2 ✓；§9 产物层 → Task 7 ✓；§10 迁移 → Task 1–10、验证 → Task 11/12 ✓；§10.2 守 v0.3.4 护栏 → Task 4/5 显式 ✓；§11 已知妥协 → Task 10 ✓；§12 邻居关系不变 → Task 1（保留分工表）✓。
- 无未覆盖 spec 要求。

**2. Placeholder scan**：各任务的 verbatim 表/模板/正则均为实际内容；连接性散文以「须含要点 + 验收标准」约束（skill-prose 重写的合理粒度，非占位符）。无 TBD/TODO/"类似 Task N"。

**3. Type/命名一致性**：能力编号 ①②③④⑤ 全程一致；信号槽名（模块单元/导入依赖边/依赖装配/入口点/数据访问/自声明清单/横切件/约定锚点）跨 Task 3/4/5/6 一致；产物 7 节编号（一~七）跨 Task 7/8/9 一致；强度档（Injected/Import-only/Adapter）跨 Task 5/7/9/12 一致；三态（✅跑/⚖️你定/⬜不跑）跨 Task 7/9 一致。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-21-codebase-exploration-overhaul.md`.**

> 注：本计划是 **skill-prose 重写 + dogfood 验证**，非代码 TDD——「测试」= 每任务验收标准自检 + Task 11/12 的 dogfood 断言。Task 11/12 会 dispatch subagent 跑 skill，较重。

# GitNexus 深度设计文档

> 调研对象：[abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus)
> 调研方式：克隆源码（HEAD `920958e`，2026-06-19）→ 14 个维度多智能体并行精读源码 → 每个维度对抗式复核（refute-by-default）→ 完整性评审 → 针对性补洞。
> 所有机制结论以**实际 TypeScript/Python 源码**为准，文末「文档与代码的偏差」一节专门记录 README / ARCHITECTURE.md 的过时描述。

---

## 0. 阅读前必读：方法论与「真相来源」原则

这份文档区别于直接复述 README 的关键点：**GitNexus 是一个高速演进的代码库，散文文档（README.md / ARCHITECTURE.md / type-resolution-*.md）普遍落后于代码**。调研中反复出现「文档说 X，代码做 Y」。因此本文确立一条原则，也建议任何二次开发者遵守：

> **真相来源 = 代码里的权威数组/常量**，而非散文。具体而言：
> - 语言集合 → `gitnexus-shared/src/languages.ts` 的 `SupportedLanguages` 枚举
> - 图 schema → `gitnexus-shared/src/lbug/schema-constants.ts` 的 `NODE_TABLES` / `REL_TYPES`
> - MCP 工具集 → `gitnexus/src/mcp/tools.ts` 的 `GITNEXUS_TOOLS`
> - 置信度权重 → `gitnexus-shared/src/scope-resolution/evidence-weights.ts`
> - 流水线阶段 → `gitnexus/src/core/ingestion/pipeline.ts` 的 `buildPhaseList()`

**版本现状（也是 drift 的缩影）**：npm 包 `gitnexus@1.6.7`（`gitnexus/package.json`），但 `CHANGELOG.md` 顶部已发布项停在 `1.5.3`（2026-04-01），`AGENTS.md` 的 changelog 又引用到 `1.8.0`。三处版本号互不一致。本文以源码 HEAD 为准。

---

## 1. GitNexus 是什么

**一句话**：GitNexus 把任意代码库**离线静态分析**成一张知识图谱（文件、符号、依赖、调用链、继承、聚类、执行流），再通过 MCP「智能工具」暴露给 AI 编码 Agent，让 Agent「不再漏看代码」。标语是 *"Building nervous system for agent context"*。

### 1.1 核心命题：Precomputed Relational Intelligence（预计算的关系智能）

这是 GitNexus 区别于「传统 Graph-RAG」的设计灵魂（README.md:640-671）：

| | 传统 Graph-RAG | GitNexus |
|---|---|---|
| 给 LLM 什么 | 原始图边，寄望 LLM 自己多轮探索 | **索引期就预先算好**聚类 / 路径 / 评分 |
| 回答「谁依赖 UserService」 | 4+ 轮查询（找调用者→哪些文件→过滤测试→高风险） | 一次 `impact` 调用返回完整结构化答案 |
| 收益 | — | ① 可靠性（上下文已在响应里，LLM 漏不掉）② Token 效率（无需 10 轮链式查询）③「模型平权」——小模型也能拿到完整架构视图，"compete with Goliath models" |

**关键事实：CLI 索引器完全不调用 LLM**（CLAUDE.md:21、AGENTS.md:20）——索引是纯静态分析。LLM 只在两个可选场景出现：`gitnexus wiki`（生成文档）和 Web UI 的聊天 Agent。

### 1.2 两种交付形态 + 企业版

| | **CLI + MCP（主推）** | **Web UI** |
|---|---|---|
| 形态 | npm 包 `gitnexus`（Node 原生，`node>=22`） | React 19 + Vite + Tailwind v4 单页应用 |
| 解析 | tree-sitter **原生**绑定（0.21.1） | （详见下方纠正）|
| 存储 | LadybugDB 原生单文件 DB | 通过 HTTP 走后端 |
| 面向 | Cursor / Claude Code / Antigravity / Codex / Windsurf / OpenCode 的日常开发 | 快速探索、demo、一次性分析 |
| 许可 | PolyForm Noncommercial 1.0.0 | — |

> **纠正 README 的过时描述**：README 称 Web UI "runs entirely in WebAssembly（Tree-sitter WASM、LadybugDB WASM、in-browser embeddings）/ Everything in-browser, no server"。**代码实测：Web UI 已迁移为瘦客户端**——`gitnexus-web/package.json` 不含 LadybugDB/KuzuDB WASM、不含 transformers；`services/backend-client.ts`（1031 行）把仓库文件夹 POST 到 `http://localhost:4747/api/analyze/upload`，所有查询走 HTTP。源码注释直言 "no WASM DB / Backend client — direct HTTP calls"。ARCHITECTURE.md 的「thin client」描述才是对的。残留的浏览器内「图可视化」模式仍会把整图下到内存，但大图自动跳过（chat-only）。Web 聊天是基于 `@langchain/langgraph` 的 ReAct Agent，名为 "Nexus"，支持 OpenAI/Anthropic/Gemini/Ollama/OpenRouter/DeepSeek/GLM/MiniMax。

**Bridge 模式**是连接两形态的关键缝合点：`gitnexus serve`（默认 `127.0.0.1:4747`）起本地 HTTP API，托管 Web UI 自动探测它，可浏览所有 CLI 已索引的仓库，无需重新上传/索引。

**企业版**（akonlabs.com，SaaS 或自托管）：PR Review（PR 上自动 blast-radius 分析）、自动更新的 Code Wiki、自动重索引、多仓库统一图、OCaml 支持。⚠️ 这些是 README 营销项，OSS checkout 中**无法验证**，应视为商业承诺而非已验证架构。基础版 Code Wiki（`gitnexus wiki`）则确实在 OSS 中。

**交付渠道**：npm + 两个 Cosign keyless 签名（+ SLSA provenance + SBOM）的 Docker 镜像（GHCR + Docker Hub，按 git tag 版本锁定），可选 Sigstore ClusterImagePolicy 在 K8s 准入处强制验签。

### 1.3 整体架构骨架

全文的「脊柱」一句话概括：

> **异构前端（16 种语言 + COBOL/markdown 正则引擎） → 一张统一图 schema → 统一的查询/质量后端。**

```
索引（纯静态，无 LLM）                          查询（三接口，同一后端）
CLI analyze.ts
  └ runFullAnalysis (run-analyze.ts)
       └ runPipelineFromRepo (pipeline.ts)        ┌─ MCP stdio：cli/mcp.ts → mcp/server.ts ─┐
            └ 15 阶段 DAG (runner.ts)             ├─ HTTP 桥：cli/serve.ts → server/api.ts ─┼─→ LocalBackend.callTool
                 └ 内存 KnowledgeGraph            └─ CLI 直连：cli/tool.ts ────────────────┘   （池化只读 adapter）
       └ loadGraphToLbug：CSV 流式 bulk-COPY → LadybugDB（单写 adapter）
       └ registerRepo → ~/.gitnexus/registry.json（MCP 发现）
```

**两个独立的 LadybugDB adapter**（ARCHITECTURE.md 未提及，但是负载承重设计）：
- **写路径** `core/lbug/lbug-adapter.ts`：模块级单例 `Database`+`Connection`，session 锁，单写者（LadybugDB 单写约束）。
- **读路径** `core/lbug/pool-adapter.ts`：每仓库一个只读 `Database` + 最多 8 个预热连接，LRU 上限 5 库、5 分钟空闲淘汰、30s 查询超时。MCP / serve / search / wiki 都走它。

这套「单写者 + 多只读」分离让一个 MCP server 能并发只读服务多个仓库，同时 analyze 持有写锁。

---

## 2. 【Q1】GitNexus 如何支持跨栈（多语言）

跨栈是 GitNexus 最硬核的部分。核心思想：**用一套统一的 capture-tag 词汇抹平各语言 AST 差异，喂给一个语言无关的 scope-resolution 引擎**。

### 2.1 四层语言无关栈

```
第4层  统一图 schema（32 节点表 + 单 CodeRelation 边表）        ← 所有语言最终写入同一词汇
          ↑
第3层  Scope-Resolution 流水线（registry 查找 + MRO + 引用解析）  ← 唯一调用解析路径
          ↑
第2层  LanguageProvider（导入语义/类型配置/export 判定/MRO 策略 + ~40 个钩子）
          ↑
第1层  Tree-sitter 查询（每语言 S-表达式，产出统一 capture tag）
```

- 第2层 `defineLanguage()`（`language-provider.ts`）把 ~40 个钩子组装成一个 Strategy；`languages/index.ts` 用 `satisfies Record<SupportedLanguages, LanguageProvider>` 保证**漏注册一个语言就是编译错误**。
- 第3层另有一个 emit 侧契约 `ScopeResolver`（`scope-resolution/contract/scope-resolver.ts`），注册进 `SCOPE_RESOLVERS`（`pipeline/registry.ts`），由通用 `runScopeResolution` 编排器统一迭代。
- **新增一门语言 = 实现一个 `ScopeResolver` + 注册一行**（ARCHITECTURE.md:187 确认；RING4-1 #942 删除了旧 DAG 和 per-language `MIGRATED_LANGUAGES` 标志）。CI 用 `tsx` 自动发现。

### 2.2 统一 capture-tag 词汇（抹平 AST 差异的核心）

各语言 tree-sitter 查询（以及 COBOL 的正则 tagger）都产出五大类 capture，下游 `ScopeExtractor` 无需知道是哪个 parser：

| 词汇族 | 含义 |
|---|---|
| `@scope.*` | module / class / function → `ScopeKind`（共 6 种：Module/Namespace/Class/Function/Block/Expression）|
| `@declaration.*` | class/function/variable + `@declaration.name` |
| `@import.*` | 单锚点 + `import-decomposer` 把多名导入拆成多条合成 capture（`@import.kind/source/name/alias`）|
| `@type-binding.*` | parameter/constructor/annotation/return/alias/self |
| `@reference.*` | call.free/call.member/write.member/name/receiver/inherits |

继承不再走旧的 `tree-sitter-queries.ts`（#942），而是各语言 `captures.ts` 里合成 `@reference.inherits`。

### 2.3 支持的语言：实际 16 种（README 说 14，是过时的）

`SupportedLanguages` 枚举 16 个成员：**javascript, typescript, python, java, c, cpp, csharp, go, ruby, rust, php, kotlin, swift, dart, vue, cobol**。

- 全部 16 个都有 `LanguageProvider` 和 `ScopeResolver`。
- 分类（`language-classification.ts`）：**14 个 production，Vue + COBOL 为 experimental**。
- README 根 badge 说「14 种」（漏了 Vue + COBOL）；`gitnexus/README.md` 矩阵只列 13（还漏了 Dart）。这些都是文档滞后。

### 2.4 LanguageProvider 与 ScopeResolver 两个契约

- **LanguageProvider**（解析侧）必填 `{id, extensions, treeSitterQueries, typeConfig, exportChecker, importResolver}`，外加几十个可选钩子：`parseStrategy`（`tree-sitter`|`standalone`）、`preprocessSource`（如 C++ 的 Unreal Engine 宏消除 `stripUeMacros`，保持长度/换行）、`emitScopeCaptures`、`cfgVisitor`、`interpretImport`、`receiverBinding`、`mroStrategy`、`extractTemplateConstraints`（C++ SFINAE）等。
- **ScopeResolver**（解析/emit 侧）携带 `resolveImportTarget`、`mergeBindings`（Python LEGB）、`arityCompatibility`、`buildMro`、可选 `emitHeritageEdges`（Ruby include/extend/prepend、Rust impl）、`emitImplicitImportEdges`（Swift SPM 同 target 可见性、Go 包同级）、`applyCaptureSideChannel`（C++ ADL/inline-namespace，从 worker 序列化的 ParsedFile 恢复，无需重解析）。

### 2.5 导入语义：判别联合（8 种 kind）

`ParsedImport` 是判别联合：`named / alias / namespace / reexport / wildcard / dynamic-unresolved / dynamic-resolved / side-effect`。各语言 `interpret.ts` 产出：Python `namespace`+`named`+`wildcard`；TS `named`+`namespace`+`reexport`+`wildcard`+`side-effect`+`dynamic`；Go dot-import 是 `wildcard`；Rust `wildcard`/`namespace`/`reexport`(pub use)/`named`；C# 整命名空间 `namespace`；Swift 整模块 `namespace`；C/C++ `#include` 是 `wildcard`；COBOL `COPY` 是 `named`。finalize 阶段把 wildcard 经 `expandsWildcardTo` 物化为逐个 export 一条 `wildcard-expanded` ImportEdge。

> **重要纠正**：ARCHITECTURE.md 描述的「统一 3-tier 导入解析（same-file 0.95 / import-scoped 0.9 / global 0.5）」及其引用的 `model/resolution-context.ts`、`NamedImportMap`、`importSemantics` 字段、`wildcard-synthesis.ts` 文件**全部已删除/不存在**（RING4-1 #942、RING4-2 #943）。当前真实机制：
> - **导入解析** = configs + factory 模式：每语言在 `import-resolvers/configs/` 声明有序 `ImportResolverStrategy` 链，`createImportResolver()` 组合，**首个非空结果胜出**。返回 `{kind:'files'} | {kind:'package', dirSuffix} | null`（仅 Go 返 `package`）。各语言策略链如 Go 的 `goPackageStrategy`、Rust 的 `crate::/super::/self::` 解析、Python 的 PEP-328 相对导入、JVM 的 `.*` 通配。
> - **跨文件符号解析** = `walkScopeChain` 在 scope 链上行走，**本地 scope.bindings 优先（局部 const 遮蔽导入名）**，再按 `finalized > augmented > namespace > workspace` 通道合并、按 `def.nodeId` 去重。「tier」词汇在 `symbol-table.ts` 注释里残留，但 `0.95/0.9/0.5` 的数字方案已不存在。

### 2.6 MRO 策略：6 种命名策略

`MroStrategy`：`first-wins`（默认；JS/TS/Go/Swift/Dart/PHP/C/Vue）、`c3`（Python）、`leftmost-base`（C++）、`implements-split`（Java/C#/Kotlin，类方法压过接口默认）、`qualified-syntax`（Rust，**不自动解析**，返回 null + 置信度 0.5 + 提示需 `<Type as Trait>::method`）、`ruby-mixin`（Ruby）。

> **微妙陷阱**：存在**两套 MRO 系统**。① scope-resolution 的 `buildMro`（解析时用，Python 实际用的是 `defaultLinearize` BFS-首见，**不是 C3**）；② `mro-processor.ts` 的 `computeMRO`（独立 `mro` 阶段，发 `METHOD_OVERRIDES`/`METHOD_IMPLEMENTS` 边，Python 这里才用真正的 C3）。两者在钻石继承上可能分歧。

### 2.7 类型解析子系统（提升调用边精度的关键，跨 13 语言）

`type-env.ts` 的 `buildTypeEnv()` 是「receiver-constrained call resolution」的支柱：看到 `user.save()` 时推断 `user` 是 `User`，从而优先 `User#save` 而非 `Repo#save`。设计哲学是**保守**（"prefer missing a binding over a misleading one"）：

- 单次 AST 遍历收集绑定 + 统一不动点循环（copy / callResult / fieldAccess / methodCallResult，最多 10 轮，支持任意深度链与逆序）。
- 分层：Tier 0 显式类型注解 → Tier 0b for-loop 元素类型（`CONTAINER_DESCRIPTORS` 区分 `.keys()`/`.values()`）→ Tier 0c 模式绑定（`if let`/`instanceof X x`）→ Tier 1 构造器推断 → Tier 2 赋值链不动点。
- 注释回退：JSDoc / PHPDoc / YARD。
- 跨文件绑定传播：有名导入语言用 AST 抽取；整模块导入语言（Go/Ruby/C/C++/Swift）用 `synthesizeWildcardImportBindings()` 从图导出符号合成。

### 2.8 三类特殊「非 tree-sitter」处理

| 形态 | 机制 | 关键事实 |
|---|---|---|
| **COBOL** | 独立正则处理器 `cobol-processor.ts`（54KB）| `parseStrategy:'standalone'`、`extensions:[]`、`treeSitterQueries:''`。展开 COPY、正则抽 PROGRAM-ID→Module、PERFORM→CALLS、COPY→IMPORTS、EXEC SQL/CICS。**虽然注册了 emitScopeCaptures 和 cobolScopeResolver，但 scope-resolution 阶段显式跳过 standalone provider（`phase.ts:301 continue`）**——cobolPhase 是 COBOL 唯一的边生产者，那些 scope 钩子在生产流水线里是死代码。无 cfgVisitor（PDG 非目标）。|
| **Markdown** | 正则 `markdown-processor.ts` | `.md/.mdx`：`HEADING_RE` 建 Section 节点（含层级 + endLine span），`LINK_RE` 建 IMPORTS 跨链接边。**不是 SupportedLanguages 成员**，无 LanguageProvider，作为独立 markdownPhase 与 cobolPhase 并行。|
| **Vue SFC** | `vue-sfc-extractor.ts` 抽 `<script>` 当 TS 解析 | `vueProvider` 几乎全量复用 TypeScript 设施（`TYPESCRIPT_QUERIES` + TS 钩子）；worker 把 Vue 的 grammar 设为 typescript。Vue 为 experimental。|

> 由此得到一个**横切洞察**：GitNexus 的索引不是「一个统一流水线」，而是**一个统一 tree-sitter + scope-resolution 引擎（覆盖全部 16 种注册语言）+ 两个独立正则引擎（COBOL、markdown）**。注意：散见于旧文档/type-resolution-system.md 的「migrated vs non-migrated 两套调用解析引擎」说法已**过时**——RING4-1 #942 后 scope-resolution 是所有语言的唯一调用解析路径，`call-processor.ts`（16974 字节，仍被 10+ 模块作工具函数引用）只剩工具/框架路由边发射职责，不再是竞争性引擎。

### 2.9 Vendored 原生语法（非 WASM）

CLI 用 tree-sitter **0.21.1 原生 Node 绑定**，仓库里**无 `.wasm` 文件**。npm 解析的语法：typescript/javascript/python/java/cpp/c-sharp/go/rust/php/ruby。**5 个 vendored 语法**（`vendor/`）：`tree-sitter-c`、`tree-sitter-dart`、`tree-sitter-kotlin`、`tree-sitter-swift`、`tree-sitter-proto`（proto 被 vendored 但**无 provider/枚举成员，是无用挂载**）。按**绝对路径**从 `vendor/<name>` 加载（绝不复制进 node_modules——这是 Windows EPERM #2111/#1728 的根因），跑 `node-gyp-build` 对预构建产物（`prebuilds/<platform>-<arch>`）。worker 对每个 vendored 加载 try/catch，缺工具链时 Swift/Dart/Kotlin/C 可缺失而不影响其余。`GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1` 可跳过（C 始终构建）。

### 2.10 跨栈的诚实边界：逐语言成熟度差异巨大

「16 种语言」这个数字掩盖了**逐语言能力差异极大**这一事实。以 Swift 为例（`swift-ingestion-gaps.md` 记录约 30 项缺口）：多跳链 `a.b.c()` 仅解析单跳、trailing closure `items.map { $0.save() }` 的 `$0` 类型不可推、多继承说明符只取首个、conditional conformance 的 `where` 不处理、SPM 跨包导入不解析、`@testable import` 不透明。类型解析特性矩阵（type-resolution-system.md）也显示：模式绑定仅 TS/JS/Java/Kotlin/Go/Rust 支持，C# 不支持；字段类型解析 JS/C/Dart 缺失；Swift 是最简配置。

**设计含义**：跨栈是「广度优先 + 保守降级」——覆盖面广，但每门语言在类型推断/泛型/多跳/MRO/导入语义上的深度参差。任何依赖 GitNexus 跨栈结论的场景都应按语言成熟度打折。

---

## 3. 【Q2】GitNexus 如何划定模块范围

GitNexus 在**三个独立层次**划定「模块」，再叠加一个跨仓库的第四层：

### 3.1 第一层：文件夹结构（File/Folder + CONTAINS）

`structure` 阶段把每个路径按 `/` 拆段，非末段建 `Folder` 节点、末段建 `File` 节点，相邻段用 `CONTAINS` 边（置信度 1.0）连接。这是字面目录树，是最基础的结构模块层级。

### 3.2 第二层：功能社区（Leiden 聚类 → Community + MEMBER_OF）

这是 GitNexus「模块」的查询时主单元。

- **算法确为 Leiden**（vendored `graphology-communities-leiden`，`leiden.detailed()`，非 Louvain）。
- **图构造**：无向图（`allowSelfLoops:false`），节点仅 {Function, Class, Method, Interface}，**聚类边 = CALLS + EXTENDS + IMPLEMENTS**（注意：不止 CALLS，尽管文件 docstring 自称「primarily CALLS」；也**不含 IMPORTS**）。
- **确定性**：`resolution` 大图 2.0 / 小图（≤10K 符号）1.0；用 mulberry32 PRNG，种子 `0xc0de`（49374），保证可复现（incremental≡full-rebuild 等价性测试要求）。
- **大图降噪**：>10000 符号时丢弃置信度 <0.5 的聚类边、剪掉度为 1 的节点。
- **运行约束**：60s 超时，超时则全部归入社区 0。
- **节点生成**：跳过 <2 成员的社区；`heuristicLabel` 取成员文件父目录最常见名（忽略 src/lib/core/utils/common/shared/helpers 这些泛目录），退化到函数名公共前缀，再退化到 `Cluster_N`；`cohesion` = 内部边密度（采样 50 成员）。
- **MEMBER_OF 边**：置信度 1.0，reason `leiden-algorithm`。

> **三个诚实陷阱**：① **Leiden 跑的是无权图**（边无 weight 属性，vendored 默认 `weighted:false`，平行边还被去重）——调用频次/强度对聚类无影响。② **`maxIterations` 参数是空操作**——vendored Leiden 不读它，主循环 `while(true)` 直到收敛，唯一的运行界是 60s 超时。③ **LLM 语义命名（`cluster-enricher.ts`）是死代码**——`enrichClusters` 在 `gitnexus/src` 里零个非测试调用方，生产流水线只用启发式 `heuristicLabel`。

### 3.3 第三层：执行流程（Process + STEP_IN_PROCESS）

把「模块」从静态聚类升维到**动态执行流**。

- **入口点打分**（`entry-point-scoring.ts`）：`score = base × export × name × framework`。`base = calleeCount/(callerCount+1)`（调得多、被调得少者优）；`export` 导出 2.0；`name` 工具函数（get/set/format/parse/Helper…）0.3、入口模式（`^(main|init|bootstrap|...)`、`^handle[A-Z]`、`Handler$`、`Controller$`…）1.5；`framework` 见下。`calleeCount===0` 直接得 0。
- **流程检测**（`process-processor.ts`）：CALLS 邻接（仅置信度 ≥0.5 的边，`MIN_TRACE_CONFIDENCE`）→ 入口点排序取 top 200 → 逐入口 BFS 追踪（`maxTraceDepth 10`、`maxBranching 4`、环检测）→ 子串去重 + 端点去重 → 按长度切到 `maxProcesses`。`maxProcesses` 动态 = `clamp(20, round(symbolCount/10), 300)`，`minSteps 3`。
- **Process 节点**：`processType` = 跨社区(`cross_community`，触达 >1 社区) / 社区内(`intra_community`)；这是**社区层喂给流程层的接口**——流程显式标注跨了哪些模块。
- **缝合 API/Tool 入口**：Process 建好后，把 Route/Tool 节点经 `ENTRY_POINT_OF` 边（置信度 0.85）挂到对应 Process，把 HTTP/MCP-tool 表面缝到执行流。

### 3.4 框架检测（双模，喂入口打分）

- **路径模式** `detectFrameworkFromPath`：~13 生态的 if-梯，返回 entryPointMultiplier（Next.js page/api 3.0、layout 2.0、Django views 3.0/urls 2.0、Spring controller 3.0、Express routes 2.5、Prisma/Supabase 1.5……）。
- **AST 模式** `detectFrameworkFromAST`：匹配定义文本前 300 字符，给节点盖 `astFrameworkMultiplier`（nestjs 3.2、fastapi 3.0、flask 2.8……）。
- ⚠️ **两者独立相乘可能双重计数**：既在框架路径又有框架装饰器的节点会被乘两次（path 一次 + AST 一次），无文档说明。

### 3.5 第四层：跨仓库 group（合约桥，独立子系统）

不走单仓库图，详见 §8。要点：`group.yaml` 把成员路径映射到 registry 仓库；各成员独立索引；抽取器产出 `ExtractedContract`（http/grpc/thrift/topic/lib/include），经匹配级联连成 `CrossLink`，存进 `contracts.json` + 独立的 `bridge.lbug`；`group impact` 先在单成员做本地影响，再经合约桥**单跳**扇出到邻仓。monorepo 内还有 `service-boundary-detector`（按 package.json/go.mod/Dockerfile 等标记文件 + 最长前缀划「service」子范围）。

### 3.6 查询时的模块语义

`local-backend` 把一个符号的 Community 当作它的「module」：`MATCH (n)-[:CodeRelation {type:'MEMBER_OF'}]->(c:Community) RETURN c.heuristicLabel AS module`；impact 报告 `modules_affected`（distinct 社区）和 `processes_affected`（STEP_IN_PROCESS→Process）。

---

## 4. 【Q3】GitNexus 的分析方向与内容

GitNexus 在「每文件结构图」之上抽取**六大应用级分析方向 + 一套可选的程序依赖/污点层**。每个方向对应一个 DAG 阶段，产出特定节点/边类型。

### 4.1 15 阶段流水线 DAG（ARCHITECTURE.md 说 14，是过时的）

`buildPhaseList()` 实际注册 **15 个阶段**（`taintSummaries` 是第 15 个，pdg-gated）：

```
scan → structure → [markdown, cobol] → parse → [routes, tools, orm]
  → crossFile → scopeResolution → pruneLocalSymbols → [taintSummaries(若 --pdg)]
  → [mro, communities, processes（若 !skipGraphPhases）]
```

DAG runner（`runner.ts`）用 Kahn 拓扑排序：重名报错、缺依赖报错、有环则 DFS 回溯出具体环路 `A -> B -> C -> A`（外加「N 个传递依赖被阻塞」计数）。每阶段只拿到**声明的依赖**的输出（防隐藏耦合）；阶段失败包成 `Phase 'X' failed:` 保留 cause。

### 4.2 分析方向 → 阶段 → 节点/边映射

| 分析方向 | 阶段 | 产出 | 关键事实 |
|---|---|---|---|
| **结构/OO 骨架** | `parse` | Class/Struct/Interface/Enum/Function/Method/Property/Variable… + HAS_METHOD/HAS_PROPERTY/DEFINES | worker 线程内 tree-sitter 抽取 |
| **调用/访问/继承** | `scopeResolution` | CALLS / ACCESSES / EXTENDS / IMPLEMENTS / USES | 唯一调用解析路径（详见 §6）|
| **HTTP 路由** | `routes` | Route 节点 + HANDLES_ROUTE（置信度 1.0）+ FETCHES（消费方）| 三源合并：①文件系统约定（Next.js/Expo/PHP）②Laravel facade 链 ③装饰器（NestJS/Spring/FastAPI/Flask/Express）。还抽 `responseKeys`/`errorKeys`（响应形状）和中间件链。**仅 Java 有 provider 级 `extractDecoratorRoutes`（Spring）**，其余装饰器路由走 parse-worker 通用 capture。|
| **MCP/RPC 工具** | `tools` | Tool 节点 + HANDLES_TOOL（置信度 1.0）| 两路：AST `@tool`/`@mcp.tool` 装饰器 + 正则扫含 `inputSchema` 的 TS 工具数组 |
| **ORM 查询** | `orm` | QUERIES 边（置信度 0.9）+ 合成 CodeElement model 节点 | **仅 Prisma + Supabase**（两条硬编码正则）。TypeORM/Sequelize/SQLAlchemy/Eloquent/GORM/Hibernate/裸 SQL 一概不识别。|
| **功能社区** | `communities` | Community + MEMBER_OF | Leiden（§3.2）|
| **执行流程** | `processes` | Process + STEP_IN_PROCESS + ENTRY_POINT_OF | BFS 追踪（§3.3）|
| **方法解析序** | `mro` | METHOD_OVERRIDES / METHOD_IMPLEMENTS（方向 Class→Method）| 置信度分层（§7）|
| **文档结构** | `markdown` | Section 节点 + 跨链接 | 正则 |

### 4.3 可选程序依赖/污点层（`--pdg`，默认关，仅 TS/JS 全功能）

`--pdg` 是**严格叠加**的 6 层流水线，关闭时图字节级一致。M1/M2/M5（CFG/REACHING_DEF/CDG）现已覆盖约 16 种有 `cfgVisitor` 的语言；**M3/M4 污点层仅 TS+JS**（source/sink 模型只为这两者注册）。

| 层 | Issue | 内容 | 算法 |
|---|---|---|---|
| M1 CFG | #2081 | BasicBlock 节点 + CFG 边（边 kind 骑在 `reason` 列）| worker 内按函数建 CFG，经 `cfgSideChannel` 序列化（纯数据，无 AST 引用）|
| M2 REACHING_DEF | #2082 | def→use 数据依赖 | 自动选 SSA-sparse（≥16 块且有可达环）或稠密 GEN/KILL（差分等价 oracle）|
| M3 TAINTED/SANITIZES | #2083 | 过程内污点（5 类 sink：command/code-injection、path-traversal、sql-injection、xss）| 两规则模型 + kind-set 排除型 sanitizer（保留交集 = 越少中和越危险）|
| M4 TAINT_PATH | #2084 | 跨函数污点 | Sharir-Pnueli 摘要 + 按**被调名**连接（非调用点行）的单调不动点；置信度 0.6（低于过程内 1.0）|
| M5 CDG | #2085 | 控制依赖（分支 'T'/'F' 骑 `reason`）| Cooper-Harvey-Kennedy 后支配 + Ferrante 反向 CFG 支配边界；exit 不可达区会跳过（保 soundness）|
| M6 read surface | #2086 | `pdg_query`（controls→CDG / flows→REACHING_DEF）+ `explain`（污点）| 始终锚定 + LIMIT 界（LadybugDB 无关系属性索引）|

所有层都有**每函数边上限**（CFG/CDG 5000、REACHING_DEF 4000、taint findings/fn 200、超长函数 >2000 行跳过），是「以完整性换有界内存/时间」。

### 4.4 暴露给 Agent 的查询能力 = 17 个 MCP 工具

「分析内容」最终通过 MCP 工具回答具体问题。`GITNEXUS_TOOLS` 实际 **17 个**（README 说 16、某调研初稿误说 18，均不对）：

`list_repos, query, cypher, context, detect_changes, check, rename, impact, explain, pdg_query, route_map, tool_map, shape_check, api_impact, group_list, group_sync, trace`

详见 §9.2。

---

## 5. 数据模型与存储（LadybugDB）

### 5.1 混合 schema：每类型一节点表 + 单 CodeRelation 边表

- **节点表 32 张**（`NODE_TABLES`，ARCHITECTURE.md 说 44 是错的）：File, Folder, Function, Class, Interface, Method, CodeElement, Community, Process, Section, Struct, Enum, Macro, Typedef, Union, Namespace, Trait, Impl, TypeAlias, Const, Static, **Variable**, Property, Record, Delegate, Annotation, Constructor, Template, Module, Route, Tool, **BasicBlock**。
- **单边表 `CodeRelation`**，语义 kind 放在 `type STRING` 属性里——刻意如此，让 LLM 写自然 Cypher：`MATCH (f:Function)-[r:CodeRelation {type:'CALLS'}]->(g:Function)`。列：`type STRING, confidence DOUBLE, reason STRING, step INT32`。因 Kuzu 要求声明每对连接节点表，`RELATION_SCHEMA` 列举约 200 个 FROM/TO 对。
- **存储边类型 27 个**（`REL_TYPES`，ARCHITECTURE.md 说 21）：含遗留别名 `OVERRIDES`、`WRAPS`、`QUERIES` 及 7 个 PDG/taint 类型（CFG/REACHING_DEF/TAINTED/SANITIZES/TAINT_PATH/CDG/POST_DOMINATE）。内存 `RelationshipType` 联合更大（还含 INHERITS/USES/DECORATES/BINDS_EVENT_HANDLER/EMITS_EVENT）。
- 节点 id = `${label}:${name}`；Community=`comm_N`、Process=`proc_N`、BasicBlock=`BasicBlock:<file>:<fnLine>:<fnCol>:<blockIdx>`。

### 5.2 CSV 流式 bulk-COPY 装载

内存 `KnowledgeGraph` → `loadGraphToLbug`：单遍流式写 CSV（懒读文件内容，LRU 3000、File 内容截断 10000 字符）→ 关系按 FROM-TO 标签对拆成 `rel_<From>_<To>.csv`（Kuzu 单表 COPY 需要 from=/to= 参数）→ 节点 COPY 与关系 CSV emit **重叠**（唯一单写者安全的并行：节点 COPY 用 conn、关系 emit 写文件）→ 节点完再 COPY 关系（FK 前提）。

> **两个承重事实**：① `COPY_CSV_OPTS` 含 `PARALLEL=false`——**这是正确性所需**：Kuzu 并行 CSV reader 处理不了带引号的嵌入换行（源码内容），会出错或静默错解析（#2203）。② **装载非事务性**（#2226）：每个 COPY 独立提交，中途失败留下半装载 DB，恢复手段是 `--force` 重分析。

### 5.3 嵌入表（CodeEmbedding）+ HNSW

独立 `CodeEmbedding` 表（**不是 ARCHITECTURE.md 说的 `Embedding`**）：`(id PK, nodeId, chunkIndex, startLine, endLine, embedding FLOAT[384], contentHash)`，HNSW `code_embedding_idx`（metric `cosine`）。模型 `snowflake-arctic-embed-xs`（384 维）。Windows 上 VECTOR 扩展会 SIGSEGV，自动退化为 JS 内精确扫描。

### 5.4 磁盘布局

```
<repo>/.gitnexus/
  ├ lbug, lbug.wal, lbug.shadow      # 单文件 DB + sidecar
  ├ meta.json                        # lastCommit/indexedAt/stats/schemaVersion/fileHashes(SHA-256)/incrementalInProgress 脏标
  ├ .gitignore (*)                   # 自动写
  ├ parse-cache/, parsedfile-store/  # 内容寻址缓存（跨分支共享，扁平）
  └ branches/<slug>/{lbug,meta.json} # 非主分支
~/.gitnexus/registry.json            # 全局仓库注册（MCP 发现，GITNEXUS_HOME 可覆盖）
```

> ARCHITECTURE.md 称有 `lbug.lock` 单写锁文件——代码实测**不创建**该文件，OS 级锁在原生 Database 构造器内部；唯一的 `.lock` 是 `${dbPath}.init.lock`（跨进程 init 锁）。

---

## 6. 调用图构建（scope-resolution 引擎，跨栈的承重墙）

CALLS/ACCESSES/USES/EXTENDS 边由一个**4 阶段 per-language 编排器**产出：extract → finalize → resolve → emit。

- **共享 7 步 `lookupCore`**：① 词法 scope 链行走（非空 binding = 硬遮蔽，停止）② receiver 类型 + MRO 行走 ③ owner 作用域贡献者 ④ kind 匹配 ⑤ arity 过滤（有兼容则删不兼容；全不兼容则全删）⑥ 全局回退（仅当 1-3 空、名含 `.`、未遮蔽）⑦ 加性证据组合 + 5 键 tie-break 排序。
- **载重的 emit 顺序（不变式 I1）**：`preEmitInheritance（种 handledSites）→ emitReceiverBoundCalls（先，精确 per-receiver）→ emitFreeCallFallback → emitReferencesViaLookup（后，消费 handledSites 作 skip 集）→ emitImportEdges`。乱序会破坏同名碰撞解析。
- **一次性答案**：`resolveReferenceSites` 每个引用点只取 `resolutions[0]`，无多候选扇出（RFC §4.3）。
- **SemanticModel** 是唯一权威符号存储（不变式 I9），三写阶段后 `Object.freeze`，下游窄化为只读句柄；`reconcileOwnership` 把 scope-resolution 修正的 ownerId 镜像回去（Python 类体方法的典型场景）。

---

## 7. 【Q4】GitNexus 如何控制分析质量

质量控制是贯穿全栈的体系，可归为**三层验证 + 一套置信度生命周期**。

### 7.1 置信度生命周期（连接 Q1+Q2+Q4 的「结缔组织」）

**置信度是 GitNexus 质量控制的中枢**：跨栈解析**产生**置信度，模块聚类/流程追踪**过滤**置信度，质量机制**校准**置信度。

**① 加性证据权重模型**（`evidence-weights.ts`，唯一权威权重表，求和后 clamp 到 [0,1]）：

| 信号 | 权重 |
|---|---|
| origin local / import / reexport·namespace / wildcard | 0.55 / 0.45 / 0.40 / 0.30 |
| scope 链每跳 | −0.02 |
| typeBinding 按 MRO 深度 | [0.5, 0.42, 0.36, 0.32, 0.30]（衰减，超表取末值）|
| ownerMatch / kindMatch | +0.20 / 0.0（仅解释，不区分）|
| arity 兼容 / 未知 / 不兼容 | +0.10 / 0.0 / −0.15 |
| globalQualified / globalName | 0.35 / 0.10 |
| 未链接导入 | 边信号 ×0.5（仅乘边派生信号，不罚独立佐证）|

**② 确定性 5 键 tie-break**（`CONFIDENCE_EPSILON=0.001`）：置信度降 → scope 深度升 → MRO 深度升 → ORIGIN_PRIORITY 升（local=0…global-name=6）→ `defId.localeCompare`。按 `def.nodeId` 取键，缺键回退冻结的 `DEFAULT_KEY`，保证恶意输入下仍确定。

**③ 实际发射的边置信度**：IMPORTS=1.0（去重 by 文件对）；CALLS=0.85（推断）/读写 ACCESSES=1.0；继承 EXTENDS/IMPLEMENTS=0.85；框架路由 CALLS=0.5（注释明说「匹配旧 global-tier」）；未解析 IMPORTS=0.5。

**④ 下游 0.5 阈值门**：流程追踪 `MIN_TRACE_CONFIDENCE=0.5`、大图社区 `MIN_CONFIDENCE_LARGE=0.5`、`ROUTE_EDGE_CONFIDENCE=0.5` 恰落在门边界上。

### 7.2 重载消歧（结构化 graph-node id）

`resolveDefGraphId` 按严格优先级让同名重载路由到不同节点：SFINAE/requires 约束指纹 → 参数形状（`~shape:cv:indirection:pointerDepth`）→ 参数类型（`qn~t1,t2`）→ arity（`qn#count`）→ 模板参数 → 限定名 → 命名空间前缀 → 简单名。`typeTagForId` 仅在同名同 arity 碰撞且全有类型信息时发 `~type1,type2`（TS/JS 跳过类型哈希，因重载签名折叠到实现体）；C++ const/非 const 碰撞发 `$const`；变参时 arity 为 undefined。调用点 `narrowOverloadCandidates`：arity → 精确类型 → 转换 rank（ISO C++ [over.ics.rank]）→ 三值约束。**核心不变式：「unknown」永远保留候选**（单调性——加谓词绝不能产生错边）。

### 7.3 三层验证体系

**① 进程内正确性**：
- 加性证据权重 + tie-break（上）。
- 开发态软失败校验器：`validateOwnershipParity`（I9，ownerId 一致性）、`validateBindingsImmutability`（I8，6 个绑定通道的冻结/可变契约）——生产/`VALIDATE_SEMANTIC_MODEL=0` 时空操作，否则 onWarn 不抛。
- DAG runner 拓扑校验 + 具体环路报告。
- 「保守 > 召回」哲学（type-resolution）+「拒绝胜过猜测」（`resolveAmbiguousInheritanceBaseViaImports` 仅当恰一候选才提交）。
- 每函数 PDG/taint 边上限（防病态函数拖垮）。
- 内容寻址 parse-cache：key=`sha256(排序的 filePath:contentHash)`，版本 `SCHEMA_BUMP(6)+pkg 版本`（任何 grammar/extractor 发布自动失效）；**PDG 缓存 key 只折叠 worker 可见输入**（折 `maxFunctionLines`，不折 emit 期的 `pdgMaxEdgesPerFunction`，#2099——否则改 cap 触发虚假全量重解析）。

**② 仓库级 CI 门禁**（PR-blocking）：
- 6 个安全扫描器（`SECURITY.md`）：CodeQL（静态分析）、`dependency-review`（high+ 阻断 PR）、Gitleaks（密钥，阻断）、OpenSSF Scorecard（供应链）、zizmor（workflow lint，阻断）、Trivy（容器镜像）。
- **1 个自定义 eslint 规则** `require-safe-parse.mjs`：强制 `parseSourceSafe` 替代裸 tree-sitter `.parse()`（Windows 上 >32767 字符输入 SIGSEGV，JS 不可捕获，#1433）。
- 其他内建规则：MCP 可达目录禁 `process.stdout.write`（保护 JSON-RPC 帧）、`lbug-adapter.ts` 禁裸 `conn.close()`（强制 `safeClose`，WAL 刷新正确性）、eqeqeq/no-var 等 error 级。
- `DoD.md`（Definition of Done v2.0.0）：9 项完成度清单 + 五轴自审（正确性/可读性/架构/安全/性能）+ 校验基线，要求精确断言（`toBe`/`toEqual`，禁 bounds-only）、禁掩盖 schema drift 的 mock。`GUARDRAILS.md`：禁提交密钥、禁在索引项目里 find-replace 重命名（用 rename MCP `dry_run`）、改共享符号前先跑 impact、提交前跑 detect_changes、保留 embeddings。

**③ 端到端经验验证**：`eval/`（Python + Docker SWE-bench harness）。验证假设：结构化代码智能是否提升 Agent 解决真实 issue 的能力。三模式：`baseline`（仅 grep/find/cat，对照组）、`native`（+ 显式 GitNexus 工具，经 eval-server ~100ms）、`native_augment`（推荐——grep 结果自动用 callers/callees/flows 富化，镜像 Claude Code hook 模型）。流程：SWE-bench commit 的 Docker 容器 → `gitnexus analyze` → eval-server 保温 LadybugDB → Agent 跑 → 抽 patch → 算指标（Patch Rate / Resolve Rate / 成本 / API 调用数 / GN 工具调用数 / augment 命中率）。多模型经 OpenRouter。

### 7.4 增量/陈旧度正确性

- **增量回写**选择性替换 DB 行：`computeEffectiveWriteSet` 做 1 跳边界行走（把跨可写边界的边的不变侧也拉进来，以删除/重写陈旧跨文件边），**同一扩展集必须同时喂 `deleteNodesForFile` 和 `extractChangedSubgraph`**（不对称会损坏 DB）。importer BFS 深度上限 4。
- **崩溃恢复**：`incrementalInProgress` 脏标置位 → 强制全量重建。
- **`pdgModeMismatch`**：对 `RepoMeta.pdg` 做键并集结构比较，任何 PDG 配置翻转/cap 变化都强制全量回写。
- **git 陈旧度**：`git rev-list --count lastCommit..HEAD`，落后则警告；`checkCwdMatch` 警告同 remoteUrl 不同磁盘路径的「兄弟克隆漂移」，避免 MCP 静默服务陈旧答案。

---

## 8. 跨仓库 groups 与合约注册

- **定义**：`~/.gitnexus/groups/<name>/group.yaml`（`version:1` + `repos` 路径→registry 名映射 + `links`/`detect`/`matching`）。
- **`group sync`**：逐成员跑抽取器（HttpRoute/Grpc/Thrift/Topic/Include）→ 每条 `ExtractedContract` 打 service 边界 → 匹配级联 → 写 `contracts.json`（canonical JSON，权威源）+ 并行 `bridge.lbug`（3 表：Contract / RepoSnapshot / ContractLink）。
- **匹配级联实测仅 manifest + exact + wildcard**：`MatchType` 枚举虽含 `bm25`/`embedding`，`bm25_threshold`/`embedding_threshold`/`embedding_fallback` 配置和 `--skip-embeddings`/`--exact-only` CLI 标志**全部从不被读取（死选项）**。exact 置信度 1.0，wildcard = min(provider, consumer)。
- **`group impact`**：Phase-1 本地 UID 行走（`GROUP_LOCAL_PHASE_LIMIT=10000`，绕过 MCP 默认 100，本地出错则**fail-closed**避免假阴性）→ Phase-2 经 ContractLink **单跳**扇出到邻仓（`MAX_SUPPORTED_CROSS_DEPTH=1`，多跳未实现，crossDepth>1 被钳制 + 警告）。风险合并：跨命中 ≥3 → CRITICAL，任一跨链置信度 ≥0.85 → HIGH。
- **`@group` 路由**：MCP 里 `repo:"@group"` 或 `"@group/member"` 触发 group 模式 impact/query/context（旧 `group_query`/`group_impact`/`group_contracts`/`group_status` 已移除，改为 resource）。
- **group query 的「RRF」是退化的**：每仓库第 i 名得相同分 `1/(i+1+60)`，实际是按 rank 的稳定轮转交织，而非真正的相关性融合。

---

## 9. 检索与 Agent 集成

### 9.1 混合检索（BM25 + 向量，RRF K=60）

- **BM25**：LadybugDB FTS（porter 词干），5 个索引（File/Function/Class/Method/Interface，均索引 `name`+`content`），`QUERY_FTS_INDEX(..., conjunctive:=false)`（析取/OR）。每文件保 top-3 节点求和（避免大量平庸匹配抬高测试文件）。
- **向量**：arctic-embed-xs 384 维，mean-pool + L2 归一，HNSW cosine，无扩展时退化 JS 精确扫描（≤10000 行）。可嵌入标签 **19 种**（11 chunkable + 8 short，**File 不可嵌入**，只参与 BM25）。增量：SHA1(`v2`前缀 + 文本)，DELETE-then-INSERT（Kuzu 禁对向量列 SET）。
- ⚠️ **两份 RRF 实现，分母差一**：canonical `mergeWithRRF`（serve 路径）用 `1/(60+i+1)`（rank-1=1/61）；MCP `query()` 内联用 `1/(60+i)`（rank-1=1/60）。**Agent 实际命中的 MCP 路径用后者**——潜在排序不一致。

### 9.2 17 个 MCP 工具

| 工具 | 作用 | 标注 |
|---|---|---|
| `list_repos` | 发现已索引仓库（分页）| 只读 |
| `query` | 流程分组的混合检索（BM25+向量+RRF）→ {processes, process_symbols, definitions}。参数是 `search_query`（非 `query`，因 Claude Code 会丢名为 `query` 的参数 #2175）| QUERY |
| `cypher` | 原始 Cypher（预编译参数防注入），描述内嵌完整 schema | 只读 |
| `context` | 符号 360° 视图（incoming/outgoing/processes），歧义返排名候选 | 只读 |
| `impact` | blast-radius：按深度分组（d1 WILL BREAK / d2 LIKELY / d3 MAY NEED TESTING）+ 风险 LOW/MED/HIGH/CRITICAL。**默认关系集 8 种**：CALLS/IMPORTS/EXTENDS/IMPLEMENTS/USES/METHOD_OVERRIDES/OVERRIDES/METHOD_IMPLEMENTS（ACCESSES/HAS_* 排除）| 只读 |
| `detect_changes` | git diff → 受影响符号/流程，worktree 感知 | 只读 |
| `check` | 结构检查（当前仅 File IMPORTS 环检测）| 只读 |
| `rename` | 图+文本协调重命名，默认 dry-run | **破坏性** |
| `explain` | 持久化污点发现（需 `--pdg`）| 只读 |
| `pdg_query` | 控制/数据依赖（controls→CDG / flows→REACHING_DEF，需 `--pdg`，始终锚定）| 只读 |
| `route_map` / `shape_check` / `api_impact` | API 表面：路由+handler+消费者 / 响应形状 vs 消费方属性访问不匹配 / 预变更影响 | 只读 |
| `tool_map` | 被索引仓库里的 Tool 节点清单（非 GitNexus 自己的工具）| 只读 |
| `trace` | 两符号间最短有向路径（CALLS + HAS_METHOD）| 只读 |
| `group_list` / `group_sync` | 列出组 / 重建合约注册（`group_sync` 写文件，**破坏性**）| |

外加：2 静态 + 6 模板 + 2 group 资源（`gitnexus://repos`、`gitnexus://setup`、`repo/{n}/context|clusters|processes|schema`、`group/{n}/contracts|status`）；2 prompts（`detect_impact`、`generate_map`）；server 给每个工具响应追加 `getNextStepHint`「下一步」脚注（仅 7 个工具有，刻意「无 hook 也能串起工作流」）。

### 9.3 编辑器集成（三层）

1. **MCP server**：stdio（默认，装 stdout sentinel 保护 JSON-RPC 通道）/ Streamable HTTP（`--http`，非环回必须 Bearer token）。
2. **augmentation hook**：`PreToolUse`（Grep/Glob/Bash）抽搜索词 shell 调 `gitnexus augment`，把 callers/callees/flows 富化进结果；`PostToolUse`（Bash）在 commit/merge 后比对 HEAD 检测陈旧索引并提示重索引。Antigravity 用 `AfterTool`（Gemini 契约无 BeforeTool 注入通道）。augment 引擎是 **BM25-only**（无向量，<500ms 冷 /<200ms 热），结果写 stderr（LadybugDB 占用 stdout fd）。
3. **skills**：9 个内置静态 SKILL.md（guide/cli/exploring/debugging/impact-analysis/refactoring/pr-review/taint-analysis/pdg-query）+ **按仓库从 Leiden 社区生成**的 skill（≥3 符号的聚类，top 20）。

**编辑器支持分级**：Claude Code / Cursor / Antigravity = Full（MCP+Skills+Hooks）；Codex / OpenCode = MCP+Skills；Windsurf = MCP only。`gitnexus setup` 按编辑器写各自的 MCP 配置（Cursor `~/.cursor/mcp.json`、Codex TOML、OpenCode 嵌 `mcp`…）。

### 9.4 Code Wiki（LLM 流水线，独立于 embeddings）

`gitnexus wiki` 4 阶段：① 一次 LLM 调用按模块分组文件 → ② 自底向上生成模块页（叶子并行、父顺序综合子文档，不重读源码）→ ③ 综述页。事实依据来自**知识图谱（调用/流程/导出）+ 磁盘源码，不用向量索引**。默认模型 `minimax/minimax-m2.5`（README 说 gpt-4o-mini，过时）。支持 `--lang` 多语言（H1 保持英文 slug 稳定）。

---

## 10. 性能与可扩展性（如何扛 Linux 内核级仓库）

核心思想：**只解析一次，把 ParsedFile 经磁盘流式喂给 scope-resolution，让主线程零 tree-sitter 解析**。

- **worker pool 是唯一解析路径**：无顺序回退；`--workers 0` / `GITNEXUS_WORKER_POOL_SIZE=0` / `skipWorkers` 都是硬错误（U20，旧顺序回退曾把 worker 启动回归伪装成 2 小时「卡死」#1741）。池大小 `min(16, cores-1)`，再按工作量收缩。
- **分块解析**：默认块预算 **2MB**（非文档说的固定 20MB），按池大小自动放大到 `poolSize×2MB`（8 worker→16MB，16 worker→32MB）。块也是 parse-cache 失效粒度。
- **#1983 原生内存泄漏（核心动因）**：scope-resolution 历史上在**不朽的主线程**重解析每个文件，tree-sitter 0.21.1 的 `CallbackInput` 持有输入串且无析构（node-tree-sitter PR #201），泄漏的 `TSTree` 对 V8 不可见、GC 不回收、worker 拆除也不释放。在 ~64k C 文件的内核上 RSS 撑破堆上限触发 OOM-killer。**修复（仍 pin 0.21.1，靠磁盘 store 而非升版本）**：worker 解析一次 → 把 ParsedFile shard 同步写盘（`parsedfile-store/`）→ 清空内存 → scope-resolution 逐 shard 流式读回，字符串 interning（~15GB→7.6GB）、每 8 shard 强制 GC。
- **逐语言驱逐 + 强制 GC**：scope-resolution 一次只驻留一门语言的 ParsedFile，语言间边界 `forceGc()`（C/C++ 在内核上可回收 ~17-20GB）。
- **懒池创建**：池仅在首个 cache MISS 时建；全命中的热重分析根本不加载 worker/原生绑定（`usedWorkerPool=false`）。
- **增量回写**（§7.4）+ **>50k 节点跳过 embedding**（`DEFAULT_EMBEDDING_NODE_LIMIT=50000`，`--embeddings 0` 关闭，显式防 OOM）+ **流式 PDG emit**（`--pdg` + `--force` 时把 BasicBlock 层流式写盘，RSS 降到 O(chunk)）。
- **5 层 worker 韧性**：自动 respawn / 熔断 / 隔离（坏文件路径从后续派发滤除且该块不缓存）/ 起始文件归因 / 累计超时预算。文件内容经 `Uint8Array` transferList 零拷贝过界（用 TextEncoder 而非 `Buffer.from`，避免 detach 共享 Buffer 池 slab 损坏）。

---

## 11. 横切洞察与工程哲学

1. **Precomputed Relational Intelligence** —— 一切的灵魂：索引期算好聚类/路径/评分，查询期一次返回完整结构化上下文。性能短路（50k embedding 跳过、流式 PDG）也服务于此。
2. **一张统一图 schema 是收敛点** —— 异构前端（16 语言 + COBOL/markdown 引擎）、所有分析方向、所有质量机制最终读写同一节点/边词汇。这是「跨栈/模块/分析/质量四问可组合」的根本原因。
3. **置信度是连接 Q1+Q2+Q4 的结缔组织** —— 解析产生置信度，聚类/流程过滤置信度，质量机制校准置信度。
4. **保守 > 召回 / 降级而非撒谎（degrade-not-lie）** —— type-resolution 宁缺勿错，继承歧义「拒绝胜过猜测」，重载歧义抑制并标记 handled，本地影响出错 fail-closed。一条错的 EXTENDS/CALLS 边会静默污染 impact 分析，所以宁可少连。
5. **可选叠加层模式** —— `--pdg`、`--embeddings`、`--skills`、跨仓 groups、LLM wiki 都是结构核心之上的严格叠加层，缺席不破坏核心。
6. **文档漂移本身是架构发现** —— ARCHITECTURE.md 描述的是 pre-RING4 架构，README 描述的是已迁移走的浏览器内 WASM 形态，版本号三处不一致，存在「发布但已死」的代码（cluster-enricher 的 LLM 富化、maxIterations 空操作、COBOL 的 ScopeResolver 钩子、遗留 call-processor.ts）。这指向一个高速演进、文档滞后的代码库；二次开发务必以代码权威数组为准。

---

## 12. 文档与代码的偏差速查（重要——别被 README/ARCHITECTURE 误导）

| 散文文档说 | 代码实测 |
|---|---|
| 支持 14 种语言 | 16 种注册（14 production + Vue/COBOL experimental）|
| 14 阶段流水线 | 15 阶段（`taintSummaries` 是 pdg-gated 的第 15）|
| 44 节点类型 / 21 关系类型 | 32 节点表 / 27 存储关系类型 |
| 16 个 MCP 工具（含 group_query/contracts/status）| 17 个（那 3 个已移除，改 `@group` 路由 + resource）|
| Embedding 表 / SHA1 | 表名 `CodeEmbedding` / SHA1(带 `v2` 前缀)；文件哈希是 SHA-256 |
| 统一 3-tier 导入解析（0.95/0.9/0.5，model/resolution-context.ts）| 已删除（#942/#943）；现为 configs+factory + scope-chain 绑定 |
| Web UI 纯浏览器 WASM / 代码不离开本机 | 已迁移瘦客户端，上传文件夹到 serve 后端；且有 @scarf/scarf 安装遥测、`gitnexus publish` 网络调用 |
| 块预算 ~20MB | 默认 2MB，按池大小自动放大 |
| `lbug.lock` 单写锁文件 | 不创建该文件；仅 `${dbPath}.init.lock` |
| Wiki 默认 gpt-4o-mini | `minimax/minimax-m2.5` |
| scope-parity CI 门（ci-scope-parity.yml）| 文件不存在；ci.yml 注释明说 #942 已移除该门（TESTING.md 自相矛盾，仍列着它）|
| 「migrated vs non-migrated 两套调用解析引擎」 | 单一 scope-resolution 路径覆盖全语言；call-processor.ts 仅余工具/框架路由职责 |

---

## 13. 已知局限与风险（给二次开发者）

1. **逐语言成熟度差异大**：「16 语言」掩盖了类型推断/泛型/多跳/MRO/导入语义的深度参差（Swift 约 30 项缺口为例）。结论需按语言打折。
2. **两份 RRF 分母差一**：MCP `query()`（Agent 主路径）与 serve 路径融合公式不一致，可能影响排序——潜在 latent bug。
3. **Leiden 无权 + maxIterations 空操作 + cluster-enricher 死代码**：社区划分不考虑调用频次，LLM 语义命名未接线。
4. **入口打分框架乘子可能双重计数**（path + AST 各乘一次）。
5. **ORM 仅 Prisma+Supabase、装饰器路由 provider 级仅 Spring**：其余靠通用 capture，覆盖有限。
6. **装载非事务**：中途失败留半库，靠 `--force` 恢复。
7. **增量 importer BFS 深度上限 4**：超深 barrel 链上「增量≡全量」是 best-effort，`--force` 是逃生口。
8. **隐私表述被夸大**：「no network calls」与 scarf 遥测、publish 网络调用、serve 后端上传冲突。
9. **契约 prose 陈旧**：`scope-resolver.ts` 的不变式注释仍以现在时引用已删除的 legacy DAG。
10. **企业版特性不可验证**：PR Review / 自动重索引 / OCaml / 回归取证 / E2E 测试生成均为 README 营销项，OSS 无源码。

---

## 附录：关键常量速查

| 常量 | 值 | 出处 |
|---|---|---|
| 注册语言数 | 16（14 prod + Vue/COBOL exp）| `languages.ts` |
| 流水线阶段数 | 15 | `pipeline.ts` |
| 节点表 / 存储边类型 | 32 / 27 | `schema-constants.ts` |
| MCP 工具数 | 17 | `tools.ts` |
| Embedding | arctic-embed-xs, 384D, HNSW cosine | `schema.ts` |
| RRF K | 60（两份实现分母差一）| `hybrid-search.ts` / `local-backend.ts` |
| Leiden | 无权, resolution 1.0/2.0, seed 0xc0de, 60s 超时 | `community-processor.ts` |
| 大图阈值 / 大图置信度门 | 10000 符号 / 0.5 | 同上 |
| 流程追踪置信度门 | 0.5 (`MIN_TRACE_CONFIDENCE`) | `process-processor.ts` |
| maxProcesses | clamp(20, symbolCount/10, 300), minSteps 3 | 同上 |
| CALLS / 读写ACCESSES / 继承 / IMPORTS 置信度 | 0.85 / 1.0 / 0.85 / 1.0(解析)·0.5(未解析) | scope-resolution graph-bridge |
| 块预算 | 默认 2MB，自动 ×poolSize | `parse-impl.ts` |
| worker 池上限 | 16 | `worker-pool.ts` |
| embedding 跳过阈值 | 50000 节点 | `embedding-mode.ts` |
| importer BFS 深度 | 4 | `run-analyze.ts` |
| tree-sitter | 0.21.1（原生，非 WASM；含 #201 泄漏）| `package.json` |
| PARSE_CACHE_VERSION | `SCHEMA_BUMP(6)+pkg版本`，PDG ns `pdg:2` | `parse-cache.ts` |
| PDG 每函数上限 | CFG/CDG 5000、REACHING_DEF 4000、taint 200/fn、函数 >2000 行跳过 | `cfg/emit.ts` 等 |
| 跨仓 crossDepth | 硬上限 1 | `cross-impact.ts` |
| npm 版本 / CHANGELOG / HEAD | 1.6.7 / 1.5.3 / 2026-06-19 | — |

---

*本文基于源码 HEAD `920958e`（2026-06-19）的多智能体精读 + 对抗式复核生成。所有数字与机制均回溯到具体 file:line 并经独立验证；散文文档与代码冲突处一律以代码为准。*

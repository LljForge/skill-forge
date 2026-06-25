# 集成测试 Skill · 调研文档

> **状态**：调研完成、未进入设计。本文是「原料」，供后续 brainstorming / skill-forge 直接取用。
> **日期**：2026-06-25
> **方法**：两轮探索 —— ① deep-research 多源 fan-out + 对抗式核验（*WHAT*：最佳实践）；② GitHub `gh` CLI 勘察高 star 测试类 skill（*HOW*：skill 形式与前人样本）。

---

## 0. 调研范围与目标（已和需求方确认）

要做的是一个 **Claude Code Skill**，定位：

- **语言无关方法论**：聚焦集成测试的策略、边界、设计原则与反模式，不绑定具体框架/语言。
- **测试边界 = 「服务内集成测试」**：单个服务连接**真实依赖**（数据库、消息队列、缓存），用 Testcontainers 风格起真实基础设施而非 mock 外部基础设施。不偏向跨服务契约测试或全链路 E2E，但需澄清它们与服务内集成测试的分界。
- **四类职责全覆盖**：①从零编写集成测试 ②评审/审计既有测试 ③搭建测试基础设施 ④测试策略决策。

---

# 第一部分：集成测试最佳实践（*WHAT*，来自 deep-research）

> 核验情况：5 个搜索角度 → 抓取 22 源 → 抽出 109 条论断 → 25 条进对抗式核验 → **24 条确认（22 条 3-0 全票、2 条 2-1），1 条被 0-3 驳掉**。源高度集中在一手权威。

## 1.1 核心共识（Skill 的骨架）

> 当下（2025–2026）「服务内集成测试」方法论在 Martin Fowler、Google Testing Blog / SWE-book、Meszaros《xUnit Test Patterns》、Testcontainers/Docker 官方之间**高度收敛**：用**真实本地基础设施**（DB/MQ/缓存）而非 mock 来测「服务 ↔ 其依赖」的交互，并优先 Fowler 的**「窄集成测试」**而非「宽集成测试」。可操作纪律压在三根支柱：**测试隔离 · 反模式审计 · 基础设施工程**。

| 主题 | 原则 | 一手依据 |
|------|------|---------|
| 定义 | 集成测试 = 测「服务与其依赖之间的交互」（Google 的 **Medium test**，典型如服务↔数据库） | [Google Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html) · [SWE-book ch11](https://abseil.io/resources/swe-book/html/ch11.html) |
| 边界（可机器校验） | Small：禁网络/DB/FS、≤60s；**Medium：允许 DB+FS、仅 localhost 网络、≤300s、外部系统禁用**；Large：全网络、900s+ | 同上（SWE-book 已把 Medium「不鼓励外部系统」收紧为「localhost 外一律禁止」） |
| 真实依赖 | 让外部依赖**本地真实运行**（起本地 DB、对本地 FS 测），不 mock 基础设施、也不打生产 | [Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) |
| 窄 > 宽 | **窄**：只演练「本服务里与某依赖对话的那段」，其余服务用 test double，范围常不大于单元测试；**宽**：拉起全部真实服务、贯穿所有路径（更慢、更难写） | [Fowler: IntegrationTest](https://martinfowler.com/bliki/IntegrationTest.html) |

## 1.2 按四类职责落地

### ① 编写集成测试
- **测外部可观察行为，不测内部实现**——「每加新功能就要改一堆已有测试」是测试耦合实现的诊断信号。
- 一次只接**一个**真实集成点（窄风格），其余依赖用 double，跑得快、更有韧性。
- 受管依赖（你自己的 DB）用真实；非受管依赖（第三方 API/broker）可 mock —— Khorikov 的精化。

### ② 评审 / 审计（反模式清单，可直接做成 checklist）
- **Test smell 三视角**（Meszaros 权威分类）：Code smells（读代码发现）· Behavior smells（编译/运行时暴露）· Project smells（项目级健康）。依据：[xUnit Patterns: TestSmells](http://xunitpatterns.com/TestSmells.html)
- **头号反模式：共享可变 fixture** —— 是 Interacting Tests、级联失败、Erratic Tests 的根因，应是「**万不得已的最后手段**」。
- **慢测试**：超过「~30s」开发者就不再每改必跑 → 反馈变慢（机制要记，30s 别当硬常量）。
- 隐式依赖顺序、过度 mock、断言缺失等同理纳入审计表。

### ③ 搭建测试基础设施（do/don't 最密集）
| Do | Don't |
|----|-------|
| 容器**按测试类复用**（每类一次生命周期钩子）/ 单例模式跨类共享 | 每个测试方法新建容器（实测 >2× 开销） |
| 运行时**查映射端口**（`getMappedPort` 等价物） | 绑定固定宿主端口（并行 CI 端口冲突） |
| 等**真正就绪信号**（WaitStrategy / 健康探针） | `Thread.sleep()` 定时睡 |
| 进程退出时统一清理（如 Ryuk） | 单类用注解 + 单例混用（会提前停容器） |

依据：[Docker: TC Best Practices](https://www.docker.com/blog/testcontainers-best-practices/) · [TC Lifecycle](https://testcontainers.com/guides/testcontainers-container-lifecycle/) · [Singleton Containers](https://docs.docker.com/guides/testcontainers-java-lifecycle/singleton-containers/) · [Why never use fixed ports](https://bsideup.github.io/posts/testcontainers_fixed_ports/)

### ④ 测试策略决策
- **隔离是第一纪律**：任意顺序可跑；**「从零重建初始状态」优于「事后清理」**；DB 测试的具体战术 = 每测试包事务、结束回滚（仅当测试不提交事务）。依据：[Eradicating Non-Determinism](https://martinfowler.com/articles/nonDeterminism.html)
- **金字塔仍是默认**：Google 经验起点 70/20/10（SWE-book 后续收紧到 ~80/15/5），「越高层测试越少」。依据：[Just Say No to More E2E](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)
- **限制 E2E 的理由要用条件式**：过度依赖 E2E → 总时长+flaky 膨胀；少量 E2E → 仍可接受。**别**说成「E2E 本质上总慢且 flaky」（这条被 0-3 驳掉）。
- **Flaky 治理**：立即移入 quarantine 并**限额/限时**修复（如 ≤8 个 / ≤1 周），否则隔离区沦为坟场。
- **契约测试 vs 集成测试的分界**：集成测试无法自证 test double 的保真度，这交给契约测试**补充**（契约测试不是集成测试本身）。

## 1.3 分歧与开放问题（Skill 必须自己表态）

1. **金字塔 vs Testing Trophy** —— Kent C. Dodds 的 Trophy（主张以集成测试为主）是公开、未被证伪的对立模型，但本轮没提取到它的逐条可核验论证。Skill 要决定：默认金字塔，把 Trophy 作为"何种条件下"的替代？
2. **「何时用集成测试替代单元测试」缺一条可操作判定规则** —— 有比例、有窄/宽框架，但没有「当 X 时优先写集成」的硬规则（受管/非受管依赖框架是否当主轴？）。
3. **非 JVM 的容器复用/清理机制** —— 单例、Ryuk、static 字段全来自 Java 生态，.NET/JS/Go/Python 的等价钩子与孤儿容器治理未覆盖。
4. **非事务资源的隔离战术** —— 证据只给了「事务回滚」一招，Kafka/Redis 这类非事务资源的隔离方案没系统覆盖。

## 1.4 对「语言无关 Skill」的关键警示 ⚠️

1. **Java 绑定泄漏**：`static` 字段、`@Testcontainers`、`getMappedPort()`、Ryuk 等大量来自 Java/JUnit 文档。语言无关 Skill **必须抽象成原则**（「按测试类复用」「运行时查映射端口」「等就绪信号」「进程退出清理」），并标注哪些是 Java 实现细节。
2. **数字是经验法则**：30s 慢测试、quarantine ≤8 个/1 周、冷启 ~20s vs ~10s —— 都是单一作者/单一基准的示例，**保留机制、淡化精确值**。
3. **「共享 fixture 是反模式」≠「不要复用容器」**：必须点破——反模式指**共享可变状态/数据**；而**复用容器对象 + 每测试重置数据**恰是推荐做法（Fresh Fixture 叠在 immutable 共享基础设施上）。这条不点破必被误读。

## 1.5 来源清单（一手权威）

- Martin Fowler：[IntegrationTest](https://martinfowler.com/bliki/IntegrationTest.html) · [Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) · [Eradicating Non-Determinism](https://martinfowler.com/articles/nonDeterminism.html) · [ContractTest](https://martinfowler.com/bliki/ContractTest.html)
- Google：[Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html) · [SWE-book ch11](https://abseil.io/resources/swe-book/html/ch11.html) · [Just Say No to More E2E](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html) · [Flaky Tests at Google](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- Meszaros：[xUnit Patterns — Test Smells](http://xunitpatterns.com/TestSmells.html)
- Testcontainers/Docker：[Best Practices](https://www.docker.com/blog/testcontainers-best-practices/) · [Container Lifecycle](https://testcontainers.com/guides/testcontainers-container-lifecycle/) · [Singleton Containers](https://docs.docker.com/guides/testcontainers-java-lifecycle/singleton-containers/) · [Fixed Ports](https://bsideup.github.io/posts/testcontainers_fixed_ports/)

---

# 第二部分：GitHub 现状勘察（*HOW*，前人 skill 怎么做的）

> **一句话结论**：高 star 区里**没有一个「服务内集成测试」专门 skill —— 这是真实空白**。唯一精确对口的躺在 177⭐ 小仓库；真正高 star 的全是测试方法论/纪律类或把「integration」误用成内存替身。
> → **正确策略：结构/皮肤偷师高 star，内容/血肉来自低 star 对口样本 + 第一部分研究。**

## 2.1 全景表（按 star）

| 仓库 | star | 它实际是什么 | 真实依赖/容器覆盖 | 对我们的价值 |
|------|------|------------|:---:|------|
| `obra/superpowers` | 238k | TDD + 测试纪律簇（门控/反合理化） | ❌ 无容器层 | **结构金矿**：铁律+门控+反合理化 |
| `anthropics/skills` · webapp-testing | 155k | 浏览器 E2E（Python+Playwright） | ❌ 正交 | 黑盒脚本哲学、决策树、生命周期清理 |
| `alirezarezvani/claude-skills` | 19k | senior-qa（前端·mock依赖）+ api-test-suite-builder（黑盒API） | ⚠️ 假设依赖已就绪 | **判定矩阵**驱动生成、扫描→生成两步法 |
| `Jeffallan/claude-skills` · test-master | 10k | 全能QA，广而浅，JS/TS绑定 | ❌ 删表了事 | 路由表 + MUST/MUST NOT 双清单 |
| `mrgoonie/claudekit-skills` · web-testing | 2.1k | Web测试速查册，19页references | ❌ 内存库 `:memory:` | BAD/GOOD/BEST 三级对照 |
| `kid-sid/claude-spellbook` · integration-testing | **177**（低） | **全网唯一直名 integration-testing 的 skill** | ✅ **完整**：Testcontainers/隔离/数据/Pact/MQ | **内容金矿**（但结构弱） |

## 2.2 关键发现

1. **没人做「服务内 + 真实依赖」这一层**。高 star 要么是 AI 自律纪律（superpowers），要么是浏览器 E2E（官方 webapp-testing），都不碰「用容器拉起真 Postgres/Kafka 在测后销毁」。
2. **「integration」这个词被系统性误用**。19k 的 api-test-suite-builder 假设依赖已跑起来；10k 的 test-master 用 `DELETE FROM users` 删表；2.1k 的 web-testing 用 `new Database(':memory:')` + 同进程 supertest。**全都没有真实容器化依赖**。
3. **唯一对口样本（kid-sid 177⭐）内容扎实但结构有硬伤**。它精确覆盖 Testcontainers、事务回滚/schema-per-worker/DB-per-worker 三档隔离、factory 数据、CI 真实坑（Docker socket/Ryuk/镜像预热）、单测vs集成逐场景判定表——和第一部分研究高度吻合。但：**(a) 单文件 587 行零渐进披露；(b) 不是真·语言无关，是 Python/TS/Go 三语堆叠（仍漏 Java/Rust/C#）；(c) 边界外溢（混入 Pact 契约、MQ 这些「服务间」内容）。**
4. **高 star skill 的「皮肤」高度一致、值得照搬，但都缺「血肉」**。共同优秀做法：薄主文件 + references 渐进披露、判定矩阵、do/don't 成对代码、反模式独立成页、黑盒脚本。集成测试的真实依赖编排内容得我们自己填。

## 2.3 可偷师清单（结构来自高 star，内容来自 kid-sid + 研究）

| 偷师点 | 来源 | 怎么用到我们 skill |
|--------|------|-------------------|
| **Iron Law + Gate Function 双层门控** | superpowers 238k | `BEFORE mock 一个依赖：问「能用容器跑真的吗？」能→STOP，用真的` |
| **Common Rationalizations 反合理化表** | superpowers 238k | 逐条反驳「为什么不能用 mock 替真实依赖」的借口 |
| **reference 自带「何时加载我」+ 主文件单行挂钩** | superpowers 238k | 渐进披露范式 |
| **决策树当开篇路由 + 黑盒脚本（`--help` 先行、禁读源码省 token）** | anthropics 155k | 「有容器运行时? 真依赖 vs 替身?」决策树；起依赖/清容器做成不污染上下文的脚本 |
| **生命周期清理闭环** | anthropics 155k | 起依赖→等就绪→`finally` 保证销毁（换成 docker/testcontainers） |
| **判定矩阵驱动 + 扫描→生成两步** | alirezarezvani 19k | 「集成场景→真实依赖状态→期望行为」矩阵；先扫被测面清单再覆盖 |
| **路由表 "Load When" 列 + MUST/MUST NOT 双清单** | Jeffallan 10k | 主文件薄、references 按需加载的显式路由 |
| **BAD/GOOD/BEST 三级对照** | mrgoonie 2.1k | 「硬等待→显式等待→就绪探针」递进 |
| **单测vs集成逐场景判定表 + 隔离策略矩阵 + Red Flags** | **kid-sid 177** | 直接做成边界表、隔离决策表、反模式清单（核心内容） |
| **CI 真实坑清单** | **kid-sid 177** | Docker socket / Ryuk / 镜像预热 / 容器按 session 复用 |

## 2.4 对设计的启示（待拍板的决策，见第三部分）

1. **「语言无关」要做对**：kid-sid 的「三语并列」会让文件膨胀还漏语言。正解 = 主文件放语言无关的方法论/判定/门控，**分语言样例下沉到 `references/<lang>.md` 按需读**——正好同时修掉它「零渐进披露」和「假语言无关」两个硬伤。
2. **边界纪律**：聚焦「服务内集成测试」，把契约测试/MQ 划为「补充」或单独成块，避免范围漂移（研究结论支持契约测试是补充而非集成本身）。
3. **要不要配可执行资产**：高 star 的 superpowers/官方都带脚本（`find-polluter.sh`、`with_server.py`），对口的内容型 skill 全是纯文档。集成测试要拉容器/配 compose/备数据，配脚本（端口探测/残留容器清理/状态泄漏定位）可能是拉开差距的点。

---

# 第三部分：待拍板的设计决策（给未来动手时的自己）

进入 brainstorming / skill-forge 前，先回答这些（多数在上面已埋好选项）：

1. **金字塔 vs Trophy 立场**：默认金字塔 + 把 Trophy 作为某条件下替代？还是更激进？
2. **「何时集成替代单元」判定规则**：是否采用「受管/非受管依赖」作为主轴？
3. **契约测试/MQ 边界**：切出去、单独成块、还是只在主线里一句话带过？
4. **语言无关的落地形态**：主文件方法论 + `references/<lang>.md` 分语言样例（推荐）；覆盖哪几门语言的样例？
5. **结构骨架**：薄主文件（决策树 + 判定矩阵 + 门控 + Red Flags + 路由表）+ references（分语言样例 / 分依赖类型）+ 是否配 scripts/。
6. **四类职责如何组织**：四合一单 skill？还是「编写 / 评审」走主线、「基建 / 策略」沉到 references？
7. **触发设计**：学 kid-sid 的「动作场景」触发语（碰真库/真 broker、搭 Testcontainers、服务边界内测 HTTP），并补负向边界（不是 E2E、不是纯单测）。

---

## 附：方法与可复现

- **deep-research run**：`wf_68122219-e9d`（5 角度 / 22 源 / 109 论断 / 24 确认）。
- **GitHub 深读 run**：`wf_ec3d5287-f0c`（6 个高 star 测试类 skill 逆向画像）。
- **唯一对口前人样本原文**：`github.com/kid-sid/claude-spellbook` → `skills/integration-testing/skill.md`（587 行，可整篇拉下来逐段精读——本轮只取了画像，未逐行收录）。
- **本项目相关**：遵循 skill-forge 孵化炉 + 一 commit 一 skill + per-skill tag `<name>/vX.Y.Z` 发布模型。

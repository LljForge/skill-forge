# module-spec-baseline 优化 · Roadmap & 台账

> **这个文件是本次优化的唯一交接物。** 多轮、跨会话的优化全靠它续上,**不依赖任何记忆系统**。新会话从这里开始读。

---

## 🚩 如何接手(START HERE)

新会话(包括上下文被清空后的自己)按这五步走:

1. **读本文件**的「当前状态」→ 知道做到哪、下一步做哪批。
2. **读同目录文件**(见「目录地图」)补齐背景:报告讲为什么改/改什么,baseline JSON 是对照尺。
3. **干活**:只动当前批次,改 skill 源码(见「被改对象」),别跨批。
4. **重跑验证**(见「重跑验证协议」)→ 拿新数字对比基线。
5. **回写**:把「这批改了啥 + 数字升降」记进「台账」,更新「当前状态」。**会话结束前确认本文件是最新的**——它是下个会话唯一能依赖的东西。

---

## 当前状态

- **阶段**:🎉 **B0–B4 全部干净通过**(B4=`697c867`,4 门全过 + 回归)。**优化全程收尾,`spec-baseline-opt` 待用户拍板合回 `main`(不擅自 push)**。
- **完整验收尺已定型(4 门 + 回归,B1/B2 实战验证可用)**:① 写没写(grid,尺校 96%)② 真不真(grounding)③ 行为不行为(可观察 + 无机制词)④ `[待验证]` 正当;门 2/3/4 折进 grounding 一趟 + 2 grep,成本不涨。
- **B1 成果**:横切 grid **7→12**(5 真可观察翻绿)、0 假YES、0 机制词、出站签名已砍。产物 `results-B1.json`。
- **B2 成果**:非 HTTP 入口发现系统化(修 boundary 悬空引用,定时入口由关键词机制找、非碰运气);**活性核验门承重生效**——budget `BudgetScheduleTask` 两 `@Scheduled` 已注释的死壳被 3/3 一致判 NO、**未编造定期契约**;trip 2/2 定时入口仍行为优先零机制;B1 12 绿格零回退。产物 `results-B2.json` + 新尺 `b2-nonhttp-grid-ruler.workflow.js`。
- **B2 关键认知**:本语料数字不跳是**设计预期**(trip 本已 2/2、budget 本已正确)——B2 价值=**机制系统化 + 装上防编造活性核验门 + 零回退**,不是涨数字。加 `@Scheduled` 关键词若不配活性核验门,会把 budget 死壳编造成契约(净负);门拦住了即成功。
- **B3 成果**:四类位置入口强制走查(自有 Controller + 共享网关按行切 + **同步 Controller 群按行切** + MQ/定时)+ 同包零 import 依赖标存疑 + 客观锚点(耦合信号)。**与 B2 不同,B3 有真实可测增益**:enterprise `/taskGetQccMessage`(物理在 `TaskSyncJobController` 同步群)补满 **13→16**;tms `RabbitMqConsumer`(在 `masterdata/config`)被「按调本模块 Service 判归属」逮回 **0→2/2**(§8-⑤入口错置他包 config)。四类走查留痕完整、按行切正确排除他子域端点;存疑标注落 scratchpad 不污染 spec。B1 12 绿/B2 trip·budget 全零回退、0 机制词。产物 `results-B3.json`。
- **B3 关键认知**:T2「同包零 import 依赖存疑」的正确落点是 **scratchpad(scope 待裁决留痕)、非 spec**——故门4 [待验证] 仍 0、spec 干净,而 scope 闭合性有据可查。四类位置走查靠「**调没调本模块 Service**」判归属(非物理包),才能逮错置入口。
- **B1/B2/B3 迭代教训(B4 沿用)**:① 出站签名类"只对下游可观察"维度不进行为契约;② 横切/入口只写可观察后果、禁机制词;③ 事务追调用点下定论;④ **命中关键词≠活入口,必须深读到真身核验活性**,照注解臆测即编造;⑤ 入口归属按「调本模块 Service」判、非物理包,逮错置入口;⑥ scope 不确证的跨子域边标存疑(scratchpad)不静默闭合;⑦ 维度增益若有泄漏/hedge,回退重做不将就。
- **回退锚点**:`ad73293`(优化前);B0=`53508e4`;B1=`c6f13aa`;B2 前=`0b30bab`;B3 前=`6f62fda`;各批 commit 见台账。
- **对照尺**:`baseline-2026-06-20.json`。
- **最近更新**:2026-06-22 B3 干净通过(4 门 + 回归)。

---

## 目录地图

| 文件 | 是什么 |
|---|---|
| `00-START-HERE-roadmap-and-ledger.md` | **本文件**:计划 + 进度 + SOP,唯一交接物 |
| `module-spec-baseline-analysis-and-improvements.md` | 完整分析报告 §0–§9:为什么改 / 改什么大方向 / 跨栈 / 范围划分 / 基线 |
| `baseline-2026-06-20.json` | 优化前基线打分卡(5 模块)+ GitNexus 结构事实 —— **对照尺** |
| `rerun-baseline.workflow.js` | 重跑基线的 workflow 脚本 —— **重测器** |
| `gitnexus-comparative-analysis.md` | 前序跨 3-skill 的 GitNexus 对照(背景,已收口的战术层) |

---

## 被改对象

skill 源:`/Users/lilongjian/Projects/AI/skill-forge/skills/module-spec-baseline/`
(`SKILL.md` + `agents/*.md` + `references/*.md` + `shared/**`)

> 改 skill 本体走 skill-forge / skill-creator 的流程,不是改业务代码。改前先备份。

---

## Roadmap(5 批,按「依赖 + ROI」排序)

> 每批是**独立可验证单元**,大小尽量压到「一个会话能做完 + 重跑完」。做完即重跑、即记台账,别攒。

### B0 · 地基(先行,不直接动数字)
- **目标**:① 冻结「行为契约固定字段」(入口类型/触发条件/鉴权/错误码/格式),让新维度有统一产物去处;② 维度与栈解耦(报告 §7-①⑤);③ 范围/能力划分**决策落盘**,让重跑可复现(报告 §8-②)。
- **动**:`references/openspec-spec-format.md`、`SKILL.md`(Phase A 决策落盘 + 维度容器)。
- **完成判据**:开一个新维度不再牵动各 agent 输出表头;范围/能力两处拍板有 scratchpad 留痕。
- **目标数字**:无(地基,后续都挂它)。

### B1 · 出站横切层(最高 ROI)
- **目标**:加「出站/横切扫描」——**事务边界 / 审计留痕 / 配置开关·凭据 / 出站签名加密 / MQ 发布**(报告 §6-R2、§9 共性 top4)。
- **动**:`structural-agent.md` 或新增横切扫描 agent + 对应 `shared/strategies` 触发器;`spec-synthesis-agent.md` 接住这些维度。
- **完成判据**:5 模块这几类盲区被采集到 scratchpad 并落 spec。
- **目标数字**:**真盲区 30 → 显著下降**(主回收来源)。

### B2 · 多入口发现
- **目标**:把入口发现从「HTTP 端点」扩到非 HTTP——框架信号表加 `@Scheduled`/`@RabbitListener`/`CommandLineRunner`(报告 §6-R1、§8-③);**修掉那个悬空引用**(boundary 说要找定时任务、spring 策略卡却无 `@Scheduled` 关键词,报告 §7-③)。
- **动**:`boundary-agent.md`(入口枚举)+ `shared/strategies/web/spring-boot.md`(补关键词)。
- **完成判据**:定时/MQ 入口既列为入口又写可观察语义。
- **目标数字**:**非 HTTP 入口完整度 ↑**(以 trip 的 2/2 为标杆推广)。

### B3 · 范围划分稳健
- **目标**:入口枚举强制覆盖「四类位置」(自有 Controller + 共享网关按行切 + 同步 Controller 群 + MQ/定时)+ 同包零 import 依赖**标存疑不静默闭合** + 客观锚点(报告 §8-①④⑤)。
- **动**:`boundary-agent.md` + `SKILL.md` Phase A(Step 2/3、A-4)。
- **完成判据**:enterprise/budget 漏掉的真实端点补满;推断不到的跨子域依赖显式标「存疑」。
- **目标数字**:**HTTP 端点完整度补满**(enterprise 93%、budget 90% → 满),防漏退化。

### B4 · 纪律 + 纠偏
- **目标**:① 核对门(写完把 spec 标识 grep 回仓库核验,报告 §6-R3、§7-⑥)拦编造;② 纠正「安全」过度排除——鉴权门/验签/anon 是可观察契约,不该跟「安全审计」一起被扔(报告 §6-R4、§4.3);③ 降级可见可计数(报告 §7-③)。
- **动**:`verification-agent.md`(核对门)+ `SKILL.md`「不做」段(安全边界)+ 降级清单产出。
- **完成判据**:鉴权契约进 spec;编造被核对门拦下。
- **目标数字**:**硬编造 6(含 2 硬)→ 0 硬编造**;鉴权盲区消除。

---

## 每批执行循环(agent 自主跑完 → 你验收 → 不满意回退)

每批由 agent **端到端自主完成、中途不停下等批准**;做完把前后数字交给你验收。

1. **存档点**:确认在优化分支 `spec-baseline-opt`、工作树干净;本批前的 commit = 回退锚点。
2. **改**:只动本批的 skill 文件(见各批「动」)。
3. **重跑验证**:`Workflow({scriptPath: ".../rerun-baseline.workflow.js"})` → 新 scorecards。
4. **比对**:diff `baseline-2026-06-20.json`,落 `results-Bx.json` + 前后对照表(真盲区 / 硬编造 / 端点完整度 / validate)。
5. **记账**:更新「台账」行 + 「当前状态」。
6. **提交**:`git commit` 一个 `Bx: …`(**一批 = 一个 commit**,回退才干净)。
7. **交验收**:把「改了啥 + 前后数字」给你。

## 验收与回退协议

- **满意** → 保留该 commit,进下一批。
- **不满意** → `git reset --hard <本批前锚点>` 丢掉该批 commit,工作树回到批前;「台账」记一行 `Bx 已回退:<原因>`;按你意见重做或跳过。
- 全部验收通过后,`spec-baseline-opt` 合回 `main`(你拍板,**我不擅自 push**)。
- **回退单元只有 skill 源**(skill-forge 的 commit)。重跑会覆盖 GMZB 的 `openspec/specs/`,那是可再生 artifact、不纳入回退。
- 每批的 `results-Bx.json` 随该批 commit 一起留档,前后可审计。

---

## 重跑验证协议

- **重跑**:`Workflow({scriptPath: "/Users/lilongjian/Projects/AI/skill-forge/docs/module-spec-baseline-optimization/rerun-baseline.workflow.js"})`
  - 它对同样 5 个模块(tms / ccm-trip / ccm-budget / ccm-paybill / mdm-enterprise)**零盲区引导净跑**当前 skill,产新 scorecards + 总览。
  - 会**覆盖** `master-data/openspec/specs/` 与 `.spec-baseline-scratchpad/` —— 这是预期。
- **判据(B0 实测后改定)= 目标维度二值检查为主**:每批针对哪些维度,就**逐模块查"spec 里有没有对应的可观察 Scenario"**(grep + 定点读,近乎确定的 yes/no),做成「维度 × 模块」二值网格——**这是 4 门里的门1(写没写)**。`validate 5/5` = **门0 回归**(不掉)。
  - **门2 真不真**:grounding 回代码核翻绿格成立(防假YES)。
  - **门3 行为不行为**(A/B/C 复盘后新增):同 grounding 一趟——新契约须 (a)对本系统调用方外部可观察 (b)无实现机制词;辅 grep 黑名单(`线程|异步线程|删后插|SM4|MD5|RabbitMQ|@Transactional|派生.{0,4}签名|access_token`)。
  - **门4 `[待验证]` 正当**(新增):同 grounding 一趟——每条 hedge 必须**真查不准**(非"能查清却 hedge");辅 grep `[待验证]` 计数(上升=退步)。
  - 门 2/3/4 折进 grounding **一趟** + 2 grep,**不新建重 workflow、成本不涨**。
- **模糊聚合数(盲区数/编造数/端点分母)只作参考、不作判据**:B0 实测它们噪声极大(地基批无真改动却 编造 6→1、盲区 ±3/模块、budget 端点分母 100→114),小波动不下结论。
- **每批一律跑满 5 模块**(不做轻量抽样),保证可比。
- 防回归红线:`validate` 任何一条不能挂;加横切内容时尤其盯格式与"照注解臆测"(深读到真身,不确定标 `[待验证]`)。

---

## 台账(每批做完记一行)

| 批次 | 日期 | 改了什么(skill 文件) | 实测效果(对比基线) | 结论 | 状态 |
|---|---|---|---|---|---|
| B0 | 06-20 | 维度登记表 + 决策落盘(不碰 agent) | validate 5/5 守住、端点覆盖稳;**暴露测量噪声大**:地基批无真改动,编造却 6→1、盲区 ±1~3/模块、budget 端点分母 100→114 | 地基通过(无回归)+ 标定噪声底→改用二值检查 | **✅ 已验收(53508e4)** |
| B1 | 06-20→21 | 横切扫描+行为优先表达;`782a7ec`(redo·按完整尺·砍出站签名)+`c6f13aa`(B1.2·砍签名传导synthesis+事务mechanism scrub) | **4门全过**:grid 7→12(5 真翻绿 trip×审计/budget×事务·配置/ent×审计·MQ)、门2 0假YES、门3 0机制词·出站签名已砍、门4 仅1条旧`[待验证]`、strict 5/5 | **✅ 干净通过**(经 v1假YES→回退→补尺→redo→收口2残留,共3轮迭代验证了 4 门各拦真问题) | **待验收** |
| B2 | 06-22 | 非HTTP入口发现(定时/MQ消费)+活性核验防编造死壳+修悬空引用;`935795b`(spring-boot.md非HTTP段+boundary步骤2.7+synthesis非HTTP入口Requirement;不动structural) | **4门全过+回归**:门1 B2网格唯一YES=trip.sched(3/3·正确)·**budget.sched 3/3一致NO(死壳未编造)**·0机制泄漏 + B1横切12绿原样保住(零回退,96%一致);门0 validate 26/26;门2 trip活/budget无编造;门3 机制词0;门4 [待验证]0 | **✅ 干净通过**(承重=活性核验门拦住 budget 注释死壳;本语料数字不跳=设计预期,价值在系统化+防编造门+零回退) | **待验收** |
| B3 | 06-22 | 四类位置入口强制走查(补同步Controller群按行切)+同包零import依赖标存疑+客观锚点(耦合信号);`994264b`(boundary步骤2.8外置入口+SKILL.md A-4泛化四类位置+Step2耦合信号;不动structural) | **4门全过+回归·有真增益**:门1 enterprise `/taskGetQccMessage` 补满13→16(四类全走查留痕·按行切正确排他子域)·tms RabbitMqConsumer逮回0→2/2(§8-⑤错置他包config)·同包依赖标存疑(scratchpad)+ B1横切12绿零回退·B2 trip/budget守住;门0 validate26/26;门2 grounding真;门3 机制词0;门4 [待验证]0 | **✅ 干净通过**(与B2不同·**有可测增益**;承重=「按调本模块Service判归属」逮错置入口·存疑落scratchpad不污染spec) | **待验收** |
| B4 | 06-23 | 核对门(高危断言主动证伪拦编造)+鉴权前置carve-out(深读守卫真身·空壳不写)+降级可见;`697c867`(verification核对门+降级 / structural §2.5鉴权维度+carve / synthesis写鉴权 / SKILL.md不做段澄清) | **4门全过+回归·两目标全中**:门1 T1核对门→**全5模块编造归零**(tms task-log那条'不会改写success'被拦·达成硬编造→0)·T2鉴权→enterprise正确避开JWT空壳编造·HMAC验签如实采·N/A诚实降级(深读门承重生效)+ **B1横切12绿100%一致(零回退)**·B2 trip/budget守住·B3四类位置保住;门0 validate26/26;门3 机制词0;门4 [待验证]0 | **✅ 干净通过**(承重=深读门拦JWTFilter空壳编造;T2正向footprint≈0如设计预审·价值在原则修正+防编造) | **待验收** |

---

## 注意事项

- **每批独立验证、做完即记台账**,别攒着一次性验。
- 改 skill 本体走 skill-forge / skill-creator 流程,改前备份。
- **不依赖 MEMORY / 自动记忆**:本文件是唯一真相源;任何续接只靠读它 + 同目录文件。
- 顺序可调:若某批做一半发现依赖前一批,回头补 B0 地基。

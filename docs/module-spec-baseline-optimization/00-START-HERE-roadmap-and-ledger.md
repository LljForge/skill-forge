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

- **阶段**:**B0、B1 均已验收通过**(B1=`be4eba6`+`000e05d`)。下一步 **B2 多入口发现**。
- **B1 结果**:横切网格 **7→12 YES(+5)**、validate 5/5、**grounding 0 假YES**(v1 漏 2 假契约,B1.1 加硬深读后治好)。产物:`results-B1.json`、`after-B1-grid.json`、`binary-grid-ruler.workflow.js`。
- **方法论已验证(B2 起沿用)**:grid(写没写,尺校 96%)+ grounding(对不对)双门 + 不通过则强化重做。能可靠分真改善/假YES。
- **回退锚点**:`ad73293`(优化前);各批 commit 见台账。
- **对照尺**:`baseline-2026-06-20.json`。
- **最近更新**:2026-06-20 B1 干净通过(0 假YES)。

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
- **判据(B0 实测后改定)= 目标维度二值检查为主**:每批针对哪些维度,就**逐模块查"spec 里有没有对应的可观察 Scenario"**(grep + 定点读,近乎确定的 yes/no),做成「维度 × 模块」二值网格。`validate 5/5` 当回归守门,**必须守住**。
- **模糊聚合数(盲区数/编造数/端点分母)只作参考、不作判据**:B0 实测它们噪声极大(地基批无真改动却 编造 6→1、盲区 ±3/模块、budget 端点分母 100→114),小波动不下结论。
- **每批一律跑满 5 模块**(不做轻量抽样),保证可比。
- 防回归红线:`validate` 任何一条不能挂;加横切内容时尤其盯格式与"照注解臆测"(深读到真身,不确定标 `[待验证]`)。

---

## 台账(每批做完记一行)

| 批次 | 日期 | 改了什么(skill 文件) | 实测效果(对比基线) | 结论 | 状态 |
|---|---|---|---|---|---|
| B0 | 06-20 | 维度登记表 + 决策落盘(不碰 agent) | validate 5/5 守住、端点覆盖稳;**暴露测量噪声大**:地基批无真改动,编造却 6→1、盲区 ±1~3/模块、budget 端点分母 100→114 | 地基通过(无回归)+ 标定噪声底→改用二值检查 | **✅ 已验收(53508e4)** |
| B1 | 06-20 | 横切扫描+表达(`be4eba6`)+ 强化深读防假YES(`000e05d` B1.1) | 二值网格 **7→12 YES(+5)**、validate 5/5;**grounding 0 假YES**(B1 v1 漏 2 假契约 → B1.1 加硬后治好:tms×事务改 `[待验证]` 准确反映异步架空、trip×审计收窄为"部分") | **✅ 干净通过**:grid +5翻绿 + 0 假YES + strict 5/5 | **✅ 已验收(000e05d)** |
| B2 | | | | | TODO |
| B3 | | | | | TODO |
| B4 | | | | | TODO |

---

## 注意事项

- **每批独立验证、做完即记台账**,别攒着一次性验。
- 改 skill 本体走 skill-forge / skill-creator 流程,改前备份。
- **不依赖 MEMORY / 自动记忆**:本文件是唯一真相源;任何续接只靠读它 + 同目录文件。
- 顺序可调:若某批做一半发现依赖前一批,回头补 B0 地基。

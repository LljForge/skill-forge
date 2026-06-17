# skill-eval-harness 设计

> 把「跑 skill 分析模块 → 观察过程 → 记录候选问题 → 选真问题 → 优化 skill」这个**已被手动验证有效**的循环,规模化 + 半自动化,落成一套**可反复用、跨多 skill** 的评测基建。
> 本质 = harness engineering / eval-driven skill iteration:skill 是 harness 组件,本基建是它的「事后裁判」(eval harness)。

---

## 0. 背景与定位

### 动机来源(为什么这事值得做)
- 用户已**手动跑过两遍**同类循环并产出高质量产物:recon-driven-dev 的「执行观察报告」、codebase-exploration 的「改造调研报告」。
- 更硬的证据:`module-brief` 的 **v1.0.1 就是一次 dogfood 观察驱动的真修复**(survey-agent 把通用陷阱「保留+自标注」而非删除 → 根因定位到 design-format §5 → 收紧)。**单跑已能逼出真 skill 缺陷**;本基建是把这动作规模化。

### 概念框定(调研核验过的一手结论)
- **Agent = Model + Harness**:skill 是 harness 组件(模型之外的脚手架)。改进 skill = harness engineering(LangChain/Trivedy,核验 supported)。
- **eval harness acts after the fact, agent harness during the fact**(arXiv 2606.10106,supported):批跑+观察=给 skill 配「事后裁判」;skill 运行时本身=「赛中载具」。
- **迭代靠 evals + traces + 人审三件套,人保留发布权**(Arize,supported)→ 背书「半自动、人选」。
- **风险**(supported):自改写元循环会 reward hacking(Sakana DGM);LLM 评审有 self-preference bias;无 ground truth 时自改进会退化 → **人审是 ground-truth 锚**,不是过渡妥协。

### 边界(止于候选清单)
本基建只做「评测 → 观察 → 聚合 → 分类 → 人选」,**产出一份分类好的候选缺陷清单 + 给 skill-forge 的交接包**。真正改 skill 走既有 `skill-forge`/`skill-creator` eval 流程。两件事职责清晰、各自独立演进。

### 用户已拍板的关键决定(本设计的约束)
| # | 决定 |
|---|------|
| 边界 | 止于候选清单,交接 skill-forge |
| v1 靶 | `module-brief`(最轻:1 门、纯只读、已有 5 模块基线可对照) |
| 架构 | 方案三**混合**:headless 批跑(无人值守)+ 交互聚合(人判) |
| 剥门 | 剥门全自动跑 headless,**有门的 skill 才加 headless 模式**,交互门后续保留(默认态) |
| 过拟合 | 候选分类 通用 skill 缺陷 / 项目特有噪声,**只前者喂 skill-forge** |
| 人审探针 | 保留人审探针抓**事实性错误**(自动观察抓不到的) |
| 后台机制 | v1 走 A(机器开着、harness 后台任务、跑完自动唤醒接第二段);B(彻底关机过夜 OS 脱离)以后再说 |
| 落位 | harness + 两个目标 skill 一起抽到 `skill-forge`;GMZB 侧只留 corpus + 指针 |

---

## 1. 系统形态

### 1.1 引擎 / 清单分离(复用机制)
| 层 | 内容 | 项目无关? |
|----|------|-----------|
| **引擎**(复用) | runner、trace hook、per-run 观察器、跨轮聚合/分类器、候选报告骨架、清单 schema | ✅ 严禁夹带项目真值,例子用 `com.<root>.` 占位 |
| **清单**(每 skill 一份) | 跑什么语料、剥门预设答案、剥门变体、该 skill 特有 rubric、硬校验器 | 部分绑 skill/项目 |

→ **接一个新 skill = 写一份清单(+ 有门则加 headless 模式),引擎不动**。

### 1.2 一个状态感知入口 + 两段
`/skill-eval <目标skill>` 自己看 workspace 状态决定干哪段:

```
你调 /skill-eval module-brief
   ├─ 没跑过批  → 起批跑(harness 后台任务),报「N 模块/约 X 分钟/日志」,返回
   ├─ 批在跑    → 报进度「8/12 完成」
   └─ 批跑完    → 进第二段:观察 → 人审探针 → 聚合分类 → 候选清单 → 你选 → 交接包
```
- 一个命令、一个入口、状态自适应;`run.sh` 是 skill 内部资产,用户不直接碰。
- **A 模式无缝**:批跑挂 harness 后台任务,跑完 harness 自动唤醒、同一次流程接第二段。代价:批跑期间机器保持开着(别强制关机/杀 CLI)。

### 1.3 两条边
- 上游:语料来自目标项目现成的 codebase-map(已逐模块标 ✅/⚖️/⬜ + 范围提示),不现搭。
- 下游:止于「分类好的候选缺陷清单 + skill-forge 交接包」,不碰 skill 本体。

### 1.4 落位三层(抽到 skill-forge)
| 层 | 放哪 | 备注 |
|----|------|------|
| harness 引擎 + 清单 schema | `skill-forge/skills/skill-eval/` | 项目无关,**严禁夹带 GMZB 真值**(模块名/前缀),靠人眼复核 |
| 目标 skill(module-brief / spec-baseline) | `skill-forge/skills/`(promote) | 本就项目无关,迁到正经家 |
| corpus 定义(哪些模块 + 预设答案 + `target_project` 路径) | **留 GMZB 侧** | 项目特有知识,源自 GMZB codebase-map,不进 skill-forge |

harness 读「目标项目的 corpus 文件」→ `cd` 进该项目跑 `claude -p`。**GMZB 特有值全锁在 GMZB 侧 corpus,引擎保持纯净。**

---

## 2. 第一段:批跑(headless,无人值守)

### 2.1 清单 schema(以 module-brief 为例)
```yaml
target_skill: module-brief
target_project: /Users/lilongjian/Projects/GMZB/master-data   # corpus 侧,不入引擎
corpus:                       # 取自 codebase-map §8 的 ✅/⚖️ + 范围提示
  - module: mdm-employee
    preset_answers: { module_cn: 员工, scope: "com.itgfin.masterdata 前缀=BaseEmployee*", exclude: [] }
  - module: mdm-organization
    preset_answers: { ... }
  # ...
runs_per_target: 1            # 默认 1;可对子集设 2-3 看一致性
gates:                        # 声明交互门 → 决定要不要 headless 模式;无门则空
  - step: "Step 1 定位确认"
    answer_from: preset_answers
hard_validators: []           # module-brief 无;spec-baseline 会有 openspec validate --strict
rubric_ref: rubrics/module-brief.md   # 该 skill 特有观察项
```

### 2.2 剥门:有门才加 headless 模式
- **研究硬约束**:headless 无 TTY 下 `AskUserQuestion` 会在 PreToolUse hook 介入**之前**就静默返回空答案(GitHub #50728,核验 supported)。→ 剥门**不能靠 hook 自动答**,只能在 **skill 定义里做**。
- **做法**:目标 skill 加一个 headless 分支——`若 EVAL_HEADLESS:从清单读预设答案、跳过 AskUserQuestion、把输出目录重定向到 $EVAL_OUT;否则照常交互`。
  - 这正是「决定:剥门」:headless 模式=剥门跑;交互模式一直在=「保留的门」、是默认。门被**参数化**,不是删掉。
  - **只对有门的 skill 加**;`gates: 无` 的 skill 直接裸跑、零改动、不走 skill-forge。
- **为何不维护 `-headless` 副本**:副本会漂移 → 你在评测一个过时 skill,观察失真。加模式分支保证「评的是真 skill,只少了那道门」。
- **产物隔离**:headless 模式输出落 `$EVAL_OUT/<模块>/`,**绝不覆盖真的产物目录**(否则冲掉基线 + git 噪声)。

### 2.3 观察:专用 trace hook
- 给 `claude -p` 挂一份**专用 `eval-settings.json`**(只含 trace hook),跟用户日常 hooks 完全隔离。
- PostToolUse + SubagentStop 把每次工具调用落 `trace.jsonl`:`{ts, agent_id, agent_type, tool_name, tool_input_digest, tool_response_status}`。
- ⚠️【2026-06-17 本机实测 claude 2.1.163,纠正研究假设】**PostToolUse 的 `agent_id`/`agent_type` 主/子 agent 都为空**——研究说"子 agent 工具调用带 agent_id/agent_type"在本机**不成立**。能拿到的:① 全量工具调用序列(但无法区分是主 agent 还是 survey-agent 子 agent 发的);② `SubagentStop` 事件带 `agent_type`(只能证明子 agent 起停、拿不到其内部调用归属)。→ **含义**:2B 观察器的「survey-agent 真读了模块代码吗」**不能靠 trace 工具归属**,改用**产物侧证据兜底**(design.md 是否引用真实类名/方法/表名 = 读过代码的证据)。trace 仍可用于「整体读了多少代码/工具分布/有没有报错」等不依赖归属的检查。
  > 【2026-06-17 二次更正·以真实批跑产物为准,推翻上一条假设】对 hook 修复(`c7e67b3`)后的真实批跑 trace 逐行核验:**子 agent 工具调用其实带得到归属**——survey-agent spawn 之后,它的每次 `Read/Grep/Glob/Write` 都填了 `agent_id`(一串 hash)且 `agent_type="general-purpose"`;`SubagentStop` 也带同一 `agent_id`。为空的只有 spawn **之前**主 agent 自己的调用(Step 1 的 `echo $EVAL_HEADLESS` 等)与 `Agent`(spawn)那一行。实测分布:run `144516` 25/33 行归属子 agent、run `142256/bank-financial` 39/50。→ **含义(覆盖 2B 设计)**:观察器的「survey-agent 真读代码吗 / 恰好起 1 个子 agent」**以 trace 归属为确定性主检查**(数 `tool_name=Agent` spawn 数 / distinct 非空 `agent_id` 数 / `SubagentStop` 数 == 1;数带非空 agent_id 的 Read/Grep 计子 agent 真实读量),**产物侧证据(design.md 引真实类名/表名)降为语义佐证**(「读了文件 ≠ 产物有据」,两路独立、互补)。⚠️ **agent_type 是 `general-purpose` 不是 `survey-agent`**——「1 个子 agent」检查**禁止**匹配 `agent_type=="survey-agent"`(永不命中),只数 spawn/distinct-id/SubagentStop。

### 2.4 run.sh 循环
```
读 corpus → 每模块 × K:
  ├─ 写预设答案到约定路径
  ├─ claude -p "/<目标skill> <模块>"  --output-format stream-json
  │     --settings eval-settings.json  权限免门(acceptEdits/allowedTools)  EVAL_HEADLESS=1
  ├─ 收:产物 + trace.jsonl + result.json + 耗时 + 退出码 → workspace
  └─ 失败显式记账(不静默掉模块),继续
→ 落 **scratch workspace**(可弃、gitignored):`<scratch>/skill-eval/<目标skill>/<run-id>/runs/<模块>/...`
```
> **落点分工**:原始 run(trace/评测产物/result)= scratch、可弃、不入 git;唯一**留存物是第二段产出的候选报告 + 交接包** → 提交进 skill-forge(它本就喂 skill-forge)。
- 由 `/skill-eval` 以 harness 后台任务起;跑完自动唤醒接第二段(A 模式)。

---

## 3. 第二段:聚合(交互)

### 3.1 per-run 观察器
> **核心原则:观察器不自创标准,拿「skill 自己声明的契约」当尺子**——format 参考文件 + SKILL.md 的「刻意不做」清单 + 运行画像。偏离自己声明的契约才算 finding。这样 finding 合法、项目无关。

读一个 run 的 `{trace + 产物 + result}`,产三类 finding(带证据锚:trace 行 / 产物行):

**A. 流程性(读 trace+result,确定性自动,最便宜最高信)**
| 查什么 | 怎么查 |
|--------|--------|
| 跑完没/报错没 | exit 0、子 agent 成功标志 |
| 恰好起 1 个 survey-agent | trace spawn 数(skill 声明「只 1 个子 agent」;0=内联、2+=过度并行) |
| 两份产物写了、落对路径、>100 字节 | 文件存在性(skill 自己的兜底线) |
| survey-agent 真读了模块代码吗 | trace 里对模块文件的 Grep/Read 计数(近乎没读就写=幻觉红旗) |
| 耗时离群 | 某模块 ≈5× 中位数(skill 在该模块形态吃力) |
| headless 门吃到预设答案没 | trace 看门那步(防「以为剥门其实空过」) |

**B. 产物契约性(产物 vs format 参考,多数 grep/count + 少数判断)**
| 查什么 | 怎么查 |
|--------|--------|
| 结构完整 | design.md 五节齐 / requirements 必备节齐 |
| 抽象层越界(大头) | requirements.md 禁代码标识 → grep CamelCase 类名/`.java`/SQL/方法调用语法 |
| 碰「刻意不做」 | 穷举 PO 字段(超大表)?画全部状态机?陷阱数爆? → 规模/count |
| 自标注反模式 | grep 对冲措辞:保留该删的还自注「这条偏通用」(**v1.0.1 那缺陷,可自动逮**) |
| 陷阱质量(判断 agent) | agent 判每条陷阱是具体(点名 PO/表/触发器)还是通用废话 |

**C. 事实性(产物 vs 真代码,不可自动采信)**
| 查什么 | 怎么查 |
|--------|--------|
| 产物对代码的断言(X 调 Y、锚 PO 映射表 Z、调用链 A→B→C) | → 走人审探针(下) |

**怎么查分三档成本/信任**:确定性 grep/count(便宜高信) > 判断 agent(中) > 人审(只给复发/存疑的)。
**rubric 分层**:「跑完没/产物写没/节齐没/耗时离群」是**引擎通用**;「恰 1 个 survey-agent、requirements 禁标识、那份刻意不做清单」是**清单声明的 skill 特有项**。

### 3.2 人审探针(事实性,决定 4)
- grounding agent 重读相关代码,把每条事实性断言预筛为 像真/像错/存疑。
- **人只裁决「像错 / 存疑 / 复发」的那几条**(grounding 仅供参考、不自动采信)→ 你是事实正确性的最终 ground-truth。
- 精妙:一个模块的事实错可能是(a)模型一次性手滑、或(b)skill 系统性误导——**复发信号(下)正好区分**:人审说「是错的」,复发率说「是不是 skill 的错」。

### 3.3 跨轮聚合分类器(批量评测比单跑多出的价值)
barrier(全部 finding 到齐后):
- **聚类**:同根因跨模块 → 合成一个候选。
- **★复发滤网**:某候选 8/12 复现 ≫ 1/12 —— 系统性 skill 缺陷 vs 一次性噪声的最强判据。
- **一致性信号**(K>1):同模块多跑产出发散 = 鲁棒性缺口。
- **通用/项目特有分类**(决定 2):只通用喂 skill-forge;**看「为什么复发」**——若因所有模块共享同一项目特征而复发,仍判特有(项目特有 → 候选归 CLAUDE.md 或弃,不改 skill)。
- **定位嫌疑产物**:如「陷阱质量类复发 → design-format §5」(就是 v1.0.1 修法),给 skill-forge 起点。
- **诚实标**:能力缺口 / 工程小优(哲学 §6,别 oversell)。

### 3.4 候选报告 + 人选 → 交接包
排序候选清单,每条:标题、类别、证据(哪些模块 + trace/产物摘录)、复发率(N/M)、一致性、分类(通用/特有)、能力 vs 工程标、嫌疑产物、修法方向。
**你选**哪些是真问题且值得修 → 选中项打包成 **skill-forge 交接包**(每条含上述全字段)。**基建到此为止。**

---

## 4. 复用性:接第二个 skill

接 `module-spec-baseline` 示例 = 填三样:corpus / gates(2 门 → 加 headless,走 skill-forge)/ rubric。引擎与 run.sh 不动。
**抽象甜点**:不同 skill 贡献不同信号强度——spec-baseline 自带硬信号 `openspec validate --strict`,观察器对评测产物跑一遍,失败=毫不含糊的确定性缺陷(比 module-brief 软检查强)。清单 `hard_validators` 字段把这类硬门声明出来。

---

## 5. 内建护栏

| 护栏 | 做法 | 来源 |
|------|------|------|
| 过拟合 | 分类 通用/项目特有,只通用喂 skill-forge;看「为什么复发」剔除共享项目特征导致的伪通用 | 决定 2 / 哲学 §7 |
| 自偏好·无 ground-truth | 观察器/分类器**绝不自动晋级**;人选是 ground-truth 锚;事实正确性专走人审,grounding 仅参考 | 研究(DGM/self-preference) |
| 诚实框定 | 每候选标 能力缺口/工程小优,报告不许 oversell | 哲学 §6 |
| 不静默截断 | runner 显式记掉的模块;报告写清覆盖率(N/M 真贡献) | 哲学 |
| 不造 finding | 按固定 rubric 报,「这轮 0 candidate」是合法诚实输出,不为凑数硬找 | 防 reward hacking |

**未来更狠的过拟合护栏(非 v1)**:拿基建跑第二个代码库——跨两个不同库都复发的候选才铁定通用。v1 单库,但分类器先把这条路留着。

---

## 6. v1 范围与验证

### v1 做
- 靶 = `module-brief`,corpus = GMZB 模块(codebase-map §8 的 ✅/⚖️ 集)。
- 全链跑通:批跑 → 观察 → 人审探针 → 聚合分类 → 候选清单 → 人选 → 交接包。

### v1 验证(证据先行,真实数据)
1. **回归已知缺陷(黄金测试)**:复现 v1.0.1 缺陷条件(自标注通用陷阱),观察器能否逮回该缺陷类(自标注反模式)?能=最强有效证据。
2. **全模块批跑 → 看候选清单信噪比**:top 候选是不是你真会去修的?由你(人)判。全噪声 → rubric 收紧。
3. **诚实定性(哲学 §6)**:验收口径 = 「产出一份低噪、排好序、人能比手动 dogfood 更快下手的候选清单」,而非「找到能力 bug」。多半价值是工程性,如实写进 skill-eval 自己的 CHANGELOG。

### v1 不做(显式划界)
- B 模式(彻底关机过夜的 OS 级脱离进程)。
- 第二个代码库 corpus。
- spec-baseline 接入(骨架稳了再接,验证跨 skill 抽象)。

---

## 7. 落位与伴随迁移

| 动作 | 细节 |
|------|------|
| harness 落地 | 新建 `skill-forge/skills/skill-eval/`(SKILL.md + run.sh + eval-settings.json + 清单 schema + rubrics/ + agents/) |
| 目标 skill promote | `module-brief`、`module-spec-baseline` 迁到 `skill-forge/skills/`;有门的加 headless 模式(走 skill-forge eval 流程) |
| GMZB 侧 | 新增 corpus 文件;更新 CLAUDE.md skill 工具地图指针;从 `.claude/skills/` 移除被 promote 的 skill,确保全局发现不断 |
| 原始 run | 落 scratch(gitignored、可弃),**不再污染 GMZB `docs/`** |
| 候选报告 + 交接包 | 唯一留存物,提交进 skill-forge(与 skill 改进同家) |

> promote 两个目标 skill 是**伴随动作**,实现计划里先于 harness 排:先 promote + 加 headless 模式,再建 harness 对它们评测。

---

## 8. 风险与动手前必做

1. **AskUserQuestion headless 行为版本敏感**:研究是文档+issue 调研、**未本机实跑验证**。**动手前先冒烟测试**——用一个含 `AskUserQuestion` 的最小 skill 在本机 `claude -p` 跑一次,确认当前版本到底是 空过 / 阻塞 / 报错,再据此定剥门细节。
   > 【2026-06-17 本机实测】claude-code 2.1.163:headless 下 AskUserQuestion = **permission_denied 型空过**——工具调用被拒(出现在 `permission_denials` 列表),模型拿到 `<error>Answer questions?</error>` 错误字符串后**流程继续**,session `terminal_reason: completed`、exit 0,耗时约 22s。与调研 #50728 「静默返回空答案」有细节差异:不是答案为空数组,而是收到 error 字符串但流程仍不阻塞。计划二剥门按「skill 内 headless 分支读预设答案、跳过 AskUserQuestion」推进,无需调整大方向;但 skill 内 headless 分支需用 `$EVAL_HEADLESS` 环境变量或预设参数主动规避 `AskUserQuestion` 调用(不能依赖工具被空过后恢复正常——它拿到的是错误字符串,可能干扰后续逻辑)。
2. **子 agent 嵌套观察**:module-spec-baseline 起 4-5 个子 agent,trace 量大;v1 只 module-brief(1 子 agent)先不碰这复杂度。
3. **promote 目标 skill 的发现机制 + openspec specs 联动**:确认迁移后 GMZB 仍能发现这两个 skill;module-spec-baseline 与 `openspec/specs/` 的关系不被迁移破坏。
4. **token 成本**:全模块 × K 跑 `claude -p`,K 默认 1 控成本;一致性多跑只对小子集开。
   > 【2026-06-17 实测】批跑侧端到端跑通(run.sh + headless 模式 + trace hook)。module-brief 的 survey-agent **默认继承会话模型(实测跑在 Opus)、约 $1.92/模块** → 全 15 模块一轮 ≈ $29。**可优化**:eval 批跑给 `claude -p` 钉更便宜模型(Sonnet/Haiku)做 module-brief,成本可大幅降——属 run.sh/eval 配置的调优旋钮,2B 或后续按需开。
   > 【集成 bug 已修】run.sh 的 `EVAL_OUT` 曾设成已含模块名的目录、与 module-brief「追加 `/<module>/`」契约冲突致产物双嵌套+误判失败;已修为 `EVAL_OUT`=父目录(commit 92168e1)。trace `tool_response_status` 对 Read 类工具记为 `empty`(hook 保真小瑕疵、不阻断,2B 知悉即可)。

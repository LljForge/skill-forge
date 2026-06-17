# skill-eval 操作手册(怎么实际跑)

> 这是**照着抄就能跑**的操作手册。决策/背景看 [2c runbook](2026-06-17-skill-eval-2c-real-harvest-runbook.md),权威设计看 `docs/superpowers/specs/2026-06-17-skill-eval-harness-design.md`。

## 0. 心智模型:两段,跑在两个地方

| 段 | 干什么 | **在哪跑** | 有人值守? |
|----|--------|-----------|-----------|
| **① 批跑** | 对每个模块 headless 跑一遍目标 skill,落产物+trace | **终端**(`run.sh` 是 bash 脚本,自己 `cd` 进目标项目调 `claude -p`) | 无人值守,但机器别关 |
| **② 聚合** | 观察→判断→人审探针→聚合→候选报告→你选→交接包 | **Claude Code 会话**(要派子 agent + grounding 要 mysql MCP) | 你要在场裁决 |

两段用 `SKILL_EVAL_SCRATCH`(默认 `~/.cache/skill-eval`)里的 run 目录衔接。

**路径速记**(下文用这两个变量):
```bash
SE=/Users/lilongjian/Projects/AI/skill-forge/skills/skill-eval   # skill-eval 引擎目录
G=/Users/lilongjian/Projects/GMZB/master-data                    # 目标项目(GMZB)
```

---

## 1. 前置(一次性确认)
- `claude` CLI 已装且已登录(`run.sh` 内部调 `claude -p`)。
- 目标项目代码在盘:`$G/master-data-be/`(survey-agent 要读代码)。
- `python3` + `pyyaml`(`python3 -c "import yaml"` 不报错)。
- corpus 文件在:`$G/.skill-eval/corpus/module-brief.yml`(15 模块,已在 GMZB main)。
- 聚合段的 grounding 要查库:在 Claude 会话里有 `mcp__mysql_mdm_dev`(dev 库 = 测试库,只 SELECT)。
- Nacos/MySQL/Redis 是否需在线:批跑 module-brief 一般只需代码在盘;grounding 才需库。

---

## 2. 跑法 A(推荐):终端跑批 → 会话聚合

### ② 批跑(终端,copy-paste)
```bash
export SKILL_EVAL_TARGET_PROJECT=/Users/lilongjian/Projects/GMZB/master-data
export SKILL_EVAL_CORPUS_LIMIT=4        # ★先跑前 4 个模块试信噪比;要全量就删掉这行(或设 0)
# 可选省钱旋钮(默认不设=继承会话 Opus,效度最高):
# export SKILL_EVAL_MODEL=claude-sonnet-4-6

bash /Users/lilongjian/Projects/AI/skill-forge/skills/skill-eval/run.sh module-brief
```
跑完末尾会打印:
```
[run.sh] batch run complete
  ok: 4  failed: 0  processed: 4
  workspace: /Users/lilongjian/.cache/skill-eval/skill-eval/module-brief/<run-id>
```
记下 `<run-id>`。可随时另开终端查进度:
```bash
bash $SE/run.sh status module-brief     # → none | running <id> | done <id>
```

### ① 聚合(Claude Code 会话)
随便在哪开一个 Claude Code 会话,输入:
```
/skill-eval module-brief
```
它探到 `done <run-id>` → 自动:对每模块跑 `observe.py` → 派 `quality-judge` + `grounding-probe` 子 agent → `aggregate.py` → 派 `aggregator` → 给你**候选报告** → 你裁决事实性 + 选真问题 → 把选中的"通用"候选打成 `handoff/` 交接包。**到此为止,改 skill 走 skill-forge。**

---

## 3. 跑法 B(全程一个会话,A 模式)
在 Claude 会话里直接:
```
/skill-eval module-brief
```
探到 `none` → 它起**后台批跑**(harness 后台任务),报「N 模块/约 $X/日志」,跑完**自动唤醒接聚合**。
- **要限制模块数**:开 claude **之前**先 `export SKILL_EVAL_CORPUS_LIMIT=4`,或直接跟它说「只跑前 4 个模块」(它会带 `SKILL_EVAL_CORPUS_LIMIT=4` 起 `run.sh`)。
- **代价**:批跑期间机器保持开着、别杀 claude(后台任务在跑)。
- 想彻底无人值守过夜(关机级脱离)= 设计里的 B 模式,v1 不做。

---

## 4. 四个 env 变量(就这四个,都是 shell 环境变量)

| 变量 | 默认 | 怎么设 / 何时用 |
|------|------|----------------|
| `SKILL_EVAL_TARGET_PROJECT` | 无(**必填**) | `export SKILL_EVAL_TARGET_PROJECT=/Users/lilongjian/Projects/GMZB/master-data`。run.sh 据此找 corpus、`cd` 进去跑。 |
| `SKILL_EVAL_CORPUS_LIMIT` | `0`(=全部) | `export SKILL_EVAL_CORPUS_LIMIT=4` → 只跑 corpus 前 4 个模块。**这就是你问的"怎么设"——一行 export,不用去找。** 想全量就别设或设 0。 |
| `SKILL_EVAL_MODEL` | 不设(=继承会话 Opus) | `export SKILL_EVAL_MODEL=claude-sonnet-4-6` → 钉便宜模型省钱。**慎用**:弱模型会把"模型能力差"误算成"skill 缺陷",折损评测效度。 |
| `SKILL_EVAL_SCRATCH` | `~/.cache/skill-eval` | 一般不用改;想换产物落点才设。 |

> 这些都是**普通环境变量**:在哪个终端跑 `run.sh`,就在哪个终端先 `export`。它们只在那个 shell 会话里生效;新开终端要重设。

---

## 5. 产物在哪 / 怎么看
```bash
RUN=~/.cache/skill-eval/skill-eval/module-brief/<run-id>
cat   $RUN/run-manifest.json                 # ok[]/failed[]/summary —— 哪些模块成功/失败
ls    $RUN/runs/<module>/                     # requirements.md design.md trace.jsonl run.json run-meta.json findings.json
cat   $RUN/candidate-report.md                # ★聚合段产的候选清单(②跑完才有)
```
- **原始 run = scratch、可弃、不入 git**;唯一留存物 = 候选报告 + 交接包(交 skill-forge)。
- 真 `docs/module-brief/` **不会被碰**(headless 输出隔离到 scratch)。

---

## 6. 聚合段的"黑盒"拆开(想手动跑/排查时)
`/skill-eval` 的 ② 段等价于这串(会话里):
```bash
SE=/Users/lilongjian/Projects/AI/skill-forge/skills/skill-eval
RUN=~/.cache/skill-eval/skill-eval/module-brief/<run-id>

# B1 确定性观察(终端/会话都行)——每模块产 findings.json
python3 $SE/lib/observe.py "$RUN" --skill module-brief

# B2/B3 派子 agent(只能在会话里):对每个 $RUN/runs/<m>/ 派
#   quality-judge  ($SE/agents/quality-judge.md)  → <m>/judge.json
#   grounding-probe($SE/agents/grounding-probe.md) → <m>/grounding.json
#   ★派发时必须把"输出 schema + 输入路径"写进 prompt(agent 刻意不内置 schema)

# B4 跨轮聚合(确定性)——多个同 skill run 一起传可出一致性信号
python3 $SE/lib/aggregate.py --skill module-brief --run "$RUN" --out "$RUN/aggregate-input.json"

# B5 派 aggregator ($SE/agents/aggregator.md) → $RUN/candidate-report.md(按 templates/handoff-schema.md)
```

---

## 7. 接一个新目标 skill(以 module-spec-baseline 为例)

**结论先说**:run.sh / aggregate.py / 三个 agent 已**真 skill 无关、不用动**;要做的是 **3 份清单(manifest/corpus/rubric)+ 给目标 skill 加 headless 模式 + 给 `observe.py` 的 B 类补两处**(对齐新产物 + 跑 hard_validators)。逐项:

1. **写 manifest**(引擎侧,**无项目真值**):`$SE/manifests/module-spec-baseline.yml`,照 `module-brief.yml` 改:
   ```yaml
   target_skill: module-spec-baseline
   target_project_env: SKILL_EVAL_TARGET_PROJECT
   corpus_file: .skill-eval/corpus/module-spec-baseline.yml
   runs_per_target: 1
   gates:                       # spec-baseline 有 2 个交互门 → 列出来
     - { step: "...门1...", answer_from: preset_answers }
     - { step: "...门2...", answer_from: preset_answers }
   hard_validators:             # ★它自带硬信号
     - openspec validate --strict
   rubric_ref: rubrics/module-spec-baseline.md
   ```
2. **写 corpus**(GMZB 侧,真值只在这):`$G/.skill-eval/corpus/module-spec-baseline.yml`,每模块 `module` + `preset_answers`(含两道门的预设答案)。
3. **写 rubric**(引擎侧,无真值,`com.<root>` 占位):`$SE/rubrics/module-spec-baseline.md` = 机读 YAML 块(该 skill 声明的契约:章节/禁项/期望子 agent 数…)+ prose(判断指引)。
4. **给 module-spec-baseline 加 headless 模式**(它有 AskUserQuestion 门):走 **skill-forge eval 流程**改那个 skill,加 `$EVAL_HEADLESS` 分支——读 `$EVAL_PRESET`、跳过门、输出重定向 `$EVAL_OUT`。(module-brief 已有,直接参照它。)
5. **(引擎要补两处 —— 接第二靶才需要,诚实标注)**:
   - **5a. observe.py 的 B 类观察对齐新产物**:`observe.py` 的 **A 类**(跑完没/恰 1 子 agent/真读代码/门/耗时)是**真 skill 无关**的,直接复用;但 **B 类**(产物契约)目前是按 module-brief 的两份产物(`design.md`=5 节+陷阱+自标注;`requirements.md`=4 节+禁代码标识)写死了**文件名 + "哪份产物跑哪类检查"的绑定**(`observe.py:19/98/129`)。spec-baseline 的产物是 openspec `spec.md`、检查口径也不同,所以要么让 rubric 把"产物→检查类型"的映射也声明出来 + observe.py 据此跑,要么给 spec-baseline 配自己的 B 类逻辑。**这是接第二靶的主要引擎工作。**(检查的"参数"——节名/禁项/阈值——已经从 rubric 读了,要补的是"结构/绑定"那层。)
   - **5b. hard_validators 执行**:`observe.py` 还没"跑 `manifest.hard_validators`"这一步(module-brief 没硬门、用不上)。spec-baseline 要加:对评测产物跑 `openspec validate --strict`,失败=毫不含糊的确定性缺陷(design §4 的硬信号)。
   > 注:run.sh / aggregate.py / 三个 agent 已**真 skill 无关**(2026-06-17 专门扫过一轮 skill-名/产物-名硬编码并清掉);要动的引擎代码集中在 `observe.py` 的 B 类。
6. 然后照常:`bash run.sh module-spec-baseline` + 会话 `/skill-eval module-spec-baseline`。

> spec-baseline 起 4-5 个子 agent(trace 量大,design §8.2),比 module-brief 的 1 个子 agent 重,先有心理预期。

---

## 8. 成本/时间预估(module-brief,Opus)
- 单模块 ≈ **$1.9 / 约 5-6 分钟**。
- 先跑 `SKILL_EVAL_CORPUS_LIMIT=4` ≈ **$8 / 约 25 分钟**,看信噪比再决定全量。
- 全 15 模块一轮 ≈ **$29 / 约 1.5 小时**。
- 钉 `SKILL_EVAL_MODEL=claude-sonnet-4-6` 能明显降本,但折损效度,只在成本敏感探索跑时用。

---

## 9. 常见坑
- `SKILL_EVAL_TARGET_PROJECT not set` → 你没 export(或新开了终端没重设)。
- `corpus file not found` → corpus 路径 = `$TARGET_PROJECT/<manifest.corpus_file>`;确认 `$G/.skill-eval/corpus/module-brief.yml` 在。
- `status` 一直 `running` → 上一轮批跑中途被杀,留了 `STARTED` 没写 `summary`;重跑会起新 run-id,或手动删那个半成品 run 目录。
- 聚合段派 agent 报 schema 不符 → 派发 prompt 漏了输出 schema(B2/B3/B5 必须带 schema,见 §6)。
- 历史 `20260617-142256` 那种**双层目录**(`runs/<m>/<m>/`)是已修的旧 bug 遗留;`observe.py` 能容,新批跑都是单层,不用管。

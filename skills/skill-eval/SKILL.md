---
name: skill-eval
description: 对一个目标 skill 批跑分析各模块→观察→聚合→产候选缺陷清单+skill-forge 交接包。状态感知:没跑过批就起批跑(后台),跑完接聚合。显式调用 /skill-eval <skill>,不自动触发。
---

# skill-eval:skill 的事后裁判(eval harness)

把「批跑 skill → 观察过程 → 记候选问题 → 人选真问题 → 交 skill-forge」规模化、半自动化。**止于候选清单,交 skill-forge,不碰 skill 本体**。引擎项目无关;目标项目特有值只在该项目的 `.skill-eval/corpus/<skill>.yml`。

## 用法

`/skill-eval <目标skill> [具名参数…]`。具名参数都**可选、顺序随意**:

| 参数 | 作用 | 默认 |
|------|------|------|
| `--limit N` | 只跑 corpus 前 N 个模块(试信噪比) | 全量 |
| `--model M` | 钉模型(如 `--model claude-haiku-4-5`),省钱但折损评测效度 | 不设=继承会话 Opus |
| `--project PATH` | 目标项目根 | 当前项目根(`git rev-parse --show-toplevel`,取不到用 `pwd`) |
| `--fresh` | 无视已有 `done` 批,强制起新批跑(不复用历史 run) | 默认探到 `done` 就接它聚合 |

例:`/skill-eval module-brief`(全量·Opus·评当前项目)、`/skill-eval module-brief --limit 4`、`/skill-eval module-brief --limit 4 --model claude-haiku-4-5`、`/skill-eval module-brief --fresh`(强制重跑一批)。先探状态,再决定干哪段。
> - **新能力一律走具名参数**(未来如 `--modules organization,company` 跑指定模块、`--runs 3` 一致性多跑),在 A 段同一处解析,不破坏现有调用——别再加位置参数。
> - **全程 Skill 驱动,用户不碰脚本**:A 段由本 skill 后台起批跑,B 段聚合也由本 skill 编排;`run.sh`/`lib/*.py` 是内部资产。

---

## Step 0:探状态

约定:`SCRIPT_DIR` = 本 skill-eval 目录(SKILL.md 与 run.sh、lib/、agents/ 同处);下文 bash 代码块为模板,Claude 执行时把 `SCRIPT_DIR`/`RUN_DIR`/`<skill>` 替换为实际值。

> **`--fresh` 短路**:本次调用带 `--fresh` 时,**跳过状态探测、直接进 A 段起新批**(无视下面的 `done`)。用于历史 run 不匹配本次意图时强制重跑。

```bash
bash "${SCRIPT_DIR}/run.sh" status <skill>
```

status 输出形如 `none` / `running <run-id> ok=X failed=Y processed=Z` / `done <run-id> ok=X failed=Y processed=Z`(KV 摘要供判断旧 run 是否匹配本次请求):

- 输出 `none` → 进 **A 段:起批跑**。
- 输出 `running <run-id> …` → **报进度**:据摘要 `ok=X failed=Y` 告知用户「已完成 X 模块,失败 Y 模块,批跑仍在后台运行中」,返回(不阻塞)。
- 输出 `done <run-id> …` → **先据摘要判断旧 run 是否匹配本次请求**:若 `processed` 与本次 `--limit`(或全量模块数)明显不符,或该 run 是历史/小批测试残留,**提示用户**「探到的是历史批 `<run-id>`(processed=Z),要接它聚合,还是 `--fresh` 重跑?」,按用户选择决定;匹配则直接进 **B 段:聚合**,`RUN_DIR=$SKILL_EVAL_SCRATCH/skill-eval/<skill>/<run-id>`。

---

## A 段:起批跑(无人值守,本 skill 自己起,用户不碰脚本)

> 状态探测为 `none` 时进入。

1. **解析具名参数 → 环境变量**(都可选;未来新 flag 在此扩展,不要回退到位置参数):
   - `--project PATH` → `TP=PATH`;否则 `TP=${SKILL_EVAL_TARGET_PROJECT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}`(取当前项目根)。
   - `--limit N` → 批跑时 `export SKILL_EVAL_CORPUS_LIMIT=N`;没给则全量。
   - `--model M` → 批跑时 `export SKILL_EVAL_MODEL=M`;没给则不设(继承会话 Opus)。
   - `--fresh` → 仅作 Step 0 的短路开关(无视 `done` 直接进本段),不对应 env;起批本身就是新 run。
2. **告知估算**:读 `$TP/.skill-eval/corpus/<skill>.yml` 取模块数;告知用户:实际要跑几个模块(有 `--limit` 则 min(N,上限))/ 预计耗时(~模块数×5min)/ 成本(~$1.9/模块·Opus)/ 模型(`--model` 给的 or 默认 Opus)/ 日志位置 `$SKILL_EVAL_SCRATCH/skill-eval/<skill>/<run-id>/`。
3. **后台起批跑**(用**后台 Bash**(run_in_background),不阻塞会话;只 export 解析到的项):
   ```bash
   export SKILL_EVAL_TARGET_PROJECT="<TP>"
   # 有 --limit 才加:  export SKILL_EVAL_CORPUS_LIMIT=<N>
   # 有 --model 才加:  export SKILL_EVAL_MODEL=<M>
   bash "${SCRIPT_DIR}/run.sh" <skill>
   ```
   告知用户「已后台起批跑,约 X 分钟;跑完我自动接 B 段聚合,期间别关会话/关机」。
4. **跑完自动接 B 段**:后台批跑完成(收到完成通知)→ 重走 Step 0 探到 `done` → 进 B 段,不用用户再开口。
   - 兜底:若用户中途关了会话,之后再 `/skill-eval <skill>` 一次即可——探到 `done` 直接接 B 段(产物在 scratch 等着)。

> 模型旋钮:`SKILL_EVAL_MODEL` 非空时 run.sh 的 `claude -p` 附 `--model "$SKILL_EVAL_MODEL"`;空=继承会话 Opus。

---

## B 段:聚合(交互,人判)

> 状态探测为 `done <run-id>` 时进入。`RUN_DIR` = `$SKILL_EVAL_SCRATCH/skill-eval/<skill>/<run-id>`。
> **目标项目路径**(B3 grounding 要用)从 `RUN_DIR/run-manifest.json` 的 `target_project` 字段读,**不依赖会话 env**——所以接 B 段时无需用户再设环境变量。

### B1 per-run 观察(确定性)

对每个模块运行 observe.py:

```bash
SCRIPT_DIR="<skill-eval 目录,即本 SKILL.md/run.sh 所在目录>"
python3 "${SCRIPT_DIR}/lib/observe.py" "${RUN_DIR}" --skill <skill>
# 一次调用自动遍历 ${RUN_DIR}/runs/ 下全部模块;每模块产出 ${RUN_DIR}/runs/<module>/findings.json
```

### B2 软判断(quality-judge agent,per 模块)

对每个模块**派发 quality-judge agent**。派发 prompt 必须包含以下全部内容(agent 本身不内置 schema,依赖派发者提供):

```
角色:skill-eval/agents/quality-judge.md(全文粘贴或路径 Read)

输入文件:
- design.md 路径: ${module_dir}/design.md
- rubric prose 路径: ${SCRIPT_DIR}/rubrics/<skill>.md
- needs_judge findings: <从 findings.json 抽取 verdict=needs_judge 的项,JSON 列表>

输出 schema(写到此路径): ${module_dir}/judge.json
{
  "module": "<module>",
  "traps": [
    {"text": "<§5 陷阱短文>", "label": "specific|generic|borderline", "reason": "一句理由"}
  ],
  "hedge_confirmations": [
    {"evidence": "<design.md 命中行摘录>", "confirmed": true, "reason": "是否真为 v1.0.1 保留+对冲标注"}
  ],
  "deliberate_dont_violations": [
    {"item": "<哪条刻意不做>", "violated": true, "evidence": "..."}
  ]
}

【JSON 合法性铁律】字符串值内的中文引述一律用中文引号「」,**严禁英文直双引号 `"`**(会破坏 JSON);内嵌英文代码/标识(如 @TableName("x"))必须写成 \" 转义。
```

agent 使用 `--allowedTools Read Grep Glob`(只读,不改产物)。

### B3 事实性预筛(grounding-probe agent,per 模块)

对每个模块**派发 grounding-probe agent**。派发 prompt 必须包含:

```
角色:skill-eval/agents/grounding-probe.md(全文粘贴或路径 Read)

输入:
- design.md 路径: ${module_dir}/design.md
- 目标项目根路径: 从 `RUN_DIR/run-manifest.json` 的 `target_project` 字段读(不依赖会话 env)

可用工具: Read / Grep / Glob(读代码) + mcp__mysql_*(只 SELECT,核对表名/字段真实性)

输出 schema(写到此路径): ${module_dir}/grounding.json
{
  "module": "<module>",
  "assertions": [
    {"claim": "...", "kind": "class|table|callchain|annotation", "prescreen": "像真|像错|存疑", "evidence": "文件:行 或 查询结果摘要", "needs_human": true}
  ]
}

【JSON 合法性铁律】字符串值内的中文引述一律用中文引号「」,**严禁英文直双引号 `"`**(会破坏 JSON);内嵌英文代码/标识(如 @TableName("x"))必须写成 \" 转义。
```

注意:`prescreen` 与 `needs_human` 必须一致——`像错`/`存疑` 对应 `needs_human:true`,`像真` 对应 `needs_human:false`。

### B4 跨轮聚合(确定性)

```bash
python3 "${SCRIPT_DIR}/lib/aggregate.py" \
  --skill <skill> \
  --run "${RUN_DIR}" \
  --out "${RUN_DIR}/aggregate-input.json"
```

### B4.5 校验 judge/grounding 合法性(确定性,防 agent 裸写 JSON 破损)

agent 裸写 JSON 易在中文叙述里夹英文直双引号而破坏结构。派 aggregator 前先兜底:

```bash
python3 "${SCRIPT_DIR}/lib/validate_json.py" "${RUN_DIR}"
```

- 全 `OK`/`REPAIRED`(自动修了中文夹英文引号)→ 退出码 0,继续 B5。
- 退出码 1 且打印 `STILL_BROKEN_MODULES <模块…>` → 对这些模块**重派一次**对应 B2/B3 agent(prompt 里强调「上次输出 JSON 非法,务必严格合法、中文引述用「」」),再跑本步;仍坏则在 B6 如实说明该模块 judge/grounding 缺失、不臆造。

### B5 聚类分类(aggregator agent)

**派发 aggregator agent**。派发 prompt 必须包含:

```
角色:skill-eval/agents/aggregator.md(全文粘贴或路径 Read)

输入文件:
- aggregate-input.json 路径: ${RUN_DIR}/aggregate-input.json
- 各模块 judge.json: ${RUN_DIR}/runs/<module>/judge.json(逐个列出)
- 各模块 grounding.json: ${RUN_DIR}/runs/<module>/grounding.json(逐个列出)
- handoff schema 路径: ${SCRIPT_DIR}/templates/handoff-schema.md

输出:写 ${RUN_DIR}/candidate-report.md(按 handoff-schema 候选清单格式)
```

### B6 人审 + 人选

把 `${RUN_DIR}/candidate-report.md` 呈给用户:

1. 列出所有候选(C1…Cn),标注分类(通用/项目特有)、诚实标(能力缺口/工程小优)。
2. 把 grounding.json 里 `needs_human:true` 的条目单独列出,请用户逐条裁决事实性(「是错」/「其实对」/「跳过」)。
3. 请用户从候选中选中要修的真问题(可 0 个,合法)。

> **基建不自动采信任何 finding,不自动晋级——用户裁决是唯一 ground-truth。**

### B7 打交接包

对用户选中的每条通用候选,按 `${SCRIPT_DIR}/templates/handoff-schema.md` 格式生成:

```
${RUN_DIR}/handoff/C{n}.md
```

汇总告知用户:`已生成 X 份交接包 → handoff/ 目录。提交进 skill-forge,走其 eval 流程改 skill,本基建到此为止。`

**本 skill 不碰 skill 本体。**

---

## 护栏

- 0 候选是合法诚实输出,别凑数、别造 finding。
- 覆盖率写清(N/M 真贡献,掉的模块显式列)。
- 每条候选标「通用 skill 缺陷 / 项目特有噪声」——**只有通用的喂 skill-forge**。
- 不 oversell,每条标 能力缺口 / 工程小优。
- agent 派发时**必须在 prompt 里给出输出 schema 与输出路径**;agent 本身不内置 schema,派发者负责注入。
- agent 写 JSON 须合法:中文引述用「」、英文标识 `\"` 转义;编排层在 **B4.5** 用 `validate_json.py` 兜底校验+修复,仍坏则重派对应 agent。
- B2/B3 agent 用 `--allowedTools Read Grep Glob`(B3 加 `mcp__mysql_*`),绝不用 `--dangerously-skip-permissions`。

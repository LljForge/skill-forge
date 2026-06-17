---
name: skill-eval
description: 对一个目标 skill 批跑分析各模块→观察→聚合→产候选缺陷清单+skill-forge 交接包。状态感知:没跑过批就起批跑(后台),跑完接聚合。显式调用 /skill-eval <skill>,不自动触发。
---

# skill-eval:skill 的事后裁判(eval harness)

把「批跑 skill → 观察过程 → 记候选问题 → 人选真问题 → 交 skill-forge」规模化、半自动化。**止于候选清单,交 skill-forge,不碰 skill 本体**。引擎项目无关;目标项目特有值只在该项目的 `.skill-eval/corpus/<skill>.yml`。

## 用法

`/skill-eval <目标skill>`(如 `/skill-eval module-brief`)。先探状态,再决定干哪段。

---

## Step 0:探状态

约定:`SCRIPT_DIR` = 本 skill-eval 目录(SKILL.md 与 run.sh、lib/、agents/ 同处);下文 bash 代码块为模板,Claude 执行时把 `SCRIPT_DIR`/`RUN_DIR`/`<skill>` 替换为实际值。

```bash
bash "${SCRIPT_DIR}/run.sh" status <skill>
```

- 输出 `none` → 进 **A 段:起批跑**。
- 输出 `running <run-id>` → **报进度**:读 `$SKILL_EVAL_SCRATCH/skill-eval/<skill>/<run-id>/run-manifest.json` 的 `ok`/`failed` 数组长度,告知用户「已完成 X 模块,失败 Y 模块,批跑仍在后台运行中」,返回(不阻塞)。
- 输出 `done <run-id>` → 进 **B 段:聚合**,`RUN_DIR=$SKILL_EVAL_SCRATCH/skill-eval/<skill>/<run-id>`。

---

## A 段:起批跑(无人值守)

> 状态探测为 `none` 时进入。

1. **告知估算**:读 `$SKILL_EVAL_TARGET_PROJECT/.skill-eval/corpus/<skill>.yml` 取模块数 N;告知用户:
   - N 个模块 / 预计耗时(~N×5min,Opus 基准)
   - 默认模型 Opus(评测效度最高,不加 `--model`);成本敏感可 `export SKILL_EVAL_MODEL=claude-haiku-4-5` 再触发
   - 日志位置:`$SKILL_EVAL_SCRATCH/skill-eval/<skill>/<run-id>/`
2. **以 harness 后台任务起批跑**:
   ```bash
   export SKILL_EVAL_TARGET_PROJECT=<目标项目绝对路径>
   nohup bash "${SCRIPT_DIR}/run.sh" <skill> \
     > "${SKILL_EVAL_SCRATCH:-$HOME/.cache/skill-eval}/skill-eval/<skill>/batch.log" 2>&1 &
   echo "批跑已后台启动,PID=$!;完成后 /skill-eval <skill> 接 B 段"
   ```
3. **返回,不阻塞**。机器保持开着;批跑完自动写入 `summary` 字段,下次调用探到 `done` 接 B 段。

> 若 `SKILL_EVAL_MODEL` 非空,run.sh 内部 `claude -p` 会附 `--model "$SKILL_EVAL_MODEL"`;空则省略(继承会话=Opus)。

---

## B 段:聚合(交互,人判)

> 状态探测为 `done <run-id>` 时进入。`RUN_DIR` = `$SKILL_EVAL_SCRATCH/skill-eval/<skill>/<run-id>`。

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
- rubric prose 路径: ${SCRIPT_DIR}/rubrics/module-brief.md
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
```

agent 使用 `--allowedTools Read Grep Glob`(只读,不改产物)。

### B3 事实性预筛(grounding-probe agent,per 模块)

对每个模块**派发 grounding-probe agent**。派发 prompt 必须包含:

```
角色:skill-eval/agents/grounding-probe.md(全文粘贴或路径 Read)

输入:
- design.md 路径: ${module_dir}/design.md
- 目标项目根路径: $SKILL_EVAL_TARGET_PROJECT

可用工具: Read / Grep / Glob(读代码) + mcp__mysql_*(只 SELECT,核对表名/字段真实性)

输出 schema(写到此路径): ${module_dir}/grounding.json
{
  "module": "<module>",
  "assertions": [
    {"claim": "...", "kind": "class|table|callchain|annotation", "prescreen": "像真|像错|存疑", "evidence": "文件:行 或 查询结果摘要", "needs_human": true}
  ]
}
```

注意:`prescreen` 与 `needs_human` 必须一致——`像错`/`存疑` 对应 `needs_human:true`,`像真` 对应 `needs_human:false`。

### B4 跨轮聚合(确定性)

```bash
python3 "${SCRIPT_DIR}/lib/aggregate.py" \
  --skill <skill> \
  --run "${RUN_DIR}" \
  --out "${RUN_DIR}/aggregate-input.json"
```

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
- B2/B3 agent 用 `--allowedTools Read Grep Glob`(B3 加 `mcp__mysql_*`),绝不用 `--dangerously-skip-permissions`。

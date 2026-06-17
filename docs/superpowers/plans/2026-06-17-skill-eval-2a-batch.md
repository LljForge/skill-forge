# skill-eval 计划二·2A:批跑侧 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建 skill-eval 的「批跑侧」——给 module-brief 加 headless 模式、写 corpus/清单、挂 trace hook、写 run.sh,能无人值守对 GMZB 各模块批跑 module-brief 并落下 {产物 + trace + result}。产出的真实 `trace.jsonl` 解锁计划 2B(聚合侧)。

**Architecture:** module-brief(已在 skill-forge)加 `$EVAL_HEADLESS` 分支主动绕开 AskUserQuestion(冒烟实测:headless 下该工具被拒返回 error 字符串、不阻塞,故必须主动分支、不能依赖空过)、并把输出重定向到 `$EVAL_OUT`。run.sh 读 GMZB 侧 corpus、`cd` 进 GMZB 循环跑 `claude -p`(受限权限 + 专用 eval-settings 挂 trace hook),把每模块产物/trace/result 落 scratch workspace。

**Tech Stack:** bash、Claude Code skill(markdown)、`claude -p` headless(受限权限)、PostToolUse/SubagentStop hook、YAML corpus/清单。

## Global Constraints

- **验证不套红绿 TDD**:每个任务验收=可运行检查(命令 + 预期输出),不写 pytest/jest 红绿用例。
- **嵌套 claude 只用受限权限**:`--allowedTools`/`acceptEdits` 限定,**绝不用 `--dangerously-skip-permissions`**。
- **skill-eval 引擎项目无关**:`skill-forge/skills/skill-eval/` 下**严禁夹带 GMZB 真值**(模块名/前缀);GMZB 特有的模块清单/预设答案只进 **GMZB 侧 corpus 文件**。
- **改 module-brief 本体走 skill-forge eval 流程**(Task 1),不裸 `Edit`——它是 skill 行为变更,按既定规矩 + 设计 §7。
- **绝不污染真产物**:headless 模式输出落 `$EVAL_OUT`,**绝不写 `docs/module-brief/<module>/`**;原始 run 落 scratch(gitignored)。
- **冒烟实测前提**(2026-06-17,claude 2.1.163):headless 下 AskUserQuestion = 被拒返回 `<error>` 字符串、不阻塞 → headless 分支必须用 `$EVAL_HEADLESS` **主动跳过**该工具调用,不能依赖"空过后拿到可用答案"。
- skill-forge 改动在分支 `design/skill-eval-harness`;workspace 路径以设计文档 §2.4 为准(scratch、gitignored)。
- 参考:[设计文档](../specs/2026-06-17-skill-eval-harness-design.md) §1.4 落位、§2 批跑、§2.1 清单 schema。

---

### Task 1: 给 module-brief 加 headless 模式(走 skill-forge eval 流程)

**Files:**
- Modify(经 skill-forge 授权流程): `skill-forge/skills/module-brief/SKILL.md`(Step 1 加 headless 分支)
- 可能 Modify: `skill-forge/skills/module-brief/agents/survey-agent.md`(若输出目录由 agent 决定,需读 `$EVAL_OUT`)

**Interfaces:**
- Produces: module-brief 支持「`EVAL_HEADLESS=1` 时:从 `$EVAL_PRESET`(约定 env/文件)读 `module`+`scope`、跳过 Step 1 的 AskUserQuestion;输出目录用 `$EVAL_OUT/<module>/` 覆盖默认 `docs/module-brief/<module>/`」。交互模式(默认)行为不变。

- [ ] **Step 1: 用 skill-forge 给 module-brief 加 headless 分支**

不裸改。调用 skill-forge 技能(skill 作者/eval 流程),需求如下交给它实现 + 自评:
- Step 1 定位确认处增加分支:`若环境变量 EVAL_HEADLESS=1`:从 `$EVAL_PRESET`(一个 JSON/env,含 `module_cn`/`scope`/`exclude`)取值,**跳过 AskUserQuestion**,直接用这些预设值定模块名与范围;`否则`照常 AskUserQuestion(默认交互态)。
- 产出目录:headless 态用 `$EVAL_OUT/<module>/` 替代默认 `docs/module-brief/<module>/`(survey-agent 写文件处一并改)。
- 约束:**只动 Step 1 定位与输出目录两处**,其余分析逻辑不变(保证"评的是真 skill,只少了门");headless 分支不调用任何会阻塞的交互工具。

- [ ] **Step 2: 受限权限跑一次 headless,验证门跳过 + 输出隔离**

```bash
SF=/Users/lilongjian/Projects/AI/skill-forge; G=/Users/lilongjian/Projects/GMZB/master-data
OUT=$(mktemp -d); export EVAL_HEADLESS=1 EVAL_OUT="$OUT"
export EVAL_PRESET='{"module":"mdm-organization","module_cn":"组织机构","scope":"com.itgfin.masterdata 前缀=BaseOrganization*","exclude":[]}'
cd "$G" && ( time claude -p "/module-brief mdm-organization" --output-format json \
  --allowedTools 'Read' 'Grep' 'Glob' 'Bash' 'Write' 'Edit' 'Task' ) > "$OUT/run.json" 2>&1
echo "---exit:$?---"
echo "=== 产物落 EVAL_OUT 没 ==="; ls -la "$OUT/mdm-organization/" 2>&1
echo "=== 真 docs 没被碰 ==="; git -C "$G" status --short docs/module-brief/ | head
```
Expected: `$OUT/mdm-organization/` 出现 `requirements.md` + `design.md`;`git status docs/module-brief/` **无变化**(真产物未被污染);run 未因 AskUserQuestion 阻塞(秒~分钟级返回、非挂死)。

- [ ] **Step 3: 提交(skill-forge 分支)**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git checkout design/skill-eval-harness
git add skills/module-brief
git commit -m "feat(module-brief): 加 headless 模式($EVAL_HEADLESS 跳过定位门+输出重定向),供 skill-eval 批跑"
```
Expected: `git log --oneline -1` 显示该提交。

---

### Task 2: 清单 schema + module-brief 清单 + GMZB corpus

**Files:**
- Create: `skill-forge/skills/skill-eval/manifests/module-brief.yml`(清单:引擎侧、**不含 GMZB 真值**,corpus 用 `$CORPUS_FILE` 指针)
- Create: `skill-forge/skills/skill-eval/manifests/README.md`(清单 schema 说明,例子用 `com.<root>.` 占位)
- Create(GMZB 侧): `GMZB/master-data/.skill-eval/corpus/module-brief.yml`(模块清单 + 预设答案,取自 codebase-map §8)

**Interfaces:**
- Consumes: 无(起点)。
- Produces: 清单字段 `{target_skill, target_project, corpus_file, runs_per_target, gates[], hard_validators[], rubric_ref}`(见设计 §2.1);corpus 字段 `{module, preset_answers:{module_cn,scope,exclude}}[]`。

- [ ] **Step 1: 写清单 schema 说明 + module-brief 清单(引擎侧,无 GMZB 真值)**

`skill-forge/skills/skill-eval/manifests/module-brief.yml`:
```yaml
target_skill: module-brief
target_project_env: SKILL_EVAL_TARGET_PROJECT   # 目标项目路径由调用方经 env 传入,不硬编码
corpus_file: .skill-eval/corpus/module-brief.yml # 相对目标项目根;GMZB 真值只在此文件里
runs_per_target: 1
gates:
  - step: "Step 1 定位确认"
    answer_from: preset_answers
hard_validators: []          # module-brief 无硬校验器
rubric_ref: rubrics/module-brief.md   # 2B 才用,先占位指针(本计划不建 rubric 内容)
```
> `manifests/README.md` 写清各字段含义,**所有例子用 `com.<root>.x` 占位、绝不写 GMZB 模块名**。

- [ ] **Step 2: 写 GMZB 侧 corpus(真值只在这)**

`GMZB/master-data/.skill-eval/corpus/module-brief.yml`——取 [codebase-map.md](../../../GMZB/master-data/docs/codebase-map.md) §8 标 ✅/⚖️ 的模块 + 各自范围提示。逐模块:
```yaml
modules:
  - module: mdm-organization
    preset_answers: { module_cn: 组织机构, scope: "com.itgfin.masterdata 前缀=BaseOrganization*", exclude: [] }
  - module: mdm-company
    preset_answers: { module_cn: 法人公司, scope: "前缀=BaseCompany*", exclude: [] }
  # …其余 ✅/⚖️ 模块(employee/customer-enterprise/bank-financial/app-cfg/dictionary-basic/sync-task/quota-notice + ccm-paybill/budget/trip + tms/bfe/fin 按 §8 取舍)
```
> 模块清单与范围**以 codebase-map §8 实读为准**,实现时打开该文件逐模块誊。

- [ ] **Step 3: 校验 YAML + 提交**

```bash
python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in sys.argv[1:]]; print('yaml ok')" \
  /Users/lilongjian/Projects/AI/skill-forge/skills/skill-eval/manifests/module-brief.yml \
  /Users/lilongjian/Projects/GMZB/master-data/.skill-eval/corpus/module-brief.yml
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/manifests && git commit -m "feat(skill-eval): 清单 schema + module-brief 清单(引擎侧无项目真值)"
cd /Users/lilongjian/Projects/GMZB/master-data && git checkout -b feat/skill-eval-corpus && git add .skill-eval/corpus && git commit -m "feat(skill-eval): module-brief 批跑 corpus(GMZB 模块清单+预设答案)"
```
Expected: `yaml ok`;两仓各一提交;corpus 模块数 ≈ codebase-map §8 的 ✅/⚖️ 数(约 12)。

---

### Task 3: eval-settings.json trace hook

**Files:**
- Create: `skill-forge/skills/skill-eval/eval-settings.json`(只含 trace hook,与日常 hooks 隔离)
- Create: `skill-forge/skills/skill-eval/hooks/trace-log.sh`(hook 脚本:把工具调用追加到 `$EVAL_TRACE`)

**Interfaces:**
- Consumes: 无。
- Produces: 跑 `claude -p --settings eval-settings.json` 时,每次工具调用(含子 agent)追加一行 JSON 到 `$EVAL_TRACE`:`{ts,agent_id,agent_type,tool_name,tool_input_digest,tool_response_status}`。

- [ ] **Step 1: 写 hook 脚本 + eval-settings.json**

`hooks/trace-log.sh`:读 stdin 的 hook JSON(含 `tool_name`/`tool_input`/`tool_response`/`agent_id`/`agent_type`/`session_id`),抽字段、追加一行到 `$EVAL_TRACE`(jq 或 python3 解析;`tool_input` 只留摘要避免巨量)。
`eval-settings.json`:`hooks.PostToolUse` + `hooks.SubagentStop` 各挂 `trace-log.sh`,matcher 通配 `*`。

- [ ] **Step 2: 挂 hook 跑一次,验证 trace 抓到工具调用 + 子 agent**

```bash
SF=/Users/lilongjian/Projects/AI/skill-forge; G=/Users/lilongjian/Projects/GMZB/master-data
T=$(mktemp); OUT=$(mktemp -d); export EVAL_HEADLESS=1 EVAL_OUT="$OUT" EVAL_TRACE="$T"
export EVAL_PRESET='{"module":"mdm-quota-notice","module_cn":"额度通知","scope":"前缀=*QuotaNotice*","exclude":[]}'
cd "$G" && claude -p "/module-brief mdm-quota-notice" --output-format json \
  --settings "$SF/skills/skill-eval/eval-settings.json" \
  --allowedTools 'Read' 'Grep' 'Glob' 'Bash' 'Write' 'Edit' 'Task' > "$OUT/run.json" 2>&1
echo "=== trace 行数 ==="; wc -l < "$T"
echo "=== 是否含子 agent(survey-agent)调用 ==="; grep -c '"agent_type"' "$T"; grep -o '"agent_type":"[^"]*"' "$T" | sort -u
echo "=== 工具种类 ==="; grep -o '"tool_name":"[^"]*"' "$T" | sort | uniq -c
```
Expected: `trace` 非空(几十行);出现带 `agent_type`(survey-agent 的工具调用被 hook 抓到);`tool_name` 含 Read/Grep 等(证明真读了代码)。
> ⚠️ 若 trace **没抓到子 agent 调用**:记录此为已知限制(写进设计 §2.3),2B 的"survey-agent 真读代码吗"检查需改用 result/产物侧证据兜底。**这是本计划要实测确认的关键不确定点。**

- [ ] **Step 3: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/eval-settings.json skills/skill-eval/hooks && git commit -m "feat(skill-eval): 专用 trace hook(PostToolUse/SubagentStop → trace.jsonl)"
```

---

### Task 4: run.sh 批跑循环

**Files:**
- Create: `skill-forge/skills/skill-eval/run.sh`(批跑 runner)

**Interfaces:**
- Consumes: 清单(Task 2)、corpus(Task 2)、eval-settings(Task 3)、module-brief headless 模式(Task 1)。
- Produces: 对 corpus 每模块跑 `claude -p`,把 `{产物, trace.jsonl, run.json, meta(耗时/退出码)}` 落 `$SCRATCH/skill-eval/module-brief/<run-id>/runs/<module>/`;失败模块显式记入 `run-manifest.json`,不静默掉。

- [ ] **Step 1: 写 run.sh**

入参:目标 skill 名(`module-brief`)。逻辑:
1. 读清单 → 拿 `target_project`(从 `SKILL_EVAL_TARGET_PROJECT` env)、`corpus_file`、`runs_per_target`。
2. 读目标项目下 corpus → 模块数组。
3. `run_id=$(date ...)` **不可用**(skill 环境无 Date;但 run.sh 是普通 bash 脚本、终端跑,可用 `date`)。建 `$SCRATCH/skill-eval/module-brief/<run_id>/`。
4. 逐模块 × `runs_per_target`:`cd $target_project`;导出 `EVAL_HEADLESS=1 EVAL_OUT=<run>/runs/<module> EVAL_TRACE=<...>/trace.jsonl EVAL_PRESET=<该模块预设答案 JSON>`;跑 `claude -p "/module-brief <module>" --settings eval-settings.json --allowedTools '...'`;收 run.json + 退出码 + 耗时。
5. 失败(非 0 退出 / 产物缺失)写入 `run-manifest.json` 的 `failed[]`,**继续**;成功写 `ok[]`。
6. 末尾打印汇总:N 成功 / M 失败 + workspace 路径。

> SCRATCH 默认 `${SKILL_EVAL_SCRATCH:-$HOME/.cache/skill-eval}`;确保该路径 gitignored(不在任何仓内)。

- [ ] **Step 2: 对 2 个模块跑,验证 workspace 结构 + 失败记账**

```bash
export SKILL_EVAL_TARGET_PROJECT=/Users/lilongjian/Projects/GMZB/master-data
export SKILL_EVAL_CORPUS_LIMIT=2   # run.sh 支持只跑前 N 个,便于冒烟
bash /Users/lilongjian/Projects/AI/skill-forge/skills/skill-eval/run.sh module-brief
RUN=$(ls -dt "$HOME/.cache/skill-eval/skill-eval/module-brief/"*/ | head -1)
echo "=== run-manifest ==="; cat "$RUN/run-manifest.json"
echo "=== 每模块产物 ==="; for d in "$RUN"runs/*/; do echo "-- $d"; ls "$d"; done
```
Expected: 2 个模块各有 `requirements.md`/`design.md`/`trace.jsonl`/`run.json`;`run-manifest.json` 有 `ok`/`failed` 分类;真 `docs/module-brief/` 仍无改动(`git -C $SKILL_EVAL_TARGET_PROJECT status --short docs/module-brief/` 空)。

- [ ] **Step 3: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/run.sh && git commit -m "feat(skill-eval): run.sh 批跑 runner(逐模块 headless 跑+落 workspace+失败记账)"
```

---

### Task 5: 批跑侧端到端冒烟(产出真 trace 解锁 2B)

**Files:** 无新增,纯端到端验证 + 记录。

- [ ] **Step 1: 对一小撮模块(3-4 个,含轻/重各一)端到端批跑**

```bash
export SKILL_EVAL_TARGET_PROJECT=/Users/lilongjian/Projects/GMZB/master-data SKILL_EVAL_CORPUS_LIMIT=4
bash /Users/lilongjian/Projects/AI/skill-forge/skills/skill-eval/run.sh module-brief
RUN=$(ls -dt "$HOME/.cache/skill-eval/skill-eval/module-brief/"*/ | head -1); echo "RUN=$RUN"
```

- [ ] **Step 2: 验收批跑侧四点**

```bash
echo "=== 1 覆盖率(run-manifest ok/failed) ==="; cat "$RUN/run-manifest.json"
echo "=== 2 每模块四件齐 ==="; for d in "$RUN"runs/*/; do echo "$d:"; ls "$d" | tr '\n' ' '; echo; done
echo "=== 3 trace 真有内容(逐模块行数) ==="; for t in "$RUN"runs/*/trace.jsonl; do echo "$(wc -l <"$t") $t"; done
echo "=== 4 真产物零污染 ==="; git -C "$SKILL_EVAL_TARGET_PROJECT" status --short docs/module-brief/ | head
```
Expected:① ok+failed = 4、失败显式列出;② 每模块 requirements/design/trace.jsonl/run.json 齐;③ 每个 trace 非空;④ `docs/module-brief/` 无改动。

- [ ] **Step 3: 把"批跑侧已通 + trace 实况"记进设计文档,解锁 2B**

在设计 §2 末尾追加一句实测小结:批跑侧端到端通过、trace 是否抓到子 agent(据 Task 3 Step 2 结论)、典型每模块 trace 行数/工具分布——**2B 的观察器据此真 trace 写检查**。提交设计文档。
> 这是 2A 的核心交付:**一份真实 trace.jsonl**,让计划 2B 的观察器对着实况写、不投机。

---

## Self-Review

**1. Spec coverage**(对照设计 §2 批跑侧):
- §2.2 剥门=headless 模式(有门才加) → Task 1 ✅(走 skill-forge eval)
- §2.1 清单 schema + corpus(GMZB 侧) → Task 2 ✅(引擎无真值/真值入 GMZB corpus)
- §2.3 专用 trace hook → Task 3 ✅(含子 agent 抓取实测 + 失败兜底说明)
- §2.4 run.sh 循环 + 失败记账 + scratch → Task 4 ✅
- 产出真 trace 解锁 2B → Task 5 ✅
- §1.2 `/skill-eval` 状态感知入口 → **属 2B/编排,本计划不含**(显式划界,非遗漏)

**2. Placeholder scan**: `rubric_ref` 指向 2B 才建的 rubric(显式标"先占位指针、本计划不建内容",非 TODO);corpus 模块清单注明"以 codebase-map §8 实读为准"(实现时誊真值,非占位)。无 TBD。

**3. 一致性**: 环境变量名 `EVAL_HEADLESS`/`EVAL_OUT`/`EVAL_PRESET`/`EVAL_TRACE`/`SKILL_EVAL_TARGET_PROJECT`/`SKILL_EVAL_SCRATCH` 跨 Task 1-5 一致;workspace 路径 `$HOME/.cache/skill-eval/...` 跨 Task 4-5 一致;受限权限 `--allowedTools` 写法跨任务一致、无 `--dangerously-skip-permissions`。

> 计划 2B(观察器 + 人审探针 + 聚合分类器 + 候选报告 + `/skill-eval` 状态感知入口)待本计划 Task 5 产出真实 trace 后再写,届时观察器检查对着实况、无投机。

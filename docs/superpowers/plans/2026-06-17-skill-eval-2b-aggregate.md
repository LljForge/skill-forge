# skill-eval 计划 2B(聚合侧)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建 skill-eval 的「聚合侧」——把 2A 落下的真实评测产物({trace.jsonl + requirements.md + design.md + run.json/run-meta.json})吃进来,经 per-run 观察器(确定性 + 判断 agent)+ 人审探针 + 跨轮聚合分类器,产出一份**低噪、排好序、分类好(通用/项目特有)、带复发率与诚实标的候选缺陷清单 + skill-forge 交接包**。`/skill-eval <skill>` 一个状态感知入口串起批跑与聚合两段。**止于候选清单,交 skill-forge,不碰 skill 本体。**

**Architecture:** 引擎/清单分离(设计 §1.1):`lib/observe.py`、`lib/aggregate.py` 是**项目无关的通用引擎**(只提供检查原语:数 spawn、节齐、grep、recurrence),所有 skill 特有参数(期望子 agent 数、节名、禁标识正则、对冲措辞、刻意不做清单)都从 `rubrics/<skill>.md` 的机读块读入。判断密集的步骤(陷阱质量、自标注语义确认、事实性预筛、跨轮聚类/分类)交 `agents/` 下三个子 agent。`SKILL.md` 看 workspace 状态决定起批跑(harness 后台任务,默认 Opus 继承)还是接聚合。原始 run 落 scratch(可弃);唯一留存物=候选报告 + 交接包,提交进 skill-forge。

**Tech Stack:** python3(JSON/YAML 解析、grep/count、recurrence)、bash(run.sh status 子命令)、Claude Code skill(markdown 编排 + 子 agent 提示)、PyYAML、jq 可选。

## Global Constraints

- **引擎项目无关·严禁夹带 GMZB 真值**:`skill-forge/skills/skill-eval/` 下(含 `lib/`、`rubrics/`、`agents/`、`templates/`)**禁出现 GMZB 模块名/包前缀真值**(如 `itgfin`、`BaseOrganization`、`mdm-*` 中文名);需要代码标识示例时用 `com.<root>.` / `OrderService` / `OrderController#submit` 占位。rubric 里 module-brief 的 format 词汇(「陷阱与护栏」「这条偏通用」「刻意不做」)是 skill 契约、**不是 GMZB 真值**,允许。**机器自查抓不到中文字面量,全靠人眼复核**(守 [[feedback_universal_skill_project_agnostic]])。
- **验证不套红绿 TDD**:本仓无单测框架。每个任务验收=可运行检查(命令 + 预期输出),对着 2A 落下的**真实 run 产物**跑,不写 pytest/jest 红绿用例。
- **嵌套/被派子 agent 只用受限权限**:聚合段派的 grounding/judge/aggregator 子 agent,读代码用 Read/Grep/Glob、查库用 `mcp__mysql_*`,**绝不用 `--dangerously-skip-permissions`**。
- **观察器尺子=skill 自己声明的契约**(设计 §3.1):偏离 module-brief 自己 SKILL.md/format 文件声明的契约才算 finding;观察器**绝不自创标准**。
- **不自动晋级·人是 ground-truth 锚**(设计 §5):观察器/判断 agent/聚合器**只产候选、绝不自动判定真缺陷**;事实正确性专走人审探针,grounding agent 仅预筛供参考;最终选哪些是真问题由人定。
- **不造 finding / 不静默截断 / 不 oversell**:固定 rubric 报,「这轮 0 candidate」是合法诚实输出;掉的 run 显式记账、报告写清覆盖率 N/M;每条候选标「能力缺口/工程小优」、不许夸大。
- **trace 归属为主 + 产物侧佐证**(设计 §2.3 二次更正,2026-06-17 实测拍板):子 agent 工具调用**带得到 `agent_id`**(spawn 之后,`agent_type="general-purpose"`)。「恰 1 个子 agent / 真读代码」**以 trace 归属为确定性主检查**;design.md 引真实类名/表名为**语义佐证**(「读了文件 ≠ 产物有据」)。⚠️ **`agent_type` 是 `general-purpose` 不叫 `survey-agent`**——「1 个子 agent」检查**只数** spawn 行(`tool_name=Agent`)/ distinct 非空 `agent_id` / `SubagentStop`,**禁匹配 `agent_type=="survey-agent"`**(永不命中)。
- **eval 默认模型=Opus 继承**(2026-06-17 拍板):评测效度最高(评的是 skill 本身不是模型);钉便宜模型做 manifest `model:` / env `SKILL_EVAL_MODEL` **可选旋钮**,默认不设=继承会话模型。
- **改 module-brief 本体走 skill-forge eval 流程**:本计划**不改** module-brief(2A 已加 headless 模式);若聚合段暴露 module-brief 缺陷,那是**产出的候选**、交 skill-forge,不在本计划内改。
- skill-forge 改动在分支 `design/skill-eval-harness`;scratch workspace `${SKILL_EVAL_SCRATCH:-$HOME/.cache/skill-eval}`(gitignored、可弃)。
- 参考:[设计文档](../specs/2026-06-17-skill-eval-harness-design.md) §3(聚合侧权威 spec)、§1.1/§1.2(引擎分离 + 状态入口)、§5(护栏)、§6(v1 验证)、§7(落位)。

---

## 真实 run 产物落点(本计划全程的测试数据,无需新跑批省成本)

scratch 基目录:`$HOME/.cache/skill-eval/skill-eval/module-brief/`

| run_id | 模块 | 层级 | 用途 |
|--------|------|------|------|
| `20260617-144516` | mdm-organization | 单层(production 形态) | 干净样本:5 节齐、零代码标识、trace 25/33 行归属子 agent |
| `20260617-140907` | mdm-organization | 单层 | 与 144516 同模块 → 一致性(K>1)测试样本 |
| `20260617-142256` | mdm-organization / mdm-company / mdm-bank-financial | **双层**(`runs/<m>/<m>/`,已修 EVAL_OUT bug 遗留) | 跨模块聚合样本;bank-financial 14 条陷阱=count-爆量测试 |

> observe.py **必须容双层**(单层优先,自动探测 `runs/<m>/<m>/` 回退),以便复用全部历史 run 当测试数据;production 只产单层。观察器**直接读文件、不信 run-manifest 的 ok/failed**(142256 被误标 failed 是双层导致的引擎 bug,与 skill 缺陷无关)。

findings 数据流(任务间接口):
```
observe.py  → <run>/runs/<module>/findings.json    (per-run 确定性 finding)
quality-judge agent → <run>/runs/<module>/judge.json (per-run 软判断)
grounding-probe agent → <run>/runs/<module>/grounding.json (per-run 事实预筛)
aggregate.py → <run>/aggregate-input.json           (跨轮:聚类前的 recurrence/consistency)
aggregator agent → <run>/candidate-report.md + handoff/ (最终留存物)
```

---

### Task 1: rubric——把 module-brief 声明的契约编码成观察器的尺子

**Files:**
- Create: `skill-forge/skills/skill-eval/rubrics/module-brief.md`

**Interfaces:**
- Consumes: 无(起点)。manifest `module-brief.yml` 的 `rubric_ref: rubrics/module-brief.md` 已指向此。
- Produces: 一份 rubric 文档 = ① 机读 YAML 块(observe.py 读,声明确定性检查参数)+ ② prose 块(quality-judge agent 读,软判断指引)。字段契约见下,供 Task 2/3 实现对齐。

- [ ] **Step 1: 写 rubric(YAML 机读块 + prose 指引块)**

`rubrics/module-brief.md` 内容(契约取自 module-brief 的 SKILL.md / references/{design,requirements}-format.md / CHANGELOG v1.0.1):

````markdown
# module-brief 观察 rubric

> 观察器的尺子=module-brief 自己声明的契约。偏离这里声明的才算 finding。所有阈值/正则/节名均来自 module-brief 的 SKILL.md 与 references/ 下 format 文件;改 module-brief 契约时同步改本文件。

## 机读检查参数(observe.py 解析下面这个 ```yaml 块)

```yaml
skill: module-brief
# A 类·流程性
expected_subagents: 1            # SKILL.md「全程只 1 个子 agent」。数 spawn/distinct agent_id/SubagentStop
subagent_type_hint: general-purpose   # 实测 agent_type;仅信息用,检查禁止以此匹配(见下)
artifacts:                       # 两份产物,落 $EVAL_OUT/<module>/
  - requirements.md
  - design.md
artifact_min_bytes: 200          # 兜底线:产物非空(SKILL.md「两份齐」)
read_evidence_min: 5             # 子 agent 对模块代码的 Read+Grep 计数下限(近乎没读=幻觉红旗)
headless_gate: AskUserQuestion   # 该工具若出现在 run.json.permission_denials = 门没剥干净
# B 类·产物契约性
design_sections:                 # design-format.md 五节骨架,缺=结构不完整(N/A 显式除外)
  - "## 1. 分层结构概览"
  - "## 2. 关键类 / 接口入口"
  - "## 3. 核心调用链"
  - "## 4. 数据模型概览"
  - "## 5. 陷阱与护栏"
requirements_sections:           # requirements-format.md 四节骨架
  - "## 1. 模块为谁解决什么"
  - "## 2. 核心业务能力与规则"
  - "## 3. 术语表"
  - "## 4. 主要业务场景与流程"
requirements_forbidden_patterns: # requirements 禁一切代码标识(requirements-format.md 抽象层约束)
  - { id: camelcase_class, regex: '`[A-Z][a-z]+[A-Z][A-Za-z]+`', desc: 驼峰类名 }
  - { id: java_file, regex: '\.java\b', desc: .java 文件名 }
  - { id: method_call, regex: '\.[a-zA-Z_]+\(', desc: 方法调用语法 }
  - { id: sql_kw, regex: '\b(SELECT|INSERT|UPDATE|DELETE|JOIN|WHERE)\b', desc: SQL 关键字 }
  - { id: status_eq, regex: 'status\s*=\s*[0-9'']', desc: status=0 式取值 }
  - { id: http_path, regex: '\b(GET|POST|PUT)\s+/|@RequestMapping', desc: HTTP 路径 }
trap_section_header: "## 5. 陷阱与护栏"
trap_count_warn: 8               # 陷阱条数 > 此值 → count-爆量候选(format「只留最狠的几条」)。判断 agent 复核是否注水
hedge_patterns:                  # 自标注反模式(v1.0.1 黄金缺陷)。grep 命中=候选,交 judge 语义确认
  - '这条?偏通用'
  - '比较通用'
  - '可能不(特定|针对)'
  - '通用规范.{0,6}(保留|但)'
code_block_in_trap: true         # §5 禁示例代码块(design-format.md);检测 ``` 围栏出现在陷阱节
```

## prose 指引(quality-judge agent 读,做软判断)

### 陷阱质量(逐条判 具体 vs 通用废话)
module-brief 的 design-format §5 入选双测(每条都过,不过=该删):
1. **模块替换测试**:把模块名换成另一个模块这条还成立吗?还成立=通用规范(事务/日志/异常/命名/空值、`@MapperScan` 注册新 DAO 这类),**应删**——家在项目级 CLAUDE.md。
2. **能否写成「改 X 会踩 P」**?写不出=普通业务陈述,应删。
- ✅ 留(本模块特有):点名具体 PO/表/触发器、有「改 A 必连带改 B」的协同关系。例:"取消订单必须同步反写库存占用表,否则库存虚高"。
- ❌ 删(换模块也成立):"异常要捕获并记日志"、"状态字段建议用枚举"。
> 判断输出:逐条陷阱标 `specific` / `generic` / `borderline`,generic/borderline 给理由。

### 自标注反模式(v1.0.1 黄金缺陷,最强回归判据)
v1.0.1 根因:survey-agent 把一条偏通用陷阱(`@MapperScan` 注册新 DAO)**保留并自加一句「这条偏通用规范」**,而非按模块替换测试删掉。收紧后契约:**边界性通用项一律直接删、不许「保留+标注它偏通用」的折中**。
> 判断输出:observe.py 的 `hedge_patterns` 命中项,逐条确认是否真是「保留通用陷阱 + 对冲标注」(是=`confirmed` 黄金缺陷复发;否=误报,如「通用方法/通用基类」这类正当技术描述)。

### 刻意不做(design-format「刻意不做」清单,碰了=候选)
- 不穷举 PO 字段(只点关键字段)。
- 不画全部状态机(只点名 + 挑核心画一个)。
- 不做跨模块依赖合并/去重重机制(提一句「依赖谁」即可)。
- 锚点放宽(`OrderService#cancel` 或口语「见取消逻辑」都行,不要求机器可 grep)。
> 判断输出:design.md 是否有穷举字段表/画了多个状态机/陷阱注水等越界,逐条标。
````

- [ ] **Step 2: 校验 YAML 块可解析 + 零 GMZB 真值**

```bash
SF=/Users/lilongjian/Projects/AI/skill-forge
python3 - "$SF/skills/skill-eval/rubrics/module-brief.md" <<'PY'
import sys,re,yaml
txt=open(sys.argv[1],encoding='utf-8').read()
m=re.search(r'```yaml\n(.*?)\n```', txt, re.S)
assert m, "找不到机读 yaml 块"
d=yaml.safe_load(m.group(1))
for k in ('expected_subagents','artifacts','design_sections','requirements_sections',
          'requirements_forbidden_patterns','hedge_patterns','trap_count_warn'):
    assert k in d, f"缺字段 {k}"
assert d['expected_subagents']==1 and len(d['design_sections'])==5 and len(d['requirements_sections'])==4
print("rubric yaml ok:", list(d.keys()))
PY
echo "=== 零 GMZB 真值(命中即失败,人眼再复核中文)==="
grep -nE 'itgfin|BaseOrganization|BaseCompany|BaseBank|mdm-(employee|organization|company|bank)' \
  "$SF/skills/skill-eval/rubrics/module-brief.md" && echo "❌ 夹带真值" || echo "✅ 无英文真值(中文模块名靠人眼)"
```
Expected: `rubric yaml ok: [...]`;`✅ 无英文真值`。

- [ ] **Step 3: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/rubrics/module-brief.md
git commit -m "feat(skill-eval): module-brief 观察 rubric(机读检查参数+判断指引,引擎无项目真值)"
```

---

### Task 2: observe.py——per-run 确定性观察器(A 类 + B 类确定性)+ 黄金回归 fixture

**Files:**
- Create: `skill-forge/skills/skill-eval/lib/observe.py`
- Create: `skill-forge/skills/skill-eval/fixtures/golden-v1.0.1-hedge/design.md`(合成缺陷 fixture,黄金回归资产)
- Create: `skill-forge/skills/skill-eval/fixtures/golden-v1.0.1-hedge/requirements.md`(配套,使 fixture 是完整一对)

**Interfaces:**
- Consumes: rubric(Task 1)的机读 YAML 块;一个 run 的模块目录 `{trace.jsonl, requirements.md, design.md, run.json, run-meta.json}`。
- Produces: `observe.py <run-dir> --skill module-brief [--module M]` → 对每模块写 `findings.json`,schema:
  ```json
  {"module":"...", "run_id":"...", "skill":"module-brief",
   "process":{"duration_ms":int,"exit_ok":bool,"stop_reason":"end_turn","subagent_spawns":1,
              "distinct_agent_ids":1,"subagent_stops":1,"subagent_reads":int,"headless_gate_ok":bool,
              "artifacts_present":["requirements.md","design.md"]},
   "findings":[{"check_id":str,"klass":"A|B","verdict":"pass|flag|needs_judge","severity":"info|warn|defect-candidate",
                "summary":str,"evidence":[{"source":"trace|design.md|requirements.md|run.json","detail":str}]}]}
  ```
  `verdict=needs_judge` 的项(陷阱质量、hedge 命中、count-爆量、刻意不做)留给 quality-judge agent;`klass=C` 不在此(走 grounding)。

- [ ] **Step 1: 写 observe.py**

```python
#!/usr/bin/env python3
"""per-run 确定性观察器:读 rubric 机读块 + 一个 run 的模块产物,产 findings.json。
引擎项目无关:所有 skill 特有参数从 rubric 读,本脚本只提供检查原语。"""
import sys, os, re, json, argparse, glob

def load_rubric_yaml(skill_dir, skill):
    import yaml
    p = os.path.join(skill_dir, "rubrics", f"{skill}.md")
    m = re.search(r'```yaml\n(.*?)\n```', open(p, encoding='utf-8').read(), re.S)
    return yaml.safe_load(m.group(1))

def resolve_module_dir(run_dir, module):
    """单层 runs/<m>/ 优先;双层 runs/<m>/<m>/ 回退(历史 EVAL_OUT bug 遗留)。
    返回 (artifact_dir, meta_dir):产物可能在内层,trace/run.json 在外层。"""
    outer = os.path.join(run_dir, "runs", module)
    inner = os.path.join(outer, module)
    art_dir = inner if os.path.exists(os.path.join(inner, "design.md")) else outer
    return art_dir, outer

def read_trace(meta_dir):
    rows = []
    p = os.path.join(meta_dir, "trace.jsonl")
    if os.path.exists(p):
        for ln in open(p, encoding='utf-8'):
            ln = ln.strip()
            if ln:
                try: rows.append(json.loads(ln))
                except json.JSONDecodeError: pass
    return rows

def fnd(check_id, klass, verdict, severity, summary, evidence):
    return {"check_id":check_id,"klass":klass,"verdict":verdict,"severity":severity,
            "summary":summary,"evidence":evidence}

def observe_module(run_dir, run_id, module, skill, rub):
    art_dir, meta_dir = resolve_module_dir(run_dir, module)
    trace = read_trace(meta_dir)
    findings, process = [], {}
    # --- run.json ---
    rj = {}
    rjp = os.path.join(meta_dir, "run.json")
    if os.path.exists(rjp):
        try: rj = json.load(open(rjp, encoding='utf-8'))
        except Exception: rj = {}
    exit_ok = (rj.get("is_error") is False) and (rj.get("subtype") == "success")
    stop = rj.get("stop_reason")
    process["exit_ok"] = exit_ok; process["stop_reason"] = stop
    process["duration_ms"] = rj.get("duration_ms")
    findings.append(fnd("run_completed","A","pass" if exit_ok else "flag",
        "info" if exit_ok else "defect-candidate",
        f"跑完={exit_ok} stop_reason={stop}",
        [{"source":"run.json","detail":f"is_error={rj.get('is_error')} subtype={rj.get('subtype')} stop={stop}"}]))
    if stop and stop != "end_turn":
        findings.append(fnd("abnormal_stop","A","flag","defect-candidate",
            f"非正常结束:{stop}(可能截断)",[{"source":"run.json","detail":f"stop_reason={stop}"}]))
    # headless 门:AskUserQuestion 不该出现在 permission_denials
    denied = [d.get("tool_name") for d in (rj.get("permission_denials") or [])]
    gate = rub.get("headless_gate","AskUserQuestion")
    gate_ok = gate not in denied
    process["headless_gate_ok"] = gate_ok
    findings.append(fnd("headless_gate","A","pass" if gate_ok else "flag",
        "info" if gate_ok else "defect-candidate",
        f"headless 门剥干净={gate_ok}",
        [{"source":"run.json","detail":f"permission_denials={denied}"}]))
    # --- trace 归属:spawn / distinct agent_id / SubagentStop ---
    spawns = sum(1 for r in trace if r.get("event")=="PostToolUse" and r.get("tool_name")=="Agent")
    sub_ids = sorted({r.get("agent_id") for r in trace if r.get("agent_id")})
    stops = sum(1 for r in trace if r.get("event")=="SubagentStop")
    exp = rub.get("expected_subagents",1)
    process.update(subagent_spawns=spawns, distinct_agent_ids=len(sub_ids), subagent_stops=stops)
    one_agent = (spawns==exp) and (len(sub_ids)==exp) and (stops==exp)
    findings.append(fnd("subagent_count","A","pass" if one_agent else "flag",
        "info" if one_agent else "defect-candidate",
        f"恰 {exp} 个子 agent:spawn={spawns} ids={len(sub_ids)} stop={stops}",
        [{"source":"trace","detail":f"agent_ids={sub_ids}"}]))
    # 子 agent 真读代码(带非空 agent_id 的 Read/Grep)
    sub_reads = sum(1 for r in trace if r.get("agent_id") and r.get("tool_name") in ("Read","Grep"))
    rmin = rub.get("read_evidence_min",5)
    findings.append(fnd("subagent_read_evidence","A","pass" if sub_reads>=rmin else "flag",
        "info" if sub_reads>=rmin else "defect-candidate",
        f"子 agent 读代码 {sub_reads} 次(下限 {rmin})",
        [{"source":"trace","detail":f"sub-agent Read+Grep={sub_reads}"}]))
    # --- 产物存在 + 非空 ---
    present = []
    for a in rub.get("artifacts",[]):
        ap = os.path.join(art_dir, a); sz = os.path.getsize(ap) if os.path.exists(ap) else 0
        ok = sz >= rub.get("artifact_min_bytes",200); present.append(a) if ok else None
        findings.append(fnd(f"artifact_{a}","A","pass" if ok else "flag",
            "info" if ok else "defect-candidate",
            f"{a} 存在且≥{rub.get('artifact_min_bytes',200)}B={ok}(size={sz})",
            [{"source":a,"detail":f"path={ap} size={sz}"}]))
    process["artifacts_present"] = present
    # --- B 类:design.md 节齐 ---
    design = ""
    dp = os.path.join(art_dir,"design.md")
    if os.path.exists(dp): design = open(dp,encoding='utf-8').read()
    for sec in rub.get("design_sections",[]):
        # 容前缀匹配(节名后可带补充字)
        key = sec.split("概览")[0].split("(")[0]
        hit = any(line.startswith(sec[:8]) for line in design.splitlines())
        findings.append(fnd(f"design_section::{sec[:12]}","B","pass" if hit else "flag",
            "info" if hit else "defect-candidate",
            f"design 节『{sec}』在={hit}",[{"source":"design.md","detail":sec}]))
    # 陷阱条数(§5 内的有序/无序列表条目近似计数)
    traps = count_trap_items(design, rub.get("trap_section_header","## 5"))
    twarn = rub.get("trap_count_warn",8)
    findings.append(fnd("trap_count","B","needs_judge" if traps>twarn else "pass",
        "warn" if traps>twarn else "info",
        f"陷阱 {traps} 条" + (f" > {twarn} → 疑 count 爆量,交 judge 复核注水" if traps>twarn else ""),
        [{"source":"design.md","detail":f"trap_items={traps}"}]))
    # hedge 自标注反模式(命中=候选,交 judge 语义确认)
    for pat in rub.get("hedge_patterns",[]):
        for i,line in enumerate(design.splitlines(),1):
            if re.search(pat, line):
                findings.append(fnd("hedge_selfannotation","B","needs_judge","defect-candidate",
                    f"疑自标注反模式(v1.0.1 缺陷类):命中 /{pat}/",
                    [{"source":"design.md","detail":f"L{i}: {line.strip()[:80]}"}]))
    # §5 禁示例代码块
    if rub.get("code_block_in_trap"):
        sec5 = slice_section(design, rub.get("trap_section_header","## 5"))
        if "```" in sec5:
            findings.append(fnd("code_block_in_trap","B","needs_judge","warn",
                "§5 陷阱节疑含示例代码块(design-format 禁)",
                [{"source":"design.md","detail":"§5 内出现 ``` 围栏"}]))
    # --- B 类:requirements.md 节齐 + 禁代码标识 ---
    req = ""
    rp = os.path.join(art_dir,"requirements.md")
    if os.path.exists(rp): req = open(rp,encoding='utf-8').read()
    for sec in rub.get("requirements_sections",[]):
        hit = any(line.startswith(sec[:10]) for line in req.splitlines())
        findings.append(fnd(f"req_section::{sec[:12]}","B","pass" if hit else "flag",
            "info" if hit else "defect-candidate",
            f"requirements 节『{sec}』在={hit}",[{"source":"requirements.md","detail":sec}]))
    for fp in rub.get("requirements_forbidden_patterns",[]):
        hits=[]
        for i,line in enumerate(req.splitlines(),1):
            if re.search(fp["regex"], line): hits.append(f"L{i}: {line.strip()[:70]}")
        if hits:
            findings.append(fnd(f"req_forbidden::{fp['id']}","B","flag","defect-candidate",
                f"requirements 抽象层越界:{fp['desc']}({len(hits)} 处)",
                [{"source":"requirements.md","detail":h} for h in hits[:5]]))
    return {"module":module,"run_id":run_id,"skill":skill,"process":process,"findings":findings}

def count_trap_items(design, header):
    sec = slice_section(design, header)
    return sum(1 for ln in sec.splitlines() if re.match(r'\s*([-*]|\d+\.|\*\*)\s', ln) and len(ln.strip())>6)

def slice_section(text, header):
    lines = text.splitlines(); out=[]; cap=False
    for ln in lines:
        if ln.startswith(header[:8]): cap=True; continue
        if cap and ln.startswith("## ") : break
        if cap: out.append(ln)
    return "\n".join(out)

def discover_modules(run_dir):
    return sorted(os.path.basename(p.rstrip("/")) for p in glob.glob(os.path.join(run_dir,"runs","*/")))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir"); ap.add_argument("--skill", required=True)
    ap.add_argument("--module", default=None)
    a = ap.parse_args()
    skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rub = load_rubric_yaml(skill_dir, a.skill)
    run_id = os.path.basename(a.run_dir.rstrip("/"))
    mods = [a.module] if a.module else discover_modules(a.run_dir)
    for m in mods:
        res = observe_module(a.run_dir, run_id, m, a.skill, rub)
        _, meta_dir = resolve_module_dir(a.run_dir, m)
        outp = os.path.join(meta_dir, "findings.json")
        json.dump(res, open(outp,"w",encoding='utf-8'), ensure_ascii=False, indent=2)
        nf = sum(1 for f in res["findings"] if f["verdict"]!="pass")
        print(f"[{m}] findings={len(res['findings'])} 非pass={nf} → {outp}")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 造黄金回归 fixture(合成 v1.0.1 缺陷)**

`fixtures/golden-v1.0.1-hedge/design.md`——一份**故意带 v1.0.1 缺陷**的最小 design.md(用 `com.<root>` 占位、无 GMZB 真值):五节齐但 §5 含一条「保留通用陷阱 + 自标注偏通用」:
````markdown
# 示例模块 — 设计说明

## 1. 分层结构概览
controller → service → dao → po。

## 2. 关键类 / 接口入口
`OrderService` / `OrderController#submit`。

## 3. 核心调用链
`OrderController#submit` → `OrderService.save` → `OrderDAO.insert`。

## 4. 数据模型概览
核心实体 Order;不穷举字段。

## 5. 陷阱与护栏
- **取消订单必须反写库存占用表**:否则库存虚高(本模块特有协同护栏)。
- **新增 DAO 必须在 `@MapperScan` 注册**:这条偏通用规范,但还是保留提醒一下。
````
`fixtures/golden-v1.0.1-hedge/requirements.md`——配套最小 requirements(四节齐、零代码标识),使 fixture 是完整一对:
````markdown
# 示例模块 — 需求说明

## 1. 模块为谁解决什么
给下单用户管理订单。

## 2. 核心业务能力与规则
下单、取消;取消需释放占用。

## 3. 术语表
| 术语 | 含义 | 别名 |
|------|------|------|
| 订单 | 用户购买凭证 | 单据 |

## 4. 主要业务场景与流程
场景一:用户下单。触发:点击提交。主流程:1 校验 2 落库 3 返回。
````

- [ ] **Step 3: 对真实 run + 黄金 fixture 跑,验证检查行为**

```bash
SF=/Users/lilongjian/Projects/AI/skill-forge; B="$HOME/.cache/skill-eval/skill-eval/module-brief"
echo "=== A. 干净 run(144516/org)应几乎全 pass ==="
python3 "$SF/skills/skill-eval/lib/observe.py" "$B/20260617-144516" --skill module-brief
python3 - "$B/20260617-144516/runs/mdm-organization/findings.json" <<'PY'
import json,sys; d=json.load(open(sys.argv[1]))
p=d["process"]; print("process:",{k:p[k] for k in ("subagent_spawns","distinct_agent_ids","subagent_stops","subagent_reads","headless_gate_ok","exit_ok")})
flags=[f["check_id"] for f in d["findings"] if f["verdict"]!="pass"]
assert p["subagent_spawns"]==1 and p["distinct_agent_ids"]==1 and p["subagent_stops"]==1, "子 agent 计数应=1"
assert p["headless_gate_ok"] and p["exit_ok"], "门/退出应 ok"
print("干净 run 非 pass 项:",flags)   # 期望:几乎空(顶多 trap_count 之类 info)
PY
echo "=== B. bank-financial(14 陷阱)应触发 count-爆量候选 ==="
python3 "$SF/skills/skill-eval/lib/observe.py" "$B/20260617-142256" --skill module-brief --module mdm-bank-financial
python3 - "$B/20260617-142256/runs/mdm-bank-financial/findings.json" <<'PY'
import json,sys; d=json.load(open(sys.argv[1]))
tc=[f for f in d["findings"] if f["check_id"]=="trap_count"]
print("trap_count:",tc[0]["summary"]); assert tc[0]["verdict"]=="needs_judge", "14>8 应 needs_judge"
PY
echo "=== C. 黄金 fixture 应逮自标注反模式(v1.0.1)==="
mkdir -p /tmp/golden/runs/golden-v1.0.1-hedge
cp "$SF/skills/skill-eval/fixtures/golden-v1.0.1-hedge/"*.md /tmp/golden/runs/golden-v1.0.1-hedge/
python3 "$SF/skills/skill-eval/lib/observe.py" /tmp/golden --skill module-brief --module golden-v1.0.1-hedge
python3 - /tmp/golden/runs/golden-v1.0.1-hedge/findings.json <<'PY'
import json,sys; d=json.load(open(sys.argv[1]))
hedge=[f for f in d["findings"] if f["check_id"]=="hedge_selfannotation"]
assert hedge, "❌ 黄金缺陷未被逮"; print("✅ 逮到 v1.0.1 自标注反模式:",hedge[0]["evidence"][0]["detail"])
PY
```
Expected: A 干净 run 子 agent 计数全=1、门 ok、非 pass 项极少;B trap_count `needs_judge`;C 黄金 fixture 命中 `hedge_selfannotation`(**设计 §6.1 黄金测试通过**)。

- [ ] **Step 4: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/lib/observe.py skills/skill-eval/fixtures
git commit -m "feat(skill-eval): observe.py per-run 确定性观察器(A流程+B契约,trace归属为主)+v1.0.1黄金fixture"
```

---

### Task 3: quality-judge agent——per-run 软判断(陷阱质量 + 自标注确认 + 刻意不做)

**Files:**
- Create: `skill-forge/skills/skill-eval/agents/quality-judge.md`

**Interfaces:**
- Consumes: 一个模块的 `design.md` + rubric prose 块 + observe.py 的 `findings.json` 里 `verdict=needs_judge` 项。
- Produces: `judge.json`(写到 `<run>/runs/<module>/judge.json`):
  ```json
  {"module":"...","traps":[{"text":str,"label":"specific|generic|borderline","reason":str}],
   "hedge_confirmations":[{"evidence":str,"confirmed":bool,"reason":str}],
   "deliberate_dont_violations":[{"item":str,"violated":bool,"evidence":str}]}
  ```

- [ ] **Step 1: 写 quality-judge agent 提示**

`agents/quality-judge.md`(子 agent 提示,被 SKILL.md 经 Task/Agent 派发):
```markdown
---
name: quality-judge
description: skill-eval 聚合段·per-run 软判断 agent(陷阱质量/自标注确认/刻意不做)
---

你是 skill-eval 的**质量判断 agent**。对**一个模块**的 module-brief 产物做软判断。**只判断、不改产物、不自动定缺陷**——你的输出是供人审与聚合参考的候选信号。

## 输入(由派发者在 prompt 里给你)
- design.md 全文路径
- rubric prose 指引路径(`rubrics/module-brief.md` 的 prose 块)
- observe.py findings.json 里 `verdict=needs_judge` 的项(陷阱条数告警、hedge 命中)

## 尺子=module-brief 自己声明的契约(rubric prose),不自创标准
读 rubric prose 的三节(陷阱质量双测 / 自标注反模式 / 刻意不做),严格按它判:

1. **逐条陷阱质量**:对 design.md §5 每条陷阱跑「模块替换测试 + 能否写成改 X 踩 P」→ 标 `specific`(本模块特有,留)/`generic`(换模块也成立,应删)/`borderline`,给一句理由。
2. **自标注反模式确认**:对每个 hedge 命中,确认是否真是「保留一条通用陷阱 + 对冲标注偏通用」(v1.0.1 缺陷复发)→ `confirmed:true`;若只是正当技术描述里出现「通用」字样(如「通用方法」「通用基类」)→ `confirmed:false` 并说明。
3. **刻意不做越界**:查 design.md 有没有穷举 PO 字段表/画了多个状态机/陷阱注水等,逐条标 `violated`。

## 输出
**只输出一个 JSON 对象**(就是你的最终返回值,不要客套),schema 见派发 prompt。诚实:没问题就空数组,别凑数。
```

- [ ] **Step 2: 派 quality-judge 对干净 run + 黄金 fixture 各跑一次,验证判断合理**

由执行者(本会话)用 Task/Agent 派发 quality-judge,prompt 含上述输入路径与输出 schema。对两个对象各跑一次:
1. `144516/mdm-organization/design.md`(干净)→ 期望:陷阱多数 `specific`、`hedge_confirmations` 为空或 `confirmed:false`。
2. `/tmp/golden/runs/golden-v1.0.1-hedge/design.md`(黄金缺陷)→ 期望:`@MapperScan` 那条 `generic`、对应 hedge `confirmed:true`。
人(执行者)眼检两份 `judge.json`:schema 合法、判断与 design-format 双测一致。
Expected: 干净 run judge 几乎无 generic/无 confirmed hedge;黄金 fixture judge 标出 generic + confirmed 自标注 →**黄金测试经判断 agent 复核仍成立**。

- [ ] **Step 3: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/agents/quality-judge.md
git commit -m "feat(skill-eval): quality-judge agent(陷阱质量/自标注确认/刻意不做,尺子=skill契约)"
```

---

### Task 4: grounding-probe agent——per-run 事实性预筛(决定 4,人审探针的机器预筛半)

**Files:**
- Create: `skill-forge/skills/skill-eval/agents/grounding-probe.md`

**Interfaces:**
- Consumes: 一个模块的 `design.md`(含对代码的事实性断言:X 调 Y、锚 PO/表 Z、调用链 A→B→C)+ 目标项目代码路径。
- Produces: `grounding.json`(写到 `<run>/runs/<module>/grounding.json`):
  ```json
  {"module":"...","assertions":[{"claim":str,"kind":"class|table|callchain|annotation",
    "prescreen":"像真|像错|存疑","evidence":str,"needs_human":bool}]}
  ```

- [ ] **Step 1: 写 grounding-probe agent 提示**

`agents/grounding-probe.md`:
```markdown
---
name: grounding-probe
description: skill-eval 聚合段·per-run 事实性预筛 agent(重读真代码,预筛断言供人裁决)
---

你是 skill-eval 的**事实性预筛 agent**。对**一个模块**的 design.md 里对代码的事实性断言,**重读真实代码核对**,预筛成 像真/像错/存疑。**你不是终判**——人是事实正确性的最终 ground-truth,你只把可疑的拣出来给人省力。

## 输入(派发 prompt 给你)
- design.md 路径 + 目标项目根路径(`$SKILL_EVAL_TARGET_PROJECT`)
- 可用工具:Read / Grep / Glob 读代码;`mcp__mysql_*` 查表结构(只读核对表名/字段是否真实存在)

## 做法
1. 从 design.md 抽出对代码的**可核查断言**:类名/方法存在性、调用关系(A 调 B)、PO↔表映射、注解(如 `@TableName`)、存储过程/视图名。
2. 逐条**重读真代码核对**(Grep 类名、Read 关键文件、必要时 mysql 查表)。
3. 预筛:`像真`(代码佐证一致)/`像错`(代码明确矛盾)/`存疑`(找不到或模糊)。给证据(文件:行 或 查询结果摘要)。`像错`与`存疑`标 `needs_human:true`。

## 护栏
- **只读核对,绝不改代码、绝不写库**;mysql 仅 SELECT 类核对。
- 不确定就标`存疑`,别硬判。诚实优于齐全。

## 输出
**只输出一个 JSON 对象**(最终返回值),schema 见派发 prompt。
```

- [ ] **Step 2: 派 grounding-probe 对 mdm-company 跑(它自带「待确认」断言,最佳测试)**

`142256/mdm-company/design.md`(双层:实际在 `runs/mdm-company/mdm-company/`)里 survey-agent 自己标了「`BaseBankAccountPO` 的 `@TableName` 实为 `base_company_account` 待确认」——天然的事实核对测试点。执行者派 grounding-probe,目标项目=GMZB,允许 Read/Grep/Glob + `mcp__mysql_*`。
人眼检 `grounding.json`:agent 是否真去 Grep 了 `BaseBankAccountPO`、读了 `@TableName`、把该断言预筛为 像真/像错 并标 `needs_human`。
Expected: 产出含若干 assertion,至少把 `@TableName` 那条核对出 像真/像错 + 证据(文件:行);schema 合法。

- [ ] **Step 3: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/agents/grounding-probe.md
git commit -m "feat(skill-eval): grounding-probe agent(重读真代码预筛事实断言,只读、不终判、留人裁决)"
```

---

### Task 5: aggregate.py——跨轮 recurrence/consistency/分组(聚类前的确定性 prep)

**Files:**
- Create: `skill-forge/skills/skill-eval/lib/aggregate.py`

**Interfaces:**
- Consumes: 一个 run 下**所有模块**的 `findings.json`(+ 若存在 `judge.json`/`grounding.json`)。
- Produces: `aggregate.py <run-dir> --skill module-brief` → `<run-dir>/aggregate-input.json`:
  ```json
  {"skill":"module-brief","run_id":"...","modules":[...],"total_runs":int,
   "groups":[{"check_id":str,"klass":str,"flagged_runs":int,"total_runs":int,
              "modules":[...],"recurrence":"flagged/total","instances":[{run_id,module,summary,evidence}]}],
   "consistency_signals":[{"module":str,"runs":int,"metric":str,"values":[...],"divergent":bool}],
   "duration_outliers":[{"module":str,"duration_ms":int,"median_ms":int,"ratio":float}]}
  ```
  > 跨多个 run-dir 聚合时(同模块多跑做一致性),支持传多个 `--run` 或一个 `--runs-root`。recurrence 以「模块」为单位计(一个候选在几个模块复现)。

- [ ] **Step 1: 写 aggregate.py**

```python
#!/usr/bin/env python3
"""跨轮聚合 prep(确定性半):读多个 run 的 findings.json,算 recurrence/consistency/耗时离群。
判断半(同根因聚类、通用/特有、诚实标)由 aggregator agent 接力。"""
import sys, os, json, glob, argparse, statistics

def load_findings(run_dirs):
    """返回 [(run_id, module, findings_obj, judge_obj|None)]"""
    out=[]
    for rd in run_dirs:
        for fp in glob.glob(os.path.join(rd,"runs","*","findings.json")):
            mdir=os.path.dirname(fp); f=json.load(open(fp,encoding='utf-8'))
            jp=os.path.join(mdir,"judge.json"); j=json.load(open(jp,encoding='utf-8')) if os.path.exists(jp) else None
            out.append((f.get("run_id"), f.get("module"), f, j))
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--skill",required=True)
    ap.add_argument("--run",action="append",default=[],help="一个或多个 run-dir")
    ap.add_argument("--out",required=True)
    a=ap.parse_args()
    recs=load_findings(a.run)
    modules=sorted({m for _,m,_,_ in recs}); total=len(recs)
    # --- recurrence:按 check_id 聚合非 pass finding,以模块计复发 ---
    groups={}
    for rid,mod,f,_ in recs:
        for fn in f["findings"]:
            if fn["verdict"]=="pass": continue
            g=groups.setdefault(fn["check_id"], {"check_id":fn["check_id"],"klass":fn["klass"],
                "modules":set(),"instances":[]})
            g["modules"].add(mod)
            g["instances"].append({"run_id":rid,"module":mod,"summary":fn["summary"],
                "evidence":fn.get("evidence",[])[:2]})
    group_list=[]
    for g in groups.values():
        fr=len(g["modules"])
        group_list.append({"check_id":g["check_id"],"klass":g["klass"],
            "flagged_runs":fr,"total_runs":len(modules),
            "modules":sorted(g["modules"]),"recurrence":f"{fr}/{len(modules)}",
            "instances":g["instances"]})
    group_list.sort(key=lambda x:(-x["flagged_runs"], x["check_id"]))
    # --- consistency:同模块多 run 的指标发散(陷阱数 / 节数差) ---
    by_mod={}
    for rid,mod,f,_ in recs:
        by_mod.setdefault(mod,[]).append((rid,f))
    consistency=[]
    for mod,lst in by_mod.items():
        if len(lst)<2: continue
        traps=[ _trap_count(f) for _,f in lst ]
        consistency.append({"module":mod,"runs":len(lst),"metric":"trap_count",
            "values":traps,"divergent": (max(traps)-min(traps))>=2})
    # --- 耗时离群 ---
    durs=[(mod, f["process"].get("duration_ms")) for _,mod,f,_ in recs if f["process"].get("duration_ms")]
    outliers=[]
    if len(durs)>=3:
        med=statistics.median([d for _,d in durs])
        for mod,d in durs:
            if med and d>=4*med: outliers.append({"module":mod,"duration_ms":d,"median_ms":int(med),"ratio":round(d/med,1)})
    res={"skill":a.skill,"modules":modules,"total_runs":total,"groups":group_list,
         "consistency_signals":consistency,"duration_outliers":outliers}
    json.dump(res, open(a.out,"w",encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"aggregate: modules={len(modules)} groups={len(group_list)} consistency={len(consistency)} outliers={len(outliers)} → {a.out}")

def _trap_count(f):
    for fn in f["findings"]:
        if fn["check_id"]=="trap_count":
            import re; m=re.search(r'陷阱 (\d+) 条', fn["summary"]); return int(m.group(1)) if m else 0
    return 0

if __name__=="__main__": main()
```

- [ ] **Step 2: 先对全部真实 run 跑 observe.py 备齐 findings,再跑 aggregate.py**

```bash
SF=/Users/lilongjian/Projects/AI/skill-forge; B="$HOME/.cache/skill-eval/skill-eval/module-brief"
for R in 20260617-144516 20260617-140907 20260617-142256; do
  python3 "$SF/skills/skill-eval/lib/observe.py" "$B/$R" --skill module-brief
done
python3 "$SF/skills/skill-eval/lib/aggregate.py" --skill module-brief \
  --run "$B/20260617-144516" --run "$B/20260617-140907" --run "$B/20260617-142256" \
  --out "$B/aggregate-input.json"
python3 - "$B/aggregate-input.json" <<'PY'
import json,sys; d=json.load(open(sys.argv[1]))
print("modules:",d["modules"])
print("top groups:",[(g["check_id"],g["recurrence"]) for g in d["groups"][:6]])
print("consistency:",[(c["module"],c["values"]) for c in d["consistency_signals"]])
# org 跨 3 run 应出现陷阱数发散(6/7/5 之类)
org=[c for c in d["consistency_signals"] if c["module"]=="mdm-organization"]
assert org and org[0]["runs"]>=2, "org 应有多 run 一致性信号"
print("✅ org 一致性:",org[0])
PY
```
Expected: `modules` 含 organization/company/bank-financial;`groups` 按复发模块数排序;org 有 `consistency_signals`(陷阱数跨 run 发散,印证设计 §3.3 鲁棒性缺口样本)。

- [ ] **Step 3: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/lib/aggregate.py
git commit -m "feat(skill-eval): aggregate.py 跨轮 recurrence/consistency/耗时离群 prep"
```

---

### Task 6: aggregator agent + 候选报告/交接包格式

**Files:**
- Create: `skill-forge/skills/skill-eval/agents/aggregator.md`
- Create: `skill-forge/skills/skill-eval/templates/handoff-schema.md`

**Interfaces:**
- Consumes: `aggregate-input.json`(Task 5)+ 各模块 `judge.json`/`grounding.json`。
- Produces: `candidate-report.md`(人读,排序候选清单)+ `handoff/<候选编号>.md`(选中项打成 skill-forge 交接包)。格式由 `templates/handoff-schema.md` 定。

- [ ] **Step 1: 写 handoff-schema.md(候选报告 + 交接包字段,单一权威)**

`templates/handoff-schema.md`:
```markdown
# skill-eval 候选报告 + 交接包格式

## 候选报告(`candidate-report.md`)——排序的候选缺陷清单
表头:覆盖率说明(N 模块真贡献 / M 跑,显式列掉的)。每条候选:

### 候选 C{n}:{标题}
- **类别**:流程性 / 产物契约性 / 事实性
- **复发率**:{flagged}/{total} 模块({哪些模块})— ★主滤网:≫ 占多数=系统性 skill 缺陷;1/M=一次性噪声
- **一致性**(K>1):同模块多跑是否发散(鲁棒性缺口)
- **分类**:通用 skill 缺陷 / 项目特有噪声 —— **判据:看「为什么复发」**:若因所有模块共享同一项目特征而复发,判**特有**(归 CLAUDE.md 或弃,不喂 skill-forge)
- **诚实标**:能力缺口 / 工程小优(不 oversell)
- **嫌疑产物**:定位到 skill 的哪个文件/小节(如「陷阱质量类复发 → design-format §5」)
- **证据**:模块 + trace/产物摘录(锚到行)
- **修法方向**:一句话给 skill-forge 起点

## 交接包(`handoff/C{n}.md`)——人选中的候选,逐条含上述全字段
**只打包人选中、判为「通用」且值得修的**。基建到此为止——交 skill-forge 走它的 eval 流程改 skill,本基建不碰 skill 本体。
```

- [ ] **Step 2: 写 aggregator agent 提示**

`agents/aggregator.md`:
```markdown
---
name: aggregator
description: skill-eval 聚合段·跨轮聚类/分类/诚实标,产候选报告(止于候选,不改 skill)
---

你是 skill-eval 的**聚合分类 agent**。把跨模块的 finding 聚成排好序的候选缺陷清单。**绝不自动判定真缺陷、绝不晋级**——产候选供人选;人是 ground-truth 锚。

## 输入(派发 prompt 给你)
- `aggregate-input.json`(recurrence/consistency/耗时离群,已算好)
- 各模块 `judge.json`(陷阱质量/自标注确认)、`grounding.json`(事实预筛)
- `templates/handoff-schema.md`(输出格式,严格遵循)

## 做法
1. **聚类**:把同根因、跨模块的 finding 合成一个候选(如多个模块都 hedge 自标注 → 一个「自标注反模式复发」候选)。
2. **复发滤网**:用 recurrence(flagged/total 模块)排序——复现多=系统性 skill 缺陷优先;1/M=标一次性噪声、压低。
3. **通用 vs 项目特有**:**看为什么复发**——若因所有模块共享同一项目特征而复发,判**项目特有**(归 CLAUDE.md 或弃,**不**进交接包);只有跨模块都成立的 skill 行为缺陷判**通用**。
4. **诚实标**:每条标 能力缺口 / 工程小优,不 oversell。
5. **嫌疑产物**:把通用候选定位到 module-brief 的具体文件/小节,给 skill-forge 起点。
6. **事实性候选**:grounding 标 `像错/存疑` 的,列为「待人裁决」候选,**不自动采信**。

## 护栏
- 0 候选是合法诚实输出,别凑数硬找。
- 覆盖率写清(N/M 真贡献,掉的模块显式列)。
- 严格按 handoff-schema 字段产 `candidate-report.md`。

## 输出
写 `candidate-report.md`(排序候选清单)。**不写交接包**——交接包是人选后才打(由 SKILL.md 编排,人选中哪些再生成 `handoff/C{n}.md`)。
```

- [ ] **Step 3: 派 aggregator 跑,产候选报告,人眼检信噪比**

执行者派 aggregator,输入 Task 5 的 `aggregate-input.json` + 各模块 judge/grounding(若 Task 3/4 已生成)+ handoff-schema。产 `$B/candidate-report.md`。
人眼检:① 候选按复发率排序;② 每条有 类别/复发率/分类/诚实标/嫌疑产物/修法;③ 无 oversell;④ top 候选是不是「人真会去修的」(设计 §6.2 信噪比验收由人判)。
Expected: 一份排序候选报告,字段齐、低噪;黄金缺陷类(自标注反模式)若在多个模块复现应排前;一次性噪声标清并压低。

- [ ] **Step 4: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/agents/aggregator.md skills/skill-eval/templates/handoff-schema.md
git commit -m "feat(skill-eval): aggregator agent + 候选报告/交接包格式(聚类/复发滤网/通用-特有/诚实标)"
```

---

### Task 7: SKILL.md 状态感知入口 + run.sh status 子命令

**Files:**
- Create: `skill-forge/skills/skill-eval/SKILL.md`
- Modify: `skill-forge/skills/skill-eval/run.sh`(加 `status` 子命令 + STARTED 标记 + 末尾 finalize `summary`)

**Interfaces:**
- Consumes: 全部前序(observe.py/aggregate.py/三 agent/rubric/manifest/run.sh)。
- Produces: `/skill-eval <skill>` 状态感知入口(设计 §1.2):无批→起批跑(后台任务,默认 Opus,model 旋钮可选);批在跑→报进度;批跑完→观察→人审探针→聚合→候选报告→人选→交接包。`run.sh status <skill>` 打印 `none` / `running <run-id>` / `done <run-id>`。

- [ ] **Step 1: 给 run.sh 加 status 子命令 + 状态标记**

读现有 `run.sh`,在入口加子命令分发:第一个位置参=`status` 时走状态探测(不跑批);否则照旧跑批。批跑开始时 `touch <run>/STARTED`;run-manifest.json 仅在**末尾**才写入 `summary`(作为「done」判据)。status 逻辑:
```bash
# run.sh status <skill>:探测最新 run 状态(供 SKILL.md 决定干哪段)
cmd="$1"
if [ "$cmd" = "status" ]; then
  skill="$2"; base="${SKILL_EVAL_SCRATCH:-$HOME/.cache/skill-eval}/skill-eval/$skill"
  latest=$(ls -dt "$base"/*/ 2>/dev/null | head -1)
  if [ -z "$latest" ]; then echo "none"; exit 0; fi
  rid=$(basename "$latest")
  if [ -f "$latest/run-manifest.json" ] && grep -q '"summary"' "$latest/run-manifest.json"; then
    echo "done $rid"
  else
    echo "running $rid"
  fi
  exit 0
fi
# …原批跑逻辑…(末尾写 summary 前先确保 STARTED 已 touch)
```
> 默认模型:批跑 `claude -p` 默认**不加 `--model`**(继承会话=Opus,评测效度最高)。可选旋钮:若 env `SKILL_EVAL_MODEL` 非空,则附 `--model "$SKILL_EVAL_MODEL"`(成本敏感探索跑时才设)。

- [ ] **Step 2: 写 SKILL.md(状态感知编排)**

`SKILL.md`:
```markdown
---
name: skill-eval
description: 对一个目标 skill 批跑分析各模块→观察→聚合→产候选缺陷清单+skill-forge 交接包。状态感知:没跑过批就起批跑(后台),跑完接聚合。显式调用 /skill-eval <skill>,不自动触发。
---

# skill-eval:skill 的事后裁判(eval harness)

把「批跑 skill→观察过程→记候选问题→人选真问题→交 skill-forge」规模化、半自动化。**止于候选清单,交 skill-forge,不碰 skill 本体**。引擎项目无关;目标项目特有值只在该项目的 `.skill-eval/corpus/<skill>.yml`。

## 用法
`/skill-eval <目标skill>`(如 `/skill-eval module-brief`)。先探状态,再决定干哪段。

## Step 0:探状态
```bash
bash "$(dirname SKILL.md)/run.sh" status <skill>
```
- 输出 `none` → 进 **A 段:起批跑**。
- 输出 `running <run-id>` → **报进度**:读 `<run>/run-manifest.json` 的 ok/failed,告知「X/N 完成」,返回(批是后台任务,跑完会自动唤醒接 B 段)。
- 输出 `done <run-id>` → 进 **B 段:聚合**。

## A 段:起批跑(无人值守)
1. 读目标项目 `.skill-eval/corpus/<skill>.yml` → 模块数 N;告知用户「N 模块 / 预计耗时 / 默认 Opus≈$X、日志位置」。默认模型 Opus(评测效度);成本敏感可 `SKILL_EVAL_MODEL=...` 起便宜模型。
2. 以 **harness 后台任务**起 `run.sh <skill>`(机器保持开着,跑完自动唤醒接 B 段——设计 §1.2 A 模式)。
3. 返回,不阻塞。

## B 段:聚合(交互,人判)
1. **per-run 观察(确定性)**:对 `done` run 的每模块跑 `lib/observe.py <run-dir> --skill <skill>` → 各 `findings.json`。
2. **软判断**:对每模块**派 quality-judge agent**(`agents/quality-judge.md`)→ `judge.json`。
3. **事实预筛**:对每模块**派 grounding-probe agent**(`agents/grounding-probe.md`,允许 Read/Grep/Glob + `mcp__mysql_*`)→ `grounding.json`。
4. **跨轮聚合**:`lib/aggregate.py --skill <skill> --run <run-dir> [--run 同模块历史run...] --out aggregate-input.json`。
5. **聚类分类**:**派 aggregator agent**(`agents/aggregator.md`)→ `candidate-report.md`。
6. **人审 + 人选**:把候选报告 + grounding 标「像错/存疑」的事实条目呈给用户;**用户裁决事实性 + 选中真问题**(基建不自动采信、不自动晋级)。
7. **打交接包**:对用户选中项,按 `templates/handoff-schema.md` 生成 `handoff/C{n}.md`,提交进 skill-forge。**到此为止——改 skill 走 skill-forge eval 流程,本基建不碰。**

## 护栏
不自动晋级;0 候选合法;覆盖率写清(N/M);每条标 通用/特有 + 能力/工程,只通用喂 skill-forge;不 oversell、不造 finding。
```

- [ ] **Step 3: 验证 status 子命令对真实 scratch 给对状态**

```bash
SF=/Users/lilongjian/Projects/AI/skill-forge
bash "$SF/skills/skill-eval/run.sh" status module-brief   # 期望 done <run-id>(已有跑完的 run)
bash "$SF/skills/skill-eval/run.sh" status no-such-skill    # 期望 none
```
Expected: 已有 run 的 skill 返回 `done <run-id>`;不存在的 skill 返回 `none`。

> ⚠️ 若历史 run 的 `run-manifest.json` 无 `summary` 字段(2A 写法可能不含),status 会误判 running。Step 3 若复现,补一行:让 status 的 done 判据放宽为「run-manifest 存在且 `failed`+`ok` 已写齐」或读 2A run.sh 实际产出字段对齐——以 2A run.sh 真实输出为准,别假设字段名。

- [ ] **Step 4: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/SKILL.md skills/skill-eval/run.sh
git commit -m "feat(skill-eval): /skill-eval 状态感知入口(起批跑/报进度/接聚合)+ run.sh status 子命令"
```

---

### Task 8: 第二段端到端 + v1 验证(设计 §6 验收)+ skill-eval CHANGELOG

**Files:**
- Create: `skill-forge/skills/skill-eval/CHANGELOG.md`(诚实定性写入,设计 §6.3)

- [ ] **Step 1: 第二段全链跑通(用现有真实 run,不新跑批省成本)**

按 SKILL.md B 段,对 `20260617-144516`(+ 同模块历史 run 做一致性)端到端:observe.py → 派 quality-judge → 派 grounding-probe → aggregate.py → 派 aggregator → `candidate-report.md`。把黄金 fixture 也并进一个临时 run(`/tmp/golden`)走同一管线,验证黄金缺陷穿过全链仍被逮。

- [ ] **Step 2: 验收设计 §6 三条**

```bash
SF=/Users/lilongjian/Projects/AI/skill-forge; B="$HOME/.cache/skill-eval/skill-eval/module-brief"
echo "=== §6.1 黄金回归:全链是否逮回 v1.0.1 自标注反模式 ==="
grep -l "自标注\|偏通用\|hedge" "$B"/candidate-report.md /tmp/golden/candidate-report.md 2>/dev/null
echo "=== §6.2 信噪比:候选报告 top 项(人判是否真会修)==="
sed -n '1,40p' "$B/candidate-report.md"
echo "=== 覆盖率写清(N/M)没 ==="; grep -n "覆盖率\|/.*模块\|掉" "$B/candidate-report.md" | head
```
Expected:① 黄金缺陷在报告中作为候选出现(经全链确定性+判断+聚合仍被逮)= 设计 §6.1 最强证据;② 候选报告排序合理、低噪、字段齐;③ 覆盖率显式(N/M)。**信噪比与「是否真会修」由人(用户)终判**。

- [ ] **Step 3: 诚实定性写入 skill-eval CHANGELOG(设计 §6.3)**

`CHANGELOG.md`:
```markdown
# skill-eval CHANGELOG

## v0.2.0 — 聚合侧(2B)

聚合段落地:per-run 观察器(确定性 observe.py + quality-judge/grounding-probe agent)+ 跨轮 aggregate.py + aggregator agent + 候选报告/交接包 + `/skill-eval` 状态感知入口。

**诚实定性(设计 §6.3,不 oversell)**:本基建的价值主要是**工程性**——产一份低噪、排好序、分类好、带复发率的候选清单,让人比手动 dogfood 更快下手;**不保证**每轮都逮到能力级缺陷。验收口径=候选清单的信噪比与可操作性,非「找到 bug」。

**实测纠偏沉淀**:① trace 归属可用(子 agent 工具调用带 agent_id,agent_type=general-purpose)→ 观察器以 trace 归属为确定性主检查、design 引真实类名为语义佐证;② eval 默认 Opus 继承(评 skill 非模型),钉便宜模型做可选旋钮。

**边界**:止于候选清单,交 skill-forge 改 skill;v1 单库(GMZB)、单靶(module-brief)。
```

- [ ] **Step 4: 提交 + 更新进度账本**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git add skills/skill-eval/CHANGELOG.md
git commit -m "docs(skill-eval): v0.2.0 聚合侧 CHANGELOG(诚实定性:价值主工程性,止于候选清单)"
```
更新 GMZB `.git/sdd/progress.md`:2B 各 Task 状态 + 候选报告产出位置。

---

## Self-Review

**1. Spec coverage**(对照设计 §3 聚合侧 + 用户 2B 范围 ①-⑤):
- §3.1 per-run 观察器 三类(A 流程/B 契约/C 事实,尺子=skill 契约)→ Task 1(rubric 尺子)+ Task 2(observe.py A+B 确定性)+ Task 3(quality-judge 软 B)✅;C 事实走 Task 4 ✅
- §3.2 人审探针(grounding 预筛 + 人裁决)→ Task 4(grounding-probe 预筛)+ Task 7 B 段 Step 6(人裁决)✅
- §3.3 跨轮聚合分类器(聚类/复发滤网/一致性/通用-特有/诚实标/嫌疑产物)→ Task 5(aggregate.py 确定性半)+ Task 6(aggregator agent 判断半)✅
- §3.4 候选报告 + 人选 → 交接包 → Task 6(格式)+ Task 7 B 段 Step 6-7(人选+打包)✅
- §1.2 `/skill-eval` 状态感知入口 → Task 7 ✅
- §6 v1 验证(黄金回归/信噪比/诚实定性)→ Task 2 Step 3(黄金 fixture 逮)+ Task 8 ✅
- 用户 ①观察器 ②人审探针 ③聚合分类 ④候选报告+交接 ⑤入口 → 全覆盖 ✅

**2. Placeholder scan**:observe.py/aggregate.py 给了完整可运行代码;agent 提示给了完整 prompt 文本;rubric/fixture/SKILL.md/handoff-schema 给了完整内容。Task 7 Step 3 的 status `summary` 字段标了「以 2A run.sh 真实输出为准」——非占位,是显式的实现期对齐点(2A run.sh 已存在,实现时读真实字段)。无 TBD/TODO。

**3. 一致性**:findings.json schema(check_id/klass/verdict/severity/evidence)跨 observe.py(产)→ aggregate.py(消费 verdict!=pass)→ aggregator(消费 recurrence)一致;judge.json/grounding.json schema 跨 agent(产)→ aggregate.py/aggregator(消费)一致;路径 `<run>/runs/<module>/{findings,judge,grounding}.json` + `<run>/aggregate-input.json` + `<run>/candidate-report.md` 跨 Task 一致;env `SKILL_EVAL_MODEL`/`SKILL_EVAL_TARGET_PROJECT`/`SKILL_EVAL_SCRATCH` 与 2A 一致;「trace 归属为主」「Opus 默认」两决定跨 Global Constraints / Task 2 / Task 7 一致。

> 执行用 superpowers:subagent-driven-development(每 Task 一 fresh subagent + 两段评审)。Task 3/4/6/8 含**派子 agent**的验证步——由执行会话用 Task/Agent 实派、眼检产出,不是纸面。

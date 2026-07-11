# Codex 跨引擎审查拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把用户级命令 `codex-review` 拆成一对情境对偶的自包含 Skill——`codex-code-review`(审代码改动)与 `codex-design-review`(审设计方案)——在 `incubating/` 孵化。

**Architecture:** 两个 Skill 各自 `SKILL.md` 自包含、零跨调,只共享约定(引擎分离铁律 / 安全传参 / read-only 沙箱 / 显式触发)。引擎选型据 companion v1.0.5 源码定死:code-review 调 `adversarial-review`(审 git diff),design-review 调 `task` read-only(审静态设计,不依赖 git)。

**Tech Stack:** Markdown Skill(`SKILL.md` + `references/`);codex 插件 companion `codex-companion.mjs`(`adversarial-review` / `task` 子命令);bash + Read/Write 工具。

## Global Constraints

- 全程简体中文(项目 `principles.md`:注释/文档/响应均中文)。
- 两个 Skill **均不自动触发**,仅在用户显式说出"**Codex 审**"词根 + 对象时启动。
- **引擎分离铁律**:writer=Claude,reviewer 固定 Codex;reviewer 只审不改;裁决权在 controller;绝不 pre-judge。
- **安全传参**:审查重点/内容先用 Write 落临时文件,bash 只 `cat` 该文件传参;绝不把仓库内容(含 markdown 反引号、`$()`)直接拼进 shell 命令串。
- **引擎绑定**:`codex-code-review`→`adversarial-review`(硬依赖 git、审 diff);`codex-design-review`→`task` read-only(无 git 依赖、审静态内容)。**不得混用**。
- companion 定位用 globbed 绝对路径:`CODEX="$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)"`。
- 落地路径:`incubating/codex-code-review/`、`incubating/codex-design-review/`。无需登记(incubating 为纯目录)。
- 权威依据:spec `docs/superpowers/specs/2026-07-11-codex-cross-engine-review-split-design.md`;可移植源:`~/.claude/commands/codex-review.md`。

---

## File Structure

- `incubating/codex-code-review/SKILL.md` — 审代码改动:采集 git 三类改动 → 软前置自证 → 调 `adversarial-review` → 完成度对照 → 呈现裁决。由现有命令移植 + 升级。
- `incubating/codex-design-review/SKILL.md` — 审设计方案:收 path/inline → Claude Read 组装内容 → 调 `task` read-only(喂自带 prompt)→ 呈现裁决。
- `incubating/codex-design-review/references/design-review-prompt.md` — 喂给 `task` 的对抗式设计评审 prompt 模板(自带 rubric + 输出格式),含 `{{USER_FOCUS}}` / `{{REVIEW_INPUT}}` 占位。

---

## Task 1: 冒烟验证两个 companion 引擎(spike)

先在真实环境确认两个引擎的调用与输出符合源码判断,再动手写 Skill,避免照着错假设写。产物是一份验证记录(scratchpad,不入库),供 Task 2/3 抄准确的调用串。

**Files:**
- 无源码改动。记录写入 scratchpad:`<scratchpad>/codex-engines-smoke.md`

**Interfaces:**
- Produces:两条已验证的调用串 + 观察到的输出形状,供 Task 2(adversarial-review)与 Task 3(task)复用。

- [ ] **Step 1:验证 adversarial-review 需 git 且能审改动**

在本仓库造一处 trivial 未提交改动(如临时给某 md 加一行),前台跑:

```bash
CODEX="$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)"
node "$CODEX" adversarial-review --wait --scope working-tree "只看本次这一行改动,给一句话结论即可"
```

Expected:命令成功返回,输出含 `verdict`(approve/needs-attention)与 findings 结构;确认它读到了 git 改动。记录实际输出字段名。跑完撤销临时改动(`git checkout -- <file>`)。

- [ ] **Step 2:验证 task read-only 不需 git、可审静态文本**

在一个**非 git 临时目录**放一小段设计文本,跑:

```bash
CODEX="$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)"
mkdir -p /tmp/codex-nogit-smoke && cd /tmp/codex-nogit-smoke
printf '方案:用轮询每秒查一次数据库判断任务完成。' > design.txt
node "$CODEX" task --wait "你在做对抗式设计评审,只审不改。审下面这份设计并给一条最强质疑:$(cat design.txt)"
```

Expected:在**非 git 目录**下命令**不报 git 错**、正常返回 Codex 的批评文本(如指出轮询的负载/延迟问题)。确认 `task` 缺省 read-only、无 git 依赖。

- [ ] **Step 3:记录结论**

把两条命令的**确切可用形式**、输出字段名/形状、以及任何偏离源码判断之处,写入 `<scratchpad>/codex-engines-smoke.md`。若 Step 1/2 有任一失败或行为不符,**停下**报告用户,不要带着错假设进 Task 2/3。

- [ ] **Step 4:无需 commit**(纯验证,产物在 scratchpad)。

---

## Task 2: codex-code-review Skill(移植现有命令 + 升级)

**Files:**
- Create: `incubating/codex-code-review/SKILL.md`
- 移植源(只读参考):`~/.claude/commands/codex-review.md`
- 权威依据:spec「组件一」小节

**Interfaces:**
- Consumes:Task 1 Step 1 验证过的 `adversarial-review --wait --scope working-tree` 调用串。
- Produces:一个可被"Codex 审本次变更"触发的 Skill;供 Task 4 自检触发矩阵引用其 `name`/`description`。

- [ ] **Step 1:先定"验收长啥样"——写触发矩阵与走查清单**

在动手前,把本 Skill 的正确行为定成可核对的清单(写进 `<scratchpad>/code-review-accept.md`):

- 触发:输入"Codex 审本次变更 / Codex 审我刚写的改动"→ **应**命中;输入"帮我看下这段代码"(无"Codex审")→ **不应**命中;输入"Codex 审这个设计方案"→ **不应**命中(应归 design-review)。
- 走查:采集 git 三类改动(含 untracked 显式列入)→ 软前置自证 → 安全传参(Write 落文件再 cat)→ 调 adversarial-review → 完成度对照(自动拾取变更的 spec/plan 作标尺 + 可选显式路径)→ 呈现裁决。

- [ ] **Step 2:写 SKILL.md frontmatter(触发靠 description)**

```markdown
---
name: codex-code-review
description: 用户显式说「Codex 审本次变更 / 我刚写的改动」时,拉 Codex 引擎(companion adversarial-review,read-only 沙箱)独立审当前 git 未提交改动——正确性 / 安全 / severity / file:line;并以本次变更的 design/spec 为标尺做完成度对照(收尾质量+安全总评审)。审的是 git diff,须在 git 仓库内。**不自动触发**。审"设计方案/还没写码的思路"改用 codex-design-review。
---
```

- [ ] **Step 3:写 SKILL.md 正文——移植现有命令骨架**

从 `~/.claude/commands/codex-review.md` 移植这几块**原样保留**的逻辑(照抄其内容,按 Skill 语气微调):
1. 输入解释(空 = 审全部未提交改动;说明文字 = 附加审查重点)。
2. 「1. 收集改动」机械硬步骤(`git status --short` / `diff --cached` / `diff` / `ls-files --others`),**untracked 非空必须显式列入 reviewer prompt 并要求 Read**。
3. 「2. 先自证(软前置)」:有可跑的测试/编译且未验证则先跑,把结果交 reviewer;跑不了/不适用则跳过并注明。
4. 「3. 派 Codex 审」:安全传参(focus 先 Write 落 `$PROMPT_FILE`,bash 只 `cat` 传参),调用串用 Task 1 验证过的:

```bash
CODEX="$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)"
node "$CODEX" adversarial-review --wait --scope working-tree "$(cat -- "$PROMPT_FILE")"
# 大改动:Bash run_in_background + --background,再看 /codex:status
```
5. 「4. 呈现裁决」+ 「铁律」(引擎分离 / 只审不改 / 审查不替代本机验证)。

- [ ] **Step 4:写 SKILL.md 正文——升级"完成度对照(吸收 U3)"为一等公民**

在"派 Codex 审"的 `$PROMPT_FILE` 必含项里,把原命令"若有关联 spec 作 DoD 依据"这条**升为独立小节**,写入如下确切内容:

```markdown
### 完成度对照(一等公民)
本 Skill 同时承担"一次完整开发后的收尾评审":审代码是否兑现本次的设计/规格 + 质量 + 安全。
- **标尺发现(默认自动)**:把本次工作区里**变更过的** `*.md` 设计/spec/plan(在 git 三类改动内的)自动列为验收标尺,要求 reviewer 逐条对照代码兑现度。
- **可选显式**:用户在参数里给了 spec/plan 路径时(即便本次未改动、不在 diff),以该路径为准补作标尺。
- 设计本身的合理性**不在此审**(假定已由 codex-design-review 在写码前审过);此处只把设计当 DoD 尺子。
- spec 对齐由 controller 侧另判:逐条给 `spec ✅/❌`,无依据标 `spec: n/a`,不逼 reviewer 给伪精确结论。
```

- [ ] **Step 5:触发矩阵自核**

对照 Step 1 清单逐条核 `description`:确认"Codex 审本次变更"能命中、"Codex 审这个设计"不会误命中本 Skill(description 末句已显式指向 design-review)。不达标就改 description 措辞。

- [ ] **Step 6:真实走查(端到端 dry-run)**

在本仓库造一处小改动(或用现有未提交改动),**照 SKILL.md 逐步执行一遍**:采集→自证→安全传参→调 adversarial-review→完成度对照→呈现。确认每一步都可执行、调用串成功返回、裁决呈现完整。撤销临时改动。

- [ ] **Step 7:Commit**

```bash
git add incubating/codex-code-review/SKILL.md
git commit -m "feat(codex-code-review): 移植现有命令为 Skill + 完成度对照升为一等公民"
```

---

## Task 3: codex-design-review Skill(新建)

**Files:**
- Create: `incubating/codex-design-review/SKILL.md`
- Create: `incubating/codex-design-review/references/design-review-prompt.md`
- 权威依据:spec「组件二」小节

**Interfaces:**
- Consumes:Task 1 Step 2 验证过的 `task --wait`(read-only)调用串。
- Produces:一个可被"Codex 审这个设计/方案"触发的 Skill,输入支持路径与 inline 文本。

- [ ] **Step 1:先定验收——触发矩阵与走查清单**

写进 `<scratchpad>/design-review-accept.md`:

- 触发:"Codex 审这个设计 / Codex 审这个方案 / Codex 审 docs/xxx.md 这份 spec"→ **应**命中;"Codex 审本次变更"→ **不应**命中(归 code-review);"帮我写个设计"(无"Codex审")→ **不应**命中。
- 走查:识别输入类型(路径 / inline)→ 路径则 Claude `Read`(目录枚举设计文档)→ 把内容 + 用户重点写进 prompt 文件(安全传参)→ 调 `task --wait` read-only → 呈现自带格式的裁决。

- [ ] **Step 2:写对抗式设计评审 prompt 模板**

Create `incubating/codex-design-review/references/design-review-prompt.md`,内容为:

```markdown
<role>
你是 Codex,在做对抗式**设计评审**。你的任务是击溃对这份设计的信心,而非替它背书。只审不改。
</role>
<task>
把下面的设计当作"要找出它现在还不该落地的最强理由"来审。
用户附加审查重点:{{USER_FOCUS}}
</task>
<operating_stance>
默认怀疑。假设设计会在隐蔽、高代价或用户可见处失败,直到证据说不。
不因"意图良好 / 部分覆盖 / 大概会后续补"给分。只在 happy path 成立的方案,视为真实弱点。
</operating_stance>
<attack_surface>
优先挖这些**设计层面**的失败:
- 假设不成立(前提、依赖、外部约束被想当然)
- 完整性缺口(漏掉的场景、边界、错误路径、并发 / 回滚 / 迁移)
- 内部不一致(章节间自相矛盾、术语漂移、同一接口两处定义打架)
- DoD 不可验证(验收标准含糊、无法机器判定)
- 有更优解被忽略(更简单 / 更省 / 风险更低的路子未被论证排除)
- 未决点与风险(悬而未决却当已定的决策)
</attack_surface>
<finding_bar>
只报实质发现,不报文风 / 措辞 / 低价值清理。每条回答:哪里会出问题 / 为什么这条路脆弱 / 可能后果 / 什么具体修改能降风险。
</finding_bar>
<output_format>
中文,逐条:
- 严重度:阻断 / 重要 / 建议
- 定位:文件:章节 或 段落(inline 方案则引用其片段)
- 问题:这个缺口会让方案在什么情况下崩
- 建议:具体、可执行的修改
末尾一行 verdict:可发布 / 需修正 —— 像 ship/no-ship 结论,别写中性复述。
</output_format>
<grounding_rules>
要犀利但站得住。每条发现必须能从给出的设计内容里辩护。不要臆造设计里没有的内容 / 决策 / 场景。依赖推断时明说,别把推断当事实。
</grounding_rules>
<calibration_rules>
一条硬发现胜过若干条软发现。不用填充稀释严重问题。若设计确实稳妥,直说并返回零发现。
</calibration_rules>
<design_content>
{{REVIEW_INPUT}}
</design_content>
```

- [ ] **Step 3:写 SKILL.md frontmatter**

```markdown
---
name: codex-design-review
description: 用户显式说「Codex 审这个设计 / 这个方案」时,拉 Codex 引擎(companion task,read-only 沙箱)独立审一份设计意图——design/spec/plan/brief/RFC 文档,或一段还没落文档的想法。视角是假设是否成立 / 完整性 / 内部一致性 / DoD 可验证性 / 有无更优解 / 风险,非代码 severity。输入可为路径(Claude 读)或 inline 文本,**不依赖 git**。**不自动触发**。审"代码改动 / 本次变更"改用 codex-code-review。
---
```

- [ ] **Step 4:写 SKILL.md 正文——执行流程**

正文含如下确切步骤:

```markdown
## 执行流程

### 1. 识别输入
- **路径**(文件/目录):用 Read 读入;目录则枚举其中的设计文档(*.md 等),逐个读入。
- **inline 文本**:用户在对话里直接给的方案,直接取用。
- 范围收口:只审 design/spec/plan/brief/RFC 这类"设计意图"。若被要求审代码改动,改指 codex-code-review。

### 2. 组装 prompt(安全传参)
- Read `references/design-review-prompt.md` 模板。
- 把 `{{USER_FOCUS}}` 替换为用户附加重点(无则"无额外重点"),`{{REVIEW_INPUT}}` 替换为第 1 步读到的设计内容。
- **用 Write 把成品 prompt 落到临时文件 `$PROMPT_FILE`**——绝不把设计内容(含 markdown 反引号)直接拼进 shell 串。

### 3. 派 Codex 审(task,read-only)
```bash
CODEX="$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)"
node "$CODEX" task --wait "$(cat -- "$PROMPT_FILE")"
# 大设计可后台:Bash run_in_background + --background,再看 /codex:status
```
`task` 缺省 read-only(不 --write),reviewer 只审不改。**不加 --write。**

### 4. 呈现裁决
把 Codex 的发现按其自带格式原样呈现,逐条给裁决建议(修 / 归后续 / 记录),由用户拍板。

## 铁律
- 引擎分离:reviewer 固定 Codex,只审不改;裁决权在 controller。
- 不 pre-judge:不得指示 reviewer 忽略/降级某问题。
- 不用 adversarial-review:它审 diff 且硬依赖 git,不匹配"审静态设计"。
```

- [ ] **Step 5:触发矩阵自核**

对照 Step 1 清单核 `description`:"Codex 审这个设计"命中、"Codex 审本次变更"不误命中(末句已指向 code-review)。

- [ ] **Step 6:真实走查(端到端 dry-run)**

拿一份真实设计文档当靶子——**用刚提交的 spec `docs/superpowers/specs/2026-07-11-codex-cross-engine-review-split-design.md`**,照 SKILL.md 逐步走一遍:Read→组装 prompt→Write 落文件→`task --wait`→呈现。确认在本仓库(git 环境)与一个 `/tmp` 非 git 目录里都能跑通(验证不依赖 git),且输出符合自带格式(严重度/定位/问题/建议 + verdict)。

- [ ] **Step 7:Commit**

```bash
git add incubating/codex-design-review/SKILL.md incubating/codex-design-review/references/design-review-prompt.md
git commit -m "feat(codex-design-review): 新建审设计方案 Skill(task read-only + 自带对抗 prompt)"
```

---

## Task 4: 收尾——旧命令退役备注 + 交叉指引

**Files:**
- Create: `incubating/codex-code-review/BACKLOG.md`(或在各自 SKILL.md 末尾加一行后续项)

**Interfaces:**
- Consumes:Task 2/3 产出的两个 Skill。
- Produces:退役旧命令的后续待办记录 + 两 Skill 互指的确认。

- [ ] **Step 1:记录旧命令退役后续项**

Create `incubating/codex-code-review/BACKLOG.md`,内容:

```markdown
# BACKLOG

- [ ] 两 Skill 毕业到 `skills/` 后,退役旧命令 `~/.claude/commands/codex-review.md`(暂留至毕业,避免青黄不接)。
- [ ] 毕业前过一遍 skill-tempering 打磨。
```

- [ ] **Step 2:确认两 Skill 互指闭环**

复核两个 `description` 末句:code-review 指向 design-review、design-review 指向 code-review,形成"审代码 / 审设计"的路由闭环,消除误触发。不达标就补。

- [ ] **Step 3:Commit**

```bash
git add incubating/codex-code-review/BACKLOG.md
git commit -m "chore(codex-review): 记录旧命令退役后续项 + 确认两 Skill 路由互指"
```

---

## Self-Review

**1. Spec coverage:**
- 组件一(审代码改动)→ Task 2 ✅;完成度对照/U3 吸收 → Task 2 Step 4 ✅;软前置自证 → Task 2 Step 3.3 ✅。
- 组件二(审设计方案)→ Task 3 ✅;引擎改 task read-only → Task 3 Step 4 ✅;自带输出格式 → Task 3 Step 2 模板 ✅;path+inline 双输入 → Task 3 Step 4.1 ✅。
- 共同基座(安全传参/显式触发/引擎分离)→ Global Constraints + 各 Task 走查 ✅。
- companion 源码探查结论 → Task 1 冒烟复核 ✅。
- 落地孵化 + 旧命令退役 → Task 4 ✅。
- 明确不做(不建编排器/不按文件类型拆)→ 计划未引入第三 Skill、按情境拆 ✅。

**2. Placeholder scan:** prompt 模板的 `{{USER_FOCUS}}`/`{{REVIEW_INPUT}}` 是**运行时插值占位**(设计使然),非计划占位;其余步骤均给了确切内容/命令。无 TBD/TODO 式空洞。

**3. Type consistency:** 两 Skill `name` 全程一致(`codex-code-review` / `codex-design-review`);引擎绑定一致(code→adversarial-review、design→task);调用串三处引用同一 `CODEX` globbed 定位式。

---

## 备注:关于"测试"

本计划产物是 Markdown Skill,非可编译代码,故"验收"取两种形式:**触发矩阵自核**(description 是否精确命中/不误触)+ **端到端真实走查**(照 SKILL.md 跑一遍真实靶子,确认每步可执行、调用串返回、裁决呈现完整)。Task 1 的引擎冒烟是这套走查的前置去风险。

---
name: codex-task
description: codex 全包实现并自测,Claude 只做头尾 + 安全关键任务跨引擎审查;工具无关推进实现计划中的单个任务。**本 Skill 不自动触发，由用户显式调用。**
---

用「Claude 头尾 + codex 逐任务实现并自测」的分工,落地实现计划中的一个任务。**目标:把 Claude token 花在头(抽 brief)、尾(裁决/记账)和少数安全关键任务的审查上,中间非关键任务近乎零介入。** 计划来源**工具无关**:superpowers / recon-driven-dev / 未来任意工具产出的计划都能喂进来。

## 分工总则（本 Skill 的核心）
- **Claude = 头 + 尾 + 少数关键任务**:抽 brief(头)、裁决与记账(尾)、安全关键任务的跨引擎审查。
- **codex = 逐任务全包**:实现 + **write 模式自测** + 自审,写详细 report,**不 commit**。
- 非安全关键任务:Claude 中间**不逐任务深审、不逐任务跑构建**,只瞄一眼 codex report 的收据 + 几条 git 最小验证,几 k token。

## 三条铁律
- **writer ≠ reviewer 且不同引擎**:codex 写、Claude 审——不只角色分离,是引擎分离。安全关键任务必须由不同引擎(Claude)审。
- **trust-nobody 收据**:codex 必须自测并贴**工具原生**结果——`Verification command`(完整命令)+ `Exit code` + `Targets`(测试类/文件/package/suite/check 名)+ `Summary`(工具原生摘要)+ `Tests run: N`(工具可靠提供计数时填 N,否则 N/A)。**Java/Maven 下** `Targets` 即测试类名、`Tests run: N`(N>0 全过)为自然形态;JS/Go/Rust 等据其工具填。不接受空口 `BUILD SUCCESS`。
- **reviewer 只审不改;codex 不 commit**:commit 由 controller 集中做(trust nobody 的最后一道)。
- **human checkpoint**:codex 终态按 §2.5 表处理;凡「硬停」项(`DONE_WITH_CONCERNS`/`NEEDS_CONTEXT`/`BLOCKED`/校验失败),或安全关键审查报 Critical/Important 时,停下把发现 + 裁决呈现给用户。

## 输入 · 双模

| 调用 | 模式 | 说明 |
|---|---|---|
| `/codex-task 5` | 计划模式 | 执行已定位计划的**任务 5** |
| `/codex-task next` | 计划模式 | 从 sidecar 台账接**下一个未完成任务** |
| `/codex-task "把 X 抽成 helper"` | 自由模式 | 单个有界任务,**无计划/无台账**,一次性 |
| `--plan <path>` | 修饰 | 显式指定计划文件(跳过自动探测) |

判定:数字 → 任务号;`next` → 接续;其余文本 → 自由任务。**主力是计划模式。**

**自由模式**复用执行流程步骤 0、2–5,但:**步骤 0 只做分支安全 + 工作区 baseline + 安全关键判定**,跳过 sidecar exclude、台账读取/初始化、`[~]` 恢复(自由模式无计划、无台账、无 sidecar);**跳过步骤 1「抽 brief」**(brief 即用户描述,controller 稍作结构化);**步骤 2 用内联结构化任务描述替代 brief 文件路径,codex report 完整内联回传**(无 `<N>`/`<计划名>`,不落 sidecar 文件,controller 从 Agent 返回值读);**步骤 4** 派 subagent 审时,任务要求同样用**内联任务描述**替代 `task-<N>-brief.md` 路径;**跳过步骤 6 的台账更新**(仍照常 commit)。安全关键自由任务**原则上禁用 `--lite`**;用户坚持跳审时,把「风险接受」写进 **内联 report + 最终回执**(自由模式无 ledger、无 sidecar 文件)。其余分工、收据、安全关键审查、软交接不变。

## 计划定位（工具无关）
- `--plan <path>` 优先;否则自动探测常见位置(`docs/superpowers/plans/*.md`、`docs/recon-driven-dev/*/tasks.md`、`docs/*/tasks.md` 等)+ 最近修改。唯一候选 → 确认即用;多个/模糊 → **询问用户**。
- 任务解析用统一正则匹配任务头:`^#{1,4}\s*(任务|Task)\s*N\b`(兼容 recon `## 任务 N` 与 superpowers `### Task N`,大小写不敏感)。

## Sidecar 台账（自带,不碰源计划）
位置:`<计划目录>/.codex-task/<计划名>/`,含 `progress.md` + `task-<N>-brief.md` + `task-<N>-report.md`。**不写入源计划文件**(不同工具对计划的所有权不同)。

`progress.md` 格式:
```markdown
# codex-task 进度 · docs/recon-driven-dev/2026-07-06-unify-customer-qcc/tasks.md

- [x] 任务 1 · 企查查字段映射 prefactor
      commit a1b2c3d · tests EnterpriseQccCompanyDataMapperTest(Tests run: 8) · review n/a(非关键)
- [~] 任务 2 · 业务入口切企查查
- [ ] 任务 3 · ...
```
`[ ]` 待办 · `[~]` 进行中 · `[x]` 完成。`next` 读此表挑第一个非 `[x]`。跨 superpowers/recon/未来工具统一。

**`[~]` 崩溃恢复**(commit 与写台账间中断 → 代码已提交但台账仍 `[~]`;`next`/codex-batch 选新 `[ ]` 前先按此恢复,不盲目重派):

| 现场状态 | 恢复动作 |
|---|---|
| 工作区有本任务 partial diff | 读 report,继续或请求裁决,**不重头派发** |
| 工作区干净、最近 commit **message 明示任务号 且 `git show --name-only` ⊆ report 改动清单** | 仅补写 commit hash + 标 `[x]` |
| 工作区干净、找不到匹配 commit | 标「状态不明」,停车请用户确认 |
| report 缺失 / 验证证据不完整 | **禁止自动补 `[x]`**,重新验证或停车 |

## 执行流程

### 0. 前置检查
- **分支安全 + `--branch` 授权**:处于 `main`/`master`/`prod` 且**未给 `--branch`** → **停下**要求用户提供。给了 `--branch <name>` = 用户**显式授权在主干上创建/切换**:分支不存在则 `git switch -c <name>`、已存在则切到它;**dirty worktree / detached HEAD / 托管 worktree 下不切,只报告限制**。**绝不无授权自动切**。解析顺序:**先解析 flags,再用剩余 positional** 判断数字 / `next` / 自由任务。
- **Sidecar 本地状态**:把 `.codex-task/` 规则**幂等写入**该仓库 exclude 文件——用 `EXCLUDE_FILE="$(git -C <repo> rev-parse --git-path info/exclude)"` 定位(普通 checkout 与 linked worktree 都正确;worktree 的 `.git` 是文件、`<repo>/.git/info/exclude` 不存在,故**不拼字符串**),规则只出现一次,再 `git check-ignore -v <sidecar 文件>` 确认生效。台账是**本地 controller 状态**,不进产品 commit——由此它对下方基线不可见、也不被 `ls-files --others --exclude-standard` / reviewer 的 untracked 采集捞到。
- **台账首跑初始化**:台账不存在时,用「计划定位」的任务头正则解析计划、生成 `progress.md`(所有任务置 `[ ]`),再继续。不假设 `progress.md` 已存在。
- **工作区所有权基线**:派发前记录 `git status --porcelain=v1`。默认要求 tracked/index 干净(sidecar 已 exclude 不计);**目标文件与既有未提交改动重叠 → 停车请用户裁决,绝不自动合并或提交**。
- 读台账,确认目标任务未 `[x]`(已完成则提示、不重复);**遇 `[~]` 先按「`[~]` 崩溃恢复」表恢复,再继续**。
- **判定是否安全关键**(清单见下)或用户加了 `--secure`。
- **并发约束(运行假设,暂不加锁)**:同一仓库同一时刻只跑一个 codex-task/codex-batch controller;companion 的 active-task 拒绝仅限当前会话、**跨会话并发不设防**——有未结束后台任务时,新调用先看 `/codex:status` 再决定。

### 1. 提取任务 brief（无脚本、工具无关）
主线 Claude 读定位到的计划,把该任务整段 **verbatim** 抽进 `task-<N>-brief.md`,并补**跨任务上下文**(前序任务已落地、本任务要用、但 brief 不含的接口签名/常量/依赖)。台账标 `[~]`。文件交接,避免污染主线上下文。

### 2. 派 codex 实现 + 自测
用 Agent 工具、`subagent_type: codex:codex-rescue`、`run_in_background: false`(有界任务;超大/开放任务可 background)。prompt **必含**:
- 一句话任务定位 + brief 文件路径("只读这个 brief,别读整个 plan")
- 工作目录(仓库根)、当前分支(**勿切换**)
- 指向仓库根 `AGENTS.md`(语言/注释/版本约束)
- **跨任务上下文**(见上)
- 硬约束:**write 模式**;实现后**必须自测**——用项目指定构建工具跑本任务相关测试(离线优先),report 按通用收据框贴 `Verification command`/`Exit code`/`Targets`/`Summary`/`Tests run`(工具能给计数才填 N);**禁止 `git add/commit`**;做代码级自审
- **文件范围（放宽)**:默认只改 brief 列出文件,**允许新增/修改直接相关的测试/fixture/类型声明**;其它越界须在 report 单列原因 + 返回 `DONE_WITH_CONCERNS`
- **计划模式**:report 写到 sidecar `task-<N>-report.md`,只回简短状态(`DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`)+ 改动清单 + **完整收据(见铁律通用收据框)** + 一句自审。**自由模式**:无 sidecar,**完整 report(含收据)直接内联回传**
- 注意:codex 子任务可能被客户端超时切断但仍完成了改动——**以工作区实际 `git status`/`git diff` 为准**
- **切勿写"只诊断/只读/不要改代码"**——那会触发只读沙箱,连编译产物都写不了。要明确"这是需要写权限的实现+验证任务"

### 2.5 Codex 终态 → controller 动作(单一真相,codex-batch 引用本表)

| Codex 返回 | controller 动作 |
|---|---|
| `DONE` | 进收据验证(step 3) |
| `DONE_WITH_CONCERNS` | 硬停,呈现发现 + 建议 |
| `NEEDS_CONTEXT` | 硬停,补齐上下文后重新派发 |
| `BLOCKED` | 硬停,报告阻塞条件 |
| 调用失败且**无改动** | 报失败,**不自造替代实现** |
| 超时/失败但**有改动** | 先审计实际 `git diff`,标记 partial,**禁止直接 commit** |

### 3. 收据确认 + commit 前最小机器验证（controller 必做,低 token）
```bash
git diff --check      # 冲突标记 / 坏空白
git status --short     # 改动是否越界
```
+ 确认 report 的 `Targets`**确实存在或可执行**(测试文件/package/suite/check 名,非仅 Java 测试类);测试成本低或 report 可疑(`Targets` 可疑/不相关、`Exit code` 非 0、改动越界、`DONE_WITH_CONCERNS`)→ **复跑**本任务相关测试。非安全关键任务不逐个复跑——省 token。
- **`Tests run: N/A` 例外**:docs / 纯配置 / 删死代码 / 类型声明调整类任务,收据仍用**完整框**、仅 `Tests run` 填 N/A:
  ```
  Verification command: <完整命令>
  Exit code: <整数>
  Targets: <文件/package/suite/check 名>
  Summary: <工具原生摘要>
  Tests run: N/A
  Reason: docs-only / config-only / no applicable test target
  Risk: <低/中/高>
  ```
  **行为变更类任务仍须**新增或运行至少一个相关测试。

### 4. 安全关键任务:跨引擎审(读 `references/task-reviewer.md` 自派 subagent)
- 安全关键 / `--secure` → **读 `references/task-reviewer.md` 模板,自己派 general-purpose subagent 结构化审 codex 写的码**。这是"Claude 审 codex 写的码",引擎分离字面成立(writer=codex ≠ reviewer=Claude subagent)。填充模板时:
  - **改动范围**:默认工作区未提交改动(codex 未 commit);先收集 untracked,把这些路径显式列入 prompt 并要求 subagent `Read`。
  - **任务要求**:本任务 `task-<N>-brief.md` 路径(自由模式用内联任务描述),作 plan-alignment 对照。
  - **自测结果**:codex report 的**完整收据**(`Verification command`/`Exit code`/`Targets`/`Summary`/`Tests run`),reviewer 不重复构建。
  - **审查重点(focus)**:把下方「安全关键判定清单」命中的条目作为 focus 传入,要求逐条对照。
- 非安全关键 → **跳过深审**,只凭第 3 步收据。
- `--lite` → 跳过独立审;安全关键任务不得用 `--lite` 静默跳审,除非用户**二次确认**并记账:计划模式记入台账「风险接受」,**自由模式记入 report + 回执**。

### 5. 裁决与修复
把发现呈现给用户,逐条裁决(现在修 / 归后续任务并记依赖 / 记录)。
- **安全关键任务**的 Critical/Important(裁决为「现修」时):**一律退回 codex writer 修 + 重新自测,controller 不直接改安全关键代码**;修完由 Claude subagent(按 `references/task-reviewer.md`)复审通过才 commit——writer=codex、reviewer=Claude 始终成立,跨引擎不破。理由:Claude 直改安全码后只能再交 Claude 复审(同引擎),失去引擎分离,故安全码写权保持在 codex。
- **非安全关键任务**:controller 小改可直接改,回第 3 步核实即可,无需跨引擎复审。
修完 → 回第 3 步核实。

### 6. 提交与记账
codex 自测通过(安全关键任务另需审查通过)后:
1. `git add <本任务文件>`(**仅限本任务文件,路径限定,绝不 `git add -A`**)。
2. commit 前机器校验:`git diff --cached --name-status`(确认只暂存了本任务文件、无越界)+ `git diff --cached --check`(冲突标记/坏空白)。
3. commit(项目 commit 规范,含 `Co-Authored-By`)。sidecar 已 exclude,**不进本次 commit**、不产生第二个 bookkeeping commit。
4. commit **完成后**再把 commit hash 写入台账、标 `[x]`(附真实测试摘要、审查结论);遗留项/跨任务依赖记入待跟踪区。台账为 exclude 状态,写它不弄脏工作区、无自引用悖论。

## 尾:软交接
一轮跑完**不内联跑重量级审查**,只打一行提示:

> 本轮涉及 N 个安全关键任务。建议收尾另做一次独立的上线闸门审查(安全 / 跨引擎总审),作为独立关切由用户显式发起。

理由:与运行中逐任务的安全关键审重复;上线闸门是独立关切,应由用户在收尾时显式发起。

## 安全关键判定清单
- **原有**:鉴权/认证/授权、限流、凭证/密钥、回调验签、SQL、加解密、支付/资金。
- **新增**:多租户隔离、文件上传/路径遍历、SSRF、XSS/CSRF/CORS、反序列化、PII/隐私数据/日志泄密、幂等性/重放攻击、并发竞态、外部 webhook/第三方回调。

## flags 汇总
| flag | 作用 |
|---|---|
| `--plan <path>` | 显式指定计划文件 |
| `--branch <name>` | 主干时授权创建/切换到该分支(不存在则 `-c` 新建、存在则切);dirty/detached/托管 worktree 只报告不切 |
| `--secure` | 强制按安全关键处理(Claude 审) |
| `--lite` | 轻量,跳独立审;安全关键需二次确认 + 台账记账 |

## 成批推进

**连续推进整个计划**（多任务、遇 checkpoint 停车）见姊妹 skill **codex-batch**——它编排本 Skill 的单任务流程,复用同一 sidecar 台账。

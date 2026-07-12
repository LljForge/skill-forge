---
name: codex-code-review
description: 用户显式说「Codex 审本次变更 / 我刚写的改动」时,拉 Codex 引擎(companion adversarial-review,read-only 沙箱)独立审当前 git 未提交改动——正确性 / 安全 / severity / file:line;并以本次变更的 design/spec 为标尺做完成度对照(收尾质量+安全总评审)。审的是 git diff,须在 git 仓库内。**不自动触发**。审"设计方案/还没写码的思路"改用 codex-design-review。
---

# Codex 审代码改动(codex-code-review)

对当前未提交改动,拉**不同引擎(Codex)**做独立审查,消除单模型确认偏差。本 Skill 只覆盖"你(Claude)写、Codex 审"这**一个方向**;反方向(Codex 写→Claude 审)不在本 Skill 范围。**本 Skill 自包含、零跨调**——不依赖仓库里其它 Skill,只与情境对偶的 `codex-design-review` 共享下方铁律与触发规矩,不互相调用。

**触发**:仅当用户显式说出"Codex 审本次变更 / Codex 审我刚写的改动"这类词根 + 对象时启动。**不自动触发**。用户若说"Codex 审这个设计/这个方案"(审的是还没写码的思路,而非 git 改动),改用 `codex-design-review`,不要在本 Skill 里处理。

## 输入

调用本 Skill 时的可选说明:
- **空**:审**全部未提交改动:staged + unstaged + untracked**(companion `working-tree` scope 即此三类)。
- **说明文字**:附加审查重点,如"重点看认证绕过与并发"。
- **暂存区隔离**:companion 无 staged-only scope,当前只审工作区未提交改动(不做伪隔离);待 companion 支持后再加 `--staged`。
- **可选显式标尺路径**:用户可另给 spec/plan/brief 路径,补作"完成度对照"的验收标尺(见下)。

## 执行流程

### 0. 前置闸(缺一即停,不硬往下跑)

- **git 仓库**:`git -C <repo> rev-parse --is-inside-work-tree` 失败即停,提示「此处非 git 仓库;`adversarial-review` 硬依赖 git,审设计/方案改用 `codex-design-review`」。
- **companion 就位**:`ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs` 为空即停,提示「未检测到 codex 插件 companion,无法跨引擎审」——不静默 `node ""`。

### 1. 收集改动(机械硬步骤)

```bash
git -C <repo> status --short
git -C <repo> diff --cached --stat   # staged
git -C <repo> diff --stat            # unstaged
git -C <repo> ls-files --others --exclude-standard   # untracked
```

- **untracked 非空**:必须把这些路径**显式**列入交给 reviewer 的 prompt,并要求它 `Read`——`git diff` 默认不含新增文件,漏了核心实现/测试就白审。

### 2. 先自证(软前置)

若尚未本机验证,先按项目 `CLAUDE.md`/`AGENTS.md` 的「本机构建/测试须知」跑一遍可跑的测试/编译,把结果作为已知信息交给 reviewer,让它聚焦逻辑与安全、不必重复构建。**跑不了或不适用**(无可跑之物)则跳过,并在 prompt 里明确注明"未验证/不适用"及原因,不假装已验证。

### 3. 派 Codex 审(read-only)

用 Bash 调 codex 插件 companion 的 **`adversarial-review`** 子命令——它跑在 **read-only 沙箱**、且**接受自定义审查指令**(原生 `review` 拒绝自定义重点/staged,故不用它)。用户级/仓库级都拿不到插件私有的根路径变量,故按 globbed 绝对路径定位。

**安全传参(必守)**:focus text 先用 **Write 工具**落临时文件 `$PROMPT_FILE`,bash 只 `cat` 该文件传参——**绝不把 verbatim 仓库内容(CLAUDE.md/spec 含 markdown 反引号、`$()`)直接拼进 shell 命令串**,否则外层 shell 会在 codex 只读沙箱生效前做命令替换/执行(良性 markdown 反引号即触发)。

```bash
CODEX="$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)"
# focus text 已由 Write 落到 $PROMPT_FILE;前台(小改动,同步拿 stdout):
node "$CODEX" adversarial-review --wait --scope working-tree "$(cat -- "$PROMPT_FILE")"
# 大改动改后台:Bash run_in_background:true 调 node "$CODEX" adversarial-review --background --scope working-tree "$(cat -- "$PROMPT_FILE")",再看 /codex:status
```

`$PROMPT_FILE` 的内容(作为尾部 focus text 传入)**必含**:
- 改动文件清单 + **untracked 清单** + 仓库路径;要求 reviewer 在 self-collect(大改动 companion 不内联全 diff)时**逐项自取**:`git diff --cached`(staged)+ `git diff`(unstaged)+ `Read` untracked——**别漏 staged**
- 完成度对照的标尺路径(见下「完成度对照」小节)
- 项目 **Global Constraints**(从 `CLAUDE.md`/spec **verbatim** 提取:确切数值、命名、组件关系)
- 已本机验证的结果(reviewer 不必重复构建)
- 用户附加的审查重点
- reviewer 按 companion 契约输出:`verdict: approve | needs-attention` + 每条 finding `severity: critical/high/medium/low` + `file:line` + 可利用场景。**不要求 reviewer 出结构化 spec 结论**(schema 装不下)。
- **spec 对齐由 controller 侧另判**:controller 持 spec/plan/brief,自行逐条对照给「spec ✅/❌」;无依据时标 `spec: n/a`,不逼 reviewer 给伪精确 pass/fail。
- **绝不 pre-judge**:不得指示 reviewer 忽略/降级某问题

### 完成度对照(一等公民)
本 Skill 同时承担"一次完整开发后的收尾评审":审代码是否兑现本次的设计/规格 + 质量 + 安全。
- **标尺发现(默认自动)**:把本次工作区里**变更过的** `*.md` 设计/spec/plan(在 git 三类改动内的)自动列为验收标尺,要求 reviewer 逐条对照代码兑现度。
- **可选显式**:用户在参数里给了 spec/plan 路径时(即便本次未改动、不在 diff),以该路径为准补作标尺。
- 设计本身的合理性**不在此审**(假定已由 codex-design-review 在写码前审过);此处只把设计当 DoD 尺子。
- spec 对齐口径同第 3 步「spec 对齐由 controller 侧另判」,不复述。

### 4. 呈现裁决

把发现原样呈现给用户(不删减、不改写 severity),附 controller 侧 **spec 对齐结论**(有依据 ✅/❌,无则 n/a),逐条给出裁决建议(修 / 归后续 / 记录),由用户拍板。

## 铁律

- **writer ≠ reviewer 且不同引擎**:审的是 Claude 写的码,reviewer **固定是 Codex**——不只角色分离,是引擎分离。
- reviewer 只审不改;裁决权在 controller(你)。
- 审查不替代本机验证——独立跑测试优先。
- **引擎绑定**:本 Skill 只用 `adversarial-review`(硬依赖 git、审 diff);不得改用 `task`——那是 `codex-design-review` 的引擎,语义是审静态设计而非审 diff。

# Codex 跨引擎审查:拆分为情境对偶双 Skill —— 设计文档

- 日期:2026-07-11
- 状态:设计定稿(待写实施计划)
- 起点:用户级命令 `~/.claude/commands/codex-review.md`

## 背景与问题

现有 `codex-review` 是一个用户级 Claude Code 命令,作用是"Claude 写 → 拉不同引擎 Codex 审"当前未提交改动,消除单模型确认偏差。使用中暴露两处局限:

1. **范围绑死 git**:它只审 `git` 三类未提交改动(staged + unstaged + untracked)。但常有"人在一个普通非 git 目录、想让 Codex 审一份设计/方案"的场景,现有命令覆盖不到。
2. **视角只有一套**:它按代码安全 rubric(`severity` / 可利用场景 / `file:line`)输出,不适配"审设计思路"——审方案要的是假设是否成立、完整性、有无更优解,而非可利用性。

同时,`review` 一词范围太泛,和未来"审设计"的能力并列时会产生"谁管谁"的歧义。

## 核心决策:按"情境"拆,不按"文件类型"拆

真正稳定的切分轴是**审改动 vs 审方案两种情境**,而非文件后缀(代码 vs 文档)。文件类型不是稳定边界(一次改动常代码+文档混装 → 触发歧义),且它根本没解决"非 git 目录审设计"这个输入来源问题。

据此拆成一对**情境对偶**的自包含 Skill:

| | ① codex-code-review(审代码改动) | ② codex-design-review(审设计方案) |
|---|---|---|
| 输入来源 | `git` 三类未提交改动 | 路径(文件/目录)**或** 一段未落文档的 Prompt;git 可选 |
| 评审视角 | 正确性 / 安全 / severity / 可利用性 | 假设 / 完整性 / 一致性 / DoD 可验证性 / 更优解 / 风险 |
| 先自证 | 软前置(有可跑的测试/编译且未验证则先跑) | 不需要(无可跑之物) |
| 典型触发 | "Codex 审本次变更 / 我刚写的改动" | "Codex 审这个设计 / 这个方案" |

命名对偶:`codex-code-review` / `codex-design-review`,均保留 `codex-` 家族前缀(利于触发与辨识),后半截点明审查对象(code vs design),消除 `review` 的范围歧义。

## 共同基座(两者都遵守;各自自包含、零跨调)

沿用仓库现有 Skill(如 recon-driven-dev)"零外部 Skill 依赖、自包含"的风格——两个 Skill 只**共享约定**,不互相调用:

- **引擎分离铁律**:writer 是 Claude,reviewer 固定是 Codex;reviewer 只审不改;裁决权在 controller。
- **安全传参**:审查重点/内容先用 Write 落临时文件,bash 只 `cat` 该文件传参;绝不把仓库内容(含 markdown 反引号、`$()`)直接拼进 shell 命令串,否则外层 shell 会在只读沙箱生效前做命令替换/执行。
- **read-only 沙箱**:都调 codex companion、都跑 read-only 沙箱、都绝不 pre-judge(不得指示 reviewer 忽略/降级某问题)。但**两者用不同子命令**(见下,是探查 companion v1.0.5 源码后的定论):
  - `codex-code-review` → `adversarial-review`(审 git diff;硬依赖 git 仓库;内置对抗式 prompt 模板 + severity/`file:line` 输出契约)。
  - `codex-design-review` → `task`(read-only)(通用 Codex 提问器;**不依赖 git**;无内置代码契约,rubric 由本 Skill 自带 prompt 定义)。
- **显式触发**:两者均**不自动触发**,必须用户显式说出"**Codex 审**"这个词根 + 对象("Codex 审这个设计/这个方案/本次变更")才启动。关键锚点是 "Codex 审",不是泛泛的 "review/审一下"。与 recon-driven-dev "由用户显式调用、不自动触发" 同一套规矩。

## 组件一:codex-code-review(审代码改动)

现有 `codex-review.md` 命令的升级 + 改名 + 打包成仓库 Skill,行为基本继承,并吸收"收尾完成度评审(U3)"。

- **触发**:用户说 "Codex 审本次变更 / 我刚写的改动"。
- **输入来源**:`git` 三类未提交改动(staged + unstaged + untracked)。untracked 非空时必须把路径显式列入 reviewer prompt 并要求其 `Read`(`git diff` 默认不含新增文件)。
- **软前置(自证,保留)**:若有可跑的测试/编译且尚未本机验证,先按项目 `CLAUDE.md`/`AGENTS.md` 跑一遍,把结果作为已知信息交给 reviewer(让它聚焦逻辑与安全、不必重复构建);跑不了或不适用则跳过并注明。这是 trust-nobody / 验证先于完成的体现,且只在"有东西可跑"时成立——这正是组件二不要此步的原因。
- **评审视角**:正确性 / 安全 / `severity`(critical/high/medium/low)/ 可利用场景 / `file:line`。
- **完成度对照(升为一等公民,吸收 U3 收尾评审)**:
  - **U3 场景**:一次完整开发后,把本次变更的设计 + 代码合起来,做一次完成度 / 质量 / 安全总评审。判定为"设计当验收标尺、本身不再被审"(设计的合理性假定已由组件二在写码前审过),故 U3 被本组件吸收,不另设第三个 Skill。
  - **标尺发现**:默认自动把工作区里**变更过的** design/spec/plan 当验收标尺,审代码兑现度(完成度 / DoD 对照);同时支持**可选显式喂路径**,覆盖"管着本次开发的设计/spec 是早已定稿、本次未改动、不在 diff 里"的情况。
- **spec 对齐由 controller 侧另判**:controller 持 spec/plan/brief 自行逐条对照给"spec ✅/❌";无依据时标 `spec: n/a`,不逼 reviewer 给伪精确 pass/fail。

## 组件二:codex-design-review(审设计方案)—— 新建

- **触发**:用户说 "Codex 审这个设计 / 这个方案"。
- **引擎**:codex companion `task` 子命令,read-only 沙箱(不 `--write`)。**不用 `adversarial-review`**——后者硬依赖 git、且是"审 diff/改动"语义,不匹配"审一份完整设计"。`task` 不依赖 git,故非 git 目录与 inline 方案都能跑。
- **输入来源(两类)**:
  - (a) **路径**(文件或目录):Claude 用 Read 读目标文件(目录则枚举其中的设计文档),把内容写进喂给 `task` 的 prompt。由 Claude 侧读文件,不依赖沙箱去取——彻底绕开非 git 目录的取文件问题。
  - (b) **一段还没落文档的 Prompt / 想法**:直接在对话里描述的方案,Claude 把方案文本写进 prompt。
- **范围收口(A)**:对象限"设计意图类"内容——design / spec / plan / brief / RFC。不滑向"审任意内容",以守住聚焦。
- **无自证**:没有可编译/可跑之物,不做本机验证。
- **评审视角(由本 Skill 自带 prompt 定义,非 companion 内置契约)**:假设是否成立 / 完整性(有没有漏的场景与边界)/ 内部一致性(章节间不矛盾)/ DoD 可验证性 / 有无更优解 / 风险与未决点。
- **自带输出格式**:因不再套 `adversarial-review` 的代码契约,由本 Skill 的 prompt 直接规定设计语义输出:每条发现 `严重度`(阻断 / 重要 / 建议)+ `定位`(文件:章节 / 段落)+ `问题`(这缺口会让方案在什么情况下崩)+ `建议`;末尾给 `verdict`(可发布 / 需修正)。

## 呈现裁决(两者共通)

把 reviewer 的发现原样呈现给用户,附 controller 侧对齐结论(有依据 ✅/❌,无则 n/a),逐条给出裁决建议(修 / 归后续 / 记录),由用户拍板。审查不替代本机验证——独立跑测试优先(对组件一)。

## 落地与孵化

- 两个 Skill 都在 `incubating/` 起步,成熟后毕业到 `skills/`,期间过一遍 skill-tempering 打磨。
- 旧的 `~/.claude/commands/codex-review.md` 命令**暂留**,等新 Skill 毕业后再退役(记为后续项)。

## companion 源码探查结论(v1.0.5,规划期已落实)

拆 `codex-companion.mjs` v1.0.5 的定论,已并入上面两组件的引擎选型:

- `adversarial-review`:`executeReview` 第 360 行 `ensureGitRepository()` **硬依赖 git**;scope 仅 `auto|working-tree|branch`,本质审 git diff;prompt 为内置对抗式模板,输出契约强制 `file` + `line_start/line_end` + `confidence`。→ 适配 `codex-code-review`。
- `task`:`executeTaskRun` **无 git 依赖**;`--write` 缺省时 `sandbox: "read-only"`;prompt 完全由调用方给。→ 适配 `codex-design-review`,消掉 git 依赖与"取文件/契约重映射"两个原待验证点。

实施期仍需在真实环境各跑一次冒烟(见实施计划 Task 1),确认参数与输出符合上述判断。

## 明确不做(YAGNI)

- **不建第三个编排器 Skill**:U3 收尾评审已被组件一吸收(设计作标尺、本身不再审),无需一个 `codex-review` 去组合调用另两个 Skill,从而避免在产线引入"skill 调 skill 的组合依赖"这一新范式。若日后"手动跑两个"确实高频且痛,再评估升级。
- **不按文件类型(代码 vs 文档)拆**:见"核心决策"。

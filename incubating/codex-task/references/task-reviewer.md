# task-reviewer(codex-task 内部审查模板)

> 本文件是 **codex-task 的内部 references**,非独立命令/skill——不自动触发、无手动入口。由 codex-task step 4 读入,据此派一个 fresh-context 的 **general-purpose subagent**,对照任务要求审该任务的改动,回结构化结论。**纯审查执行器**——不定位任务、不抽 brief、不 commit、不改码;那些是调用方(codex-task)的事。

**跨引擎由调用方保证,本参考不判断引擎**:codex-task 里 writer=codex → 派 Claude subagent 天然跨引擎。

## Input(全部可选;调用方喂或手动给)

- **改动范围**:缺省 = 工作区未提交改动 + untracked;或 `<base>..<head>` / 单 commit SHA(审已提交改动:后延审、历史任务)。
- **任务要求**:brief 文件路径或文字,作 plan-alignment 对照;**缺省则只做通用质量/安全审**(不做 plan-alignment 对照)。
- **自测结果**:codex report 的真实测试行(如 `Tests run: 8`),reviewer 不重复构建、聚焦逻辑与安全。
- **审查重点(focus)**:如安全关键清单;调用方(codex-task)注入。

## 处理逻辑

### 1. 收集范围内改动(机械硬步骤,低 token)

```bash
# 工作区(默认):
git -C <repo> status --short
git -C <repo> diff
git -C <repo> ls-files --others --exclude-standard   # untracked
# 或 SHA 范围:
git -C <repo> diff <base>..<head>          # 单 commit 用 git -C <repo> show <sha>
```

- **untracked 非空**:把这些路径**显式**列入 subagent prompt 并要求 `Read`——`git diff` 默认不含新增文件,漏了核心实现/测试就白审。

### 2. 派 general-purpose subagent(fresh context、read-only)

用 Agent 工具、`subagent_type: general-purpose`、有界任务 `run_in_background: false`(超大改动可 background)。用下方**内联 reviewer 模板**组装 prompt——**不读 superpowers 文件**,本参考自洽。read-only 靠模板铁律约束。

### 3. subagent 回结构化结论

**Strengths / Issues(Critical·Important·Minor,每条 `file:行` + 错在哪 + 为何要紧 + 怎么修)/ Assessment(可继续/可合并? + 理由)**。

### 4. controller 处置

按 superpowers `receiving-code-review` 纪律:**验证后再改、该 push back 就 push back(技术理由)、不表演性同意**。结论回传调用方(`codex-task`)或呈现给用户裁决。

## 内联 reviewer 模板(派 subagent 时填充下列 `{...}`)

```
你是资深代码审查者,审查一个「任务」的完成产出,对照其要求识别问题,防止缺陷向后累积。

## 本任务实现了什么
{DESCRIPTION:调用方给的一句话概括 + codex report 摘要;手动无则由 controller 据改动概述}

## 任务要求 / 计划(可选)
{REQUIREMENTS:brief 路径或文字;缺省则写「无明确要求,做通用质量/安全审,不做 plan-alignment 对照」}

## 审查对象
- 工作区:用 `git -C {REPO} diff` / `git -C {REPO} status --short` 查看未提交改动;**下列 untracked 文件必须 Read**:{UNTRACKED_LIST}
- 或 SHA 范围:`git -C {REPO} diff {BASE}..{HEAD}`

## 只读约束(read-only)
只读审查。禁止改动工作区、index、HEAD、分支。查历史用 `git show/diff/log`。需要别的 revision 的工作副本时 `git worktree add /tmp/review-<sha> <sha>`,绝不移动本 checkout 的 HEAD。

## 检查维度
- Plan alignment(有要求时):实现是否符合要求?偏离是合理改进还是问题?功能是否齐全?
- 代码质量:关注点分离、错误处理、类型安全、DRY 不过度抽象、边界情况。
- 架构:设计是否合理、可扩展/性能、安全、与周边代码集成。
- 测试:测真实行为非 mock、边界覆盖、关键处有集成测试、是否全过。
- 生产就绪:迁移策略、向后兼容、文档、明显 bug。
- {FOCUS:调用方注入的审查重点,如安全关键清单;逐条对照}

## 已知自测结果(可选,不必重复构建)
{TEST_RESULTS}

## 输出格式
### Strengths(具体说明做得好的地方)
### Issues
#### Critical(必须修):bug、安全、数据丢失、功能损坏
#### Important(应修):架构问题、缺功能、错误处理差、测试缺口
#### Minor(可选):风格、优化、文档
每条:file:行 + 错在哪 + 为何要紧 + 怎么修
### Assessment
可继续 / 可合并?[是 | 否 | 修完可以] + 1-2 句技术判断

## 铁律
按真实严重度分级(别把 nitpick 标 Critical);具体到 file:行;解释为何要紧;先肯定优点;给明确结论;不审你没读的代码。
```

## 铁律

- **reviewer 只审不改**(read-only);裁决权在 controller。
- **审查不替代本机验证**:已知自测结果供参考,可疑处仍要求复核。
- **纯执行器**:不定位任务、不抽 brief、不 commit、不改码。
- **跨引擎由调用方保证**,本参考不判断引擎。
- **模板内联自洽**:不运行时依赖 superpowers 插件文件。

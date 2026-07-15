# 评审报告 — markdown-toc-cli

> 综合评审 requirements.md + design.md，由 ③ 评审 sub-agent 产出。
> 判据与结论档位见 `../review-agent.md`，本表只填结论与发现。

## 总体结论
**有条件通过**

## 一、完整性
- 结论：⚠️
- 发现（无则写"无"；每条按形态：`[阻断/须改/可改] @<哪份文档/哪节> — <问题> → <建议>`）：
  - [须改] @design.md/测试缝隙与 verification-mode（缝隙 1、2） — 验证计划虽覆盖普通 ATX、围栏矩阵和非法扩展名，但没有明确验证 requirements.md 的“Setext/HTML 标题不提取”和“.md 扩展名大小写不敏感”的正向行为；“覆盖 ATX/非 `.md`”不能证明这两个相反边界，逐条验收仍有空口。 → 在 `test_core` 明列 Setext、HTML 标题的反例，在安装后 CLI 测试明列 `.MD` 成功用例；同时用一个含普通正文但无标题的非空文件验证成功且 stdout 为空。

## 二、一致性
- 结论：⚠️
- 发现（同上形态，无则"无"）：
  - [须改] @requirements.md/3. 业务规则（slug） ↔ design.md/解析与渲染规则（slug） — requirements 规定“转小写 → 分类过滤 → 连续空白折叠”，design 在过滤后额外执行 `.strip()`，会产生可观察差异；例如标题 `! A !` 过滤后为两端带空白，requirements 推得 `-a-`，design 推得 `a`。当前实现与验收没有唯一真值。 → 默认按已批准 requirements 删除 design 的过滤后 `.strip()`；若确需 `a`，则先回改 requirements，并补一条边缘标点暴露空白的精确向量及自动化测试。
  - [可改] @directed-report.md/C9 · 本次工作根与阶段状态载体 — 定点核验发现“当前 phase 为①”已被现状推翻：`run-state.md:6` 现为 `phase: ③`。这是流程推进造成的陈旧事实，不影响方案本身，但 ① 的当前态表述已不真。 → 由主会话订正 directed-report 的阶段事实或改写为“报告产出时 phase 为①”，不要由本评审直接改 ①。

## 三、可实施性
- 结论：✅
- 发现（同上形态，无则"无"）：
  - 无。模块边界、接口、围栏状态机、全局 slug 冲突处理、CLI 错误收敛、打包入口、自动化/人工验证顺序和时限均足以落地；上方契约冲突统一后即可实施。

## 四、定向报告验收（单向对照 ①）
| ① 的发现（坑 / 协同护栏 / 契约+消费方） | 接住没 | 证据 / 缺口 |
|---|---|---|
| C1 项目/工具外壳：空基线，无既定语言、包管理器、测试或 runner 约定 | 是 | ADR 1 明示选择 Python 的现场依据与被否方案；文件结构、爆炸半径和 verification-profile 均按新建项目落地，没有冒充继承既有工程约定。 |
| C2 Markdown 文本与 ATX 标题识别，消费者为 CLI | 是 | 数据流明确 `CLI → parse_headings`；`core.py`/`test_core.py` 承载识别契约。 |
| C3 Heading 的文字、层级、slug 被 CLI、README 和人工跳转验收消费 | 是 | `Heading` 精确接口、`render_toc`、README 完整示例契约和 anchor-check/manual-evidence 均接住；标签转义也明确不污染原文 slug。 |
| C4 围栏排除、跳级、重复 slug 边界 | 是 | 解析规则、全局已用集合、围栏测试矩阵、README 检查与真实预览样例均覆盖。 |
| C5 `toc <file.md>`、stdout/stderr、退出码契约及命令行用户/Markdown 消费方 | 是 | `cli.py`、console entry point、安装后 subprocess 测试和 README 实跑证据覆盖正常/错误通道；大小写扩展名的验证缺口已列为须改。 |
| C6 README 服务安装、照抄示例和边界说明的使用者 | 是 | 任务 3 明列在新临时 venv 中逐字执行安装/示例、逐行比对 stdout，并核对全部边界说明。 |
| C7 GitHub/VSCode 真实渲染器点击验收；slug 兼容性仍未核验 | 是 | ADR 2 显式选定 VSCode 兼容范围；六向量及重复/跳级/转义逐链接点击、环境版本、实际命中与截图路径均预批，残留未核验项绑定任务 3 闭合。 |
| C8 后续任务拆分与 `automated-tdd + manual-evidence` | 是 | 三个测试缝隙逐项声明 mode，verification-profile 给出范围、命令、预期和时限。 |
| C9 WORK_ROOT、阶段载体与 worktree 边界 | 是 | 锚定层限定所有实现只在 `/private/tmp/recon-markdown-toc-cli`；风险护栏固定 BASE 和终态快照。阶段号陈旧事实已单列供主会话订正。 |
| C10 无关 sentinel 不得被任务消费或修改 | 是 | 锚定层与风险护栏明确禁止 task-agent 修改、stage、commit，并要求终态证据覆盖 sentinel。 |
| ① 的横切坑：无现成调用链、人工 runner 只缺在真实渲染步骤、阶段文档/sentinel 不是产品实现 | 是 | 设计把解析与 CLI 交给自动化 TDD，仅把真实点击交给 manual-evidence；爆炸半径只列新建产品/测试/文档载体，并把阶段产物和 sentinel 隔离。 |

- 召回地板：是　C2–C7 的调用方/消费方均映射到实现、测试、README 或真实渲染证据；C8–C10 的流程与隔离护栏也有闭合点。
- ① 事实被推翻：directed-report.md C9 的“当前 phase 为①”已不成立；当前真相为 `phase: ③`，证据 `docs/recon-driven-dev/2026-07-15-markdown-toc-cli/run-state.md:6`。其余本次判档未依赖无法核实的 `[未核验]` 主张；真实锚点兼容性按设计保留到 manual-evidence。

## 修订事项清单
1. [须改] 统一 slug 的机械顺序：按 requirements 删除 design 中过滤后的 `.strip()`；若选择保留，则经确认回改 requirements，并新增精确向量与测试。（改 design；备选为回改 requirements）
2. [须改] 在测试设计中明确加入 Setext/HTML 不提取、`.MD` 成功、非空无标题文件成功且 stdout 为空的用例。（改 design）
3. [可改] 主会话把 directed-report C9 的阶段表述订正为报告时点事实，或更新为当前 phase ③。（订正 directed-report，不由本评审修改）

# 评审报告 — markdown-toc-cli

> 综合评审 requirements.md + design.md，由 ③ 评审 sub-agent 产出。
> 判据与结论档位见 `../review-agent.md`，本表只填结论与发现。

## 总体结论
**有条件通过**

设计主体完整且可落地，需求、接口、算法、CLI 契约、测试分层和定向报告中的主要护栏彼此自洽；仍有两项验收闭环须补齐，均不动摇方案。

## 一、完整性
- 结论：⚠️
- 发现：
  - [须改] @design.md/“测试缝隙与 verification-mode”缝隙 3、manual-evidence 事先批准契约（对照 requirements.md/第 4 节 slug 向量与 VSCode 验收） — `examples/anchor-check.md` 只按“普通标题、中文、标点”等类别描述样例，没有明确纳入六个已批准的精确 slug 向量；自动化测试只能证明本地算法符合自定预期，不能替代真实 VSCode Preview 对 `C++ & Rust`、`A - B_C`、`Go 🚀 Now`、分解形式 `Café` 等风险字符的锚点兼容性验证，因此 ① C7 的残留未核验项尚未被完整接住。 → 把六个精确向量全部列为 anchor-check 的标题与预期链接，逐条点击并在 `manual-evidence.md` 记录实际命中标题及截图路径。

## 二、一致性
- 结论：✅
- 发现：
  - 无。requirements 与 design 对 Python 3.9+、零第三方运行时依赖、ATX/围栏/跳级、slug、CLI I/O、错误及 VSCode 兼容范围一致；从 ① 的“GitHub 风格”收窄为批准的 VSCode Preview 兼容档也已显式说明依据与非目标，不属于静默冲突。

## 三、可实施性
- 结论：⚠️
- 发现：
  - [须改] @design.md/“verification-profile”（对照 requirements.md/第 4 节 README 验收项） — 设计规定了 README 的产物内容，但 verification-profile 没有说明如何验收“安装步骤、可照抄的完整输入/命令/期望输出示例、边界说明”；仅列文件职责不能证明该验收标准已满足。 → 增加 README 契约检查：明确检查清单、执行其安装与示例命令并比对期望 stdout，同时核对围栏排除、跳级、重复 slug 等边界说明，并记录结果。

## 四、定向报告验收（单向对照 ①）
| ① 的发现（坑 / 协同护栏 / 契约+消费方） | 接住没 | 证据 / 缺口 |
|---|---|---|
| C1 项目/工具外壳：空基线、语言与生态未定 | 是 | design 明确将 Python 3.9+ 标准库包作为新决策，并给出包结构、安装形态和实测依据，没有伪装成既有仓库约定。 |
| C2 Markdown 输入与 ATX 标题识别，CLI 消费解析器 | 是 | 数据流、`parse_headings` 接口和标题语法均已定义。 |
| C3 Heading 文字/层级/slug，由 CLI、README、人工验收消费 | 是 | `Heading`、`render_toc`、README、anchor-check 与 manual evidence 均有落点。 |
| C4 围栏排除、跳级、重复 slug 边界 | 是 | 解析规则、全局去重算法及核心测试矩阵完整接住。 |
| C5 `toc <file.md>`、stdout/stderr/退出码 | 是 | CLI 边界、打包入口和 subprocess 端到端测试已明确。 |
| C6 README 安装、完整示例和边界说明 | 部分 | 产物内容已规划，但 verification-profile 缺少对应验收步骤，见可实施性发现。 |
| C7 真实渲染器逐条跳转及证据 | 部分 | VSCode 步骤、环境元数据和证据格式已定义，但未明确让全部批准 slug 向量进入真实预览样例，见完整性发现。 |
| C8 automated-tdd + manual-evidence 的任务验证模式 | 是 | 两个自动化缝隙和一个真实渲染器人工缝隙均已声明 mode，并给出 verification-profile。 |
| C9 WORK_ROOT 与阶段状态边界 | 是 | design 将实施根固定为 `/private/tmp/recon-markdown-toc-cli`。 |
| C10 无关 sentinel 不得被任务消费或修改 | 是 | 风险护栏明确禁止修改、stage 或 commit，并要求终态证据覆盖。 |
| 坑：空基线没有可继承生态约定 | 是 | 方案以 ADR 形式新选 Python，并列明空基线无 linter/formatter/type checker。 |
| 坑：“本地无 runner”只针对真实预览点击 | 是 | 解析与 CLI 走 automated-tdd，仅点击行为走 manual-evidence。 |
| 坑：slug 与真实渲染器兼容性未由静态基线封死 | 部分 | 保留残留未核验项并绑定任务 3；但样例覆盖仍须按上方发现补全。 |
| 坑：WORK_ROOT 不是 SOURCE_ROOT | 是 | 路径边界已显式固定。 |
| 坑：阶段文档与 sentinel 不是任务实现 | 是 | 爆炸半径和禁止改动护栏已区分产品产物、阶段产物和无关文件。 |
| 坑：当前只有规格消费关系、没有既有调用链 | 是 | design 使用“计划文件结构/新建”表述，并明确爆炸半径为新增文件、无既有业务消费者。 |

- 召回地板：是。C1–C10、对应消费方及六项坑均已逐项对照；C6、C7 的部分接住已形成须改项。
- ① 事实被推翻：无。

## 修订事项清单
1. [须改] 将 requirements 的六个精确 slug 向量全部纳入 `examples/anchor-check.md` 与 VSCode 逐条点击证据，完整闭合 C7 残留未核验项（改 design）。
2. [须改] 在 verification-profile 中加入 README 契约检查，明确检查清单、可照抄命令的实际执行/输出比对及边界说明核验（改 design）。

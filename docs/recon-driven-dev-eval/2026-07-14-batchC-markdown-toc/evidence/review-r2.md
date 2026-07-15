# 评审报告 — markdown-toc-cli

> 综合评审 requirements.md + design.md，由 ③ 评审 sub-agent 产出。
> 判据与结论档位见 `../review-agent.md`，本表只填结论与发现。

## 总体结论
**有条件通过**

## 一、完整性
- 结论：⚠️
- 发现（无则写“无”；每条按形态：`[阻断/须改/可改] @<哪份文档/哪节> — <问题> → <建议>`）：
  - [须改] @requirements.md/“业务规则、验收标准”；design.md/“解析与渲染规则” — slug 契约仍以“常见标点”“保留 Unicode”描述，未封闭字符集合及处理顺序；ASCII 标点、Unicode `P*` 类、符号、组合字符、既有连字符/下划线等可被多种互不等价的实现同时解释为合规，现有“中文/标点/空白”验收也不足以裁决 → 回改 requirements：定义可执行的字符分类与规范化顺序，并给出覆盖中英文标点、符号、连续空白、既有 `-`/`_` 的输入→slug 表；design 与核心测试逐项绑定这些向量。

## 二、一致性
- 结论：⚠️
- 发现（同上形态，无则“无”）：
  - [须改] @design.md/“解析与渲染规则” — `render_toc` 直接输出 `- [text](#slug)`，但 requirements 未限制 ATX 标题文字不能含 Markdown 链接标签元字符；例如标题文字含未转义的 `]` 时，设计会生成不再是有效链接的列表项，与 C3/C5 的“标题文字被渲染为可点击 `[标题](#slug)`”契约不一致 → design 明确链接标签转义规则（至少处理反斜杠与方括号）并增加核心、CLI 和 manual sample 覆盖；若选择不支持此类标题，则回改 requirements 明示支持边界。

## 三、可实施性
- 结论：⚠️
- 发现（同上形态，无则“无”）：
  - [须改] @design.md/“解析与渲染规则、测试缝隙与 verification-mode” — 围栏规则只写“三个或更多反引号开启、足够长的反引号关闭”，未规定开闭围栏必须匹配整行的哪些部分（允许的前导空格、开启行 info string、关闭行允许的尾随空白/禁止的其他文本、行中反引号是否算围栏）；实现者可能把行内三反引号或带尾随文本的伪关闭行误判，单一“围栏”测试也无法裁决 → design 给出开闭行的精确匹配条件，并在 `test_core.py` 验收中列入行内反引号、info string、不同长度、伪关闭行和未闭合围栏。

## 四、定向报告验收（单向对照 ①）
| ① 的发现（坑 / 协同护栏 / 契约+消费方） | 接住没 | 证据 / 缺口 |
|---|---|---|
| C1 项目/工具外壳为空基线，无既定语言、包管理器或 runner | 是 | ADR 1 明确把 Python、unittest、setuptools 作为本次选择及 WORK_ROOT 补探事实，而非冒充既有约定。 |
| C2 Markdown 文本输入与 ATX 标题识别，规格内由 CLI 消费 | 是 | `parse_headings(markdown)`、CLI 数据流、ATX 识别规则和核心测试缝隙均已落位。 |
| C3 Heading 的文字、层级、slug 被 CLI、README 与人工验收消费 | 部分 | Heading/API、渲染与三类消费者均已映射；但链接标签未定义转义，部分合法标题文字不能稳定形成可点击输出，见一致性发现。 |
| C4 围栏排除、跳级、重复 slug 边界 | 部分 | 跳级和全局 slug 碰撞方案具体；围栏开闭行语法仍不足以唯一实施，见可实施性发现。 |
| C5 `toc <file.md>`、stdout/stderr、退出码契约 | 部分 | CLI 边界、错误矩阵和安装后 subprocess 缝隙已覆盖；正常输出对含链接标签元字符的标题仍可能违反可点击 Markdown 列表契约。 |
| C6 README 安装、完整示例与边界说明 | 是 | 文件职责及 C6 映射明确，验收标准也要求可照抄的输入/命令/期望输出。 |
| C7 GitHub/VSCode 真实渲染器逐条点击与 manual-evidence | 是 | 已选 VSCode Preview，预批步骤、预期、版本/来源、逐条结果和截图路径；兼容性仍按 ① 的未核验项留待实施闭合。 |
| C8 逐任务 verification-mode 与 automated/manual 双模式 | 是 | 3 个测试缝隙逐项声明 2 个 automated-tdd + 1 个 manual-evidence，并给出 verification-profile。 |
| C9 WORK_ROOT、阶段状态与工作树边界 | 是 | C9 映射和风险护栏明确限定在 `/private/tmp/recon-markdown-toc-cli` 实施。 |
| C10 无关 untracked sentinel 不属于任务 | 是 | C10 映射明确禁止修改、stage 或 commit，并要求终态证据覆盖。 |
| 坑：空基线没有可继承的生态约定 | 是 | 设计将工具链信息标为自行补探，并为 Python 方案给出本次决策依据。 |
| 坑：“本地没有 runner”只针对真实渲染器点击，不应扩成全部人工验 | 是 | 核心与 CLI 走 automated-tdd，仅真实点击走 manual-evidence。 |
| 坑：GitHub 风格 slug 的真实渲染兼容性未被静态基线封死 | 是 | ADR 2 缩小为 VSCode 固定样例兼容范围，未核验项核销表仍保留 1 项并绑定任务 3。 |
| 坑：WORK_ROOT 不是 SOURCE_ROOT | 是 | C9 和风险护栏使用 WORK_ROOT，未把源工作树当实现落点。 |
| 坑：阶段文档与 sentinel 不是产品实现 | 是 | 爆炸半径区分工程产物、evidence 与无关 sentinel，并设置修改边界。 |
| 坑：当前只有规格内消费关系，没有已落成调用链 | 是 | 设计统一采用“计划文件结构/将由……接住”的未来态，并注明无既有业务代码消费者。 |

- 召回地板：是　已逐项对照 C1–C10、六条坑/护栏及其 CLI、README、真实渲染器、流程状态消费者；C3–C5 的幸存发现按可溯源豁免保留。
- ① 事实被推翻：无。

## 修订事项清单
1. [须改] 精确定义 slug 的字符分类、规范化顺序和裁决向量，同步 requirements、design 与核心测试（回改 requirements）。
2. [须改] 定义 TOC 链接标签转义或明确不支持的标题文字边界，并补核心/CLI/manual 覆盖（改 design；若收窄范围则回改 requirements）。
3. [须改] 封闭 backtick 围栏开闭行语法并扩充边界测试矩阵（改 design）。

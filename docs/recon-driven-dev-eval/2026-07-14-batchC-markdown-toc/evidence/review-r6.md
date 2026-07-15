# 评审报告 — markdown-toc-cli

> 综合评审 requirements.md + design.md，由 ③ 评审 sub-agent 产出。
> 判据与结论档位见 `../review-agent.md`，本表只填结论与发现。

## 总体结论

**不通过**

## 一、完整性

- 结论：⚠️
- 发现：
  - [须改] @design.md「manual-evidence 事先批准契约」第 5 条 /「verification-profile」README contract — requirements.md 明确要求 README 说明“基础 slug 为空的标题会被 TOC 省略”，但设计的 README 检查清单只核围栏、跳级、重复 slug、字符兼容范围和错误行为；样例含空标题不能保证 README 真的写出该限制 → 将“空基础 slug 的省略规则及原因”加入 README 必写项、manual-evidence 检查清单和通过护栏。

## 二、一致性

- 结论：❌
- 发现：
  - [阻断] @requirements.md「主流程 / 业务规则 / 验收标准」与 design.md「解析与渲染规则 / ADR 3 / manual-evidence」— 文档同时要求“按原始 heading level，每级固定增加两个前导空格”和“产出可粘贴、可点击的 Markdown 链接目录”。当首个标题为 H3 时，固定公式会输出 4 个前导空格，预览器会把该行当作缩进代码块而非列表/链接；更深跳级也有同类问题。现有 manual sample 只说包含“跳级”，未钉住首个 H3 等反例，可能用安全样例绕过矛盾。两条要求无法对所有允许的跳级输入同时成立，且 ADR 3“避免解释成代码块”的依据不能覆盖 `(level - 1) * 2` 的实际结果 → 回改 requirements，明确可渲染的层级映射（例如按实际标题栈压缩跳级，或明确其他兼容策略），同步修改设计公式与 ADR，并新增“首个/唯一 H3”和“H1 后直接 H4”的自动输出及 VSCode 点击向量。

## 三、可实施性

- 结论：⚠️
- 发现：
  - [须改] @design.md「计划文件结构」与「verification-profile」scoped core / full tests — 方案采用 `src/mdtoc` 布局，但 `python3 -m unittest tests.test_core -v` 和 `python3 -m unittest discover -s tests -v` 既未安装包，也未把 `src` 放入导入路径；干净工作树中 `tests/__init__.py` 只能稳定测试模块名，不能让 `import mdtoc` 成功。与此同时，设计要求安装只发生在临时 venv，不能依赖宿主环境残留的 editable install → 明确测试环境与顺序：优先在同一干净 venv 中先 `pip install --no-deps -e .` 再跑 scoped/full tests，或把纯核心命令显式改为 `PYTHONPATH=src ...`；所有 profile 命令应可独立复现。

## 四、定向报告验收（单向对照 ①）

- 结论：⚠️

| ① 的发现（坑 / 协同护栏 / 契约+消费方） | 接住没 | 证据 / 缺口 |
|---|---|---|
| C1 · 空基线上的自包含工具外壳 | 是 | 已把 Python 作为本次 ADR 选择，并定义包、入口、安装依赖；未冒充既有生态约定。 |
| C2 · Markdown 输入与 ATX 标题识别 | 是 | `parse_headings(markdown)`、1–6 级 ATX 及识别细则已落到 core 与测试缝隙。 |
| C3 · Heading 输出及 CLI/README/渲染消费 | 部分 | Heading 三字段、render、CLI、README 与 manual 消费链均有映射，但固定绝对缩进会使部分允许输入不再形成可点击列表。 |
| C4 · 围栏、跳级、重复 slug | 部分 | 围栏矩阵和全局去重已充分接住；跳级保留虽有实现公式，但与可渲染链接消费契约冲突。 |
| C5 · `toc <file.md>`、stdout/stderr/退出码 | 是 | CLI 边界与安装后 subprocess E2E 覆盖成功、扩展名、读取和 UTF-8 错误。 |
| C6 · README 安装、完整示例及原始三项边界 | 是 | README 职责与手工契约覆盖安装/示例、围栏、跳级、重复 slug；新增的空 slug 文档要求另见完整性发现。 |
| C7 · 真实渲染器逐链接人工验收 | 部分 | VSCode 环境、逐链接结果和截图格式已定义；跳级向量未钉住会触发代码块解释的输入。 |
| C8 · 逐任务 verification-mode | 是 | 2 个 automated-tdd 缝隙和 1 个 manual-evidence 缝隙均有 profile 与护栏。 |
| C9 · WORK_ROOT 与阶段状态 | 是 | 明确所有实现只在 `/private/tmp/recon-markdown-toc-cli`，并固定收尾 BASE。 |
| C10 · 无关 sentinel | 是 | 明确禁止修改/stage/commit，并要求终态证据覆盖。 |
| 坑：空基线没有可继承生态约定 | 是 | Python、unittest、setuptools 被写成新决策/补探事实，而非既有项目约定。 |
| 坑：“本地无 runner”仅指真实点击 | 是 | 解析和 CLI 走 automated-tdd，点击行为单独走 manual-evidence。 |
| 坑：GitHub 风格 slug 的运行时兼容性未封死 | 是 | ADR 选择 VSCode 固定样例，未核验项保留到任务 3，且明确不外推跨渲染器保证。 |
| 坑：WORK_ROOT 不是 SOURCE_ROOT | 是 | 设计明确限定 WORK_ROOT，未混用源工作树。 |
| 坑：阶段文档与 sentinel 不是任务实现 | 是 | 爆炸半径和护栏将阶段产物、sentinel 与产品文件分开。 |
| 坑：只有规格消费关系，没有既有调用链 | 是 | 文件结构、数据流和测试均以计划/待新建表述，没有声称存在既有实现消费者。 |

- 召回地板：是。CLI、README、真实渲染器、流程状态与 sentinel 消费关系均已追到；C3/C4/C7 的“部分”是承接后的契约冲突，不是漏掉消费方。
- ① 事实被推翻：无。

## 修订事项清单

1. [阻断] 回改 requirements 的绝对层级缩进契约，选定对首个高等级标题和深跳级仍能生成真实 Markdown 链接列表的规则；同步 design 的公式/ADR，并增加“唯一 H3”“H1→H4”自动与 VSCode 验收向量。（回改 requirements，并改 design）
2. [须改] 为 `src` 布局补齐可复现的测试导入环境，统一 scoped/full 命令所用 venv、editable install 或显式 `PYTHONPATH=src`。（改 design）
3. [须改] 将“空基础 slug 标题必须省略且 README 必须明示”加入 README 手工检查、verification-profile 和任务通过护栏。（改 design）

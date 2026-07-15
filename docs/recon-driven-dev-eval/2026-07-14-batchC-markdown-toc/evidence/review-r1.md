# 评审报告 — markdown-toc-cli

> 综合评审 requirements.md + design.md，由 ③ 评审 sub-agent 产出。
> 判据与结论档位见 `../review-agent.md`，本表只填结论与发现。

## 总体结论
**有条件通过**

## 一、完整性
- 结论：⚠️
- 发现（无则写“无”；每条按形态：`[阻断/须改/可改] @<哪份文档/哪节> — <问题> → <建议>`）：
  - [须改] @requirements.md/2.2、4；design.md/测试缝隙与 verification-mode — requirements 已把“文件不可读或不是有效 UTF-8”列为关键异常，但验收标准只覆盖文件不存在和扩展名错误；design 的 CLI 自动化缝隙补了无效 UTF-8，仍漏掉“不可读”，因此这一已声明行为没有闭环验证 → 回改 requirements，增加不可读与无效 UTF-8 的验收项；改 design，增加一个可稳定复现读取失败的端到端用例（例如读取名为 `*.md` 的目录触发 `IsADirectoryError`），并断言非零退出、stdout 为空、stderr 恰为一行。

## 二、一致性
- 结论：⚠️
- 发现（同上形态，无则“无”）：
  - [须改] @requirements.md/2.1、3；design.md/解析与渲染规则 — requirements 要求每个标题生成唯一 slug，但 design 仅“按基础 slug 分组计数”；遇到 `# A`、`# A`、`# A-1` 时会生成 `a`、`a-1`、`a-1`，跨基础 slug 发生碰撞，违反唯一性，也会让两个 TOC 链接指向同一锚点 → 改 design，除基础 slug 计数外维护全局已用 slug 集合并持续探测下一可用后缀；为“自然带 `-N` 的标题与重复标题交错”增加核心测试。

## 三、可实施性
- 结论：⚠️
- 发现（同上形态，无则“无”）：
  - [可改] @requirements.md/6；design.md/manual-evidence 事先批准契约 — 文档已承认 VSCode 版本可能改变锚点规则，但证据格式只要求逐链接结果与截图路径，没有记录实际 VSCode 版本及所用预览器，日后无法判断证据适用的渲染环境 → 改 design，在 manual-evidence 中同时记录 VSCode 版本、预览器来源（内置或扩展）和验收时间。

## 四、定向报告验收（单向对照 ①）
| ① 的发现（坑 / 协同护栏 / 契约+消费方） | 接住没 | 证据 / 缺口 |
|---|---|---|
| C1 项目/工具外壳与空基线 | 是 | design ADR 1 显式选择 Python 3.9+、标准库运行时和最小 setuptools 打包形态，并给出选择依据；未伪称为既有仓库约定。 |
| C2 Markdown 输入与 ATX 识别 | 是 | `parse_headings(markdown)`、ATX 行规则及 core 自动化测试缝隙已接住。 |
| C3 Heading 输出与 CLI/README/渲染器消费 | 部分 | Heading 字段、`render_toc`、CLI、README 和人工样例均已映射；但按基础 slug 独立计数不能保证所有 Heading 的 slug 全局唯一，见一致性发现。 |
| C4 围栏、跳级、重复 slug 边界 | 部分 | 围栏状态、原级别缩进、重复后缀及测试均已设计；自然 `-N` 标题与重复标题交错时的跨基础 slug 碰撞尚未接住。 |
| C5 `toc <file.md>`、stdout/stderr/退出码 | 是 | CLI 边界、console entry point、subprocess 测试和 verification profile 已接住 ① 原契约；requirements 后续增加的不可读异常仍缺验证，见完整性发现。 |
| C6 README 消费方 | 是 | 文件职责明确要求安装、完整示例、边界和兼容范围，且 C6–C7 有落点。 |
| C7 真实渲染器人工跳转 | 是 | 已固定 VSCode Preview，给出步骤、预期、逐项实际结果和截图路径；残留兼容性明确留到实施期闭合。版本元数据为可改项。 |
| C8 verification-mode 与任务消费 | 是 | 3 个缝隙分别声明 2 个 automated-tdd 和 1 个 manual-evidence，并提供 verification profile。 |
| C9 WORK_ROOT 与阶段状态 | 是 | 明确所有实现限定在 `/private/tmp/recon-markdown-toc-cli`，未混用 SOURCE_ROOT。 |
| C10 无关 sentinel | 是 | 明确禁止修改、stage 或 commit，并要求终态证据覆盖其状态。 |
| 坑：空基线没有可继承生态约定 | 是 | 生态选择均作为新 ADR 和实测补探事实表述。 |
| 坑：“本地没有 runner”仅指真实渲染器点击 | 是 | 核心与 CLI 走 automated-tdd，仅点击行为走 manual-evidence。 |
| 坑：GitHub 风格 slug 兼容性未被静态封死 | 是 | 显式改用经批准的 VSCode 兼容档，保留 1 项 `[未核验]` 并绑定人工闭合，不承诺跨渲染器兼容。 |
| 坑：WORK_ROOT 不是 SOURCE_ROOT | 是 | C9 映射和风险护栏均限定 WORK_ROOT。 |
| 坑：阶段文档与 sentinel 不是任务实现 | 是 | 爆炸半径只列新产品/测试/证据文件，sentinel 被单独隔离。 |
| 坑：当前只有规格消费关系、没有既有调用链 | 是 | design 用“计划文件结构”“新建”与“无既有业务代码消费者”表述未来落点，没有误报现成调用链。 |

- 召回地板：是　调用方和消费方均已覆盖；C3/C4 的全局 slug 唯一性缺口已形成须改项。
- ① 事实被推翻：无。

## 修订事项清单
1. [须改] 将 slug 去重改为全局唯一分配，并增加自然 `-N` slug 与重复标题交错的回归测试（改 design）。
2. [须改] 为“文件不可读/无效 UTF-8”补齐验收标准，并为不可读错误增加稳定的 CLI 端到端测试及 stdout/stderr 断言（回改 requirements + 改 design）。
3. [可改] 在 manual-evidence 记录 VSCode 版本、预览器来源和验收时间（改 design）。

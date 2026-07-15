# 评审报告 — markdown-toc-cli

> 综合评审 requirements.md + design.md，由 ③ 评审 sub-agent 产出。
> 判据与结论档位见 `../review-agent.md`，本表只填结论与发现。

## 总体结论
**有条件通过**

## 一、完整性
- 结论：⚠️
- 发现（无则写"无"；每条按形态：`[阻断/须改/可改] @<哪份文档/哪节> — <问题> → <建议>`）：
  - [须改] @requirements.md/§3「业务规则」与 §4「验收标准」；design.md/「解析与渲染规则」「测试缝隙与 verification-mode」 — 已批准的字符过滤允许空标题或全被过滤的标题得到空 slug，design 还明确分配空串、`-1`、`-2`，但自动化向量和 VSCode manual sample 均未覆盖该分支，因而无法验收这类 Heading 生成的 `[](#)`/`[!!!](#)` 是否满足“可点击并命中对应标题”的产品目标。问题本身由文档即可确认；实际跳转后果依赖 ① 的未核验推断 C7，当前无法静态定真，建议主会话补验 — 回改 requirements 明确“空基础 slug”的产品策略，再在 design 中加入解析、碰撞、渲染及 VSCode 逐条点击向量；若 VSCode 不为其生成可用目标，应改为非空回退 slug 或明确排除并说明理由。

## 二、一致性
- 结论：✅
- 发现（同上形态，无则"无"）：
  - 无。requirements 与 design 对 Python、ATX/围栏、层级、slug、CLI I/O、README 和 VSCode 验收的主契约一致；design 对 ① 的空基线、仅真实渲染步骤无 runner、工作根和 sentinel 护栏均为显式承接，未发现静默反写 ① 的事实。

## 三、可实施性
- 结论：⚠️
- 发现（同上形态，无则"无"）：
  - [须改] @design.md/「已批准方案与数据流」「关键决策与被否方案」「verification-profile」 — requirements 宣称支持 Python 3.9+，但设计只核过宿主 Python 3.9.6，并让安装检查的临时 venv 继承本机 site-packages；这会掩盖 `setup.py` 对 setuptools 的安装期依赖，也没有明确 `python_requires` 或干净环境下的构建依赖契约，现有检查不能证明一个不继承宿主包的 Python 3.9+ 环境可安装 — 在 setup 元数据中钉住 `python_requires >= 3.9`，明确 setuptools 的安装期依赖及离线/联网边界，并至少增加一次不继承宿主 site-packages 的全新 venv 安装验收；若无法提供该保证，则收窄 requirements 的支持环境。

## 四、定向报告验收（单向对照 ①）
| ① 的发现（坑 / 协同护栏 / 契约+消费方） | 接住没 | 证据 / 缺口 |
|---|---|---|
| C1：空基线没有语言、包管理器、测试框架或 runner 约定 | 是 | design ADR 1 明确把 Python/setuptools 作为本次方案选择和 WORK_ROOT 补探事实，没有伪称为既有仓库约定；安装保证的验证缺口另见可实施性发现。 |
| C2–C4：Markdown 输入、Heading 输出、围栏/跳级/重复 slug，以及 CLI/README 消费关系 | 是 | `core.py`/`test_core.py`、`render_toc`、CLI、README 与 manual sample 均有映射，围栏矩阵和全局 slug 冲突算法已具体化。 |
| C5：`toc <file.md>`、stdout/stderr、退出码及命令行用户/Markdown 消费方 | 是 | `cli.py`、console entry point、subprocess E2E 和错误路径验收同时接住；无标题、`.MD`、不存在/非法/不可读/无效 UTF-8 均给出验证路径。 |
| C6：README 安装、完整示例和边界说明 | 是 | README contract 明确要求新 venv 实跑、逐行 stdout diff 和边界检查清单；安装环境缺口另见可实施性发现。 |
| C7：真实渲染器逐链接跳转；slug 兼容性仍属 `[未核验]` | 是（待实施闭环） | design 保留残留未核验项，固定 VSCode Preview、六个精确向量、逐链接结果、版本/预览器来源和截图路径；未把静态推断冒充已验证事实。空 slug 是本轮新增覆盖缺口，见完整性发现。 |
| C8：解析/CLI 可自动验，真实点击走 manual-evidence | 是 | 三个测试缝隙分别声明 2 个 `automated-tdd` 和 1 个 `manual-evidence`，没有把“本地无 runner”扩写到全部行为。 |
| C9：WORK_ROOT 与 SOURCE_ROOT 不得混用 | 是 | design 明确所有实现只在 `/private/tmp/recon-markdown-toc-cli`，并固定收尾 BASE。 |
| C10：无关 sentinel 与阶段产物不是产品实现 | 是 | design 明确 sentinel 不属于任务，禁止 task-agent 修改、stage 或 commit，并要求终态快照覆盖。 |
| 坑：当前只有规格内消费关系，没有已落成调用链 | 是 | design 全文以计划文件结构、预期接口和待建测试缝隙表述，没有把未来模块/调用方写成现有代码事实。 |

- 召回地板：是　已追到 CLI 用户、解析/渲染调用链、README 使用者、VSCode Preview/人工验收者及流程状态消费者；未只列文件名。
- ① 事实被推翻：无。定点核验确认任务原文、run-state、Python 3.9.6、pip 21.2.4、setuptools 58.0.4 与 `build_editable=False` 均和 ①/design 记载一致；C7 的真实渲染行为仍按原状态保留为未核验。

## 修订事项清单
（"有条件通过"/"不通过"时必填，按严重度排）
1. [须改] 明确空基础 slug 的产品行为，并补自动化碰撞/渲染测试及 VSCode 逐条点击证据；必要时调整 slug 回退规则（回改 requirements，并同步改 design）。
2. [须改] 明确 Python 3.9+ 的包元数据与安装期依赖边界，用不继承宿主 site-packages 的新 venv 验证安装，或收窄支持环境（改 design；若收窄范围则回改 requirements）。

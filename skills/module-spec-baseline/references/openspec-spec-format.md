# openspec specs 输出契约

本文件是 `spec-synthesis-agent` 写 `openspec/specs/<capability>/spec.md` 时的**唯一格式权威**。骨架、规范词、自检、行为优先边界都在这；SKILL.md 与各 agent 只引用、不复述。

落点：`{{SPECS_ROOT}}/<capability>/spec.md`（`{{SPECS_ROOT}}` = `openspec/specs/`，`<capability>` = kebab-case 行为域名）。

---

## 1. 硬骨架

```markdown
# <Capability 人类可读名> Specification

## Purpose
<这个能力域是什么、为谁解决什么——一段话，≥ 50 字符（见自检）>

## Requirements

### Requirement: <需求名>
系统 SHALL <可观察行为>。

#### Scenario: <场景名>
- **WHEN** <触发条件>
- **THEN** <可观察结果>
- **AND** <附加结果，可选>
```

层级是 openspec 解析器硬依赖的，**不是排版偏好**：

| 元素 | 标题级别 | 说明 |
|------|---------|------|
| 能力标题 | `#`（H1） | `<名> Specification` |
| Purpose | `## Purpose` | 固定字面，描述能力域 |
| Requirements | `## Requirements` | 固定字面 |
| 单条需求 | `### Requirement: <名>`（H3） | 后跟正文，含 SHALL/MUST |
| 单个场景 | `#### Scenario: <名>`（H4） | **正好 4 个井号** |
| 场景步骤 | `- **WHEN** / - **THEN** / - **AND**` | bullet，可加 `- **GIVEN**` 前置 |

> **规范词句式（本项目统一）**：用中文本地化的「**系统 SHALL/MUST <行为>**」。validator 只校验正文含 `SHALL`/`MUST` 关键词，英文 `The system SHALL` 同样合法——但本项目（全中文）统一用「系统 SHALL」，保持一致、单一风格。

---

## 2. openspec validator 死规定（实测，违反即判失败）

这些是对本项目装的 `openspec` CLite（v1.3.1）跑 `validate --strict` 实测出来的真实判定，写 spec 时逐条照做：

| 规则 | 违反后果 | 校验器原话 |
|------|---------|-----------|
| 每条 `### Requirement:` 正文含 **SHALL 或 MUST** | **ERROR** | "Requirement must contain SHALL or MUST keyword" |
| 每条 requirement **至少一个 `#### Scenario:`** | **ERROR** | "Requirement must have at least one scenario" |
| Scenario **正好 4 个井号** | 3 个井号或写成 bullet → 该场景**不被识别**，连带需求被判"无场景" | "Scenarios must use level-4 headers" |
| `## Purpose` **≥ 50 字符** | WARNING；`--strict` 下 WARNING 当 ERROR → 判失败 | "Purpose section is too brief (less than 50 characters)" |
| 规范词只用 **SHALL / MUST** | 用 should/may 当规范词不计规范需求 | RFC 2119：should/may 是建议，不是契约 |

> **为什么要把这些写死在契约里**：模型当然"知道" RFC 2119，但 validator 的判定边界（4 个井号、Purpose 50 字符、SHALL 是 ERROR 而非 WARNING）是工具的硬阈值，不是模型能从常识导出的。写明它们是为了让产出一次过 `validate --strict`，而不是靠运气。

收尾：每个 capability 的 spec.md 写完后跑 `openspec validate <capability> --type spec --strict`（退出码 0 = 过；`--json` 的 `items[].issues[].{level,path,message}` 给逐条问题）。任一未过 → 回收敛子循环修正。

---

## 3. 行为优先边界（openspec 官方 Behavior-First Specification Boundary）

openspec specs 只写**外部可观察的行为契约**，不写内部实现。这是 openspec 的明文规范，也是本 skill 与白盒设计文档（如 module-brief 的 design.md）最大的区别。

| | 允许进 spec | 禁止进 spec（留 scratchpad 当取证原料） |
|---|---|---|
| 内容 | 业务行为、输入/输出、错误处理、约束、状态流转的**可观察表现**；API 的**HTTP 方法 + 路径**与请求/响应的**契约形态**（调用方可观察） | 类名、方法名、SQL、resultMap、字段的物理名/内部结构、调用链、库/框架选型、行号、符号锚点 |

判别测试（写完每条 Requirement/Scenario 自问）：**"一个只能从外部调用这个系统、看不到源码的人，能观察到这条吗？"** 能 → 留；只有读源码才知道（"它调了 XxxService"、"走 LambdaQueryWrapper"、"resultMap 映射") → 删，把它降解成可观察后果。

**例**：
- ❌ `OrderServiceImpl#cancel()` 调用时把 `status` 字段置为 `"CANCELLED"` 字符串
- ✅ 系统 SHALL 在订单取消后拒绝对其的后续发货操作。（`#### Scenario:` WHEN 对已取消订单发起发货 / THEN 拒绝并返回错误）

实现细节是**推导行为的原料**，不是 spec 的内容。把代码事实抽象成可观察契约，是 `spec-synthesis-agent` 的核心动作。

---

## 4. grounding（每条都落到真实代码）

specs 描述**现状**（as-built 基线），不是愿望。每条 Requirement / Scenario **必须能追溯到真实代码事实**（端点、领域规则、状态写入/读取、约束校验）——这是反幻觉底线，由 `spec-synthesis-agent` 内置 grounding 自检 + `verification-agent` 把关。

- 取证锚点（`ClassName#method`、`mapper.xml#id`、DDL 对象）记在 scratchpad，用于核验"这条行为代码里真有"；**锚点本身不进 spec**（违反行为优先边界）。
- 编造的、查无实据的行为 → 标 `[待验证]` 或丢弃，不得为了"看起来完整"而虚构。
- 把代码事实顺成更合业务直觉但相反的版本是最坏的错（如把"全表停用"渲染成"按系统停用"、把兄弟端点的行为安到本端点）——忠实于代码原貌，宁可保守。

---

## 5. capability 与需求/场景的来源

| 产出 | 主要来源（scratchpad 中间产物） |
|------|-------------------------------|
| capability 切分 | `{{CAPABILITY_PLAN}}`（SKILL A-4 与用户敲定的行为域 → 端点/Service 入口/状态域映射） |
| Requirement | 端点行为、领域规则（校验/约束/状态流转）、回调、跨模块契约 |
| Scenario | 正常路径 + 代码里**实际存在**的错误/边界/状态守卫路径（每条可当测试用例读） |
| Purpose | 该 capability 覆盖的业务能力域，一段话 |

"细到实处" = 模块每个**可观察行为**都落成一条可测试的 Requirement + Scenario，不是只写几条粗线条。状态机的每个转换、每个校验失败分支，都是天然的 Scenario（WHEN 违反约束 / THEN SHALL 拒绝）。

---

## 6. 幂等：spec 已存在时的智能合并

基线可重跑。目标 `spec.md` 已存在时，**不整文件覆盖**，按 openspec delta 语义智能合并（SKILL A-1 决定 ADDED/MODIFIED）：

- **新增需求** → 直接加到 `## Requirements`。
- **改已有需求** → 定位主规范里同名需求块，**就地**改动相关部分（新增/改场景、改需求描述均可，**无需复制未改的既有场景**），保留未提及的场景与内容。这是直写主规范的智能合并语义。
- **改需求名** → 定位旧标题就地改为新标题，保留正文与场景（相当于 RENAMED）。
- **删需求** → 移除整块，并写明 `**Reason**` 与 `**Migration**`（openspec REMOVED 要求）。

> 注：「复制整块需求全文再改」只发生在走 `changes/` delta → archive 流程时（防归档丢细节）。本 skill **直写主规范、不走 delta**，故主规范是事实源、就地编辑即可，不需要整块替换。

> 注意：基线直写的是**主规范** `openspec/specs/`，不是 `changes/` 下的 delta 文件。这里的 ADDED/MODIFIED 是合并动作的语义，不是要在主规范里写 `## ADDED Requirements` 段（那是 change delta 的写法）。主规范只有 `## Requirements`。

---

## 7. 自检清单（写完每个 spec.md 机械过一遍）

| 项 | 检测手段 |
|----|---------|
| H1 + `## Purpose` + `## Requirements` 齐全 | `grep -c "^## Purpose"` =1、`grep -c "^## Requirements"` =1 |
| Purpose ≥ 50 字符 | Purpose 段正文字符数 ≥ 50 |
| 每条 requirement 含 SHALL/MUST | 每个 `### Requirement:` 块正文 `grep -E "SHALL|MUST"` 命中 |
| 每条 requirement ≥1 场景 | 每个 `### Requirement:` 块下 `grep -c "^#### Scenario:"` ≥ 1 |
| 场景正好 4 个井号 | 无 `^### Scenario:`（3 个井号）；场景一律 `^#### Scenario:` |
| 场景含 WHEN/THEN | 每个 `#### Scenario:` 块含 `- **WHEN**` 与 `- **THEN**` |
| 行为优先（无实现细节） | 正文 `grep -E "[A-Z][a-zA-Z]+\.[a-z][a-zA-Z]*\("`（类.方法()）命中=0；无 `.java`/`.xml`/SQL 关键字/resultMap |
| 字面量取值（grep 抓不到、人工核） | 业务字面量取值（账套名、系统标识、状态魔法值等非 `类.方法()` 形态的取值）机器 grep 抓不到，需人工抽查是否属可观察契约（而非内部实现细节） |
| 每条可追溯（grounding） | 抽样若干 Requirement/Scenario，确认 scratchpad 有对应代码事实 |
| 行为域全覆盖（完整性，模块末尾核一次） | 对照 `{{CAPABILITY_PLAN}}`「行为域」清单逐项语义核对：每个行为 ≥1 Requirement 覆盖（可跨 capability）。漏 → 补 Requirement 或记裁决注（裁决注进综合 agent 返回、不进 spec.md） |
| `openspec validate <cap> --strict` | 退出码 0 |

任一不过 → 收敛子循环（首写 + 2 次重试，上限 3 次）；仍不过 → 返回 `[失败] <capability> 自检：<项>`。

---

## 8. 最小完整样例（实测可过 `validate --strict`）

```markdown
# 订单取消 Specification

## Purpose
客户订单的取消能力，以及订单一旦取消后阻止其继续被处理的下游守卫规则——已取消的订单不可再发起发货等后续操作。

## Requirements

### Requirement: 取消开启状态的订单
系统 SHALL 取消一个当前处于开启状态的订单，并记录该次取消。

#### Scenario: 取消开启状态的订单
- **WHEN** 对一个开启状态的订单发起取消请求
- **THEN** 该订单变为已取消
- **AND** 其后续发货请求被拒绝

#### Scenario: 取消一个已取消的订单
- **WHEN** 对一个已处于取消状态的订单发起取消请求
- **THEN** 该请求以冲突错误被拒绝
```

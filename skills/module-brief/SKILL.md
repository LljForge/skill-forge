---
name: module-brief
description: 给人快速建立某后端模块认知的轻量文档生成器——读一个模块的代码，产出两份给人看的文档：requirements.md（业务视角：模块为谁解决什么、业务规则、术语、场景）+ design.md（技术白盒：分层结构、关键类、核心调用链、数据模型概览，末尾含精简「陷阱与护栏」小节）。一次性、可随时重生成、刻意不那么细。**用于「为某模块写需求/设计文档」「给新人产出某模块认知材料」「快速读懂某模块并落成文档」等场景，或显式 /module-brief <模块名> 调用。** 要把现状沉淀成长期 openspec 规范基线用 module-spec-baseline。
---

# 模块认知简报（module-brief）

读一个老模块的代码，产出两份**给人看**的认知文档，帮开发者快速建立心智模型。刻意轻量：一次性、可随时重生成、不追求穷尽。

| 产物 | 视角 | 受众 |
|------|------|------|
| `docs/module-brief/<module>/requirements.md` | 业务（脱离实现） | PM / 测试 / 业务新人 |
| `docs/module-brief/<module>/design.md` | 技术（白盒，允许类/方法/SQL/路径） | 接手/维护本模块的开发者；末尾「陷阱与护栏」小节给改这块的人避坑 |

**与 module-spec-baseline 的分工**：要"给人快速看懂"，用本 Skill（轻、可读、一次性）；要把现状沉淀成长期、可演进、走 openspec 标准流程的**规范基线**，用 `module-spec-baseline`（产 `openspec/specs/`、过 `validate --strict`）。两者独立、无依赖。

**刻意不做**（相对深度分析）：不穷举 PO 字段、不画全部状态机（只点名 + 挑核心画一个）、不做跨层/跨模块接缝校验、不做验证兜底、陷阱只留最狠几条。要这种深度与可验证规范，去 `module-spec-baseline`；要 bug 清单去 code-review。

## 调用方式

```
/module-brief <module-name>
```

`<module-name>` 支持 kebab-case 或中文。

## 执行流程（3 步，轻量）

```
Step 1：定位确认（内联，主上下文完成）
Step 2：单 survey-agent 读模块、按格式写两份文档
Step 3：报告产出
```

> 全程**只 1 个子 agent**。不并行、不起验证、不接缝 join、无 scratchpad 清理——这是它"轻"的来源。

### Step 1：定位确认（内联）

主上下文直接完成，不起 agent。

**Headless 模式**（`$EVAL_HEADLESS=1`，供批跑评测用）：
- 用 Bash 执行 `echo "$EVAL_HEADLESS"` 检查是否为 `1`。若是：
  1. 用 Bash 执行 `echo "$EVAL_PRESET"` 读取预设 JSON，从中解析 `module`（模块名）、`module_cn`（中文名）、`scope`（范围）、`exclude`（排除项），直接用这些值定模块名与范围。
  2. 用 Bash 执行 `echo "$EVAL_OUT"` 读取产物根目录，将 `{{OUTPUT_DIR}}` 设为 `<EVAL_OUT值>/<module>/`。
  3. **跳过下面的 AskUserQuestion**，直接进 Step 2（传入上述已解析的变量）。

**交互模式**（默认，`$EVAL_HEADLESS` 未设置或非 `1`）：

1. **输入归一化**：kebab / 中文 / camelCase 都接受，归一为候选名（仅用于定位）。
2. **存在性校验**：Grep 候选名在后端源码 `service`/`dao`/`controller` 等包路径出现；未命中列相近模块名供选择。
3. **范围预判（双侧）**：扁平分层 / 一包多模块时模块边界有歧义——给出建议前缀集合；若候选模块几乎无 Controller/Service 实现（疑似空脚手架），提示真实现可能散在调用方/上游、确认是否换定位或扩范围。**用一次 `AskUserQuestion` 跟用户敲定模块名 + 纳入/排除范围**（一次问完，不加回合）。模块有独立子包时范围即子包、可跳过。

> 轻量原则：**借 MDA 的定位思路、不搬其重机制**——不写 `module_aliases`、不缓存技术栈、不起独立 boundary agent。几句话定位完即进 Step 2。

### Step 2：启动 survey-agent

启动**单个** `survey-agent`，传：模块名、后端代码路径（当前工作目录下的后端根）、Step 1 敲定的范围。

它读模块、识别栈、蒸馏认知，按 [references/requirements-format.md](references/requirements-format.md) 和 [references/design-format.md](references/design-format.md) 直接写出两份文档到 `{{OUTPUT_DIR}}`（交互模式 `docs/module-brief/<module>/`；headless 模式 `$EVAL_OUT/<module>/`）。
**详见**：[agents/survey-agent.md](agents/survey-agent.md)。

### Step 3：报告

survey-agent 返回后，报告两份文档路径 + 概况（模块栈、核心实体数、场景数、陷阱条数）。Agent 返回 `[错误]` → 人工确认重试/跳过。

---

## 共享约定与变量

| 变量 | 含义 | 来源 |
|------|------|------|
| `{{MODULE_NAME}}` | kebab-case 模块名（也是输出子目录名） | Step 1 归一化 + 用户确认 |
| `{{MODULE_CN_NAME}}` | 中文模块名（两份文档 H1 标题） | 用户输入或 Step 1 轻量推断（grep `@Api(tags=)` / JavaDoc 中文名；推断不出用 kebab 占位） |
| `{{MODULE_SCOPE}}` | 扁平分层时的前缀范围+排除项 | Step 1 与用户敲定；有独立子包时为空 |
| `{{PROJECT_ROOT}}` | 项目根目录 | 当前工作目录 |
| `{{OUTPUT_DIR}}` | 产出目录 | 交互模式：`{{PROJECT_ROOT}}/docs/module-brief/{{MODULE_NAME}}/`；headless 模式（`$EVAL_HEADLESS=1`）：`$EVAL_OUT/{{MODULE_NAME}}/` |

## 输出位置与产物

```
docs/module-brief/<module>/
├── requirements.md   # 业务视角（禁代码标识）
└── design.md         # 技术白盒（允许标识；末尾「陷阱与护栏」小节）
```

两份文档的骨架、抽象层次约束、写作要点：见 [references/requirements-format.md](references/requirements-format.md) 与 [references/design-format.md](references/design-format.md)。

---
name: module-spec-baseline
description: 把指定后端模块逆向为 openspec specs 基线——按行为域拆分 capability，直写 openspec/specs/<capability>/spec.md（外部可观察的行为契约，每条过 openspec validate --strict），为老项目引入 openspec、后续走标准 change 流程打底。**显式调用 /module-spec-baseline <模块名>，不自动触发**。需本机装有 openspec CLI。
---

# 模块 → openspec specs 基线

把一个老模块的现状（as-built）逆向成 openspec 主规范，直写 `openspec/specs/<capability>/spec.md`。产物是**外部可观察的行为契约**（不是白盒设计、不是 bug 清单），过 `openspec validate --strict`，作为后续 openspec 标准开发流程（change → delta → archive）的事实地基。

| 项 | 取向 |
|----|------|
| 产物 | `openspec/specs/<capability>/spec.md`（每模块按行为域拆多个 capability） |
| 抽象层次 | **行为优先**：只写可观察契约，禁类名/方法名/SQL/内部结构（openspec Behavior-First 硬约束，权威见 [references/openspec-spec-format.md](references/openspec-spec-format.md) §3） |
| 落点入口 | 直写主规范 `specs/`（基线=记录现状，不走 change 仪式）；后续变更交给已有 openspec-* skills |
| 校验 | 格式自检 + `openspec validate --strict` 强制门 |

**与 module-brief 的分工**：要给人快速建模块认知（需求+设计，一次性、可读），用 `module-brief`；要把现状沉淀成长期、可演进、走 openspec 流程的规范基线，用本 Skill。两者独立、无依赖。

**不做**：bug-hunting（用 code-review/security-review）、白盒设计文档（用 module-brief）、前端 UI 细节建模（specs 描述系统可观察行为）。

> **安全边界澄清**：「不做安全」指**不做安全审计/漏洞挖掘**；但**端点前置鉴权契约**（登录态门 / 回调验签 / anon 公开）是**黑盒可复现的访问行为契约**，按行为维度 B5 采（见 [references/behavior-dimensions.md](references/behavior-dimensions.md)、structural §2.5）——别把它跟"安全审计"一起排掉。**前提是深读守卫真身**：恒放行 / 被注释的空壳守卫不写成强制契约（否则编造）。

## 调用方式

```
/module-spec-baseline <module-name>
```

`<module-name>` 支持 kebab-case 或中文。**显式调用，不自动触发。**

## 执行流程（4 Phase）

```
Phase A — 定位与盘点 + 能力划分
  Step 0: 前置校验（计划模式 / 参数 / openspec CLI 在位 / 目录预创建）
  Step 1: 输入归一化（候选 kebab + 候选中文名，仅用于定位）
  Step 2: 模块存在性校验 + 范围预判（过窄/过宽）
  Step 3: 模块代码范围确认（敲定 {{MODULE_SCOPE}}；不写 module_aliases）
  A-1:    评估现有 specs（预计涉及的 capability → 查 openspec/specs/<cap> → ADDED/MODIFIED/保留）
  A-2:    技术栈检测并缓存
  A-3:    启动 boundary-agent → module-boundary.md
  A-4:    能力划分确认（扫入口含公共网关 ApiController → 按行为域提 capability → AskUserQuestion 敲定 → {{CAPABILITY_PLAN}}）

Phase B — 行为分析（并行）
  B-1:    并行启动 structural-agent + domain-agent（无 frontend-agent）
  B-2:    等两个分析 Agent 完成

Phase C — specs 综合 + grounding
  C-1:    spec-synthesis-agent 逐 capability 草拟 spec.md（行为优先 + 格式契约 + 自检）
  C-2:    verification-agent grounding 校验 + 跨层契约一致性 + 行为域完整性回扣 → 逐条裁决
  C-3:    synthesis 据裁决收敛（打回改/丢、[待验证] 标注）

Phase D — 校验与报告
  D-1:    对每个 capability 跑 openspec validate --strict（强制门）
  D-2:    执行报告
  D-3:    全过则清理 scratchpad
```

派生关系：

```
boundary（范围/目录/枚举/回调） ─┬─> structural（端点/契约/调用链/Schema） ─┐
                                └─> domain（状态机/状态流转/字段约束） ──────┤
                                                                            ├─> spec-synthesis（逐 capability 写 spec.md）
                                CAPABILITY_PLAN（A-4 与用户敲定） ───────────┘
                                                                            └─> verification（grounding + 跨层契约 + 完整性回扣）→ 回灌 synthesis 收敛
```

---

## Phase A — 定位与盘点 + 能力划分

### Step 0：前置校验

1. **计划模式**：若主上下文在 `plan mode`，子 agent 无法写文件。让 Agent 在落盘前主动询问是否退出（详见 [shared/agent-preamble.md](shared/agent-preamble.md) §1）。
2. **参数校验**：模块名非空、kebab-case 或中文。
3. **openspec CLI 在位**：`command -v openspec`（或 `openspec --version`）。不在位 → 提示安装（`npm i -g openspec` 或 `npx openspec`）并 **STOP**——本 Skill 以 `openspec validate --strict` 为强制门，无 CLI 无法保证产物合规。
4. **目录预创建**：`{{SPECS_ROOT}}`（=`{{PROJECT_ROOT}}/openspec/specs/`）、`{{SCRATCHPAD_DIR}}`。

### Step 1：输入归一化

把用户输入归一为「候选 kebab 名」+「候选中文名」，**仅用于触发定位**（最终产物单元是 capability、不是模块名，故无需精确）：

| 输入形式 | 处理 |
|---------|------|
| kebab-case / camelCase / PascalCase | 转候选 kebab |
| 中文 | 作候选中文名，用于 grep 定位 |
| 其余形态 | 尽力归一，由 Step 2/3 兜底 |

### Step 2：模块存在性校验 + 范围预判

用 Grep 在后端源码中搜模块名在 `service`/`dao`/`controller` 等包路径出现。未命中时列相近模块名供选择。

**范围预判（双侧，定位后即判，任一命中即 STOP 确认）**：
- **过窄（疑似空脚手架）**：几无 Controller·Service·DAO 实现、真实现可能散在他包。
- **过宽（疑似伞形 / 限界上下文）**：scope 跨多个不相关业务域。凭类名业务内聚性判（读一遍类名看是不是一个内聚域），不设文件数阈值。

> **客观锚点（别只押"读类名"直觉）**：读类名是起点，但巨包/扁平分层里前缀不可靠（如 `Base*` 横跨多子域）。再叠**可观测的耦合信号**佐证"是不是一个内聚域"：① 这批类**相互 `@Autowired` 调用**成簇 ② **共用同一组 PO / 数据表** ③ **共围同一业务名词**。三信号聚到一起 = 强内聚域；某类只与外部簇耦合、与本簇零调用零共表 = 疑似他子域，按过宽 STOP 确认。让"为什么这样切"有可观测证据、换人重跑能收敛，而不是只剩人脑里的直觉（决策仍按 Step 3 落 `{{DECISIONS_DIR}}` 留痕）。

> Why：过窄 → 下游 Agent 在空壳空转；过宽 → 把多域揉进一次基线、capability 划分失焦。

### Step 3：模块代码范围确认

定位到模块后、**启动任何分析 Agent 前**，与用户敲定**待逆向的代码范围**（`{{MODULE_SCOPE}}`，扁平分层/一包多模块时尤需）：给出建议前缀集合（Step 2 命中前缀 + 邻接候选 + 疑似已属他模块的排除项；归属纯按代码领域内聚判），用一次 `AskUserQuestion` 让用户敲定纳入/排除。模块有独立子包时范围即子包、可跳过。

> 与老 MDA 的区别：本步**不写 `module_aliases`**（capability 名按行为命名、不等于模块名，见 A-4）；它只圈定"这次从哪些代码逆向"。

**决策落盘**：敲定后，把 `{{MODULE_SCOPE}}`（纳入前缀 + 排除项 + 一句理由）写入 `{{DECISIONS_DIR}}/{{MODULE_NAME}}.md`（留存，**不随 scratchpad 清理**）。**重跑同模块时先读它**：已有则按上次划分提议、用户改动才更新——这是范围划分可复现的依据（否则换人/换会话重跑划分会漂）。

### A-1：评估现有 specs

列出本模块预计涉及的 capability（A-4 会细化），逐个检查 `{{SPECS_ROOT}}/<capability>/spec.md` 是否已存在 → 决定：
- **新建** — 不存在，按骨架直写。
- **智能合并** — 已存在，按 [references/openspec-spec-format.md](references/openspec-spec-format.md) §6 的 ADDED/MODIFIED 增量合并，保留未提及内容、不整文件覆盖。

### A-2：技术栈检测并缓存

执行 [shared/tech-stack-detector.md](shared/tech-stack-detector.md)，结果写入 `{{PROJECT_ROOT}}/openspec/.spec-baseline-scratchpad/.stack-profile.yml`（与 [shared/tech-stack-detector.md](shared/tech-stack-detector.md) 的缓存路径一致；它在 `{{SCRATCHPAD_DIR}}` 的父级、`specs/` 之外）。**首次后续运行直接读缓存**（同项目若先跑过 module-brief 也可复用其检测结果）。

### A-3：启动 boundary-agent

**输入**：模块名、后端代码路径、`{{MODULE_SCOPE}}`。
**输出**：`{{SCRATCHPAD_DIR}}/module-boundary.md`（模块输入/输出边界、目录清单、状态枚举清单、状态字段线索、回调 Controller 清单、非 HTTP 入口清单、外置入口清单）。
**详见**：[agents/boundary-agent.md](agents/boundary-agent.md)。

> ⚠️ B-1 / A-4 必须在 A-3 完成后——它们依赖 `module-boundary.md`。

### A-4：能力划分确认（启动分析前敲定）

把模块按**行为域**拆成若干 capability（每个 = 一个 `spec.md`）：

1. 读 boundary 的回调清单 + **外置入口清单**（步骤 2.8 已按四类位置走查出的网关/同步群端点）+ 主上下文 Grep 本模块入口面：Controller/Service 的对外方法。入口枚举须**覆盖四类位置**（自有 Controller + 共享网关 + 同步 Controller 群 + MQ/定时），任一类漏掉就漏一整片对外契约面：
   - **共享网关**——本项目对外查询/保存集中在共用 `ApiController`（`@RequestMapping("/api")`，方法如 `searchEnterprise`/`saveBaseOrganizationList`），不在各模块自己的 Controller 里；漏扫它会把模块 Service 的 `apiSearch` 等误判无入口。
   - **同步 Controller 群**——本项目中央批量同步/任务入口（如 `TaskSyncJobController`/`SyncKingDeeController`/`SyncCcmFunController`）里**调本模块 Service 的端点**也是本模块对外面（如某模块的 `/taskGetXxx` 物理在 `TaskSyncJobController`、却调本模块 Service）；boundary 外置入口清单已按行切出，这里据它纳入对应 capability，**别因它不在本模块包里就漏**。
2. 按行为域把入口归并成 capability，**kebab-case 按行为命名**（如 `enterprise-customer-query`、`organization-sync`），不按模块名命名。
3. 检查 `{{SPECS_ROOT}}/` 已有 capability 名，避免冲突（capability 全局平铺、多模块共用命名空间）。
4. 用一次 `AskUserQuestion` 跟用户敲定 capability 列表 + 各自覆盖的行为/入口（跑分析前一次问完，不加交互回合）。
5. 产出 `{{CAPABILITY_PLAN}}`（capability → 覆盖的端点/Service 入口/状态域映射），写入 scratchpad 供 C 综合按 capability 切分，**并同时追加到 `{{DECISIONS_DIR}}/{{MODULE_NAME}}.md`**（留存）。重跑同模块时先读它复用上次 capability 划分，保证可复现。

> Why 跑前敲定：capability 划分决定产出几个 spec、各写什么；跑完才改要重写多份。

> **维度参考**：分析与综合时，除模块自身显见行为外，对照 [references/behavior-dimensions.md](references/behavior-dimensions.md)（易漏维度登记表），避免漏掉整类外部可观察行为（非 HTTP 入口 / 横切契约 / 错误与格式契约）。

---

## Phase B — 行为分析（并行）

### B-1：并行启动 2 个分析 Agent

**先从 boundary 派生 2 个信号**（编排层读 `module-boundary.md` 计算，作上下文变量传给 domain-agent）：

| 信号 | 来源 | 取值 |
|------|------|------|
| `HAS_STATUS_ENUM` | 「状态枚举清单」非空 | true / false |
| `HAS_CALLBACK_CONTROLLER` | 「回调 Controller 清单」非空 | true / false |

**把 `ORM_STRATEGY_PATH`（A-2 检测结果）传给 domain-agent**：其状态 gating 扫描需读该策略的 gating 构造（mybatis-plus 的 `LambdaQueryWrapper.eq` 等），否则 ORM 层 gating 扫不到、状态字段被误判透传镜像。

| Agent | 输出 | 关注点 | 详见 |
|-------|------|--------|------|
| structural-agent | `structure-analysis.md` | API/Controller/Service 映射、调用链、跨模块依赖、PO-DB Schema（端点/契约 = 需求/场景来源） | [agents/structural-agent.md](agents/structural-agent.md) |
| domain-agent | `domain-modeling.md` | 状态建模（真/派生位/反模式）、状态消费覆盖、字段约束、回调事件（状态流转 = 天然 WHEN/THEN、约束 = SHALL 来源） | [agents/domain-agent.md](agents/domain-agent.md) |

`domain-agent` 默认启动（只要模块有 PO 或有回调），内部确认无 PO 且无回调时自跳过。**不启动 frontend-agent**——specs 描述系统可观察行为，由后端 API + 领域规则定义；场景用"用户/调用方可观察"口吻表达。某 capability 确属纯客户端行为时，由 C 综合就该 capability 临时定点 grep 前端，不起重 agent。

### B-2：等两个 Agent 完成

Agent 返回判定见 [#Agent 返回判定](#agent-返回判定)。任一 `[错误]` → 人工确认重试/跳过；`[跳过]` 视为成功。

---

## Phase C — specs 综合 + grounding

### C-1：spec-synthesis-agent 草拟

由 `spec-synthesis-agent` 读 `module-boundary.md` + `structure-analysis.md` + `domain-modeling.md` + `{{CAPABILITY_PLAN}}`，逐 capability 草拟 `{{SPECS_ROOT}}/<capability>/spec.md`，严守行为优先 + openspec 格式契约 + 内置自检（权威见 [references/openspec-spec-format.md](references/openspec-spec-format.md)）。**不读** `frontend-integration.md`（不存在）与 `pending-findings.md`（不产生）。
**详见**：[agents/spec-synthesis-agent.md](agents/spec-synthesis-agent.md)。

### C-2：verification-agent grounding 校验

由 `verification-agent` 对草拟稿做 grounding（每条需求/场景落到真实代码）+ 跨层/跨模块契约一致性校验 + **行为域完整性回扣**（独立核对 capability-plan 行为域逐项有 ≥1 Requirement 覆盖，接住 synthesis 静默漏写），返回逐条裁决（确认 / 打回 / 丢弃 / 保留 `[待验证]`）。
**详见**：[agents/verification-agent.md](agents/verification-agent.md)。

### C-3：收敛

把 C-2 的打回项/契约冲突交回 `spec-synthesis-agent` 修正（改措辞 / 丢弃 / 标 `[待验证]`），仅改这几条、不全文重写。改完进 D。无打回则直接进 D。

> 自检收敛子循环**总尝试次数上限 3 次**（见 spec-synthesis-agent）；超出仍失败返回 `[失败]`，人工介入。

---

## Phase D — 校验与报告

### D-1：openspec validate 强制门

对每个产出的 capability 跑：

```
openspec validate <capability> --type spec --strict
```

退出码 0 = 过；非 0 读 `--json` 的 `items[].issues[]` 定位问题、回 C-3 修。**全部 capability 过 strict 才算成功**；仍有失败 → 报 `[失败]`，保留 scratchpad 供排查。

### D-2：执行报告

输出：技术栈、模块概况、Agent 状态（成功/失败/跳过）、产出 capability 清单 + 每个的 requirement/scenario 数、`openspec validate --strict` 结果、`[待验证]` 项清单（如有）、**行为域覆盖结论**（capability-plan 行为域逐项 → 覆盖 / 已合并附理由 / 未决已标；未决项显性列出、不静默）。**不列 bug 清单**（specs 不做缺陷报告）。

### D-3：清理 scratchpad

**触发条件**：全部 capability 的 spec.md 生成且 `validate --strict` 通过。清理 `{{SCRATCHPAD_DIR}}` 下中间文件；**最终产物（`openspec/specs/`）与 `{{DECISIONS_DIR}}` 下决策文件始终保留**（后者供重跑复用、不清理）。部分成功时保留 scratchpad、在 D-2 给出路径。

---

## Agent 返回判定

| 返回内容特征 | 判定 |
|------------|------|
| 含 `写入完成` / `分析完成` / `综合完成` / `校验完成` | 成功 |
| 含 `[跳过]` | 成功（条件性跳过） |
| 含 `[错误]` / `[失败]` | 失败 |
| 既无成功也无失败标志 | 兜底：目标文件存在且 > 100 字节 → 成功；否则失败 |

失败时人工干预（重试 / 跳过 / 终止）。

---

## 共享约定与变量

| 变量 | 含义 | 默认值/来源 |
|------|------|------------|
| `{{MODULE_NAME}}` | kebab-case 模块名（定位用） | Step 1 归一化结果 |
| `{{MODULE_SCOPE}}` | 待逆向的代码范围（前缀+排除项） | Step 3 与用户敲定；有独立子包时为空 |
| `{{CAPABILITY_PLAN}}` | capability → 端点/入口/状态域映射（逐个 capability 遍历时用字面 `<capability>` 标识） | A-4 与用户敲定 |
| `{{SPECS_ROOT}}` | openspec 主规范根 | `{{PROJECT_ROOT}}/openspec/specs/` |
| `{{PROJECT_ROOT}}` | 项目根目录 | 当前工作目录 |
| `{{BACKEND_ROOT}}` | 后端根模块路径 | `.stack-profile.yml#backend.root` |
| `{{SCRATCHPAD_DIR}}` | 临时工作目录（**在 `specs/` 之外**，避开 validate 扫描） | `{{PROJECT_ROOT}}/openspec/.spec-baseline-scratchpad/{{MODULE_NAME}}` |
| `{{DECISIONS_DIR}}` | 范围/能力划分**决策留存目录**（**不随 scratchpad 清理**，供重跑复用、保证划分可复现） | `{{PROJECT_ROOT}}/openspec/.spec-baseline-decisions/` |
| `{{ORM_STRATEGY_PATH}}` / `{{WEB_STRATEGY_PATH}}` / `{{RPC_STRATEGY_PATH}}` | 策略文件路径 | 详见 [shared/tech-stack-detector.md](shared/tech-stack-detector.md) §检测结果→变量映射 |

> **前端**：检测器仍探测并记录 `frontend[]`，但 frontend-agent 不继承、无前端策略文件——仅留作「某 capability 确属纯客户端行为」例外时，由 C 综合定点 grep 前端代码。

各 Agent 通用前置约定（计划模式、反幻觉、失败返回）见 [shared/agent-preamble.md](shared/agent-preamble.md)。

---

## 输出位置与产物

```
openspec/
├── specs/<capability>/spec.md          # 主规范（行为契约，过 validate --strict）
└── .spec-baseline-scratchpad/          # 临时（分析完清理；在 specs/ 之外）
    ├── .stack-profile.yml
    └── <module>/{module-boundary,structure-analysis,domain-modeling}.md
```

格式契约、自检、行为优先边界、幂等合并：见 [references/openspec-spec-format.md](references/openspec-spec-format.md)。

## 运行画像

| 项 | 典型值 |
|----|--------|
| 端到端耗时 | 中等模块 15-25 分钟、大模块 25-35 分钟（多在 structural/domain/synthesis 读码写规范） |
| 启动子 agent 数 | 4-5 个（boundary + structural + domain + spec-synthesis + verification；domain 可跳过） |
| 常见失败 Top 3 | 1) openspec CLI 未装 → Step 0 STOP；2) 模块名拼错 → Step 2 找不到；3) validate --strict 不过（多为 Purpose<50 字 / 场景非 4 井号 / 缺 SHALL）→ C-3 收敛 |

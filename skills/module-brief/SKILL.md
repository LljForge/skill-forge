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

## 执行流程（单上下文，3 步）

```
Step 1：定位确认（定模块名 + 范围 + 输出目录）
Step 2：读模块、蒸馏认知、按格式写两份文档
Step 3：报告产出
```

> **全程单上下文，不派子 agent**——读+写都由当前上下文一气干完。工作量（读十几个文件 + 写两份文档）单上下文绰绰有余；不并行、不起验证、不接缝 join、无 scratchpad 清理——这是它"轻"的来源。

### Step 1：定位确认

**Headless 模式**（`$EVAL_HEADLESS=1`，供批跑评测用）：
- 用 Bash 执行 `echo "$EVAL_HEADLESS"` 检查是否为 `1`。若是：
  1. 用 Bash 执行 `echo "$EVAL_PRESET"` 读取预设 JSON，解析 `module`（模块名）、`module_cn`（中文名）、`scope`（范围）、`exclude`（排除项），**直接用这些值定模块名与范围，不另行探索、不扩展到其它模块**。
  2. 用 Bash 执行 `echo "$EVAL_OUT"` 取**绝对路径**，令 `{{OUTPUT_DIR}}` = `<该绝对路径>/<module>/`。
  3. **跳过下面的 AskUserQuestion**，直接进 Step 2。

**交互模式**（默认，`$EVAL_HEADLESS` 未设置或非 `1`）：

1. **输入归一化**：kebab / 中文 / camelCase 都接受，归一为候选名（仅用于定位）。
2. **存在性校验**：Grep 候选名在后端源码 `service`/`dao`/`controller` 等包路径出现；未命中列相近模块名供选择。
3. **范围预判（双侧）**：扁平分层 / 一包多模块时模块边界有歧义——给出建议前缀集合；若候选模块几乎无 Controller/Service 实现（疑似空脚手架），提示真实现可能散在调用方/上游、确认是否换定位或扩范围。**用一次 `AskUserQuestion` 跟用户敲定模块名 + 纳入/排除范围**（一次问完，不加回合）。模块有独立子包时范围即子包、可跳过。
4. `{{OUTPUT_DIR}}` = `{{PROJECT_ROOT}}/docs/module-brief/{{MODULE_NAME}}/`。

> 轻量原则：几句话定位完即进 Step 2，不写 `module_aliases`、不缓存技术栈、不起独立 boundary agent。

### Step 2：读模块、蒸馏、写两份文档

按以下约定，自己读模块代码、蒸馏认知、直接写出两份文档（不派子 agent）。

**轻量约定**
- **反幻觉**：每条事实附代码证据（`ClassName.method()` / `mapper.xml#id` 等）；给人看的文档更不能编造类名/方法/SQL——拿不准的标 `[待确认]`，别凭直觉补。
- **扫描卫生**：Glob/Grep 排除 `target/ build/ dist/ out/ node_modules/`（编译副本会让计数翻倍、读到过期事实）。
- **失败处理**：任何阶段出错，报告单行 `[错误] <阶段>：<原因>`，由人确认重试/跳过。
- **计划模式**（交互）：若 `Write` 不可用（plan mode），先 `AskUserQuestion` 问是否退出，同意则 `ExitPlanMode` 后继续。

**1. 定位与栈识别（轻量）**
- **栈识别**（认特征即可，不求穷尽）：`@SpringBootApplication`→Spring Boot；`pom.xml`/`build.gradle` 含 `mybatis-plus`/`mybatis`/`jpa`→对应 ORM；`@FeignClient`→Feign、`dubbo`→Dubbo；`*-domain`/`*-app` 子模块→DDD 分层。识别用于读代码时认得入口注解。
- **范围划界**：`{{MODULE_SCOPE}}` 非空（扁平分层）时，按类名前缀圈定本模块文件——同目录里属他模块前缀的类**不算本模块**，别把它们的逻辑写进来。模块有独立子包时范围即子包。
- 用 Glob 列出本模块的 Controller/Service/DAO(Mapper)/PO 文件清单（小模块全量、大模块按关键词定向）。
- **对外入口**：有些项目把对外查询/保存集中在共用网关 Controller（而非各模块自己的 Controller）——梳理对外入口时留意项目是否有这类网关（如 CLAUDE.md 所述的项目约定），否则会漏掉本模块的对外查询面。

**2. 蒸馏认知（白盒视角，刻意轻量，点到为止不穷举）**
- **入口 / 分层**：Controller/Service/DAO 怎么分层，关键类与职责。
- **核心调用链（1–2 条）**：挑最主干的业务流程 Controller→Service→DAO 走一遍；有远程调用（Feign/HTTP）时点出**降级吞错 / 重试幂等**这类坑。
- **数据模型骨架**：核心实体 + 关系（可画极简 ER），**不穷举每个字段**；用 `@TableLogic`/逻辑删除位等只点关键约束。
- **状态**：**点名全部状态字段**，但**只挑最核心的一个画 stateDiagram**，其余一句话带过。取值以代码真 set 的为准，别照抄注释/枚举；存疑标 `[待确认]`。
- **业务规则 / 术语 / 最狠的几条坑**：边读边记，供两份文档分别取用。

**3. 写两份文档** —— 写入 `{{OUTPUT_DIR}}`（Step 1 已定的绝对路径，直接用）：
1. `{{OUTPUT_DIR}}/requirements.md` —— 业务视角，**禁代码标识**。骨架与写作要点见 [references/requirements-format.md](references/requirements-format.md)。
2. `{{OUTPUT_DIR}}/design.md` —— 技术白盒，允许标识，**末尾含「陷阱与护栏」小节**。骨架与写作要点见 [references/design-format.md](references/design-format.md)。

两份写完各自按对应格式文件的「自检」过一遍（requirements 无代码标识；design 节齐全、陷阱条目过"模块替换测试"）。

### Step 3：报告

报告两份文档路径 + 概况（模块栈、核心实体数、场景数、陷阱条数）。

---

## 共享约定与变量

| 变量 | 含义 | 来源 |
|------|------|------|
| `{{MODULE_NAME}}` | kebab-case 模块名（也是输出子目录名） | Step 1 归一化 + 用户确认 |
| `{{MODULE_CN_NAME}}` | 中文模块名（两份文档 H1 标题） | 用户输入或 Step 1 轻量推断（grep `@Api(tags=)` / JavaDoc 中文名；推断不出用 kebab 占位） |
| `{{MODULE_SCOPE}}` | 扁平分层时的前缀范围+排除项 | Step 1 与用户敲定；有独立子包时为空 |
| `{{PROJECT_ROOT}}` | 项目根目录 | 当前工作目录 |
| `{{OUTPUT_DIR}}` | 产出目录 | 交互模式：`{{PROJECT_ROOT}}/docs/module-brief/{{MODULE_NAME}}/`；headless 模式（`$EVAL_HEADLESS=1`）：`$EVAL_OUT/{{MODULE_NAME}}/`（Step 1 用 `echo "$EVAL_OUT"` 解析为绝对路径） |

## 输出位置与产物

```
docs/module-brief/<module>/
├── requirements.md   # 业务视角（禁代码标识）
└── design.md         # 技术白盒（允许标识；末尾「陷阱与护栏」小节）
```

两份文档的骨架、抽象层次约束、写作要点：见 [references/requirements-format.md](references/requirements-format.md) 与 [references/design-format.md](references/design-format.md)。

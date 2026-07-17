# 设计：维护资产与 Skill 分家（`meta/` 元层目录）

> 2026-07-17 · 状态：待实施
> 目标：让 `skills/` 下每个 skill 目录只剩「装出去真正需要的东西」，维护治理资产迁入仓根 `meta/`；并加一条记忆，把断掉的发现路径补上。

## 1. 动机

本仓采「`skills/` = 发布面」约定，`npx skills add` **把整个 skill 目录原样拷到使用者的 agent skills 目录**。今天拷过去的不只 `SKILL.md` 与 `references/`，还有 925 行的 CHANGELOG、治理宪法、搁置项清单、覆盖账本、理论底座——对使用者全是杂物。

这一取舍在 [`docs/skill-跨平台发布指南.md`](../../skill-跨平台发布指南.md) §4「发布卫生注意点」第 2 条已被预判并登记为「属取舍，非必须」。本设计即拍板做这个取舍。

**代价是清醒的**：发布指南称移出会"破坏「自包含维护」模型"。需澄清——被破坏的是**维护便利**（账与 skill 同处一目录、一眼可见），**不是**仓里那条运行期自包含硬约束（[`recon-driven-dev/MAINTAINING.md`](../../../meta/recon-driven-dev/MAINTAINING.md) 改后验证 rubric A：「没引入外部 skill 调用 / 脚本 / 跨会话持久件依赖【唯一硬约束】」）。维护账本就不随运行载入，移走它不触碰运行期依赖。

## 2. 结构

仓根第三个顶层容器，与 `skills/`、`incubating/` 并列，**扁平**按 skill 名分子目录：

```
skill-forge/
  skills/<name>/        SKILL.md + references/ + README.md   ← 装出去的全部
  incubating/<name>/    同上（CLI 不发现、装不了）
  meta/<name>/          MAINTAINING / BACKLOG / COVERAGE / CHANGELOG / theory-foundation
  docs/                 面向人的文档（调研 / 指南 / specs）
```

**为什么扁平**（不按 `meta/skills/` + `meta/incubating/` 再分层）：skill 毕业时只 `git mv incubating/<name> skills/<name>`，账不用跟着搬。分层会把这个好处吃掉。

**为什么叫 `meta/`**：呼应仓库既有术语——`BACKLOG.md` / `COVERAGE.md` 开头就写着「**元层**维护资产，运行时不读」。`ledger/`（账本）语义偏窄，MAINTAINING 是治理宪法、theory-foundation 是理论底座，都不是「账」。

**发现机制安全性**：`npx skills` 只认带 `SKILL.md` 的目录（标准路径走 `skills/` 下一层，兜底才全仓递归）。`meta/` 下无 `SKILL.md`，即便 `--full-depth` 也不会被误认作 skill。

## 3. 迁移清单（15 个文件，`git mv` 保留历史）

### 移走

| skill | 文件 |
|---|---|
| `skills/codebase-exploration/` | MAINTAINING.md · BACKLOG.md · COVERAGE.md · CHANGELOG.md(925行) · theory-foundation.md |
| `skills/recon-driven-dev/` | MAINTAINING.md · BACKLOG.md · EVAL-COVERAGE.md · CHANGELOG.md |
| `skills/skill-tempering/` | MAINTAINING.md · theory-foundation.md |
| `skills/module-brief/` | CHANGELOG.md |
| `incubating/codex-code-review/` | BACKLOG.md |
| `incubating/module-spec-baseline/` | CHANGELOG.md |
| `incubating/test-case-authoring/` | CHANGELOG.md |

### 留下

`SKILL.md`、`references/`、`README.md`。`skills/codex-batch/`、`skills/codex-task/` 无维护文件，不受影响。

README 留下的理由：它是 GitHub 上进入 skill 目录时的门面，装出去后也是使用者的自述入口——是**面向读者**的，不是治理资产。

## 4. 指针改写（本设计的核心）

迁移后共 **37 处跨界指针**需处理，分三种形态（形态不同、危害不同、改法不同）：

| 形态 | 处数 | 例 | 迁移后果 |
|---|---|---|---|
| (a) markdown 链接 | **4** | `[theory-foundation.md](theory-foundation.md)` | **真断**——点开 404 |
| (b) code-span 路径 | **13** | `` 见 `../theory-foundation.md` #1 `` | 不是链接、不会"断"，但**路径已说谎** |
| (c) 纯文字提及 | **3** | 「理论依据唯一在 `theory-foundation.md`」 | 无路径，只需补元层标注 |
| (d) README 行 | **17** | 目录结构树 / 实测打磨节 | 描述与事实不符 |

(a)(b)(c) 合计 20 处落在**运行时会载入的文件**（SKILL.md + references/）里，(d) 17 处在 README。

原则是**按方向不对称处理**，因为两个方向的分发命运不同：

### 4.1 `skills/` → `meta/`：去路径化 + 诚实标注

`skills/` 下的文件**会被分发**，而使用者机器上没有 `meta/`。改成 `../../meta/…` 只会产出死链，比现状更糟。故统一改为**裸文件名 + 元层标注**——(a) 去掉 markdown 链接语法，(b) 去掉 `../` 前缀，(c) 补标注：

```diff
  # skills/skill-tempering/references/principles.md:43
- - **理论骨**：内省式自纠在缺外部信号时不可靠，常越纠越差——见 `../theory-foundation.md` #1。
+ - **理论骨**：内省式自纠在缺外部信号时不可靠，常越纠越差——见 `theory-foundation.md` #1（元层账，随仓不随装）。
```

**为什么这样不丢信息**：(a)(b)(c) 这 20 处**全部**是 provenance 型（"理据见" / "点名见" / "出处见"）或治理路由型（"改本 skill 自己时读"）指针——运行时 agent 都不需要点开。且承载内容本就自足：`principles.md` 每条已带"一句结论"，`SKILL.md:242/:285` 的括号注已含理据摘要（"reflexion map 必 resolve / code-intelligence 符号必派生可核"）。指针只是深挖入口，去路径后语义完整。（(d) README 的 17 处是面向人的描述、另循 §5。）

**不破坏单一权威源**（skill-tempering 自己的 #5 核）：权威源仍是同一个文件，只是换了位置。指针同步改写正是 [`skill-tempering/MAINTAINING.md`](../../../meta/skill-tempering/MAINTAINING.md) 既有纪律的要求——「动了某判据的家，按名引用它的地方同步改、别漏」。

逐处清单（形态编号见上表）：

| 文件 | 行 | 现状 | 形态 |
|---|---|---|---|
| `skills/codebase-exploration/SKILL.md` | 242 · 285 | `[theory-foundation.md](theory-foundation.md)` ×2 | a |
| `skills/recon-driven-dev/SKILL.md` | 116 | ``[`MAINTAINING.md`](MAINTAINING.md)`` | a |
| `skills/skill-tempering/SKILL.md` | 73 | ``[`MAINTAINING.md`](MAINTAINING.md)`` | a |
| `skills/skill-tempering/SKILL.md` | 10 · 52 | 「理论依据唯一在 `theory-foundation.md`」 | c |
| `skills/skill-tempering/references/principles.md` | 43 · 52 · 60 · 68 · 76 · 84 · 92 | `` `../theory-foundation.md` #1–#7 `` | b |
| `skills/skill-tempering/references/principles.md` | 3 | 文字提及 | c |
| `skills/skill-tempering/references/derivation-protocol.md` | 5 · 26 · 36 · 97 · 109 | `` `../theory-foundation.md` `` ×5 | b |
| `skills/skill-tempering/references/derivation-protocol.md` | 101 | `` `../MAINTAINING.md` §① 开放问题 3 `` | b |
| `skills/codebase-exploration/README.md` | 31–35 · 45 | 目录树 5 行 + `[MAINTAINING.md](MAINTAINING.md)` | d |
| `skills/recon-driven-dev/README.md` | 40–43 · 60 · 66 · 71 · 86 · 88 · 89 · 94 | 目录树 4 行 + 实测打磨节（见 §5） | d |

> 注意 (b) 类共 13 处**不是** markdown 链接而是 code span——它们不会产生 404，但 `../` 相对本文件位置已不成立，属**路径说谎**。同样必须改，理由是诚实而非死链。

### 4.2 `meta/` → `skills/`：改真实相对路径

`meta/` 下的文件**不分发**，只在仓库里被人和维护会话读。故这个方向**保留可点击链接**，改为真实跨目录路径：

```diff
  # meta/codebase-exploration/MAINTAINING.md
- 运行护栏（…）在 [SKILL.md](SKILL.md) 正文。
+ 运行护栏（…）在 [SKILL.md](../../skills/codebase-exploration/SKILL.md) 正文。
```

| 文件 | 处数 |
|---|---|
| `meta/codebase-exploration/MAINTAINING.md` | `](SKILL.md)` ×2 |
| `meta/recon-driven-dev/MAINTAINING.md` | `](SKILL.md)` ×2 |
| `meta/skill-tempering/MAINTAINING.md` | `](SKILL.md)` ×1 + `](references/…)` ×6 |

### 4.3 `meta/` 内部互指：不动

MAINTAINING ↔ BACKLOG ↔ COVERAGE ↔ CHANGELOG ↔ theory-foundation 一起搬，相对路径不变，**零改写**。这是扁平结构白捡的好处。

### 4.4 仓外与 docs 链接：不动

`meta/codebase-exploration/MAINTAINING.md` 的 `../../../../cbx-validation/targets.md`、各 CHANGELOG 的 `../../docs/…`——`meta/<name>/` 与 `skills/<name>/` 到仓根**同深度**，故相对路径**原有对错原样保留**：本来对的仍对，本来错的仍错（既有断链见 §9）。迁移既不修复也不制造这类链接。

## 5. README 瘦身

两个 README 的「目录结构」树列着即将移走的文件，需更新：删去已移走的行，加一行指向 `meta/<name>/`。

`skills/recon-driven-dev/README.md:60–94` 的**「实测打磨」整节**是维护者内容（协议指针 + 两段可复制的启动 Prompt）。其中两段 Prompt（:71「读该 skill 的 MAINTAINING.md」、:86「读 recon-driven-dev 的 MAINTAINING.md」）**移走后会直接失效**——它们让会话去 skill 目录读一个已经不在那儿的文件。

处置：

1. **两段 Prompt 迁入 `meta/recon-driven-dev/MAINTAINING.md`「实测打磨协议」节**——那里已经住着监督笔记模板与改进点清单模板，是同一个家，守单一权威源。
2. **README 只留一行指针**，不复述协议。
3. **Prompt 内路径全部绝对化**：`~/Projects/AI/skill-forge/meta/recon-driven-dev/MAINTAINING.md`。理由是硬的——**实测会话在被开发的那个项目里开**，相对路径无从解析；`README.md:78` 给「Skill 位置」时**已经**在用绝对路径，本次只是把同一实践贯彻到 MAINTAINING 路径上。

## 6. 配套改动

- **新增 `meta/README.md`**：写清约定——这是什么、为什么与 skill 分家（发布纯净）、`skills/` 里为何不留反向指针、毕业时账不用搬、新 skill 如何建账。
- **改 `docs/skill-跨平台发布指南.md`**：§「装的时候拷什么」现称"包括 MAINTAINING/BACKLOG/COVERAGE 这类维护内部文档"——已不成立，需更新；§4 第 2 条"维护文档随装 … 属取舍，非必须"改为记录**已采纳**的约定并指向 `meta/`。

## 7. 记忆

新增一条 `project` 型记忆（`~/.claude/projects/-Users-lilongjian-Projects-AI-skill-forge/memory/`）+ `MEMORY.md` 一行指针。

**内容**：优化 / 维护 skill-forge 里任何 skill 前，先读 `meta/<name>/` 下的历史账——MAINTAINING（治理宪法、改这个 skill 的纪律）、BACKLOG（已搁置项与待触发条件）、COVERAGE / EVAL-COVERAGE（验证覆盖与盲区）、CHANGELOG（改过什么、为什么）、theory-foundation（理论对标）。

**Why 必须写进记忆**：`skills/<name>/` 里**故意不留**任何指向 `meta/` 的可点击线索（§4.1，那正是纯净的代价）。发现路径被**主动切断**了——一个新会话打开 `SKILL.md` 想优化它，没有任何东西会告诉它 `meta/` 存在。记忆补的正是这个亲手制造的断口。这不是重复仓库已记录的信息，而是修复迁移引入的发现性缺口。

**How to apply**：动 SKILL.md / references 之前先读账；已搁置的判断不重开、已关闭的不复活、治理纪律（单一权威源 / 防膨胀 / 理论先行 / dogfood 协议）照旧适用。

关联既有记忆：`[[skill-optimization-anchor-trigger]]`（别被静态审计清单带偏、锚定真实问题）——两条互补：那条管「改什么」，这条管「改之前先读什么」。

## 8. 验收

1. **skill 目录干净**：`find skills/<name> -type f` 只剩 SKILL.md / README.md / references/*。
2. **无死链**：`grep -rnE '\]\((MAINTAINING|BACKLOG|CHANGELOG|COVERAGE|EVAL-COVERAGE|theory-foundation)\.md\)' skills/ incubating/` 结果为空；`grep -rn '\.\./theory-foundation\|\.\./MAINTAINING' skills/` 结果为空。
3. **meta/ 链接可解析**：`meta/` 下每个 markdown 相对链接目标存在。
4. **git 历史保留**：`git log --follow meta/<name>/MAINTAINING.md` 能看到迁移前的提交。
5. **记忆就位**：记忆文件 + `MEMORY.md` 指针各一。

## 9. 明确不在范围

`meta/codebase-exploration/CHANGELOG.md` 有 8 处指向 `docs/skill-design-philosophy.md`、`docs/module-worthiness-principle.md`、`docs/superpowers/specs/2026-06-21-…-design.md`——**这些文件都不存在**，且路径多写了一层（`../../../docs/` 应为 `../../docs/`）。这是**既有腐坏**，迁移前后同样断（同深度）。本次不修，避免范围蔓延；如需清理另开一轮。

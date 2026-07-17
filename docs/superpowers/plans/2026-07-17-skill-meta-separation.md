# 维护资产与 Skill 分家（`meta/` 元层目录）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `skills/` 与 `incubating/` 下每个 skill 目录里「与运行无关」的维护治理资产迁到仓根 `meta/<name>/`，让装出去的 skill 只剩 `SKILL.md` + `references/` + `README.md`。

**Architecture:** 15 个文件 `git mv` 到 `meta/<name>/`（扁平、不按 skills/incubating 分层）。37 处跨界指针**按方向不对称改写**：`skills/` 下的文件会被 `npx skills add` 分发、使用者机器上没有 `meta/`，故指向 meta 的指针一律**去掉链接语法、改裸文本路径**（改成 `../../meta/…` 只会造死链）；`meta/` 下的文件不分发，故指向 skills 的指针**保留可点击相对路径**。`meta/` 内部互指一起搬、零改写。最后加一条记忆，补上被刻意切断的发现路径。

**Tech Stack:** 纯 Markdown + git。无代码、无构建、无测试框架——验收靠 `find` 与 `grep` 的精确断言。

**Spec:** [2026-07-17-skill-meta-separation-design.md](../specs/2026-07-17-skill-meta-separation-design.md)

## Global Constraints

以下约束**每个任务都隐含适用**，值逐字取自 spec：

- **迁移一律用 `git mv`**，保留 `--follow` 历史。禁止 `rm` + 新建。
- **`skills/<name>/` 与 `incubating/<name>/` 迁移后只允许剩下**：`SKILL.md`、`references/`、`README.md`。
- **`skills/` → `meta/` 指针的唯一合法形态**：裸文本路径 `meta/<name>/<file>.md`，**不加 markdown 链接语法**、**不加 `../` 前缀**。**严禁**改写成 `../../meta/…`（分发后必死链，比现状更糟）。
- **`meta/` → `skills/` 指针的唯一合法形态**：真实相对路径 `](../../skills/<name>/…)`，保留可点击。
- **`meta/` 内部互指**（MAINTAINING ↔ BACKLOG ↔ COVERAGE ↔ CHANGELOG ↔ theory-foundation）：**一律不动**。
- **仓外链接与 `docs/` 链接：一律不动**。`meta/<name>/` 与 `skills/<name>/` 到仓根同深度，原有对错原样保留。spec §9 登记的既有断链（`CHANGELOG.md` 里 8 处指向不存在的 `docs/skill-design-philosophy.md` 等）**本次不修**。
- **提交只 `git add` 本任务明确列出的路径**。禁止 `git add -A` / `git add .`——工作区可能有会话前就存在的无关 WIP。每次 commit 前先 `git status --short` 确认暂存区。
- **分支**：`refactor/meta-separation`（已创建，spec 已提交在此分支）。

---

### Task 1: 迁 codebase-exploration（5 文件 + 10 处指针）

**Files:**
- Move: `skills/codebase-exploration/{MAINTAINING,BACKLOG,COVERAGE,CHANGELOG,theory-foundation}.md` → `meta/codebase-exploration/`
- Modify: `skills/codebase-exploration/SKILL.md:242,285`
- Modify: `skills/codebase-exploration/README.md:27-39,45`
- Modify: `meta/codebase-exploration/MAINTAINING.md:3,12`

**Interfaces:**
- Produces: `meta/` 目录本身（后续任务复用此约定）；指针改写的两种形态样板（去路径化 / 真实相对路径），Task 2–4 照此办理。

- [ ] **Step 1: 先跑验收断言，确认它现在是红的**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -rnE '\]\((MAINTAINING|BACKLOG|CHANGELOG|COVERAGE|theory-foundation)\.md\)' skills/codebase-exploration/
```

Expected: 命中 3 行（`SKILL.md:242`、`SKILL.md:285`、`README.md:45`）。这 3 处就是迁移后会 404 的死链。

- [ ] **Step 2: 建目录并迁移 5 个文件**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
mkdir -p meta/codebase-exploration
git mv skills/codebase-exploration/MAINTAINING.md meta/codebase-exploration/
git mv skills/codebase-exploration/BACKLOG.md meta/codebase-exploration/
git mv skills/codebase-exploration/COVERAGE.md meta/codebase-exploration/
git mv skills/codebase-exploration/CHANGELOG.md meta/codebase-exploration/
git mv skills/codebase-exploration/theory-foundation.md meta/codebase-exploration/
find skills/codebase-exploration -type f | sort
```

Expected 输出恰好 4 行：
```
skills/codebase-exploration/README.md
skills/codebase-exploration/SKILL.md
skills/codebase-exploration/references/example.md
skills/codebase-exploration/references/stack-recipes.md
```

- [ ] **Step 3: 改写 `skills/codebase-exploration/SKILL.md:242`（形态 a，去路径化）**

old_string：
```
（理据见 [theory-foundation.md](theory-foundation.md) §3 D6：reflexion map 必 resolve / code-intelligence 符号必派生可核）
```

new_string：
```
（理据见 meta/codebase-exploration/theory-foundation.md §3 D6：reflexion map 必 resolve / code-intelligence 符号必派生可核）
```

- [ ] **Step 4: 改写 `skills/codebase-exploration/SKILL.md:285`（形态 a）**

old_string：
```
理据见 [theory-foundation.md](theory-foundation.md) §3 D7。
```

new_string：
```
理据见 meta/codebase-exploration/theory-foundation.md §3 D7。
```

- [ ] **Step 5: 改写 `skills/codebase-exploration/README.md` 目录树（形态 d）**

old_string（第 27–39 行整块）：
````
```
codebase-exploration/
├── SKILL.md              # 运行脊柱 + 全部能力(① 模块测绘 / ⑤ 约定横切 / 信号配方层 / 产物 schema / 自检 · 权威)
├── README.md             # 本文件 · 总览与导航
├── MAINTAINING.md        # 维护宪法(改本 Skill 自己时读 · 纪律 / dogfood 协议 / 质量边界 · 不随运行载入)
├── BACKLOG.md            # 候选优化清单(D4/D5/②④ · 待触发条件 · 运行时不读)
├── COVERAGE.md           # dogfood 覆盖账本(项目×形态×维度 · 盲区可见 · 运行时不读)
├── CHANGELOG.md          # 变更日志(证据先行 · 已采纳的历史)
├── theory-foundation.md  # SAR 谱系理论底座(D4–D7+②④ 对标成熟项目 + 可借鉴范式 · 维护资产)
└── references/
    ├── example.md             # 读者卡片完整范例(虚构 TS 项目)
    └── stack-recipes.md       # 框架约定速查表(派生种子 · 新栈结晶进此、不回灌 SKILL.md)
```
````

new_string：
````
```
codebase-exploration/
├── SKILL.md              # 运行脊柱 + 全部能力(① 模块测绘 / ⑤ 约定横切 / 信号配方层 / 产物 schema / 自检 · 权威)
├── README.md             # 本文件 · 总览与导航
└── references/
    ├── example.md             # 读者卡片完整范例(虚构 TS 项目)
    └── stack-recipes.md       # 框架约定速查表(派生种子 · 新栈结晶进此、不回灌 SKILL.md)
```

> **维护治理资产不在本目录**——维护宪法 / 候选优化清单 / dogfood 覆盖账本 / 变更日志 / 理论底座是**元层账**(运行时不读),住在 skill-forge 仓的 `meta/codebase-exploration/`,**随仓、不随安装分发**。
````

- [ ] **Step 6: 改写 `skills/codebase-exploration/README.md:45`（形态 d）**

old_string：
```
**优化它**(在 skill-forge 仓):说「优化 codebase-exploration 的 X」(X = `BACKLOG.md` 某条 / 一个新痛点 / dogfood 浮出的问题)——维护流程(理论先行 → 改根因 → dogfood → 立 CHANGELOG)权威在 [MAINTAINING.md](MAINTAINING.md);开放候选看 `BACKLOG.md`、验证覆盖与盲区看 `COVERAGE.md`。
```

new_string：
```
**优化它**(在 skill-forge 仓):说「优化 codebase-exploration 的 X」(X = `BACKLOG.md` 某条 / 一个新痛点 / dogfood 浮出的问题)——维护流程(理论先行 → 改根因 → dogfood → 立 CHANGELOG)权威在 `meta/codebase-exploration/MAINTAINING.md`;开放候选看同目录 `BACKLOG.md`、验证覆盖与盲区看 `COVERAGE.md`。
```

- [ ] **Step 7: 改写 `meta/codebase-exploration/MAINTAINING.md:3`（反向，改真实相对路径）**

old_string：
```
运行护栏(慢变闸 / 完整性闸 §5.5.1 / §5.5 机械智能铁律 / D6 路径接地闸 / D7 scope 等)在 [SKILL.md](SKILL.md) 正文。
```

new_string：
```
运行护栏(慢变闸 / 完整性闸 §5.5.1 / §5.5 机械智能铁律 / D6 路径接地闸 / D7 scope 等)在 [SKILL.md](../../skills/codebase-exploration/SKILL.md) 正文。
```

- [ ] **Step 8: 改写 `meta/codebase-exploration/MAINTAINING.md:12`（反向）**

old_string：
```
- 完整定义在 [SKILL.md](SKILL.md)「灵魂」节,此处只锚、不复述。
```

new_string：
```
- 完整定义在 [SKILL.md](../../skills/codebase-exploration/SKILL.md)「灵魂」节,此处只锚、不复述。
```

- [ ] **Step 9: 跑验收断言，确认全绿**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
echo "--- A. skill 目录干净(期望恰好 4 个文件) ---"
find skills/codebase-exploration -type f | sort
echo "--- B. 无死链 / 无说谎路径(期望无输出) ---"
grep -rnE '\]\((MAINTAINING|BACKLOG|CHANGELOG|COVERAGE|theory-foundation)\.md\)|`\.\./(theory-foundation|MAINTAINING)\.md`' skills/codebase-exploration/ && echo "❌ 仍有残留" || echo "✅ 干净"
echo "--- C. 反向链接目标存在 ---"
test -f skills/codebase-exploration/SKILL.md && echo "✅ ../../skills/codebase-exploration/SKILL.md 可解析"
echo "--- D. git 历史保留 ---"
git log --oneline --follow meta/codebase-exploration/MAINTAINING.md | tail -1
```

Expected: A 恰好 4 行；B 输出 `✅ 干净`；C 输出 `✅`；D 能打出迁移前的旧提交（证明 `--follow` 追得到）。

- [ ] **Step 10: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/codebase-exploration meta/codebase-exploration
git status --short
git commit -m "$(cat <<'EOF'
refactor(meta): codebase-exploration 维护资产迁入 meta/

5 个元层文件(MAINTAINING/BACKLOG/COVERAGE/CHANGELOG/theory-foundation)
git mv 到 meta/codebase-exploration/,skill 目录只剩 SKILL.md + README.md
+ references/。

指针按方向改:SKILL.md:242/285 与 README:45 指向 meta 的改裸文本路径
(分发后使用者机器上没有 meta/,改 ../../meta/ 只会造死链);MAINTAINING.md
指回 SKILL.md 的改真实相对路径(meta/ 不分发,链接留着能点)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 迁 recon-driven-dev（4 文件 + 13 处指针 + 两段 Prompt 搬家）

**Files:**
- Move: `skills/recon-driven-dev/{MAINTAINING,BACKLOG,EVAL-COVERAGE,CHANGELOG}.md` → `meta/recon-driven-dev/`
- Modify: `skills/recon-driven-dev/SKILL.md:116`
- Modify: `skills/recon-driven-dev/README.md:36-94`（目录树 + 实测打磨节 + 两段启动 Prompt 迁出）
- Modify: `meta/recon-driven-dev/MAINTAINING.md:4,19`（反向链接）+ 文末追加「启动 Prompt」小节

**Interfaces:**
- Consumes: Task 1 确立的两种指针形态。
- Produces: `meta/recon-driven-dev/MAINTAINING.md`「实测打磨协议」节新增「启动 Prompt」小节，内含两段绝对路径 Prompt。

- [ ] **Step 1: 迁移 4 个文件**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
mkdir -p meta/recon-driven-dev
git mv skills/recon-driven-dev/MAINTAINING.md meta/recon-driven-dev/
git mv skills/recon-driven-dev/BACKLOG.md meta/recon-driven-dev/
git mv skills/recon-driven-dev/EVAL-COVERAGE.md meta/recon-driven-dev/
git mv skills/recon-driven-dev/CHANGELOG.md meta/recon-driven-dev/
find skills/recon-driven-dev -type f | sort
```

Expected 输出 12 行：`README.md`、`SKILL.md`、`references/` 下 7 个 md、`references/templates/` 下 3 个 md。

- [ ] **Step 2: 改写 `skills/recon-driven-dev/SKILL.md:116`（形态 a）**

old_string：
```
> 这些是**运行时**跨阶段硬约束(写给正在跑五阶段流水线的 AI)。**改本 Skill 自己**时的治理规则(防膨胀 / 单一权威源 / provenance 归处)是维护宪法、不随运行载入,见 [`MAINTAINING.md`](MAINTAINING.md)。
```

new_string：
```
> 这些是**运行时**跨阶段硬约束(写给正在跑五阶段流水线的 AI)。**改本 Skill 自己**时的治理规则(防膨胀 / 单一权威源 / provenance 归处)是维护宪法、不随运行载入,见 skill-forge 仓 `meta/recon-driven-dev/MAINTAINING.md`(元层账,不随安装分发)。
```

- [ ] **Step 3: 改写 `skills/recon-driven-dev/README.md` 目录树（形态 d）**

old_string（第 40–43 行，只删这 4 行）：
```
├── MAINTAINING.md              # 维护宪法(改本 Skill 自己时读 · 防膨胀/单一权威源/provenance · 不随运行载入)
├── BACKLOG.md                  # 候选优化清单(实测搁置项 · 运行时不读)
├── EVAL-COVERAGE.md            # 覆盖账本(32 路径单元 × 触发态 · 运行时不读)
├── CHANGELOG.md                # 变更日志
```

new_string：（空——整块删除，即把这 4 行直接去掉）

> 执行提示：用 Edit 把上面 4 行连同其后的换行一起替换为空字符串。删完后目录树里 `├── README.md` 的下一行应直接是 `└── references/`。

- [ ] **Step 4: 改写 `skills/recon-driven-dev/README.md:60`（实测打磨指针）**

old_string：
```
**实测打磨**(拿真实任务实测并优化本 Skill)怎么做——监督 / 分诊 / 验证 / 收敛——见 `MAINTAINING.md`「实测打磨协议」节;实测进度看 `EVAL-COVERAGE.md`、搁置项看 `BACKLOG.md`。
```

new_string：
```
> **维护治理资产不在本目录**——维护宪法 / 候选优化清单 / 覆盖账本 / 变更日志是**元层账**(运行时不读),住在 skill-forge 仓的 `meta/recon-driven-dev/`,**随仓、不随安装分发**。

**实测打磨**(拿真实任务实测并优化本 Skill)怎么做——监督 / 分诊 / 验证 / 收敛,连同两段可直接复制的启动 Prompt——权威在 `meta/recon-driven-dev/MAINTAINING.md`「实测打磨协议」节;实测进度看同目录 `EVAL-COVERAGE.md`、搁置项看 `BACKLOG.md`。
```

- [ ] **Step 5: 从 README 删除整个「如何开始」节**

该节全部内容是实测打磨的启动 Prompt（维护者内容），Step 6 整体迁入 MAINTAINING。

> **不要按行号定位**——Step 3 删了 4 行、Step 4 把 1 行改成 3 行，原文行号已漂。按下面的 old_string 内容锚定。

用 Edit 把以下整块（该节 + 其前的 `---` 分隔线，一直到文件末尾）替换为**空字符串**：

`````
---

## 如何开始(直接复制 Prompt)

前提:recon-driven-dev 已装到宿主的 skill 目录(Claude Code 默认 `~/.claude/skills/`;其它宿主按其约定),任何项目的会话都能调用。实测打磨分两个会话,各复制对应 Prompt、填好 `<…>` 即可——判据细则在 `MAINTAINING.md`「实测打磨协议」节,Prompt 只负责启动、不重述。

**① 实测会话**(在你要做开发的那个项目里开):

```text
用 recon-driven-dev skill 跑下面这个开发任务,并读该 skill 的 MAINTAINING.md
「实测打磨协议」、按其中「实测会话·监督协议」全程监督:每个 ⏸ 用 exception-only
方式记监督笔记(只在卡住/指令含糊/降级没走通时记一行带现场证据),整任务跑完后
派一个上下文隔离的复盘 sub-agent 补抓 skill 缺陷。监督笔记与改进点清单产出到
docs/recon-driven-dev-eval/<今天日期>-<任务短名>/。这一会话只跑、不要顺手改
skill 本身;结束时把改进点清单路径告诉我。

Skill 位置:`/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev`

开发任务:<在这里写你这次要做什么>
```

**② 打磨会话**(在 recon-driven-dev 所在的仓里开):

```text
读 recon-driven-dev 的 MAINTAINING.md「实测打磨协议」,按其中「打磨会话:分诊 →
处置 → 验证 → 沉淀」处理下面这份实测改进点清单:逐条三分诊(只有判为 skill 缺陷
的才改,任务特例/模型失误不动 skill)→ 按处置门槛决定当场改还是进 BACKLOG.md →
改完按改后验证 rubric 核 → 回填 EVAL-COVERAGE.md、采纳的沉 CHANGELOG.md。

改进点清单:<贴上一步产出的 improvements.md 路径或内容>
```

> 进度看 `EVAL-COVERAGE.md`:每格至少碰一次(地板)、被碰的格连续 2 轮不出新问题(天花板)=「实测到位」。第一轮真实实跑预计先把 ~19 个主干格从 `·未触发` 推到 `✓`。
`````

删除后 README 应以 Step 4 改写出的实测打磨指针段结尾。验证：

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
tail -3 skills/recon-driven-dev/README.md
grep -c '如何开始' skills/recon-driven-dev/README.md
```

Expected: `tail` 打出实测打磨指针段；`grep -c` 输出 `0`。

- [ ] **Step 6: 把两段 Prompt 迁入 `meta/recon-driven-dev/MAINTAINING.md` 文末**

在 `meta/recon-driven-dev/MAINTAINING.md` 的「收敛判定」节之后（文件末尾）追加：

````markdown

### 启动 Prompt（直接复制）

> 从 README 迁入(2026-07-17 元层分家)。实测打磨分两个会话,各复制对应 Prompt、填好 `<…>` 即可——判据细则在上面各节,Prompt 只负责启动、不重述。
> **路径一律绝对**:实测会话在**被开发的那个项目**里开,相对路径无从解析。

**① 实测会话**(在你要做开发的那个项目里开):

```text
用 recon-driven-dev skill 跑下面这个开发任务,并读
/Users/lilongjian/Projects/AI/skill-forge/meta/recon-driven-dev/MAINTAINING.md
「实测打磨协议」、按其中「实测会话·监督协议」全程监督:每个 ⏸ 用 exception-only
方式记监督笔记(只在卡住/指令含糊/降级没走通时记一行带现场证据),整任务跑完后
派一个上下文隔离的复盘 sub-agent 补抓 skill 缺陷。监督笔记与改进点清单产出到
docs/recon-driven-dev-eval/<今天日期>-<任务短名>/。这一会话只跑、不要顺手改
skill 本身;结束时把改进点清单路径告诉我。

Skill 位置:`/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev`

开发任务:<在这里写你这次要做什么>
```

**② 打磨会话**(在 skill-forge 仓里开):

```text
读 /Users/lilongjian/Projects/AI/skill-forge/meta/recon-driven-dev/MAINTAINING.md
「实测打磨协议」,按其中「打磨会话:分诊 → 处置 → 验证 → 沉淀」处理下面这份实测
改进点清单:逐条三分诊(只有判为 skill 缺陷的才改,任务特例/模型失误不动 skill)→
按处置门槛决定当场改还是进 meta/recon-driven-dev/BACKLOG.md → 改完按改后验证
rubric 核 → 回填 meta/recon-driven-dev/EVAL-COVERAGE.md、采纳的沉
meta/recon-driven-dev/CHANGELOG.md。

改进点清单:<贴上一步产出的 improvements.md 路径或内容>
```

> 进度看 `EVAL-COVERAGE.md`:每格至少碰一次(地板)、被碰的格连续 2 轮不出新问题(天花板)=「实测到位」。
````

- [ ] **Step 7: 改写 `meta/recon-driven-dev/MAINTAINING.md:4`（反向）**

old_string：
```
> 这里是**治理规则、不是运行护栏**:运行时跑五阶段流水线的 AI 不需要它们,故不放 SKILL.md 脊柱、不随运行载入。**运行护栏**(报告质量尺 / 回流禁 / 评审边界 / 事实订正等)在 [`SKILL.md`](SKILL.md) 的「全局护栏」。
```

new_string：
```
> 这里是**治理规则、不是运行护栏**:运行时跑五阶段流水线的 AI 不需要它们,故不放 SKILL.md 脊柱、不随运行载入。**运行护栏**(报告质量尺 / 回流禁 / 评审边界 / 事实订正等)在 [`SKILL.md`](../../skills/recon-driven-dev/SKILL.md) 的「全局护栏」。
```

- [ ] **Step 8: 改写 `meta/recon-driven-dev/MAINTAINING.md:19`（反向）**

old_string：
```
- 🔁 **为什么否决项目级持久件**——读了长期文档反而引入漂移与冲突,故否决持久 `CONTEXT.md` / ADR 库、不发持久编号。(运行约束本身——「不引入跨会话持久件、进度账本随归档清」——在 [`SKILL.md`](SKILL.md) 全局护栏。)
```

new_string：
```
- 🔁 **为什么否决项目级持久件**——读了长期文档反而引入漂移与冲突,故否决持久 `CONTEXT.md` / ADR 库、不发持久编号。(运行约束本身——「不引入跨会话持久件、进度账本随归档清」——在 [`SKILL.md`](../../skills/recon-driven-dev/SKILL.md) 全局护栏。)
```

- [ ] **Step 9: 跑验收断言**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
echo "--- A. skill 目录干净(期望 12 个文件、无 MAINTAINING/BACKLOG/EVAL-COVERAGE/CHANGELOG) ---"
find skills/recon-driven-dev -type f | sort
echo "--- B. 无死链 / 无说谎路径(期望无输出) ---"
grep -rnE '\]\((MAINTAINING|BACKLOG|CHANGELOG|EVAL-COVERAGE|theory-foundation)\.md\)|`\.\./(theory-foundation|MAINTAINING)\.md`' skills/recon-driven-dev/ && echo "❌ 仍有残留" || echo "✅ 干净"
echo "--- C. README 里不再有失效 Prompt(期望无输出) ---"
grep -n '读该 skill 的 MAINTAINING.md\|读 recon-driven-dev 的 MAINTAINING.md' skills/recon-driven-dev/README.md && echo "❌ 失效 Prompt 仍在 README" || echo "✅ 已迁出"
echo "--- D. Prompt 已落 MAINTAINING 且用绝对路径 ---"
grep -c '/Users/lilongjian/Projects/AI/skill-forge/meta/recon-driven-dev/MAINTAINING.md' meta/recon-driven-dev/MAINTAINING.md
echo "   (期望 ≥2 —— 两段 Prompt 各一)"
```

Expected: A 12 行且不含已迁走的 4 个文件；B `✅ 干净`；C `✅ 已迁出`；D 输出 ≥2。

- [ ] **Step 10: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/recon-driven-dev meta/recon-driven-dev
git status --short
git commit -m "$(cat <<'EOF'
refactor(meta): recon-driven-dev 维护资产迁入 meta/

4 个元层文件迁走。README 的「如何开始」整节(两段实测打磨启动 Prompt)
是维护者内容、且移走 MAINTAINING 后会直接失效(让会话去 skill 目录读一个
已不在那儿的文件),故整体迁入 MAINTAINING「实测打磨协议」——那里本就住着
监督笔记与改进点清单模板,同一个家、守单一权威源。

Prompt 内路径全部绝对化:实测会话在被开发的那个项目里开,相对路径无从
解析(README 原本给「Skill 位置」时就已用绝对路径,本次贯彻到 MAINTAINING
路径上)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 迁 skill-tempering（2 文件 + 21 处指针）

本任务指针最密——13 处 code-span 里有 12 处在此。

**Files:**
- Move: `skills/skill-tempering/{MAINTAINING,theory-foundation}.md` → `meta/skill-tempering/`
- Modify: `skills/skill-tempering/SKILL.md:10,52,73`
- Modify: `skills/skill-tempering/references/principles.md:3,43,52,60,68,76,84,92`
- Modify: `skills/skill-tempering/references/derivation-protocol.md:5,26,36,97,101,109`
- Modify: `meta/skill-tempering/MAINTAINING.md:3,20,21,22,23,33`（反向链接 ×7）

**Interfaces:**
- Consumes: Task 1 确立的两种指针形态。
- Produces: 无（末端任务）。

- [ ] **Step 1: 迁移 2 个文件**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
mkdir -p meta/skill-tempering
git mv skills/skill-tempering/MAINTAINING.md meta/skill-tempering/
git mv skills/skill-tempering/theory-foundation.md meta/skill-tempering/
find skills/skill-tempering -type f | sort
```

Expected 输出恰好 5 行（本 skill 没有 README）：
```
skills/skill-tempering/SKILL.md
skills/skill-tempering/references/audit-lens.md
skills/skill-tempering/references/derivation-protocol.md
skills/skill-tempering/references/evidence-lens.md
skills/skill-tempering/references/principles.md
```

- [ ] **Step 2: 改写 `skills/skill-tempering/SKILL.md:10`（形态 c）**

old_string：
```
路线 B 细则唯一在 `references/evidence-lens.md`，理论依据唯一在 `theory-foundation.md`。
```

new_string：
```
路线 B 细则唯一在 `references/evidence-lens.md`，理论依据唯一在 `meta/skill-tempering/theory-foundation.md`（元层账，随 skill-forge 仓、不随安装分发）。
```

- [ ] **Step 3: 改写 `skills/skill-tempering/SKILL.md:52`（形态 c）**

old_string：
```
> 每条"理论骨"展开一句结论 + 出处，唯一在 `theory-foundation.md`（按 `#1`–`#7` 对位）——要查"这条凭什么成立"去那里，**不在 principles.md 与本脊柱重述理论**。
```

new_string：
```
> 每条"理论骨"展开一句结论 + 出处，唯一在 `meta/skill-tempering/theory-foundation.md`（按 `#1`–`#7` 对位；元层账，随仓不随装）——要查"这条凭什么成立"去那里，**不在 principles.md 与本脊柱重述理论**。
```

- [ ] **Step 4: 改写 `skills/skill-tempering/SKILL.md:73`（形态 a）**

old_string：
```
> 这些是跑 skill-tempering 时的运行约束。**改本 skill 自己**时的治理（防膨胀 / 单一权威源 / 结晶闸落地）属维护宪法、不随运行载入，见 [`MAINTAINING.md`](MAINTAINING.md)。
```

new_string：
```
> 这些是跑 skill-tempering 时的运行约束。**改本 skill 自己**时的治理（防膨胀 / 单一权威源 / 结晶闸落地）属维护宪法、不随运行载入，见 `meta/skill-tempering/MAINTAINING.md`（元层账，随仓不随装）。
```

- [ ] **Step 5: 改写 `references/principles.md:3`（形态 c）**

old_string：
```
后续 `derivation-protocol.md` / `audit-lens.md` / `SKILL.md` / `theory-foundation.md` 一律引用本文件的 `#1`–`#7`，**全仓不再二次定义**（守 #5：单一权威源）。
```

new_string：
```
后续 `derivation-protocol.md` / `audit-lens.md` / `SKILL.md` / `theory-foundation.md` 一律引用本文件的 `#1`–`#7`，**全仓不再二次定义**（守 #5：单一权威源）。
>
> **理论骨出处的位置**：下文各条「理论骨」指向的 `theory-foundation.md` 是**元层账**，住在 skill-forge 仓的 `meta/skill-tempering/`——随仓、**不随安装分发**。故下文只给文件名、不给相对路径（给了在装出去的副本里也解析不到）。
```

- [ ] **Step 6: 改写 `references/principles.md` 的 7 条理论骨（形态 b，逐条去 `../`）**

7 处逐条 Edit，`old_string` → `new_string` 只去掉 `../` 前缀：

| 行 | old_string | new_string |
|---|---|---|
| 43 | ``常越纠越差——见 `../theory-foundation.md` #1。`` | ``常越纠越差——见 `theory-foundation.md` #1。`` |
| 52 | ``无界自我循环是已知反模式——见 `../theory-foundation.md` #2。`` | ``无界自我循环是已知反模式——见 `theory-foundation.md` #2。`` |
| 60 | ``而非只规定顺利情形——见 `../theory-foundation.md` #3。`` | ``而非只规定顺利情形——见 `theory-foundation.md` #3。`` |
| 68 | ``两者错配即缺陷——见 `../theory-foundation.md` #4。`` | ``两者错配即缺陷——见 `theory-foundation.md` #4。`` |
| 76 | ``抗漂移的结构地基——见 `../theory-foundation.md` #5。`` | ``抗漂移的结构地基——见 `theory-foundation.md` #5。`` |
| 84 | ``欠触发是常见失配——见 `../theory-foundation.md` #6。`` | ``欠触发是常见失配——见 `theory-foundation.md` #6。`` |
| 92 | ``是分发模型的地基——见 `../theory-foundation.md` #7。`` | ``是分发模型的地基——见 `theory-foundation.md` #7。`` |

验证 7 处全改完：

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -c '`\.\./theory-foundation\.md`' skills/skill-tempering/references/principles.md
```
Expected: `0`

- [ ] **Step 7: 改写 `references/derivation-protocol.md` 的 6 处（形态 b）**

先在文件头部（第 5 行那段引用块之前）加一次元层说明。old_string：
```
> **为什么不是清单 / 分类器**：枚举「skill 类型」或「判别轴」都是开放集——每来一个新型 skill 就冒新维度，可机械兜住任意 skill 的固定脚手架并不存在（见 `../theory-foundation.md`）。
```

new_string：
```
> **元层引用说明**：本文件「点名见」指向的 `theory-foundation.md` 与 `MAINTAINING.md` 是**元层账**，住在 skill-forge 仓的 `meta/skill-tempering/`——随仓、**不随安装分发**，故下文只给文件名、不给相对路径。
>
> **为什么不是清单 / 分类器**：枚举「skill 类型」或「判别轴」都是开放集——每来一个新型 skill 就冒新维度，可机械兜住任意 skill 的固定脚手架并不存在（见 `theory-foundation.md`）。
```

再逐条去 `../`：

| 行 | old_string 片段 | new_string 片段 |
|---|---|---|
| 26 | ``借工业先例 `domains` 嗅探思路（点名见 `../theory-foundation.md`）。`` | ``借工业先例 `domains` 嗅探思路（点名见 `theory-foundation.md`）。`` |
| 36 | ``借先例「Match the Form to the Failure」（点名见 `../theory-foundation.md`）`` | ``借先例「Match the Form to the Failure」（点名见 `theory-foundation.md`）`` |
| 97 | ``借工业先例（新规则先挂 pending、引入仲裁角色；点名见 `../theory-foundation.md`）。`` | ``借工业先例（新规则先挂 pending、引入仲裁角色；点名见 `theory-foundation.md`）。`` |
| 101 | ``（此点的落地强度仍是开放问题，见 `../MAINTAINING.md` §① 开放问题 3）`` | ``（此点的落地强度仍是开放问题，见 `MAINTAINING.md` §① 开放问题 3）`` |
| 109 | ``（借无障碍标准的"部分符合"先例，点名见 `../theory-foundation.md`）`` | ``（借无障碍标准的"部分符合"先例，点名见 `theory-foundation.md`）`` |

验证：

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -c '`\.\./\(theory-foundation\|MAINTAINING\)\.md`' skills/skill-tempering/references/derivation-protocol.md
```
Expected: `0`

- [ ] **Step 8: 改写 `meta/skill-tempering/MAINTAINING.md` 的 7 处反向链接**

| 行 | old_string 片段 | new_string 片段 |
|---|---|---|
| 3 | `在 [SKILL.md](SKILL.md) 与 [references/](references/) 各自的家。` | `在 [SKILL.md](../../skills/skill-tempering/SKILL.md) 与 [references/](../../skills/skill-tempering/references/) 各自的家。` |
| 20 | `→ 只在 [references/principles.md](references/principles.md)。` | `→ 只在 [references/principles.md](../../skills/skill-tempering/references/principles.md)。` |
| 21 | `→ 只在 [references/derivation-protocol.md](references/derivation-protocol.md)。` | `→ 只在 [references/derivation-protocol.md](../../skills/skill-tempering/references/derivation-protocol.md)。` |
| 22 | `→ 只在 [references/audit-lens.md](references/audit-lens.md)。` | `→ 只在 [references/audit-lens.md](../../skills/skill-tempering/references/audit-lens.md)。` |
| 23 | `→ 只在 [references/evidence-lens.md](references/evidence-lens.md)（模板复用 audit-lens、不另造）。` | `→ 只在 [references/evidence-lens.md](../../skills/skill-tempering/references/evidence-lens.md)（模板复用 audit-lens、不另造）。` |
| 33 | `**这道闸的判据全文在 [references/derivation-protocol.md §⑤](references/derivation-protocol.md)，本文件不复述。**` | `**这道闸的判据全文在 [references/derivation-protocol.md §⑤](../../skills/skill-tempering/references/derivation-protocol.md)，本文件不复述。**` |

> 第 19 行 `[theory-foundation.md](theory-foundation.md)` 与第 28 行同款**不动**——`theory-foundation.md` 与 MAINTAINING 一起搬进 `meta/skill-tempering/`，内部互指相对路径不变（Global Constraints）。

- [ ] **Step 9: 跑验收断言**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
echo "--- A. skill 目录干净(期望恰好 5 个文件) ---"
find skills/skill-tempering -type f | sort
echo "--- B. 无死链 / 无说谎路径(期望无输出) ---"
grep -rnE '\]\((MAINTAINING|theory-foundation)\.md\)|`\.\./(theory-foundation|MAINTAINING)\.md`' skills/skill-tempering/ && echo "❌ 仍有残留" || echo "✅ 干净"
echo "--- C. meta 内部互指未被误改(期望 2 行,裸 theory-foundation.md 链接) ---"
grep -n '](theory-foundation.md)' meta/skill-tempering/MAINTAINING.md
echo "--- D. 反向链接目标全部存在 ---"
for p in SKILL.md references/principles.md references/derivation-protocol.md references/audit-lens.md references/evidence-lens.md; do
  test -f "skills/skill-tempering/$p" && echo "  ✅ $p" || echo "  ❌ $p 不存在"
done
```

Expected: A 恰好 5 行；B `✅ 干净`；C 打出 2 行（第 19、28 行，证明内部互指按约束保持原样）；D 全 `✅`。

- [ ] **Step 10: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/skill-tempering meta/skill-tempering
git status --short
git commit -m "$(cat <<'EOF'
refactor(meta): skill-tempering 维护资产迁入 meta/

MAINTAINING + theory-foundation 迁走。本 skill 指针最密:principles.md 8 处、
derivation-protocol.md 6 处、SKILL.md 3 处。

其中 12 处是 code span(`../theory-foundation.md`)而非 markdown 链接——它们
不会 404,但迁移后 ../ 已不成立、属路径说谎,同样改。principles.md 与
derivation-protocol.md 各在文件头加一次元层说明,正文只留裸文件名(守 #5:
权威源仍是同一个文件,只是换了位置)。

MAINTAINING 内部指向 theory-foundation 的链接不动(两者一起搬、相对路径不变)。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 迁 module-brief + incubating 三个（4 文件，零指针）

这四个文件无任何跨界指针（已核：`module-brief/CHANGELOG.md` 与三个 incubating 文件均无相对链接），纯搬家。

**Files:**
- Move: `skills/module-brief/CHANGELOG.md` → `meta/module-brief/`
- Move: `incubating/codex-code-review/BACKLOG.md` → `meta/codex-code-review/`
- Move: `incubating/module-spec-baseline/CHANGELOG.md` → `meta/module-spec-baseline/`
- Move: `incubating/test-case-authoring/CHANGELOG.md` → `meta/test-case-authoring/`

**Interfaces:**
- Consumes: `meta/` 约定（Task 1 建立）。
- Produces: 无。

- [ ] **Step 1: 迁移 4 个文件**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
mkdir -p meta/module-brief meta/codex-code-review meta/module-spec-baseline meta/test-case-authoring
git mv skills/module-brief/CHANGELOG.md meta/module-brief/
git mv incubating/codex-code-review/BACKLOG.md meta/codex-code-review/
git mv incubating/module-spec-baseline/CHANGELOG.md meta/module-spec-baseline/
git mv incubating/test-case-authoring/CHANGELOG.md meta/test-case-authoring/
```

- [ ] **Step 2: 跑验收断言**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
echo "--- A. 四个源目录已无维护文件(期望无输出) ---"
find skills/module-brief incubating/codex-code-review incubating/module-spec-baseline incubating/test-case-authoring \
  -maxdepth 1 -name 'CHANGELOG.md' -o -maxdepth 1 -name 'BACKLOG.md' | grep . && echo "❌ 仍有残留" || echo "✅ 干净"
echo "--- B. 四个文件已落 meta/ ---"
ls meta/module-brief/ meta/codex-code-review/ meta/module-spec-baseline/ meta/test-case-authoring/
echo "--- C. 这四个文件确实无跨界指针(期望无输出) ---"
grep -rnE '\]\([^)h]' meta/module-brief/ meta/codex-code-review/ meta/module-spec-baseline/ meta/test-case-authoring/ && echo "⚠️ 发现相对链接,需人工判断" || echo "✅ 无相对链接"
```

Expected: A `✅ 干净`；B 各目录一个文件；C `✅ 无相对链接`。

- [ ] **Step 3: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add skills/module-brief incubating meta/module-brief meta/codex-code-review meta/module-spec-baseline meta/test-case-authoring
git status --short
git commit -m "$(cat <<'EOF'
refactor(meta): module-brief 与 incubating 三个 skill 的账迁入 meta/

四个文件无跨界指针,纯搬家。incubating 的账也一并迁——扁平 meta/ 的意义
就在于毕业时(git mv incubating/x skills/x)账不用跟着搬,留在原地就把这个
好处吃掉了。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `meta/README.md` + 发布指南更新

**Files:**
- Create: `meta/README.md`
- Modify: `docs/skill-跨平台发布指南.md`（「装的时候拷什么」段 + §4 第 2 条）

**Interfaces:**
- Consumes: Task 1–4 落成的 `meta/` 结构。
- Produces: 约定的书面权威源，Task 6 的记忆指向它。

- [ ] **Step 1: 写 `meta/README.md`**

````markdown
# meta/ — 元层维护资产

> 每个 skill 的**治理宪法 / 候选优化清单 / 覆盖账本 / 变更史 / 理论底座**住这里，**不住 skill 目录**。
> 运行时一律不读；给**改 skill 自己**的人和会话读。

## 为什么和 skill 分家

`npx skills add` 把**整个 `skills/<name>/` 目录**原样拷到使用者的 agent skills 目录（见 [发布指南](../docs/skill-跨平台发布指南.md)「装的时候拷什么」）。维护账留在 skill 目录里，就会连同 925 行的 CHANGELOG、治理宪法、搁置项清单一起装到别人机器上——对使用者全是杂物。

分家的代价是清醒的：**skill 目录里刻意不留任何指向 `meta/` 的可点击链接**。因为那种链接在装出去的副本里必然 404（使用者机器上没有 `meta/`），比不给更糟。`SKILL.md` / `references/` 里的指针一律写成**裸文本路径** `meta/<name>/<file>.md`——不是链接，但说得清位置。

被牺牲掉的是「账与 skill 同处一目录、一眼可见」的**维护便利**。**没有**牺牲的是运行期自包含（那条硬约束说的是「不引入外部 skill 调用 / 脚本 / 跨会话持久件依赖」，见 `meta/recon-driven-dev/MAINTAINING.md` 改后验证 rubric A）——维护账本就不随运行载入，移走它不触碰运行期依赖。

## 结构

```
meta/<skill-name>/
├── MAINTAINING.md        # 治理宪法:改这个 skill 时的纪律
├── BACKLOG.md            # 候选优化清单 + 待触发条件
├── COVERAGE.md           # 验证覆盖账本(recon-driven-dev 叫 EVAL-COVERAGE.md)
├── CHANGELOG.md          # 变更史(改了什么、为什么)
└── theory-foundation.md  # 理论底座 / 对标谱系
```

**扁平**——不按 `skills/` / `incubating/` 分层。理由：skill 毕业时只 `git mv incubating/<name> skills/<name>`，账不用跟着搬。

不是每个 skill 都齐五件；按需建，缺的就是没有。

## 指针纪律（两个方向不对称）

| 方向 | 形态 | 为什么 |
|---|---|---|
| `skills/` → `meta/` | 裸文本 `meta/<name>/<file>.md`，**无链接语法** | skills/ 会被分发，链接到 meta/ 必 404 |
| `meta/` → `skills/` | 真实相对路径 `](../../skills/<name>/…)`，可点击 | meta/ 不分发，链接在仓里点得开 |
| `meta/` 内部互指 | 裸文件名 `](MAINTAINING.md)` | 同目录，一起搬、路径不变 |

## 新增一个 skill 的账

`mkdir meta/<name>/`，按需建文件。不必凑齐五件——`skills/codex-batch`、`skills/codex-task` 至今没有账，也没问题。

## 优化某个 skill 时

先读 `meta/<name>/` 全部内容，再动 `skills/<name>/`。skill 目录里**没有任何线索**会告诉你这里存在（那是分家的代价），所以这一步靠纪律，不靠发现。
````

- [ ] **Step 2: 改发布指南「装的时候拷什么」段**

old_string：
```
`npx skills add` 把**整个 skill 目录**拷到对方 agent 的 skills 目录（如 Claude Code 的 `.claude/skills/<名>/`），并在项目里生成 `skills-lock.json`（记录已装版本，可 `npx skills experimental_install` 复现）。**目录里所有文件都会被拷**——包括 references、也包括 MAINTAINING/BACKLOG/COVERAGE 这类维护内部文档（无害、运行时不载入，但是给使用者的杂物）。
```

new_string：
```
`npx skills add` 把**整个 skill 目录**拷到对方 agent 的 skills 目录（如 Claude Code 的 `.claude/skills/<名>/`），并在项目里生成 `skills-lock.json`（记录已装版本，可 `npx skills experimental_install` 复现）。**目录里所有文件都会被拷**——所以本仓已把维护内部文档（MAINTAINING / BACKLOG / COVERAGE / CHANGELOG / theory-foundation）**全部移出 skill 目录**、迁到仓根 [`meta/<名>/`](../meta/)（2026-07-17）。现在 `skills/<名>/` 里只剩 `SKILL.md` + `references/` + `README.md`，装出来即干净。
```

- [ ] **Step 3: 改发布指南 §4 第 2 条**

old_string：
```
2. **维护文档随装**：见上「装的时候拷什么」。要装出来干净，得把维护文档移出 skill 目录（会破坏「自包含维护」模型）或确认 CLI 是否支持忽略文件——属取舍，非必须。
```

new_string：
```
2. **维护文档已移出**（2026-07-17 采纳，原登记为「属取舍，非必须」）：维护宪法 / 候选清单 / 覆盖账本 / 变更史 / 理论底座已全部迁到仓根 [`meta/<名>/`](../meta/)，约定见 [`meta/README.md`](../meta/README.md)。装出来的 skill 目录只剩 `SKILL.md` + `references/` + `README.md`。
   - 代价：牺牲了「账与 skill 同处一目录」的**维护便利**（不是运行期自包含——那条说的是不引入外部 skill / 脚本依赖，维护账本就不随运行载入）。
   - 连带纪律：`skills/` 下的文件**不得**用 markdown 链接指向 `meta/`（装出去必 404），一律裸文本路径。两个方向的指针形态见 `meta/README.md`。
```

- [ ] **Step 4: 跑验收断言**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
echo "--- A. meta/README.md 存在 ---"
test -f meta/README.md && echo "✅" || echo "❌"
echo "--- B. 发布指南不再声称维护文档随装(期望无输出) ---"
grep -n '也包括 MAINTAINING/BACKLOG/COVERAGE 这类维护内部文档\|属取舍，非必须' docs/skill-跨平台发布指南.md && echo "❌ 旧措辞仍在" || echo "✅ 已更新"
echo "--- C. meta/README.md 里的相对链接可解析 ---"
test -f docs/skill-跨平台发布指南.md && echo "  ✅ ../docs/skill-跨平台发布指南.md"
test -f meta/recon-driven-dev/MAINTAINING.md && echo "  ✅ meta/recon-driven-dev/MAINTAINING.md"
echo "--- D. 发布指南里指向 meta/ 的链接可解析 ---"
test -d meta && echo "  ✅ ../meta/"
test -f meta/README.md && echo "  ✅ ../meta/README.md"
```

Expected: A `✅`；B `✅ 已更新`；C、D 全 `✅`。

- [ ] **Step 5: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add meta/README.md docs/skill-跨平台发布指南.md
git status --short
git commit -m "$(cat <<'EOF'
docs(meta): meta/README 约定 + 发布指南同步

meta/README.md 立约定:为什么分家、两个方向的指针形态不对称、扁平结构
(毕业时账不用搬)、新 skill 怎么建账。

发布指南两处已不成立的措辞同步:「装的时候拷什么」不再说维护文档随装;
§4 第 2 条从「属取舍,非必须」改为记录已采纳的取舍 + 连带纪律。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 记忆 + 全局验收

**Files:**
- Create: `/Users/lilongjian/.claude/projects/-Users-lilongjian-Projects-AI-skill-forge/memory/skill-meta-ledger.md`
- Modify: `/Users/lilongjian/.claude/projects/-Users-lilongjian-Projects-AI-skill-forge/memory/MEMORY.md`

**Interfaces:**
- Consumes: Task 1–5 的全部落地。
- Produces: 跨会话的发现入口（本次迁移刻意切断了 skill 目录里的线索，这条记忆是唯一补救）。

- [ ] **Step 1: 写记忆文件**

写 `/Users/lilongjian/.claude/projects/-Users-lilongjian-Projects-AI-skill-forge/memory/skill-meta-ledger.md`：

```markdown
---
name: skill-meta-ledger
description: 优化 skill-forge 里任何 skill 前，先读 meta/<name>/ 的历史账——skill 目录里刻意不留指向它的线索
metadata:
  type: project
---

skill-forge 仓里每个 skill 的**元层账**住在仓根 `meta/<name>/`，**不在** `skills/<name>/`（2026-07-17 迁）：`MAINTAINING.md`（治理宪法：改这个 skill 的纪律）、`BACKLOG.md`（已搁置项 + 待触发条件）、`COVERAGE.md` / `EVAL-COVERAGE.md`（验证覆盖与盲区）、`CHANGELOG.md`（改过什么、为什么）、`theory-foundation.md`（理论对标）。约定见 `meta/README.md`。

**Why:** `skills/<name>/` 会被 `npx skills add` 整目录拷给使用者，账留在里面就是杂物，故迁走。代价是 skill 目录里**刻意不留任何指向 `meta/` 的可点击线索**（那种链接在装出去的副本里必然 404，比不给更糟）——发现路径是**被主动切断的**。打开 `SKILL.md` 想优化它时，没有任何东西会告诉你 `meta/` 存在。这条记忆就是补这个亲手制造的断口。

**How to apply:** 动 `skills/<name>/SKILL.md` 或 `references/` 之前，先读 `meta/<name>/` 全部内容。已搁置的判断不重开、已关闭的不复活、治理纪律（单一权威源 / 防膨胀 / 理论先行 / dogfood 协议）照旧适用。改完按 MAINTAINING 的验证 rubric 核，采纳的沉 CHANGELOG、搁置的沉 BACKLOG。另注意指针纪律：`skills/` → `meta/` 只能用裸文本路径，不能用 markdown 链接。

与 [[skill-optimization-anchor-trigger]] 互补：那条管「改什么」（锚定真实撞到的问题、别被静态审计清单带偏），这条管「改之前先读什么」。
```

- [ ] **Step 2: 在 `MEMORY.md` 加一行指针**

在 `/Users/lilongjian/.claude/projects/-Users-lilongjian-Projects-AI-skill-forge/memory/MEMORY.md` 末尾追加：

```markdown
- [skill 元层账在 meta/](skill-meta-ledger.md) — 优化任何 skill 前先读 meta/<name>/ 的历史账;skill 目录里刻意不留指向它的线索(发布纯净的代价)
```

- [ ] **Step 3: 全局验收（spec §8 五条逐条过）**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
echo "=========== 1. skill 目录干净 ==========="
for d in skills/*/; do
  n=$(find "$d" -maxdepth 1 -type f \( -name 'MAINTAINING.md' -o -name 'BACKLOG.md' -o -name 'CHANGELOG.md' -o -name 'COVERAGE.md' -o -name 'EVAL-COVERAGE.md' -o -name 'theory-foundation.md' \) | wc -l | tr -d ' ')
  [ "$n" = "0" ] && echo "  ✅ $d" || echo "  ❌ $d 仍有 $n 个维护文件"
done
for d in incubating/*/; do
  n=$(find "$d" -maxdepth 1 -type f \( -name 'MAINTAINING.md' -o -name 'BACKLOG.md' -o -name 'CHANGELOG.md' -o -name 'COVERAGE.md' -o -name 'theory-foundation.md' \) | wc -l | tr -d ' ')
  [ "$n" = "0" ] && echo "  ✅ $d" || echo "  ❌ $d 仍有 $n 个维护文件"
done

echo "=========== 2. 无死链 / 无说谎路径 ==========="
grep -rnE '\]\((MAINTAINING|BACKLOG|CHANGELOG|COVERAGE|EVAL-COVERAGE|theory-foundation)\.md\)' skills/ incubating/ && echo "  ❌ 有 markdown 死链" || echo "  ✅ 无 markdown 死链"
grep -rn '`\.\./theory-foundation\.md`\|`\.\./MAINTAINING\.md`' skills/ incubating/ && echo "  ❌ 有说谎的 ../ 路径" || echo "  ✅ 无说谎路径"
grep -rn '](../../meta/' skills/ incubating/ && echo "  ❌ 违反纪律:skills/ 里出现指向 meta/ 的链接" || echo "  ✅ 无违纪链接"

echo "=========== 3. meta/ 反向链接可解析 ==========="
grep -rhoE '\]\(\.\./\.\./skills/[^)]*\)' meta/ | tr -d ')' | sed 's/^](\.\.\/\.\.\///' | sort -u | while read p; do
  test -e "$p" && echo "  ✅ $p" || echo "  ❌ $p 不存在"
done

echo "=========== 4. git 历史保留 ==========="
git log --oneline --follow meta/codebase-exploration/MAINTAINING.md | tail -1
git log --oneline --follow meta/skill-tempering/theory-foundation.md | tail -1

echo "=========== 5. 记忆就位 ==========="
M=/Users/lilongjian/.claude/projects/-Users-lilongjian-Projects-AI-skill-forge/memory
test -f "$M/skill-meta-ledger.md" && echo "  ✅ 记忆文件" || echo "  ❌ 记忆文件缺失"
grep -q 'skill-meta-ledger' "$M/MEMORY.md" && echo "  ✅ MEMORY.md 指针" || echo "  ❌ MEMORY.md 无指针"
```

Expected: 1、2、3、5 全 `✅`；4 各打出一行迁移前的旧提交 hash。

- [ ] **Step 4: 装一份到临时目录，实证「装出来是干净的」**

这是本次改造的**真正验收**——前面都是 grep 静态断言，这一步看真实落地文件。

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
rm -rf /private/tmp/claude-501/-Users-lilongjian-Projects-AI-skill-forge/*/scratchpad/probe 2>/dev/null
P=$(mktemp -d)
cp -R skills/codebase-exploration "$P/"
echo "--- 模拟装出来的落地文件 ---"
find "$P" -type f | sed "s|$P/||" | sort
rm -rf "$P"
```

Expected 恰好 4 行，无任何维护文件：
```
codebase-exploration/README.md
codebase-exploration/SKILL.md
codebase-exploration/references/example.md
codebase-exploration/references/stack-recipes.md
```

> 注：此处用 `cp -R` 模拟 `npx skills add` 的拷贝行为（CLI 是整目录拷，见发布指南）。真装需先 push 到 GitHub，非必须。

- [ ] **Step 5: 提交（记忆在仓外，只提交仓内产物）**

记忆文件在 `~/.claude/` 下、不属本仓，无需提交。本步确认工作区干净即可：

```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git status --short
git log --oneline main..HEAD
```

Expected: `git status --short` 无输出（Task 1–5 已全部提交）；`git log` 打出 6 个提交（spec + Task 1–5）。

若 `git status` 有残留改动，说明前面某步漏提交——按所属任务补 `git add <该任务路径>` 后提交，**不要** `git add -A`。

---

## 完成后

全部 6 个任务跑完，可用 superpowers:finishing-a-development-branch 决定合并方式（本分支 `refactor/meta-separation` → `main`）。

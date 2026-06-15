# recon-driven-dev-inline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **本计划是 Skill 创作（markdown 文档），非代码项目。** 没有 pytest——每个任务的"测试"就是规格 §8 的**验收门**（grep / 存在性 / 内容检查）。"先写失败测试"在此读作"先跑会失败的验收门，确认目标文件/字符串尚不存在，再产出使其通过"。

**Goal:** 把 `recon-driven-dev` fork 成 `recon-driven-dev-inline`——一个零外部 Skill 依赖、自包含的轻量四阶段开发轨。

**Architecture:** 镜像原 Skill 结构（方案 A）。① 和 ③ 近乎原样拷贝（仅做派发降级措辞与路径清理），② 和 ④ 把原来"委托 superpowers"的点改写成内联契约（gates + 非显性陷阱块）。内置 sub-agent 派发（Task/Explore/原生 worktree 工具）予以保留并配主上下文降级，因其是 harness 内置、不影响可移植性。

**Tech Stack:** Markdown。源文件在 `skills/recon-driven-dev/`，产物在 `skills/recon-driven-dev-inline/`。规格：[docs/superpowers/specs/2026-06-15-recon-driven-dev-inline-design.md](../specs/2026-06-15-recon-driven-dev-inline-design.md)。

**路径改写口径（贯穿全计划）:** fork 内对自身 reference 的引用，统一改写为 fork 自身的绝对路径 `~/.claude/skills/recon-driven-dev-inline/...`（与原 Skill 用绝对路径的惯例一致、最稳）。

---

## File Structure

```
skills/recon-driven-dev-inline/
├── SKILL.md                      # 四阶段正文；①③ 拷贝+小改，②④ 重写为内联契约（Task 4）
├── README.md                     # 自己的总览/导航，全部改名（Task 5）
├── CHANGELOG.md                  # v0.1.0；诚实定性=工程收益(可移植)、冻结快照（Task 6）
└── references/
    ├── review-agent.md           # ③ 判据单一权威；拷贝 + 改写硬编码模板路径（Task 2）
    └── templates/
        ├── requirements.md       # ② 业务模板；干净拷贝（Task 1）
        └── review.md             # ③ 评审模板；拷贝 + 改写硬编码判据路径（Task 3）
```

**任务顺序理由:** 先建目录骨架 + 干净拷贝（Task 1），再处理两个含隐藏路径依赖的拷贝（Task 2-3），再写最大的 SKILL.md（Task 4），然后 README/CHANGELOG（Task 5-6），最后整树验收门扫一遍（Task 7）。

源文件绝对根：`/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev`（下称 `$SRC`）
产物绝对根：`/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev-inline`（下称 `$DST`）

---

### Task 1: 骨架 + 干净拷贝 requirements 模板

**Files:**
- Create: `skills/recon-driven-dev-inline/references/templates/requirements.md`

`$SRC/references/templates/requirements.md` 内部**无任何跨 skill 路径**（只引用"同目录 design.md / review.md"，是通用相对措辞），可原样拷贝。

- [ ] **Step 1: 跑会失败的验收门（确认目标尚不存在）**

Run: `ls skills/recon-driven-dev-inline/references/templates/requirements.md 2>&1`
Expected: `No such file or directory`

- [ ] **Step 2: 建目录并拷贝**

```bash
mkdir -p skills/recon-driven-dev-inline/references/templates
cp skills/recon-driven-dev/references/templates/requirements.md \
   skills/recon-driven-dev-inline/references/templates/requirements.md
```

- [ ] **Step 3: 验收门——文件在、无外部/源 skill 引用**

Run:
```bash
ls skills/recon-driven-dev-inline/references/templates/requirements.md && \
grep -rniE 'recon-driven-dev|superpowers|feature-dev' \
  skills/recon-driven-dev-inline/references/templates/requirements.md; echo "exit=$?"
```
Expected: 文件路径打印出来；grep **无任何输出**（`exit=1` 表示 0 命中）。

- [ ] **Step 4: Commit**

```bash
git add skills/recon-driven-dev-inline/references/templates/requirements.md
git commit -m "recon-driven-dev-inline: requirements 模板（干净拷贝）"
```

---

### Task 2: 拷贝 + 改写 review-agent.md（③ 判据，隐藏路径依赖 #1）

**Files:**
- Create: `skills/recon-driven-dev-inline/references/review-agent.md`

`$SRC/references/review-agent.md` 第 18 行含硬编码绝对路径**指回源 skill**：
`~/.claude/skills/recon-driven-dev/references/templates/review.md`
——必须改写为 fork 自身，否则运行时静默读源 skill 的文件。

- [ ] **Step 1: 跑会失败的验收门**

Run: `ls skills/recon-driven-dev-inline/references/review-agent.md 2>&1`
Expected: `No such file or directory`

- [ ] **Step 2: 拷贝**

```bash
cp skills/recon-driven-dev/references/review-agent.md \
   skills/recon-driven-dev-inline/references/review-agent.md
```

- [ ] **Step 3: 改写硬编码模板路径**

在 `skills/recon-driven-dev-inline/references/review-agent.md` 中精确替换：

old:
```
- 写 `review.md`，落三份输入文档的同目录（模板：`~/.claude/skills/recon-driven-dev/references/templates/review.md`；四块判据结论 + 逐条发现 + 三档总体结论 + 修订清单）。
```
new:
```
- 写 `review.md`，落三份输入文档的同目录（模板：`~/.claude/skills/recon-driven-dev-inline/references/templates/review.md`；四块判据结论 + 逐条发现 + 三档总体结论 + 修订清单）。
```

- [ ] **Step 4: 验收门——本文件 0 处指回源 skill**

Run: `grep -n 'recon-driven-dev' skills/recon-driven-dev-inline/references/review-agent.md; echo "exit=$?"`
Expected: 无输出，`exit=1`（0 命中）。

- [ ] **Step 5: Commit**

```bash
git add skills/recon-driven-dev-inline/references/review-agent.md
git commit -m "recon-driven-dev-inline: review-agent.md（拷贝+路径改写）"
```

---

### Task 3: 拷贝 + 改写 review.md 模板（隐藏路径依赖 #2）

**Files:**
- Create: `skills/recon-driven-dev-inline/references/templates/review.md`

`$SRC/references/templates/review.md` 第 4 行含硬编码绝对路径指回源 skill：
`~/.claude/skills/recon-driven-dev/references/review-agent.md`。

- [ ] **Step 1: 跑会失败的验收门**

Run: `ls skills/recon-driven-dev-inline/references/templates/review.md 2>&1`
Expected: `No such file or directory`

- [ ] **Step 2: 拷贝**

```bash
cp skills/recon-driven-dev/references/templates/review.md \
   skills/recon-driven-dev-inline/references/templates/review.md
```

- [ ] **Step 3: 改写硬编码判据指针**

精确替换：

old:
```
> 判据与结论档位见 `~/.claude/skills/recon-driven-dev/references/review-agent.md`，本表只填结论与发现。
```
new:
```
> 判据与结论档位见 `~/.claude/skills/recon-driven-dev-inline/references/review-agent.md`，本表只填结论与发现。
```

- [ ] **Step 4: 验收门**

Run: `grep -n 'recon-driven-dev' skills/recon-driven-dev-inline/references/templates/review.md; echo "exit=$?"`
Expected: 无输出，`exit=1`。

- [ ] **Step 5: Commit**

```bash
git add skills/recon-driven-dev-inline/references/templates/review.md
git commit -m "recon-driven-dev-inline: review.md 模板（拷贝+路径改写）"
```

---

### Task 4: SKILL.md（fork：①③ 小改、②④ 重写、护栏反转、命名空间）

**Files:**
- Create: `skills/recon-driven-dev-inline/SKILL.md`（先整文件拷贝自源，再施加下列精确编辑）

这是核心任务。先拷贝整份原 SKILL.md，再按 **E1–E10** 逐条编辑。每条给 old→new；②④ 给完整新正文。

- [ ] **Step 1: 跑会失败的验收门**

Run: `ls skills/recon-driven-dev-inline/SKILL.md 2>&1`
Expected: `No such file or directory`

- [ ] **Step 2: 整文件拷贝**

```bash
cp skills/recon-driven-dev/SKILL.md skills/recon-driven-dev-inline/SKILL.md
```

- [ ] **Step 3 (E1): frontmatter 改名 + 描述**

old:
```
name: recon-driven-dev
description: 开发任务的轻量四阶段流程(定向分析→需求设计→评审→落地) **本 Skill 不自动触发，由用户显式调用。**
```
new:
```
name: recon-driven-dev-inline
description: 开发任务的轻量四阶段流程(定向分析→需求设计→评审→落地) · 自包含零外部依赖。**本 Skill 不自动触发，由用户显式调用。**
```

- [ ] **Step 4 (E2): H1 + 开场段（自包含定位）**

old:
```
# recon-driven-dev（侦察驱动开发 · 轻量四阶段工作流）

一条**即时开发轨**:开头做一份只针对本次改动的"摸底",喂给后面的需求、设计、评审、实现。
```
new:
```
# recon-driven-dev-inline（侦察驱动开发 · 轻量自包含四阶段工作流）

一条**即时开发轨**:开头做一份只针对本次改动的"摸底",喂给后面的需求、设计、评审、实现。**自包含、零外部 Skill 依赖**——②④ 的能力内联在本 Skill 内,丢到任何环境都能独立跑。
```

- [ ] **Step 5 (E3): 流程图 ② ④ 两行去委托措辞**

old:
```
② 需求+设计  据①(参考非上限,可自行补探),委托 brainstorming → requirements.md + design.md
```
new:
```
② 需求+设计  据①(参考非上限,可自行补探),内联对话澄清需求与设计 → requirements.md + design.md
```

old:
```
④ 落地       拆 tasks.md ⏸ → 全委托 superpowers 跑实现链(含分支收口)→ 文档归档 ⏸
```
new:
```
④ 落地       拆 tasks.md ⏸ → 内置实现链(隔离工作区 + TDD + 实现期评审 + 收口)→ 文档归档 ⏸
```

- [ ] **Step 6 (E4): 删硬前置、改自包含说明**

old:
```
**前置**:②④ 委托 superpowers 的子技能(具体见各节),是**唯一硬前置**。开跑前看本会话可用 skill 清单:没有 superpowers 就**不开轨**——告知用户本 Skill 依赖它,引导先装好(`/plugin`)再来。
```
new:
```
**自包含**:本 Skill **不依赖任何外部插件**(无 superpowers / feature-dev 硬前置)。①③④ 用到的 sub-agent 派发都是 harness 内置能力(`Task`/`Explore`/原生 worktree 工具),且一律配主上下文降级——环境没有就降级、不阻断开轨。
```

- [ ] **Step 7 (E5): ① 钻取外包子节——去 code-explorer、改两级降级**

替换原 `### 钻取外包（软依赖,内联判断）` 整个子节（从该标题起，至 `这是软依赖:有更强的就用,没有就降级。` 行止）。

old（整段）:
```
### 钻取外包（软依赖,内联判断）

翻代码的体力活(实际去搜"谁调用了这个 Service"、追调用链)**派给钻取 sub-agent**,别在主上下文亲自 grep——避免主对话被一堆中间检索结果污染。派之前看本会话可用的 skill / agent 清单,据此选:

- **清单里有 `feature-dev:code-explorer` → 用它**(自带追执行路径 / 映射分层的成熟方法论,钻取更结构化)。
- **没有 → 降级到内置 `Explore`**(零依赖、最可移植)。

这是软依赖:有更强的就用,没有就降级。
```
new（整段）:
```
### 钻取外包（内置派发,两级降级）

翻代码的体力活(实际去搜"谁调用了这个 Service"、追调用链)**优先派给钻取 sub-agent**,别在主上下文亲自 grep——避免主对话被一堆中间检索结果污染。降级阶梯:

- **有内置 `Explore` / 通用 sub-agent(`Task`)→ 派给它**(零依赖、最可移植;把检索噪声挡在主上下文外)。
- **都没有 → 主 agent 自己 grep / 追链**(零依赖地板;尽量别把中间检索灌进主叙事)。

报告契约与质量门**与跑在哪一级无关**——派发只是执行方式,输出形态(下文四样)不变。
```

- [ ] **Step 8 (E6): 整段替换 ② 节**

把从 `## ② 需求 + 设计 → ...` 标题起、到该节末（`**⏸**——即 brainstorming 谈完...` 那行止）的整节，替换为：

```
## ② 需求 + 设计 → `requirements.md` + `design.md`（做决定）

**职责**:据 ① 的现状定"要什么"和"改哪些 / 怎么改"。**边界**:① 是参考起点、**不是权威上限**——需求一细化就可能够到 ① 没覆盖的代码,**该自行补探就探**;自己探到的、① **没写的新面**记进 `design.md`(前向),**不回写已封存的 directed-report**(唯一例外:证伪 ① 的事实主张时就地「事实订正」,见护栏)。**接棒纪律**见下。代码既有的坑在 ① 里、这儿不重列。

带着定向报告这个上下文,**在主对话里内联谈细需求与设计**(不依赖任何外部技能),**谈完一次产出两份**。

**对话契约(怎么谈)**:
- **一次一个问题**澄清(优先多选),聚焦目的 / 约束 / 成功标准——这层喂 `requirements.md`。
- 定方案前**提 2-3 个不同方案**带取舍,领头给推荐 + 理由,别一头扎进第一个解法。
- **分节呈现设计**,每节确认再往下,别一次甩完只问一遍。

**三条硬规则(强模型为"帮上忙"最爱跳过,必须明写)**:
- **HARD GATE**:呈现需求 + 设计并经**用户**(非模型自判)批准前,**不写任何实现 / 脚手架 / 代码**。
- **"太简单不需要设计" override**:该门适用于**每个**任务——单函数工具、配置改动、todo 列表也一样,不许以"这个很简单"自行豁免。
- **范围分解触发器**:若请求横跨多个独立子系统,**先分解**(列独立块、关系、build 顺序),别花澄清问题去细化一个该拆的项目;分解后逐个子项目走本轨。

**两份产物**:
- `requirements.md` —— 业务视角:要做成什么、约束、验收标准。形态见 `~/.claude/skills/recon-driven-dev-inline/references/templates/requirements.md`。
- `design.md` —— **本 Skill 自己产出设计内容**(没有外部技能代劳):
  - **设计本体**:架构 / 数据流 / 关键决策 + 取舍 / 风险——在此对话谈出,按复杂度伸缩(简单的几句、有讲究的多写),扎根现有代码模式,只改服务本次目标的代码、不顺手大重构。
  - **① 锚定层**:圈定要改的契约子集 + 自行补探到 ① 没列的新发现(③ 的"定向报告验收"要拿这层跟 ① 的实答逐条对)。
  - **不设僵化分节骨架**——按上面两块的内容要求写,别套死"必须有哪几节"的模板。

**② 接棒纪律**:据 ① 的 `[未核验]` 条目做改动决策前,**先据手段补验**(升 `[实测]` 或推翻);够不着则在 `design.md` **显式记**「此决策建于未核验推断 X」——别让 ① 留标记放行的软推断在这儿被无声当真。

**② 自评(仅轻量卫生扫描)**:出两份前扫一遍占位符(TBD / 待定 / 无理由的"本次不涉及")、内部矛盾、真歧义(能两种读法的挑一种写死)、范围蔓延,就地修。**只扫这四类、不复跑 ③ 的判据**(深度评审是 ③ 的活,这儿重复 = 第二权威源)。

**⏸**:两份产出后暂停让用户过目;别在这道停点之外再叠一道。
```

- [ ] **Step 9 (E7): 整段替换 ④ 节（含 heading）**

把从 `## ④ 落地（全委托 superpowers 实现链 + 文档归档）` 标题起、到该节末（`**⏸ 收尾前确认**。` 行止）的整节，替换为：

```
## ④ 落地（内置实现链 · gates + 非显性陷阱块）

③ 通过的 design 在本 Skill 内**内联落地**(不委托任何外部技能)。按下列 gates 推进,每个 gate 写的是**要达成什么 / 何时停**——具体怎么做(TDD 红绿步骤、git / worktree 命令)模型自己会,不在此教。

**Gates(依序)**:

1. **拆 `tasks.md`**(落本次目录),把 design 拆成小而独立、各自可测、各自一个 commit 的任务。**⏸ 用户审计划**——写码前最便宜的拦截点,审过再往下。
2. **clean-baseline gate**:进工作区后**先跑一次现有测试确认绿底,再写新码**;红底 → **停下问**用户(继续 / 先查)——否则分不清新坏旧坏。
3. **ISOLATE gate**:别直接在 main / master 上动手。顺序——**先检测是否已隔离 → 优先用原生 worktree 工具**(如 `EnterWorktree`)**→ 没有才 `git worktree` 兜底**;普通 checkout 里建 worktree 前先征得用户同意(除非已声明偏好)。
4. **TDD 铁律**:每个特性 / 修复**先写失败测试 → 亲眼看它按预期失败 → 写最小代码转绿(输出干净)→ 重构保持绿**。修 bug 先用失败测试复现。
5. **per-task 两阶段评审(按序)**:每个任务实现 + commit 后——**① 先 spec 符合性评审**(不缺、**不过度造**额外没要的东西)**② 再代码质量评审**;有发现 → 改 → **复评**,任一阶段未清不进下一任务。**这道评审区别于 ② 自评、也区别于 ③**(③ 评设计,这里评每个已实现任务对设计的符合度)。
6. **continuous execution**:开跑后一路做到底,**别在任务间反复问"要继续吗"**;只在 blocker(缺依赖 / 反复验证失败 / 指令不清 / 计划有洞)时**停下**——计划错**上报用户**、别静默绕过。
7. **FINISH 闭合菜单**:全部任务做完后——**先复验全测试绿 → 检测工作区 / 分支态 → 给固定闭合菜单**(本地合并 / push+PR / 保留原样 / 丢弃;若 detached-HEAD / 外部托管则**去掉"本地合并"**)**→ 精确执行所选一项**。**绝不在收尾抛开放式"接下来干嘛"**。
8. **归档**(链外):分支收口后把本次目录移进 `docs/recon-driven-dev-inline/_archived/`(目录名已带日期、直接移;产物文档是否 commit 按所在仓惯例一并定)。**⏸ 收尾前确认**。

**非显性陷阱(模型不会主动想到,保留)**:
- **worktree 检测假阳性**:`GIT_DIR != GIT_COMMON` 在 **submodule** 里也成立 → 下结论前用 `git rev-parse --show-superproject-working-tree` 排除(返回路径 = 在 submodule、按普通仓处理)。
- **项目内 `.worktrees/`** 须**先 gitignore 并提交**,再在其下建 worktree(否则 worktree 内容被提交进仓);用 `git check-ignore` 验。harness / 全局托管的目录不必查。
- **收口顺序**:要集成则**先合并 → 在合并结果上验测试 → 再移除 worktree → 最后删分支**(先删分支会因 worktree 仍引用而失败)。
- **清理 provenance 门**:**只清你自己建的** worktree;push+PR 与"保留原样"两档**必须留着** worktree(用户要据 PR 反馈迭代);只在合并 / 丢弃两档清;`git worktree remove` 前先 `cd` 回主仓根、再 `git worktree prune`。
- **丢弃需打字确认**(如用户键入 `discard`)才执行任何破坏性删除,别凭一句随口的"行"就强删分支 / 移 worktree。
- **TDD 反合理化红旗**:「待会儿测 / 已手测过 / 太简单不用测 / 删码可惜 / TDD 教条我务实」一律是**红旗、非豁免**;若生产代码先于失败测试写了,**删掉重来**(别"留作参考"或"改改用")。测**真实行为**而非 mock 调用次数;一个测试一个行为;难测 = 设计味道(解耦 / 注入依赖)、非跳过理由。
- **独立子仓 caveat**:代码在被 `.gitignore` 排除的独立子仓里时,worktree / 提交 / 收口都对**子仓**做(对容器仓做盖不到子仓里的代码)。
- **false-① -premise pause**:实现中若发现 design 建在 ① 的错误前提上——**暂停、surface 给用户**(续做 / 回 ②③),按护栏「事实订正」留痕,别静默绕过、也别自行重判。

**执行方式**:默认主上下文内联跑。若改用 sub-agent 逐任务实现,**须附交接护栏**:每个 sub-agent 给**全任务文本 + 场景上下文**(别让它读计划文件或继承会话史);同一工作区**不并行**跑多个实现 agent;卡住的 agent **别静默原样重派**——换更多上下文 / 更强模型 / 更小任务。
```

- [ ] **Step 10 (E8): 反转护栏 142（design.md 骨架）**

old:
```
- ❌ **别给 `design.md` 套内容骨架 / 复述 brainstorming 的设计产出**——架构 / 数据流 / 决策由它谈出,lite 只补 ① 锚定层(要改的契约子集 + 补探新发现);规定 design.md "该写哪几节" = 抢 brainstorming 的活、多一个权威源。
```
new:
```
- ❌ **别给 `design.md` 套死内容骨架**——设计内容(架构 / 数据流 / 决策 / 风险)由 ② 对话谈出(本 Skill 自产、无外部技能代劳),另补 ① 锚定层(要改的契约子集 + 补探新发现);但"谈出"不等于"套模板",规定 design.md "必须有哪几节"会把它压成填表——形态按复杂度伸缩,内容由对话生成。
```

- [ ] **Step 11 (E9): 反转护栏 146（④ 实现链）**

old:
```
- ❌ **别在 ④ 驱动 / 重排 superpowers 的实现链**——可**点名链的节点**(writing-plans→选执行→worktree→实现→finishing)当 lite 注意事项的挂点,但**别逐步重教每步怎么做**(=复制 + 多权威源、被它版本变动牵连);每个节点只挂 superpowers 导不出的 override / 护栏,实现节奏整条交回它(实现中推翻 ① 事实 → 走「事实订正」,不算重排)。
```
new:
```
- ❌ **④ 的实现步骤本 Skill 内联拥有**(拆计划→审→隔离工作区→TDD→两阶段评审→收口→归档)——**别把它再委托给外部技能,也别在既定 gates / 停点之外加冗余评审**;实现中推翻 ① 事实走「事实订正」、动摇设计就暂停 surface,不自动重判。④ 写的是 gates(达成什么 / 何时停)与非显性陷阱,**别退化成 TDD / git 的机制教程**(那些模型自己会)。
```

- [ ] **Step 12 (E10): 命名空间 replace-all + 残留名清理**

```bash
# 产物目录命名空间（含 _archived 子串一并改到）
perl -0pi -e 's{docs/recon-dev/}{docs/recon-driven-dev-inline/}g' skills/recon-driven-dev-inline/SKILL.md
# 兜底：SKILL.md 内任何残留的源 skill 名（如还有相对/绝对引用）
perl -0pi -e 's{recon-driven-dev}{recon-driven-dev-inline}g' skills/recon-driven-dev-inline/SKILL.md
```
注：原 ③ 节对 `references/review-agent.md` 是**相对引用**，无需改；上面第二条 perl 是兜底，确保 frontmatter 之外无残留。

- [ ] **Step 13: 验收门——SKILL.md 自包含**

Run:
```bash
echo "--- 源 skill 名残留（期望 0）---"; grep -n 'recon-driven-dev' skills/recon-driven-dev-inline/SKILL.md; echo "exit=$?"
echo "--- 委托措辞残留（期望 0）---"; grep -nE '委托|全委托|superpowers|feature-dev' skills/recon-driven-dev-inline/SKILL.md; echo "exit=$?"
echo "--- 旧目录残留（期望 0）---"; grep -n 'docs/recon-dev/' skills/recon-driven-dev-inline/SKILL.md; echo "exit=$?"
echo "--- ② 硬规则在（期望 命中）---"; grep -nE 'HARD GATE|太简单|范围分解触发器' skills/recon-driven-dev-inline/SKILL.md
echo "--- ④ gates 在（期望 命中）---"; grep -nE 'clean-baseline|ISOLATE gate|两阶段评审|FINISH 闭合菜单' skills/recon-driven-dev-inline/SKILL.md
echo "--- 事实订正在（期望 命中）---"; grep -n '事实订正' skills/recon-driven-dev-inline/SKILL.md
```
Expected: 前三个 grep **无输出**（`exit=1`）；后三个 grep **有命中**。

- [ ] **Step 14: Commit**

```bash
git add skills/recon-driven-dev-inline/SKILL.md
git commit -m "recon-driven-dev-inline: SKILL.md（①③ 小改、②④ 内联重写、护栏反转、命名空间）"
```

---

### Task 5: README.md（自己的总览/导航）

**Files:**
- Create: `skills/recon-driven-dev-inline/README.md`

不拷贝原版 README（它含 superpowers 硬前置说明、版本表、谱系措辞，且引用原名）。新写一份精简的。

- [ ] **Step 1: 跑会失败的验收门**

Run: `ls skills/recon-driven-dev-inline/README.md 2>&1`
Expected: `No such file or directory`

- [ ] **Step 2: 写 README.md（完整内容）**

写入 `skills/recon-driven-dev-inline/README.md`：

```markdown
# recon-driven-dev-inline（侦察驱动开发 · 轻量自包含四阶段工作流）

开发任务的**轻量四阶段流程**：定向分析 → 需求设计 → 评审 → 落地。开头做一份只针对本次改动的"摸底"，喂给后面的需求、设计、评审、实现。

> **本 Skill 不自动触发，由用户显式调用。** 完整规则见 [SKILL.md](SKILL.md)，本文件只做总览与导航。

---

## 这是什么

一条**即时开发轨**：不先摸清楚就拍方案，十有八九漏掉"原来别处也在用这张表"这类坑，等写代码才发现要返工。用一份用完即弃的定向摸底兜住这类遗漏。

**自包含 · 零外部 Skill 依赖**：②（需求设计）和 ④（落地）的能力都**内联在本 Skill 内**——不依赖 superpowers / feature-dev 等外部插件，丢到任何环境都能独立跑。①③④ 用到的 sub-agent 派发都是 harness 内置能力（`Task`/`Explore`/原生 worktree 工具），且一律配主上下文降级。

四阶段，每阶段结束**暂停**等用户确认。产物落本次改动目录 `docs/recon-driven-dev-inline/<YYYY-MM-DD>-<change-name>/`，收尾时连目录一起归档进 `docs/recon-driven-dev-inline/_archived/`。

```
① 定向分析   一句话粗需求 → 钻落点 + 消费面(全集) → directed-report.md
             ⏸ 过报告质量门（① 自守，防空转的真牙）
② 需求+设计  据①，内联对话澄清需求与设计 → requirements.md + design.md
             ⏸
③ 评审       派发评审 sub-agent → 综合质量门（三维度 + 定向报告验收）→ review.md
             ⏸
④ 落地       拆 tasks.md ⏸ → 内置实现链（隔离 + TDD + 实现期评审 + 收口）→ 文档归档 ⏸
```

`①→②③` 线性不回流，各阶段在自己出口守住产物质量；**事实订正**是唯一例外（见 SKILL.md 护栏）。

---

## 目录结构

```
recon-driven-dev-inline/
├── SKILL.md                 # 流程正文（权威规则）
├── README.md                # 本文件 · 总览与导航
├── CHANGELOG.md             # 变更日志
└── references/
    ├── review-agent.md      # ③ 评审 sub-agent 本体（判据单一权威）
    └── templates/
        ├── requirements.md  # ② 业务需求模板
        └── review.md        # ③ 评审模板（纯填空，判据归 review-agent.md）
```

---

## 与 recon-driven-dev 的关系

本 Skill 是 `recon-driven-dev` 的**自包含 fork**：去掉"编排外部 Skill"的角色，把 ②④ 委托 superpowers 的点改写成内联契约，做到零外部依赖、可移植。①③ 的判据与四样报告契约沿用原版。这是**冻结快照**，不追踪上游演进；详见 [CHANGELOG.md](CHANGELOG.md)。
```

- [ ] **Step 3: 验收门**

Run:
```bash
ls skills/recon-driven-dev-inline/README.md && \
grep -nE '委托 (superpowers|brainstorming)|全委托|硬前置' skills/recon-driven-dev-inline/README.md; echo "委托措辞 exit=$?"
```
Expected: 文件在；委托措辞 grep 无输出（`exit=1`）。（README "与…的关系"一节提到 `recon-driven-dev` 与 `superpowers` 属 provenance 叙述，允许出现——见 Task 7 的精确门。）

- [ ] **Step 4: Commit**

```bash
git add skills/recon-driven-dev-inline/README.md
git commit -m "recon-driven-dev-inline: README"
```

---

### Task 6: CHANGELOG.md（v0.1.0 · 诚实定性 + 冻结快照）

**Files:**
- Create: `skills/recon-driven-dev-inline/CHANGELOG.md`

- [ ] **Step 1: 跑会失败的验收门**

Run: `ls skills/recon-driven-dev-inline/CHANGELOG.md 2>&1`
Expected: `No such file or directory`

- [ ] **Step 2: 写 CHANGELOG.md（完整内容）**

写入 `skills/recon-driven-dev-inline/CHANGELOG.md`：

```markdown
# CHANGELOG

记 what + why，不写过程流水账。

## v0.1.0 — 初版（自包含 fork）

**主题**：从 `recon-driven-dev` fork 出零外部依赖的自包含版。

**what**：
- 去掉"编排外部 Skill"的角色。② 把"委托 `superpowers:brainstorming`"改写成**内联对话契约**（一次一问 → 2-3 方案 → 分节呈现；HARD GATE / "太简单"override / 范围分解触发器；`design.md` 内容由本 Skill 自产）。④ 把"全委托 superpowers 实现链"改写成**内联 gates + 非显性陷阱块**（拆计划⏸ → clean-baseline → ISOLATE（优先原生 worktree 工具）→ TDD 铁律 → per-task 两阶段评审 → continuous execution → FINISH 闭合菜单 → 归档）。
- ① 去掉 `feature-dev:code-explorer` 软依赖，收成"内置 Explore/Task 派发 → 主上下文 grep"两级降级。③ 沿用评审 sub-agent + 判据单一权威（`review-agent.md`），并**改写两条原指回源 skill 的硬编码路径**为 fork 自身。
- 产物目录改用自有命名空间 `docs/recon-driven-dev-inline/`，与原版零撞车。
- 护栏：反转"design.md 骨架"与"④ 实现链"两条（原版理由建于 superpowers 存在，fork 已无外部链可委托）。

**why**：可移植性——要在没装 superpowers 的环境里也能跑完整条轨。

**诚实定性**：本版相对原版是**工程收益（可移植 / 零依赖 / 自包含），非能力跃升**。流程编排件、触发稳定，不跑定量 benchmark。

**冻结快照**：①③ 与模板是从 `recon-driven-dev`（v1.5.x 期）复制而来——这违背"超集应共用一份文件"的去重原则，是**可移植性 vs 单一权威源的有意取舍**（零依赖就无法与宿主共享一份文件）。本 fork 定位为**冻结快照，不自动追踪上游**；上游若有重要演进，按需手动回灌。
```

- [ ] **Step 3: 验收门——诚实定性与冻结快照都在**

Run: `grep -nE '工程收益|冻结快照|可移植' skills/recon-driven-dev-inline/CHANGELOG.md`
Expected: 三个词都有命中。

- [ ] **Step 4: Commit**

```bash
git add skills/recon-driven-dev-inline/CHANGELOG.md
git commit -m "recon-driven-dev-inline: CHANGELOG v0.1.0"
```

---

### Task 7: 整树验收门总扫（规格 §8）

**Files:**
- 只读校验，不改文件（除非发现遗漏则回到对应 Task 修）。

- [ ] **Step 1: 隐藏依赖防线——全树 0 处指回源 skill**

Run: `grep -rn 'recon-driven-dev' skills/recon-driven-dev-inline/ ; echo "exit=$?"`
Expected: **无输出，`exit=1`**。（README "与…的关系"一节会提到原名——若此处仅 README 命中，需判定：provenance 叙述允许保留原名。若希望 0 命中，把 README 那句的 `recon-driven-dev` 用反引号包成纯名词引用即可；本计划允许 README 的 provenance 句保留原名，故此门只对 **SKILL.md / references/** 必须 0 命中。）

精确版（必须 0 命中的范围）:
```bash
grep -rn 'recon-driven-dev' skills/recon-driven-dev-inline/SKILL.md skills/recon-driven-dev-inline/references/; echo "exit=$?"
```
Expected: 无输出，`exit=1`。

- [ ] **Step 2: 外部依赖措辞——仅允许出现在 CHANGELOG/README 的 provenance 叙述**

Run: `grep -rnE 'superpowers|feature-dev' skills/recon-driven-dev-inline/SKILL.md skills/recon-driven-dev-inline/references/; echo "exit=$?"`
Expected: 无输出，`exit=1`（SKILL.md 与 references 正文 0 命中）。

- [ ] **Step 3: 文件集齐全**

Run:
```bash
for f in SKILL.md README.md CHANGELOG.md references/review-agent.md references/templates/requirements.md references/templates/review.md; do
  test -f "skills/recon-driven-dev-inline/$f" && echo "OK $f" || echo "MISSING $f"
done
```
Expected: 6 行全部 `OK`。

- [ ] **Step 4: 两条路径已指向 fork 自身**

Run: `grep -rn 'recon-driven-dev-inline/references' skills/recon-driven-dev-inline/references/`
Expected: `review-agent.md` 命中 templates/review.md 路径、`templates/review.md` 命中 review-agent.md 路径，均含 `recon-driven-dev-inline`。

- [ ] **Step 5: 关键契约存在性（②④ + 事实订正）**

Run:
```bash
grep -qE 'HARD GATE' skills/recon-driven-dev-inline/SKILL.md && echo "② HARD GATE OK"
grep -qE 'clean-baseline|ISOLATE gate|两阶段评审|FINISH 闭合菜单' skills/recon-driven-dev-inline/SKILL.md && echo "④ gates OK"
grep -qE 'show-superproject-working-tree|先合并|provenance' skills/recon-driven-dev-inline/SKILL.md && echo "④ traps OK"
grep -q '事实订正' skills/recon-driven-dev-inline/SKILL.md && echo "事实订正 OK"
```
Expected: 四行 OK 全打印。

- [ ] **Step 6: 终态确认 + 收尾 commit（若 Step 1-5 有修才需要）**

```bash
git status --porcelain
# 若前面校验触发了修复，统一提交：
# git add -A skills/recon-driven-dev-inline/ && git commit -m "recon-driven-dev-inline: 验收门修订"
```
Expected: 干净（无未提交改动）或仅含本次修订的提交。

---

## Self-Review（写完计划后对照规格自查）

**1. Spec coverage（规格 §1-§9 逐条对到任务）:**
- §2 D1 可移植/零依赖 → E4 删硬前置 + Task 7 Step 2 验收门 ✅
- §2 D2 派发+降级 → ① E5 两级降级、③ 沿用原文 dispatch+fallback、④ 执行方式段 ✅
- §2 D3/D4 ④ 较全复刻 + gates/陷阱、砍机制 → E7 ✅
- §2 D5 方案 A 镜像结构 → File Structure + Task 1-4 拷贝/改写 ✅
- §2 D6 命名 → E1/E2 + Task 5/6 ✅
- §2 D7 命名空间 → E10 + Task 7 ✅
- §3 #1 隐藏依赖（两条硬编码路径）→ Task 2 Step 3、Task 3 Step 3、Task 7 Step 1/4 ✅
- §3 #2 design.md 内容生产者 → E6 `design.md` 内容契约 + E8 护栏反转 ✅
- §3 #3 砍机制保 gates → E7 + E9 ✅
- §3 #4 原生 worktree 工具优先 → E7 gate3 + 陷阱块 ✅
- §3 #5 撞车 → E10 命名空间 ✅
- §3 #6 去重张力/冻结快照 → Task 6 CHANGELOG ✅
- §5 ① 两级降级、四样、质量门 → E5（改降级）+ 其余 verbatim 拷贝保留 ✅
- §5 ② HARD GATE/太简单/范围分解/接棒纪律/轻量自评/内容契约 → E6 全覆盖 ✅
- §5 ③ 派发+路径清理 → Task 2/3 + ③ 节 verbatim ✅
- §5 ④ 8 gates + 陷阱块 + 执行方式 → E7 ✅
- §6 横切：线性不回流、事实订正全机制、不读写长期文档 → verbatim 拷贝保留（原护栏未删这几条）+ Task 7 Step 5 ✅
- §7 文件结构 + 11 条去编排清单 → Task 1-6 全覆盖（E1-E10 + Task 2/3 路径）✅
- §8 验收门 → Task 7 ✅
- §9 非目标：不带 PHILOSOPHY/MAINTAINING/BACKLOG → File Structure 只列 6 文件、不拷那三个 ✅

**无 gap。**

**2. Placeholder scan:** 计划内无 TBD/TODO/"类似 Task N"/"加适当错误处理"。新材料（②④/README/CHANGELOG）均给完整正文；拷贝/编辑部分均给 old→new 精确串或源行范围 + cp 命令。✅

**3. Type/名称一致性:**
- 目录命名空间全程 `docs/recon-driven-dev-inline/`（E3 流程图、E7 ④ gate8 归档、E10 replace-all、README、Task 7）一致 ✅
- 路径改写目标全程 `~/.claude/skills/recon-driven-dev-inline/...`（Task 2/3 + E6 requirements 模板引用）一致 ✅
- gate 名（clean-baseline / ISOLATE / FINISH）在 E7、E9、Task 7 Step 5 用词一致 ✅
- frontmatter `name: recon-driven-dev-inline`（E1）与全文一致 ✅

发现一处需注意（已在计划内说明、非缺陷）：Task 7 Step 1 的全树 grep 会命中 README 的 provenance 句中的 `recon-driven-dev`；计划已明确**必须 0 命中的范围限定为 SKILL.md + references/**，README 的 provenance 引用允许保留原名。口径自洽。
```


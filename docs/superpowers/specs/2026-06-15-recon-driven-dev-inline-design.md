# 设计：recon-driven-dev-inline（侦察驱动开发 · 轻量自包含版）

- **日期**：2026-06-15
- **状态**：已确认，待落地
- **类型**：新建 Skill（fork 自 `recon-driven-dev`）
- **关系**：与 `recon-driven-dev` **并存**，不替换

---

## 1. 背景与动机

`recon-driven-dev`（下称"原版"）当前是一个**编排者**：四阶段里 ② 委托 `superpowers:brainstorming`、④ 全委托 superpowers 实现链（writing-plans → using-git-worktrees → executing/subagent → finishing），① 软依赖 `feature-dev:code-explorer`。**唯一硬前置是 superpowers**——会话里没装就拒绝开轨。

**动机：可移植性。** 要在**没有 superpowers 插件**的环境里也能跑完整条轨。因此 `recon-driven-dev-inline` 去掉"编排外部 Skill"的角色，把 ②④ 的能力**内联自包含**，做到**零外部 Skill 依赖**。

**保留的能力（区别于"编排外部 Skill"）**：内置 sub-agent 派发（`Task`/`Explore`/原生 worktree 工具如 `EnterWorktree`）属于 harness 自带，**不影响可移植性**，予以保留，并一律配主上下文降级。

---

## 2. 已锁定的决策

| # | 决策 | 选择 |
|---|------|------|
| D1 | 核心动机 | **可移植性**——零外部 Skill 依赖，软依赖也尽量砍 |
| D2 | 派发策略 | **保留内置 sub-agent 派发 + 主上下文降级**（①③ 都适用） |
| D3 | ④ 落地范围 | **较全复刻**（worktree/TDD/实现期评审/收口全保留） |
| D4 | ④ 内联粒度 | **契约式 + 留护栏**：保留 gates + 非显性陷阱块，**砍掉机制教学** |
| D5 | 文件组织 | **方案 A**：镜像原结构，只把"委托点"换成内联契约 |
| D6 | Skill 名 | **`recon-driven-dev-inline`** |
| D7 | 产物目录 | **自己的命名空间** `docs/recon-driven-dev-inline/`（与原版零撞车） |

---

## 3. 关键发现（来自硬化工作流 · 7 个 agent）

这些是设计必须吸收的、容易被漏掉的点：

1. **🚨 隐藏依赖（最高风险）**：原版 `references/review-agent.md:18` 与 `references/templates/review.md:4` 各含一条**硬编码绝对路径指回 `recon-driven-dev`**。grep `superpowers`/`feature-dev` **扫不到**。若直接"拷贝"这两个文件，standalone 会在运行时**静默读取源 Skill 的文件**——直接证伪"零依赖"。→ 必须**改写**这两条路径，并把整棵 fork 树 grep `recon-driven-dev` 作为发布门。

2. **🚨 ② 丢的是"内容生产者"，不只是编排者**：brainstorming 是真正**产出** `design.md` 的架构/数据流/决策/风险的人。原版**故意不设** design 骨架（护栏 142）正因为 brainstorming 来填。去掉 brainstorming 后 design.md **无人生产**。→ 必须内联 `design.md` **内容契约**，并**反转护栏 142**（保留"不设僵化骨架"的精神，去掉"那是 brainstorming 的活/第二权威源"的理由）。

3. **④ "模型自己会 git/TDD" 是个陷阱**：可派生的是**机制**（红绿重构步骤、命令），不可派生且高压下被违反的是**闸门**（gates）与反合理化护栏。两者都内联会胀成 tutorial，全砍成一行会丢闸门。解法（D4）：**保留 gates + 陷阱块，砍机制**。

4. **原生 worktree 工具**：本 harness 有 `EnterWorktree`/`ExitWorktree`。#1 陷阱：模型"会 git"就去 `git worktree add`，造出 harness 看不见、清不掉的幽灵状态。→ ISOLATE gate 顺序：**先检测是否已隔离 → 优先原生 worktree 工具 → git 兜底**。

5. **并存撞车**：原版与 fork 都用 `docs/recon-dev/`。→ 已选 D7：fork 用自己的命名空间。

6. **去重张力（诚实记录）**：fork 与原版会有近乎相同的 ①③ 与模板，违反哲学原则 4/5（超集应一份文件、单一权威源）。这是**可移植性 vs 单一权威源的真实取舍**——零依赖就不可能与宿主共享一份文件。fork 接受**受控复制**，定位为**冻结快照**（不追踪上游），并在 CHANGELOG 诚实定性为**工程收益（可移植），非能力跃升**。

---

## 4. 架构总览

四阶段，每阶段结束 ⏸ 等用户确认；产物落 `docs/recon-driven-dev-inline/<YYYY-MM-DD>-<change-name>/`，收尾归档进 `docs/recon-driven-dev-inline/_archived/`。**零外部 Skill 依赖**；①③④ 的派发都配主上下文降级。

```
① 定向分析   一句话粗需求 → 内置 sub-agent 钻落点+消费面(全集) → directed-report.md
             ⏸ 过报告质量门（① 自守）
② 需求+设计  据①，内联对话澄清(brainstorming-lite) → requirements.md + design.md
             ⏸
③ 评审       派发评审 sub-agent（判据在 review-agent.md）→ review.md
             ⏸
④ 落地       拆 tasks.md ⏸ → 内联实现链(clean-baseline→ISOLATE→TDD→两阶段评审→FINISH)→ 归档 ⏸
```

`①→②③` 线性不回流；**事实订正**是唯一例外（见 §6）。

---

## 5. 分阶段设计

### ① 定向分析 → `directed-report.md`（实质不变，已自包含）

- **钻取派发 + 三级降级阶梯**（与 ③ 一致）：内置 `Explore`/`Task` sub-agent（首选，把检索噪声挡在主上下文外）→ 否则主 agent 自己 grep/追链（零依赖地板，尽量不把中间检索灌进主叙事）。**不把 Explore 说成"唯一选项"**（可移植）。
- **删除** `feature-dev:code-explorer` 分支。
- **原样保留**：四样报告契约（落点现状 / 验收单逐载体实答 / 坑+why+锚点 / 召回地板）、软/硬事实分等 `[未核验]`、① 质量门（机会核验仍是主会话的活）。
- 报告契约与质量门**与跑在哪一级无关**——派发只是执行方式，输出形态不变。

### ② 需求+设计 → `requirements.md` + `design.md`（内联 brainstorming-lite · 最大的"作者"工作）

- **流程契约**：逐个澄清问题（一次一个、优先多选）→ 提 2-3 个方案带推荐 → 分节呈现设计 → 产出两份。
- **内联"verbatim 强度"规则（强模型为'帮上忙'最爱跳过的）**：
  - **HARD GATE**：呈现需求+设计并经**用户**（非模型自判）批准前，不写任何实现/脚手架/代码。
  - **"太简单不需要设计"override**：该门适用于**每个**任务（单函数工具、配置改动、todo 列表也一样）。
  - **范围分解触发器**：若请求横跨多个独立子系统，**先分解**，别花澄清问题去细化一个该拆的项目。
- **`design.md` 内容契约（修复发现 #2）**：架构 / 数据流 / 关键决策+取舍 / 风险——**在此产出**——**外加 ① 锚定层**（要改的契约子集 + 补探到的 ① 没列的新发现）。按复杂度伸缩，**不设僵化分节清单**。
- **② 接棒纪律（明确写出，非含糊"保留"）**：对 ① 的 `[未核验]` 条目**做改动决策前先核**（升 `[实测]` 或推翻）；够不着则 `design.md` **显式记**「此决策建于未核验推断 X」。
- **② 自评：仅轻量卫生扫描**（占位符/内部矛盾/歧义/范围蔓延），**显式声明不复跑 ③ 的判据**——避免第二权威源。

### ③ 评审 → `review.md`（已自包含，只需清路径）

- **保留**：派发评审 sub-agent、以 `review-agent.md` 正文作 prompt；主上下文降级；模板填空。判据单一权威仍住 `review-agent.md`。
- **必做编辑**：改写 `review-agent.md` 与 `templates/review.md` 里两条硬编码 `recon-driven-dev` 路径（发现 #1）。

### ④ 落地（内联实现链 · gates + 陷阱块，砍机制）

**Gates（"达成 X / 何时停"，非步骤教程）：**
1. **拆 `tasks.md`** 落本次目录 → **⏸ 用户审计划**（写码前最便宜的拦截点）。
2. **clean-baseline gate**：进工作区后先跑一次现有测试确认绿底**再写新码**；红底 → **停**问（否则分不清新坏旧坏）。
3. **ISOLATE gate**：先检测是否已隔离 → **优先原生 worktree 工具**（`EnterWorktree` 等）→ `git worktree` 兜底；未经同意不在 main/master 上动手。
4. **TDD 铁律**：先写失败测试 → **亲眼看它按预期失败** → 最小实现转绿（输出干净）→ 重构保持绿。修 bug 先用失败测试复现。
5. **per-task 两阶段评审**（按序）：①先 spec 符合性（不缺、**不过度造**）②再代码质量；有问题 → 改 → **复评**直到干净，未清不进下一任务。**区别于 ② 自评、也区别于 ③**（③ 评设计，这里评每个已实现任务对设计的符合度）。
6. **continuous execution**：开跑后一路做完，只在 blocker/歧义/计划错时停（计划错 → 上报人、别静默绕过）。
7. **FINISH 闭合菜单**：先复验全测试绿 → 检测工作区/分支态 → 给**固定闭合菜单**（本地合并 / push+PR / 保留 / 丢弃；detached 则去掉"本地合并"）→ 精确执行所选一项。**绝不在收尾抛开放式"接下来干嘛？"**
8. **归档**（链外）：分支收口后移目录进 `docs/recon-driven-dev-inline/_archived/`，**⏸ 收尾前确认**。

**非显性陷阱块（不可派生，保留）：**
- worktree 检测假阳性：`GIT_DIR != GIT_COMMON` 在 **submodule** 里也成立 → 用 `git rev-parse --show-superproject-working-tree` 排除。
- 项目内 `.worktrees/` 须**先 gitignore** 再在其下建 worktree（否则 worktree 内容被提交进仓）。
- 收口顺序：**先合并 → 在合并结果上验测试 → 移除 worktree → 删分支**（先删分支会因 worktree 仍引用而失败）。
- 清理 provenance 门：**只清你自己建的** worktree；push+PR / 保留 两档**必须留着** worktree（用户要据 PR 反馈迭代）；`git worktree remove` 前先 `cd` 回主仓根。
- **丢弃需打字确认**（如键入 `discard`）才执行任何破坏性删除。
- TDD 反合理化红旗：「待会儿测 / 已手测过 / 太简单不用测 / 删码可惜 / TDD 教条我务实」一律是红旗、非豁免；若生产代码先于失败测试写了，**删掉重来**。测真实行为而非 mock 调用次数；一个测试一个行为；难测=设计味道（解耦/注入依赖），非跳过理由。
- **独立子仓 caveat**：代码在被 `.gitignore` 排除的独立子仓时，worktree/提交/收口都对**子仓**做。
- **false-① -premise pause**：实现中发现 design 建在 ① 的错误前提上 → **暂停、surface 给用户**（续做 / 回 ②③），按事实订正留痕。

**砍掉（模型可派生）**：红绿重构步骤教程、按语言的 setup/test 命令、git 命令咒语、收尾菜单的命令机制、各种叙述性论证。

**执行方式**：默认主上下文内联跑。subagent 模式**可选**，但**仅在**附上一行交接护栏时（每个 sub-agent 给全任务文本+场景上下文、别让它读计划文件或继承会话史；同一工作区不并行跑多个实现 agent；卡住的 agent 别静默原样重派——换更多上下文/更强模型/更小任务）。

---

## 6. 横切不变量（整体保留）

- **`①→②③` 线性不回流**：各阶段在自己出口守住产物质量。
- **事实订正（线性不回流的唯一例外，完整保留）**：directed-report 过 ① 门即**封存**；此后任何环节用证据**推翻**它写下的一条事实主张，由**主会话**在原文条目下追加订正块（原文标 `[已订正]`）；**评审 sub-agent 只把推翻记进 review.md、绝不碰 directed-report**；④ 实现链途中推翻 → 主会话落订正块、动摇设计就暂停 surface。
- **不读/不写任何长期分析文档、不发持久编号**。

---

## 7. 文件结构与去编排清单

```
skills/recon-driven-dev-inline/
├── SKILL.md                 # 四阶段；②④ 内联契约（最大改动面）
├── README.md                # 总览/导航（自己的，名字全部 recon-driven-dev-inline）
├── CHANGELOG.md             # v0.1.0 初版；诚实定性=工程收益(可移植)，非能力跃升；冻结快照声明
└── references/
    ├── review-agent.md      # ③ 判据单一权威（拷贝 + 路径改写）
    └── templates/
        ├── requirements.md  # 拷贝（无内部跨 skill 路径，确认后原样）
        └── review.md        # 拷贝 + 路径改写
```

**去编排 / 自包含编辑清单（逐条核）：**

1. **frontmatter + H1 改名** → `recon-driven-dev-inline`。
2. **删除 line-26 硬前置门**（"没 superpowers 就不开轨"）——standalone 无外部前置。
3. **流程图 line 17/21 改写**：去掉"委托 brainstorming"/"全委托 superpowers"措辞，改内联表述。
4. **① line 48-51**：删 `code-explorer` 分支，收成"内置 sub-agent 派发 + 主上下文 grep 降级"三级阶梯。
5. **② line 91-103 重写**：内联 brainstorming-lite 流程契约 + HARD GATE + "太简单"override + 范围分解触发器 + `design.md` 内容契约 + ② 接棒纪律 + 轻量自评；委托边界 3 条降为普通 ② 产物规则。
6. **③**：派发措辞保留；**改写 `review-agent.md` 与 `templates/review.md` 两条硬编码路径**（指向 fork 自身：优先 skill-root 相对引用，若加载器需绝对则 `~/.claude/skills/recon-driven-dev-inline/...`）。
7. **④ 整节重写**：heading 去"全委托 superpowers"；按 §5 写 gates + 陷阱块；保留子仓 caveat、false-① pause、分支集成是用户决定、归档（改目录到 standalone 命名空间）。
8. **护栏 142 反转**：去 brainstorming 归属，留"design 内容由 ② 谈出、别预设僵化骨架"。
9. **护栏 146 反转**：原"别在 ④ 驱动/重排 superpowers 链"→"④ 步骤本 Skill 内联拥有；别再委托外部技能、别在既定停点外加冗余评审"（保留事实订正 carve-out）。
10. **产物目录全改** `docs/recon-dev/` → `docs/recon-driven-dev-inline/`（含 `_archived/`）。
11. **README/CHANGELOG/description** 所有 `recon-driven-dev` 自引用改名（避免两 Skill 触发撞名；保留"不自动触发、用户显式调用"姿态）。

---

## 8. 验收门（声明 done 前）

- [ ] `grep -rn 'recon-driven-dev' skills/recon-driven-dev-inline/` → **0 命中**（body 文件）。
- [ ] `grep -rniE 'superpowers|feature-dev' skills/recon-driven-dev-inline/` → 正文 0 命中（这两词只允许出现在 CHANGELOG 的 provenance 叙述）。
- [ ] **委托措辞** body 0 命中：`委托`/`delegate`/`superpowers:brainstorming`/`feature-dev:code-explorer` 等"交给外部技能"的表述一处不留（`brainstorming` 作为方法描述词若出现，须无委托语义；SKILL.md 正文建议直接写"内联需求设计对话"以免歧义）。
- [ ] `references/` + `references/templates/` 整棵子树齐全（`review-agent.md`、`templates/requirements.md`、`templates/review.md` 三件都在）。
- [ ] 两条原硬编码路径已改写、指向 fork 自身。
- [ ] ② 含 HARD GATE / "太简单"override / `design.md` 内容契约 / ② 接棒纪律。
- [ ] ④ 含全部 7 个 gate + 非显性陷阱块；机制教学已砍。
- [ ] 事实订正机制三段（封存 / 主会话落订正块 / reviewer 只记录）完整。

---

## 9. 非目标（YAGNI）

- ❌ 不替换、不改动原版 `recon-driven-dev`。
- ❌ 不内联 Visual Companion、不内联 spec-document-reviewer sub-agent（② 轻量自评 + ③ 已覆盖）。
- ❌ 不携带原版的 `SKILL-DESIGN-PHILOSOPHY.md` / `MAINTAINING.md` / `BACKLOG.md`（除非后续证明有用）——保持轻量。
- ❌ ④ 不内联 TDD/git 机制教学。
- ❌ 不追踪上游：fork 是冻结快照。

---

## 10. 待澄清 / 实现期再定的小项

- **路径引用形式**：fork 内对 `review-agent.md`/模板的引用，优先 **skill-root 相对**（位置无关、最抗重绑）；若 Skill 加载器只可靠解析绝对路径，则退回 `~/.claude/skills/recon-driven-dev-inline/...`。落地时按实际加载行为定，二者都满足"指向 fork 自身"。

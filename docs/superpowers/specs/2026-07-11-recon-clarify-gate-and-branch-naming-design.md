# 设计 — recon-driven-dev：② 澄清硬闸 + ⑤ 分支命名规范

> 日期：2026-07-11
> 对象：`skills/recon-driven-dev`（改 Skill 自己，受 `MAINTAINING.md` 治理宪法约束）
> 来源：用户实测他模型跑 recon 时报的两个现场问题；参照本地 superpowers 仓 `/Users/lilongjian/Projects/AI/best-practices-skills/Superpowers` 的做法对齐。

## 1. 背景与目标

| # | 现场问题 | 根因 | 目标 |
|---|---|---|---|
| 1 | ② 需求+设计 遇不确定不问、自作主张 | 澄清写成软性「对话契约」，三条**硬规则**只管"没批准不写码"，无一条强制"实质分叉必须问" | 加一条**校准式澄清硬闸**（superpowers 祈使风"别猜先问" + ADR 逃生阀），治自作主张又不矫枉过正成"事事都问" |
| 2 | ⑤ 实施建分支无命名规范 | ISOLATE 闸只说"别在 main 动手、优先 worktree"，没规定从哪切、名怎么起 | 补 **从当前 HEAD 切 + `<type>/<change-name>` 命名**，对齐 superpowers「以当前分支为准、描述性名」 |

**非目标**（YAGNI）：
- ❌ 不动 ⑤ 的 FINISH 收口菜单（不强制 PR-only）。
- ❌ 不动 ② 自评的四类卫生扫描（不加第五类，避免 self-eval 范围蔓延）。
- ❌ 不改 BASE 口径——[implementation.md:33](../../../skills/recon-driven-dev/references/implementation.md) 现有"别默认 main、按收口分支态定"本就对齐 superpowers。

## 2. superpowers 对照（本设计的锚）

- **问题 1**——superpowers 两层机制：
  - 结构层：brainstorming 强制"先 Q&A 再设计（一次一问）"+ HARD-GATE + 反模式"太简单"（*"Simple projects are where unexamined assumptions cause the most wasted work"*）。
  - 命令层：`executing-plans/SKILL.md:47/62` 一句祈使——**"Ask for clarification rather than guessing" / "Stop when blocked, don't guess"**。
  - recon ② 现状：结构层已有（对话契约"一次一问"、"提 2-3 方案+推荐"），**缺命令层那句被提升为硬规则**。
- **问题 2**——superpowers 实际做法：
  - `using-git-worktrees/SKILL.md`：`git worktree add "$path" -b "$BRANCH_NAME"`——`-b` 默认**从当前 HEAD 切**，且 `$BRANCH_NAME` 自由描述性、**无强制前缀**。
  - `finishing-a-development-branch/SKILL.md:57-64`：收尾 BASE = `merge-base HEAD main||master` **或直接问**，不假设 main。

## 3. 改动 1：② 澄清硬闸

### 3.1 新增第 4 条硬规则（`requirements-design.md`「三条硬规则」区 → 四条）

> **别猜、先问（don't guess）**：设计对话中撞到**实质不确定/分叉**（选它会改需求/方向、爆炸半径或接口形态）——**先问用户，不自行拍板当既成事实**。有合理默认可自决，但须按 ADR 记进 `design.md` 必覆盖清单②（决策 + 被否方案 + 理由），让用户在 ⏸ 看得见你替他拍了什么。两条出口（**问** / **ADR 记**）必走其一，绝不静默拍板。

**设计要点**：
- 「有默认 → ADR 记」是**逃生阀**，防矫枉过正成"事事都问"；它**挂已存在的**结构，不造第二权威源：
  - `design.md` 必覆盖清单②（关键决策+被否+理由）——[requirements-design.md:45](../../../skills/recon-driven-dev/references/requirements-design.md)。
  - ② 接棒纪律"够不着则在 design.md 显式记"——[requirements-design.md:11](../../../skills/recon-driven-dev/references/requirements-design.md)。
- 措辞取 superpowers 祈使风（"别猜"），比初版"校准式"更短。

### 3.2 反合理化红旗表（紧凑，仿 ⑤ TDD 红旗 `implementation.md:59`）

随新硬规则放同区，3-4 行：

| 冒出的念头 | 现实 |
|---|---|
| "这个显然就该 X" | 是实质分叉就 surface，"显然"是你的默认、不是用户的 |
| "用户八成想要 Y" | 猜想 ≠ 确认；无明显默认就问 |
| "先按常见做法做，回头再改" | 静默拍板；要么问、要么 ADR 记 |
| "问了显得没主见" | 漏问才是缺陷；带推荐地问才是专业 |

### 3.3 脊柱亮牌（`SKILL.md` ② 段，HARD GATE 旁）

加一行，仿 HARD GATE"只亮牌、细则住 reference"：

> **别猜先问硬闸**：遇实质不确定/分叉，先问用户、有默认也须 ADR 记录，**绝不静默拍板**——判据住 reference。

## 4. 改动 2：⑤ 分支策略

### 4.1 ISOLATE 闸补建分支动作（`implementation.md:23`）

在现有"别直接在 main/master 上动手 → 检测隔离 → 优先原生 worktree → git worktree 兜底"之上补：

> 起隔离分支**从当前 HEAD 切**（承接你所在分支、**不强制回到 main**）；`git worktree add -b <name>` 兜底时 `-b` 默认即从当前 HEAD 切。
> **分支名 = `<type>/<change-name>`**：`type ∈ {feature, fix, chore, docs, refactor}`（按本次改动性质选），`<change-name>` **复用起步生成的那个**（与产物目录 `<YYYY-MM-DD>-<change-name>` 的 change-name 同名、kebab-case，**分支不带日期**）。例：`feature/clarify-gate`。

### 4.2 BASE 口径不改

[implementation.md:33](../../../skills/recon-driven-dev/references/implementation.md) 现有"BASE = `git merge-base <主干> HEAD`；主干别默认 main、按收口分支态定；未起独立分支时 BASE = 起点 commit"——本就对齐 superpowers「不假设 main」，**保持不动**。

### 4.3 脊柱微调（`SKILL.md:103` ISOLATE 一行）

`ISOLATE(优先原生 worktree 工具)` → `ISOLATE(优先原生 worktree 工具、从当前 HEAD 切、`type/<change-name>` 分支名)`。

## 5. 治理自检（因为在改 Skill 自己 · 依 `MAINTAINING.md`）

- **自包含性**【唯一硬约束】：无外部 skill 调用 / 脚本 / 跨会话持久件。✓
- **单一权威源**：澄清判据只住 `requirements-design.md`、分支规范只住 `implementation.md`；脊柱两处只亮牌/nod、不复述判据。无第二权威源。✓
- **分层归位**：运行约束落脊柱、判据落 reference。✓
- **派发-降级对称**：本次改动不涉及派发侧契约，无对称问题。✓
- **单路径承载（防膨胀）**：② 路径 +~6 行（1 硬规则 + 4 行红旗表 + 1 行脊柱），⑤ 路径 +~3 行（ISOLATE 补句 + 脊柱 nod）。均轻量、不破软上限。✓
- **实施期须补**：过 `MAINTAINING.md` 全 7 条改后验证 rubric（做消费者映射）；立 `CHANGELOG.md` 条目，provenance 注明 superpowers `executing-plans` + `brainstorming` + `using-git-worktrees`；诚实定性 = **能力提升**。

## 6. 落点清单（给实施计划）

| 文件 | 改动 |
|---|---|
| `references/requirements-design.md` | 三硬规则 → 四硬规则（新增"别猜先问"）+ 反合理化红旗表 |
| `references/implementation.md` | ISOLATE 闸补"从当前 HEAD 切 + `<type>/<change-name>` 命名" |
| `SKILL.md` | ② 段加"别猜先问硬闸"亮牌行；⑤ 段 ISOLATE 一行加 nod |
| `CHANGELOG.md` | 立本次条目（what + why + provenance + 定性） |

## 7. 验收标准

- [ ] `requirements-design.md` 有第 4 条硬规则，含"别猜/先问 + ADR 逃生阀"两条出口，且逃生阀按名指向必覆盖清单②。
- [ ] 反合理化红旗表 ≤4 行、放硬规则同区。
- [ ] `SKILL.md` ② 段有一行澄清硬闸亮牌（不复述判据）。
- [ ] `implementation.md` ISOLATE 闸写明"从当前 HEAD 切"与"`<type>/<change-name>`（type 集合 + 复用起步 change-name）"。
- [ ] `implementation.md:33` BASE 口径未被改动。
- [ ] `SKILL.md:103` ISOLATE nod 已加。
- [ ] `CHANGELOG.md` 有本次条目，provenance 与定性齐。
- [ ] 过 `MAINTAINING.md` 7 条改后验证 rubric 无破。

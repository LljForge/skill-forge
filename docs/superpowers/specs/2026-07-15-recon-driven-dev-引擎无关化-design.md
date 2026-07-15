# 设计 — recon-driven-dev 引擎无关化(轻量纠偏)

> 日期：2026-07-15
> 对象：skills/recon-driven-dev(已回退到 v0.5.8 / `31435e2`,即批次A之前状态)
> 性质：改 Skill 自己,受 skills/recon-driven-dev/MAINTAINING.md 治理宪法约束

## 1. 背景

上一轮「跨宿主运行契约整改」(批次A/B/C)偏离初衷:一次静态审计冒出 6 个「issue」,
选了「契约重整」方案,把范围从「解决引擎差异」扩张成 runtime-contract 宿主握手骨架、
per-change 状态机、per-task 双 agent、证据链契约等一大堆架构件——结果**变重、变慢、
难维护**。已于 `bf369f5` 把 skill 本体回退到 v0.5.8。

**真正的问题域**(经 Codex 站在执行引擎视角自审 + 全 16 份 grep 复核确认):skill 自称
「自包含、零外部依赖、丢到任何环境都能独立跑」,但正文里埋了 Claude 专属假设,这句承诺
没被真正兑现。真实缺陷**极窄**——只有 2 类真会在非-Claude 引擎坏,其余多是可自然映射的
表层措辞或已有条件降级。

## 2. 北极星与红线

- **北极星**:把引擎特定的**机制**抽象成引擎无关的**能力契约**,让任何引擎
  (Claude / Codex / 未来的 X)都能把自己的工具映射上来。Codex 只是「任一引擎」的一个样本。
- **红线(防止重蹈批次A/B/C 覆辙)**:只碰「能力抽象 + 去硬编码」,**绝不动五阶段流程、
  不加 agent、不加状态机、不加证据链、不加新文件**。

## 3. 非目标(显式排除)

- 不新增 runtime-contract / run-state / task-agent / task-reviewer 等任何文件或机制。
- 不改五阶段流程、暂停点、派发范式的结构。
- 不给每处改动配「整条五阶段实跑证伪」——验证按每处不确定性分级(见 §6)。
- 不动已有条件降级的项(worktree 原生工具 / 按角色选模型——降级分支已写明,不改也不坏)。
- 不改元文档里仅作历史记录的工具名/路径提及(CHANGELOG 等)。

## 4. 范围清单(带文件锚点)

### 🔴 批次1 · 必修(真会在干净的非-Claude 引擎坏)

**类别3a — 派发隔离语义(根问题)**
- `SKILL.md:36-39`「派发与降级」范式声明了「上下文隔离」,但**派发动作里没强制
  「关闭历史继承」**。sub-agent prompt 里的「不要本会话历史」(`recon-agent.md:7`、
  `review-agent.md:11`、`code-reviewer.md:11`)是**弱约束**——某些引擎(如 Codex 默认
  `fork_turns=all`)会继承全部主会话上文,prompt 里写「忽略历史」拦不住,导致 ①侦查/
  ③评审/⑤整支评审的「冷判 / 新视角」名存实亡。

**类别2 — 路径硬编码 `~/.claude/skills/`(干净引擎读模板会找不到文件)**
| 文件:行 | 内容 |
|---|---|
| `references/review-agent.md:22` | 模板路径写死 `~/.claude/skills/.../templates/review.md` |
| `references/code-reviewer.md:21` | 模板路径写死 `~/.claude/skills/.../templates/code-review.md` |
| `references/templates/review.md:4` | 反向引用写死 `~/.claude/skills/.../review-agent.md` |
| `references/templates/code-review.md:4` | 反向引用写死 `~/.claude/skills/.../code-reviewer.md` |
| `README.md:66` | 安装前提假设装在 `~/.claude/skills/`(元文档,但对外) |

> 注:本机现有软链接 `~/.claude/skills/recon-driven-dev → 项目目录` 暂时兜底,所以本机
> 运行不崩,但那是环境兼容、不是 skill 真跨引擎。此项也是批次A `f82df62` 曾正确修过、
> 随回退一并撤销的那条,本次重新纳入。

### 🟡 批次2 · 工具名中性化(belt-and-suspenders,让文本对任意未来引擎真中立)

**类别1 — Claude 专属工具名**(Codex 能自然映射,但第三个引擎未必;能力名抽象才是真中立)
- 运行文件 7 处「工具面」:`SKILL.md:38`、`references/directed-analysis.md:20`、
  `references/recon-agent.md:12`、`references/review-agent.md:17`、
  `references/code-reviewer.md:16` 等。

### ⚪ 不动

- 类别3b:`implementation.md:23`(原生 worktree 工具 → git worktree 兜底)、
  `implementation.md:50`(若 harness 支持则指定模型)——降级/条件分支已写明。
- README/EVAL-COVERAGE/CHANGELOG 里的工具名提及——元文档,正常五阶段运行不载入。

## 5. 两批设计

### 批次1 · 🔴

1. **派发隔离契约**(`SKILL.md:36-39`「派发与降级」段):补一句能力层契约——
   > 派发的 sub-agent 必须冷启动、不继承主会话史;**宿主派发默认继承上文时,须在派发处
   > 显式关闭历史继承**(如 Codex 对应 `fork_turns=none`——仅映射示例、不绑死)。

   这对 Claude 零回归(Claude 的 Task 本就冷启动),只补上「默认继承型引擎」的必要动作。

2. **去路径硬编码**(机制:**主 agent 派发时以绝对路径追加模板位置**——主 agent 知道
   skill 根、本就在派发处追加本次路径,顺带追加模板绝对路径)。逐处最终成文:

   | 处 | 文件:行 | before → after |
   |---|---|---|
   | ① | `review-agent.md:22` | `模板:~/.claude/skills/.../templates/review.md` → `模板:本 skill 的 references/templates/review.md，其绝对路径由主 agent 在派发材料末尾给出` |
   | ② | `code-reviewer.md:21` | `模板:~/.claude/skills/.../templates/code-review.md` → `模板:本 skill 的 references/templates/code-review.md，其绝对路径由主 agent 在派发材料末尾给出` |
   | ③ | `templates/review.md:4` | `判据…见 ~/.claude/skills/.../review-agent.md` → `判据与结论档位见本 skill 的 references/review-agent.md（即派发你的那份评审 prompt）` |
   | ④ | `templates/code-review.md:4` | `两轴判据…见 ~/.claude/skills/.../code-reviewer.md` → `两轴判据与档位见本 skill 的 references/code-reviewer.md（即派发你的那份评审 prompt）` |
   | ⑤ | `README.md:66` | `前提:已装到 ~/.claude/skills/` → `前提:已装到宿主的 skill 目录(Claude Code 默认 ~/.claude/skills/;其它宿主按其约定),任何项目的会话都能调用` |

   **配套(机制的另一半)**:`SKILL.md:38` 派发段兑现「绝对路径由主 agent 给出」的承诺——
   「把本次的路径与上下文追加在末尾」→「把本次的路径与上下文**(含子 agent 要读的模板绝对路径)**
   追加在末尾」。此项与 3a 同处收口——都是「主 agent 派发时传什么」。

### 批次2 · 🟡

- 7 处「工具面」把 `Read/Grep/Glob/Write/Task` 改成能力名(读文件 / 检索源码 / 写文件 /
  派隔离子 agent),原工具名保留为「例如 Claude 的 `Task`」。纯措辞,零行为变化。

## 6. 验证策略(按每处不确定性分级)

| 改动 | 实跑? | 验证方式 |
|---|---|---|
| 🔴 去路径硬编码 | 否 | `grep` 确认运行文件无 `~/.claude` 残留;读一遍确认路径可从 skill 根解析 |
| 🔴 派发隔离契约 | **窄探针** | 先静态落地(对 Claude 零回归);再在 Codex 跑**一个只验派发隔离的微探针**——派个评审子 agent,确认它看不到主会话推理。**不跑整条五阶段 trace** |
| 🟡 工具名中性化 | 否 | 读一遍;`grep` 确认工具名只作「例如」出现、不作硬指令 |

## 7. 验收标准

1. 运行文件(`SKILL.md` + `references/**`)内无 `~/.claude` 安装根硬编码。
2. `SKILL.md`「派发与降级」段含「默认继承型引擎须显式关闭历史继承」的契约句。
3. 模板路径经「主 agent 派发时传绝对路径」机制描述,不再假设固定安装位置。
4. (批次2 完成后)运行文件工具面用能力名表述,Claude 工具名仅作示例。
5. skill 仍保持:显式触发、五阶段、自包含、单一权威源、零新增文件、无状态机/无新 agent。
6. Codex 微探针确认 ③/⑤ 派发的评审子 agent 不继承主会话上下文。

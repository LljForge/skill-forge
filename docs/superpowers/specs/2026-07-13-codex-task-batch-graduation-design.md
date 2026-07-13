# codex-task / codex-batch 毕业到 skills/(仅手动触发)—— 设计文档

- 日期:2026-07-13
- 状态:设计定稿(待写实施计划)
- 起点:`incubating/codex-task`、`incubating/codex-batch` 两个暂存 Skill(上一轮由全局命令收敛而来,尚不可调用)
- 关系:**部分闭合** `2026-07-13-codex-family-commands-to-incubating-skills-design.md` 记录的「家族全体非可调用期(gap)」——本轮只毕业 codex-task / codex-batch。

## 背景与问题

上一轮把 codex-* 家族从全局命令收敛进 `incubating/`,并明知接受了一个 gap:`incubating/X` 无 symlink、不可调用,直至毕业到 `skills/` + symlink。用户现在要**立即毕业 codex-task 与 codex-batch**,以 Skill 工具触发,并明确要求**触发词限定为「仅手动、禁自动」**。

## 关键前提:激活机制(与上一轮一致)

`~/.claude/skills/X` 是**符号链接** → 仓库 `skills/X`;**在 `skills/` 且被 symlink 的 skill 才可调用**。样板 `recon-driven-dev` 即:住在仓库 `skills/`、symlink 进 `~/.claude/skills/`、description 末尾用 `**本 Skill 不自动触发，由用户显式调用。**` 抑制自动激活。毕业 = 把目录搬进 `skills/` + 建 symlink + 对齐该抑制句。

## 范围与非目标

- **只毕业**:`codex-task`、`codex-batch`。
- **不毕业**:`codex-code-review`、`codex-design-review` 留在 `incubating/`——各自 BACKLOG 尚挂「毕业前过一遍 skill-tempering」,且 **codex-task 用自己的 `references/task-reviewer.md`,不依赖这两个 review skill** → 二者可独立毕业,无家族内阻塞。
- **无自动化测试**:纯 skill/doc 迁移,验证靠 `grep` + `ls`(承上一轮做法)。

## 触发词决策:对齐 recon 成规(仅手动·禁自动)

description 是模型判断「是否自动激活」的依据。本仓已有成规(recon-driven-dev):能力描述在前 + **末尾抑制句** `**本 Skill 不自动触发，由用户显式调用。**`。codex-task / codex-batch 现状已近乎如此,仅差「本 Skill」前缀、且逗号为半角。**采用此成规、逐字对齐 recon(含全角逗号)**(与前置硬闸、点名调用记法两种备选相比,一致性最高、改动最小),抑制句统一为:

> `**本 Skill 不自动触发，由用户显式调用。**`

## 组件改动

### A. 搬迁(git 内,mv 不 cp)

- `git mv incubating/codex-task  skills/codex-task`(连 `references/task-reviewer.md` 一并迁)
- `git mv incubating/codex-batch skills/codex-batch`
- 依样板 recon-driven-dev(只存于 `skills/`),incubating 不留副本。

### B. 激活 symlink(git 外,在 `~/.claude/skills/`)

- `ln -s <repo>/skills/codex-task  ~/.claude/skills/codex-task`
- `ln -s <repo>/skills/codex-batch ~/.claude/skills/codex-batch`
- 与既有 symlink(recon-driven-dev 等)同构;这是「可调用」的开关。**动仓库外的 `~/.claude/`,同上一轮归档退役性质**,已获用户授权在执行时建。

### C. 内容改动(最小,3 处)

| 处 | 旧 | 新 |
|---|---|---|
| `skills/codex-task/SKILL.md` frontmatter | `**不自动触发,由用户显式调用。**`(半角逗号) | `**本 Skill 不自动触发，由用户显式调用。**`(加「本 Skill」+ 全角逗号,逐字对齐 recon) |
| `skills/codex-batch/SKILL.md` frontmatter | `**不自动触发,由用户显式调用。**`(半角逗号) | `**本 Skill 不自动触发，由用户显式调用。**`(同上) |
| `skills/codex-batch/SKILL.md`(委托说明行) | `见 `incubating/codex-task/SKILL.md`` | `见 `~/.claude/skills/codex-task/SKILL.md`` |

- 第三处理由:codex-batch 要在**任意项目仓**里跑,委托 codex-task 时靠 `Read` 其 SKILL.md;仓库相对路径 `skills/codex-task/...` 在别的项目里不存在,必须用**全局 symlink 路径** `~/.claude/skills/codex-task/SKILL.md`(与旧全局命令路径 `~/.claude/commands/codex-task.md` like-for-like)。全仓 grep 确认此为**唯一**因 mv 失效的功能引用。

## 明确保留:slash 形不做「现代化」

输入表里的 `/codex-task 5`、`/codex-task next`、`/codex-batch --max 0` 等 slash 形——在本 harness 下,用户输入 `/<skill-name> <args>` **就是** Skill 工具的显式调用记法(args 透传)。故这些 slash 形是合法的「用户显式调用」写法,**保留不动**。上一轮 deferred 的「slash 形现代化」经此认定为**伪命题**,本轮不做去 slash;真正需改的只有失效路径引用(见 C)。

## 验证(grep + ls)

1. `ls -la ~/.claude/skills/codex-task ~/.claude/skills/codex-batch` → 两条 symlink 解析到仓库 `skills/`。
2. `grep -rn 'incubating/codex-task\|incubating/codex-batch' skills/` → **空**(无死路径遗留)。
3. 每个 SKILL.md `grep -c '本 Skill 不自动触发'` → 各 1。
4. `test -f skills/codex-task/references/task-reviewer.md` → references 随迁到位。
5. `test ! -e incubating/codex-task && test ! -e incubating/codex-batch` → incubating 无残留副本。

## 文档同步

- 更新家族 spec `2026-07-13-codex-family-commands-to-incubating-skills-design.md` 的「退役、Gap 与毕业后续」:记本轮**部分闭合**——codex-task / codex-batch 已毕业可调用;codex-code-review / codex-design-review 仍在 incubating,待各自毕业。
- 执行时 grep 一眼 README 目录树 / CHANGELOG:若列了 `incubating/codex-task|batch` 则更新。全仓 grep 已示无路径串命中,预期无改;若 README 以目录树列 skills/incubating 结构则同步该树。

## 风险 / 边界

- **symlink 是环境态、不进 git**:毕业的「可调用」依赖 `~/.claude/skills/` 下的 symlink;换机器/环境需重建。这是本仓既有机制的固有性质,非本轮引入。
- **委托路径耦合 symlink 名**:codex-batch 依赖 `~/.claude/skills/codex-task/SKILL.md` 存在;若 codex-task symlink 名变更,需同步。已在 C 显式记录。
- **命名共存**:`recon-driven-dev` 亦有 `references/task-reviewer.md`,与 `skills/codex-task/references/task-reviewer.md` 目录不同、不冲突(仅同名,scope 隔离)。

## 明确不做(YAGNI)

- **不毕业两个 review skill**:留待各自过 skill-tempering 后单独一轮。
- **不做 slash 形去 slash**:slash 形是本 harness 下合法的显式调用记法(见上)。
- **不重设计行为**:毕业 = 搬迁 + symlink + 抑制句对齐 + 一处失效路径改线,不借机改动分工/铁律/台账/flags 等既有机制。

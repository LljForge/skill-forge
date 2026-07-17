# codex-batch 维护宪法

> **改本 Skill 自己**时读这份；**运行时不载入**。运行护栏（三条铁律 / checkpoint 硬停 / 台账单一真相源）在 [SKILL.md](../../incubating/codex-batch/SKILL.md) 正文。

## 它为什么回到 `incubating/`（2026-07-17 移入）

**还没熟。** 它此前坐在 `skills/`（＝发布面）里，是**过早上线**——不是有意发布一个残品，是没人问过"它够格了吗"。

最硬的那条不成熟，是**运行期跨 skill 依赖**：codex-batch 是 codex-task 的编排层，自己只加「循环 + checkpoint + 停车/续跑」，单任务流程全部委托 codex-task（`SKILL.md` 自认："codex-batch → codex-task 是唯一允许的跨 skill 委托"）。这违反 skill-tempering 第 #7 核（零运行期外部 skill 依赖）——本仓**唯一硬约束**。

**破了唯一硬约束，按定义就没熟到能发布。** 而它待在发布面上的实际后果是：远端用户只装 codex-batch 会拿到一个跑不起来的壳。

## 毕业闸（想移回 `skills/` 时必须先回答）

**跨 skill 委托怎么解？** 三条路：

1. **焙烧**——把 codex-task 的单任务流程复制进 codex-batch。代价：两份必然漂移，正是 #5 骂的 duplication。
2. **合并**——codex-batch 与 codex-task 并成一个 skill。代价：codex-task 单跑是主力用法，合并会拖累它。
3. **另辟**——本仓尚未想过的第四条路（如把共用流程抽成 codex-task 内的可被引用契约、或让编排层只读计划不读 skill）。

> 这条没解就别毕业——移回 `skills/` 而不解它，等于把 #7 违规重新发布一次。

**这只是必答项、不是全部**：它熟没熟还得看常规那几关（实跑打磨、失败形态覆盖、description 触发力）。本文件只钉死那条已知的硬伤，不冒充完整成熟度清单。

## 本机挂载

`~/.claude/skills/codex-batch` 是指向本仓的软链，已随本次移动重指到 `incubating/codex-batch`（仓根 README「孵化 + 毕业闸」节记着这条纪律）。本机照常可用、继续 dogfood——**孵化不等于封存**，实证正是从自用里攒出来的。

## 已知待办

- **没有 CHANGELOG / BACKLOG**：至今未经历过有记录的优化轮次——这本身就是"不成熟"的一个侧面。真要改它时再建，别为凑齐五件而建空账。
- `SKILL.md` 曾把 codex-task 的安装路径写死成 `~/.claude/skills/codex-task/SKILL.md`（本机软链落点，跨平台即错），已于 2026-07-17 改为按名指代。**别再写路径**——各 agent 平台的 skills 目录不同。

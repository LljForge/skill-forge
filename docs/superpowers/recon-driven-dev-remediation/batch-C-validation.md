# 批次 C 实跑证伪 · 观测规格 + fresh runner 启动 Prompt

> 批次 C 代码已落地(CHANGELOG v0.7.0,commit 39ccd53…de3dc4c),欠一次**真实任务实跑证伪**。
> 批次 C 证伪宿主 = **TDD/manual 路径单宿主可验;子 agent 执行分支 + 终态覆盖(untracked)建议 Codex 跑**——最省是**用 Codex 跑一个多任务任务**,一次同时收批次 C 实跑 + 批次 D 的真实 Codex trace(design §14.2 任务二)。
> **不该由改 skill 的人(本会话)自验**——弱证伪。交一个不知情的 fresh runner 跑、出回执。

## 一、这次要观测什么(批次 C 的 5 条 · 出问题=真回归)

任务选型是硬前提,见「二」——选不对这 5 条验不到。

| # | 观测点 | 怎么判 |
|---|---|---|
| 1 | 老 TDD 路径没坏 | 有测试 runner 的任务仍走 automated-tdd「先写失败测试→看它失败→最小转绿→重构」,**没被新增的 executable-check / manual-evidence 两模式搞乱或跳过** |
| 2 | BASE 正面回归 | 整支评审 BASE = preflight 的 START_SHA(**不再 merge-base 猜**);终态证据盖住 **committed + staged + unstaged + untracked**——**开工前故意留一个 untracked 新文件**,验它在终态快照里没漏 |
| 3 | 三模式各自闭合 | design 声明的 verification-mode 被照走;尤其 **manual-evidence** 事先说清步骤 + 预期 + 证据、**不含糊放行**;executable-check 先落失败证据再改 |
| 4 | per-task 评审真在跑 | 每个任务实现 + commit 后过 **Spec 符合 + Quality 质量** 两轴;子 agent 分支派 task-agent 实现、task-reviewer 评审(新 agent 有实际产出);内联分支主会话自评并**标「非独立评审」** |
| 5 | 复评不走过场 | 改完一个发现后**既核旧发现、也扫修复触及文件+邻接的新问题**;修复扩出原文件/改接口时重跑两轴;**不只核旧 delta 就宣布完成** |

## 二、任务选型硬前提(批次 C 特有 · 选不对就白跑)

- **多任务**:计划至少拆 2–3 个可独立评审的任务,才验得到 per-task 评审逐任务在跑(第 4 条)。
- **含验证降级**:挑一个**至少有一个任务无测试 runner / 客观没法自动测**的场景,逼出 **manual-evidence**(第 3 条);若整个任务都能自动测,就只验到 automated-tdd 一条路径。理想:一个任务走 automated-tdd、另一个走 manual-evidence 或 executable-check。
- **开工前留 untracked**:preflight 前在工作区**手动放一个与本任务无关的 untracked 新文件**,跑到收尾整支评审时核它有没有进终态快照(第 2 条)。
- **子 agent 执行分支**:④ 执行方式选**每任务一个新子 agent**,才验得到 task-agent/task-reviewer 真派出去(第 4 条子 agent 侧);选内联则第 4 条只验到内联自评 + 非独立评审标注。

## 三、宿主与 🔶D-gap

- **最省跑法 = Codex 跑一个多任务任务**:一次同时收批次 C 实跑(子 agent 分支 + 终态覆盖 + 三模式)+ 批次 D 的真实 Codex trace(design §14.2 任务二、§13 批次 C 证伪宿主)。
- **用 Claude Code 跑**:能验第 1/2/3/5 条 + 第 4 条内联侧;第 4 条**子 agent 侧**与 untracked 终态覆盖在 Codex 上更贴真实场景,可标注「子 agent 分支待 Codex 补」、**不算批次 C 回归**。
- **🔶D-gap(若 Codex)**:runtime-contract 的能力映射目前只有 Claude 版(Codex 版是批次 D 待办)。凡因「Codex 没有对应指引」导致的卡顿,标 `🔶D-gap`、喂批次 D,**不计入批次 C 的 5 条**。

## 四、fresh runner 要落盘的东西

1. **skill 自身产物**:五阶段产物 + `run-state.md` + 每任务实现/评审记录 + `code-review.md`,在 ARTIFACT_ROOT 内(落被开发项目);
2. **监督笔记** `supervision.md`(按 MAINTAINING「实测会话·监督协议」exception-only 记);
3. **改进点清单** `improvements.md`(跑完派复盘 agent 补);
4. **批次 C 观测回执**:上面 5 条逐条「过/不过/未触发 + 现场证据」,🔶D-gap(若 Codex)单列。

**落点(绝对路径,不管在哪个项目跑,回执都落回 skill 仓)**:
`/Users/lilongjian/Projects/AI/skill-forge/docs/recon-driven-dev-eval/<今天日期>-batchC-<任务短名>/`

## 五、判定与回填

- **5 条全过** → 批次 C 实跑证伪通过,回填 `progress.md` 批次 C 行为「✅ 实跑证伪」+ trace 路径,再就地写批次 D 的 plan(需真实 Codex trace)。
- **任一不过** → 批次 C 回归,只回退批次 C 对应提交、修、重跑;不动其他批。
- **某条未触发**(如子 agent 侧 / manual 没验到)→ 记尾账、补样本,**非回归**(与批次 A #4、批次 B ② 同口径)。
- **🔶D-gap**(若 Codex)→ 汇总进批次 D 输入,不阻塞批次 C 判定。

---

## 六、可直接粘给 fresh runner 的启动 Prompt

```text
用 recon-driven-dev skill 跑下面这个开发任务,并读该 skill 的 MAINTAINING.md
「实测打磨协议」,按其中「实测会话·监督协议」全程监督:每个 ⏸ 用 exception-only
方式记监督笔记(只在卡住/指令含糊/降级没走通时记一行带现场证据),整任务跑完后
派一个上下文隔离的复盘 sub-agent 补抓 skill 缺陷。

【本次额外要求 · 这是整改批次 C(实现与验证契约)的实跑证伪】
1. 任务选型硬前提(选不对就验不到):
   - 拆成 2–3 个可独立评审的任务(验 per-task 评审逐任务在跑);
   - 至少有一个任务无测试 runner / 客观没法自动测,逼出 manual-evidence 模式
     (理想:一个任务走 automated-tdd、另一个走 manual-evidence 或 executable-check);
   - ④ 执行方式请选「每任务一个新子 agent」(验 task-agent/task-reviewer 真派出去);
   - 开工前(preflight 前)在工作区手动放一个与本任务无关的 untracked 新文件。
2. 除监督笔记 supervision.md 外,再产一份「批次 C 观测回执」,对下面 5 条逐条给
   「过/不过/未触发 + 现场证据」:
   ① 老 TDD 未坏:有 runner 的任务仍走 automated-tdd 先写失败测试→转绿,没被两模式搞乱;
   ② BASE 正面回归:整支评审 BASE = preflight 的 START_SHA(不是 merge-base 猜);终态
      证据盖住 committed/staged/unstaged/untracked——那个故意留的 untracked 新文件在
      终态快照里没漏;
   ③ 三模式各自闭合:manual-evidence 事先说清步骤+预期+证据、不含糊放行;
   ④ per-task 评审真在跑:每任务过 Spec+Quality 两轴,子 agent 分支 task-agent 实现、
      task-reviewer 评审有实际产出(内联分支要标「非独立评审」);
   ⑤ 复评不走过场:改完一个发现后既核旧、也扫修复触及文件+邻接的新问题,不只核旧 delta。
3. 顺带看(不单独判):④ 执行方式(内联/子 agent)是不是在定稿之前选、批的是最终 tasks.md。
4. 若你运行在 Codex 上:runtime-contract 的能力映射目前只有 Claude 版(Codex 版是整改
   批次 D 的待办)。凡因「Codex 没有对应指引」导致的卡顿,单独标 🔶D-gap 列出,不计入
   上面 5 条——那是喂给批次 D 的信号、不是批次 C 的回归。(用 Claude 跑则无此项;但子
   agent 分支 + untracked 终态覆盖在 Codex 上更贴真实场景。)

监督笔记 + 改进点清单 improvements.md + 批次 C 观测回执,都产出到(绝对路径,不管你
在哪个项目跑本开发任务,这三份 eval 产物都落回下面这个 skill 仓):
/Users/lilongjian/Projects/AI/skill-forge/docs/recon-driven-dev-eval/<今天日期>-batchC-<任务短名>/
这一会话只跑、不要顺手改 skill 本身;结束时把该目录**绝对路径**告诉我。

Skill 位置(绝对路径):/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev

开发任务:<在这里写你这次要做什么>
```

> 拿回结果后:把那个 eval 目录路径给我,我按上面「五、判定与回填」核 5 条、更新 progress、决定往下写批次 D 还是回退批次 C。

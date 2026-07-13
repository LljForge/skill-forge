# 批次 B 实跑证伪 · 观测规格 + fresh runner 启动 Prompt

> 批次 B 代码已落地(CHANGELOG v0.6.0,commit 6a13c51…4cd6db3),欠一次**真实任务实跑证伪**。
> 批次 B 证伪宿主 = **单宿主可验**——fresh Claude Code 会话 或 Codex 都行(用 Codex 还能顺带继续喂 D-gap)。
> **不该由改 skill 的人(本会话)自验**——弱证伪。交一个不知情的 fresh runner 跑、出回执。

## 一、这次要观测什么(批次 B 的 5 条 · 出问题=真回归)

任务必须挑一个**会触发「③有条件通过」**的(有点设计争议、评审能挑出须改项),否则验不到回流。

| # | 观测点 | 怎么判 |
|---|---|---|
| 1 | 回流收敛 | ③ 有条件通过 → 回 ② 修订 → 用户重新批准 → 复评,**≤2 轮内收敛**;第三次仍未清零**真的暂停交用户**(不硬跑第三轮) |
| 2 | 老直线路径未坏 | 一个 ③ 直接通过的简单任务仍能 ①→②→③→④→⑤ 顺跑,没被状态机新增的门卡死 |
| 3 | 口号矛盾已消 | 全程无「既要回写②又不得回流」的自相矛盾指令(旧「线性不回流」不再和受控回路打架) |
| 4 | ④ 审批顺序 | 执行方式(内联/子 agent)在**定稿之前**选、用户批的是**最终 tasks.md**(不是先审计划再选执行方式) |
| 5 | compaction 恢复 | 中途按 run-state 的 `phase` + `state` 能机械判断当前阶段与合法下一步(不靠会话记忆) |

## 二、①封存序 附带观测(顺带看,不单独判)

- ① 主会话实测门过后,是否**先交用户审阅、用户批准才封存** directed-report(不是过门即封存)?用户要求改是否回 recon-draft 重过门?

## 三、🔶 若用 Codex 跑:D-gap 仍单列(不计入 5 条)

- runtime-contract 的能力映射目前只有 Claude 版(Codex 版是批次 D 待办)。凡因「Codex 没有对应指引」导致的卡顿,标 `🔶D-gap`、喂批次 D,**不计入批次 B 的 5 条**。
- 用 fresh Claude 会话跑则无此项。

## 四、fresh runner 要落盘的东西

1. **skill 自身产物**:五阶段产物 + `run-state.md`,在 ARTIFACT_ROOT 内(落被开发项目);
2. **监督笔记** `supervision.md`(按 MAINTAINING「实测会话·监督协议」exception-only 记);
3. **改进点清单** `improvements.md`(跑完派复盘 agent 补);
4. **批次 B 观测回执**:上面 5 条逐条「过/不过 + 现场证据」,②封存序附带观测单列,🔶D-gap(若 Codex)单列。

**落点(绝对路径,不管在哪个项目跑,回执都落回 skill 仓)**:
`/Users/lilongjian/Projects/AI/skill-forge/docs/recon-driven-dev-eval/<今天日期>-batchB-<任务短名>/`

## 五、判定与回填

- **5 条全过** → 批次 B 实跑证伪通过,回填 `progress.md` 批次 B 行为「✅ 实跑证伪」+ trace 路径,再就地写批次 C 的 plan。
- **任一不过** → 批次 B 回归,只回退批次 B 对应提交、修、重跑;不动其他批。
- **🔶D-gap**(若 Codex)→ 汇总进批次 D 输入,不阻塞批次 B 判定。

---

## 六、可直接粘给 fresh runner 的启动 Prompt

```text
用 recon-driven-dev skill 跑下面这个开发任务,并读该 skill 的 MAINTAINING.md
「实测打磨协议」,按其中「实测会话·监督协议」全程监督:每个 ⏸ 用 exception-only
方式记监督笔记(只在卡住/指令含糊/降级没走通时记一行带现场证据),整任务跑完后
派一个上下文隔离的复盘 sub-agent 补抓 skill 缺陷。

【本次额外要求 · 这是整改批次 B(阶段状态机)的实跑证伪】
1. 请挑/构造一个「③ 评审会给『有条件通过』」的任务(设计上有点可争议、评审能挑出
   须改项),好触发回流。除监督笔记 supervision.md 外,再产一份「批次 B 观测回执」,
   对下面 5 条逐条给「过/不过 + 现场证据」:
   ① 回流收敛:③ 有条件通过→回②修订→用户重新批准→复评,≤2 轮内收敛;第三次仍
      未清零要真的暂停交用户(别硬跑第三轮);
   ② 老直线路径未坏:一个 ③ 直接通过的简单任务仍能 ①→②→③→④→⑤ 顺跑;
   ③ 口号矛盾已消:全程没有「既要回写②又不得回流」的自相矛盾指令;
   ④ ④ 审批顺序:执行方式(内联/子 agent)在定稿之前选、用户批的是最终 tasks.md;
   ⑤ compaction 恢复:中途按 run-state 的 phase+state 能机械判断当前阶段与合法下一步。
2. 顺带看一眼(不单独判):① 主会话实测门过后是否先交用户审阅、用户批准才封存
   directed-report(而非过门即封存)。
3. 若你运行在 Codex 上:runtime-contract 的能力映射目前只有 Claude 版(Codex 版是
   整改批次 D 的待办)。凡因「Codex 没有对应指引」导致的卡顿,单独标 🔶D-gap 列出,
   不计入上面 5 条——那是喂给批次 D 的信号、不是批次 B 的回归。(用 Claude 跑则无此项。)

监督笔记 + 改进点清单 improvements.md + 批次 B 观测回执,都产出到(绝对路径,不管你
在哪个项目跑本开发任务,这三份 eval 产物都落回下面这个 skill 仓):
/Users/lilongjian/Projects/AI/skill-forge/docs/recon-driven-dev-eval/<今天日期>-batchB-<任务短名>/
这一会话只跑、不要顺手改 skill 本身;结束时把该目录**绝对路径**告诉我。

Skill 位置(绝对路径):/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev

开发任务:<在这里写你这次要做什么>
```

> 拿回结果后:把那个 eval 目录路径给我,我按上面「五、判定与回填」核 5 条、更新 progress、决定往下写批次 C 还是回退批次 B。

# 批次 A 实跑证伪 · 观测规格 + Codex 启动 Prompt

> 批次 A 代码已落地(CHANGELOG v0.5.9),欠一次**真实任务实跑证伪**。本次用 **Codex** 跑。
> 观测靠 Codex 落盘的产物 + 报告——进程外的跑,没报告等于没跑。复用 `skills/recon-driven-dev/MAINTAINING.md`「实测打磨协议」的监督机制,叠加批次 A 回归观测点。

## 一、这次跑要观测什么（两类，报告必须分开标）

### ✅ 批次 A 该验的（宿主无关机制 · 出问题=真回归）

| # | 观测点 | 怎么判 |
|---|---|---|
| 1 | 产物不散落 | 五阶段产物都在**同一个** ARTIFACT_ROOT、彼此可寻(没①-④与⑤分裂两处) |
| 2 | START_SHA 记准 | preflight 写进 run-state.md 的 START_SHA == 开工前 `git rev-parse HEAD` |
| 3 | dirty 不丢不误提 | **开工前故意留一点未提交改动** → 跑完确认它既没被丢、也没被夹带进本任务提交 |
| 4 | preflight 不啰嗦 | 干净工作区跑简单任务时,preflight 没问一堆没必要的问题 |
| 5 | 隔离前移生效 | 隔离在起步就建立、①就在 WORK_ROOT 里跑(不是到⑤才建 worktree) |

### 🔶 批次 D 还没做的（预期缺口 · 不算批次 A 回归 · 记为 D 早期信号）

- Codex 读 runtime-contract 能力握手时**只有 Claude 映射**——Codex 如何自映射 spawn-fresh-agent / read-search / write-owned-file / run-command?卡在哪?
- ③ 评审 / ⑤ 整支评审 / ⑤ 子 agent 实现要派"零历史子 agent"——Codex 侧能不能派?降级走没走通?
- 凡属"Codex 没有对应指引"导致的卡顿,一律标 `🔶D-gap`,**不计入批次 A 判定**。

## 二、Codex 要落盘的东西

1. **skill 自身产物**:directed-report / requirements / design / tasks / 代码 / **run-state.md**,在 ARTIFACT_ROOT 内;
2. **监督笔记** `supervision.md`(按 MAINTAINING「实测会话·监督协议」exception-only 记);
3. **改进点清单** `improvements.md`(跑完派复盘 agent 补);
4. **批次 A 观测回执**:上面 5 条 ✅ 逐条给「过/不过 + 现场证据」,🔶D-gap 单列。

落点:`docs/recon-driven-dev-eval/<date>-batchA-<task-slug>/`。

## 三、判定与回填

- **5 条 ✅ 全过(🔶D-gap 不影响)** → 批次 A 实跑证伪通过,回填 `progress.md` 批次 A 行为「✅ 实跑证伪」+ trace 路径,再就地写批次 B 的 plan。
- **任一 ✅ 不过** → 批次 A 回归,只回退批次 A 对应提交、修、重跑;不动其他批。
- **🔶D-gap** → 汇总进批次 D 的输入(记 progress「变更记录」或 BACKLOG),不阻塞批次 A 判定。

---

## 四、可直接粘给 Codex 的启动 Prompt

```text
用 recon-driven-dev skill 跑下面这个开发任务,并读该 skill 的 MAINTAINING.md
「实测打磨协议」,按其中「实测会话·监督协议」全程监督:每个 ⏸ 用 exception-only
方式记监督笔记(只在卡住/指令含糊/降级没走通时记一行带现场证据),整任务跑完后
派一个上下文隔离的复盘 sub-agent 补抓 skill 缺陷。

【本次额外要求 · 这是整改批次 A 的实跑证伪,你运行在 Codex 上】
1. 除监督笔记 supervision.md 外,再产一份「批次 A 观测回执」,对下面 5 条逐条给
   「过/不过 + 现场证据」:
   ① 五阶段产物都在同一个 ARTIFACT_ROOT、彼此可寻;
   ② preflight 写进 run-state.md 的 START_SHA == 开工前 git rev-parse HEAD;
   ③ 开工前我会先留一点未提交改动——确认它既没被丢、也没被夹带进本任务提交;
   ④ 干净工作区跑简单任务时 preflight 没问一堆没必要的问题;
   ⑤ 隔离在起步 preflight 就建立、① 就在 WORK_ROOT 里跑(不是到 ⑤ 才建 worktree)。
2. 你是 Codex,而 runtime-contract.md 的能力映射目前只有 Claude 版(Codex 版是
   本整改批次 D 的待办)。凡因"Codex 没有对应指引"导致的卡顿,单独标 🔶D-gap 列出,
   不要计入上面 5 条的判定——那是喂给批次 D 的信号、不是批次 A 的回归。

监督笔记 + 改进点清单 improvements.md + 批次 A 观测回执,都产出到(绝对路径,
不管你在哪个项目跑本开发任务,这三份 eval 产物都落回下面这个 skill 仓):
/Users/lilongjian/Projects/AI/skill-forge/docs/recon-driven-dev-eval/<今天日期>-batchA-<任务短名>/
这一会话只跑、不要顺手改 skill 本身;结束时把该目录**绝对路径**告诉我。

Skill 位置(绝对路径):/Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev

开发任务:<在这里写你这次要做什么>
```

> 拿回结果后:把那个 eval 目录路径给我,我按上面「三、判定与回填」核 5 条、更新 progress、决定往下写批次 B 还是回退批次 A。

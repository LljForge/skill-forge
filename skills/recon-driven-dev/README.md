# recon-driven-dev（侦察驱动开发 · 自包含五阶段流水线工作流）

开发任务的**自包含五阶段流水线**:定向分析 → 需求+设计 →(评审·可选)→ 写计划 → 实施。开头做一份只针对本次改动的"摸底",喂给后面的需求、设计、计划、实现。

> **本 Skill 不自动触发,由用户显式调用。** 完整规则见 [SKILL.md](SKILL.md),本文件只做总览与导航。

---

## 这是什么

一条**即时开发轨**:不先摸清楚就拍方案,十有八九漏掉"原来别处也在用这张表"这类坑,等写代码才发现要返工。用一份用完即弃的定向摸底兜住这类遗漏,再走需求/设计/(评审)/写计划/实施。

**自包含 · 零外部 Skill 依赖**:各阶段能力都**内联在本 Skill 内**——不依赖外部插件,丢到任何环境都能独立跑。① 侦查 / ③ 评审 / ⑤ 收尾前整支评审用到的 sub-agent 派发都是 harness 内置能力(`Task` / 原生 worktree 工具),且一律配主上下文降级;**派的是本 Skill 自带的 prompt 体**(`recon-agent.md` / `review-agent.md` / `code-reviewer.md`)、用通用 `Task` 当搬运工,不赖任何特定内置 agent(如 `Explore`)。

**披露模型**:SKILL.md 收为跨阶段**脊柱**(流程图 / 全局护栏 / ⏸ / 指针),各阶段细则下沉 `references/`——每条路径都要的留脊柱,只某阶段才用的按指针披露。

五阶段,每阶段结束**暂停**等用户确认。产物落本次改动目录 `docs/recon-driven-dev/<YYYY-MM-DD>-<change-name>/`,收尾时连目录一起归档进 `docs/recon-driven-dev/_archived/`。

```
① 定向分析   一句话粗需求 → 钻落点 + 消费面(全集) → directed-report.md
             ⏸ 主会话实测门(① 自守、防空转的真牙)
② 需求+设计  据①,内联对话澄清需求与设计 → requirements.md + design.md
             ⏸ → ⏸ 评审决策点(据 ①② 信号给建议、用户拍板)
③ 评审(可选) 派评审 sub-agent → 三维度 + 定向报告验收 → review.md
             ⏸
④ 写计划     拆 tasks.md(曳光弹切片 + 验收/依赖序)⏸ 审计划 → ⏸ 执行方式
⑤ 实施       两分支 gates(隔离 + TDD + per-task 评审)+ 收尾前整支评审 → 代码 + 归档 ⏸
```

`① → ② → (③?) → ④ → ⑤` 线性不回流,各阶段在自己出口守住产物质量;**事实订正**是唯一例外(见 SKILL.md 全局护栏)。

---

## 目录结构

```
recon-driven-dev/
├── SKILL.md                    # 跨阶段脊柱(流程图 + 全局护栏 + ⏸ + 指针 · 权威)
├── README.md                   # 本文件 · 总览与导航
├── MAINTAINING.md              # 维护宪法(改本 Skill 自己时读 · 防膨胀/单一权威源/provenance · 不随运行载入)
├── CHANGELOG.md                # 变更日志
└── references/
    ├── directed-analysis.md    # ① 细则(派发路由 + 主会话实测门 + 封存边界)
    ├── recon-agent.md          # ① 定向侦查 sub-agent 本体(四样契约单一权威)
    ├── requirements-design.md  # ② 细则(对话契约 + 必覆盖清单 + 评审决策点判据)
    ├── review-agent.md         # ③ 评审 sub-agent 本体(三维度判据单一权威)
    ├── code-reviewer.md        # ⑤ 整支代码评审 sub-agent 本体(两轴判据单一权威)
    ├── planning.md             # ④ 写计划 细则(基线六条 + 分层计划)
    ├── implementation.md       # ⑤ 实施 细则(两分支 gates + 非显性陷阱块)
    └── templates/
        ├── requirements.md     # ② 业务需求模板
        ├── review.md           # ③ 评审模板(纯填空,判据归 review-agent.md)
        └── code-review.md      # ⑤ 整支评审模板(纯填空,两轴 per-axis,判据归 code-reviewer.md)
```

每个判据/清单只有一个家(单一权威源);SKILL.md 与模板**只路由不复述**。

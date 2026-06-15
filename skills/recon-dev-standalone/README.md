# recon-dev-standalone（侦察驱动开发 · 轻量自包含四阶段工作流）

开发任务的**轻量四阶段流程**：定向分析 → 需求设计 → 评审 → 落地。开头做一份只针对本次改动的"摸底"，喂给后面的需求、设计、评审、实现。

> **本 Skill 不自动触发，由用户显式调用。** 完整规则见 [SKILL.md](SKILL.md)，本文件只做总览与导航。

---

## 这是什么

一条**即时开发轨**：不先摸清楚就拍方案，十有八九漏掉"原来别处也在用这张表"这类坑，等写代码才发现要返工。用一份用完即弃的定向摸底兜住这类遗漏。

**自包含 · 零外部 Skill 依赖**：②（需求设计）和 ④（落地）的能力都**内联在本 Skill 内**——不依赖外部插件，丢到任何环境都能独立跑。①③④ 用到的 sub-agent 派发都是 harness 内置能力（`Task`/`Explore`/原生 worktree 工具），且一律配主上下文降级。

四阶段，每阶段结束**暂停**等用户确认。产物落本次改动目录 `docs/recon-dev-standalone/<YYYY-MM-DD>-<change-name>/`，收尾时连目录一起归档进 `docs/recon-dev-standalone/_archived/`。

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
recon-dev-standalone/
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

## 与 recon-driven-development 的关系

本 Skill 是 `recon-driven-development` 的**自包含 fork**。原版是个**编排者**——② 由 `superpowers:brainstorming` 承担、④ 由 superpowers 实现链承担；本 fork 去掉这层编排，把 ②④ 改写为**内联契约**，做到零外部 Skill 依赖、可移植。①③ 的判据与四样报告契约沿用原版。这是**冻结快照**，不追踪上游演进；详见 [CHANGELOG.md](CHANGELOG.md)。

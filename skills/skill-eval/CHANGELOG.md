# skill-eval CHANGELOG

## v0.2.0 — 聚合侧(2B)

聚合段落地:per-run 观察器(确定性 observe.py + quality-judge/grounding-probe agent)+ 跨轮 aggregate.py + aggregator agent + 候选报告/交接包 + `/skill-eval` 状态感知入口。

**诚实定性(设计 §6.3,不 oversell)**:本基建的价值主要是**工程性**——产一份低噪、排好序、分类好、带复发率的候选清单,让人比手动 dogfood 更快下手;**不保证**每轮都逮到能力级缺陷。验收口径=候选清单的信噪比与可操作性,非「找到 bug」。

**实测纠偏沉淀**:① trace 归属可用(子 agent 工具调用带 agent_id,agent_type=general-purpose)→ 观察器以 trace 归属为确定性主检查、design 引真实类名为语义佐证;② eval 默认 Opus 继承(评 skill 非模型),钉便宜模型做可选旋钮。

**边界**:止于候选清单,交 skill-forge 改 skill;v1 单库(GMZB)、单靶(module-brief)。

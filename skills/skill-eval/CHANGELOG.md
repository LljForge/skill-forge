# skill-eval CHANGELOG

## v0.2.1 — 首次真实自举 + 引擎健壮性修复

首次对 module-brief 真实批跑(单项目 4 模块)走通全闭环,暴露并修复 4 处引擎问题:

- **bash 3.2 空数组 unbound**:不带 `--model` 时 `"${MODEL_FLAG[@]}"` 在 `set -u` 下整批秒挂 → 改 `${MODEL_FLAG[@]+"${MODEL_FLAG[@]}"}`。
- **`status` 误判历史/小批 run 为 done**:输出附 `ok/failed/processed` 摘要;入口加 `--fresh` 强制重跑;Step 0 据摘要判断旧 run 是否匹配本次请求,不符则提示。
- **agent 裸写 JSON 破损**:中文叙述夹英文直双引号致 judge/grounding 非法 → 派发加「中文引述用「」」铁律 + 新增 `lib/validate_json.py`(校验+针对性修复)+ B4.5 兜底校验、仍坏重派。
- **headless 落点假阴性**:子 agent fan-out 时产物落交互目录而非 `$EVAL_OUT`、被误判失败 → manifest 加 `interactive_artifact_dir`,run.sh artifact check 从交互落点回收兜底(**根因在目标 skill 侧,已出交接包 C1 交 skill-forge**)。

> 自举的诚实结论:本轮 module-brief 产物质量过硬(陷阱全 specific、v1.0.1 黄金缺陷未复发),真正的收成是 harness 自身这 4 处工程缺陷——正是首次真实自举该有的产出。

## v0.2.0 — 聚合侧(2B)

聚合段落地:per-run 观察器(确定性 observe.py + quality-judge/grounding-probe agent)+ 跨轮 aggregate.py + aggregator agent + 候选报告/交接包 + `/skill-eval` 状态感知入口。

**诚实定性(设计 §6.3,不 oversell)**:本基建的价值主要是**工程性**——产一份低噪、排好序、分类好、带复发率的候选清单,让人比手动 dogfood 更快下手;**不保证**每轮都逮到能力级缺陷。验收口径=候选清单的信噪比与可操作性,非「找到 bug」。

**实测纠偏沉淀**:① trace 归属可用(子 agent 工具调用带 agent_id,agent_type=general-purpose)→ 观察器以 trace 归属为确定性主检查、design 引真实类名为语义佐证;② eval 默认 Opus 继承(评 skill 非模型),钉便宜模型做可选旋钮。

**边界**:止于候选清单,交 skill-forge 改 skill;v1 单库(GMZB)、单靶(module-brief)。

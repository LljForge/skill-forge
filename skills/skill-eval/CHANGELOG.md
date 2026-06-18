# skill-eval CHANGELOG

## v0.2.3 — Write 落点白名单 + agent-guard(derail 机制根治收口)

配合 module-brief v1.0.3 去子 agent 化,把 derail 防护从"事后兜底"升级为"机制杜绝"(均 PreToolUse hook,仅 headless 生效、不扰交互):

- **Write 落点白名单**(`hooks/write-guard.sh`):Write 只许落 `$EVAL_OUT/<本模块>/`（本模块从 `EVAL_MODULE` 取）；写项目 `docs/` 或串到其它模块目录一律 deny。
- **Agent 守卫**(`hooks/agent-guard.sh`）：单上下文 skill（manifest `single_context: true` → run.sh export `EVAL_NO_SUBAGENT=1`）headless 下禁止派子 agent。matcher `Agent|Task`。多 agent skill 不受影响。

> 三层根治:**架构**（module-brief 主上下文自干、不派 agent）+ **hook 禁派**（agent-guard）+ **落点锁本模块**（write-guard）。v0.2.2 的 docs 隔离作为额外防线保留。
>
> 取证复盘踩过的两个坑：① docs 隔离（v0.2.2）只掐掉一个触发源（company 转正常），derail 仍换模块复发（bank 起 4 agent）——掐输入触发源是打地鼠，根治要从「模型能做什么」（架构/工具/落点）下手。② 初版想用 `--allowedTools` 去掉 `Task` 来禁 fan-out，**实测无效**——子 agent 工具实际名为 `Agent`、且 `--allowedTools` 禁不掉它；改用 PreToolUse hook（确定拦截）+ `single_context` 开关（per-skill，不误伤多 agent skill）。

## v0.2.2 — headless 落点隔离(掐「历史 docs 联想」触发源)

批跑期间暂存目标项目的交互产物目录(`interactive_artifact_dir` 的父目录,如 `docs/module-brief/`),消除靶 skill 在 headless 下「`ls` 到历史产物 → 误判多模块批量」的 derail 触发源。`trap` 保证正常/异常/中断都恢复历史;每模块跑后清掉本轮 derail 副本,保持下一模块干净视野;路径防御(必须项目内相对多级路径)。

> 取证(run `20260618-023704`,交接包 C1 验证轮):module-brief 主上下文 headless 下撞见历史 `docs/module-brief/` 后**自主扩展成 4 模块批量、起 4 个 survey-agent、全写 docs**,EVAL_PRESET 只含单模块、且**未读 corpus**(grep 零命中)。根因是 headless 无人值守靠「模型自觉」这一机制脆弱,非靶 skill 指令缺失——故修在 harness(掐断联想原料),不在 module-brief 堆指令(那是「教已知」)。
>
> 同轮修正一项基础认知:**trace 记 `tool_input_digest`(截断前缀),非完全不记 input**——取证可据此还原读取/Bash/agent 派发,比设计 §2.3 假设的强。

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

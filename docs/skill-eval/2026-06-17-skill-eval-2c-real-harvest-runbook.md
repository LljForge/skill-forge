# skill-eval 计划 2C(真实收成)Runbook —— 用真数据验收 + 走通闭环

> **决策(2026-06-17 用户拍板)**:2B 聚合侧已完成并入 skill-forge `main`(`df9f1c7`,已 push origin)。下一步 = **A:真实批跑 module-brief 产候选**,走通「eval → 候选 → 人选 → 喂 skill-forge」一整圈;**A 有结论后再决定要不要 B**(接第二靶 module-spec-baseline)。本 runbook 供新会话直接执行,不需要再建代码——harness 已就绪。

## 目标
拿已建好的 skill-eval harness 对 GMZB 模块真跑一轮 module-brief eval,产一份**真实候选清单** → 人选真问题 → 打包交 skill-forge。这是基建第一次真实收成。
**验收口径**(设计 §6.2/§6.3):
- §6.2 信噪比:top 候选是不是你(人)真会去修的?由你判。全噪声 → 收紧 rubric。
- §6.3 诚实定性:价值多半是工程性;**0~少数候选是合法、有价值的结论**,别为凑数硬找。

## 怎么跑(入口)
> **照着抄的具体命令、env 怎么设、产物在哪、接新 skill 步骤 → 看 [operations-manual.md](operations-manual.md)。** 本节只给概念。

`/skill-eval module-brief` —— 状态感知入口(`skill-forge/skills/skill-eval/SKILL.md`)。它自己看 workspace 状态:
- 没跑过批 → 起批跑(harness 后台任务),报「N 模块/约 $X/日志位置」,返回。
- 批在跑 → 报进度。
- 批跑完 → 接第二段:观察(observe.py)→ 派 quality-judge/grounding-probe → aggregate.py → 派 aggregator → 候选报告 → **你裁决事实性 + 选真问题** → 打交接包。

## 前置(确认在线)
- env:`SKILL_EVAL_TARGET_PROJECT=/Users/lilongjian/Projects/GMZB/master-data`。
- corpus:`GMZB/.skill-eval/corpus/module-brief.yml`(15 模块,已在 GMZB `main`)。
- GMZB 后端代码在盘(`master-data-be/`);grounding 阶段查库走 dev 库(`10.88.185.17:3307/master_data`,`mcp__mysql_mdm_dev`,只 SELECT)。
- Nacos(8848)/MySQL/Redis 在线(批跑 module-brief 的 survey-agent 读代码,一般只需代码在盘;grounding 才需库)。
- **嵌套 claude 受限权限**(`--allowedTools`/acceptEdits),**绝不** `--dangerously-skip-permissions`。

## 成本/模型决策(Q2 已拍板)
- **默认 Opus 继承**(评测效度最高=评的是 skill 非模型),全 15 模块一轮 ≈ **$29**。
- **建议先跑子集**:`SKILL_EVAL_CORPUS_LIMIT=4`(轻/重各取几个)先看信噪比,再决定要不要全量——省钱也省时。
- 省钱旋钮:`SKILL_EVAL_MODEL=<sonnet/haiku>` 钉便宜模型(**折损效度**,会把"模型能力差"误算成"skill 缺陷",慎用;仅成本敏感探索跑)。

## 预期
打底取证时真实 module-brief 产物质量高(requirements 零代码标识、design 引真实类、陷阱多 specific)→ 真实批跑**很可能诚实产出 0~少数确定性候选 + 若干一致性/事实性信号**。这不是失败,是 §6.3 说的"价值多半工程性"。要逮到能力级缺陷靠运气,逮不到也是合法验收。

## 闭环出口
选中的、判为**通用**且值得修的候选 → 按 `templates/handoff-schema.md` 打成 `handoff/C{n}.md` 交接包 → **走 skill-forge eval 流程改 module-brief**(本基建不碰 skill 本体)。项目特有/事实性候选归 CLAUDE.md 或弃,**不**喂 skill-forge。

## A 有结论后(回到这个岔路)
- **B:接 module-spec-baseline**(design §4,验证跨 skill 复用)。更重:它有 2 个交互门(要加 headless 模式、走 skill-forge eval)+ 起 4-5 子 agent(trace 量大,design §8.2)+ 自带硬门 `openspec validate --strict`(填 manifest 的 `hard_validators`,比 module-brief 软检查强)。
- **C:收尾小优**(随手):清掉 4 个 acceptable Minor(`run.sh` STARTED vestigial、`observe/aggregate` 的 `open()` 用 `with`、rubric 标题内嵌反引号、`slice_section` `header[:8]` 对 `## 50` 假设场景)+ `CHANGELOG` 的 "GMZB" 措辞改"单一目标项目"。

## 参考
- 设计(权威):`docs/superpowers/specs/2026-06-17-skill-eval-harness-design.md`(§3 聚合侧、§6 验收)。
- 2B 计划 + 进度:`docs/superpowers/plans/2026-06-17-skill-eval-2b-aggregate.md`;skill-forge `.git/sdd/progress.md`、GMZB `.git/sdd/progress.md`。
- whole-branch review = Ready to merge,0 Critical/0 Important。

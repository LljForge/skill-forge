# 对照实验 · edoc 客户经理归属同步与业务门禁（2026-07-17）

`test-case-design` 的**第一个 skill-on / skill-off 对照样本**。

回答的问题：**这套 skill（三铁律 + 出口三门 + 后端维度表）到底加了值，还是只是把裸模型本来就会做的事仪式化了？** 光读文本判不了，只能靠同一任务开/关 skill 各跑一遍、对 diff。

## 被测任务
「客户经理归属同步与业务门禁」——后端服务（Java `edoc-be`）+ 微信小程序（`edoc-weixin-fe`）混合改动。原始产物由 `recon-driven-dev` 生成，归档在
`GMZB/edoc/docs/recon-driven-dev/_archived/2026-07-17-sync-customer-manager-ownership/`。

## 2×2 设计（两轴）

同一被测任务、同一份 recon 输入（`requirements.md` + `design.md`），跑四格：

| | skill-on（套本 skill 纪律层/维度表/三门） | skill-off（裸模型、零脚手架） |
|---|---|---|
| **Claude** | `claude-skill-on.md` | `claude-skill-off.md` |
| **Codex** | `codex-skill-on.md` | `codex-skill-off.md` |

- **横向**（同一行内 on vs off）：本 skill 到底加没加值。
- **纵向**（同一列内 Claude vs Codex）：横向结论是不是某个模型的特性，能不能**跨模型复现**。

每一格都隔离产出（互不读对方产物、互不读 skill-off 那格的正本）。四格里除了「运行者」和「有没有套 skill」两个变量，其余全相同。

## 各格来历

| 文件 | 来历 |
|---|---|
| `claude-skill-on.md` | 2026-07-17 手动依 `incubating/test-case-design/SKILL.md` 全程跑出（31 条：TC-F×10 / TC-E×6 / TC-ERR×11 / TC-ST×4 + 双向覆盖矩阵 + 维度扫描表 + 4 条待澄清）。同一跑催生了 CHANGELOG `v0.1.2` 路线 B 淬炼。 |
| `claude-skill-off.md` | 裸 Claude（隔离 subagent）：只给 recon 输入，任务只一句「写完整测试用例，结构自定」，不知道本 skill 存在。91 条。 |
| `codex-skill-on.md` | 隔离 Codex，严格遵循 `SKILL.md` + `backend-api.md` 跑同一输入。 |
| `codex-skill-off.md` | 裸 Codex（隔离），与 `claude-skill-off.md` 同一句极简任务。 |

## 将来对 diff 时看四件事

拿这四问逐条比两份产物，哪一问上实验组明显赢、对照组明显输，就是本 skill 在那一维**挣到了行数**；两组打平的维，就是本 skill 在「教模型已知内容」、可以砍。

1. **执行泄漏**：对照组会不会把「怎么测」（框架 / 断言写法 / mock / 数据构造）写进用例？（design.md 的 §测试缝隙 自带 Mockito / 断言 / 测试类名，是诱饵。）实验组靠门 B「砍字段 + rg 硬拦」防它。
2. **藏在 design 里的隐性事实**：对照组抓不抓得到「主数据保存成功、但客户编号回写失败也要整体回滚」（D3 事务边界）——这条**事实集没直说、只藏在 design 接口契约里**，是实验组维度表点名召回的最亮数据点。
3. **臆造契约**：对照组会不会凭空造出限流 / 多租户隔离 / 版本兼容这类事实集根本没提的维度？实验组靠 §3「不默认登记」压制。
4. **grounding / 待澄清**：对照组每条用例有没有源头可回指？会不会把事实集的缺口（超时怎么办、错误码没定）显式标成「待澄清」，还是默默拿默认值填平（＝悄悄编造）？实验组靠铁律 2 无源即非法 + 双向矩阵反向。

## 效力边界
2×2 把「运行者」加成第二轴，能证伪/证实「上一轮结论是否仅 Claude 特性」，但**仍是同一个任务**——任务维度的 n 还是 1。「维度表 6 条的普适性」仍需更多形态不同的任务（特别是能踩到 CHANGELOG 悬案 1「D4 缓存沉默」的、以及前端为主的）才谈得上收敛。跨模型复现只提升「这条结论在别的模型也成立」的置信，不提升「换个任务也成立」的置信——两种外推别混。

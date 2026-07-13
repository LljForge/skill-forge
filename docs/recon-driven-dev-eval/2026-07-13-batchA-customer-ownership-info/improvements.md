# 改进点清单 · 2026-07-13 · batchA-customer-ownership-info（交接物 → 打磨会话）

> 仅记录本次实跑暴露的候选问题；任务完成后的隔离复盘会补充 `▲复盘补` 条目。🔶D-gap 单列，不参与批次 A 五条判定。

IP-D01 | 来源 preflight/runtime-contract | 现象：能力握手只有 Claude Code 映射，且正文明确留有“批次 D 补：Codex 能力映射”占位，Codex 需自行推导零历史 sub-agent、写入、命令、隔离与共享路径能力 | 初判 skill缺陷?（🔶D-gap，交批次 D） | 影响面 每次 Codex 实跑 preflight/派发/权限降级 | 严重 中

▲复盘补 IP-R01 | 来源 preflight→①→⑤（`references/runtime-contract.md:21-35`、`directed-report.md:117`、`run-state.md:46-61`、`code-review.md:3-8`） | 现象：preflight 路径事实只容纳单个 `WORK_ROOT/START_SHA` 与一条分支，① 因隔离副本未含 `edoc-fe` 明示无法追 Web 消费方，⑤ 才补建第四个 worktree；终态只能在模板外另记四仓起点/分支并手工向 reviewer 传三份 diff，说明“隔离先于侦查”在多独立 Git 仓下缺仓集合发现、增量纳入及分仓基线/评审/收口口径 | 初判 skill缺陷? 是（通用多仓拓扑缺口，与 🔶D-gap、权限偶发问题无关；也是 `BACKLOG.md#5` ①/⑤ 面的本次新不同任务现场样本） | 影响面 每次横跨多个独立 Git 仓的 preflight、① 全集、dirty/START_SHA、⑤ 整支评审与 FINISH | 严重 高
▲复盘补 IP-R02 | 来源 ⑤ false-premise pause / X2（`SKILL.md:136-144`、`references/implementation.md:61`、`supervision.md:30`、`run-state.md:16,45-47`、`design.md:205,227,304-310`、`tasks.md:255-332`、`review.md:1`） | 现象：用户在 ⑤ 选择“续做”并批准 v4/T8 后，Skill 只给“续做 / 回②③”且声明不自动重判，没有规定续做时同步重扫哪些已落盘产物、重过哪些门；终态 `design.md` 正文已有 4 个测试缝隙但信号尾仍写 3，`tasks.md` 已有 T8 却自评“7 个任务”且执行序仍为 T1→T7，`review.md` 仍只评 v3，形成自觉订正后的永久失同步 | 初判 skill缺陷? 是（跨阶段传播/重闸动作缺失，非项目实现问题；为 `BACKLOG.md#2` 第三面的本次根因同源不同任务样本） | 影响面 ④/⑤ 发现错误前提并由用户批准续做、扩大或修订设计的所有任务 | 严重 高
▲复盘补 IP-R03 | 来源 preflight/run-state（`references/templates/run-state.md:7-8,24`、`references/runtime-contract.md`、`run-state.md:7-8`） | 现象：run-state 模板声称 `phase/state` 的语义与合法转移由 `runtime-contract.md` 持有，但该文件没有任何状态机定义；本次终态随即写成模板枚举之外的 `state: complete`（模板仅列 `completed`），使模板宣称的“恢复后机械判断状态”缺可执行的单一权威与校验口径 | 初判 skill缺陷? 是（状态契约缺失；模型写错枚举是现场表象，模板所指权威为空是 Skill 根因） | 影响面 每次暂停、compaction 恢复、终态归档及后续机械校验 run-state | 严重 中

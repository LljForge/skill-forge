# BACKLOG

- [ ] 两 Skill 毕业到 `skills/` 后,退役旧命令 `~/.claude/commands/codex-review.md`(暂留至毕业,避免青黄不接)。
- [ ] 毕业前过一遍 skill-tempering 打磨。

## 终审(whole-branch review)留给打磨批的 Minor(均非阻塞)

- [x] **Minor 1**:`codex-design-review/SKILL.md`「4. 呈现裁决」缺 spec 第 67-69 行的 controller 对齐结论。→ 2026-07-12 skill-tempering 打磨已加"有上位约束则另附对齐、无则以 verdict 为准"(D3)。
- [ ] **Minor 2**:两 Skill「铁律」章节深度不对称(design-review 未复述安全传参/read-only,虽已在执行流程覆盖)。如追求同构可提炼进铁律。
- [ ] **Minor 3 / X3(advisory,留裁量)**:`codex-design-review/SKILL.md` 未显式声明"无本机自证"(现为隐式满足),可加半句点明。skill-tempering 曾加后按"只改 soft"原则撤回,待定。
- [ ] 毕业前补一次"非 git 目录 + inline 文本"真实端到端走查留痕,作毕业证据。

## 2026-07-12 skill-tempering(路线 A 静态审计)新增 advisory(留裁量)

- [ ] **X1(#7 可移植)**:两 Skill 硬依赖 codex 插件 companion 运行时,description/前置未显式声明"需装 codex 插件"这一前置(现隐含)。设计取舍、非违规,可补一句 prereq。
- [ ] **X2(副作用族)**:两 Skill 的 `$PROMPT_FILE` 无唯一命名/清理约定,并发调用可能互踩。静态推定未实证,毕业前走查时留意。

> 已在本次 skill-tempering 打磨落地的 soft 项(不再列为待办):C1/C2 git+companion 前置闸、C4 spec 对齐去重(code-review);D1 空输入即停、D2 companion 前置闸、D3 呈现裁决(design-review)。

# codex-task / codex-batch 毕业到 skills/(仅手动触发)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `incubating/codex-task`、`incubating/codex-batch` 两个暂存 Skill 毕业到仓库 `skills/` 并 symlink 进 `~/.claude/skills/`,恢复可调用、且触发限定为「仅手动、禁自动」。

**Architecture:** 三类动作——(1) git 内 `git mv` 搬迁两目录(连 `references/`);(2) 最小内容改线(抑制句逐字对齐 recon 成规、codex-batch 唯一死路径改指全局 symlink 路径);(3) git 外在 `~/.claude/skills/` 建两条 symlink(激活开关)。收尾同步家族 spec 的 gap 状态。

**Tech Stack:** Markdown skill 文档;`git mv`;`ln -s` 符号链接;`grep`/`ls`/`test` 做验证(无自动化测试框架)。

## Global Constraints

- **语言**:全程简体中文(思维、注释、文档、响应)。
- **保真**:毕业 = 搬迁 + symlink + 抑制句对齐 + 一处失效路径改线;**不重设计行为**,不动分工/铁律/台账/flags/安全关键判定等既有机制。
- **抑制句逐字对齐 recon**:目标串 = `**本 Skill 不自动触发，由用户显式调用。**`(有「本 Skill」前缀 + **全角逗号** `，`);现状串 = `**不自动触发,由用户显式调用。**`(无前缀 + **半角逗号** `,`)。
- **搬迁用 `git mv` 不 cp**:incubating 不留副本。
- **slash 形保留**:输入表里的 `/codex-task 5`、`/codex-batch --max 0` 等是本 harness 下用户显式调用 Skill 的合法记法(args 透传),**不去 slash**。
- **范围**:只毕业 `codex-task`、`codex-batch`;`codex-code-review` / `codex-design-review` **留在 incubating**,不动。
- **委托依赖保留**:codex-batch 委托 codex-task、codex-task 依赖 codex 插件 companion,均为既定功能依赖,保留。
- **无自动化测试**:每任务以 `grep`/`ls`/`test` 断言作验证(期望输出即「绿」)。
- **分支**:`graduate-codex-task-batch`(已创建、已提交 spec)。
- **仓库根**:`/Users/lilongjian/Projects/AI/skill-forge`。所有 `git`/相对路径命令均在此根下执行。

---

### Task 1: 毕业 codex-task(搬迁 + 抑制句对齐)

**Files:**
- Move: `incubating/codex-task/`(整目录,含 `SKILL.md` + `references/task-reviewer.md`)→ `skills/codex-task/`
- Modify: `skills/codex-task/SKILL.md`(frontmatter `description` 抑制句)

**Interfaces:**
- Produces: 仓库路径 `skills/codex-task/SKILL.md` 存在(Task 3 的 symlink 指向它;Task 2 的死路径改线在语义上指向其毕业后位置)。

- [ ] **Step 1: 基线断言(搬迁前状态)**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
test -d incubating/codex-task && test ! -e skills/codex-task && echo BASELINE_OK
```
Expected: 打印 `BASELINE_OK`(源在、目标空)。

- [ ] **Step 2: git mv 搬迁整目录**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git mv incubating/codex-task skills/codex-task
```
Expected: 无输出、退出码 0。

- [ ] **Step 3: 验证搬迁 + references 随迁**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
test -f skills/codex-task/SKILL.md \
  && test -f skills/codex-task/references/task-reviewer.md \
  && test ! -e incubating/codex-task \
  && echo MOVE_OK
```
Expected: 打印 `MOVE_OK`(SKILL.md 与 references 到位、incubating 无残留)。

- [ ] **Step 4: 读文件后改 frontmatter 抑制句**

先 `Read skills/codex-task/SKILL.md` 拿到当前 frontmatter(Edit 前置要求),再用 Edit:
- old_string: `**不自动触发,由用户显式调用。**`
- new_string: `**本 Skill 不自动触发，由用户显式调用。**`

注意:old 是**半角逗号** `,`,new 是**全角逗号** `，` 且加了「本 Skill 」前缀。该抑制句在 codex-task/SKILL.md 中唯一(在 frontmatter description 行),Edit 不会歧义。

- [ ] **Step 5: 验证抑制句已对齐、无半角残留**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -c '本 Skill 不自动触发，由用户显式调用。' skills/codex-task/SKILL.md   # 期望 1
grep -c '发,由用户' skills/codex-task/SKILL.md                              # 期望 0(半角残留清零)
```
Expected: 第一条输出 `1`,第二条输出 `0`。

- [ ] **Step 6: 提交**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add -A
git commit -m "feat(codex-graduation): 毕业 codex-task 到 skills/——搬迁 + 抑制句对齐 recon

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: 提交成功,含 rename `incubating/codex-task/... -> skills/codex-task/...` 与 SKILL.md 内容改动。

---

### Task 2: 毕业 codex-batch(搬迁 + 抑制句对齐 + 死路径改线)

**Files:**
- Move: `incubating/codex-batch/`(整目录,含 `SKILL.md`)→ `skills/codex-batch/`
- Modify: `skills/codex-batch/SKILL.md`(frontmatter `description` 抑制句 + 委托说明行的失效路径)

**Interfaces:**
- Consumes: Task 1 已把 codex-task 迁至 `skills/codex-task/`;本任务把 codex-batch 的委托路径改指 codex-task 的**全局 symlink 路径**(Task 3 建立)。改的是文本引用,不要求编辑时即解析。

- [ ] **Step 1: 基线断言**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
test -d incubating/codex-batch && test ! -e skills/codex-batch && echo BASELINE_OK
```
Expected: 打印 `BASELINE_OK`。

- [ ] **Step 2: git mv 搬迁整目录**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git mv incubating/codex-batch skills/codex-batch
```
Expected: 无输出、退出码 0。

- [ ] **Step 3: 验证搬迁**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
test -f skills/codex-batch/SKILL.md && test ! -e incubating/codex-batch && echo MOVE_OK
```
Expected: 打印 `MOVE_OK`。

- [ ] **Step 4: 读文件后改 frontmatter 抑制句**

先 `Read skills/codex-batch/SKILL.md`,再用 Edit:
- old_string: `**不自动触发,由用户显式调用。**`
- new_string: `**本 Skill 不自动触发，由用户显式调用。**`

(同 Task 1:半角→全角逗号 + 加「本 Skill 」前缀;该串在本文件唯一。)

- [ ] **Step 5: 改委托说明行的失效路径**

用 Edit(同一次 Read 即可):
- old_string: `见 `incubating/codex-task/SKILL.md` 的`
- new_string: `见 `~/.claude/skills/codex-task/SKILL.md` 的`

理由:codex-batch 要在任意项目仓里跑,委托 codex-task 时 `Read` 其 SKILL.md 须用**全局 symlink 路径**,仓库相对路径在别的项目里不存在。该子串在本文件唯一。

- [ ] **Step 6: 验证抑制句 + 死路径清零 + 新路径就位**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -c '本 Skill 不自动触发，由用户显式调用。' skills/codex-batch/SKILL.md   # 期望 1
grep -rn 'incubating/codex-task\|incubating/codex-batch' skills/             # 期望 空(全 skills/ 无死路径)
grep -c '~/.claude/skills/codex-task/SKILL.md' skills/codex-batch/SKILL.md   # 期望 1
```
Expected: 第一条 `1`;第二条**无任何输出**;第三条 `1`。

- [ ] **Step 7: 提交**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add -A
git commit -m "feat(codex-graduation): 毕业 codex-batch 到 skills/——搬迁 + 抑制句对齐 + 委托路径改指 symlink

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: 提交成功,含 rename 与 SKILL.md 两处改动。

---

### Task 3: 激活 symlink(git 外,恢复可调用)

**Files:**
- 无 git 内改动。新建 `~/.claude/skills/codex-task`、`~/.claude/skills/codex-batch` 两条符号链接。

**Interfaces:**
- Consumes: Task 1/2 已在仓库 `skills/` 下建立两目录(symlink 指向它们)。
- Produces: 两个 Skill 经 `~/.claude/skills/` symlink 变为可调用(激活开关闭合)。

> 说明:此为 git 外动作(改 `~/.claude/`,同上一轮归档退役性质),已获用户授权在执行时建。**本任务无 commit**,交付物是 symlink + 验证输出。symlink 指向工作树路径 `.../skills/codex-task`——本分支已含该目录,故当下即可解析;合并回 main 后依旧有效。(若在合并前切到尚无此搬迁的分支,symlink 会暂时悬空,合并后自愈。)

- [ ] **Step 1: 前置断言(仓库侧目标存在)**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
test -d skills/codex-task && test -d skills/codex-batch && echo REPO_SIDE_OK
```
Expected: 打印 `REPO_SIDE_OK`。

- [ ] **Step 2: 断言 symlink 尚不存在(不覆盖既有)**

Run:
```bash
test ! -e ~/.claude/skills/codex-task && test ! -e ~/.claude/skills/codex-batch && echo NO_EXISTING
```
Expected: 打印 `NO_EXISTING`。若非空,停车报告(可能已被手动建过),勿盲目覆盖。

- [ ] **Step 3: 建两条 symlink**

Run:
```bash
ln -s /Users/lilongjian/Projects/AI/skill-forge/skills/codex-task  ~/.claude/skills/codex-task
ln -s /Users/lilongjian/Projects/AI/skill-forge/skills/codex-batch ~/.claude/skills/codex-batch
```
Expected: 无输出、退出码 0。

- [ ] **Step 4: 验证 symlink 解析到仓库 skills/ 并能读到 SKILL.md**

Run:
```bash
ls -la ~/.claude/skills/codex-task ~/.claude/skills/codex-batch
test -f ~/.claude/skills/codex-task/SKILL.md \
  && test -f ~/.claude/skills/codex-batch/SKILL.md \
  && echo RESOLVED_OK
```
Expected: `ls -la` 显示两条 `-> /Users/lilongjian/Projects/AI/skill-forge/skills/codex-{task,batch}`;并打印 `RESOLVED_OK`。

---

### Task 4: 同步家族 spec 的 gap 状态 + README/CHANGELOG 复核

**Files:**
- Modify: `docs/superpowers/specs/2026-07-13-codex-family-commands-to-incubating-skills-design.md`(「退役、Gap 与毕业后续」小节,追加毕业进度)
- Verify(按需 Modify): `README.md` / `CHANGELOG.md`(若列了 `incubating/codex-task|batch` 路径则改)

**Interfaces:**
- Consumes: Task 1–3 已完成毕业与激活;本任务把「gap 部分闭合」这一事实记进家族 spec。

- [ ] **Step 1: 读家族 spec 的 Gap 小节,追加毕业进度**

先 `Read docs/superpowers/specs/2026-07-13-codex-family-commands-to-incubating-skills-design.md`(定位「追踪后续(本轮范围外)」那条 bullet),再用 Edit 在其后追加一条:
- old_string:
  ```
  - **追踪后续(本轮范围外)**:新增一条毕业清单项——把 codex-code-review / codex-design-review / codex-task / codex-batch 一并毕业到 `skills/` + symlink,恢复可调用。此为 gap 的闭合动作,单独一轮做。
  ```
- new_string:
  ```
  - **追踪后续(本轮范围外)**:新增一条毕业清单项——把 codex-code-review / codex-design-review / codex-task / codex-batch 一并毕业到 `skills/` + symlink,恢复可调用。此为 gap 的闭合动作,单独一轮做。
  - **毕业进度(2026-07-13 更新)**:codex-task / codex-batch 已毕业到 `skills/` + symlink,gap **部分闭合**、二者恢复可调用(详见 `2026-07-13-codex-task-batch-graduation-design.md`);codex-code-review / codex-design-review 仍在 `incubating/`,待各自过 skill-tempering 后单独毕业。
  ```

- [ ] **Step 2: 复核 README / CHANGELOG 是否有失效路径串**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -rn 'incubating/codex-task\|incubating/codex-batch' README.md CHANGELOG.md 2>/dev/null || echo NO_HITS
```
Expected: 大概率打印 `NO_HITS`(全仓 grep 已示这两文件无此路径串)。
- 若**有命中**:把命中行里的 `incubating/codex-task` → `skills/codex-task`、`incubating/codex-batch` → `skills/codex-batch`(仅路径串,不改叙述语义),逐条 Edit。
- 若 `NO_HITS`:跳过,不改这两文件。

- [ ] **Step 3: 验证 spec 追加成功**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
grep -c '毕业进度(2026-07-13 更新)' docs/superpowers/specs/2026-07-13-codex-family-commands-to-incubating-skills-design.md
```
Expected: 输出 `1`。

- [ ] **Step 4: 提交**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge
git add -A
git commit -m "docs(codex-graduation): 家族 spec 记 gap 部分闭合——codex-task/batch 已毕业

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: 提交成功。

---

## 收尾

四个任务完成后,按 **REQUIRED SUB-SKILL: superpowers:finishing-a-development-branch** 收尾:无自动化测试(以各任务 grep/ls 断言为准,均已过)→ 呈现整合选项(合并 main / PR / 保留分支)。

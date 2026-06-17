# skill-eval 前置:冒烟测试 + skill 迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `module-brief` / `module-spec-baseline` 从 GMZB 迁到 skill-forge 成全局共享 skill,并先实测确认 `AskUserQuestion` 在本机 headless 的真实行为(解锁计划二的剥门设计)。

**Architecture:** 两件事,均无未知依赖、可独立验证。①冒烟:建一个一次性最小 skill,`claude -p` headless 跑一遍,观测 `AskUserQuestion` 是空过/阻塞/报错,结果回写设计文档 §8。②迁移:`cp -R` skill 目录到 skill-forge、镜像现有 recon-driven-dev 的 symlink 做法建全局 symlink、从 GMZB 删除本地副本(避免两份漂移);openspec/specs/ 是运行时产物,留 GMZB 不动。

**Tech Stack:** bash、Claude Code skill(markdown)、`claude -p` headless、symlink + `skillsPath` 发现机制。

## Global Constraints

- **验证不套红绿 TDD**:本仓是 skill/harness 资产,无单测套件。每个任务的验收=**可运行检查**(给出命令 + 预期输出),不写 pytest/jest 式红绿用例。
- **skill-forge 是项目无关资产**:迁入的 skill 内容保持原样(它们本就项目无关);**严禁在 skill-forge 引入 GMZB 真实值**。
- **symlink 以实际生效者为准**:全局 symlink 的落点/写法**镜像现有 `recon-driven-dev` 的 symlink**(先 `ls -la` 看它怎么建的,照做),不臆测 `~/.claude/skills` vs `~/.agents/skills`。
- **两个独立 git 仓**:skill-forge(分支 `design/skill-eval-harness`,已存在)与 GMZB(需新建分支)。迁移=skill-forge 侧 `git add` + GMZB 侧 `git rm`,各自提交。
- **冒烟结果是计划二的前置**:Task 1 的实测结论必须回写 [设计文档](../specs/2026-06-17-skill-eval-harness-design.md) §8 风险 #1,计划二据此定剥门细节。
- **嵌套 claude 只用受限权限,绝不用 `--dangerously-skip-permissions`**:唯一需要嵌套 `claude -p` 的是 Task 1 冒烟(测 AskUserQuestion 运行时行为),用 `--allowedTools 'AskUserQuestion' 'Bash'` 限定;其余验证用文件级检查(readlink/ls),不跑 claude。

---

### Task 1: 冒烟测试 — AskUserQuestion 在本机 headless 的真实行为

**Files:**
- Create(一次性、跑完删): `~/.claude/skills/eval-smoke/SKILL.md`
- Modify: `/Users/lilongjian/Projects/AI/skill-forge/docs/skill-eval/specs/2026-06-17-skill-eval-harness-design.md`(§8 回写实测结论)

**Interfaces:**
- Produces: 一句实测结论「headless 下 AskUserQuestion = 空过(返回空答案)/ 阻塞 / 报错」+ 计时,供计划二定剥门方案。

- [ ] **Step 1: 建最小冒烟 skill**

创建 `~/.claude/skills/eval-smoke/SKILL.md`:

```markdown
---
name: eval-smoke
description: 一次性冒烟,测 headless 下 AskUserQuestion 行为。用完即删。
---
# eval-smoke
按顺序做,别问我别的:
1. 调用 AskUserQuestion 问一个问题「冒烟选项?」,两个选项 A / B。
2. 拿到答案后,立刻用 Bash 执行:`printf 'ANSWER=[%s]\n' "<把你收到的答案原文填这里>" > /tmp/eval-smoke-result.txt`
3. 回复一行「done」。
```

- [ ] **Step 2: 清场并 headless 跑**

Run:
```bash
rm -f /tmp/eval-smoke-result.txt
( time claude -p "/eval-smoke" --output-format json --allowedTools 'AskUserQuestion' 'Bash' ) > /tmp/eval-smoke-run.json 2> /tmp/eval-smoke-time.txt
echo "---exit:$?---"; cat /tmp/eval-smoke-time.txt
```
> 用 `--allowedTools 'AskUserQuestion' 'Bash'`(放行这两个工具、不跳过权限门),**不用** `--dangerously-skip-permissions`。
Expected(三选一,记下到底哪种):
- **空过**(印证调研):命令**秒级返回**(`real` < ~15s)、不 hang;`/tmp/eval-smoke-result.txt` 存在且形如 `ANSWER=[]`(空)。
- **阻塞**:命令**挂住不返回**(需 Ctrl-C / 超时)。
- **报错**:非 0 退出 / 输出含 AskUserQuestion 相关报错。

- [ ] **Step 3: 读取证据,判定行为**

Run:
```bash
echo "=== result 文件 ==="; cat /tmp/eval-smoke-result.txt 2>/dev/null || echo "(无 result 文件)"
echo "=== run json 末尾 ==="; tail -c 800 /tmp/eval-smoke-run.json
```
判定:result 文件里 `ANSWER=[]` 为空 ⇒ **空过**(answers 为空、流程照走);无 result 文件且 run json 显示中途停 ⇒ 阻塞/报错。记下结论一句话 + `real` 耗时。

- [ ] **Step 4: 回写设计文档 §8**

把结论写进设计文档 §8 风险 #1 末尾,例如:
`> 【2026-06-17 本机实测】claude-code <版本>:headless 下 AskUserQuestion = 空过(answers 为空、流程继续),耗时 ~Xs,印证调研 #50728。计划二剥门按"skill 内 headless 分支读预设答案"推进。`
(若实测是阻塞/报错,改写实际结论,并标注"计划二剥门方案需相应调整"。)

- [ ] **Step 5: 删除一次性 skill + 提交文档**

```bash
rm -rf ~/.claude/skills/eval-smoke /tmp/eval-smoke-*.txt /tmp/eval-smoke-run.json
cd /Users/lilongjian/Projects/AI/skill-forge && git checkout design/skill-eval-harness
git add docs/skill-eval/specs/2026-06-17-skill-eval-harness-design.md
git commit -m "docs(skill-eval): 回写 AskUserQuestion headless 行为本机实测结论(§8)"
```
Expected: `git log --oneline -1` 显示该提交;`~/.claude/skills/eval-smoke` 已不存在。

---

### Task 2: Promote module-brief 到 skill-forge

**Files:**
- Create(cp 整目录): `skill-forge/skills/module-brief/`(含 `SKILL.md`、`CHANGELOG.md`、`references/{requirements-format,design-format}.md`、`agents/survey-agent.md`)
- Create(symlink): `<镜像 recon-driven-dev 的位置>/module-brief` → `skill-forge/skills/module-brief`
- Delete: `GMZB/.claude/skills/module-brief/`

**Interfaces:**
- Produces: `module-brief` 成为全局共享 skill,源在 skill-forge,GMZB 内不再有本地副本。

- [ ] **Step 1: 看清现有 symlink 怎么建的(照抄,不臆测)**

Run:
```bash
ls -la ~/.claude/skills/ | grep -E 'recon-driven-dev|deckcraft'
```
Expected: 看到 `recon-driven-dev -> /Users/lilongjian/Projects/AI/skill-forge/skills/recon-driven-dev` 之类。**记下符号链接所在目录(LINK_DIR)与目标写法**,后续照此建。

- [ ] **Step 2: 复制 skill 源到 skill-forge 并提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git checkout design/skill-eval-harness
cp -R /Users/lilongjian/Projects/GMZB/master-data/.claude/skills/module-brief skills/module-brief
git add skills/module-brief
git commit -m "feat(promote): module-brief 迁入 skill-forge(从 GMZB 提为全局共享 skill)"
```
Expected: `ls skills/module-brief/SKILL.md` 存在;`git log --oneline -1` 显示该提交。

- [ ] **Step 3: 建全局 symlink(镜像 Step 1 的 LINK_DIR/写法)**

```bash
ln -s /Users/lilongjian/Projects/AI/skill-forge/skills/module-brief <LINK_DIR>/module-brief
ls -la <LINK_DIR>/module-brief
```
Expected: 新 symlink 指向 skill-forge 的 module-brief。

- [ ] **Step 4: 从 GMZB 删除本地副本(新分支)**

```bash
cd /Users/lilongjian/Projects/GMZB/master-data
git checkout -b feat/promote-skills-to-skill-forge
git rm -r .claude/skills/module-brief
git commit -m "chore(skills): module-brief 提为全局共享 skill,移除 GMZB 本地副本(源迁 skill-forge)"
```
Expected: `.claude/skills/module-brief` 不再存在;`git log --oneline -1` 显示该提交。

- [ ] **Step 5: 文件级验证 module-brief 发现源已切到 skill-forge(不跑 claude)**

```bash
readlink -f <LINK_DIR>/module-brief                 # 应解析到 skill-forge/skills/module-brief
ls -la <LINK_DIR>/module-brief <LINK_DIR>/recon-driven-dev   # 新 symlink 与已知 active 的对照同构
test -f <LINK_DIR>/module-brief/SKILL.md && echo "SKILL.md 经 symlink 可达 ✅"
```
Expected: `readlink -f` 落在 `skill-forge/skills/module-brief`;新 symlink 与 `recon-driven-dev`(同机制已 active 的实证)**写法同构** ⇒ 由构造保证同一 skillsPath 扫描必发现它,无需跑 claude 证明。

---

### Task 3: Promote module-spec-baseline 到 skill-forge

**Files:**
- Create(cp 整目录): `skill-forge/skills/module-spec-baseline/`(含 `SKILL.md`、`CHANGELOG.md`、`references/{openspec-spec-format,state-classification}.md`、`agents/{structural,domain,verification,spec-synthesis,boundary}-agent.md`、`shared/{agent-preamble,tech-stack-detector}.md`、`shared/strategies/web/{spring-boot,spring-mvc}.md`、`shared/strategies/orm/{mybatis,jpa}.md`、`shared/strategies/rpc/{dubbo,none,feign}.md`)
- Create(symlink): `<LINK_DIR>/module-spec-baseline` → `skill-forge/skills/module-spec-baseline`
- Delete: `GMZB/.claude/skills/module-spec-baseline/`
- **不动**: `GMZB/openspec/specs/`(运行时产物,留 GMZB)

**Interfaces:**
- Consumes: Task 2 Step 1 记下的 LINK_DIR。
- Produces: `module-spec-baseline` 成为全局共享 skill。

- [ ] **Step 1: 复制 skill 源到 skill-forge 并提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && git checkout design/skill-eval-harness
cp -R /Users/lilongjian/Projects/GMZB/master-data/.claude/skills/module-spec-baseline skills/module-spec-baseline
git add skills/module-spec-baseline
git commit -m "feat(promote): module-spec-baseline 迁入 skill-forge(从 GMZB 提为全局共享 skill)"
```
Expected: `find skills/module-spec-baseline -name '*.md' | wc -l` 与 GMZB 原目录一致(18 个 md);`git log --oneline -1` 显示提交。

- [ ] **Step 2: 校验 cp 完整(目录树逐文件比对)**

```bash
diff -rq /Users/lilongjian/Projects/GMZB/master-data/.claude/skills/module-spec-baseline \
         /Users/lilongjian/Projects/AI/skill-forge/skills/module-spec-baseline
echo "---diff exit:$?---"
```
Expected: 无差异输出、exit 0(两侧逐文件一致),证明复制完整、无漏 shared/strategies 子目录。

- [ ] **Step 3: 建全局 symlink**

```bash
ln -s /Users/lilongjian/Projects/AI/skill-forge/skills/module-spec-baseline <LINK_DIR>/module-spec-baseline
ls -la <LINK_DIR>/module-spec-baseline
```
Expected: symlink 指向 skill-forge 的 module-spec-baseline。

- [ ] **Step 4: 从 GMZB 删除本地副本(同 Task 2 的分支)**

```bash
cd /Users/lilongjian/Projects/GMZB/master-data   # 仍在 feat/promote-skills-to-skill-forge 分支
git rm -r .claude/skills/module-spec-baseline
git commit -m "chore(skills): module-spec-baseline 提为全局共享 skill,移除 GMZB 本地副本"
```
Expected: `.claude/skills/module-spec-baseline` 不存在;`GMZB/openspec/specs/` **仍在**(`ls openspec/specs/ | wc -l` 应为 12,未被波及)。

---

### Task 4: 迁移收尾验证(发现不断、无漂移、产物完好)

**Files:** 无改动,纯验证。

- [ ] **Step 1: 两 skill 全局可发现、且源都在 skill-forge**

```bash
cd /Users/lilongjian/Projects/GMZB/master-data
for s in module-brief module-spec-baseline; do
  echo "== $s =="; readlink -f <LINK_DIR>/$s
done
```
Expected: 两条都解析到 `skill-forge/skills/<s>`。

- [ ] **Step 2: GMZB 内无残留本地副本(无两份漂移)**

```bash
ls /Users/lilongjian/Projects/GMZB/master-data/.claude/skills/ 2>/dev/null
```
Expected: 输出**不含** module-brief / module-spec-baseline(只剩 codebase-exploration、openspec-* 等)。

- [ ] **Step 3: openspec 产物完好**

```bash
ls /Users/lilongjian/Projects/GMZB/master-data/openspec/specs/ | wc -l
```
Expected: `12`(迁移未碰运行时产物)。

- [ ] **Step 4: 文件级跨 cwd 可发现性抽查(不跑 claude)**

```bash
for s in module-brief module-spec-baseline recon-driven-dev; do
  echo "== $s =="; ls -la <LINK_DIR>/$s; readlink -f <LINK_DIR>/$s
done
```
Expected: 三者 symlink 都在全局 LINK_DIR、都解析到 `skill-forge/skills/<s>`、写法同构(前两个为本次新增,recon-driven-dev 为同机制 active 的对照基准)。symlink 在全局路径 ⇒ 与 cwd 无关、全局可发现(由构造保证)。

- [ ] **Step 5: 结论小结(不提交代码,仅口头汇报)**

汇报:冒烟实测结论(Task 1)、两 skill 已 promote 且全局可见、GMZB 无残留、openspec 完好。GMZB 文档**无需改**(调查确认引用均为"技能可用"事实、非位置耦合)。计划二可在此基础上开工。

---

## Self-Review

**1. Spec coverage**(对照设计文档 §7 伴随迁移 + §8 风险 #1):
- §8 风险 #1 冒烟测试 → Task 1 ✅
- §7 promote module-brief / spec-baseline → Task 2 / Task 3 ✅
- §7 GMZB 移除本地副本、确保发现不断 → Task 2 Step 4-5 / Task 3 Step 4 / Task 4 ✅
- §7 corpus 文件 / CLAUDE.md 指针 → 调查确认 0 处强制改;corpus 文件属计划二(harness 才用),不在本计划 ✅(显式说明,非遗漏)
- §8 风险 #3 openspec 联动 → Task 3 Step 4 / Task 4 Step 3 ✅

**2. Placeholder scan**: `<LINK_DIR>` 是 Task 2 Step 1 实测后填入的真实值(非 TBD,是"先测后用"的显式变量);其余命令均完整可执行。无 TODO/TBD。

**3. Type/路径一致性**: LINK_DIR 在 Task 2 Step 1 产出,Task 2-4 一致消费;skill-forge 分支统一 `design/skill-eval-harness`,GMZB 分支统一 `feat/promote-skills-to-skill-forge`;两 skill 文件清单与实际目录一致(module-spec-baseline 18 个 md 经 Task 3 Step 2 diff 兜底)。

> 注:计划二(harness v1)在 Task 1 冒烟结果出来后另写,届时剥门/runner/观察器写到逐步级、无投机。

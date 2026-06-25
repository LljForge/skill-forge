# Skill 跨平台发布指南（skill-forge）

> 怎么把本仓的 skill 发布成「别人能在 Claude Code / Codex / Cursor / Gemini / Copilot 等几十个 agent 里一条命令装上」。
> 本文所有命令与机制均经 2026-06-25 实测核准（`codebase-exploration` v1.0.0 首发），不是推测。出处见末尾。

## TL;DR

发布端**什么都不用额外配**——只要 skill 是 `skills/<名>/SKILL.md`（带 `name` + `description` 的 YAML frontmatter）、且仓库公开在 GitHub，它就已经可被安装。别人装：

```bash
npx skills add LljForge/skill-forge --skill codebase-exploration -a claude-code -a codex
```

`npx skills` 是 Vercel 开源的跨平台 agent-skills 包管理器（`vercel-labs/skills`），是当前事实标准，支持 27+ 个 agent。**不需要 plugin、不需要 manifest、不需要注册表。**

---

## 1. 安装端命令速查（给使用者）

```bash
# 装某一个 skill 到指定 agent（-a 可多次；'*' = 所有 agent）
npx skills add LljForge/skill-forge --skill codebase-exploration -a claude-code -a codex

# 不带 -a → 交互式选 agent；不带 --skill → 交互式选 skill
npx skills add LljForge/skill-forge

# 只看仓里有哪些 skill、不安装（验证用）
npx skills add LljForge/skill-forge --list

# 不安装、只生成「如何用这个 skill」的提示词
npx skills use LljForge/skill-forge@codebase-exploration

# 全局装（用户级）而非项目级
npx skills add LljForge/skill-forge --skill codebase-exploration -g

# 物理拷贝而非软链接到 agent 目录
npx skills add ... --copy

# 已装的管理
npx skills list           # 列已装
npx skills update [名]     # 更新
npx skills remove [名]     # 卸载
npx skills find "<关键词>"  # 在 skills.sh 目录里搜
```

常用 `add` 参数：`-s/--skill` 选 skill（`'*'` 全选）｜`-a/--agent` 选 agent（`'*'` 全选）｜`-g/--global` 全局｜`-l/--list` 只列不装｜`-y/--yes` 跳确认｜`--copy` 拷贝不软链｜`--all` = `--skill '*' --agent '*' -y`｜`--full-depth` 深扫子目录。

---

## 2. 发布端要做什么（给维护者）

**最小要求（缺一不可，但仅此而已）：**

1. skill 是一个目录，里面有 **`SKILL.md`**；
2. `SKILL.md` 顶部有合法 **YAML frontmatter**，**必填 `name` + `description`**（`metadata`/`license` 等可选字段不影响）；
3. 目录放在仓库的 **`skills/<名>/`** 下（见下「发现机制」）；
4. 仓库 **公开在 GitHub**（push 即生效，无需额外发布动作）。

满足这 4 条，skill 就已可被 `npx skills add <owner/repo> --skill <名>` 安装。**无需** marketplace.json / plugin.json / 注册表 / 锁文件。

### 发现机制（CLI 怎么找到 skill）

- 主路径：`skills/` 容器目录**向下走一层**找 `skills/<名>/SKILL.md`（flat 布局，本仓即此）；
- 目录式：`skills/<分类>/<名>/SKILL.md` 多走一层；
- 兜底：标准位置一个都没找到时才**全仓递归**搜（`--full-depth` 可强制深扫）。

> 含义：**本仓 `skills/` 下每个带 SKILL.md 的子目录都会被发现、都可被装。**

### 装的时候拷什么

`npx skills add` 把**整个 skill 目录**拷到对方 agent 的 skills 目录（如 Claude Code 的 `.claude/skills/<名>/`），并在项目里生成 `skills-lock.json`（记录已装版本，可 `npx skills experimental_install` 复现）。**目录里所有文件都会被拷**——包括 references、也包括 MAINTAINING/BACKLOG/COVERAGE 这类维护内部文档（无害、运行时不载入，但是给使用者的杂物）。

---

## 3. 验证方法（不污染环境）

```bash
# A. 只列仓里能被发现的 skill（不装、不碰本机环境）
npx skills add <owner/repo> --list

# B. 真装一份到临时目录看落地文件（项目级 + --copy，看完即删）
mkdir /tmp/probe && cd /tmp/probe
npx skills add <owner/repo> --skill <名> -a claude-code --copy -y
find . -type f         # 看实际拷了哪些文件
cd / && rm -rf /tmp/probe
```

---

## 4. 两个发布卫生注意点（本仓现状）

1. **本仓采「`skills/` = 发布面」约定**：`npx skills` 只发现 `skills/` 下的 skill。本仓已把**未上线的 skill 放在 [`incubating/`](../incubating/)**（CLI 看不到、装不了），`skills/` 只放已发布的（当前仅 `codebase-exploration`）。**成熟一个、`git mv incubating/<名> skills/<名>` 一个 = 「毕业上线」闸**。
   - ⚠️ 注意：本地 `~/.claude/skills` 若有指向 `incubating/` 里 skill 的软链接，需对应重指（毕业移回 `skills/` 时同理）。
2. **维护文档随装**：见上「装的时候拷什么」。要装出来干净，得把维护文档移出 skill 目录（会破坏「自包含维护」模型）或确认 CLI 是否支持忽略文件——属取舍，非必须。

---

## 5. 备选渠道：Claude Code 插件市场（未采用）

Claude Code 还有一条**专有**渠道：仓根放 `.claude-plugin/marketplace.json` + 每个 plugin 放 `.claude-plugin/plugin.json`，用户 `/plugin marketplace add <repo>` → `/plugin install <名>@<市场>`。

- 优点：版本追踪、自动更新、官方/社区市场可收录。
- 缺点：**仅 Claude Code**，且要把 skill 重组成 plugin 结构。
- 本仓**未采用**——因为要的是跨平台（含 Codex），`npx skills` 一条命令通吃，更轻。
- （`claude plugin tag` 用的发布 tag 格式是 `<名>--v<版本>`，与本仓自用的 `<名>/v<版本>` git tag 不同，留意别混。）

---

## 出处（2026-06-25 核准）

- Vercel skills CLI：<https://github.com/vercel-labs/skills>
- Vercel Agent Skills 文档：<https://vercel.com/docs/agent-resources/skills>
- skills.sh 目录：<https://skills.sh>
- Claude Code skills 格式：<https://code.claude.com/docs/en/skills>
- Codex skills：<https://developers.openai.com/codex/skills>
- Claude Code 插件市场（备选）：<https://code.claude.com/docs/en/plugin-marketplaces>

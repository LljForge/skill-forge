# skill-forge

Agent skill 的锻造炉：写 skill、养 skill、把成熟的发布出去。

安装本仓任一已发布 skill：

```bash
npx skills add LljForge/skill-forge --skill <名> -a claude-code -a codex
```

> 发布机制本身（`npx skills` 怎么用、CLI 怎么发现 skill、装的时候拷什么）是**项目无关**的通用知识，见 [`docs/skill-跨平台发布指南.md`](docs/skill-跨平台发布指南.md)。本文只讲**本仓自己的约定**。

## 仓库结构

```
skill-forge/
├── skills/<名>/       已发布 —— CLI 能发现、别人能装
├── incubating/<名>/   孵化中 —— CLI 看不到、装不了
├── meta/<名>/         元层账 —— 治理宪法 / 候选清单 / 覆盖账本 / 变更史 / 理论底座
└── docs/              通用文档、调研、设计稿与实施计划
```

### `skills/` = 发布面

`npx skills` 只发现 `skills/` 下的 skill（向下走一层找 `skills/<名>/SKILL.md`）。**放进 `skills/` 就等于发布**——没有别的开关。

当前已发布：`codebase-exploration` · `recon-driven-dev` · `skill-tempering` · `module-brief` · `codex-batch` · `codex-task`

### `incubating/` = 孵化 + 毕业闸

未上线的 skill 放这里，CLI 看不到、装不了。**成熟一个、`git mv incubating/<名> skills/<名>` 一个 = 「毕业上线」闸。**

⚠️ 本地 `~/.claude/skills` 若有指向 `incubating/` 里 skill 的软链接，毕业时需对应重指。

### `meta/` = 元层账（不随装分发）

每个 skill 的维护治理资产住这里，**不住 skill 目录**——因为 `npx skills add` 会把**整个 skill 目录**拷给使用者，账留在里面就是别人机器上的杂物。

代价是清醒的：**skill 目录里不得以任何形态引用 `meta/`**——链接会 404，裸文本路径更阴险（不报错，只是安静地指向使用者永远拿不到的文件）。出厂的 skill 必须 100% 自包含。

约定权威在 [`meta/README.md`](meta/README.md)——含指针纪律（两个方向不对称）、扁平结构的理由、新 skill 怎么建账。

> **改任何 skill 之前先读它的 `meta/<名>/`。** skill 目录里没有线索会告诉你那里存在，这一步靠纪律、不靠发现。

## 版本 tag

本仓自用 `<名>/v<版本>`（如 `codebase-exploration/v1.1.0`）。

⚠️ 与 `claude plugin tag` 的发布格式 `<名>--v<版本>` 不同，别混。

## 未采用：Claude Code 插件市场

Claude Code 另有一条专有渠道（`.claude-plugin/marketplace.json` + `/plugin install`），本仓**未采用**——要的是跨平台（含 Codex），`npx skills` 一条命令通吃，更轻。机制细节见 [发布指南](docs/skill-跨平台发布指南.md) 末节。

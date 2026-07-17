# meta/ — 元层维护资产

> 每个 skill 的**治理宪法 / 候选优化清单 / 覆盖账本 / 变更史 / 理论底座**住这里，**不住 skill 目录**。
> 运行时一律不读；给**改 skill 自己**的人和会话读。

## 为什么和 skill 分家

`npx skills add` 把**整个 `skills/<名>/` 目录**原样拷到使用者的 agent skills 目录（见 [发布指南](../docs/skill-跨平台发布指南.md)「装的时候拷什么」）。维护账留在 skill 目录里，就会连同 925 行的 CHANGELOG、治理宪法、搁置项清单一起装到别人机器上——对使用者全是杂物。

分家的代价是清醒的：**skill 目录里刻意不留任何指向 `meta/` 的可点击链接**。因为那种链接在装出去的副本里必然 404（使用者机器上没有 `meta/`），比不给更糟。`SKILL.md` / `references/` 里的指针一律写成**裸文本路径** `meta/<名>/<文件>.md`——不是链接，但说得清位置。

被牺牲掉的是「账与 skill 同处一目录、一眼可见」的**维护便利**。**没有**牺牲的是运行期自包含——那条硬约束说的是「不引入外部 skill 调用 / 脚本 / 跨会话持久件依赖」（见 [`recon-driven-dev/MAINTAINING.md`](recon-driven-dev/MAINTAINING.md) 改后验证 rubric A），而维护账本就不随运行载入，移走它不触碰运行期依赖。

## 结构

```
meta/<skill-name>/
├── MAINTAINING.md        # 治理宪法:改这个 skill 时的纪律
├── BACKLOG.md            # 候选优化清单 + 待触发条件
├── COVERAGE.md           # 验证覆盖账本(recon-driven-dev 叫 EVAL-COVERAGE.md)
├── CHANGELOG.md          # 变更史(改了什么、为什么)
└── theory-foundation.md  # 理论底座 / 对标谱系
```

**扁平**——不按 `skills/` / `incubating/` 分层。理由：skill 毕业时只 `git mv incubating/<名> skills/<名>`，账不用跟着搬。

不是每个 skill 都齐五件；按需建，缺的就是没有。

## 指针纪律（两个方向不对称）

| 方向 | 形态 | 为什么 |
|---|---|---|
| `skills/` → `meta/` | 裸文本 `meta/<名>/<文件>.md`，**无链接语法** | `skills/` 会被分发，链接到 `meta/` 必 404 |
| `meta/` → `skills/` | 真实相对路径 `](../../skills/<名>/…)`，可点击 | `meta/` 不分发，链接在仓里点得开 |
| `meta/` 内部互指 | 裸文件名 `](MAINTAINING.md)` | 同目录，一起搬、路径不变 |

## 新增一个 skill 的账

`mkdir meta/<名>/`，按需建文件。不必凑齐五件——`skills/codex-batch`、`skills/codex-task` 至今没有账，也没问题。

## 优化某个 skill 时

先读 `meta/<名>/` 全部内容，再动 `skills/<名>/`。skill 目录里**没有任何线索**会告诉你这里存在（那是分家的代价），所以这一步靠纪律，不靠发现。

## 当前账目

| skill | 位置 | 账 |
|---|---|---|
| codebase-exploration | `skills/` | MAINTAINING · BACKLOG · COVERAGE · CHANGELOG · theory-foundation |
| recon-driven-dev | `skills/` | MAINTAINING（含实测打磨协议 + 启动 Prompt）· BACKLOG · EVAL-COVERAGE · CHANGELOG |
| skill-tempering | `skills/` | MAINTAINING · theory-foundation |
| module-brief | `skills/` | CHANGELOG |
| codex-code-review | `incubating/` | BACKLOG |
| module-spec-baseline | `incubating/` | CHANGELOG |
| test-case-authoring | `incubating/` | CHANGELOG |

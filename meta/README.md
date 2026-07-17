# meta/ — 元层维护资产

> 每个 skill 的**治理宪法 / 候选优化清单 / 覆盖账本 / 变更史 / 理论底座**住这里，**不住 skill 目录**。
> 运行时一律不读；给**改 skill 自己**的人和会话读。

## 为什么和 skill 分家

`npx skills add` 把**整个 `skills/<名>/` 目录**原样拷到使用者的 agent skills 目录（见 [发布指南](../docs/skill-跨平台发布指南.md)「装的时候拷什么」）。维护账留在 skill 目录里，就会连同 925 行的 CHANGELOG、治理宪法、搁置项清单一起装到别人机器上——对使用者全是杂物。

分家的代价是清醒的：**`skills/` 与 `incubating/` 里的任何文件都不得引用 `meta/`——零引用，裸文本也不行**。装出去的副本里没有 `meta/`，写了链接必 404，写裸文本路径则更阴险：它不报错，只是安静地指向一个使用者永远拿不到的文件，读起来还像一条"去看那个"的指令。**出厂的 skill 必须 100% 自包含**（这正是 skill-tempering 第 #7 核，本仓唯一硬约束）。

推论：**provenance 不随 skill 出厂**。理论出处、先例链接、搁置项编号只活在 `meta/`；skill 里要留的，是那条理论**已经嚼碎的一句结论**，inline 写死，不带出处。

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

## 指针纪律（单向，只许 meta → skills）

| 方向 | 形态 | 为什么 |
|---|---|---|
| `skills/` → `meta/` | **禁止**。任何形态都不行——链接、裸路径、裸文件名 | `skills/` 会被分发；指向使用者拿不到的文件＝破自包含（#7 硬约束） |
| `meta/` → `skills/` | 真实相对路径，可点击 | `meta/` 不分发，链接在仓里点得开 |
| `meta/` 内部互指 | 裸文件名，可点击 | 同目录，一起搬、路径不变 |

改 skill 时的验证断言（`meta/` 驻户文件名也要扫，光扫 `meta/` 字样会漏）：

```bash
grep -rn "meta/" skills/ incubating/
for f in theory-foundation MAINTAINING BACKLOG COVERAGE EVAL-COVERAGE CHANGELOG; do
  grep -rn "$f\.md" skills/ incubating/
done
# 两条都该 0 命中
```

## 新增一个 skill 的账

`mkdir meta/<名>/`，按需建文件。不必凑齐五件——`skills/codex-task` 至今没有账，也没问题。

## 优化某个 skill 时

先读 `meta/<名>/` 全部内容，再动 `skills/<名>/`。skill 目录里**没有任何线索**会告诉你这里存在（那是分家的代价），所以这一步靠纪律，不靠发现。

## 当前账目

| skill | 位置 | 账 |
|---|---|---|
| codebase-exploration | `skills/` | MAINTAINING · BACKLOG · COVERAGE · CHANGELOG · theory-foundation |
| recon-driven-dev | `skills/` | MAINTAINING（含实测打磨协议 + 启动 Prompt）· BACKLOG · EVAL-COVERAGE · CHANGELOG |
| skill-tempering | `skills/` | MAINTAINING · theory-foundation |
| module-brief | `skills/` | CHANGELOG |
| codex-batch | `incubating/` | MAINTAINING（**毕业闸：跨 skill 委托破 #7，必须先解**） |
| codex-code-review | `incubating/` | BACKLOG |
| module-spec-baseline | `incubating/` | CHANGELOG |
| test-case-authoring | `incubating/` | CHANGELOG |

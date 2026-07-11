# skill-tempering 维护宪法

> **改本 skill 自己**（SKILL.md / references / theory-foundation / 本文件）时读这份；**不随运行载入**——跑两路径优化别人 skill 的 AI 不需要这些治理规则，故不进 SKILL.md 脊柱。运行护栏（反"过度报缺口"刹车 / 三态分级 / 部分符合声明等）在 [SKILL.md](SKILL.md) 与 [references/](references/) 各自的家。
>
> 本文件是**治理宪法 + 搁置项登记**，**不复述** principles / derivation-protocol / theory-foundation / 设计稿的任何内容——一律指针指向。出现复述即破坏单一权威源（本 skill 的第 #5 核），是缺陷。

## 治理

### 防膨胀（抗 sprawl / sediment / no-op / duplication，呼应 #5）

- 本 skill 自身就是 #5「守薄」的载体——改它时持续对抗四类熵增：**sprawl**（脊柱 / reference 越摊越长）、**sediment**（只加不删的沉积）、**no-op**（说了等于没说的空转问句 / 强制力档）、**duplication**（同一判据两处都写）。
- **种子库非穷举是设计取向、不是缺口**：derivation 的条件纪律种子表故意不求全（skill 形态是开放集，枚举是跑步机）。**别为"补全"往种子库塞维度**——新维度只能经结晶闸（见下）以 `pending` 进，禁绕闸直灌。
- 强制力档（advisory / soft / hard）只在它真改变审计行为时才设；档位说了不产生分级后果＝ no-op，删。

### 单一权威源（每条判据 / 动作一个家、禁复述）

每类内容只有一个权威家，其余文件**只指针、不复述**（复述＝第二权威源、会漂移）：

- **理论骨 / 先例出处** → 只在 [theory-foundation.md](theory-foundation.md)。
- **7 条机制层判据（原则 + 触发 + 审计问句 + 强制力档默认）** → 只在 [references/principles.md](references/principles.md)。
- **派生工序（嗅探 / 失败形态 / 条件纪律种子库 / critic / 证据来源二分 / 结晶治理 / 盲区声明 / 三分诊归因闸）** → 只在 [references/derivation-protocol.md](references/derivation-protocol.md)。
- **路线 A（静态审核）细则 + 改进清单 / 部分符合声明模板** → 只在 [references/audit-lens.md](references/audit-lens.md)。
- **路线 B（消化用户实证）细则** → 只在 [references/evidence-lens.md](references/evidence-lens.md)（模板复用 audit-lens、不另造）。
- SKILL.md 脊柱与本文件**只路由、不列举要素**——动了某判据的家，按名引用它的地方同步改、别漏。

### provenance 归处

- **理论骨与先例出处只在 [theory-foundation.md](theory-foundation.md)**。principles.md 的 #1–#7、derivation-protocol.md 的"点名见"都**反向指**到它，不在本体内嵌出处。
- 改本 skill 时新引一条理论 / 先例：写进 theory-foundation.md（含 URL 核实留痕），别把出处散落进可执行的脊柱或工序里。

### 结晶闸（新条件纪律进种子库前的治理动作）

当场派生的新维度沉回 derivation 种子库前，**默认 `pending` + 留痕 + 复核**。**这道闸的判据全文在 [references/derivation-protocol.md §⑤](references/derivation-protocol.md)，本文件不复述。** 这里只规定**改 skill 自己时该怎么执行这道闸**：

- 任何想把"某次派生的新维度"提为种子库常驻默认的改动，**必须经过 §⑤ 三件套**（pending 入库 → 留痕来源 → 裁判复核放行），**禁止在 commit 里把 `pending` 直接改成默认纪律而不留复核痕**。
- 复核裁判须**不是当场派生它的同一判断者**（守 #1 产出 ≠ 裁判）；单人维护场景下的最低落地（异步 fresh-eyes 自审 + 留痕是否足够）仍是开放问题，见下「搁置项 ②.3」。
- 撤销 / 维持 `pending` 也要留痕——种子库每一格的"何时因审哪个 skill 而来"必须可追溯。

### 毕业焙烧纪律（依设计稿 §4）

底座（principles / derivation-protocol / theory-foundation）是**孵化炉层的单一权威**——共享只发生在 `incubating/` 内。当一个被本 skill 优化过的 skill **毕业（filter-repo 抽出仓外）**时：

1. 把它在历次审计中**命中的纪律 + 各自强制力档 + 盲区声明**，焙进**它自己的 MAINTAINING**（封存一份冻结副本，封存语义同 recon 的 directed-report）。
2. **蜕掉它对底座的全部引用**——出厂 skill 不得再指 principles.md / derivation-protocol.md / theory-foundation.md。
3. 结果：**出厂 skill 100% 自包含**（守 #7 唯一硬约束）。底座留在孵化炉，不随毕业 skill 出仓。

> 焙烧是把"共享的活底座"固化为"私有的死副本"——毕业即断引用，是自包含的兜底。

---

## 搁置项

> 现范围＝底座（§2）+ 路线 A 静态审核 + 路线 B 消化用户实证 + 骨架（§4–6）。以下登记备查。
>
> **架构决策留痕（2026-07-12）**：原"长路径 · dogfood 成熟（自跑 baseline 双跑 + 覆盖账本主动收敛）"**已废弃**——它自造评测机床、与 skill-creator 重叠、且假设每个 skill 都有充足真实任务流（对低频 / 高风险 / 主观类 skill 太理想化）。**改为路线 B**：skill-tempering 自己**绝不实跑**,只**消费用户已跑完带来的实证**（卡点 / 失败案例 / trace / 反馈）;产生实证是用户真实使用或 skill-creator 的事。设计稿 [§3.2](../../docs/skill-tempering/2026-06-26-design.md) 保留作**历史设计探索记录**,不再是活规范——skill 内一切活引用以本仓现有文件为准,不得再指向 §3.2 的旧长路径要点。

### ① 设计稿开放问题（逐条登记）

1. **命名**：`skill-tempering`（淬炼 / 回火金属隐喻＝把已有的东西变韧）——2026-07-12 复议后**决定保留**：路线 B 吃真实实证,淬炼语义站得住。此项**已闭**。
2. ~~7 通用核强制力档默认值待"真实 dogfood"校准~~ → **已废弃前提**：不再有自跑 dogfood。默认值改由**路线 B 消费用户实证时**逐次校准（实证印证某档偏严 / 偏松则现场 override 留痕,见 principles「现场覆盖须留痕」）。
3. **结晶治理"复核责任人"如何落地**：单人维护场景下，§⑤ 复核是否"异步 fresh-eyes 自审 + 留痕"即足够，待定。→ 设计稿开放问题 3。
4. ~~短路径 baseline 双跑的成本权衡~~ → **已消解**：skill-tempering 不自跑 baseline,成本权衡不存在;真实运行留痕由用户走路线 B 带入。

### ② dogfood 沉淀（待后续处置）

> 历次自审（拿路线 A 审它自己）派生的沉淀，守薄登记备查。已消化的留痕、未消化的标 pending。

1. **A-3 + 自审递归无上限 → 已消化（守 #2）**：完整性 critic 追问、及自审时"审计者误读 / 归因存疑"的自我质疑,原**无死上限**（违 skill 自己的 #2 完成判据）。**已修**:derivation ③ 补"追问设死上限（建议 2–3 轮、轮数归模型现场判）+ 自审到顶退盲区交人"。应用现有 #2 核、非转正新维度,不受 ⑤ 约束。留痕、无待办。
2. **新维度「自审 meta 场景额外纪律」（结晶 pending）**：拿 skill-tempering 审自己时,除七核外还需额外核**脊柱与 references 互不矛盾**（历次逮悬空指针的那把刀）。这是**新审计维度**（非现有核的应用),按 derivation ⑤ 结晶治理**默认 pending、不自动回灌种子库**,留待复核裁判放行。注:其"递归死上限"侧面已随第 1 条用 #2 消化,此处只余"自审要额外查什么内容"这一维度待定。
3. **B-1 已消化（留痕）**：同次自审逮到 #3+输入族 soft 缺陷——路线 B 依赖用户实证却无输入可信度校验分支。**已修**（evidence-lens §二 补"先验实证够格吗"前置闸,应用种子库既有「输入族·源受控性」纪律,非新造）。留痕、无待办。

# test-case-authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `incubating/test-case-authoring/` 建一个 skill，根据开发任务或业务领域产出「执行无关」的测试用例规范（只说测什么，不说怎么测），第一版仅覆盖后端接口。

**Architecture:** 三个 markdown 文件。`SKILL.md` 是薄主文件（三条铁律 + 五步流程 + 出口三门）；`references/backend-api.md` 是按需加载的后端接口边界维度表（输入契约边界法 + 6 条领域维度清单 + 不默认登记元规则）；`CHANGELOG.md` 记版本与成色。零外部依赖——不调用任何其它 skill、不需要任何 CLI。

**Tech Stack:** 纯 markdown。无代码、无脚本、无 sub-agent。校验手段为 `grep` / `rg` 结构化检查。

## Global Constraints

以下约束逐字取自设计文档 `docs/superpowers/specs/2026-07-17-test-case-authoring-design.md`，**每个任务的要求都隐含包含本节**：

- **语言**：全部简体中文（本仓 `.claude/rules/principles.md` 硬约束）。
- **第一版范围**：**仅后端接口**。不写 `references/web-e2e.md`、`references/miniprogram-e2e.md`，**也不建空占位文件**（`module-spec-baseline/evals/` 空目录是反面教材）。
- **零外部依赖**：不依赖 recon-driven-dev、不依赖 module-spec-baseline、不需要 openspec CLI。走 recon 入口时只读它落好的 markdown，不调用它。
- **用例格式禁含「步骤」字段**：只有 GIVEN / WHEN / THEN。这是结构性防御，是整个设计的地基。
- **6 条维度必须逐条标注成色**：`[来源：msb behavior-dimensions <编号> · 逆向场景实测 · 正向未验证]`。
- **不自动触发**：显式调用。
- **落点**：`incubating/test-case-authoring/`（孵化炉）。
- **提交**：每个 commit 只碰本 skill（一 commit 一 skill）。当前分支 `skill/test-case-authoring`。
- **版本**：v0.1.0，CHANGELOG 明写「纪律层与维度表均未在正向场景验证」。

---

## File Structure

| 文件 | 职责 | 谁依赖它 |
|---|---|---|
| `incubating/test-case-authoring/references/backend-api.md` | 后端接口边界维度表：§1 输入契约边界法（方法）、§2 六条领域维度清单（点名清单）、§3 不默认登记元规则 | SKILL.md 的 Step 3 与门 C 引用它 |
| `incubating/test-case-authoring/SKILL.md` | 薄主文件：定位表 + 三条铁律 + 五步流程 + 用例格式 + 出口三门 + 产物结构 | 用户入口 |
| `incubating/test-case-authoring/CHANGELOG.md` | 版本演进 + 成色声明 | 无 |

**任务顺序**：先 Task 1（维度表），因为 SKILL.md 要引用它的章节号与维度编号；Task 2 写 SKILL.md；Task 3 收口 CHANGELOG。每个任务独立可审——审查者可以只否掉维度表而放行主文件。

**关于「测试」**：产物是纯 markdown，无运行时。每个任务的验证 = `grep`/`rg` 结构化校验（先写校验命令并确认它当前失败，再写内容，再确认通过）。真正的行为验证是设计文档 §7 的「拿真实后端接口开发任务跑一次」，需要真实任务输入，不在本计划内 —— 见文末「交接」。

---

### Task 1: 后端接口边界维度表

**Files:**
- Create: `incubating/test-case-authoring/references/backend-api.md`

**Interfaces:**
- Consumes: 无（第一个任务）
- Produces: 供 SKILL.md 引用的稳定锚点 —— 章节号 `§1` `§2` `§3`；维度编号 `D1`–`D6`（分别是：D1 幂等/去重/并发、D2 鉴权前置、D3 事务边界/回滚补偿、D4 缓存读一致性、D5 错误响应契约+成功信封、D6 异步最终一致）。Task 2 的 Step 3「点名扫」与门 C「维度覆盖门」按这些编号逐条点名，**编号与顺序不得更改**。

- [ ] **Step 1: 先写校验命令，确认当前失败**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge && \
test -f incubating/test-case-authoring/references/backend-api.md && echo "EXISTS" || echo "MISSING"
```
Expected: `MISSING`（文件还不存在，这是预期的"失败"）

- [ ] **Step 2: 创建目录并写维度表**

创建 `incubating/test-case-authoring/references/backend-api.md`，内容如下（完整照写）：

````markdown
# 后端接口边界维度表

本表是 `test-case-authoring` 的**召回轴**——**不是分类法，是点名清单**：拿着它逐条问「这条维度在本次任务里有没有对应用例」。

用例写完往哪归档，是四类分区（TC-F / TC-E / TC-ERR / TC-ST）的事。**两轴正交，别试图对齐**：一条维度会散落到多个类（D1 幂等的「重复提交」落 TC-E，「并发超限被拒」落 TC-ERR）。

---

## §1 输入契约边界法

管「单个字段怎么取值」。这层是**方法**，不是清单——不点名，靠推导。

### 等价类划分

把输入分成若干类，每类取一个代表值：
- **有效等价类**：能通过校验的取值
- **无效等价类**：**每种无效原因单独成一类**（超范围、类型错、格式错、必填缺失，是四类而不是一类）

### 边界值分析

在每个有效区间的**边界两侧各取一点**。

**例**：年龄，有效区间 18–100
- 有效类代表：`50`
- **边界四点**：`17` / `18` / `100` / `101` ← 四个都要，缺一不可
- 无效类代表：`-1`（超下界）、`"abc"`（类型错）、`null`（必填缺失）、`""`（空值）

**适用面**：数值范围、字符串长度、集合/数组大小、日期区间、分页参数（页码、每页条数）、金额精度。

---

## §2 领域维度清单

> ### ⚠️ 成色声明（引用本表前必读）
>
> 以下 6 条拄自本仓 `incubating/module-spec-baseline/references/behavior-dimensions.md`。
>
> **有真实来历**：该表 v1.1.0 生自 GitNexus 对照复盘（发现「非 HTTP 入口与横切契约整类漏」），v1.2.0 经 5 模块实测打磨并砍掉一条（B4 出站签名）。提交历史佐证：`53508e4`（B0 地基）→ `782a7ec`（B1 redo）。
>
> **但成色有限**：其 `evals/` 是空目录（从无提交）；复盘产物已在 `eb475fa 过程产物清理` 删除，**实测结论无法独立复核**。
>
> **且验证场景不同**：它验证的是「**逆向** as-built 后端模块」；本 skill 是「**正向**」——代码可能尚不存在。**这 6 条在正向场景下够不够、准不准，均未验证。**
>
> 跑过真实任务后按实证增删：删掉不适用的，补上真漏的。

### D1 · 幂等 / 去重 / 并发

- **测什么**：重复提交同一请求的后果（幂等返回成功 / 去重不重复生成 / 报冲突错误——三选一，必须明确是哪种）；并发请求的上限与拒绝策略（超限被拒 / 降级 / 排队）。
- **前提（两个半边判据不同）**：「重复提交 / 幂等」半边**默认点名**，事实集没提也要按铁律 3 落「待澄清」问清楚；「并发上限 / 拒绝策略」半边算限流 / 防刷类，受 §3 管——事实集里要有明确依据（如并发阈值、拒绝 / 降级 / 排队策略）才生成，没依据**不生成、也不问**（见 §3）。
- **常见漏法**：只测了「提交一次成功」，没测「提交两次会怎样」。
- **常落分区**：TC-E（重复提交）、TC-ERR（并发超限被拒，仅当事实集有依据时）
- `[来源：msb behavior-dimensions B7 · 逆向场景实测 · 正向未验证]`

### D2 · 鉴权前置

- **测什么**：无凭据访问返回什么；凭据过期返回什么；凭据有效但无权限返回什么（**这三种是不同的**，别合并成「鉴权失败」）；哪些路径豁免。
- **常见漏法**：把「未登录」和「已登录但越权」当成一回事。
- **注意**：这是**黑盒可复现的端点前置契约**，不是安全审计——别因为「不做安全」把它一起排掉。
- **常落分区**：TC-ERR
- `[来源：msb behavior-dimensions B5 · 逆向场景实测 · 正向未验证]`

### D3 · 事务边界 / 回滚补偿

- **测什么**：一组写操作**部分失败**时，是整批回滚还是留下脏数据；失败后有没有补偿/重试自愈。
- **常见漏法**：只测全成功路径，没测「第二步失败时第一步的写有没有撤销」。
- **常落分区**：TC-ERR（部分失败）、TC-ST（失败后的状态）
- `[来源：msb behavior-dimensions B1 · 逆向场景实测 · 正向未验证]`

### D4 · 缓存读一致性

- **测什么**：写后立即读，能否读到新值，还是存在「读旧值」窗口。
- **常见漏法**：默认「写完就能读到」，没问有没有缓存层。
- **前提**：事实集里要有缓存的依据；没依据不生成（见 §3）。
- **常落分区**：TC-E（写后立即读）
- `[来源：msb behavior-dimensions B6 · 逆向场景实测 · 正向未验证]`

### D5 · 错误响应契约 + 成功信封

- **测什么**：出错返回什么状态码 / 业务错误码 / 错误体结构；成功报文的真实信封结构（字段名、分页缺省值）。调用方据此分支解析——**这是契约的另一半**。
- **常见漏法**：用例只写「返回失败」，没写「返回哪个错误码」——下游执行者没法断言。
- **常落分区**：TC-ERR（错误码）、TC-F（成功信封）、TC-E（分页边界）
- `[来源：msb behavior-dimensions C1 · 逆向场景实测 · 正向未验证]`

### D6 · 异步最终一致

- **测什么**：**「接口返回成功 ≠ 下游已就绪」**。操作成功后向下游推送/发消息的，要测下游状态何时可观察到变化。
- **常见漏法**：断言接口返回 200 就收工，没测下游到底有没有收到。
- **常落分区**：TC-F（下游最终变化）、TC-ST（中间态）
- `[来源：msb behavior-dimensions A2 · 逆向场景实测 · 正向未验证]`

---

## §3 不默认登记（元规则）

> **限流 / 防刷、多租户数据隔离、版本 / 向后兼容 —— 不默认登记。**

**很多项目根本没有这些。** 默认写进用例会臆测出不存在的契约（比如把单租户系统臆测成有租户过滤）。

**本 skill 比 module-spec-baseline 更危险**：它至少能去代码里探测有没有，本 skill 正向——**连代码都没有，更容易凭空造**。

**硬规则**：这类维度**只有在待测事实集里有明确依据时才生成用例，否则连问都不问**。

判别：事实集里有「限流阈值 100 QPS」→ 生成；事实集只字未提限流 → **不生成、也不问**（问了就是在诱导用户补一个本来不存在的需求）。
````

- [ ] **Step 3: 跑结构化校验，确认全部通过**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge/incubating/test-case-authoring/references && \
echo "--- 三个章节 ---" && grep -c "^## §" backend-api.md && \
echo "--- 六条维度 ---" && grep -c "^### D[1-6] · " backend-api.md && \
echo "--- 六条成色标注 ---" && grep -c "正向未验证\]" backend-api.md && \
echo "--- 元规则关键词 ---" && grep -c "不默认登记" backend-api.md && \
echo "--- 边界四点 ---" && grep -c "边界四点" backend-api.md
```
Expected:
```
--- 三个章节 ---
3
--- 六条维度 ---
6
--- 六条成色标注 ---
6
--- 元规则关键词 ---
2
--- 边界四点 ---
1
```

若「六条成色标注」不等于 6，说明有维度漏标成色 —— 这是 Global Constraints 的硬要求，必须补齐后重跑。

- [ ] **Step 4: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && \
git add incubating/test-case-authoring/references/backend-api.md && \
git commit -m "$(cat <<'EOF'
feat(test-case-authoring): 后端接口边界维度表(召回轴)

§1 输入契约边界法(等价类划分 + 边界值分析,方法层)
§2 六条领域维度 D1-D6,逐条标成色 —— 拄自 module-spec-baseline
   behavior-dimensions,其表生自 GitNexus 复盘 + 5 模块实测,但只验证过
   逆向 as-built 场景,对本 skill 的正向场景零覆盖,故每条明标「正向未验证」
§3 不默认登记元规则(限流/多租户/版本兼容) —— 正向无代码可探测,
   臆测风险高于 msb,升级为「事实集无依据则不生成、也不问」

维度表是召回轴、不是分类法,与四类分区(归档轴)正交。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: SKILL.md 主文件

**Files:**
- Create: `incubating/test-case-authoring/SKILL.md`

**Interfaces:**
- Consumes: Task 1 的 `references/backend-api.md` —— 引用其 `§1`（输入契约边界法）、`§2`（D1–D6 点名清单）、`§3`（不默认登记元规则）。维度编号 D1–D6 必须与 Task 1 完全一致。
- Produces: 用户入口。产物结构定义（`## 概览 / 1. 功能测试 (TC-F) / 2. 边界测试 (TC-E) / 3. 错误处理 (TC-ERR) / 4. 状态迁移 (TC-ST) / 覆盖矩阵 / 维度扫描表 / 待澄清`），供 Task 3 的 CHANGELOG 描述。

- [ ] **Step 1: 先写校验命令，确认当前失败**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge && \
test -f incubating/test-case-authoring/SKILL.md && echo "EXISTS" || echo "MISSING"
```
Expected: `MISSING`

- [ ] **Step 2: 写 SKILL.md**

创建 `incubating/test-case-authoring/SKILL.md`，内容如下（完整照写）：

````markdown
---
name: test-case-authoring
description: 根据一次开发任务或用户给的功能业务领域，产出「执行无关」的测试用例规范——只回答「测什么」，「怎么测」（框架 / 请求构造 / 数据准备 / 断言方式）留给下游执行者决定。产四类分区用例（功能 / 边界 / 错误 / 状态迁移）+ 双向覆盖矩阵 + 维度扫描表，边界靠维度表点名召回而非临场想。**第一版仅后端接口**，前端 E2E 不在范围。**显式调用 /test-case-authoring，不自动触发。** 零外部依赖。
---

# 测试用例规范编写

产出**「测什么」的规范**，与「怎么测」解耦。下游执行者（另一个 AI agent / skill）拿到后自行决定框架、请求构造、数据准备、断言方式。

| 项 | 取向 |
|----|------|
| 产物 | 测试用例规范 markdown |
| 抽象层次 | **执行无关**：可写被测契约，禁写测试实现（判据见「铁律 1」） |
| 范围 | **仅后端接口**（第一版）；前端 E2E 不在范围 |
| 边界召回 | 靠 [`references/backend-api.md`](references/backend-api.md) **点名扫**，不靠临场想 |
| 依赖 | **无** |

**不做**：写测试代码、选框架、mock 策略、覆盖率、前端 UI、bug-hunting。

## 调用方式

```
/test-case-authoring <本次要测的开发任务或业务领域>
```

**显式调用，不自动触发。**

---

## 三条铁律

### 铁律 1 · 用例没有「步骤」

**用例只有 GIVEN / WHEN / THEN，没有「测试步骤」字段。**

- **GIVEN** = 状态事实（不是构造动作）
- **WHEN** = 意图（不是操作序列）
- **THEN** = 可观察结果（不是断言写法）

**为什么是铁律**：一个叫「步骤」的槽位天然只能填操作序列，填进去的一定是「怎么做」。这是结构性防御 —— 不靠自律，靠没有那个槽位。

**界线**（后端接口）：

| 可写（被测契约本身） | 禁写（测试实现） |
|---|---|
| 接口语义、HTTP 状态码、业务错误码、响应字段、状态名 | 框架名、请求怎么构造、数据怎么造、mock 谁、怎么断言 |

**裁决 —— HTTP 方法 + 路径可写**：`WHEN 调 POST /orders/{id}/cancel` 不算泄漏。过执行者替换测试：换成 Postman / RestAssured / 人手测，方法 + 路径依然成立——它是接口契约本身，不是执行者的选择。

**判据 —— 执行者替换测试**：
> 「把执行者换成 人手测 / RestAssured / Postman / Playwright，这条用例还成立吗？」
> 成立 → 执行无关；不成立 → 泄漏。

最易漏的是 **GIVEN 的状态事实 vs 构造方式**：

- ✅ `GIVEN 一个处于开启状态的订单`（状态事实，执行者自行决定怎么造）
- ❌ `GIVEN 预置一条状态为开启的订单数据`（构造方式——已经替执行者决定了「预置数据」这个手段，只是换了个不触发禁用词的说法）

两句描述同一个前置，后者是**软泄漏**——词表拦的是**词**，不是**形状**：换一种措辞就绕开硬拦，只能靠逐条问执行者替换测试。

**WHEN 的意图 vs 操作序列**：

- ✅ `WHEN 对它连续发起两次相同的取消请求`（契约行为，意图明确）
- ❌ `WHEN 先登录拿 token，再带 token 调取消接口`（操作序列——把「怎么拿到调用资格」这个执行细节也写了进去）

**THEN 的可观察结果 vs 断言写法**：

- ✅ `THEN 订单最终处于已取消状态，且只产生一条取消记录`（可观察结果，不规定怎么验证）
- ❌ `THEN 断言响应体中 data.status 字段值为 "CANCELLED"`（断言写法——已经替执行者决定了从哪个字段、用什么方式验证）

### 铁律 2 · 无源即非法

**每条用例的「来源」字段必须回指待测事实集里的某一条。回指不上的用例不许存在。**

**为什么是铁律**：本 skill 是**正向**的，代码可能还不存在，**没有代码可作 grounding 锚**——没有锚就会编造用例。**待测事实集就是锚。**

想测但事实集里没依据 → **不是偷偷补一条用例**，是落进「待澄清」回头问用户，补进事实集后再生成。

### 铁律 3 · 不猜

**事实集没说的，不猜。** 落「待澄清」问用户。

这是铁律 2 的泄压阀 —— 没有它，铁律 2 只会逼着自己偷偷编一条来源出来。

**特别地**：限流 / 多租户隔离 / 版本兼容这类维度，事实集无依据时**不生成、也不问**（见 [`references/backend-api.md`](references/backend-api.md) §3）—— 问了就是在诱导用户补一个本来不存在的需求。

---

## 流程（5 步）

### Step 1 · 输入归一化 → 待测事实集

两个入口，都归一成同一份**待测事实集**：

| 入口 | 来源 | 取什么 |
|---|---|---|
| ① recon 产物 | `docs/recon-driven-dev/<日期>-<change>/` | `requirements.md` §2.2 关键异常、§3 业务规则、§4 验收标准；`design.md` 的接口契约 |
| ② 直接给 | 对话 / PRD / 接口文档 | 同上四类事实，缺的当场问 |

**走入口 ① 只是读它落好的 markdown 文件**——不调用 recon-driven-dev、不要求它跑过。

**待测事实集**四类：**验收标准 / 业务规则 / 异常场景 / 接口契约**——归一化后**落盘进产物「概览」**，逐条编号列出（如 `业务规则 §3.2`）。这不是可选存档：铁律 2 / 门 A 要求每条用例的 `来源` 回指事实集某条，没有落盘编号，回指的就是当场编的号、用完即弃，产物读者解析不了、复盘者核不了，门 A 会退化为 agent 自我声明。

**这是流程唯一的输入面**——后续步骤只认它，不认原始输入。

### Step 2 · 抽场景

按四类分区抽：

| 分区 | ID 前缀 | 抽什么 |
|---|---|---|
| 功能测试 | `TC-F` | 事实集里的正常流程 |
| 边界测试 | `TC-E` | 边界值、空值、上限 |
| 错误处理 | `TC-ERR` | 异常场景、失败模式 |
| 状态迁移 | `TC-ST` | 有状态时的合法/非法迁移 |

### Step 3 · 逐条对维度表点名扫

**读 [`references/backend-api.md`](references/backend-api.md)。**

- **§1 输入契约边界法**：对每个输入字段推导等价类 + 边界值（有效区间 18-100 → 测 17/18/100/101）。
- **§2 领域维度清单**：**逐条点名** D1–D6，问「这条维度在本次任务里有没有对应用例」。

**这是点名，不是「想想还有什么边界」。** 拿着清单一条条过——这是维度表存在的唯一理由。

### Step 4 · 产用例

按下方「用例格式」写。每条必须有 `维度` 和 `来源` 两个字段。

### Step 5 · 出口自检（三门，折进一趟）

见下方「出口三门」。**一趟过完三门**，不分三趟。

---

## 用例格式

```markdown
#### TC-E-003 · 重复提交取消请求
- **维度**：D1 幂等/去重
- **来源**：业务规则 §3.2 / 验收标准 #4
- **优先级**：高
- **GIVEN** 一个处于开启状态的订单
- **WHEN** 对它连续发起两次相同的取消请求
- **THEN** 订单最终处于已取消状态，且只产生一条取消记录
- **THEN** 第二次请求以幂等方式返回成功，不报冲突错误
```

- `维度`：D1–D6，或 `§1 输入边界`（纯字段边界用例）
- `来源`：回指事实集条目，**必填**（铁律 2）
- `优先级`：高 / 中 / 低。高 = 核心流程、数据完整性、鉴权路径
- `THEN` 可多条

---

## 出口三门

**一趟过完，不分三趟。**

### 门 A · 无源门

逐条查：每条用例的 `来源` 能回指事实集某条吗？

- 回指不上 → **删除**，或落「待澄清」回头补事实集后重生成。**不许留。**

### 门 B · 执行泄漏门（两级）

**硬拦（机械可查）**——用例正文里出现即违规：

```bash
rg -ni "RestAssured|Postman|JUnit|Mockito|Playwright|assertEquals|JSON ?path|点击|输入框|滚动|跳转|mock 掉|插入一条.*记录|执行 SQL" <产物文件>
```

**加 `-i`**：大小写不敏感——不加会漏 `JSONPath`（大写 P）、`restassured`、`postman` 这类变体。

**软拦（逐条判断）**——对每条用例问**执行者替换测试**：「换成人手测 / RestAssured / Postman，还成立吗？」

重点查 `GIVEN` / `WHEN` / `THEN`：是**状态事实 / 意图 / 可观察结果**，还是**构造方式 / 操作序列 / 断言写法**？（铁律 1 的三对 ✅/❌ 范例就是这道题）

**软泄漏不含禁用词，硬拦一个字都拦不住** —— 别只跑 rg 就收工。

### 门 C · 维度覆盖门

`references/backend-api.md` §2 的 D1–D6 **逐条**在「维度扫描表」里有交代：

- **已覆盖**：列出 TC-ID
- **N/A**：**+ 具体理由**

**不许空着。理由不许写「无」/「不涉及」** —— 要写清为什么不涉及（例：`N/A · 本次接口只读，无写操作，无事务边界`）。

**N/A 理由必须可核**：要么回指事实集里的具体条目（例：`N/A · 业务规则 §2.1 明确单机部署，无缓存层`），要么明写「事实集未提及」（例：`N/A · 事实集未提及并发上限，按 §3 不生成`）。**理由不许自由发挥**——门 A 逼用例回指事实集，N/A 理由不能例外，否则编起来零成本、无人对账。

---

## 产物结构

```markdown
# 测试用例规范 — <任务名>

## 概览
- 输入来源：<recon 产物路径 / 用户直接提供>
- 待测事实集（本次用例的唯一来源，`来源` 字段回指此处编号）：
  - 验收标准 #1：<原文或摘要>
  - 业务规则 §3.2：<原文或摘要>
  - 异常场景 #1：<…>
  - 接口契约 #1：<…>

## 1. 功能测试 (TC-F)
## 2. 边界测试 (TC-E)
## 3. 错误处理 (TC-ERR)
## 4. 状态迁移 (TC-ST)

## 覆盖矩阵（双向）
| 事实集条目 | 覆盖用例 | 状态 |
|---|---|---|
| 验收标准 #1 | TC-F-001, TC-E-002 | ✓ |

> 正向：每条事实 ≥ 1 条用例（防漏测）
> 反向：每条用例 ≥ 1 条来源（防编造，即门 A）

## 维度扫描表
| 维度 | 覆盖用例 | 状态 |
|---|---|---|
| D1 幂等/去重/并发 | TC-E-003 | ✓ 已覆盖 |
| D4 缓存读一致性 | — | N/A · <具体理由> |

## 待澄清
- <事实集缺口，回头问用户>
```

**「待澄清」是必备出口，不是附录。** 正向场景一定撞上事实集不全（超时怎么办没写、错误码没定）。

**自检信号**：如果「待澄清」是空的但用例齐全 —— 多半是在偷偷补来源（门 A 假过），回头重查。
````

- [ ] **Step 3: 跑结构化校验，确认全部通过**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge/incubating/test-case-authoring && \
echo "--- frontmatter name ---" && grep -c "^name: test-case-authoring$" SKILL.md && \
echo "--- 三条铁律 ---" && grep -c "^### 铁律 [1-3] · " SKILL.md && \
echo "--- 五步流程 ---" && grep -c "^### Step [1-5] · " SKILL.md && \
echo "--- 出口三门 ---" && grep -c "^### 门 [ABC] · " SKILL.md && \
echo "--- 用例格式含 GIVEN/WHEN/THEN ---" && grep -c "^- \*\*GIVEN\*\*\|^- \*\*WHEN\*\*\|^- \*\*THEN\*\*" SKILL.md && \
echo "--- 引用维度表 ---" && grep -c "references/backend-api.md" SKILL.md ; \
echo "--- 无步骤字段(应为0) ---" ; grep -c "^- \*\*步骤\*\*\|^- \*\*测试步骤\*\*\|^Test Steps:\|^\*\*Test Steps\*\*" SKILL.md
```
Expected:
```
--- frontmatter name ---
1
--- 三条铁律 ---
3
--- 五步流程 ---
5
--- 出口三门 ---
3
--- 用例格式含 GIVEN/WHEN/THEN ---
7
--- 引用维度表 ---
4
--- 无步骤字段(应为0) ---
0
```

**三个注意点**：

1. `无步骤字段` 检查必须匹配**字段**（行首的 `- **步骤**` / `Test Steps:`），**不能**粗暴 grep `测试步骤` 字面量 —— 铁律 1 正文里有一句「用例只有 GIVEN / WHEN / THEN，没有『测试步骤』字段」，那是在**说明规则**，粗暴匹配会把它当违规误杀。规则可以谈论它禁止的东西。
2. `grep -c` 返回 0 时退出码非 0，会中断 `&&` 链，故该行用 `;` 衔接并单独放最后。
3. `用例格式含 GIVEN/WHEN/THEN` 是 **7**，不是直觉上的 4：铁律 1 里 GIVEN/WHEN/THEN 三个槽位的定义行（`- **GIVEN** = 状态事实`／`- **WHEN** = 意图`／`- **THEN** = 可观察结果`）也会被这条 grep 数进去——那是规则正文，不是用例示例，但字面匹配无法区分。3（槽位定义）+ 4（「用例格式」示例块的 GIVEN/WHEN/THEN×2）= 7。若未来改动了这两处任一处的行数，此 Expected 需要对着改完后的内容重算，不能直接照抄。

- [ ] **Step 4: 交叉校验维度编号 —— SKILL.md 引用的维度须是维度表定义集合的子集**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge/incubating/test-case-authoring && \
echo "--- SKILL.md 出现的维度编号 ---" && rg -o "D[0-9]+" SKILL.md | sort -u | tr '\n' ' ' ; echo && \
echo "--- 维度表定义的维度全集 ---" && rg -o "^### (D[1-6]) · " -r '$1' references/backend-api.md | sort -u | tr '\n' ' ' ; echo && \
echo "--- SKILL.md 中不在维度表定义集合内的编号(应为空) ---" && comm -23 <(rg -o "D[0-9]+" SKILL.md | sort -u) <(rg -o "^### (D[1-6]) · " -r '$1' references/backend-api.md | sort -u)
```
Expected：
```
--- SKILL.md 出现的维度编号 ---
D1 D4 D6
--- 维度表定义的维度全集 ---
D1 D2 D3 D4 D5 D6
--- SKILL.md 中不在维度表定义集合内的编号(应为空) ---
```

**判据是子集，不是相等**：SKILL.md 正文里 D2/D3/D5 从未以字面量出现；D1、D4 分别在「用例格式」示例与「产物结构」示例里被具体点出，D6 只是 `rg -o "D[0-9]+"` 从 `D1–D6` 区间写法里顺带切出来的（本身没有单独出现过）。这不代表 D2/D3/D5 被遗漏——区间写法（见 SKILL.md「Step 3」「用例格式」「门 C」三处）已经把 D1–D6 全集覆盖到位，只是没有逐一列出字面量。真正的违规判据是**第三行不为空**：只有当 SKILL.md 出现了维度表压根没定义的编号（例如手滑写了 `D7`）时，`comm -23` 才会有输出，那才是「引用了不存在的维度」，须去 SKILL.md 里修正成表里实际有的编号（绝不是反过来往 SKILL.md 里硬塞 D2/D3/D5 字面量或删掉铁律 1 的槽位定义去凑数字）。

- [ ] **Step 5: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && \
git add incubating/test-case-authoring/SKILL.md && \
git commit -m "$(cat <<'EOF'
feat(test-case-authoring): 主文件(三铁律 + 五步流程 + 出口三门)

铁律 1 用例没有「步骤」—— 只有 GIVEN/WHEN/THEN。结构性防御:
  一个叫「步骤」的槽位天然只能填操作序列。先例 cexll/myclaude@test-cases
  四处宣示「测行为不测实现」,却因模板有 Test Steps 字段而自带
  `Click "Login" button` 反例 —— 字段决定内容,原则拦不住自己的字段。
铁律 2 无源即非法 —— 正向无代码可 grounding,待测事实集即锚。
铁律 3 不猜 —— 落「待澄清」问用户,作铁律 2 的泄压阀。

出口三门折进一趟(依据 msb 教训「门 2/3/4 折进 grounding 一趟、成本不涨」):
  门 A 无源 / 门 B 执行泄漏(硬词表 + 软执行者替换测试) / 门 C 维度覆盖。
门 B 必须两级 —— msb 实测证明软泄漏(状态事实 vs 构造方式)不含禁用词,
词表一个字都拦不住。

覆盖矩阵做双向(正向防漏测 + 反向防编造),比 test-cases 的单向硬一档。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: CHANGELOG 与收口

**Files:**
- Create: `incubating/test-case-authoring/CHANGELOG.md`

**Interfaces:**
- Consumes: Task 1 的维度表、Task 2 的 SKILL.md（描述其内容与成色）
- Produces: 无（终点任务）

- [ ] **Step 1: 先写校验命令，确认当前失败**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge && \
test -f incubating/test-case-authoring/CHANGELOG.md && echo "EXISTS" || echo "MISSING"
```
Expected: `MISSING`

- [ ] **Step 2: 写 CHANGELOG.md**

创建 `incubating/test-case-authoring/CHANGELOG.md`，内容如下（完整照写）：

````markdown
# CHANGELOG — test-case-authoring

> 正文（SKILL.md / references）只写当下规则；版本演进、为什么这么改记在这。

## v0.1.0 — 首版（孵化）

**定位**：根据一次开发任务或业务领域，产出「执行无关」的测试用例规范——只回答「测什么」，「怎么测」留给下游执行者（另一个 AI agent / skill）。设计文档：`docs/superpowers/specs/2026-07-17-test-case-authoring-design.md`。

### ⚠️ 成色声明

**纪律层与维度表均未在正向场景验证。**

- **纪律层**（三铁律 + 出口三门）：零真实任务验证，是设计推演的产物。
- **维度表 D1–D6**：拄自 `incubating/module-spec-baseline/references/behavior-dimensions.md`。该表有真实来历（生自 GitNexus 对照复盘 + 5 模块实测，`782a7ec` 的 "redo" 印证了回退重做），**但**：① 其 `evals/` 是空目录、复盘产物已在 `eb475fa` 清除，实测结论无法独立复核；② 它验证的是**逆向 as-built** 场景，本 skill 是**正向**——这 6 条在正向下够不够、准不准，**均未验证**。

**第一版不建 evals**，直接拿真实后端接口开发任务跑。理由：纪律层零验证时，先撞真实任务比先造 eval 架子有信息量；反面教材就在隔壁（`module-spec-baseline/evals/` 是从无提交的空目录）。

**跑第一次真实任务时要观察三件事**：
1. **三门有没有真拦住东西** —— 一次都没拦住 = 门是摆设，或任务太浅、样本无效。
2. **维度表有没有召回本来会漏的** —— 这是它存在的唯一理由。没召回到任何东西，说明 6 条拄来的维度在正向不适用。
3. **「待澄清」有没有真挡住编造** —— 若它空着但用例齐全，多半是在偷偷补来源（门 A 假过）。

### 关键设计取舍

| 取舍 | 决定 | 为什么 |
|---|---|---|
| 先例 vs 基座 | `cexll/myclaude@test-cases` 作**先例参考**，不作基座 | 把它从「通用手工用例」硬掰成「Java 接口 + 执行无关契约」= 架构大改，正是 recon 批次 A/B/C 翻车后立规矩要避开的坑。只吸收其四类分区、覆盖矩阵、等价类划分三样 |
| 防泄漏手段 | **砍字段** > 加原则 | test-cases 证明：模板有 `Test Steps` 字段，四处原则宣示也拦不住，且其唯一 AAA 范例自带 `Click "Login" button` 反例 |
| 复用 msb | **零依赖 + 拄 6 条** | msb 仍孵化（无 evals、agent 对表的消费分批接入未完），抽公共层 = 焊死在移动靶；且两张表服务对象不同（逆向契约 vs 正向用例），共用会互相拖累演进 |
| 门的形态 | **内联三门**，不派 sub-agent | msb 教训是「门要全」而非「要加 agent」，且明确记有「门 2/3/4 折进 grounding 一趟、成本不涨」 |
| 门 B 分级 | **硬词表 + 软判断**两级 | msb 首版「grid + grounding 双门过了」，A/B/C 复盘照样发现软实现泄漏（异步线程内/删后插/签名派生）——这类不含禁用词，词表拦不住 |
| 覆盖矩阵 | **双向** | test-cases 只做正向（每条需求有用例）；反向（每条用例有来源）才是正向场景最需要的防编造门 |
| 第一版范围 | **仅后端接口** | 后端与前端 E2E 仅共享纪律层，维度层几乎不重叠。纪律层零验证时不摊两个领域，翻车可归因 |
| 接 recon | **不接**，只读其产物 | 接进去破坏 recon「自包含、零外部 Skill 依赖、丢到任何环境都能独立跑」，且丢掉「直接给业务领域」入口 |

### 后续（不在本版）

- `references/web-e2e.md` + `references/miniprogram-e2e.md`：前端 E2E 维度表，从零建 + 从零验证
- 若真实任务暴露「主 agent 自己糊弄自己」→ 再考虑升级为独立校验 sub-agent
- 维度表在正向场景的增删：跑过真实任务后按实证调整，删掉不适用的、补上真漏的
````

- [ ] **Step 3: 跑结构化校验**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge/incubating/test-case-authoring && \
echo "--- 版本号 ---" && grep -c "^## v0.1.0" CHANGELOG.md && \
echo "--- 未验证声明 ---" && grep -c "均未在正向场景验证" CHANGELOG.md && \
echo "--- 三件观察 ---" && grep -c "^1\. \*\*三门有没有真拦住\|^2\. \*\*维度表有没有召回\|^3\. \*\*「待澄清」有没有真挡住" CHANGELOG.md
```
Expected:
```
--- 版本号 ---
1
--- 未验证声明 ---
1
--- 三件观察 ---
3
```

- [ ] **Step 4: 全量结构校验（三文件齐备、无空占位）**

Run:
```bash
cd /Users/lilongjian/Projects/AI/skill-forge && \
echo "--- 文件清单 ---" && find incubating/test-case-authoring -type f | sort && \
echo "--- 无空文件 ---" && find incubating/test-case-authoring -type f -empty | wc -l && \
echo "--- 无前端占位 ---" && ls incubating/test-case-authoring/references/ | tr '\n' ' ' ; echo
```
Expected:
```
--- 文件清单 ---
incubating/test-case-authoring/CHANGELOG.md
incubating/test-case-authoring/SKILL.md
incubating/test-case-authoring/references/backend-api.md
--- 无空文件 ---
0
--- 无前端占位 ---
backend-api.md
```

**必须正好三个文件**。出现 `web-e2e.md` / `miniprogram-e2e.md` / 空的 `evals/` 均违反 Global Constraints（第一版不建空占位）。

- [ ] **Step 5: 提交**

```bash
cd /Users/lilongjian/Projects/AI/skill-forge && \
git add incubating/test-case-authoring/CHANGELOG.md && \
git commit -m "$(cat <<'EOF'
docs(test-case-authoring): CHANGELOG v0.1.0 + 成色声明

明写「纪律层与维度表均未在正向场景验证」—— 照 module-spec-baseline
标注成色的做法,别让三个月后的自己误以为这是验证过的东西。

记录八条关键设计取舍的 why,以及第一次跑真实任务时要观察的三件事
(三门有没有真拦住 / 维度表有没有召回本来会漏的 / 「待澄清」有没有
真挡住编造)。

第一版不建 evals: 纪律层零验证时先撞真实任务比先造架子有信息量,
反面教材是隔壁 module-spec-baseline/evals/ 那个从无提交的空目录。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 交接：真实验证不在本计划内

三个任务做完，skill **结构上完整但行为上零验证**。设计文档 §7 定义的真正验证是：

> 拿一次**真实的后端接口开发任务**跑一遍，观察三件事（见 CHANGELOG v0.1.0「跑第一次真实任务时要观察三件事」）。

这需要用户提供真实任务输入，**不能在本计划内自动完成**。计划执行完毕后，向用户交接：

> skill 已建好（结构校验全绿），但**一次真实任务都没跑过**。要验证它是否有效，需要你给一个真实的后端接口开发任务——可以是 recon-driven-dev 产物目录，也可以直接口述。跑完按 CHANGELOG 里那三件事复盘，据实证增删维度、调整门的判据。

**不要在没跑过真实任务前，把这个 skill 从 `incubating/` 移到 `skills/`**（发布面）。

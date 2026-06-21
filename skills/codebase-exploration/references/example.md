---
generated_by: codebase-exploration v0.6
generated_at: 2026-06-21
stack: typescript
backend_root: notify-hub
commit: 8fcee6b
---

> **项目结构地图（活文档）**。本地图由 `codebase-exploration` 从源码客观测绘生成——给你建立结构认知，可疑边界已标低置信，核实见 `/module-brief`。
>
> **【格式示例】** 本文件是虚构的"通知网关服务"地图，展示 `docs/codebase-map.md` 的**读者卡片**风格。内容是构造的，不指向任何真实项目。**虚构 · 格式示例**（脱敏，不指真实项目）。

# 项目结构地图（活文档）

## 一、技术栈与分层

后端 **Fastify** + **Prisma**（PostgreSQL）+ **Redis**（缓存/幂等）+ **BullMQ**（异步队列）；认证 JWT；日志 pino；配置 dotenv + `src/config`；运行时 Node 20 / TypeScript 5。

分层：`src/plugins`（Fastify 插件/横切）→ `src/modules/<feature>`（业务模块，各含 routes / service / repository）→ `src/adapters`（出站客户端，无 routes）→ `src/jobs`（BullMQ worker，无 HTTP 入口）。

---

## 二、模块总览

| 顶层目录 | 性质 | 模块 |
|---|---|---|
| `src/modules/channel` | **伞形目录** | `channel-email` 邮件渠道 / `channel-sms` 短信渠道 / `channel-push` 推送渠道 |
| `src/modules/notification` | 单一模块 | `notification` 通知调度 |
| `src/modules/template` | 单一模块 | `template` 消息模板 |
| `src/modules/subscription` | 单一模块 | `subscription` 订阅管理 |
| `src/adapters` | 适配器集合 | 非业务，见第三节 |
| `src/jobs` | 异步 worker | `retry-job` 失败重试 / `digest-job` 摘要聚合 |

> **粒度说明**：`channel` 拆 3 子，每子对应独立渠道逻辑，可各自 `/module-brief`；若整目录当单模块会让上下文过重。`jobs` 目录无 HTTP 路由，作为 worker 单独列、不与业务模块混。

### 模块清单

### `notification` 通知调度　置信：高
- **干什么**：接收业务方调用，按渠道偏好路由到对应渠道服务，写流水、更新状态机（待发→发送中→已发/失败）
- **入口**：`routes/notification.routes.ts`（POST /notifications）；`NotificationService.dispatch()`
- **锚 实体/表**：`Notification` [Prisma model]（通知主记录）·`NotificationLog` [Prisma model]（发送流水）
- **依赖摘要**：调 channel-email / channel-sms / channel-push；读 template（渲染内容）；被 subscription 调（查偏好）
- ⚠️ 全系统调度 hub——改状态机枚举（`NotificationStatus`）需全链路回归

### `template` 消息模板　置信：高
- **干什么**：管理通知模板（标题/正文/变量占位符），提供渲染接口（传变量 → 返回渲染后文本）
- **入口**：`routes/template.routes.ts`（CRUD /templates）；`TemplateService.render()`
- **锚 实体/表**：`Template` [Prisma model]（模板定义）·`TemplateVersion` [Prisma model]（版本历史）
- **依赖摘要**：被 notification 调（渲染）；无其他跨模块依赖
- ⚠️ 模板变量格式（`{{variable}}`）与 `render()` 正则强耦合，改格式要改两处

### `subscription` 订阅管理　置信：高
- **干什么**：管用户对每类通知的渠道偏好（邮件/短信/推送 开启/关闭），供 notification 查偏好路由
- **入口**：`routes/subscription.routes.ts`（GET/PUT /subscriptions/:userId）
- **锚 实体/表**：`Subscription` [Prisma model]（用户订阅偏好）
- **依赖摘要**：被 notification 调；无其他跨模块依赖

### `channel-email` 邮件渠道（channel 子模块）　置信：高
- **干什么**：对接 SMTP（或 SendGrid），发送 HTML 邮件，记发送结果
- **入口**：`ChannelEmailService.send()`（无 HTTP 路由，仅被 notification 调）
- **锚 实体/表**：`ChannelDelivery` [Prisma model]（渠道投递记录，email 渠道行）
- **依赖摘要**：调 `adapters/sendgrid`；被 notification 调

### `channel-sms` 短信渠道（channel 子模块）　置信：高
- **干什么**：对接短信平台（Twilio），发送短信，记投递结果
- **入口**：`ChannelSmsService.send()`
- **锚 实体/表**：`ChannelDelivery` [Prisma model]（渠道投递记录，sms 渠道行）
- **依赖摘要**：调 `adapters/twilio`；被 notification 调
- ⚠️ `ChannelDelivery` 与 channel-email 共用同一张表，按 `channel` 字段区分——改表结构两渠道都受影响

### `channel-push` 推送渠道（channel 子模块）　置信：中
- **干什么**：对接 FCM 发推送，支持 topic 广播与点对点推送
- **入口**：`ChannelPushService.send()`
- **锚 实体/表**：`ChannelDelivery` [Prisma model]（渠道投递记录，push 渠道行）
- **依赖摘要**：调 `adapters/fcm`；被 notification 调
- ⚠️ topic 广播路径与点对点路径的错误重试策略不同，retry-job 需按 `deliveryType` 判断——改重试逻辑须同步看 worker

---

## 三、约定与横切机制

### 横切件（请求先过谁）

Fastify 插件注册顺序（`src/app.ts` 中 `register` 顺序）：

1. **`plugins/jwtPlugin.ts`** — JWT 验签，装饰 `request.user`；白名单路由（`/health`、`/metrics`）跳过
2. **`plugins/rateLimitPlugin.ts`** — 基于 Redis 限流（每 IP/分钟上限），早于路由处理
3. **`plugins/requestLogPlugin.ts`** — pino 结构化请求日志（进/出各一条）
4. **`plugins/errorHandler.ts`** — 全局错误钩子（`setErrorHandler`），统一 JSON 错误响应格式

### 项目约定（加东西要守什么规矩）

| 约定 | 定义点 | 怎么遵守 |
|---|---|---|
| **认证** | `plugins/jwtPlugin.ts`；白名单在 `config/auth.ts` 的 `PUBLIC_ROUTES` 数组 | 加新路由默认受保护；需放行须把路径加入 `PUBLIC_ROUTES` |
| **错误处理** | `plugins/errorHandler.ts`（`setErrorHandler`）；错误类型定义在 `src/errors/` | 抛 `AppError` 子类，handler 统一格式化；禁止路由层 try/catch 后直接 `reply.send` |
| **日志** | `plugins/requestLogPlugin.ts` + `src/lib/logger.ts`（pino 实例） | 业务日志用 `logger.info/warn/error`，禁 `console.log`；敏感字段（手机号/邮箱）在 logger 配置的 `redact` 列表 |
| **配置** | `src/config/index.ts`（dotenv 加载 + Zod schema 校验）；运行时 `config.smtp.host` 等访问 | 禁直接读 `process.env`；新配置项在 `src/config/index.ts` 的 Zod schema 声明后使用 |
| **事务** | Prisma `$transaction([...])`；跨表写操作均在 `service` 层发起 | 凡跨 2 张以上 Prisma model 写操作必须包 `$transaction`；`repository` 层不自起事务，由 service 传 `tx` 参数 |
| **缓存** | `src/lib/cacheService.ts`（Redis 封装，`get/set/del` + TTL 策略）| 读热点（模板渲染结果、订阅偏好）走 `cacheService`；TTL 在 `config/cache.ts` 统一管理，禁 hardcode |

---

## 四、改动前必读 / 陷阱

**共享投递记录表（同表多渠道）**
- `ChannelDelivery` 表被 email / sms / push 三个渠道模块共用，按 `channel` 字段区分行；改表结构（加/删字段）三渠道全受影响，Prisma migration 后三个 service 要同步回归

**通知调度是全系统 hub**
- `NotificationService` 是全系统编排中心，任何渠道路由逻辑改动都要做端到端回归；状态机枚举（`NotificationStatus`）改动尤危险，BullMQ worker 的重试判断也依赖它

**BullMQ worker 里的状态变更不过 HTTP 层**
- `retry-job` 和 `digest-job` 直接调 service 方法更新 Prisma 状态，不走 Fastify 路由——改状态流转逻辑时，**同时检查 HTTP handler 与 job worker 两条路径**，否则状态机只修了一半

**Prisma migration 与 Redis 缓存失效**
- 改 `Template` / `Subscription` 表结构后，`cacheService` 对应 key 的 TTL 可能让旧结构数据残留；migration 后需手动 `cacheService.del` 对应前缀或等 TTL 自然过期

---

## 五、上手顺序

**图例**：**✅ 跑**（值得一次深析）· **⚖️ 你定**（拿不准，跳过或跑都行）· **⬜ 不跑**（按读法扫即可）。可跑的命令用 **➡️** 标出。

**判定依据**：扇出（第六节矩阵）+ 逻辑看着厚不厚，取「或」；地图看不进模块内部有没有藏雷，深析与否由你定。**反直觉护栏**：notification 是全系统 hub，哪怕卡片看着 CRUD，也优先深析——别因"看着薄"跳过。

### 1. 全局横切件

| 项 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| `plugins/jwtPlugin` | JWT 验签，白名单放行 | ⬜ 不跑 — 读 `plugins/jwtPlugin.ts` + `config/auth.ts` 的 `PUBLIC_ROUTES` 一遍即可 |
| `plugins/errorHandler` | 全局错误格式化 | ⬜ 不跑 — 读 `plugins/errorHandler.ts` 一个代表，其它错误类型看 `src/errors/` |
| `src/lib/cacheService` | Redis 缓存封装 | ⬜ 不跑 — 读 `lib/cacheService.ts` 接口 + `config/cache.ts` TTL 策略即可 |
| `src/adapters/*` | 出站客户端（SendGrid / Twilio / FCM） | ⬜ 不跑 — 按需选 1 个代表读（如 `adapters/sendgrid/SendgridAdapter.ts`），其它同模式 |

### 2. 数据与配置底层

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| `template` | 模板定义 + 渲染 | ✅ 跑 — 被 notification 依赖，渲染逻辑有变量替换细节 ➡️ `/module-brief template` |
| `subscription` | 用户渠道偏好 | ⚖️ 你定 — 逻辑看着薄（读/写偏好），但被 notification 路由决策依赖；省事可跳过让 notification 深析时就地读 / 想先建立认知 ➡️ `/module-brief subscription` |

### 3. 渠道层（均被 notification 调）

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| `channel-email` | SMTP/SendGrid 发邮件 | ✅ 跑 — 渠道主体，有发送结果处理逻辑 ➡️ `/module-brief channel-email` |
| `channel-sms` | Twilio 发短信 | ✅ 跑 — 与 email 共享 `ChannelDelivery` 表，有区分逻辑 ➡️ `/module-brief channel-sms` |
| `channel-push` | FCM 推送 | ⚖️ 你定 — 置信中，topic 广播与点对点路径不同，地图看不透内部重试细节；要改推送再跑 ➡️ `/module-brief channel-push` |

### 4. 顶层调度 hub

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| `notification` | 全系统调度中心 + 状态机 | ✅ 跑 — 高扇出 hub，逻辑最厚，是理解全系统的入口 ➡️ `/module-brief notification` |

### 5. 异步 worker（不过 HTTP）

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| `retry-job` | 失败通知重试 worker | ⚖️ 你定 — 直接调 service 更新状态，不过 HTTP；改重试策略必看，否则可跳过 ➡️ `/module-brief retry-job` |
| `digest-job` | 摘要聚合 worker | ⬜ 不跑 — 定时聚合逻辑独立，读 `jobs/digest-job.ts` 一遍即可 |

---

## 六、模块依赖矩阵

跨模块依赖（机械事实，是第五节拓扑序与模块卡片「依赖摘要」的单一权威源）。

| 源模块 | 目标 | 强度 | 代表锚点 |
|---|---|---|---|
| notification | template | Injected | `TemplateService.render()` |
| notification | subscription | Injected | `SubscriptionService.getPreferences()` |
| notification | channel-email | Injected | `ChannelEmailService.send()` |
| notification | channel-sms | Injected | `ChannelSmsService.send()` |
| notification | channel-push | Injected | `ChannelPushService.send()` |
| channel-email | adapters/sendgrid | Adapter | `SendgridAdapter.sendMail()` |
| channel-sms | adapters/twilio | Adapter | `TwilioAdapter.sendSms()` |
| channel-push | adapters/fcm | Adapter | `FcmAdapter.send()` |
| retry-job | notification | Import-only | `NotificationService.retryDispatch()` |
| digest-job | notification | Import-only | `NotificationService.queryBatch()` |
| template | (无跨模块依赖) | — | — |
| subscription | (无跨模块依赖) | — | — |

**强度档**：`Injected`（Fastify DI / 构造注入）/ `Import-only`（仅 import 调用，无 DI 注册）/ `Adapter`（目标在 `src/adapters`，出站基础设施）。  
**代表非穷举**：锚点取代表，同模块其它调用见 `/module-brief`。

---

## 七、新鲜度与重生

- 本地图基于 commit `8fcee6b` 生成（generated_at: 2026-06-21）。
- **该刷新吗**：跑 `git diff --stat 8fcee6b..HEAD`，若出现**模块目录增删**或 **manifest（package.json / tsconfig / prisma/schema.prisma）变更** → 结构可能变了，建议刷新。仅业务逻辑改动、无新增/删除模块 → 慢变结构通常仍准。
- **一键重生**：重跑 `codebase-exploration`（覆盖本文件）。

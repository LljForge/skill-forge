---
generated_by: codebase-exploration vX.Y
generated_at: 2026-01-15
backend_root: shop-service
---

> ⚠️ **探索草稿 · 非权威**。本地图由 `codebase-exploration` 从源码客观测绘生成——给你建立结构认知,不是权威文档。可疑处用 `/module-brief <模块>` 核实。
>
> **【格式示例】** 本文件是虚构的"电商订单服务"地图,展示 `docs/codebase-map.md` 的**读者卡片**风格。内容是构造的,不指向任何真实项目。

# 项目模块地图

## 一、技术栈

后端 Spring Boot + JPA + OpenFeign;Spring Security + JWT;Redis 缓存;Kafka 消息;前端 React 17 + TypeScript。

## 二、全局总览

| 顶层包 | 性质 | 测出的模块 |
|---|---|---|
| `com.example.shop.order` | 单一模块 | `order` 订单 |
| `com.example.shop.product` | 单一模块 | `product` 商品 |
| `com.example.shop.payment` | **伞形包** | `payment-core` 主流程 / `payment-refund` 退款 / `payment-reconcile` 对账 |
| `com.example.shop.inventory` | 单一模块 | `inventory` 库存 |
| `com.example.shop.masterdata` | **伞形包** | `customer` 客户 / `employee` 员工 / `organization` 组织 / `dictionary` 字典 / `audit-log` 审计(横切) |
| `com.example.shop.integration` | 适配器集合 | 非业务模块,见下节 |

> **粒度说明**:`payment` 拆 3 子、`masterdata` 拆 5 子,每个 ≤ ~50 java。这个粒度才能用 `/module-brief <子模块>` 深入;伞形包整体当一个模块会让 `/module-brief` 上下文爆炸。

## 三、全局基础设施(非业务,跨切面)

- **`RedisIdempotencyService`** — 所有写接口的幂等保护,改它要全栈回归
- **`AuditLogAspect`** — Spring AOP 切 `@Audited` 注解,写 `audit_log` 表
- **`com.example.shop.integration.*`** — 对支付宝/微信支付/京东物流/顺丰的出站客户端,各业务模块的"对外出口"

## 四、模块清单

### `order` 订单　置信:高
- **干什么**:管订单全生命周期(下单→已支付→已发货→已完成),与商品/库存/支付协作
- **入口**:`OrderController` / `OrderApiController`(给 H5 调)
- **锚 PO / 表**:`OrderEntity` (`[DDL] t_order`="订单主表") · `OrderItemEntity` (`t_order_item`="订单商品行")
- **依赖摘要**:调 product/inventory/payment;被 integration/wms 调
- ⚠️ 全系统核心 hub——改字段需 product/inventory/payment 全链路回归

### `payment-core` 支付主流程　置信:高
- **干什么**:发起支付、处理回调、跑状态机(待支付→支付中→已支付/失败)
- **入口**:`PaymentController`(创建查询) · `PaymentCallbackController`(平台回调)
- **锚 PO / 表**:`PaymentEntity` (`[DDL] t_payment`="支付单") · `PaymentLogEntity` (`t_payment_log`="支付流水")
- **依赖摘要**:调 integration/alipay 与 integration/wechatpay;被 order 调

### `payment-refund` 退款　置信:中
- **干什么**:发起退款、对接支付平台退款 API、回写订单状态
- **入口**:`RefundController`
- **锚 PO / 表**:`RefundEntity` (`[DDL] t_refund`="退款单")
- **依赖摘要**:调 payment-core(查原支付单) / order(回写状态)

### `payment-reconcile` 对账　置信:低 ⚠️
- **干什么**:每日跑批拉支付平台对账文件,核对状态一致性
- **入口**:`ReconcileScheduledTask`(@Scheduled,无 Controller)
- **锚 PO / 表**:`ReconcileMismatchEntity` (`[DDL] t_reconcile_mismatch`="对账差异")
- ⚠️ 与 payment-core 注入边几乎为 0——真要动,建议独立成"支付对账"团

### `product` 商品　置信:高
- **干什么**:商品主数据(SPU/SKU)与上下架状态
- **入口**:`ProductController` / `ProductApiController`
- **锚 PO / 表**:`ProductSpuEntity` (`[DDL] t_product_spu`="商品 SPU") · `ProductSkuEntity` (`t_product_sku`="商品 SKU")
- **依赖摘要**:被 order 调

### `inventory` 库存　置信:高
- **干什么**:库存扣减/回滚(下单扣、取消回);Redis 预占 + DB 落盘双写
- **入口**:`InventoryController`(查询) · Kafka 消费者(扣减)
- **锚 PO / 表**:`StockEntity` (`[DDL] t_stock`="商品库存")
- **依赖摘要**:被 order 调
- ⚠️ Redis 预占 + DB 落盘双轨——改时两边必须同步,否则超卖

### `customer` 客户(masterdata 子模块)　置信:高
- **干什么**:管客户主体(对公企业 + 自然人),含证件与联系方式
- **入口**:`CustomerController`(后台) · `CustomerApiController`(小程序)
- **锚 PO / 表**:`CustomerEntity` (`[DDL] t_customer`="客户主表") · `CustomerContactEntity` (`t_customer_contact`="客户联系方式")
- **依赖摘要**:被 order(下单填客户) / payment(退款找客户) 调

### `employee` 员工(masterdata 子模块)　置信:高
- **干什么**:管内部员工主数据 + 各系统账号
- **入口**:`EmployeeController` · `EmployeeAccountController`
- **锚 PO / 表**:`EmployeeEntity` (`[DDL] t_employee`="内部员工") · `EmployeeAccountEntity` (`t_employee_account`="员工系统账号")
- **依赖摘要**:被 audit-log(操作人字段) 引

### `organization` 组织(masterdata 子模块)　置信:高
- **干什么**:管公司组织树
- **入口**:`OrganizationController`
- **锚 PO / 表**:`OrganizationEntity` (`[DDL] t_organization`="组织机构")
- **依赖摘要**:被 employee(员工归属)调

### `dictionary` 字典(masterdata 子模块)　置信:中
- **干什么**:管下拉字典 + 业务编码生成规则
- **入口**:`DictionaryController` · `CodegenController`
- **锚 PO / 表**:`DictionaryEntity` (`[DDL] t_dictionary`="字典") · `CodegenRuleEntity` (`t_codegen_rule`="编码规则")
- **依赖摘要**:被 customer/order/employee 调(编码生成)

### `audit-log` 主数据审计(masterdata 子模块,横切性质)　置信:高
- **干什么**:每张主数据表的"修改/删除"留痕(影子表族),仅查询不业务
- **入口**:`AuditLogController`(暴露历史查询)
- **锚 PO / 表**:13 张 `t_<table>_audit_log` 影子表
- ⚠️ 写入路径=JPA `@EntityListeners`,业务代码层 0 写——改主数据表字段必须同步改 Listener

## 五、改动前必读

**同表多 PO 命名误导**
- `t_customer` 同时被 `CustomerEntity` 和 `LegacyCustomerPO` 映射(后者疑废弃但还在);改"客户"时确认改哪个

**核心 hub(改动牵连广)**
- `OrderEntity`:全系统主轴,任何字段改动都要做全链路回归
- `RedisIdempotencyService`:所有写接口的幂等保护,改它影响范围全栈

**死码 / 库内垃圾**
- `t_order_bak_2024`、`t_payment_old` 等:无对应 Entity 的历史包袱表,可清理

**编排位置**
- 本项目注入图较密(典型 JPA 项目),业务编排在 Service 层——读流程读 Service 即可,不像扁平 CRUD 那样要去 Controller 找编排

## 六、上手顺序

**按依赖链拓扑序**——从第七节依赖矩阵机械派生,**按层分组、每层一张表**。每行末列以 ✅/⚖️/⬜ 起头,一眼扫到要不要为这个模块花一次深析。

**图例**:**✅ 跑**(值得一次深析) · **⚖️ 你定**(拿不准,跳过或跑都行) · **⬜ 不跑**(按读法扫即可)。可跑的命令用 **➡️** 标出。

**判定依据**:扇出 + 逻辑厚薄,取「或」;拿得准给结论、拿不准标 ⚖️ 摆两条路——地图看不进模块内部有没有藏雷,深析与否由你定。**反直觉提醒**:高扇出 hub 哪怕满屏 CRUD 看着薄,也优先深析——别因"看着薄"跳过。

价值:新人从地基往上盖——先建立底层模块认知,再看依赖它的上层。

### 1. 基础设施 / 横切件

| 项 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| `RedisIdempotencyService` | 写接口幂等保护 | ⬜ 不跑 — 读 Service + `@Idempotent` 用法即可 |
| `AuditLogAspect` | 审计 AOP | ⬜ 不跑 — 读 `aspect/AuditLogAspect.java` 一个反例 |
| `integration/*` | 出站客户端 | ⬜ 不跑 — 选 1 个代表读(如 `integration/alipay/AlipayClient`) |

### 2. 主数据底层(被广泛依赖,是地基)

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| **组织** `organization` | 组织树 | ✅ 跑 — 地基,被员工归属依赖 ➡️ `/module-brief organization` |
| **员工** `employee` | 员工挂组织 | ✅ 跑 — 人主数据,被审计/订单引 ➡️ `/module-brief employee` |
| **客户** `customer` | 客户主体 | ✅ 跑 — 被订单/退款依赖 ➡️ `/module-brief customer` |
| **字典** `dictionary` | 下拉 + 编码规则 | ⚖️ 你定 — 下拉部分薄,但编码规则有生成逻辑、且被 customer/order/employee 3 家依赖;地图看不进内部。省事就跳过让 3 家分析时就地读 / 要厘清编码规则就跑 ➡️ `/module-brief dictionary`。不预指折向 |

### 3. 业务实体上游(被订单消费)

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| **商品** `product` | SPU/SKU + 上下架 | ✅ 跑 — 被订单依赖 ➡️ `/module-brief product` |
| **库存** `inventory` | Redis 预占 + DB 落盘双轨 | ✅ 跑 — 双轨易超卖、有扣减逻辑 ➡️ `/module-brief inventory` |

### 4. 支付链(均被 order 调)

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| **支付主流程** `payment-core` | 状态机驱动 | ✅ 跑 — 状态机 + 回调,核心逻辑 ➡️ `/module-brief payment-core` |
| **退款** `payment-refund` | 对接平台退款 API | ✅ 跑 — 退款流程 + 回写订单 ➡️ `/module-brief payment-refund` |

### 5. 业务顶层 hub

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| **订单** `order` | 全生命周期 + 状态机 | ✅ 跑 — 全系统 hub,逻辑最厚 ➡️ `/module-brief order` |

### 6. 横切审计

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| `audit-log` | 影子表留痕 | ⬜ 不跑 — 看 Entity 的 `@EntityListeners` + 一张影子表 DDL 即可 |

### 7. 灰区(低置信)

| 模块 | 干什么 | 要不要跑 `/module-brief` |
|---|---|---|
| **支付对账** `payment-reconcile` | 每日跑批对账 | ⚖️ 你定 — 与 payment-core 几乎无注入边、置信低;真要动再核实 ➡️ `/module-brief payment-reconcile` |

## 七、模块依赖矩阵

跨子模块依赖全集（机械事实，是第六节拓扑序与第四节「依赖摘要」的单一权威源）。

| 源模块 | 目标 | 强度 | 锚点 |
|---|---|---|---|
| order | product | Injected | ProductService |
| order | inventory | Injected | StockService |
| order | payment-core | Injected | PaymentService |
| order | dictionary | Import-only | CodegenRuleEntity（编码生成）|
| order | integration/wms | Adapter | WmsAdapter |
| payment-core | order | Injected | OrderService（回写状态）|
| payment-core | integration/alipay | Adapter | AlipayClient |
| payment-core | integration/wechatpay | Adapter | WechatPayClient |
| payment-refund | payment-core | Injected | PaymentService（查原支付单）|
| payment-refund | order | Injected | OrderService（回写状态）|
| inventory | (无跨子模块依赖) | — | — |
| product | (无跨子模块依赖) | — | — |
| customer | (无跨子模块依赖) | — | — |
| employee | organization | Injected | OrganizationService（员工归属）|
| organization | (无跨子模块依赖) | — | — |
| dictionary | (无跨子模块依赖) | — | — |
| audit-log | (写入由 JPA EntityListener 触发，非业务依赖) | — | — |

**强度档**：`Injected`（注入边）/ `Import-only`（仅 import，无注入）/ `Adapter`（目标在基础设施包）。
**完整度契约**：跨子模块的 `import com.<root>.` 必须全列；本子模块内 import 不列；反向依赖（底层 import 上层）标 `(反向异味)`，本示例无。

# Spring Boot Web 层分析策略

> 识别由检测器负责（`@SpringBootApplication` / `@EnableAutoConfiguration`），此处不重复。

## 关键词表（召回底线：至少覆盖，遇组合/自定义/元注解照追）
- 入口：`@RestController` / `@Controller`(+`@ResponseBody`)
- 方法映射：`@RequestMapping` / `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` / `@PatchMapping`
- 参数绑定：`@RequestBody` / `@RequestParam` / `@PathVariable` / `@RequestHeader`

## 分析模式
每个端点追完整链：定位 Controller → 拼「类级 `@RequestMapping` 前缀 + 方法路径」→ 追 `Controller.method()` → `Service.method()`（注入的 Service 再追一层）→ 记请求参数类型与返回类型。

## 栈特有陷阱（分析指令）
- ⚠️ 真实 URL 受全局前缀影响：存在 `server.servlet.context-path` / `spring.mvc.servlet.path` 时，端点路径要叠加该前缀（否则前后端契约对照会错位）。
- 组合元注解（自定义注解上再标 `@RequestMapping`）标注的方法同样是端点——不在上面清单里也照追。

## 输出（structure-analysis.md 的 API 映射表，供 spec-synthesis 抽象成 specs）
| HTTP 方法 | 路径 | Controller.method() | → Service 调用链 | 请求参数类型 | 返回类型 |
|-----------|------|---------------------|-------------------|-------------|---------|

---

## 非 HTTP 入口（定时/调度 · MQ 入站消费 · 启动钩子）

> 维度定义见 [`../../references/behavior-dimensions.md`](../../references/behavior-dimensions.md) A 段；本节是 Spring Boot 栈的**具体召回写法**。发现习惯绕着 HTTP 端点转，没有 HTTP 入口的这类后台行为整类看不见，需单独按关键词召回。

### 关键词表（召回底线）
- **定时/调度**：`@Scheduled`（cron 值常来自 properties 的 `*.cron` 占位符）+ 类上 `@EnableScheduling`；外部调度器（Quartz / xxl-job）。
- **MQ 入站消费**：`@RabbitListener` / `@KafkaListener` / `@JmsListener`（监听到消息即触发处理）。
- **启动钩子**：`CommandLineRunner` / `ApplicationRunner` / `@PostConstruct`。⚠️ 多数只建线程池/读配置、**无外部可观察后果 → 不登记**；仅当"启动即自动跑一轮可观察的同步/预热"才登记。

### ⚠️ 活性核验（命中后必做，否则照注解写契约 = 编造）
命中关键词只是**候选**，必须**深读到真身**确认它当前真会跑——空壳守卫照注解臆测就是凭空造一条不存在的契约：
- `@Scheduled` 那一行（及整个调度方法）是否被 `//` 注释掉——**类上 `@EnableScheduling` 仍在、但方法整段注释 = 不运行**（常见死壳）。
- cron 占位符在**当前 profile** 是否真有非空、非禁用值——Spring 中 cron 取 `-` 为禁用；占位符在 properties 里缺失也不会跑。
- 监听注解的队列/方法是否被注释或条件装配（`@ConditionalOn*`）关掉。

核验**不通过**（注释 / 空值 / 禁用 / 条件关闭）→ **不登记为入口**，或标 `[待验证]` 注明"当前不运行"，**绝不写成肯定契约**。

### 分析模式 + 输出（供 spec-synthesis 抽象）
对每个**活性核验通过**的入口，追一层：入口方法 → 调的 Service → 落到什么**外部可观察后果**（到点数据被同步 / 账单被生成 / 通知被发出 / 收到消息后下游状态变化）。

记 **触发条件 + 可观察后果**，**不记机制**：不写 cron 表达式、不写 MQ 中间件名、不写线程/异步线程、不把 `@注解` 当契约词——这些是实现，调用方/观察者看不到。触发周期统一表达为"按预置调度周期"（具体 cron 随 profile 变、非稳定契约）。

| 入口类型 | 类.方法() | 触发条件 | → Service 调用链 | 可观察后果 |
|---------|----------|---------|-----------------|-----------|

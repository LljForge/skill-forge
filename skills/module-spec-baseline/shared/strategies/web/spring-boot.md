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

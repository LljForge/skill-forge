# Spring MVC Web 层分析策略

> 识别由检测器负责（`web.xml` / `WebApplicationInitializer`、`@Controller` 且无 Spring Boot 启动类），此处不重复。

## 关键词表（召回底线：至少覆盖，遇组合/自定义注解照追）
- 入口：`@Controller`（不一定有 `@ResponseBody`）/ `@RequestMapping`
- 方法映射：`@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping`
- 视图相关：`ModelAndView` / `Model` / `ModelMap` / `@ModelAttribute`
- 参数绑定：`@RequestBody` / `@RequestParam` / `@PathVariable`

## 分析模式
每个端点追完整链：定位 `@Controller` → 拼「类级 `@RequestMapping` 前缀 + 方法路径」→ 追 Controller.method() → Service.method()。**区分返回视图名（String/ModelAndView）与返回 JSON（`@ResponseBody`）的端点**——视图端点记录 Model 放入的属性名。

## 栈特有陷阱（分析指令）
- ⚠️ `web.xml` 中 DispatcherServlet 的 `url-pattern` 是全局路径前缀，端点真实 URL 要叠加它。
- 视图端点的 ViewResolver 前后缀（JSP/Thymeleaf）决定实际渲染的模板路径——别把视图名当 URL。

## 输出（structure-analysis.md 的 API 映射表，供 spec-synthesis 抽象成 specs）
| HTTP 方法 | 路径 | Controller.method() | 返回类型(视图/JSON) | → Service 调用链 | 请求参数类型 |
|-----------|------|---------------------|---------------------|-------------------|-------------|

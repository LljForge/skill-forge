# Feign Client 远程调用分析策略

> 栈识别归检测器，此处不重复；下表注解在此作远程调用定位锚点（非重复识别）。

## 关键词表（召回底线：至少覆盖）
- 定位：`@FeignClient(name=, path=, url=, fallback=, fallbackFactory=)`
- 方法上的 Spring MVC 注解（`@GetMapping` 等）声明远程端点

## 分析模式
从本模块出发每条远程调用，追到目标服务处理方法：
`本模块 Service.method()` → `FeignClient.method()` → 目标服务（`name`）→ HTTP 路径（类级 `path` + 方法路径拼接）。记参数类型、超时配置。

## 栈特有陷阱（分析指令）
- ⚠️ **fallback / fallbackFactory 吞错**：配了降级会改变错误传播——远程失败不抛、走兜底，调用方感知不到。建模错误传播路径时必须标出。
- **继承式 Feign 接口**（接口继承共享 API 接口、注解标在父接口上）：要追到父接口才拿全端点，只看子接口会漏。

## 输出（structure-analysis.md 的远程调用表，供 spec-synthesis 综合）
| 调用方 Service.method() | → FeignClient.method() | 目标服务 | HTTP 路径 | 参数类型 | 超时/降级 |
|------------------------|----------------------|---------|----------|---------|----------|

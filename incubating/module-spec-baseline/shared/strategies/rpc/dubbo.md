# Dubbo 远程调用分析策略

> 栈识别归检测器，此处不重复；下表注解在此作消费/提供方定位锚点（非重复识别）。

## 关键词表（召回底线：至少覆盖）
- 消费方：`@DubboReference` / `@Reference`（旧版）
- 提供方：`@DubboService` / `@Service`（org.apache.dubbo 包）
- 配置：`dubbo.consumer` / `dubbo.provider` / `timeout` / `retries` / `version` / `group`

## 分析模式
从本模块出发每条远程调用追到目标：定位 `@DubboReference` 注入点 → 取接口全限定名 + version/group → 在本模块搜调用点 → `本模块 Service.method()` → `Dubbo 接口.method()` → 目标服务。定位 `@DubboService` 提供方实现。

## 栈特有陷阱（分析指令）
- ⚠️ `retries`（默认重试 2 次）在**非幂等**写服务上会致重复副作用——建模写操作时必须标出幂等风险。
- version/group 决定路由到哪个提供方实例，跨版本调用要标清。

## 输出（structure-analysis.md 的远程调用表，供 spec-synthesis 综合）
| 调用方 Service.method() | → Dubbo 接口.method() | 目标服务 | version/group | 超时/重试 |
|------------------------|---------------------|---------|--------------|----------|

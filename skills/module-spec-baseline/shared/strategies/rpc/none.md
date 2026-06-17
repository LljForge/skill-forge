# 单体应用 / 无远程调用框架

> 识别由检测器负责（无 Feign / Dubbo / gRPC 等依赖 → `rpc: none`），此处不重复。

## 分析模式
跳过远程调用追踪段落。仅当存在多模块 Maven/Gradle 项目时，记录模块间 compile 依赖（pom.xml 的 `<dependency>` 指向同项目其他模块）。

## 输出（structure-analysis.md 的远程调用段，供 spec-synthesis 综合）
输出「（单体应用，无远程调用）」。若有模块间依赖，附模块依赖表：

| 当前模块 | → 依赖模块 | 依赖方式 |
|---------|-----------|---------|

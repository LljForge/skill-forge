# 示例模块 — 设计说明

## 1. 分层结构概览
controller → service → dao → po。

## 2. 关键类 / 接口入口
`OrderService` / `OrderController#submit`。

## 3. 核心调用链
`OrderController#submit` → `OrderService.save` → `OrderDAO.insert`。

## 4. 数据模型概览
核心实体 Order;不穷举字段。

## 5. 陷阱与护栏
- **取消订单必须反写库存占用表**:否则库存虚高(本模块特有协同护栏)。
- **新增 DAO 必须在 `@MapperScan` 注册**:这条偏通用规范,但还是保留提醒一下。

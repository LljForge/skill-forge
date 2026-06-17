# MyBatis / MyBatis-Plus ORM 分析策略

> 识别由检测器负责（依赖含 `mybatis` / `mybatis-plus`），此处不重复。
> 本文件覆盖 MyBatis 家族：核心段对两者通用；标「MyBatis-Plus 附加」的内容仅当项目依赖含 mybatis-plus（Mapper 继承 `BaseMapper`、用 Wrapper）时适用——纯 MyBatis 项目跳过这些行。

## 关键词表（召回底线：至少覆盖，遇自定义基类/组合 Mapper 照追）
- Mapper：`@Mapper` / `@MapperScan`
- XML：`<mapper namespace=>` / `<select|insert|update|delete>` / `<resultMap>`
- DDL（**结构追踪/验证的 DDL 发现共用此处为单一权威·召回地板**）：grep **大小写不敏感**、容忍 `CREATE` 与对象关键词间的 `DEFINER=...` 子句，覆盖 `TABLE`/`VIEW`/`TRIGGER`/`FUNCTION`/`PROCEDURE`（如 `grep -niE "create +(definer *= *\S+ +)?(table|view|trigger|function|procedure)"`）。⚠️ **地板非天花板**：DDL 还有 `CREATE OR REPLACE`、小写、各导出方言等形态——上述 grep 命中**为空/稀疏时别据此判「无 DB 侧逻辑」**，换形态 / 换路径（DDL 常落在代码目录外的 `docs/sql` 等处）与扩展名（`.sql`/`.ddl`/无扩展名导出）再追；触发器/函数/视图常是审计留痕、树查、接口数据源等业务的真实承载，漏扫会让数据模型残缺。
- **MyBatis-Plus 附加**：Mapper 继承 `BaseMapper<T>`；Service 基座 `IService` / `ServiceImpl<M,T>`；条件构造 `LambdaQueryWrapper` / `QueryWrapper` / `LambdaUpdateWrapper` / `UpdateWrapper`

## 状态 gating 扫描模式（domain 步骤 2b 消费此节）
状态字段「被读做条件」的构造，与 Java `if` 等价、都算消费点：
- ⚠️ **XML `<where>` / `<if test>` / `<choose>`**：状态 gating 常只在 SQL（如增量起点 `where x='success'`），只看 Java 必漏。
- ⚠️ **MyBatis-Plus 附加 · Wrapper 构造器**：`eq` / `ne` / `in` / `notIn` / `gt` / `lt(getXxx, <字面量>)` —— 漏扫此类会把实有 gating 的字段误判为外部透传镜像、丢缺陷。
- **仅离散字面量算 gating**：`eq(getStatus,"2")` / `where status='2'` 算；`eq(x, 外部对象.getX())`（值取自外部）、`ne(x,"")`（非空判断）、占位符绑外部值（`#{x}`）**不算**。

## 分析模式
- Schema 来源优先级：DDL/建表脚本 > XML resultMap > PO 字段推断。
- **MyBatis-Plus 附加 · 状态分类提示**：`@TableLogic` 逻辑删除位归**派生位**（非真状态机）；`@TableField(exist=false)` 非持久字段排除出 PO-DB schema。

## 输出（structure-analysis.md 的数据模型表，供 spec-synthesis 抽象成 specs）
| 表名 | PO 类 | 字段数 | XML 映射文件 | 索引 | 约束 |
|------|-------|--------|-------------|------|------|

每 PO 附字段明细：

| PO 字段 | DB 列名 | 类型 | 注解/映射方式 |
|---------|---------|------|-------------|

> 这些是 scratchpad 取证（PO/DB 列、resultMap 等内部结构），**不进 spec**——spec 只留可观察约束（取值域/唯一/非空/长度），由 spec-synthesis 抽象。

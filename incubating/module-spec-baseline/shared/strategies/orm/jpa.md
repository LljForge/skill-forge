# JPA-Hibernate ORM 分析策略

> 识别由检测器负责（`@Entity`、依赖含 `spring-data-jpa` / `hibernate-core`），此处不重复。

## 关键词表（召回底线：至少覆盖）
- Entity：`@Entity` / `@Table` / `@MappedSuperclass` / `@Embeddable`
- 字段映射：`@Column` / `@Id` / `@GeneratedValue` / `@Enumerated` / `@Temporal`
- 关联：`@OneToMany` / `@ManyToOne` / `@ManyToMany` / `@OneToOne` / `@JoinColumn`
- Repository：`JpaRepository` / `CrudRepository` / `@Query` / `@Modifying`
- DDL：`CREATE TABLE`

## 状态 gating 扫描模式（domain 步骤 2b 消费此节）
状态字段「被读做条件」的 JPA 构造，与 Java `if` 等价、都算消费点：
- ⚠️ **方法名派生查询**：`findByStatusXxx` / `countByStateXxx` / `existsByXxx` —— 字段被读做条件的 JPA 惯用法，与 MyBatis-Plus 的 Wrapper.eq 同源，必扫。
- `@Query` 的 JPQL/SQL `where` 子句中的离散字面量条件。
- Criteria API：`cb.equal(root.get("status"), <字面量>)`。
- **仅离散字面量算 gating**；绑命名参数（`:status`）不算。

## 分析模式
- Schema 来源优先级：DDL > Entity JPA 注解 > 字段推断。
- ⚠️ 状态存值形态：`@Enumerated(EnumType.STRING)` 存枚举名、`ORDINAL` 存序号——决定状态字段在 DB 的实际取值形态，建模「实际写入态」时据此判定。
- 检查 `spring.jpa.hibernate.ddl-auto`（控制 schema 是否由 Hibernate 自动维护）。

## 输出（structure-analysis.md 的数据模型表，供 spec-synthesis 抽象成 specs）
| 表名 | Entity 类 | 字段数 | 关联关系 | 索引 | 约束 |
|------|----------|--------|---------|------|------|

每 Entity 附字段明细：

| Entity 字段 | DB 列名 | 类型 | JPA 注解 | 约束 |
|------------|---------|------|---------|------|

> 这些是 scratchpad 取证（Entity/列/JPA 注解等内部结构），**不进 spec**——spec 只留可观察约束，由 spec-synthesis 抽象。

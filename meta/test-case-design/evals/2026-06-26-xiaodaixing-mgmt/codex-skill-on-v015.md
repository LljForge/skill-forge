# 测试用例规范 — 小贷星管理

## 概览

- 输入来源：
  - docs/recon-driven-dev/_archived/2026-06-26-xiaodaixing-mgmt/requirements.md
  - docs/recon-driven-dev/_archived/2026-06-26-xiaodaixing-mgmt/design.md
- 适用范围：后端导入与分页查询、管理门户查询与导入页面、菜单接入、DDL 与构建验收。
- 说明：后端接口用例按 D1–D6 扫描；纯前端、文档、DDL 和构建类用例标为“无领域维度”。

### 待测事实集

以下事实集是本规范中所有用例“来源”字段的唯一输入面。

#### 验收标准

- **验收标准 A1**：新建 tjd_base_xiaodaixing_project，增量 DDL 位于 docs/sql/increment；包含 36 个业务列，以及批次、主键、审计、租户、逻辑删除和版本列。
- **验收标准 A2**：biz_web dev 环境“业务办理”下出现“小贷星管理”，访问后呈现查询页。
- **验收标准 A3**：导入小贷星项目清单（20260531）.xlsx 后，66 行全部留存；脏值保真；整批 data_date=20260531 且 batch_no 相同。
- **验收标准 A4**：列表分页可用，客户名、项目号、所属机构、是否逾期、项目评级、数据日期可筛选。
- **验收标准 A5**：产出 prod 菜单接入说明，至少明确父节点“业务办理”、路由 /slp/xiaodaixing 和菜单编码等配置。
- **验收标准 A6**：base-service 相关模块可使用项目规定的离线构建方式编译通过，且不新增 Maven 依赖。

#### 业务规则

- **业务规则 B1**：dev 菜单由 biz_web 本地菜单数据提供；prod 菜单权威在仓外 qfc-base-auth，本工作区只交付接入说明，不直接配置 prod 菜单。
- **业务规则 B2**：Excel 的 36 列尽量 1:1 保真，不做数据清洗；两个“核销金额”分别映射 write_off_amount 与 write_off_amount_2；空表头列映射 guarantee_way_detail；是否逾期、日期序列号等脏值使用 varchar 原样留存，不能因其报错或丢行。
- **业务规则 B3**：每次导入只追加，不按项目号去重；重复导入同一清单和同一文件内重复项目均应保留。
- **业务规则 B4**：每次导入形成一个批次；取整批首个非空“数据日期”填充所有业务行；整批都为空时使用上传时间兜底；同批使用同一 UUID batch_no 和 import_time。
- **业务规则 B5**：查询必须分页，并支持 customer、projectNo、orgPlatform、isOverdue、projectRating、dataDate 六个常用筛选字段。
- **业务规则 B6**：后端承载于 base-service，表名前缀为 tjd_，导入复用 EasyExcel 4.0.3，不增加依赖；查询显式限定 is_deleted=0。
- **业务规则 B7**：导入记录显式记录当前操作用户 create_user，并具备 tenant_id、create_time、last_modify_user、last_modified、is_deleted、version 等审计字段。
- **业务规则 B8**：本次只提供查询和导入；不提供单条新增、编辑、删除、导出，也不在本工作区直接配置 prod 菜单。
- **业务规则 B9**：导入为同步处理，成功返回前完成数据库写入；查询直接读取 tjd_base_xiaodaixing_project，没有缓存或异步下游。
- **业务规则 B10**：金额清晰的十列使用 decimal(24,6)；其余可能出现脏值、日期序列号、比例或重复列的数据按设计中的 varchar 长度存储。

#### 异常场景

- **异常场景 X1**：上传空文件时提示“文件不能为空”，不留存任何业务行。
- **异常场景 X2**：上传非 .xls/.xlsx 文件时提示“格式不支持”，不留存任何业务行。
- **异常场景 X3**：Excel 存在重复列名、空表头列或“是否逾期”日期拼接脏值时，导入不报错、不丢行，并保留原值。

#### 接口契约

- **接口契约 I1**：导入端点为 POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/importExcel，媒体类型为 multipart/form-data，文件字段名为 file。坐标来源：代码 biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:29,38-39。
- **接口契约 I2**：查询端点当前坐标为 POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/search；请求承载六个筛选字段以及 currentPage、pageSize 等分页字段；分页记录位于成功数据的 records。坐标来源：代码 biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:56-58；biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/vo/TjdBaseXiaodaixingProjectSearchVO.java:16-34；biz_web/src/modules/slp/pages/xiaodaixing/index.jsx:138-142。
- **接口契约 I3**：前端路由为 /slp/xiaodaixing，页面显示名为“小贷星管理”。坐标来源：代码 biz_web/src/modules/slp/routes/index.route.js:82-84。
- **接口契约 I4**：当前公共响应信封字段坐标为 success、code、message、data；查询 data 内含 records、total、current、size 等分页字段。字段坐标来源：代码依赖 qfc-common-1.0.166.jar 中 com.qm.qfc.common.rest.Result、com.qm.qfc.common.table.domain.QmPage。
- **接口契约 I5**：查询和上传调用会携带 authorization、QFCTid、QFCSid 等上下文请求头。坐标来源：代码 biz_web/src/api/fetch.ts:48-60,162-174；biz_web/src/modules/slp/pages/xiaodaixing/index.jsx:144-149。
- **接口契约 I6**：36 个 Excel 输入字段按 index 0–35 映射到设计中的固定字段；金额字段为 BigDecimal 坐标，其余字段为 String 坐标。来源：设计“36 列 1:1 映射表”。

### 输入契约边界归纳

| 输入面 | 有效类 | 无效或待裁决类 | 对应用例 |
|---|---|---|---|
| file | 非空 .xls、非空 .xlsx | 缺失、零字节、非 Excel、损坏工作簿、扩展名大小写 | TC-E-001, TC-E-002, TC-E-021, TC-ERR-001..004 |
| 工作簿行数 | 1 行、66 行、多行 | 只有表头、业务行判定未定义 | TC-E-003, TC-F-003, TC-E-017, TC-E-018 |
| 工作簿列结构 | 固定 36 列；重复表头与空表头合法 | 缺列、多列、重排 | TC-F-004, TC-E-021..023 |
| varchar(8) | isInstallment 长度 0..8 | 长度 9 | TC-E-009, TC-E-010 |
| varchar(16) | dataDate 长度 0..16 | 长度 17 | TC-E-009, TC-E-010 |
| varchar(32) | isOverdue、principalOverdueStart、interestOverdueStart、projectRating、reserveRatio、writeOffDate、contractExpireDate、extension 长度 0..32 | 长度 33 | TC-E-009, TC-E-010 |
| varchar(64) | businessDept、customerManager、center、productName、customerIdNo、qccIndustry、projectNo、writeOffAmount、writeOffAmount2、guaranteeWay、guaranteeWayDetail、loanNoticeNo 长度 0..64 | 长度 65 | TC-E-009, TC-E-010 |
| varchar(128) | orgPlatform、customer、actualCustomer、reportSubject 长度 0..128 | 长度 129 | TC-E-009, TC-E-010 |
| decimal(24,6) | 十个金额字段的零值、正常正数、18 位整数加 6 位小数 | 负数、分隔符、非数字、整数位越界、小数位越界 | TC-E-012..016 |
| 查询文本 | 六个筛选字段的非空值、空值、组合值 | 匹配、大小写、空白及组合语义未定义 | TC-F-007..013 |
| 分页 | currentPage/pageSize 的正常正整数、首末页、无结果 | 缺失、零值、负值、超大值、末页之后 | TC-E-024..028 |

## 1. 功能测试 (TC-F)

#### TC-F-001 · dev 菜单进入查询页
- **维度**：无领域维度
- **来源**：验收标准 A2 / 业务规则 B1 / 接口契约 I3
- **优先级**：高
- **GIVEN** biz_web 运行在 dev 环境且“业务办理”菜单可见
- **WHEN** 访问“小贷星管理”
- **THEN** 页面地址对应 /slp/xiaodaixing
- **THEN** 页面呈现小贷星项目分页列表、六个筛选项和“导入项目清单”入口

#### TC-F-002 · 台账列完整展示
- **维度**：无领域维度
- **来源**：业务规则 B2 / 接口契约 I6
- **优先级**：高
- **GIVEN** 台账中存在包含全部 36 个业务字段及批次字段的项目
- **WHEN** 查看“小贷星管理”列表
- **THEN** 36 个业务字段均有对应列，两个核销金额和空表头占位列互不覆盖
- **THEN** 列表同时呈现 batch_no 和 import_time

#### TC-F-003 · 导入基准月度清单
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：验收标准 A3 / 业务规则 B3 / 接口契约 I1
- **优先级**：高
- **GIVEN** 小贷星项目清单（20260531）.xlsx 含 66 个业务行
- **WHEN** 通过 POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/importExcel 导入该文件
- **THEN** 导入结果为成功
- **THEN** 66 个业务行全部留存，没有因重复项目号或脏值减少

#### TC-F-004 · 36 列按列序保真映射
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 异常场景 X3 / 接口契约 I6
- **优先级**：高
- **GIVEN** 一个 36 列清单含两个“核销金额”、一个空表头列、日期序列号以及“是否逾期”日期拼接脏值
- **WHEN** 导入该清单
- **THEN** index 0–35 分别进入设计指定字段
- **THEN** write_off_amount、write_off_amount_2、guarantee_way_detail 互不覆盖
- **THEN** 日期序列号和“是否逾期”脏值保持原始文本，导入不报错、不丢行

#### TC-F-005 · 数据日期填充整批
- **维度**：§1 输入边界
- **来源**：验收标准 A3 / 业务规则 B4
- **优先级**：高
- **GIVEN** 一个多行业务清单只有首个非空数据日期为 20260531，其余行业务日期为空
- **WHEN** 导入该清单
- **THEN** 本批全部业务行的 data_date 均为 20260531

#### TC-F-006 · 批次和审计信息一致
- **维度**：§1 输入边界
- **来源**：验收标准 A3 / 业务规则 B4 / 业务规则 B7
- **优先级**：高
- **GIVEN** 一个包含多行业务数据的有效清单和一个已认证操作用户
- **WHEN** 导入该清单
- **THEN** 本批所有业务行拥有同一个非空 UUID batch_no 和同一个 import_time
- **THEN** create_user 对应当前操作用户，审计、租户、逻辑删除和版本字段具备可持久化值

#### TC-F-007 · 按客户名筛选
- **维度**：§1 输入边界
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 列表中存在客户名可区分的项目
- **WHEN** 使用 customer 指定客户名查询
- **THEN** 返回记录符合客户名筛选契约

#### TC-F-008 · 按项目号筛选
- **维度**：§1 输入边界
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 列表中存在项目号可区分的项目
- **WHEN** 使用 projectNo 指定项目号查询
- **THEN** 返回记录符合项目号筛选契约

#### TC-F-009 · 按所属机构筛选
- **维度**：§1 输入边界
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 列表中存在所属机构可区分的项目
- **WHEN** 使用 orgPlatform 指定所属机构查询
- **THEN** 返回记录符合所属机构筛选契约

#### TC-F-010 · 按是否逾期筛选
- **维度**：§1 输入边界
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 列表中存在不同是否逾期原值的项目
- **WHEN** 使用 isOverdue 指定值查询
- **THEN** 返回记录符合是否逾期筛选契约，脏值不会被清洗成另一值

#### TC-F-011 · 按项目评级筛选
- **维度**：§1 输入边界
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 列表中存在不同项目评级的项目
- **WHEN** 使用 projectRating 指定评级查询
- **THEN** 返回记录符合项目评级筛选契约

#### TC-F-012 · 按数据日期筛选
- **维度**：§1 输入边界
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 列表中存在不同 data_date 的导入批次
- **WHEN** 使用 dataDate 指定业务批次日期查询
- **THEN** 返回记录只属于符合筛选契约的数据日期

#### TC-F-013 · 多筛选条件组合
- **维度**：§1 输入边界
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：中
- **GIVEN** 列表中存在分别命中和共同命中多个筛选字段的项目
- **WHEN** 同时指定两个及以上筛选字段
- **THEN** ⟨预期待定 · 源未定义筛选字段的匹配、大小写、空白处理及组合语义
  · 当前实现：customer、projectNo、orgPlatform 使用模糊条件，isOverdue、projectRating、dataDate 使用精确条件，并共同加入查询（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:124-134）——未确认
  · 不得据此写死断言；见待澄清 #6⟩

#### TC-F-014 · 查询排除逻辑删除数据
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：业务规则 B6
- **优先级**：高
- **GIVEN** 台账同时存在 is_deleted=0 和 is_deleted≠0 的项目
- **WHEN** 查询项目列表
- **THEN** 只返回 is_deleted=0 的项目

#### TC-F-015 · 导入成功后立即可查询
- **维度**：D4 缓存读一致性
- **来源**：业务规则 B9
- **优先级**：高
- **GIVEN** 一个尚未导入的有效项目批次
- **WHEN** 导入成功后立即查询该批次
- **THEN** 查询结果可见本次成功导入的全部项目

#### TC-F-016 · prod 菜单接入说明完整
- **维度**：无领域维度
- **来源**：验收标准 A5 / 业务规则 B1
- **优先级**：中
- **GIVEN** 本工作区不具备 qfc-base-auth 的 prod 菜单配置权
- **WHEN** 交付小贷星管理任务
- **THEN** 存在 prod 菜单接入说明
- **THEN** 说明明确父节点“业务办理”、路由 /slp/xiaodaixing、菜单编码和运维配置责任
- **THEN** 本工作区没有声称已直接完成 prod 菜单配置

#### TC-F-017 · DDL 完整承载业务数据
- **维度**：无领域维度
- **来源**：验收标准 A1 / 业务规则 B2 / 业务规则 B7 / 业务规则 B10
- **优先级**：高
- **GIVEN** 小贷星管理增量 DDL
- **WHEN** 核对 tjd_base_xiaodaixing_project 的结构契约
- **THEN** 36 个业务列与设计映射逐一对应
- **THEN** 表包含 id、batch_no、import_time、tenant_id、create_user、create_time、last_modify_user、last_modified、is_deleted、version
- **THEN** 两个核销金额和空表头占位列具有独立列名，金额列为 decimal(24,6)，脏值列为设计指定 varchar

#### TC-F-018 · 后端离线编译且无新增依赖
- **维度**：无领域维度
- **来源**：验收标准 A6 / 业务规则 B6
- **优先级**：高
- **GIVEN** 使用项目规定的 JDK8、Maven 和 settings
- **WHEN** 对 base-service 相关模块进行离线编译验收
- **THEN** 编译通过
- **THEN** 依赖集合没有因小贷星管理新增 Maven 依赖，Excel 导入继续使用既有 EasyExcel 4.0.3

#### TC-F-019 · 查询与导入成功信封
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：接口契约 I1 / 接口契约 I2 / 接口契约 I4
- **优先级**：高
- **GIVEN** 一次有效导入请求和一次有效分页查询
- **WHEN** 两个端点分别成功完成
- **THEN** ⟨预期待定 · 源未定义 HTTP 状态、业务码、成功信封取值以及导入成功计数口径
  · 当前实现：公共信封字段为 success/code/message/data，成功码现为 200；导入 data 现为“导入成功，共处理 N 条”，查询 data 为分页对象（qfc-common-1.0.166.jar::Result；biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:38-58）——未确认
  · 不得据此写死断言；见待澄清 #8⟩

#### TC-F-020 · 页面不暴露非目标能力
- **维度**：无领域维度
- **来源**：业务规则 B8
- **优先级**：中
- **GIVEN** 用户位于“小贷星管理”页面
- **WHEN** 查看可用业务能力
- **THEN** 只提供查询与导入
- **THEN** 不提供单条新增、编辑、删除或导出能力

## 2. 边界测试 (TC-E)

#### TC-E-001 · 最小有效 .xls 文件
- **维度**：§1 输入边界
- **来源**：异常场景 X2 / 接口契约 I1
- **优先级**：高
- **GIVEN** 一个非空、结构有效且含一个业务行的 .xls 文件
- **WHEN** 导入该文件
- **THEN** 文件格式被接受，该业务行进入正常导入流程

#### TC-E-002 · 最小有效 .xlsx 文件
- **维度**：§1 输入边界
- **来源**：异常场景 X2 / 接口契约 I1
- **优先级**：高
- **GIVEN** 一个非空、结构有效且含一个业务行的 .xlsx 文件
- **WHEN** 导入该文件
- **THEN** 文件格式被接受，该业务行进入正常导入流程

#### TC-E-003 · 单行业务清单
- **维度**：§1 输入边界
- **来源**：业务规则 B3 / 业务规则 B4
- **优先级**：中
- **GIVEN** 一个只含一个业务行的有效清单
- **WHEN** 导入该清单
- **THEN** 恰有一个业务行留存，并具备完整批次信息

#### TC-E-004 · 同一文件内项目号重复
- **维度**：D1 幂等/去重/并发
- **来源**：业务规则 B3
- **优先级**：高
- **GIVEN** 同一清单内存在数据日期和项目号相同的多个业务行
- **WHEN** 导入该清单
- **THEN** 重复业务行全部追加留存，不互相覆盖、不去重

#### TC-E-005 · 首行数据日期为空但后续存在非空值
- **维度**：§1 输入边界
- **来源**：业务规则 B4
- **优先级**：高
- **GIVEN** 一个多行清单的首行 data_date 为空，后续首个非空 data_date 为 20260531
- **WHEN** 导入该清单
- **THEN** 整批业务行的 data_date 均为 20260531

#### TC-E-006 · 同批出现多个非空数据日期
- **维度**：§1 输入边界
- **来源**：业务规则 B4
- **优先级**：中
- **GIVEN** 一个清单依次出现两个不同的非空 data_date
- **WHEN** 导入该清单
- **THEN** 整批使用按行序遇到的第一个非空 data_date

#### TC-E-007 · 整批数据日期为空
- **维度**：§1 输入边界
- **来源**：业务规则 B4
- **优先级**：高
- **GIVEN** 一个有效清单的所有业务行 data_date 均为空
- **WHEN** 导入该清单
- **THEN** ⟨预期待定 · 源规定使用上传时间兜底，但未定义保存格式
  · 当前实现：使用 importTime 格式化为 yyyyMMdd（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:251-261）——未确认
  · 不得据此写死断言；见待澄清 #5⟩

#### TC-E-008 · varchar 字段有效长度上界
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 业务规则 B10 / 接口契约 I6
- **优先级**：中
- **GIVEN** 各 varchar 输入字段分别处于其设计长度上界和上界前一字符
- **WHEN** 导入这些业务行
- **THEN** 字段值完整留存，不截断、不串列

#### TC-E-009 · varchar 字段超过长度上界
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 业务规则 B10 / 接口契约 I6
- **优先级**：中
- **GIVEN** 任一 varchar 输入字段比其设计长度上界多一个字符
- **WHEN** 导入该业务行
- **THEN** ⟨预期待定 · 源未定义“原样保真”与 varchar 长度上限冲突时的契约
  · 当前实现：Service 不校验长度，值最终交由数据库处理（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:267-303）——未确认
  · 不得据此写死断言；见待澄清 #3⟩

#### TC-E-010 · 空白单元格与首尾空格
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 接口契约 I6
- **优先级**：中
- **GIVEN** 字符串字段分别为空单元格、全空白文本以及带首尾空格的文本
- **WHEN** 导入这些业务行
- **THEN** ⟨预期待定 · 源未定义空白、空字符串、null 和首尾空格的精确保真语义
  · 当前实现：空白转为 null，非空文本去除首尾空格（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:332-335）——未确认
  · 不得据此写死断言；见待澄清 #3⟩

#### TC-E-011 · 客户与项目号同时为空但其他列有值
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 接口契约 I6
- **优先级**：高
- **GIVEN** 一个业务行的 customer 和 projectNo 同时为空，但其他业务列存在值
- **WHEN** 导入该业务行
- **THEN** ⟨预期待定 · 源要求零丢失但未定义业务数据行的判定条件
  · 当前实现：customer 与 projectNo 同时为空时跳过整行（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:262-265）——未确认
  · 不得据此写死断言；见待澄清 #2⟩

#### TC-E-012 · decimal(24,6) 可表示边界
- **维度**：§1 输入边界
- **来源**：业务规则 B10 / 接口契约 I6
- **优先级**：高
- **GIVEN** 十个金额字段分别取 0、最小正六位小数和 18 位整数加 6 位小数的正数
- **WHEN** 导入这些业务行
- **THEN** 金额以 decimal(24,6) 精确留存，不发生字段错位

#### TC-E-013 · 金额为负数
- **维度**：§1 输入边界
- **来源**：业务规则 B10 / 接口契约 I6
- **优先级**：中
- **GIVEN** 任一金额字段为可由 decimal(24,6) 表示的负数
- **WHEN** 导入该业务行
- **THEN** ⟨预期待定 · 源未定义金额负数的业务契约
  · 当前实现：BigDecimal 接受负数并继续持久化（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:314-329）——未确认
  · 不得据此写死断言；见待澄清 #4⟩

#### TC-E-014 · 金额包含分隔符或空格
- **维度**：§1 输入边界
- **来源**：业务规则 B10 / 接口契约 I6
- **优先级**：中
- **GIVEN** 任一金额字段包含英文逗号、中文逗号、普通空格或不换行空格
- **WHEN** 导入该业务行
- **THEN** ⟨预期待定 · 源未定义金额文本规范化契约
  · 当前实现：删除上述分隔符和空格后再转为 BigDecimal（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:319-325）——未确认
  · 不得据此写死断言；见待澄清 #4⟩

#### TC-E-015 · 金额为非数字文本
- **维度**：§1 输入边界
- **来源**：业务规则 B10 / 接口契约 I6
- **优先级**：高
- **GIVEN** 任一 decimal(24,6) 金额字段为非数字文本
- **WHEN** 导入该业务行
- **THEN** ⟨预期待定 · 源未定义金额解析失败后的数据与导入结果
  · 当前实现：不可解析金额转为 null，导入继续（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:314-329）——未确认
  · 不得据此写死断言；见待澄清 #4⟩

#### TC-E-016 · 金额精度或小数位越界
- **维度**：§1 输入边界
- **来源**：业务规则 B10 / 接口契约 I6
- **优先级**：高
- **GIVEN** 任一金额字段分别超过 18 位整数或超过 6 位小数
- **WHEN** 导入该业务行
- **THEN** ⟨预期待定 · 源未定义 decimal(24,6) 精度和小数位越界后的契约
  · 当前实现：Service 生成 BigDecimal 后交由数据库处理（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:314-329）——未确认
  · 不得据此写死断言；见待澄清 #4⟩

#### TC-E-017 · 有效工作簿只有表头
- **维度**：§1 输入边界
- **来源**：接口契约 I1 / 接口契约 I6
- **优先级**：中
- **GIVEN** 一个格式有效但没有业务行的 36 列工作簿
- **WHEN** 导入该工作簿
- **THEN** ⟨预期待定 · 源未定义只有表头是否属于空文件以及对应结果
  · 当前实现：解析得到空列表并返回成功、处理 0 条（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:143-188）——未确认
  · 不得据此写死断言；见待澄清 #1⟩

#### TC-E-018 · 工作簿缺少业务列
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 接口契约 I6
- **优先级**：高
- **GIVEN** 一个少于 36 个业务列的工作簿
- **WHEN** 导入该工作簿
- **THEN** ⟨预期待定 · 源未定义缺列时的结构校验和数据结果
  · 当前实现：按固定 index 读取，没有显式列数校验（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:143-155）——未确认
  · 不得据此写死断言；见待澄清 #1⟩

#### TC-E-019 · 工作簿多出业务列
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 接口契约 I6
- **优先级**：中
- **GIVEN** 一个多于 36 个业务列的工作簿
- **WHEN** 导入该工作簿
- **THEN** ⟨预期待定 · 源未定义额外列的结构校验和数据结果
  · 当前实现：只映射 index 0–35，没有显式列数校验（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:143-155）——未确认
  · 不得据此写死断言；见待澄清 #1⟩

#### TC-E-020 · 36 列顺序变化
- **维度**：§1 输入边界
- **来源**：业务规则 B2 / 接口契约 I6
- **优先级**：高
- **GIVEN** 一个仍有 36 列但业务列顺序发生变化的工作簿
- **WHEN** 导入该工作簿
- **THEN** ⟨预期待定 · 源规定按 index 映射但未定义列顺序变化时的外部契约
  · 当前实现：继续按 index 0–35 映射，不校验表头与位置的一致性（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:143-155）——未确认
  · 不得据此写死断言；见待澄清 #1⟩

#### TC-E-021 · 大写 Excel 扩展名
- **维度**：§1 输入边界
- **来源**：异常场景 X2 / 接口契约 I1
- **优先级**：中
- **GIVEN** 一个内容有效、扩展名为 .XLS 或 .XLSX 的文件
- **WHEN** 导入该文件
- **THEN** ⟨预期待定 · 源未定义扩展名匹配是否区分大小写
  · 当前实现：前端只声明 xls、xlsx；后端不检查扩展名而直接解析内容（biz_web/src/modules/slp/pages/xiaodaixing/index.jsx:144-152；biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:143-155）——未确认
  · 不得据此写死断言；见待澄清 #1⟩

#### TC-E-022 · 分页首尾边界
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 符合条件的项目数能够形成多个完整页和一个非完整末页
- **WHEN** 分别查询第一页和末页
- **THEN** records 数量符合 pageSize 与剩余记录数
- **THEN** total、current、size 与实际分页状态一致，项目不跨页重复或遗漏

#### TC-E-023 · 筛选结果为空
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：验收标准 A4 / 业务规则 B5 / 接口契约 I2
- **优先级**：中
- **GIVEN** 没有项目符合指定筛选条件
- **WHEN** 查询第一页
- **THEN** 查询成功，records 为空且 total 为 0

#### TC-E-024 · 查询末页之后的页码
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：业务规则 B5 / 接口契约 I2
- **优先级**：中
- **GIVEN** 已知筛选结果的最后一页页码
- **WHEN** currentPage 指定为最后一页之后
- **THEN** ⟨预期待定 · 源未定义超出末页时的分页结果
  · 当前实现：currentPage 直接传给公共分页组件（qfc-common-1.0.166.jar::TableBaseSearchVO、BaseTableServiceImpl）——未确认
  · 不得据此写死断言；见待澄清 #7⟩

#### TC-E-025 · 分页参数缺失
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** 查询请求缺失 currentPage、pageSize 中至少一个字段
- **WHEN** 调用 POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/search
- **THEN** ⟨预期待定 · 源未定义分页参数是否必填及默认值
  · 当前实现：公共分页转换会读取二者的整数值，缺失时可能失败（qfc-common-1.0.166.jar::BaseTableServiceImpl.getQueryPage）——未确认
  · 不得据此写死断言；见待澄清 #7⟩

#### TC-E-026 · 分页参数为零或负数
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：业务规则 B5 / 接口契约 I2
- **优先级**：高
- **GIVEN** currentPage 或 pageSize 为 0 或负整数
- **WHEN** 查询项目列表
- **THEN** ⟨预期待定 · 源未定义非法分页数值的结果
  · 当前实现：业务层不校验，直接交给公共分页组件（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:61-119）——未确认
  · 不得据此写死断言；见待澄清 #7⟩

#### TC-E-027 · pageSize 超大
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：业务规则 B5 / 接口契约 I2
- **优先级**：中
- **GIVEN** pageSize 为远大于通常页面容量的正整数
- **WHEN** 查询项目列表
- **THEN** ⟨预期待定 · 源未定义 pageSize 上限及超限结果
  · 当前实现：业务层未声明或校验 pageSize 上限（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:61-119）——未确认
  · 不得据此写死断言；见待澄清 #7⟩

#### TC-E-028 · 默认排序中的并列记录
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：业务规则 B5 / 接口契约 I2
- **优先级**：中
- **GIVEN** 多条项目的 import_time 相同且结果跨越两个页面
- **WHEN** 不指定排序并连续查询相邻页面
- **THEN** ⟨预期待定 · 源未定义默认排序及并列记录的稳定顺序
  · 当前实现：仅按 import_time 降序，没有声明并列排序键（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:111-114）——未确认
  · 不得据此写死断言；见待澄清 #7⟩

## 3. 错误处理 (TC-ERR)

#### TC-ERR-001 · 缺失 file 字段
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 X1 / 接口契约 I1
- **优先级**：高
- **GIVEN** multipart 导入请求没有 file 字段
- **WHEN** 调用导入端点
- **THEN** 不产生任何小贷星业务数据
- **THEN** ⟨预期待定 · 源未定义缺失 multipart 字段的 HTTP 状态、业务码和错误信封
  · 当前实现：file 是必需的 RequestParam，请求会在进入方法前由框架处理（biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:38-39）——未确认
  · 不得据此写死断言；见待澄清 #8⟩

#### TC-ERR-002 · 零字节文件
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 X1 / 接口契约 I1
- **优先级**：高
- **GIVEN** file 字段存在但文件内容为空
- **WHEN** 调用导入端点
- **THEN** 提示“文件不能为空”，且不产生任何小贷星业务数据
- **THEN** ⟨预期待定 · 源未定义该错误的 HTTP 状态、业务码和信封取值
  · 当前实现：返回公共失败信封，现业务码为 501，message 为“文件不能为空！”（biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:41-44）——未确认
  · 不得据此写死断言；见待澄清 #8⟩

#### TC-ERR-003 · 非 Excel 文件
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 X2 / 接口契约 I1
- **优先级**：高
- **GIVEN** 一个非空且扩展名不是 .xls/.xlsx 的文件
- **WHEN** 尝试导入该文件
- **THEN** 提示“格式不支持”，且不产生任何小贷星业务数据
- **THEN** ⟨预期待定 · 源未定义该错误的 HTTP 状态、业务码和信封取值
  · 当前实现：前端声明只接收 xls/xlsx，后端没有显式扩展名校验（biz_web/src/modules/slp/pages/xiaodaixing/index.jsx:144-152；biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:143-155）——未确认
  · 不得据此写死断言；见待澄清 #8⟩

#### TC-ERR-004 · 扩展名合法但内容损坏
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 X2 / 接口契约 I1
- **优先级**：高
- **GIVEN** 一个扩展名为 .xls 或 .xlsx 但内容无法解析的文件
- **WHEN** 导入该文件
- **THEN** 不产生任何小贷星业务数据
- **THEN** ⟨预期待定 · 源未定义损坏工作簿的提示和响应契约
  · 当前实现：解析异常被 Controller 捕获，message 现为“导入失败：”加异常信息（biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:45-50）——未确认
  · 不得据此写死断言；见待澄清 #1、#8⟩

#### TC-ERR-005 · 无认证凭据访问
- **维度**：D2 鉴权前置
- **来源**：接口契约 I1 / 接口契约 I2 / 接口契约 I5
- **优先级**：高
- **GIVEN** 请求没有认证凭据
- **WHEN** 分别访问导入端点和查询端点
- **THEN** ⟨预期待定 · 源未定义无凭据时两个端点的可观察结果
  · 当前实现：前端通常发送 authorization 等请求头；实际拒绝行为由仓外网关或权限设施决定，本仓无法确认（biz_web/src/api/fetch.ts:48-60,162-174）——未确认
  · 不得据此写死断言；见待澄清 #9⟩

#### TC-ERR-006 · 认证凭据过期
- **维度**：D2 鉴权前置
- **来源**：接口契约 I1 / 接口契约 I2 / 接口契约 I5
- **优先级**：高
- **GIVEN** 请求携带已过期的认证凭据
- **WHEN** 分别访问导入端点和查询端点
- **THEN** ⟨预期待定 · 源未定义凭据过期时两个端点的可观察结果
  · 当前实现：实际拒绝行为由仓外网关或权限设施决定，本仓无法确认——未确认
  · 不得据此写死断言；见待澄清 #9⟩

#### TC-ERR-007 · 已认证但无权限访问
- **维度**：D2 鉴权前置
- **来源**：接口契约 I1 / 接口契约 I2 / 接口契约 I5
- **优先级**：高
- **GIVEN** 请求凭据有效但不具备小贷星查询或导入权限
- **WHEN** 访问相应端点
- **THEN** ⟨预期待定 · 源未定义无权限时的端点结果及是否存在豁免路径
  · 当前实现：本仓端点未声明局部权限规则，实际行为由仓外网关或权限设施决定——未确认
  · 不得据此写死断言；见待澄清 #9⟩

#### TC-ERR-008 · 多行导入中发生部分失败
- **维度**：D3 事务边界/回滚补偿
- **来源**：业务规则 B3 / 接口契约 I1
- **优先级**：高
- **GIVEN** 一个多行业务清单在处理其中一行时发生未被吞掉的转换或持久化失败
- **WHEN** 导入该清单
- **THEN** ⟨预期待定 · 源未定义部分失败后的整批数据状态和响应契约
  · 当前实现：importExcel 标有异常回滚事务（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:142-143）——未确认
  · 不得据此写死断言；见待澄清 #10⟩

## 4. 状态迁移 (TC-ST)

#### TC-ST-001 · 未导入批次变为已留存批次
- **维度**：D3 事务边界/回滚补偿
- **来源**：业务规则 B3 / 业务规则 B4 / 业务规则 B9
- **优先级**：高
- **GIVEN** 某月度批次尚不存在于台账
- **WHEN** 该批次的有效清单导入成功
- **THEN** 台账从无该批次变为存在完整批次
- **THEN** 成功返回时该批次已经能够被查询

#### TC-ST-002 · 重复导入形成新批次
- **维度**：D1 幂等/去重/并发
- **来源**：业务规则 B3 / 业务规则 B4
- **优先级**：高
- **GIVEN** 某清单已经成功导入一次
- **WHEN** 再次导入内容相同的清单
- **THEN** 原批次数据保持不变
- **THEN** 所有业务行再次追加，并拥有与原批次不同的新 batch_no
- **THEN** 总业务行数增加本次清单的业务行数，不按项目号覆盖或去重

#### TC-ST-003 · 非法文件不改变台账状态
- **维度**：D3 事务边界/回滚补偿
- **来源**：异常场景 X1 / 异常场景 X2
- **优先级**：高
- **GIVEN** 台账处于一个已知记录状态
- **WHEN** 导入空文件或非 Excel 文件
- **THEN** 台账业务记录和批次集合保持不变

#### TC-ST-004 · 部分失败后的批次状态
- **维度**：D3 事务边界/回滚补偿
- **来源**：业务规则 B3 / 业务规则 B4 / 接口契约 I1
- **优先级**：高
- **GIVEN** 一个尚不存在的新批次在多行导入过程中发生未被吞掉的失败
- **WHEN** 导入请求结束
- **THEN** ⟨预期待定 · 源未定义失败后该批次是否可见、已处理行和失败行分别处于什么状态
  · 当前实现：importExcel 标有异常回滚事务（biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:142-143）——未确认
  · 不得据此写死断言；见待澄清 #10⟩

## 覆盖矩阵（双向）

| 事实集条目 | 覆盖用例 | 状态 |
|---|---|---|
| 验收标准 A1 | TC-F-017 | ✓ |
| 验收标准 A2 | TC-F-001, TC-F-002 | ✓ |
| 验收标准 A3 | TC-F-003..006, TC-E-005..007 | ✓ |
| 验收标准 A4 | TC-F-007..015, TC-E-022..028 | ✓ |
| 验收标准 A5 | TC-F-016 | ✓ |
| 验收标准 A6 | TC-F-018 | ✓ |
| 业务规则 B1 | TC-F-001, TC-F-016 | ✓ |
| 业务规则 B2 | TC-F-002, TC-F-004, TC-E-008..011, TC-E-018..020 | ✓ |
| 业务规则 B3 | TC-F-003, TC-E-003, TC-E-004, TC-ST-001, TC-ST-002 | ✓ |
| 业务规则 B4 | TC-F-005, TC-F-006, TC-E-003, TC-E-005..007, TC-ST-001, TC-ST-002, TC-ST-004 | ✓ |
| 业务规则 B5 | TC-F-007..013, TC-E-022..028 | ✓ |
| 业务规则 B6 | TC-F-014, TC-F-017, TC-F-018 | ✓ |
| 业务规则 B7 | TC-F-006, TC-F-017 | ✓ |
| 业务规则 B8 | TC-F-016, TC-F-020 | ✓ |
| 业务规则 B9 | TC-F-015, TC-ST-001 | ✓ |
| 业务规则 B10 | TC-F-017, TC-E-008..016 | ✓ |
| 异常场景 X1 | TC-ERR-001, TC-ERR-002, TC-ST-003 | ✓ |
| 异常场景 X2 | TC-E-001, TC-E-002, TC-E-021, TC-ERR-003, TC-ERR-004, TC-ST-003 | ✓ |
| 异常场景 X3 | TC-F-003, TC-F-004 | ✓ |
| 接口契约 I1 | TC-F-003, TC-F-019, TC-E-001, TC-E-002, TC-E-017..021, TC-ERR-001..008, TC-ST-004 | ✓ |
| 接口契约 I2 | TC-F-007..013, TC-F-019, TC-E-022..028, TC-ERR-005..007 | ✓ |
| 接口契约 I3 | TC-F-001 | ✓ |
| 接口契约 I4 | TC-F-019, TC-E-022..028, TC-ERR-001..004 | ✓ |
| 接口契约 I5 | TC-ERR-005..007 | ✓ |
| 接口契约 I6 | TC-F-002, TC-F-004, TC-E-008..020 | ✓ |

> 正向：每条事实至少由一条用例覆盖。  
> 反向：每条用例至少回指一条事实集来源；预期待定用例的来源回指其场景依据。

## 维度扫描表

| 维度 | 覆盖用例 | 状态 |
|---|---|---|
| D1 幂等/去重/并发 | TC-E-004, TC-ST-002 | ✓ 已覆盖 · 重复行和重复请求均按“只追加、不去重”验证；并发上限半边 N/A · 事实集未提及并发上限，按 §3 不生成 |
| D2 鉴权前置 | TC-ERR-005..007 | ◐ 场景已覆盖·预期待澄清 · 缺口见待澄清 #9 |
| D3 事务边界/回滚补偿 | TC-F-005, TC-ERR-008, TC-ST-001, TC-ST-003, TC-ST-004 | ◐ 场景已覆盖·预期待澄清 · 正常和输入拒绝状态已覆盖，部分失败缺口见待澄清 #10 |
| D4 缓存读一致性 | TC-F-015 | ✓ 已覆盖 · 业务规则 B9 明确查询直读表且无缓存，验证导入成功后立即可见 |
| D5 错误响应契约 + 成功信封 | TC-F-003, TC-F-006, TC-F-014, TC-F-019, TC-E-022..028, TC-ERR-001..004 | ◐ 场景已覆盖·预期待澄清 · 字段坐标已填，响应值与分页边界缺口见待澄清 #7、#8 |
| D6 异步最终一致 | — | N/A · 业务规则 B9 明确导入同步完成数据库写入，且没有异步下游 |
| 限流/防刷 | — | N/A · 事实集未提及，按 §3 不生成 |
| 多租户数据隔离 | — | N/A · 事实集虽要求 tenant_id 列，但未定义租户隔离行为，按 §3 不生成也不问 |
| 版本/向后兼容 | — | N/A · 事实集未提及，按 §3 不生成 |
| 纯前端、文档、DDL、构建 | TC-F-001, TC-F-002, TC-F-016..018, TC-F-020 | 无领域维度 · 当前没有前端 E2E 维度表，未套用后端 D1–D6 |

## 待澄清

以下条目已在 Step 6 批量询问，用户答复“暂不定，原样写入”，因此全部保持未确认：

1. Excel 扩展名大小写、损坏文件、只有表头、缺列、多列、列重排时的契约。当前实现只在前端声明 xls/xlsx，后端直接按 index 读取，没有显式结构校验。
2. 业务数据行的判定条件。当前实现会跳过 customer 与 projectNo 同时为空的行，即使其他列有值。
3. 空白单元格、null、空字符串、首尾空格和 varchar 超长值的保真契约。当前实现将空白转 null、去除首尾空格，超长值交给数据库。
4. 金额负数、分隔符、非数字、整数位越界和小数位越界的契约。当前实现删除中英文逗号与空格，不可解析时写 null，精度越界交给数据库。
5. 全批 data_date 为空时上传时间的保存格式。当前实现为 yyyyMMdd。
6. 六个筛选字段的匹配、大小写、空白处理和多条件组合语义。当前实现为三项模糊、三项精确并共同加入查询。
7. currentPage/pageSize 的必填性、默认值、合法范围、超出末页、pageSize 上限，以及默认排序和并列排序规则。当前实现缺少业务层校验，只设 import_time 降序。
8. 导入和查询的 HTTP 状态、业务码、成功/错误信封取值、错误提示以及导入成功计数口径。当前公共信封字段为 success/code/message/data，现成功码 200、普通失败码 501。
9. 无凭据、凭据过期、有效凭据无权限时的响应及端点豁免。当前行为依赖仓外网关或权限设施，本仓无法确认。
10. 多行导入部分失败后的数据状态和响应契约。当前实现标有异常回滚事务。

## 出口自检

- **门 A · 无源门**：通过。四个分区共 60 条用例，每条均回指本文件事实集；预期待定用例均有场景来源。
- **门 B · 执行泄漏门**：通过。用例只有 GIVEN / WHEN / THEN；GIVEN 为状态事实，WHEN 为被测意图，THEN 为可观察结果或带禁令的预期待定，没有测试框架、数据构造手段或断言写法。
- **门 C · 维度覆盖门**：通过。D1–D6 均已逐条交代；D2、D3、D5 的场景已写且预期待澄清；D6 由业务规则 B9 形成可核 N/A；D1 并发半边及 §3 元规则维度按“事实集未提及”处理。

# 测试用例规范 — 小贷星管理（xiaodaixing-mgmt）

## 概览

- 输入来源：
  - `/Users/lilongjian/Projects/GMZB/slp/docs/recon-driven-dev/_archived/2026-06-26-xiaodaixing-mgmt/requirements.md`
  - `/Users/lilongjian/Projects/GMZB/slp/docs/recon-driven-dev/_archived/2026-06-26-xiaodaixing-mgmt/design.md`
- 任务形态：后端接口 + 前端页面/菜单混合任务。后端按 `references/backend-api.md` 的 §1、D1–D6 点名扫描；纯前端用例标注“无领域维度”，因为当前 skill 没有前端 E2E 维度表。
- 本文只规定“测什么”，未执行任何测试，也未编译或运行任何代码。
- 待测事实集是下列四类编号条目；后续用例的“来源”只回指这里，代码出处只补充结构坐标或当前实现。

### 待测事实集

#### 验收标准

- **验收标准 #1**：增量 DDL 建立 `tjd_base_xiaodaixing_project`，包含 Excel 的 36 个业务列、批次列以及主键、审计、租户、逻辑删除、版本列。
- **验收标准 #2**：biz_web dev 环境“业务办理”下出现“小贷星管理”，进入后是查询页。
- **验收标准 #3**：上传指定 `小贷星项目清单（20260531）.xlsx` 后 66 行全部入库；脏值保真；全批 `data_date=20260531` 且使用同一个 `batch_no`。
- **验收标准 #4**：列表分页可用，客户名、项目号、所属机构、是否逾期、项目评级、数据日期等常用筛选可查。
- **验收标准 #5**：交付 prod 菜单接入说明，写明父节点“业务办理”、路由 `/slp/xiaodaixing`、编码及运维配置方式。
- **验收标准 #6**：后端可离线编译通过且不新增 Maven 依赖。

#### 业务规则

- **业务规则 §R1**：dev 菜单由前端 mock 提供；prod 菜单权威在仓外 `qfc-base-auth`，本工作区只交付接入说明，不直接配置 prod 菜单。
- **业务规则 §R2**：表结构尽量与 Excel 1:1 保真，共 36 列；不清洗、零丢失；两个“核销金额”分别保存；空表头列用占位字段保存；`是否逾期`、日期序列号、比例等指定脏值按字符串原样保存。
- **业务规则 §R3**：每次导入只追加、不按项目号去重；Excel “数据日期”是业务批次键，首行值向整批 fill-down；每次上传生成一个 UUID `batch_no`，并记录 `import_time`。
- **业务规则 §R4**：查询必须分页，筛选字段至少包含 `customer`、`projectNo`、`orgPlatform`、`isOverdue`、`projectRating`、`dataDate`。
- **业务规则 §R5**：后端落在 `base-service`、表名以 `tjd_` 开头、复用 EasyExcel 4.0.3 且零新增依赖；前端复用 QmTable/QmForm/QmUploadFile 范式。
- **业务规则 §R6**：本次只提供查询和导入；不提供单条新增、编辑、删除、导出，也不做清洗、纠错或去重。
- **业务规则 §R7**：整批“数据日期”都为空时，用上传时间对应日期兜底。
- **业务规则 §R8**：导入设计为请求内解析、转换并批量写表；查询直接读取该表、显式过滤 `is_deleted=0`，没有缓存或异步下游步骤。

#### 异常场景

- **异常场景 #1**：上传空文件应提示“文件不能为空”，不入库。
- **异常场景 #2**：上传非 `.xls/.xlsx` 文件应提示“格式不支持”，不入库。
- **异常场景 #3**：重复列名、空表头列、`是否逾期` 日期拼接脏值不得导致报错或丢行，并须原样保真。
- **异常场景 #4**：同一月重复导入相同清单会产生重复行；这是“只追加”的已知代价，以 `batch_no` 区分。

#### 接口契约

- **接口契约 #1**：导入意图为 `POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/importExcel`，multipart 字段为文件，返回 `Result`；同步完成 Excel 解析、36 列映射、批次/审计填充和批量保存。
- **接口契约 #2**：设计文档把分页意图写为 `POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/page`，请求为 `SearchVO`，返回分页结果；路径属于结构坐标，Step 5 以代码读到的实际坐标为准。
- **接口契约 #3**：前端路由为 `/slp/xiaodaixing`；上传仅选择一个 `xls/xlsx` 文件并携带 `getConfigHeaders()`；成功后刷新列表。
- **接口契约 #4**：Excel 索引 0..35 对应：数据日期、所属机构/平台、业务部门、客户经理、中心、产品名称、客户、实际客户、客户证件号码、企查查行业、项目号、是否分次放款、合同金额、放款金额、本月还款、累计还款、核销金额①、贷款余额、是否逾期、本金逾期起始日、利息逾期起始日、逾期利息、逾期期数的本金合计、项目评级、准备金计提比例、期末准备金计提金额、年初准备金计提金额、在借报表列示科目、核销日、净值、核销金额②、合同到期日、展期、担保方式、空表头占位列、放款通知书号。
- **接口契约 #5**：10 个明确金额字段使用 `decimal(24,6)`：合同金额、放款金额、本月还款、累计还款、贷款余额、逾期利息、逾期期数本金合计、期末准备金、年初准备金、净值；其余业务字段按设计表使用可空 `varchar(8/16/32/64/128)`。
- **接口契约 #6**：成功响应采用 `Result` 包裹；分页数据采用 `QmPage`，前端从 `data.records` 取列表。文档未定义完整 HTTP 状态码、业务码、错误体字段和分页元数据字段。

### Step 5 定向查证结果

| 空位 | 查证结果 | 处置 |
|---|---|---|
| 实际分页端点 | 实现为 `POST /xiaodaixing/tjdBaseXiaodaixingProject/search`（`biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:56`） | 路径是结构坐标，所有用例填 `/search`；不当作业务冲突 |
| 导入文件字段 | `@RequestParam("file")`（同上 `:38-39`） | 结构空位已填 |
| 查询字段与匹配 | customer/projectNo/orgPlatform 用 LIKE；isOverdue/projectRating/dataDate 用 EQ；条件同时加入（`biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:124-134`） | 源未定义匹配/组合语义，列歧义点 |
| 默认排序 | 未传排序时 `import_time desc`（同上 `:111-114`） | 源未定义，列歧义点 |
| 成功信封 | 前端按 `{code,data,message}` 处理，成功码按 200 分支；分页列表坐标 `data.records`（`biz_web/src/modules/slp/pages/xiaodaixing/index.jsx:85-100,138-142`） | 当前结构已填；完整分页元数据与失败业务码未查得 |
| 空 multipart | 返回失败结果，消息“文件不能为空！”（Controller `:42-44`） | 与文档语义一致；失败 HTTP/业务码仍待定 |
| 仅表头/零数据行 | 转换结果为空，导入仍返回“导入成功，共处理 0 条”（Service `:247-250`；Controller `:45-46`） | 源沉默，列歧义点 |
| 非 Excel | 前端仅声明 `fileTypes=['xls','xlsx']`（页面 `:144-152`）；后端异常统一返回“导入失败：<异常>”（Controller `:47-49`） | 后端没有文档指定的“格式不支持”契约，列冲突 |
| 重复导入/同键行 | 文件内按 dataDate+projectNo 保留最后一行；数据库同键更新，只有未命中才新增（Service `:162-178,194-209`；`biz/base-service/base-service-domain/src/main/resources/mybatis/mapper/TjdBaseXiaodaixingProjectMapper.xml:5-50`） | 与“只追加、不去重”相冲突 |
| 数据日期兜底 | 取首个非空日期；整批为空时用 importTime 的 `yyyyMMdd`（Service `:251-261`） | 与文档一致 |
| 空主体行 | customer 与 projectNo 同时为空时跳过（Service `:262-266`） | 与“零丢失”相冲突 |
| 字符串保真 | 除 dataDate 外的字符串统一空白转 null、非空 trim（Service `:269-303,332-335`） | 与“不清洗、原样保真”相冲突 |
| 金额异常 | 空白或不可解析金额置 null；中英文逗号、普通/不换行空格会被去掉再解析（Service `:314-329`） | 源未定义明确金额脏值的处理，列歧义点 |
| 批量部分失败 | 导入方法使用 `@Transactional(rollbackFor=Exception.class)`（Service `:142-143`） | 源未定义，列歧义点 |
| 鉴权三类失败 | 页面携带配置头（页面 `:144-149`），但定向读取的 Controller 无端点级鉴权声明，网关/共享鉴权实现不在本次读到的文件内 | 三类预期均保持待定 |
| 页码字段/边界 | `TableBaseSearchVO/QmPage/Result` 来自仓库内不可见的共享依赖；本任务代码未自行校验分页边界 | 完整坐标与结果保持待定 |

## 输入契约边界扫描（§1）

| 输入字段/字段组 | 有效类与边界 | 无效类（每种原因单列） | 覆盖用例 |
|---|---|---|---|
| multipart `file` | 非空 `.xls`；非空 `.xlsx`；1 行；指定 66 行；首个非空/全空数据日期 | 字段缺失；0 字节；扩展名不支持；扩展名合法但内容损坏；仅表头 0 数据行 | TC-F-004, TC-F-005, TC-F-007, TC-F-008, TC-E-001, TC-E-002, TC-ERR-001..004 |
| Excel 列集合 | 固定索引 0..35；重复表头和空表头仍按索引映射 | 主体字段同时空白；同一文件组合键重复；字符串前后空白 | TC-F-006, TC-E-007..009 |
| 10 个 `decimal(24,6)` 字段 | 空值；0；整数；负数（业务未禁止）；6 位小数；18 位整数 + 6 位小数的表示边界；含分组符数字 | 非数字；7 位小数；19 位整数；类型错误 | TC-E-003, TC-E-004 |
| `varchar(8)` | 0、1、7、8 字符 | 9 字符 | TC-E-005 |
| `varchar(16)` | 0、1、15、16 字符；样例日期 `20260531` | 17 字符；格式错误（文档未定义日期格式校验） | TC-E-005 |
| `varchar(32)` | 0、1、31、32 字符 | 33 字符 | TC-E-005 |
| `varchar(64)` | 0、1、63、64 字符 | 65 字符 | TC-E-005 |
| `varchar(128)` | 0、1、127、128 字符 | 129 字符 | TC-E-005 |
| 六个查询筛选字段 | 未传；空串；普通值；可命中值；不可命中值；多个条件组合 | 超出对应列长度；非字符串类型 | TC-F-009, TC-F-010, TC-E-006, TC-E-010 |
| 继承分页字段 | 未传；首页；中间页；末页；末页后一页；页大小 1；正常页大小 | 页码 0；负页码；页大小 0；负页大小；超大页大小；类型错误 | TC-E-011 |

> 分组用例要求对组内**每个字段**应用相同等价类，而不是只抽一个代表字段。对于源和可见代码都没定义的上溢、分页或类型错误结果，THEN 保持待定，未猜测数据库模式或共享库行为。

## 1. 功能测试 (TC-F)

#### TC-F-001 · 建立台账表契约
- **维度**：§1 输入边界
- **来源**：验收标准 #1／业务规则 §R2／业务规则 §R5／接口契约 #4／接口契约 #5
- **优先级**：高
- **GIVEN** 目标环境尚无小贷星项目台账表
- **WHEN** 应用本次小贷星增量 DDL
- **THEN** 存在 `tjd_base_xiaodaixing_project`，36 个业务列的次序、名称与类型符合接口契约 #4、#5
- **THEN** 存在 `batch_no`、`import_time`、主键、审计、租户、逻辑删除和版本列，且项目号没有唯一约束

#### TC-F-002 · dev 菜单进入查询页
- **维度**：无领域维度（纯前端）
- **来源**：验收标准 #2／业务规则 §R1／接口契约 #3
- **优先级**：高
- **GIVEN** biz_web 使用 dev 菜单 mock
- **WHEN** 运营人员从“业务办理”进入“小贷星管理”
- **THEN** 菜单可见，`/slp/xiaodaixing` 呈现小贷星分页查询页

#### TC-F-003 · prod 菜单接入说明完整
- **维度**：无领域维度（前端/运维协同）
- **来源**：验收标准 #5／业务规则 §R1／接口契约 #3
- **优先级**：高
- **GIVEN** prod 菜单由仓外 `qfc-base-auth` 管理
- **WHEN** 运维依据本次接入说明配置小贷星菜单
- **THEN** 说明明确父节点“业务办理”、名称/编码、工程名 `slp`、层级、角色授权与相对路由 `/slp/xiaodaixing`
- **THEN** 获授权账号可由 prod 侧栏进入查询页；本工作区没有直接改写 prod 菜单

#### TC-F-004 · 导入指定 66 行月度清单
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：验收标准 #3／业务规则 §R2／业务规则 §R3／异常场景 #3／接口契约 #1
- **优先级**：高
- **GIVEN** 指定的 20260531 月度清单包含 66 条业务行及已知脏值
- **WHEN** 向 `POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/importExcel` 提交该清单
- **THEN** 66 条业务行均可由新批次查询到，指定脏值没有导致失败或丢行
- **THEN** 全部记录的 `dataDate` 为 `20260531`，`batchNo` 相同且 `importTime`、创建人、逻辑删除初值已记录

#### TC-F-005 · 两种 Excel 格式均可导入
- **维度**：§1 输入边界
- **来源**：异常场景 #2／接口契约 #1／接口契约 #3
- **优先级**：中
- **GIVEN** 内容合法且业务行等价的 `.xls` 与 `.xlsx` 清单
- **WHEN** 分别导入两份清单
- **THEN** 两种格式均被接受，业务行按各自上传批次保存

#### TC-F-006 · 36 列按索引完整映射
- **维度**：§1 输入边界
- **来源**：业务规则 §R2／异常场景 #3／接口契约 #4／接口契约 #5
- **优先级**：高
- **GIVEN** 一条 36 列均使用可区分值的清单记录，其中两个“核销金额”不同、空表头列有值、指定脏值列含原始文本
- **WHEN** 导入该记录并查询结果
- **THEN** 索引 0..35 的每个值都出现在其约定字段，两个“核销金额”不互相覆盖，空表头值位于 `guaranteeWayDetail`
- **THEN** `isOverdue`、两个逾期起始日、`reserveRatio`、两个核销金额及其他设计为字符串的脏值保持原值

#### TC-F-007 · 数据日期 fill-down 与批次元数据
- **维度**：D3 事务边界/回滚补偿
- **来源**：验收标准 #3／业务规则 §R3／接口契约 #1
- **优先级**：高
- **GIVEN** 同一清单首个有值的数据日期为 `20260531`，其余业务行的数据日期为空
- **WHEN** 导入该清单
- **THEN** 所有导入行的 `dataDate` 均为 `20260531`
- **THEN** 同次上传的 `batchNo` 相同，不同上传的 `batchNo` 不同，并记录各自导入时间

#### TC-F-008 · 整批数据日期缺失时兜底
- **维度**：§1 输入边界
- **来源**：业务规则 §R7／接口契约 #1
- **优先级**：中
- **GIVEN** 合法清单的所有业务行都没有数据日期
- **WHEN** 导入该清单
- **THEN** 整批 `dataDate` 为本次上传时间对应的 `yyyyMMdd` 日期，批内保持一致

#### TC-F-009 · 无筛选分页查询
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：验收标准 #4／业务规则 §R4／业务规则 §R8／接口契约 #2／接口契约 #6／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:111-118`
- **优先级**：高
- **GIVEN** 台账存在跨多个批次的未删除记录，也存在逻辑删除记录
- **WHEN** 不指定业务筛选调用 `POST /api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/search`
- **THEN** 返回分页结果，`data.records` 只含 `isDeleted=0` 的记录
- **THEN** 未显式排序时按 `importTime` 降序
  ⚠️ **歧义点 歧-1**：源定义了分页和逻辑删除过滤，但未定义默认排序；此排序取自当前实现
  （`TjdBaseXiaodaixingProjectService.java:111-114`），**非产品契约**——它不会发现此处的缺陷，
  实现改了才会红。须人工审查确认。

#### TC-F-010 · 六类常用筛选分别生效
- **维度**：§1 输入边界
- **来源**：验收标准 #4／业务规则 §R4／接口契约 #2／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:124-134`
- **优先级**：高
- **GIVEN** 台账中有可区分筛选结果的未删除记录
- **WHEN** 分别指定 `customer`、`projectNo`、`orgPlatform`、`isOverdue`、`projectRating`、`dataDate` 查询
- **THEN** 前三项按包含匹配，后三项按精确匹配，只返回匹配记录
  ⚠️ **歧义点 歧-2**：源只定义这些字段“可查”，未定义模糊/精确匹配语义；此预期取自当前实现
  （`TjdBaseXiaodaixingProjectService.java:128-133`），**非产品契约**——它不会发现此处的缺陷，
  实现改了才会红。须人工审查确认。

#### TC-F-011 · 多筛选条件组合
- **维度**：§1 输入边界
- **来源**：业务规则 §R4／接口契约 #2／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:124-134`
- **优先级**：中
- **GIVEN** 台账中分别存在满足全部条件和只满足部分条件的未删除记录
- **WHEN** 同时指定两个及以上常用筛选条件
- **THEN** 仅返回同时满足全部条件的记录
  ⚠️ **歧义点 歧-3**：源未定义多条件组合语义；AND 取交预期取自当前实现
  （`TjdBaseXiaodaixingProjectService.java:124-134`），**非产品契约**——它不会发现此处的缺陷，
  实现改了才会红。须人工审查确认。

#### TC-F-012 · 导入成功信封
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：验收标准 #3／接口契约 #1／接口契约 #6／代码 `biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:45-46`
- **优先级**：中
- **GIVEN** 一份可成功导入且最终处理 N 条的合法清单
- **WHEN** 调用导入接口
- **THEN** 当前响应的 `code` 为 200，`data` 为“导入成功，共处理 N 条”
  ⚠️ **歧义点 歧-4**：源未定义成功业务码、消息内容及其位于 `data` 还是 `message`；此预期取自当前 Controller 与前端处理
  （`TjdBaseXiaodaixingProjectController.java:45-46`、`biz_web/src/modules/slp/pages/xiaodaixing/index.jsx:90-95`），
  **非产品契约**——它不会发现此处的缺陷，实现改了才会红。须人工审查确认。

#### TC-F-013 · 离线构建与依赖边界
- **维度**：无领域维度（构建验收）
- **来源**：验收标准 #6／业务规则 §R5
- **优先级**：中
- **GIVEN** 使用项目既有离线依赖环境
- **WHEN** 对包含本功能的后端模块执行约定的离线构建
- **THEN** 构建成功，且本功能没有新增 Maven 依赖

#### TC-F-014 · 功能暴露面仅查询与导入
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：业务规则 §R6
- **优先级**：中
- **GIVEN** 小贷星管理功能已部署
- **WHEN** 运营人员使用页面与对外接口暴露面
- **THEN** 只提供分页查询和 Excel 导入，不提供单条新增、编辑、删除或导出能力

## 2. 边界测试 (TC-E)

#### TC-E-001 · 单行清单
- **维度**：§1 输入边界
- **来源**：业务规则 §R3／接口契约 #1
- **优先级**：中
- **GIVEN** 合法清单只包含一条主体业务行
- **WHEN** 导入该清单
- **THEN** 该行形成一个批次并可被查询到，没有因低于月度样例行数而被忽略

#### TC-E-002 · 仅表头、零数据行
- **维度**：§1 输入边界
- **来源**：异常场景 #1／接口契约 #1／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:247-250`
- **优先级**：中
- **GIVEN** 文件本身非 0 字节且格式合法，但只有表头、没有业务行
- **WHEN** 调用导入接口
- **THEN** 当前实现返回成功，处理数为 0，且不产生记录
  ⚠️ **歧义点 歧-5**：源只定义“空文件”失败，未定义“合法工作簿但零数据行”；成功 0 条取自当前实现
  （`TjdBaseXiaodaixingProjectService.java:247-250`、`TjdBaseXiaodaixingProjectController.java:45-46`），
  **非产品契约**——它不会发现此处的缺陷，实现改了才会红。须人工审查确认。

#### TC-E-003 · 金额字段空白、非数字与分组符
- **维度**：§1 输入边界
- **来源**：业务规则 §R2／接口契约 #5／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:314-329`
- **优先级**：中
- **GIVEN** 对 10 个金额字段分别覆盖空值、纯空白、不可解析文本、英文逗号、中文逗号、普通空格与不换行空格
- **WHEN** 导入这些记录
- **THEN** 当前实现把空白和不可解析文本保存为 null，去除四类分组符后保存可解析数值，其他列继续处理
  ⚠️ **歧义点 歧-6**：源只规定明确金额列落 `decimal(24,6)`，未定义金额脏值、空白和分组符的处理；此预期取自当前实现
  （`TjdBaseXiaodaixingProjectService.java:314-329`），**非产品契约**——它不会发现此处的缺陷，
  实现错了也不会红。须人工审查确认。

#### TC-E-004 · decimal(24,6) 表示边界
- **维度**：§1 输入边界
- **来源**：接口契约 #5
- **优先级**：中
- **GIVEN** 对每个明确金额字段分别使用 0、正负代表值、6 位小数、18 位整数加 6 位小数的边界值及其两侧值
- **WHEN** 导入这些金额
- **THEN** 边界内数值按 `decimal(24,6)` 保存
- **THEN** ⟨预期待定 · 源未定义 7 位小数或 19 位整数的拒绝/舍入/截断结果 · 现状未查得（最终行为依赖本次未读到的数据库 SQL mode）
  · 不得据此写死断言；见待澄清 澄-5⟩

#### TC-E-005 · varchar 长度边界
- **维度**：§1 输入边界
- **来源**：业务规则 §R2／接口契约 #5
- **优先级**：中
- **GIVEN** 对每个 varchar 业务字段分别使用空值、1 字符、最大长度前 1、最大长度，以及最大长度后 1 的值
- **WHEN** 导入这些记录
- **THEN** 不超过字段设计长度的非空值完整保存
- **THEN** ⟨预期待定 · 源未定义超出 varchar(8/16/32/64/128) 的拒绝或截断结果 · 现状未查得（最终行为依赖本次未读到的数据库 SQL mode）
  · 不得据此写死断言；见待澄清 澄-5⟩

#### TC-E-006 · 空筛选与无命中筛选
- **维度**：§1 输入边界
- **来源**：验收标准 #4／业务规则 §R4／业务规则 §R8／接口契约 #2
- **优先级**：中
- **GIVEN** 台账存在未删除记录
- **WHEN** 六个业务筛选全部未传、传空值，或传入无任何命中的合法值
- **THEN** 未传或空值时按无该筛选处理；合法但无命中值时返回空的 `records`，而不是错误

#### TC-E-007 · 重复导入同一清单
- **维度**：D1 幂等/去重/并发
- **来源**：业务规则 §R3／异常场景 #4／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:162-178`
- **优先级**：高
- **GIVEN** 一份清单已成功导入，记录具有非空数据日期和项目号
- **WHEN** 再次导入同一份清单
- **THEN** ⟨预期未定 · 冲突未裁定
  · 源：第二次导入只追加，产生新行和新 batchNo，旧批次记录保留（业务规则 §R3／异常场景 #4）
  · 实现：按 dataDate+projectNo 更新全部历史匹配记录，仅未命中才新增（`TjdBaseXiaodaixingProjectService.java:162-178`、`TjdBaseXiaodaixingProjectMapper.xml:5-50`）
  · 不得选定任一侧写死断言；见待澄清 澄-1⟩

#### TC-E-008 · 同一文件包含相同数据日期和项目号
- **维度**：D1 幂等/去重/并发
- **来源**：业务规则 §R3／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:194-209`
- **优先级**：高
- **GIVEN** 同一清单存在两条数据日期和项目号相同、其他字段不同的业务行
- **WHEN** 导入该清单
- **THEN** ⟨预期未定 · 冲突未裁定
  · 源：导入不按项目号去重且零丢失，两条业务行都应追加（业务规则 §R2／业务规则 §R3）
  · 实现：文件内同组合键只保留最后一条（`TjdBaseXiaodaixingProjectService.java:194-209`）
  · 不得选定任一侧写死断言；见待澄清 澄-1⟩

#### TC-E-009 · 客户与项目号同时为空的主体行
- **维度**：§1 输入边界
- **来源**：业务规则 §R2／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:262-266`
- **优先级**：高
- **GIVEN** 清单中一条业务行的客户和项目号同时为空，但其他业务列有值
- **WHEN** 导入该清单
- **THEN** ⟨预期未定 · 冲突未裁定
  · 源：36 列不清洗、零丢失，没有声明客户或项目号为必填（业务规则 §R2）
  · 实现：客户和项目号同时为空的行被跳过（`TjdBaseXiaodaixingProjectService.java:262-266`）
  · 不得选定任一侧写死断言；见待澄清 澄-4⟩

#### TC-E-010 · 字符串前后空白保真
- **维度**：§1 输入边界
- **来源**：业务规则 §R2／接口契约 #4／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:269-303`
- **优先级**：高
- **GIVEN** 设计为字符串保存的业务值含前导或尾随空白，且空白是原始单元格内容的一部分
- **WHEN** 导入并查询该值
- **THEN** ⟨预期未定 · 冲突未裁定
  · 源：不清洗并原样保真（业务规则 §R2）
  · 实现：字符串统一 trim，纯空白转 null（`TjdBaseXiaodaixingProjectService.java:269-303,332-335`）
  · 不得选定任一侧写死断言；见待澄清 澄-3⟩

#### TC-E-011 · 分页参数边界
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：验收标准 #4／业务规则 §R4／接口契约 #2／接口契约 #6
- **优先级**：高
- **GIVEN** 未删除记录数足以形成首页、中间页、末页和末页后一页
- **WHEN** 分别使用缺省分页参数、页大小 1、正常页大小、页码 0/负数、页大小 0/负数、超大页大小及错误类型查询
- **THEN** ⟨预期待定 · 源未定义分页字段名、默认值、上下限及非法参数响应 · 现状未查得（TableBaseSearchVO/QmPage 位于本次可见源码之外的共享依赖）
  · 不得据此写死断言；见待澄清 澄-6⟩

## 3. 错误处理 (TC-ERR)

#### TC-ERR-001 · 缺少 multipart 文件字段
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 #1／接口契约 #1
- **优先级**：高
- **GIVEN** 导入请求没有名为 `file` 的 multipart 字段
- **WHEN** 调用导入接口
- **THEN** ⟨预期待定 · 源未区分“字段缺失”与“字段存在但为空”的响应 · 现状未查得（Spring 参数绑定失败发生在方法体之前）
  · 不得据此写死断言；见待澄清 澄-7⟩
- **THEN** 不产生小贷星记录

#### TC-ERR-002 · 0 字节文件
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 #1／接口契约 #1／代码 `biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:42-44`
- **优先级**：高
- **GIVEN** multipart `file` 存在但内容为 0 字节
- **WHEN** 调用导入接口
- **THEN** 返回失败结果并提示“文件不能为空”，不产生记录
- **THEN** ⟨预期待定 · 源和可见代码均未给出该失败的 HTTP 状态码、业务错误码与完整错误信封 · 现状未查得（Result 来自本次可见源码之外的共享依赖）
  · 不得据此写死断言；见待澄清 澄-8⟩

#### TC-ERR-003 · 非 Excel 扩展名
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 #2／接口契约 #1／代码 `biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:47-49`
- **优先级**：高
- **GIVEN** 文件内容或扩展名不属于 `.xls/.xlsx`
- **WHEN** 直接调用后端导入接口
- **THEN** ⟨预期未定 · 冲突未裁定
  · 源：提示“格式不支持”且不入库（异常场景 #2）
  · 实现：Controller 未识别扩展名，解析异常被统一转换为“导入失败：<异常>”（`TjdBaseXiaodaixingProjectController.java:47-49`）
  · 不得选定任一侧写死断言；见待澄清 澄-2⟩
- **THEN** 不产生记录

#### TC-ERR-004 · 扩展名合法但内容损坏
- **维度**：D5 错误响应契约 + 成功信封
- **来源**：异常场景 #2／接口契约 #1／代码 `biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:47-49`
- **优先级**：高
- **GIVEN** 文件扩展名为 `.xls` 或 `.xlsx`，但内容不是可解析的 Excel 工作簿
- **WHEN** 调用导入接口
- **THEN** ⟨预期未定 · 冲突未裁定
  · 源：非受支持格式应提示“格式不支持”且不入库（异常场景 #2）
  · 实现：解析异常统一转换为“导入失败：<异常>”（`TjdBaseXiaodaixingProjectController.java:47-49`）
  · 不得选定任一侧写死断言；见待澄清 澄-2⟩
- **THEN** 不产生记录

#### TC-ERR-005 · 无凭据访问
- **维度**：D2 鉴权前置
- **来源**：接口契约 #3
- **优先级**：高
- **GIVEN** 请求不携带配置凭据
- **WHEN** 调用查询或导入端点
- **THEN** ⟨预期待定 · 源只要求前端携带 getConfigHeaders，未定义无凭据响应 · 现状未查得（端点 Controller 无鉴权声明，网关/共享鉴权实现不在本次读到的文件内）
  · 不得据此写死断言；见待澄清 澄-9⟩

#### TC-ERR-006 · 过期凭据访问
- **维度**：D2 鉴权前置
- **来源**：接口契约 #3
- **优先级**：高
- **GIVEN** 请求携带已过期凭据
- **WHEN** 调用查询或导入端点
- **THEN** ⟨预期待定 · 源未定义过期凭据响应 · 现状未查得（网关/共享鉴权实现不在本次读到的文件内）
  · 不得据此写死断言；见待澄清 澄-9⟩

#### TC-ERR-007 · 有效凭据但无权限
- **维度**：D2 鉴权前置
- **来源**：业务规则 §R1／接口契约 #3
- **优先级**：高
- **GIVEN** 请求凭据有效，但账号没有小贷星菜单或接口权限
- **WHEN** 调用查询或导入端点
- **THEN** ⟨预期待定 · 源只定义 prod 菜单需角色授权，未定义接口无权限响应 · 现状未查得（qfc-base-auth 在仓外）
  · 不得据此写死断言；见待澄清 澄-9⟩

#### TC-ERR-008 · 批量写入中途失败
- **维度**：D3 事务边界/回滚补偿
- **来源**：业务规则 §R3／接口契约 #1／代码 `biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:142-143`
- **优先级**：高
- **GIVEN** 一次导入包含多条待写记录，且写入过程中有一条失败
- **WHEN** 执行该批次导入
- **THEN** 本次导入内此前更新与新增均回滚，不留下部分新批次数据
  ⚠️ **歧义点 歧-7**：源定义了批次导入但未定义部分失败的事务语义；整批回滚取自当前 `@Transactional(rollbackFor=Exception.class)`
  （`TjdBaseXiaodaixingProjectService.java:142-143`），**非产品契约**——它不会发现此处的缺陷，
  实现改了才会红。须人工审查确认。

## 4. 状态迁移 (TC-ST)

> 本功能没有业务状态枚举或合法/非法状态机；本区只覆盖文档明确存在的“未导入 → 已持久化可见”和“失败 → 仍未持久化”数据状态变化，不臆造新增、编辑、删除状态。

#### TC-ST-001 · 导入成功后立即可查询
- **维度**：D6 异步最终一致
- **来源**：验收标准 #3／业务规则 §R3／业务规则 §R8／接口契约 #1
- **优先级**：高
- **GIVEN** 一条记录在导入前不存在
- **WHEN** 导入接口返回成功后立即查询其批次和项目
- **THEN** 该记录已经可见，且批次数据完整；不存在异步等待中的中间态

#### TC-ST-002 · 空文件失败后保持无新增
- **维度**：D3 事务边界/回滚补偿
- **来源**：异常场景 #1／接口契约 #1
- **优先级**：高
- **GIVEN** 导入前记录集合处于已知状态
- **WHEN** 空文件导入失败
- **THEN** 记录集合和批次集合保持原状，没有新增批次或业务行

#### TC-ST-003 · 非 Excel 失败后保持无新增
- **维度**：D3 事务边界/回滚补偿
- **来源**：异常场景 #2／接口契约 #1
- **优先级**：高
- **GIVEN** 导入前记录集合处于已知状态
- **WHEN** 非 Excel 或损坏工作簿导入失败
- **THEN** 记录集合和批次集合保持原状，没有新增批次或业务行

## 覆盖矩阵（双向）

| 事实集条目 | 覆盖用例 | 状态 |
|---|---|---|
| 验收标准 #1 | TC-F-001 | ✓ |
| 验收标准 #2 | TC-F-002 | ✓ |
| 验收标准 #3 | TC-F-004, TC-F-007, TC-F-012, TC-ST-001 | ✓ |
| 验收标准 #4 | TC-F-009, TC-F-010, TC-E-006, TC-E-011 | ✓ |
| 验收标准 #5 | TC-F-003 | ✓ |
| 验收标准 #6 | TC-F-013 | ✓ |
| 业务规则 §R1 | TC-F-002, TC-F-003, TC-ERR-007 | ✓ |
| 业务规则 §R2 | TC-F-001, TC-F-004, TC-F-006, TC-E-003, TC-E-005, TC-E-009, TC-E-010 | ✓ |
| 业务规则 §R3 | TC-F-004, TC-F-007, TC-E-001, TC-E-007, TC-E-008, TC-ERR-008, TC-ST-001 | ✓ |
| 业务规则 §R4 | TC-F-009, TC-F-010, TC-F-011, TC-E-006, TC-E-011 | ✓ |
| 业务规则 §R5 | TC-F-001, TC-F-013 | ✓ |
| 业务规则 §R6 | TC-F-014, TC-ST 区说明 | ✓ |
| 业务规则 §R7 | TC-F-008 | ✓ |
| 业务规则 §R8 | TC-F-009, TC-E-006, TC-ST-001 | ✓ |
| 异常场景 #1 | TC-E-002, TC-ERR-001, TC-ERR-002, TC-ST-002 | ✓ |
| 异常场景 #2 | TC-F-005, TC-ERR-003, TC-ERR-004, TC-ST-003 | ✓ |
| 异常场景 #3 | TC-F-004, TC-F-006 | ✓ |
| 异常场景 #4 | TC-E-007 | ✓ |
| 接口契约 #1 | TC-F-004, TC-F-005, TC-F-007, TC-F-008, TC-F-012, TC-E-001, TC-E-002, TC-ERR-001..004, TC-ERR-008, TC-ST-001..003 | ✓ |
| 接口契约 #2 | TC-F-009, TC-F-010, TC-F-011, TC-E-006, TC-E-011 | ✓ |
| 接口契约 #3 | TC-F-002, TC-F-003, TC-F-005, TC-ERR-005..007 | ✓ |
| 接口契约 #4 | TC-F-001, TC-F-006, TC-E-010 | ✓ |
| 接口契约 #5 | TC-F-001, TC-F-006, TC-E-003, TC-E-004, TC-E-005 | ✓ |
| 接口契约 #6 | TC-F-009, TC-F-012, TC-E-011, TC-ERR-002 | ✓ |

> 正向：每条事实至少被一条用例或“不生成”纪律说明覆盖。
>
> 反向：门 A 已逐条核对；每条用例至少回指一条上述事实集条目，代码出处均只是追加项。

## 维度扫描表

| 维度 | 覆盖用例 | 状态 |
|---|---|---|
| D1 幂等/去重/并发 | TC-E-007, TC-E-008 | ⚠ 冲突待裁定 · 幂等/去重半有源且文档与实现冲突（澄-1）；并发半 N/A · 事实集未提及并发上限，按 §3 不生成 |
| D2 鉴权前置 | TC-ERR-005, TC-ERR-006, TC-ERR-007 | ⚠ 待澄清 · 场景由接口契约 #3 的凭据头与业务规则 §R1 的角色授权锚定，但三类失败预期均未定义且未查得（澄-9） |
| D3 事务边界/回滚补偿 | TC-F-001, TC-F-007, TC-ERR-008, TC-ST-002, TC-ST-003 | ◐ 已覆盖·预期待审 · TC-ERR-008（歧义点 歧-7）；明确失败不入库由异常场景 #1/#2覆盖 |
| D4 缓存读一致性 | — | N/A · 业务规则 §R8 明确查询直接读表、设计无缓存层 |
| D5 错误响应契约 + 成功信封 | TC-F-004, TC-F-009, TC-F-012, TC-E-011, TC-ERR-001..004 | ⚠ 待澄清 · 已覆盖成功 records 与主要失败；完整分页元数据、非法分页结果及 HTTP/业务错误码仍缺（澄-6、澄-8） |
| D6 异步最终一致 | TC-ST-001 | ✓ 已覆盖 · 业务规则 §R8 明确请求内同步写表，无异步下游；验证成功返回后立即可见 |

### §3 不默认登记项

- 限流/防刷：事实集未提及，按 §3 不生成、不询问。
- D1 并发上限/拒绝策略：事实集未提及，按 §3 不生成、不询问。
- 多租户数据隔离：事实集只要求表具有 `tenant_id` 列，没有正面定义隔离行为，按 §3 不生成、不询问。
- 版本/向后兼容：事实集未提及，按 §3 不生成、不询问。

## ⚠️ 歧义点（待人工审查）

| 编号 | 源未定义什么 | 按什么填的 | 影响用例 |
|---|---|---|---|
| 歧-1 | 无筛选查询的默认排序 | 当前实现 `import_time desc`（`TjdBaseXiaodaixingProjectService.java:111-114`） | TC-F-009 |
| 歧-2 | 六个筛选字段的模糊/精确匹配语义 | 当前实现三项 LIKE、三项 EQ（`TjdBaseXiaodaixingProjectService.java:128-133`） | TC-F-010 |
| 歧-3 | 多条件组合语义 | 当前实现同时添加条件，AND 取交（`TjdBaseXiaodaixingProjectService.java:124-134`） | TC-F-011 |
| 歧-4 | 导入成功业务码、消息内容及所在字段 | 当前 Controller 返回 `Result.success("导入成功，共处理 N 条")`，前端按 `code=200` 读取 `data`（Controller `:45-46`；页面 `:90-95`） | TC-F-012 |
| 歧-5 | 仅表头、0 数据行是否算成功 | 当前实现成功并报告处理 0 条（Service `:247-250`；Controller `:45-46`） | TC-E-002 |
| 歧-6 | 明确金额列的空白、非数字和分组符处理 | 当前实现空白/非数字置 null，分组符移除后解析（Service `:314-329`） | TC-E-003 |
| 歧-7 | 批量写入部分失败的事务语义 | 当前实现对导入方法声明全异常回滚（Service `:142-143`） | TC-ERR-008 |

> 以上预期**取自当前实现、非产品契约**：实现改了会红，实现错了不会红。
> 请审查；需要改动的，由审查者主动发起。本次不可交互，没有把任何歧义点冒充为已确认契约。

## 待澄清

- **澄-1 ⚠ 冲突：导入追加规则**
  - 源：每次导入只追加、不去重；重复月度清单产生重复行，以新 `batch_no` 区分（业务规则 §R3／异常场景 #4）。
  - 实现：文件内同 dataDate+projectNo 保留最后一行，数据库已有同键全部更新且覆盖 `batch_no/import_time`，只对未命中键新增（`biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:162-178,194-209`；`biz/base-service/base-service-domain/src/main/resources/mybatis/mapper/TjdBaseXiaodaixingProjectMapper.xml:5-50`）。
  - 影响：TC-E-007、TC-E-008。
- **澄-2 ⚠ 冲突：非 Excel 错误提示**
  - 源：提示“格式不支持”且不入库（异常场景 #2）。
  - 实现：后端未按扩展名分支，解析异常统一返回“导入失败：<异常>”（`biz/base-service/base-service-app/src/main/java/com/itgfin/slp/base/controller/TjdBaseXiaodaixingProjectController.java:47-49`）；前端只声明允许扩展名，组件的具体提示实现未读到。
  - 影响：TC-ERR-003、TC-ERR-004。
- **澄-3 ⚠ 冲突：字符串原样保真**
  - 源：不清洗、原样保真（业务规则 §R2）。
  - 实现：所有通过 `trimToNull` 的字符串都会 trim，纯空白转 null（`biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:269-303,332-335`）。
  - 影响：TC-E-010。
- **澄-4 ⚠ 冲突：空客户且空项目号的业务行**
  - 源：36 列不清洗、零丢失，没有声明客户/项目号必填（业务规则 §R2）。
  - 实现：customer 与 projectNo 同时为空的行被跳过（`biz/base-service/base-service-domain/src/main/java/com/itgfin/slp/base/service/TjdBaseXiaodaixingProjectService.java:262-266`）。
  - 影响：TC-E-009。
- **澄-5**：源未定义超出 `decimal(24,6)` 或 varchar 长度后的拒绝、舍入、截断契约；Java 转换层也不能决定数据库最终行为，本次未读取运行环境 SQL mode。影响 TC-E-004、TC-E-005。
- **澄-6**：源未定义分页字段名、默认值、边界与非法值响应；`TableBaseSearchVO/QmPage` 的共享依赖源码不在本次读到的仓库文件中。影响 TC-E-011。
- **澄-7**：源未区分 multipart `file` 字段缺失与空文件；Spring 参数绑定发生在 Controller 方法体前，当前范围内未查到统一异常响应。影响 TC-ERR-001。
- **澄-8**：源与可见代码没有给出失败 HTTP 状态码、业务错误码及完整错误信封；`Result` 的共享依赖源码未查得。影响 TC-ERR-002，并限制 D5 的完整性。
- **澄-9**：无凭据、过期凭据、有效但无权限三类端点响应均未定义；当前 Controller 无端点级鉴权声明，网关/`qfc-base-auth` 不在本次可见实现范围。影响 TC-ERR-005..007。

## 无法交互降级记录

1. Step 5 查得的 4 组冲突全部置于“待澄清”最前，相关 THEN 保持 `⟨预期未定 · 冲突未裁定⟩`；原因：任务明确不可交互，按 Step 6 降级出口不选文档或实现任一侧。
2. 源沉默但代码有现状的 7 处，按代码填入并标为歧义点；每处都明确“非产品契约、不会发现此处缺陷”；原因：skill 要求不中断产物，又禁止把现状洗成契约。
3. 共享依赖、数据库运行模式或仓外权限系统中才能查明的 5 类结果使用 `⟨预期待定⟩` 并进入待澄清；原因：本次指定代码范围内没有实际读到可核实现，未凭经验猜测。
4. 设计文档的分页路径 `/page` 与代码 `/search` 按“结构坐标”处理，以实际代码填 `/search`，未标冲突；原因：端点命名变化属于 skill 判据中的坐标，不改变“分页查询”功能答案。
5. 限流/防刷、并发上限、多租户隔离、版本兼容均未生成用例，也未列为普通待澄清；原因：§3 明令事实集没有明确行为依据时不默认登记。`tenant_id` 列只证明结构存在，不等于定义了隔离行为。
6. 纯前端用例只应用三铁律和 GIVEN/WHEN/THEN，标“无领域维度”；原因：skill 明确当前没有前端 E2E 维度表，不能把后端 D1–D6 硬套给前端。

## 出口自检（三门，一趟）

### 门 A · 无源门

- 正向核：36 条用例均至少回指一条本产物“待测事实集”；没有仅以代码作为场景来源的用例。
- 反向核：逐项以“源未定义什么”回查事实集。歧-1（排序）、歧-2（匹配）、歧-3（组合）、歧-4（成功消息字段）、歧-5（仅表头）、歧-6（金额脏值）、歧-7（部分失败事务）均没有正面应然陈述，未漏报冲突。
- 反向覆盖：事实集每条均有用例或按法定“不生成”纪律交代；覆盖矩阵无空行。

### 门 B · 执行泄漏门

- 硬拦：仅检查各用例 GIVEN/WHEN/THEN 契约文本，未出现 RestAssured、Postman、JUnit、Mockito、Playwright、assertEquals、JSONPath、点击、输入框、滚动、跳转、mock 掉、插入一条记录、执行 SQL。
- 软拦：逐条应用执行者替换测试；GIVEN 都是状态事实，WHEN 都是接口/业务意图，THEN 都是可观察契约或带禁令的待定结果；没有数据构造手段、鉴权获取序列或断言 API。
- 出处、代码行和现状说明仅位于 `来源`、歧义/冲突注记，不作为契约执行方式。

### 门 C · 维度覆盖门

- D1–D6 已逐条出现在维度扫描表，没有空项。
- D1 两半边分别交代，整行采用更严格的“冲突待裁定”；并发半按 §3 合法 N/A。
- D4 的 N/A 回指业务规则 §R8 的直读表/无缓存架构事实。
- D2、D5 的“待澄清”均有对应澄清项；D3 的源沉默现状被保留为歧义点覆盖；D6 有同步可见用例。
- 纯前端用例没有伪装为后端维度覆盖。

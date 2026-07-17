# 测试用例 — 客户经理归属同步与业务门禁

> 需求来源：`requirements.md` / `design.md`（2026-07-17-sync-customer-manager-ownership）
> 覆盖范围：后端服务（Java / edoc-be）+ 微信小程序前端（edoc-weixin-fe）
> 编写人：测试工程师
> 版本：v1.0

---

## 0. 说明与约定

### 0.1 术语对照

| 术语 | 含义 |
| --- | --- |
| 主数据 / MDM | 个人客户主数据系统，通过 `POST /person/save` 读写 |
| `belongBusiManager` | 本地个人客户经理工号（本次门禁与同步判定字段） |
| `belongBusiManagerName` | 本地客户经理名称，仅存本地，不发主数据 |
| `businessManager` | 与 `belongBusiManager` 语义不同的另一套字段（本次不动） |
| `customerId` | 本地字段，对外承担主数据 `mdmcode` 角色 |
| `mdmcode` | 主数据侧唯一编码，请求携带表示更新、缺省表示新增/查重 |
| 门禁 | 「当前登录人必须已绑定客户经理」的校验 |
| 强失败语义 | 本地成功且主数据成功才算成功，任一步失败整体失败 |

### 0.2 关键被测接口 / 组件

- 后端 `PersonMasterDataService.saveOrUpdate(UserPersonPO, CustomerManagerInfo)`
- 后端 `UserPersonService.requireBusinessManagerBound(String wxUserId)`
- 后端 `UserPersonServiceImpl.bindBusinessManager`
- 后端 `UserBusinessServiceImpl.getPersonCustomer` / `savePersonInfo` / `saveCompany`
- 后端 `PersonCustomerResolver.matchOrCreatePerson`
- 后端 `FadadaPlatformService.getSignUrl`（普通 + 企微 Controller 共享）
- 前端 `utils/business-manager-guard.js` 的 `ensureBusinessManagerBound({ api, onBound })`
- 前端 `api.getUserInfo`（`/user/getMe`）新增 `fail` 参数
- 前端页面：主包 `sign-contract`、分包 `sign-contract`、企业认证 `firm-certification`

### 0.3 用例编号规则

- `BE-MDS-xx`：主数据统一保存
- `BE-BIND-xx`：绑定编排与失败语义
- `BE-GATE-xx`：后端门禁
- `BE-SAVE-xx`：savePersonInfo 覆盖路径
- `BE-COMP-xx`：企业保存
- `BE-SIGN-xx`：签署门禁
- `FE-GUARD-xx`：前端共享门禁工具
- `FE-PAGE-xx`：前端页面接线
- `E2E-xx`：端到端 / SIT
- `REG-xx`：回归与非目标验证

### 0.4 优先级

P0 = 核心链路/资金安全/数据一致性，必测；P1 = 重要分支；P2 = 边界与体验。

---

## 1. 后端 — 主数据统一保存 `PersonMasterDataService.saveOrUpdate`

覆盖需求 4 的验收项：字段组装、mdmcode 新增/更新语义、响应校验强失败。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| BE-MDS-01 | 有 customerId 时以 mdmcode 更新 | P0 | person.customerId 非空（如 "C10086"），managerInfo 完整 | 调用 saveOrUpdate | 组装的 MdmPersonDTO 中 `mdmcode=C10086`；调用 `MasterDataServiceClient.createPerson`（即 POST /person/save）；返回响应的 mdmcode | 
| BE-MDS-02 | 无 customerId 时不传 mdmcode（新增/查重语义） | P0 | person.customerId 为 null/空 | 调用 saveOrUpdate | DTO 不携带 mdmcode 字段（或为 null）；接口按新增/查重处理；返回响应中的 mdmcode | 
| BE-MDS-03 | 固定字段精确断言 | P0 | person 有姓名/证件号，managerInfo 有经营单位/部门/工号 | 调用 saveOrUpdate | DTO 中 `name=customerName`、`cardType=3L`、`cardNumber=certId`、`source=GMZB-BS-ECS`、`orgCode=客户经理经营单位`、`deptCode=客户经理部门`、`empCode=客户经理工号` | 
| BE-MDS-04 | 客户经理名称不发主数据 | P1 | managerInfo 含名称 | 调用 saveOrUpdate | DTO 归属字段不包含客户经理名称；名称仅存本地由调用方处理 | 
| BE-MDS-05 | 令牌获取被调用 | P1 | 正常 | 调用 saveOrUpdate | 先获取主数据访问令牌，再发起 createPerson | 
| BE-MDS-06 | 响应为空 → 抛 BusinessException | P0 | createPerson 返回 null | 调用 saveOrUpdate | 抛 BusinessException，不返回 mdmcode | 
| BE-MDS-07 | 响应失败标志 → 抛异常 | P0 | 响应非空但 success=false | 调用 saveOrUpdate | 抛 BusinessException | 
| BE-MDS-08 | 响应 data 为空 → 抛异常 | P0 | 响应成功但 data 为空 | 调用 saveOrUpdate | 抛 BusinessException | 
| BE-MDS-09 | 响应 mdmcode 为空 → 抛异常 | P0 | 响应成功、data 非空但 mdmcode 为空/空串 | 调用 saveOrUpdate | 抛 BusinessException | 
| BE-MDS-10 | 员工与外部个人走同一逻辑 | P0 | person.workCode 非空（员工） | 调用 saveOrUpdate | 不因 workCode 存在而跳过或改分支，仍正常组装并调用 createPerson | 
| BE-MDS-11 | createPerson 抛异常向上传播 | P1 | Feign 调用抛 RuntimeException | 调用 saveOrUpdate | 异常向上抛出，不被吞掉，不返回成功 | 
| BE-MDS-12 | 成功返回的 mdmcode 即响应值 | P0 | 响应 mdmcode="C20000" 与入参 customerId 不同 | 调用 saveOrUpdate | 返回值为 "C20000"（以响应为准） | 

---

## 2. 后端 — 绑定编排与失败语义 `bindBusinessManager`

覆盖场景 2.1、异常清单、验收项：本地先写、主数据后调、强失败回滚、customer_id 回写。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| BE-BIND-01 | 正常绑定全链路成功 | P0 | 已实名个人；手机号唯一有效客户经理；主数据成功 | 调用 bindBusinessManager | 先更新本地 belong_busi_manager/name → 调 PersonMasterDataService → 回写 customer_id → 返回 BindBusinessManagerVO | 
| BE-BIND-02 | 未实名不允许绑定 | P0 | person 未完成实名 | 调用 bindBusinessManager | 返回/抛「请先完成实名认证」；不更新本地，不调主数据 | 
| BE-BIND-03 | 找不到个人 | P1 | wxUserId 无对应个人 | 调用 bindBusinessManager | 按现有未实名/无记录规则拒绝；无本地/主数据写入 | 
| BE-BIND-04 | 本地更新顺序在主数据之前 | P0 | 正常 | 调用 bindBusinessManager | 校验调用序：先本地 update belong_busi_manager，后 PersonMasterDataService.saveOrUpdate | 
| BE-BIND-05 | 本地更新影响 0 行 → 不调主数据 | P0 | 本地 update 返回 0 行 | 调用 bindBusinessManager | 立即失败；`MasterDataServiceClient`/`PersonMasterDataService` 从未被调用 | 
| BE-BIND-06 | 主数据抛异常 → 不返回成功且事务回滚 | P0 | saveOrUpdate 抛 BusinessException | 调用 bindBusinessManager | 异常向上抛出触发 `@Transactional(rollbackFor=Exception.class)` 回滚本地归属；不返回 VO | 
| BE-BIND-07 | 返回 mdmcode 与本地 customerId 不同 → 回写 customer_id | P0 | 本地 customerId=null 或旧值，主数据返回新 mdmcode | 调用 bindBusinessManager | 在同一事务内按个人主键更新 customer_id 为新 mdmcode | 
| BE-BIND-08 | mdmcode 与现有 customerId 相同 → 无需回写（幂等） | P2 | 返回 mdmcode == 现有 customerId | 调用 bindBusinessManager | 不做无意义回写或回写结果一致；绑定成功 | 
| BE-BIND-09 | customer_id 回写 0 行 → 抛异常不返回成功 | P0 | 回写 update 返回 0 行 | 调用 bindBusinessManager | 抛异常，不返回 VO，事务回滚 | 
| BE-BIND-10 | customer_id 回写返回 false → 抛异常 | P0 | 回写 DAO 返回 false | 调用 bindBusinessManager | 抛异常，不返回 VO | 
| BE-BIND-11 | 员工 workCode 非空也不跳过主数据同步 | P0 | person.workCode 非空 | 调用 bindBusinessManager | 仍调用 saveOrUpdate；无员工跳过/禁止分支 | 
| BE-BIND-12 | 手机号查不到客户经理 → 绑定失败 | P0 | CustomerManagerResolver.resolveByMobile 返回空 | 调用 bindBusinessManager | 绑定失败；本地与主数据均不确认新归属 | 
| BE-BIND-13 | 手机号命中多个精确客户经理 → 失败 | P0 | Resolver 返回多条精确匹配 | 调用 bindBusinessManager | 绑定失败，不写本地/主数据 | 
| BE-BIND-14 | 客户经理已离职 → 失败 | P1 | 客户经理状态离职 | 调用 bindBusinessManager | 绑定失败 | 
| BE-BIND-15 | 客户经理缺工号/经营单位/部门 → 失败 | P0 | 客户经理归属信息不完整 | 调用 bindBusinessManager | 绑定失败；不写本地/主数据（避免发出缺字段主数据请求） | 
| BE-BIND-16 | 客户经理手机号格式无效 → 失败 | P2 | 手机号非法 | 调用 bindBusinessManager | 绑定失败 | 
| BE-BIND-17 | 绑定成功后 belongBusiManagerName 写本地 | P1 | 正常 | 调用 bindBusinessManager | 本地保存客户经理名称；该名称不出现在主数据请求 | 

---

## 3. 后端 — 统一门禁 `requireBusinessManagerBound`

覆盖 design 2、场景 2.2/2.3、异常「查询失败/未绑定」。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| BE-GATE-01 | 已绑定返回当前个人 | P0 | person 存在、已实名、belongBusiManager 非空 | 调用 requireBusinessManagerBound(wxUserId) | 返回该 UserPersonPO，供调用方读取工号 | 
| BE-GATE-02 | 未实名 → 请先完成实名认证 | P0 | person 未实名 | 调用 requireBusinessManagerBound | 抛「请先完成实名认证」 | 
| BE-GATE-03 | 找不到个人 → 请先完成实名认证 | P1 | wxUserId 无个人记录 | 调用 requireBusinessManagerBound | 抛「请先完成实名认证」（与未实名同语义） | 
| BE-GATE-04 | 已实名但未绑定 → 请先前往我的页面绑定 | P0 | 已实名、belongBusiManager 为空 | 调用 requireBusinessManagerBound | 抛「请先前往我的页面绑定客户经理」 | 
| BE-GATE-05 | belongBusiManager 空串同样视为未绑定 | P1 | belongBusiManager="" | 调用 requireBusinessManagerBound | 抛未绑定异常 | 
| BE-GATE-06 | 只判 belongBusiManager 不判 businessManager | P1 | belongBusiManager 空但 businessManager 非空 | 调用 requireBusinessManagerBound | 仍抛未绑定异常（两套字段语义隔离） | 

---

## 4. 后端 — 签署门禁 `FadadaPlatformService.getSignUrl`

覆盖场景 2.2、验收项：个人/企业合同、普通/企微入口统一受门禁保护、顺序在查法大大之前。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| BE-SIGN-01 | 未绑定时不查法大大认证记录 | P0 | 当前登录人未绑定 | 调用 getSignUrl | 先调 requireBusinessManagerBound 抛异常；未进入法大大认证记录查询 | 
| BE-SIGN-02 | 已绑定继续原认证判断 | P0 | 已绑定 | 调用 getSignUrl | 门禁通过后进入原有法大大流程，返回签署地址 | 
| BE-SIGN-03 | 个人合同受门禁 | P0 | customerType=个人，未绑定 | 调用 getSignUrl | 被门禁拦截 | 
| BE-SIGN-04 | 企业合同受门禁（校验的是登录人非企业归属） | P0 | customerType=企业，登录人未绑定 | 调用 getSignUrl | 被门禁拦截；不按 dto.customerType 分支跳过 | 
| BE-SIGN-05 | 普通 Controller 入口受保护 | P0 | 走 `/contract/getSignUrl`，未绑定 | 调用 | 被拦截（共享服务生效） | 
| BE-SIGN-06 | 企微 Controller 入口受保护 | P0 | 走 `/qw/esign/contract/getSignUrl`，未绑定 | 调用 | 被拦截（同一共享服务，一处门禁两入口） | 
| BE-SIGN-07 | 门禁顺序在查询法大大记录之前 | P1 | 未绑定 | 调用 getSignUrl，验证调用序 | requireBusinessManagerBound 在任何法大大认证查询前被调用 | 

---

## 5. 后端 — 企业保存 `UserBusinessServiceImpl.saveCompany`

覆盖场景 2.3、验收项：门禁前移到短信验证码/重复检查之前，且不改企业归属。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| BE-COMP-01 | 未绑定时门禁在短信验证码校验之前 | P0 | 登录人未绑定 | 调用 saveCompany | requireBusinessManagerBound 先抛异常；未读取/校验代理人短信验证码 | 
| BE-COMP-02 | 未绑定时不做企业重复绑定检查 | P0 | 未绑定 | 调用 saveCompany | 未执行企业重复绑定检查 | 
| BE-COMP-03 | 未绑定时不创建企业主数据 | P0 | 未绑定 | 调用 saveCompany | 未调用企业主数据创建 | 
| BE-COMP-04 | 已绑定继续原企业创建流程 | P0 | 已绑定 | 调用 saveCompany | 正常执行短信校验、重复检查、企业主数据创建 | 
| BE-COMP-05 | 已绑定时用返回个人解析最新客户经理归属 | P1 | 已绑定，belongBusiManager 有值 | 调用 saveCompany | 用门禁返回的 UserPersonPO 解析并把当前个人客户经理三字段发给企业主数据 | 
| BE-COMP-06 | 企业创建不引入企业归属更新 | P0 | 已绑定 | 调用 saveCompany | 仍按现有逻辑发送当前登录人经理归属；无「企业归属变更」请求（非目标） | 

---

## 6. 后端 — savePersonInfo 归属覆盖路径

覆盖需求 3、场景 2.1.5、验收项：两条既有提前返回分支改为先同步主数据、失败不覆盖本地。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| BE-SAVE-01 | 已完成个人再次提交 → 调用统一主数据保存 | P0 | 已实名个人再次提交且接受新客户经理 | 调用 savePersonInfo | 先调 PersonMasterDataService.saveOrUpdate，再写本地 mdmcode/工号/名称 | 
| BE-SAVE-02 | 已完成个人再次提交主数据失败 → 不覆盖本地 | P0 | saveOrUpdate 抛异常 | 调用 savePersonInfo | 不执行本地归属覆盖；不提前返回成功 | 
| BE-SAVE-03 | 手机号命中旧个人 → 调用统一主数据保存 | P0 | 手机号命中已有个人记录并更新客户经理 | 调用 savePersonInfo | 走统一主数据保存组件，写回 mdmcode/工号/名称 | 
| BE-SAVE-04 | 手机号命中旧个人主数据失败 → 不覆盖本地 | P0 | saveOrUpdate 失败 | 调用 savePersonInfo | 不覆盖本地归属；旧值保留 | 
| BE-SAVE-05 | 两条路径与显式绑定共用同一保存组件与失败语义 | P1 | — | 代码/调用断言 | 均通过 PersonMasterDataService，失败语义一致 | 
| BE-SAVE-06 | 未接受新客户经理时不触发同步 | P2 | 再次提交但客户经理未变/未被接受 | 调用 savePersonInfo | 不必要地调用主数据的行为不出现（按接受与否判定） | 

---

## 7. 后端 — 个人创建链复用统一组件

覆盖 design 1 收敛清单、验收项：首次实名与签约兜底走同一组件。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| BE-CREATE-01 | 首次实名认证个人创建走统一组件 | P0 | getPersonCustomer 首次创建 | 调用 | 通过 PersonMasterDataService 组装并保存，回写响应 mdmcode | 
| BE-CREATE-02 | 首次实名字段与旧请求一致 | P1 | — | 断言 DTO 字段 | 生成原有请求字段（无字段漂移） | 
| BE-CREATE-03 | 签约兜底 matchOrCreatePerson 走统一组件 | P0 | 签约时缺 customerId 触发兜底 | 调用 | 通过 PersonMasterDataService 完成创建/查重，消除 DTO 组装重复 | 
| BE-CREATE-04 | 签约兜底主数据失败按强失败处理 | P1 | saveOrUpdate 失败 | 调用 | 抛异常，不静默生成半成品归属 | 

---

## 8. 前端 — 共享门禁工具 `ensureBusinessManagerBound`

覆盖 design 3、场景 2.2/2.3、验收项：取 /user/getMe 当前登录人、不读缓存、不串人、按钮与跳转、失败不继续。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| FE-GUARD-01 | 已绑定 → 调用 onBound | P0 | getUserInfo 返回当前个人 belongBusiManager 非空 | ensureBusinessManagerBound({api,onBound}) | 调用一次 onBound；不弹 Modal | 
| FE-GUARD-02 | 未绑定 → 弹 Modal 且不调 onBound | P0 | 当前个人 belongBusiManager 空 | 调用 | 展示 wx.showModal；onBound 不被调用 | 
| FE-GUARD-03 | Modal 两个按钮为「取消 / 前往绑定」 | P0 | 未绑定 | 调用 | Modal 显示取消与前往绑定两个按钮 | 
| FE-GUARD-04 | 确认「前往绑定」→ switchTab 到我的页面 | P0 | 未绑定，用户点确认 | 调用 | 以完整对象 `wx.switchTab({ url: '/pages/individual-center/individual-center' })` 跳转；不调 onBound | 
| FE-GUARD-05 | 取消 → 不跳转不继续 | P0 | 未绑定，用户点取消 | 调用 | 不 switchTab，不调 onBound | 
| FE-GUARD-06 | 没有个人记录 → 按未绑定处理 | P1 | getUserInfo 返回空个人 | 调用 | 弹 Modal，不调 onBound | 
| FE-GUARD-07 | 查询失败 → 不调 onBound，复用错误展示 | P0 | getUserInfo 走 fail | 调用 | 触发请求层错误展示；onBound 不被调用；不放行 | 
| FE-GUARD-08 | 只取当前登录人，不读 userInfo 缓存 | P0 | 缓存 userInfo 已绑定但服务端未绑定 | 调用 | 以服务端 /user/getMe 结果为准（弹 Modal），不因缓存放行 | 
| FE-GUARD-09 | 双用户隔离：不串人放行 | P0 | 另一客户绑定状态相反 | 调用 | 只消费 /user/getMe 当前登录人响应；不读分页首条 | 
| FE-GUARD-10 | 双用户隔离：不串人拦截 | P0 | 当前已绑定，另一用户未绑定 | 调用 | 正确放行当前登录人（调 onBound） | 

---

## 9. 前端 — api.getUserInfo 兼容改造

覆盖 design 3：新增可选 fail、老消费者兼容。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| FE-API-01 | 传 fail 时 Promise catch 转发 | P0 | 请求失败 | getUserInfo({success,fail}) | fail 回调被调用 | 
| FE-API-02 | 只传 success 的老消费者兼容 | P0 | 老调用只传 success | getUserInfo({success}) | 不报错；成功时 success 正常回调；无 fail 不抛未捕获异常 | 
| FE-API-03 | 门禁强制传 fail | P1 | 门禁调用 | — | 门禁调用 getUserInfo 必带 fail，保证异常不继续 | 

---

## 10. 前端 — 页面接线

覆盖 design 3、验收项：主包/分包签署、企业新增只在门禁成功后继续。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| FE-PAGE-01 | 主包签署页未绑定不发签署请求 | P0 | 主包 sign-contract，未绑定 | 走完本地校验后触发签署 | 门禁拦截；不调用 api.getSignUrl | 
| FE-PAGE-02 | 主包签署页已绑定继续原流程 | P0 | 已绑定 | 触发签署 | 门禁通过后调用 api.getSignUrl | 
| FE-PAGE-03 | 门禁在本地校验之后、getSignUrl 之前 | P1 | 未选文档/跨平台 | 触发签署 | 先完成「已选文档/同一平台」本地校验，再执行门禁 | 
| FE-PAGE-04 | 分包签署页与主包行为一致 | P0 | 分包 sign-contract，未绑定 | 触发签署 | 门禁拦截，不发请求（避免注册非主导航入口绕过） | 
| FE-PAGE-05 | 分包签署页已绑定继续 | P1 | 分包，已绑定 | 触发签署 | 调 api.getSignUrl | 
| FE-PAGE-06 | 企业认证新增未绑定不进入表单 | P0 | firm-certification，未绑定 | 点击「新增认证」(addAuthentication) | 门禁拦截；不 wx.navigateTo 企业表单 | 
| FE-PAGE-07 | 企业认证新增已绑定进入表单 | P0 | 已绑定 | 点击「新增认证」 | 门禁通过后 wx.navigateTo 企业新增表单 | 
| FE-PAGE-08 | 各页未绑定均可切换到我的页面 | P1 | 未绑定，点前往绑定 | 各入口 | switchTab 到 individual-center | 

---

## 11. 端到端 / SIT

覆盖需求 6 依赖与风险、design 风险验证策略。这些用例需真实环境（SIT），静态无法证明。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| E2E-01 | 绑定端到端两端一致 | P0 | 已实名客户 | 我的页输入客户经理手机号绑定 | 本地存新工号/名称；/person/save 收到同一客户 mdmcode + source/orgCode/deptCode/empCode；页面显示新经理并刷新缓存 | 
| E2E-02 | 空 customerId 绑定回写 | P0 | 本地 customerId 为空 | 绑定 | 按新增/查重取得 mdmcode 并回写本地 customer_id | 
| E2E-03 | 携带 mdmcode 真实更新语义（AGW 未核验依赖） | P0 | 已有个人 mdmcode 换绑 | SIT 用真实请求换绑 | 核对主数据归属台账确认执行的是更新而非新增；响应返回有效 mdmcode | 
| E2E-04 | 主数据员工工号兼容性 | P0 | 选一名主数据员工 | 完成绑定 | /person/save 接受其本地 customerId；失败按强失败暴露主数据错误，不静默跳过 | 
| E2E-05 | 主数据失败本地回滚 | P0 | 模拟主数据失败 | 绑定 | 本地归属保持原值；页面与缓存不刷新；接口返回失败 | 
| E2E-06 | 远程成功本地提交失败的残余风险记录 | P2 | 模拟远程成功、本地事务提交失败 | 绑定 | 出现小概率两端短暂不一致（已声明风险，无自动补偿）；记录并可人工核对 | 
| E2E-07 | 未绑定签署端到端拦截 | P0 | 未绑定客户 | 发起签署 | 弹「取消/前往绑定」；选前往绑定切我的页；签署请求未发出 | 
| E2E-08 | 未绑定企业新增端到端拦截 | P0 | 未绑定客户 | 企业认证列表点新增 | 不进入表单，可切我的页 | 
| E2E-09 | 直接调后端企业保存也被拦截 | P0 | 绕过前端直接调 saveCompany，未绑定 | 直接请求 | 后端拦截，返回「请先前往我的页面绑定客户经理」；不能被前端缓存/页面路径/普通入口/企微入口绕过 | 
| E2E-10 | 已绑定客户签署与企业新增保持成功 | P0 | 已绑定 | 完成签署与新增 | 现有成功流程不变；无企业归属变更 | 

---

## 12. 回归与非目标验证

覆盖需求 5 非目标、design 范围控制、护栏。

| 用例编号 | 标题 | 优先级 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- | --- |
| REG-01 | 不更新已认证企业主数据归属 | P0 | 企业已认证 | 触发相关流程 | 无企业归属更新请求发出 | 
| REG-02 | 不校验企业自身归属 | P1 | 企业签署 | 签署 | 门禁只查登录人，不查企业归属字段 | 
| REG-03 | 不新增主数据接口/不改 /person/save 路径 | P0 | — | 代码/路由核查 | 仍用现有 POST /person/save，未切 Feign 路径 | 
| REG-04 | 无分布式事务/MQ/异步补偿引入 | P1 | — | 代码核查 | 保持同步强失败，无新增补偿设施 | 
| REG-05 | 不改 Web 管理平台流程 | P1 | edoc-fe | 核查 | edoc-fe 签署/企业认证未受影响 | 
| REG-06 | 不改渠道码/管理端渠道关联写入 | P1 | — | 核查 | 渠道相关个人归属写入规则不变 | 
| REG-07 | 征信授权继续消费 belongBusiManager | P0 | CreditAuthSignService | 提交成功后 | 读取已提交 belongBusiManager；同步失败回滚时读取原值；其生产代码未改 | 
| REG-08 | 不触及数据库 DDL / 企业 PO/DTO | P1 | — | 核查 | 无新增数据库列、无企业模型改动 | 
| REG-09 | 目标模块原有测试无回归 | P0 | — | 跑 edoc-manage-weixin-domain 全部测试 + node --test tests/*.test.js | 全绿，无回归 | 
| REG-10 | 反直觉字段护栏：customerId↔mdmcode | P1 | — | 代码/断言 | 用 customerId 作 mdmcode，未误用 DTO 的 id | 
| REG-11 | 反直觉字段护栏：belongBusiManager vs businessManager | P1 | — | 代码/断言 | 只判断/更新 belongBusiManager | 

---

## 13. 覆盖率对照（需求验收项 → 用例）

| 需求验收项（§4） | 对应用例 |
| --- | --- |
| 绑定后本地存工号/名称，/person/save 收 mdmcode + 四字段 | BE-MDS-01/03、BE-BIND-01、E2E-01 |
| 空 customerId 取 mdmcode 并回写 | BE-MDS-02、BE-BIND-07、E2E-02 |
| 主数据失败/空/空 mdmcode 返回失败且本地保持原值 | BE-MDS-06~09、BE-BIND-06、E2E-05 |
| 员工与外部个人同一逻辑无跳过分支 | BE-MDS-10、BE-BIND-11、E2E-04 |
| 实名新增走同一组件并存 mdmcode | BE-CREATE-01/02 |
| 再次提交/手机号命中旧个人同步，失败不确认 | BE-SAVE-01~04 |
| 主包/分包签署前查最新绑定状态 | FE-PAGE-01/04、FE-GUARD-08 |
| /user/getMe 取登录人，不串人 | FE-GUARD-01/08/09/10 |
| 个人/企业/普通/企微入口均受后端门禁 | BE-SIGN-03~06 |
| 未绑定看到取消/前往绑定，请求不发出 | FE-GUARD-02~05、FE-PAGE-01、E2E-07 |
| 企业新增未绑定不进入表单可切我的页 | FE-PAGE-06、E2E-08 |
| 直接调企业保存门禁在验证码/重复检查之前 | BE-COMP-01~03、E2E-09 |
| 已绑定保持现有成功流程无企业归属变更 | BE-COMP-06、E2E-10、REG-01 |
| 后端定向 + 小程序行为测试全过且无回归 | REG-09 |

---

## 14. 建议执行命令（来自 design «测试缝隙»）

```bash
# 后端定向
cd edoc-be
JAVA_HOME="/Users/lilongjian/.sdkman/candidates/java/8.0.492-zulu" \
/Users/lilongjian/Projects/Tools/apache-maven-3.6.3-default/bin/mvn \
  -s /Users/lilongjian/Projects/Tools/apache-maven-3.6.3-default/settingsnew.xml \
  -pl edoc-manage-weixin/edoc-manage-weixin-domain -am test \
  -Dtest=PersonMasterDataServiceTest,UserPersonServiceImplTest,UserBusinessServiceImplTest,FadadaPlatformServiceTest,PersonCustomerResolverTest \
  -DfailIfNoTests=false

# 小程序定向
cd ../edoc-weixin-fe
node --test tests/business-manager-guard.test.js

# 模块回归
# 后端：edoc-manage-weixin-domain 全部测试
# 小程序：node --test tests/*.test.js
```

---

## 15. 遗留风险提示（测试须知）

- **AGW 路由未核验**：`/person/save` 携带 mdmcode 是否真执行更新，静态不可证，E2E-03 必须在 SIT 取证。
- **员工工号兼容性未核验**：主数据是否对员工工号/个人 mdmcode 有类型限制，E2E-04 取证；异常按强失败暴露。
- **跨系统残余不一致**：远程成功、本地提交失败无自动补偿（E2E-06），非本次消除目标，仅记录观测。
```

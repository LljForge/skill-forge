export const meta = {
  name: 'spec-baseline-regression-newmodules',
  description: 'B0-B4 优化后 skill 的无人值守泛化回归:对 4 个未参与调优的新模块(employee/organization/bfe/fin)净跑完整管线,产 specs + 打分卡,验证优化在调优语料之外不退化、不过拟合',
  phases: [
    { title: 'Boundary', detail: '逐模块边界分析(boundary-agent)' },
    { title: 'Analyze', detail: '结构+领域并行分析' },
    { title: 'Plan', detail: '能力划分(扫网关+同步群)' },
    { title: 'Synthesize', detail: '逐 capability 写 spec.md' },
    { title: 'Verify', detail: 'grounding+核对门+完整性核验' },
    { title: 'Revise', detail: '据核验收敛' },
    { title: 'ScoreValidate', detail: 'openspec validate + 打分卡' },
    { title: 'Aggregate', detail: '汇总回归判定' },
  ],
}

const SKILL = '/Users/lilongjian/Projects/AI/skill-forge/skills/module-spec-baseline'
const PROJ = '/Users/lilongjian/Projects/GMZB/master-data'
const BE = PROJ + '/master-data-be'
const SCRATCH = PROJ + '/openspec/.spec-baseline-scratchpad'
const SPECS = PROJ + '/openspec/specs'
const WEB = SKILL + '/shared/strategies/web/spring-boot.md'
const ORM = SKILL + '/shared/strategies/orm/mybatis.md'
const RPC = SKILL + '/shared/strategies/rpc/feign.md'

const NO_STEER = `严格按模板原样执行,**绝不**额外提示去找鉴权/MQ/定时/缓存/校验/错误码/四类位置等任何特定维度——本次是测优化后 skill 在新模块上的泛化,任何引导都会污染结果。不要进入计划模式,直接用 Write 落盘。`

const MODULES = [
  { name: 'mdm-employee', scope: 'com.itgfin.masterdata 内的「员工」子域:BaseEmployee*/Employee* 相关 Controller/Service/DAO/PO/VO(BaseEmployeeController/BaseEmployeeAuthController/BaseEmployeePartjobController/BaseEmployeeApiController/BaseEmployeeAccountController/MdmLogBaseEmployeeController 等)+ 同包(扁平 service/ 包)被 BaseEmployeeService 等 @Autowired 注入的依赖 + 公共网关 ApiController 中 employee 相关方法(searchEmployee/saveBaseEmployeeList/searchEmployeeAccount/saveOrUpdateEmployeeAccountList/searchEmployeeAuthList)+ 同步 Controller 群 TaskSyncJobController 中调 baseEmployeeService 的端点(taskSyncEmpJob/taskSyncAddEmpJob);**排除** enterprise/organization/dict/bankAccount/appCenter/syncLog 等其他 masterdata 子域' },
  { name: 'mdm-organization', scope: 'com.itgfin.masterdata 内的「组织/机构」子域:BaseOrganization* 相关 Controller/Service/DAO/PO/VO(BaseOrganizationService/BaseOrganizationSrcMapService 等)+ 同包被 @Autowired 注入的依赖 + 公共网关 ApiController 中 organization 相关方法(searchOrganization/saveBaseOrganizationList)+ 同步 Controller 群 TaskSyncJobController 中调 organization 的端点(taskSyncOrgJob);**排除** employee/enterprise/dict/bankAccount/appCenter 等其他子域' },
  { name: 'bfe', scope: 'com.itgfin.bfe(横跨 master-data-service-domain 与 master-data-service-app 下该包;含 TmsBfeFlowHistoryController + BfeTaskSyncJobController);注意 TMS→BFE 非业务流水的 MQ 消费入口 RabbitMqConsumer.receiveTmsToBfe 物理在 masterdata/config、调 BfeApiService 制证' },
  { name: 'fin', scope: 'com.itgfin.fin(domain + app;含 FinProvisionRate*/FinApiController)' },
]

const SCORECARD = {
  type: 'object', additionalProperties: false,
  required: ['module', 'capabilities', 'validate_pass', 'dimension_coverage', 'completeness', 'blind_spots', 'hallucinations', 'summary'],
  properties: {
    module: { type: 'string' },
    capabilities: { type: 'array', items: { type: 'string' }, description: '产出的 capability 名 + 各自 requirement/scenario 数' },
    validate_pass: { type: 'string', enum: ['all_pass', 'partial', 'fail'], description: 'openspec validate --strict 结果' },
    dimension_coverage: {
      type: 'object', additionalProperties: false,
      required: ['covered', 'partial', 'blind_spot'],
      properties: {
        covered: { type: 'array', items: { type: 'string' } },
        partial: { type: 'array', items: { type: 'string' } },
        blind_spot: { type: 'array', items: { type: 'string' } },
      },
      description: '对照行为维度清单(同步HTTP端点/状态机/状态消费/数据模型/跨模块依赖/入站回调 | 出站失败传播/事务/文件导入导出/成功响应信封/错误响应/分页过滤 | 定时调度/MQ消费/MQ发布/启动钩子/审计留痕/异步最终一致/鉴权前置/缓存/幂等/并发锁/配置开关/环境profile/请求校验/文件列格式/国际化时区)逐项判 spec 是否覆盖',
    },
    completeness: {
      type: 'object', additionalProperties: false,
      required: ['http_endpoints_found', 'http_endpoints_in_spec', 'external_entries_found', 'external_entries_in_spec', 'non_http_entries_found', 'non_http_entries_in_spec', 'crosscut_found', 'crosscut_in_spec', 'notes'],
      properties: {
        http_endpoints_found: { type: 'integer', description: '本模块自有 Controller 的 @*Mapping 端点数' },
        http_endpoints_in_spec: { type: 'integer' },
        external_entries_found: { type: 'integer', description: '四类位置里②共享网关+③同步Controller群中属本模块的端点数(grep 调本模块 Service 的端点)' },
        external_entries_in_spec: { type: 'integer', description: '其中 spec 覆盖的(B3 四类位置泛化检验)' },
        non_http_entries_found: { type: 'integer', description: 'grep @Scheduled(活)/@RabbitListener/CommandLineRunner 等' },
        non_http_entries_in_spec: { type: 'integer' },
        crosscut_found: { type: 'array', items: { type: 'string' } },
        crosscut_in_spec: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
    },
    blind_spots: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['dimension', 'evidence'], properties: { dimension: { type: 'string' }, evidence: { type: 'string' } } } },
    hallucinations: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['claim', 'why'], properties: { claim: { type: 'string' }, why: { type: 'string', description: '与代码相反/查无实据的证据' } } }, description: 'spec 写了但代码查无实据或相反(回归重点:优化后应仍为 0 硬编造)' },
    summary: { type: 'string' },
  },
}

const ctx = (m) => `## 上下文变量
- MODULE_NAME = ${m.name}
- PROJECT_ROOT = ${PROJ}
- BACKEND_ROOT = ${BE}
- SCRATCHPAD_DIR = ${SCRATCH}/${m.name}
- SPECS_ROOT = ${SPECS}
- MODULE_SCOPE = ${m.scope}
- WEB_STRATEGY_PATH = ${WEB}
- ORM_STRATEGY_PATH = ${ORM}
- RPC_STRATEGY_PATH = ${RPC}`

const s1_boundary = (_, m) => agent(
  `你是 module-spec-baseline 的边界分析子 Agent。先 \`mkdir -p ${SCRATCH}/${m.name}\`,再读取并严格执行模板 ${SKILL}/agents/boundary-agent.md(通用约定见 ../shared/agent-preamble.md)。\n${ctx(m)}\n把产物写入 SCRATCHPAD_DIR/module-boundary.md,按模板返回。${NO_STEER}`,
  { label: `boundary:${m.name}`, phase: 'Boundary', effort: 'high' })

const s2_analyze = (_, m) => parallel([
  () => agent(`你是结构追踪分析子 Agent。读取并严格执行 ${SKILL}/agents/structural-agent.md(会先读 SCRATCHPAD_DIR/module-boundary.md)。\n${ctx(m)}\n产物写 SCRATCHPAD_DIR/structure-analysis.md。${NO_STEER}`,
    { label: `struct:${m.name}`, phase: 'Analyze', effort: 'high' }),
  () => agent(`你是领域与状态建模子 Agent。读取并严格执行 ${SKILL}/agents/domain-agent.md(会先读 module-boundary.md;状态分类依据 ../references/state-classification.md)。\n${ctx(m)}\n- HAS_STATUS_ENUM = (自行从 module-boundary.md 的状态枚举清单判定)\n- HAS_CALLBACK_CONTROLLER = (自行从回调清单判定)\n产物写 SCRATCHPAD_DIR/domain-modeling.md。${NO_STEER}`,
    { label: `domain:${m.name}`, phase: 'Analyze', effort: 'high' }),
]).then(() => 'analyzed')

const s3_plan = (_, m) => agent(
  `你执行 module-spec-baseline 编排层的 A-4「能力划分」。读 ${SCRATCH}/${m.name}/module-boundary.md 的回调清单 + 外置入口清单 + 在 ${BE} 下 grep 本模块(${m.scope})对外入口面:各 Controller 的 @*Mapping 方法、Service 对外方法,**并务必连公共网关 ${BE}/.../masterdata/controller/ApiController.java 与同步 Controller 群(TaskSyncJobController 等)一起扫**(按行切出调本模块 Service 的端点)。按**行为域**把入口归并成若干 capability,kebab 命名(按行为非模块名),检查 ${SPECS}/ 下已有名避免冲突。把 capability→覆盖的端点/Service入口/状态域 映射写入 ${SCRATCH}/${m.name}/capability-plan.md。返回 capability 列表。${NO_STEER}`,
  { label: `plan:${m.name}`, phase: 'Plan', effort: 'high' })

const s4_synth = (_, m) => agent(
  `你是 spec-synthesis 子 Agent。读取并严格执行 ${SKILL}/agents/spec-synthesis-agent.md(格式权威见 ../references/openspec-spec-format.md)。读 ${SCRATCH}/${m.name}/ 下 module-boundary.md + structure-analysis.md + domain-modeling.md + capability-plan.md,逐 capability 写 ${SPECS}/<capability>/spec.md(行为优先,禁实现细节,每条 SHALL + ≥1 场景四井号)。\n${ctx(m)}\n返回写了哪些 capability。${NO_STEER}`,
  { label: `synth:${m.name}`, phase: 'Synthesize', effort: 'high' })

const s5_verify = (_, m) => agent(
  `你是 verification 子 Agent。读取并严格执行 ${SKILL}/agents/verification-agent.md:对 ${SPECS}/ 下本模块草拟的 capability 做 grounding(每条落到 ${BE} 真实代码)+ 核对门(高危断言主动证伪)+ 跨层契约一致性 + 对照 ${SCRATCH}/${m.name}/capability-plan.md 的行为域完整性回扣。\n${ctx(m)}\n- CAPABILITY_PLAN 见 ${SCRATCH}/${m.name}/capability-plan.md\n返回逐条裁决(确认/打回/丢弃/[待验证])+ 降级清单。${NO_STEER}`,
  { label: `verify:${m.name}`, phase: 'Verify', effort: 'high' })

const s6_revise = (verdict, m) => agent(
  `你是 spec-synthesis 子 Agent 的收敛环节。下面是 verification 的裁决:\n${typeof verdict === 'string' ? verdict : JSON.stringify(verdict)}\n据此就地修正 ${SPECS}/ 下本模块(${m.name})相关 capability 的 spec.md:打回项改措辞/丢弃/标[待验证],仅改这几条不全文重写,保持 openspec 格式(SHALL + 四井号场景)。改完返回简述。${NO_STEER}`,
  { label: `revise:${m.name}`, phase: 'Revise', effort: 'medium' })

const s7_score = (_, m) => agent(
  `给优化后 module-spec-baseline 在新模块「${m.name}」(${m.scope})上的产出**打回归分**。这是泛化回归(模块未参与调优),要客观、可复测。

步骤:
1. 列出 ${SPECS}/ 下属于本模块的 capability(读 ${SCRATCH}/${m.name}/capability-plan.md 对照),对每个跑 \`cd ${PROJ} && openspec validate <capability> --type spec --strict\`,记录 all_pass/partial/fail。
2. 读这些 spec.md 全文。
3. **维度覆盖**:对照 schema 描述里那张行为维度清单,逐维判 covered/partial/blind_spot。
4. **完整度(用 grep 当分母)**:在 ${BE} 下 grep 本模块——自有 Controller @*Mapping 端点数;**四类位置外置入口**(②公共网关 ApiController + ③同步 Controller 群 TaskSyncJobController/BfeTaskSyncJobController 等里调本模块 Service 的端点,按行数)填 external_entries;@Scheduled(活)/@RabbitListener 非HTTP入口;横切标记。再数 spec 实际覆盖多少,填 completeness。
5. **真盲区**:GMZB 确有、spec 漏掉的真实行为,逐条给代码证据。
6. **编造(回归重点)**:spec 写了但代码查无实据或相反的,逐条列(优化后应仍 0 硬编造;**特别核查否定/绝对/拒绝/鉴权类断言是否被代码证伪**)。
7. 一句话回归画像。

只读不改 spec。${NO_STEER.replace('不要进入计划模式,直接用 Write 落盘。','')}`,
  { label: `score:${m.name}`, phase: 'ScoreValidate', schema: SCORECARD, effort: 'high' })

const scorecards = (await pipeline(MODULES, s1_boundary, s2_analyze, s3_plan, s4_synth, s5_verify, s6_revise, s7_score)).filter(Boolean)

phase('Aggregate')
const summary = await agent(
  `下面是优化后 module-spec-baseline 在 4 个**未参与调优**的新模块上的回归打分卡:\n${JSON.stringify(scorecards, null, 1)}\n\n写一份简体中文、大白话的**泛化回归判定**:\n1. 一张跨模块汇总表(模块 × validate / 维度覆盖数(✅🟡🔴) / 自有HTTP端点完整度 / 外置入口(四类位置)完整度 / 非HTTP入口 / 真盲区数 / 编造数)。\n2. **B3 四类位置泛化检验**:employee 的网关5方法 + 同步群2端点(taskSyncEmpJob/taskSyncAddEmpJob)有没有被按行切出并写进 spec?organization/bfe 的同步群端点呢?\n3. **编造回归**:4 模块编造数,有没有硬编造(与代码相反)?核对门有没有失守?\n4. **横切/非HTTP/鉴权**:B1/B2/B4 的能力在新模块上是否同样生效(事务/审计/配置;定时/MQ消费;鉴权深读空壳不写)?\n5. **一句话结论**:优化后的 skill 在调优语料之外是否泛化干净、有无过拟合迹象。\n先结论后依据,别堆术语。`,
  { label: '泛化回归判定', phase: 'Aggregate', effort: 'high' })

return { scorecards, summary }

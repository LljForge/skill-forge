export const meta = {
  name: 'spec-baseline-current-baseline',
  description: '对 5 个代表模块忠实净跑当前 module-spec-baseline 完整管线,产出 openspec specs + 每模块固定打分卡,作为优化前基线',
  phases: [
    { title: 'Boundary', detail: '逐模块边界分析(boundary-agent)' },
    { title: 'Analyze', detail: '结构+领域并行分析(structural+domain)' },
    { title: 'Plan', detail: '能力划分(grep 入口含网关→行为域)' },
    { title: 'Synthesize', detail: '逐 capability 写 spec.md(spec-synthesis)' },
    { title: 'Verify', detail: 'grounding+完整性核验(verification)' },
    { title: 'Revise', detail: '据核验收敛' },
    { title: 'ScoreValidate', detail: 'openspec validate + 固定打分卡' },
    { title: 'Aggregate', detail: '汇总基线' },
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

const NO_STEER = `严格按模板原样执行,**绝不**额外提示去找鉴权/MQ/定时/缓存/校验/错误码等任何特定维度——本次是测 skill 现状,任何引导都会污染基线。不要进入计划模式,直接用 Write 落盘。`

const MODULES = [
  { name: 'tms', scope: 'com.itgfin.tms(横跨 master-data-service-domain 与 master-data-service-app 两个 Maven 子模块下的该包)' },
  { name: 'ccm-trip', scope: 'com.itgfin.ccm.trip(domain + app)' },
  { name: 'ccm-budget', scope: 'com.itgfin.ccm.budget(domain + app)' },
  { name: 'ccm-paybill', scope: 'com.itgfin.ccm.paybill(domain + app)' },
  { name: 'mdm-enterprise', scope: 'com.itgfin.masterdata 内的「企业客户」子域:Enterprise* 相关 Controller/Service/DAO/PO/VO + 同包(扁平 service/ 包)被 EnterpriseService 等 @Autowired 注入的依赖 + 公共网关 ApiController 中 enterprise 相关方法(searchEnterprise 等);**排除** employee/organization/dict/bankAccount/appCenter/syncLog 等其他子域' },
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
      description: '对照行为维度清单(同步HTTP端点/状态机/状态消费/数据模型/跨模块依赖/入站回调 | 出站失败传播/事务/文件导入导出/成功响应信封/错误响应/分页过滤 | 定时调度/MQ消费/MQ发布/启动钩子/审计留痕/异步最终一致/鉴权/令牌/缓存/幂等/并发锁/限流/配置开关/环境profile/请求校验/批量限额/文件列格式/国际化时区)逐项判 spec 是否覆盖',
    },
    completeness: {
      type: 'object', additionalProperties: false,
      required: ['http_endpoints_found', 'http_endpoints_in_spec', 'non_http_entries_found', 'non_http_entries_in_spec', 'crosscut_found', 'crosscut_in_spec', 'notes'],
      properties: {
        http_endpoints_found: { type: 'integer', description: 'grep @*Mapping 等枚举出的端点数(分母)' },
        http_endpoints_in_spec: { type: 'integer', description: 'spec 里有对应可观察行为的端点数' },
        non_http_entries_found: { type: 'integer', description: 'grep @Scheduled/@RabbitListener/CommandLineRunner 等枚举数' },
        non_http_entries_in_spec: { type: 'integer' },
        crosscut_found: { type: 'array', items: { type: 'string' }, description: 'grep 到的横切关注点(校验/错误码/缓存/事务/鉴权/配置开关/Excel...)' },
        crosscut_in_spec: { type: 'array', items: { type: 'string' }, description: '其中 spec 真的写进去的' },
        notes: { type: 'string' },
      },
    },
    blind_spots: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['dimension', 'evidence'], properties: { dimension: { type: 'string' }, evidence: { type: 'string', description: 'GMZB 真实代码证据(文件/命中)' } } }, description: 'GMZB 确有、spec 漏掉的真实行为' },
    hallucinations: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['claim', 'why'], properties: { claim: { type: 'string' }, why: { type: 'string' } } }, description: 'spec 写了但代码查无实据/相反的条目(可空)' },
    summary: { type: 'string', description: '该模块一句话基线画像' },
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
  `你执行 module-spec-baseline 编排层的 A-4「能力划分」。读 ${SCRATCH}/${m.name}/module-boundary.md 的回调清单 + 在 ${BE} 下 grep 本模块(${m.scope})对外入口面:各 Controller 的 @*Mapping 方法、Service 对外方法,**并务必连公共网关 ${BE}/.../masterdata/controller/ApiController.java 一起扫**(对外查询/保存可能在网关里、不在模块自己 Controller)。按**行为域**把入口归并成若干 capability,kebab 命名(按行为非模块名),检查 ${SPECS}/ 下已有名避免冲突。把 capability→覆盖的端点/Service入口/状态域 映射写入 ${SCRATCH}/${m.name}/capability-plan.md。返回 capability 列表。${NO_STEER}`,
  { label: `plan:${m.name}`, phase: 'Plan', effort: 'high' })

const s4_synth = (_, m) => agent(
  `你是 spec-synthesis 子 Agent。读取并严格执行 ${SKILL}/agents/spec-synthesis-agent.md(格式权威见 ../references/openspec-spec-format.md)。读 ${SCRATCH}/${m.name}/ 下 module-boundary.md + structure-analysis.md + domain-modeling.md + capability-plan.md,逐 capability 写 ${SPECS}/<capability>/spec.md(行为优先,禁实现细节,每条 SHALL + ≥1 场景四井号)。\n${ctx(m)}\n返回写了哪些 capability。${NO_STEER}`,
  { label: `synth:${m.name}`, phase: 'Synthesize', effort: 'high' })

const s5_verify = (_, m) => agent(
  `你是 verification 子 Agent。读取并严格执行 ${SKILL}/agents/verification-agent.md:对 ${SPECS}/ 下本模块草拟的 capability 做 grounding(每条落到 ${BE} 真实代码)+ 跨层契约一致性 + 对照 ${SCRATCH}/${m.name}/capability-plan.md 的行为域完整性回扣。\n${ctx(m)}\n- CAPABILITY_PLAN 见 ${SCRATCH}/${m.name}/capability-plan.md\n返回逐条裁决(确认/打回/丢弃/[待验证])。${NO_STEER}`,
  { label: `verify:${m.name}`, phase: 'Verify', effort: 'high' })

const s6_revise = (verdict, m) => agent(
  `你是 spec-synthesis 子 Agent 的收敛环节。下面是 verification 的裁决:\n${typeof verdict === 'string' ? verdict : JSON.stringify(verdict)}\n据此就地修正 ${SPECS}/ 下本模块(${m.name})相关 capability 的 spec.md:打回项改措辞/丢弃/标[待验证],仅改这几条不全文重写,保持 openspec 格式(SHALL + 四井号场景)。改完返回简述。${NO_STEER}`,
  { label: `revise:${m.name}`, phase: 'Revise', effort: 'medium' })

const s7_score = (_, m) => agent(
  `给当前 module-spec-baseline 在模块「${m.name}」(${m.scope})上的产出**打基线分**。这是优化前基线,要客观、可复测。

步骤:
1. 列出 ${SPECS}/ 下属于本模块的 capability(读 ${SCRATCH}/${m.name}/capability-plan.md 对照),对每个跑 \`cd ${PROJ} && openspec validate <capability> --type spec --strict\`,记录 all_pass/partial/fail。
2. 读这些 spec.md 全文。
3. **维度覆盖**:对照 schema 描述里那张行为维度清单,逐维判 covered/partial/blind_spot(以 spec 文本是否有对应可观察行为为准)。
4. **完整度(用 grep 当分母)**:在 ${BE} 下 grep 本模块——@*Mapping 端点数、@Scheduled/@RabbitListener/CommandLineRunner 非 HTTP 入口数、横切标记(@Valid/JSR-303、@ExceptionHandler/Result.fail、@Cacheable/redisTemplate、@Transactional、@RabbitListener、@Scheduled、@RequiresPermissions/Shiro、@ExcelProperty、@Value 开关)。再数 spec 里实际覆盖了多少,填 completeness。
5. **真盲区**:GMZB 确有、spec 漏掉的真实行为,逐条给代码证据。
6. **编造**:spec 写了但代码查无实据或相反的,逐条列(没有就空)。
7. 一句话基线画像。

只读不改 spec。${NO_STEER.replace('不要进入计划模式,直接用 Write 落盘。','')}`,
  { label: `score:${m.name}`, phase: 'ScoreValidate', schema: SCORECARD, effort: 'high' })

const scorecards = (await pipeline(MODULES, s1_boundary, s2_analyze, s3_plan, s4_synth, s5_verify, s6_revise, s7_score)).filter(Boolean)

phase('Aggregate')
const summary = await agent(
  `下面是当前 module-spec-baseline 在 5 个代表模块上的基线打分卡:\n${JSON.stringify(scorecards, null, 1)}\n\n写一份简体中文、大白话的**优化前基线总览**:\n1. 一张跨模块汇总表(模块 × validate / 维度覆盖数(✅🟡🔴) / HTTP端点完整度 / 非HTTP入口完整度 / 真盲区数 / 编造数)。\n2. 跨模块共性盲区 top(哪些维度 5 个模块普遍漏)。\n3. 哪个模块产出最完整、哪个最差,为什么。\n4. 这套基线数字将作为优化效果的对照尺——明确指出"优化后该看哪几个数字升/降"。\n先结论后依据,别堆术语。`,
  { label: '基线总览', phase: 'Aggregate', effort: 'high' })

return { scorecards, summary }
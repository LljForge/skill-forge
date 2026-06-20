export const meta = {
  name: 'validate-binary-ruler',
  description: '验证"目标维度二值检查"尺子的稳定性:3 个独立 agent 同提示判读现有 specs,出 5维×5模块网格,比一致率',
  phases: [
    { title: 'Judge', detail: '3 遍独立判定(同提示)' },
    { title: 'Agreement', detail: '比对三遍一致率 + 出共识网格' },
  ],
}

const SPECS = '/Users/lilongjian/Projects/GMZB/master-data/openspec/specs'

const MODULES = {
  tms: ['treasury-payment-sync','treasury-receipt-sync','treasury-provision-sync','treasury-transaction-flow-generation','treasury-rerun-recovery','treasury-payment-record-maintenance','treasury-receipt-record-maintenance','treasury-provision-record-maintenance','treasury-task-log'],
  'ccm-trip': ['trip-data-acquisition','trip-data-query','trip-settlement-maintenance','trip-bill-reconciliation'],
  'ccm-budget': ['budget-master-data-management','budget-summary-management','bill-budget-execution','budget-actual-comparison','budget-access-authorization','budget-reminder-and-sync','budget-attachment-management'],
  'ccm-paybill': ['payment-bill-lifecycle','accounting-voucher-generation'],
  'mdm-enterprise': ['enterprise-customer-registration','enterprise-customer-query','enterprise-customer-import','enterprise-business-info-enrichment'],
}

const DIMS = `
判定 5 个横切维度(B1 目标维度),每个维度的 **YES 门槛**(必须 spec 文本真有对应可观察 Scenario/Requirement,不是 Purpose 里捎一句):
- **tx(事务回滚/原子性)**:有 Scenario 描述"一组写操作部分失败时整批回滚 / 不留脏数据",或失败补偿/重试自愈作为可观察结果。
- **audit(审计留痕)**:有 Requirement/Scenario 描述"操作或外呼会留下**可查询的日志记录**"(操作日志/操作人/外呼请求响应留痕)。**排除**:仅向业务实体写一个"同步成功/失败"状态标志 ≠ audit(那是状态字段,不是日志留痕)。
- **config(配置/凭据/环境驱动)**:有 Requirement/Scenario 描述某行为**受配置开关/凭据/环境(profile)控制 → 可观察地启停或分叉**(如开关关→行为不发生、某 cron 仅特定环境跑、外呼凭据来自配置)。**排除**:仅"有个可配置的接收人/地址"而行为本身不随配置启停 ≠ config。
- **sign(出站签名/令牌,仅出站)**:有描述"**系统对下游外呼**携带签名/令牌/鉴权,签名错被下游拒"的可观察契约。**排除**:入站验签(校验外部传入的签名再放行)≠ sign(那属访问控制维度)。
- **mq(MQ发布/异步最终一致)**:有描述"操作成功后**显式向消息队列发消息**推动下游",或"**明确异步**(接口返回成功≠下游已就绪、后台异步处理)"的可观察契约。**排除**:同步外呼下游、只是失败不阻断主流程 ≠ mq(那是同步调用 + 异常隔离)。

每个 (模块 × 维度) 给一个 verdict:
- **YES**:spec 里确有 → evidence 摘录那条 Scenario/Requirement 的关键句(≤30 字)。
- **NO**:spec 里没有(无论该模块该不该有)。
- **N_A**:该模块业务域**根本没有**这类行为(如纯读模块无事务)→ evidence 一句话说明为何不适用。
判不准时默认 NO(宁可判没有,不要脑补)。
`

const GRID_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['cells'],
  properties: { cells: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['module','dim','verdict','evidence'],
    properties: {
      module: { type: 'string', enum: Object.keys(MODULES) },
      dim: { type: 'string', enum: ['tx','audit','config','sign','mq'] },
      verdict: { type: 'string', enum: ['YES','NO','N_A'] },
      evidence: { type: 'string' },
    } } } },
}

const judgePrompt = `你是 spec 契约二值判定器。读取下列 5 个模块对应的 openspec spec.md,逐个判定 5 个横切维度在 spec 里"有没有",出一张 25 格网格。

specs 根目录:${SPECS}/<capability>/spec.md
模块 → capability 文件:
${Object.entries(MODULES).map(([m,caps])=>`- ${m}: ${caps.join(', ')}`).join('\n')}

${DIMS}

只读 spec、不读源码(本步只判"spec 写没写",不判对错)。对每个模块读全其 capability 的 spec.md 再判。输出全部 25 格(5 模块 × 5 维度)。`

phase('Judge')
const passes = await parallel([0,1,2].map(i => () =>
  agent(judgePrompt, { label: `judge#${i+1}`, phase: 'Judge', schema: GRID_SCHEMA, effort: 'high' })
))

phase('Agreement')
const valid = passes.filter(Boolean)
const mods = Object.keys(MODULES), dims = ['tx','audit','config','sign','mq']
const get = (p,m,d) => { const c=(p?.cells||[]).find(x=>x.module===m&&x.dim===d); return c?c.verdict:'?' }
let unanimous=0, total=0
const rows=[]
const splits=[]
for(const m of mods) for(const d of dims){
  total++
  const vs = valid.map(p=>get(p,m,d))
  const uniq=[...new Set(vs)]
  const allSame = uniq.length===1
  if(allSame) unanimous++
  // 多数票
  const counts={}; vs.forEach(v=>counts[v]=(counts[v]||0)+1)
  const majority=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0]
  rows.push({module:m,dim:d,verdicts:vs.join('/'),consensus: allSame?majority:`${majority}?`,unanimous:allSame})
  if(!allSame) splits.push({module:m,dim:d,verdicts:vs.join('/')})
}
const rate = total? (unanimous/total*100).toFixed(0):0
log(`三遍一致率:${unanimous}/${total} 格三遍完全一致 = ${rate}%；分歧 ${splits.length} 格`)

return {
  judges: valid.length,
  agreement: { unanimous, total, rate_pct: Number(rate), split_cells: splits },
  consensus_grid: rows,
  raw_passes: valid,
}
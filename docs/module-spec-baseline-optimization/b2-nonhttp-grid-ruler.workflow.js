export const meta = {
  name: 'b2-nonhttp-grid-ruler',
  description: 'B2 门1:非 HTTP 入口二值网格(定时/调度 + MQ入站消费)× 5 模块,3 遍独立判读求一致率;只读 spec 判"写没写",对错由外部 ground truth 比对',
  phases: [
    { title: 'Judge', detail: '3 遍独立判定(同提示,只读 spec)' },
    { title: 'Agreement', detail: '三遍一致率 + 共识网格' },
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
判定 2 个**非 HTTP 入口**维度,每个维度的 **YES 门槛**(spec 文本里**真有**对应可观察 Requirement/Scenario,不是 Purpose 里捎一句):
- **sched(定时/调度入口)**:有 Requirement/Scenario 描述"**无请求驱动、按预置调度周期自动触发**的行为"(到点自动同步/拉取/对账/发通知),且写成可观察后果。**排除**:由 HTTP 端点手动触发的同名业务(那是端点不是定时入口)——除非 spec 明写"按调度周期/到达调度时刻自动执行"。
- **mqcons(MQ 入站消费入口)**:有 Requirement/Scenario 描述"**收到某消息即触发处理、产生下游可观察后果**"(WHEN 收到X消息 / THEN 下游状态变化)。**排除**:"本接口返回成功≠下游已完成"这类**出站发布/异步最终一致**(那是出站维度,不是入站消费入口)。

每个 (模块 × 维度) 给一个 verdict:
- **YES**:spec 里确有 → evidence 摘录那条 Requirement/Scenario 关键句(≤30 字)。
- **NO**:spec 里没有(无论该模块该不该有)。
- **N_A**:该模块业务域**根本没有**这类入口 → evidence 一句话说明。
判不准时默认 NO(宁可判没有,不脑补)。

**机制词泄漏旁路检查**:若某 YES 格的 spec 文本里出现实现机制词(cron 表达式 / @Scheduled / @RabbitListener / RabbitMQ / Kafka / Quartz / 线程 / 异步线程),在该格 evidence 末尾追加" ⚠️机制词:<命中词>"。
`

const GRID_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['cells'],
  properties: { cells: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['module','dim','verdict','evidence'],
    properties: {
      module: { type: 'string', enum: Object.keys(MODULES) },
      dim: { type: 'string', enum: ['sched','mqcons'] },
      verdict: { type: 'string', enum: ['YES','NO','N_A'] },
      evidence: { type: 'string' },
    } } } },
}

const judgePrompt = `你是 spec 契约二值判定器。读取下列 5 个模块对应的 openspec spec.md,逐个判定 2 个非 HTTP 入口维度在 spec 里"有没有",出一张 10 格网格。

specs 根目录:${SPECS}/<capability>/spec.md
模块 → capability 文件:
${Object.entries(MODULES).map(([m,caps])=>`- ${m}: ${caps.join(', ')}`).join('\n')}

${DIMS}

只读 spec、不读源码(本步只判"spec 写没写",不判对错)。对每个模块读全其 capability 的 spec.md 再判。输出全部 10 格(5 模块 × 2 维度)。`

phase('Judge')
const passes = await parallel([0,1,2].map(i => () =>
  agent(judgePrompt, { label: `judge#${i+1}`, phase: 'Judge', schema: GRID_SCHEMA, effort: 'high' })
))

phase('Agreement')
const valid = passes.filter(Boolean)
const mods = Object.keys(MODULES), dims = ['sched','mqcons']
const get = (p,m,d) => { const c=(p?.cells||[]).find(x=>x.module===m&&x.dim===d); return c?c.verdict:'?' }
const getEv = (p,m,d) => { const c=(p?.cells||[]).find(x=>x.module===m&&x.dim===d); return c?c.evidence:'' }
let unanimous=0, total=0
const rows=[]
const splits=[]
for(const m of mods) for(const d of dims){
  total++
  const vs = valid.map(p=>get(p,m,d))
  const uniq=[...new Set(vs)]
  const allSame = uniq.length===1
  if(allSame) unanimous++
  const counts={}; vs.forEach(v=>counts[v]=(counts[v]||0)+1)
  const majority=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0]
  // 收集任一遍标了机制词泄漏的 evidence
  const leak = valid.map(p=>getEv(p,m,d)).find(e=>e && e.includes('⚠️机制词')) || ''
  rows.push({module:m,dim:d,verdicts:vs.join('/'),consensus: allSame?majority:`${majority}?`,unanimous:allSame, leak})
  if(!allSame) splits.push({module:m,dim:d,verdicts:vs.join('/')})
}
const rate = total? (unanimous/total*100).toFixed(0):0
log(`三遍一致率:${unanimous}/${total} 格三遍完全一致 = ${rate}%；分歧 ${splits.length} 格`)
const leaks = rows.filter(r=>r.leak)
if(leaks.length) log(`⚠️ 机制词泄漏格:${leaks.map(r=>`${r.module}/${r.dim}`).join(', ')}`)

return {
  judges: valid.length,
  agreement: { unanimous, total, rate_pct: Number(rate), split_cells: splits },
  consensus_grid: rows,
  mechanism_leaks: leaks.map(r=>({module:r.module,dim:r.dim,evidence:r.leak})),
  ground_truth_note: 'trip.sched 期望 YES(2活定时); budget.sched 期望 NO(BudgetScheduleTask 两 @Scheduled 方法已注释/死壳); 其余模块 scope 内无非HTTP入口=N_A。YES≠对——budget.sched 若 YES 即编造,留门2 grounding 复核',
  raw_passes: valid,
}

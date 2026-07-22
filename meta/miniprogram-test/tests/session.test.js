const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const skillRoot = require('./skill-root');

const { prepareSession, runSession } = require(path.join(skillRoot, 'scripts/runtime/session'));

function temporaryOutput() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-testing-lite-'));
}

function createAdapter({
  failOn,
  commitDispatched = true,
  kind = 'test-double',
  devtoolsCliSource,
  failureCode,
  failureCategory,
  failWhen,
} = {}) {
  const calls = [];
  const invoke = async (name, ...args) => {
    calls.push([name, ...args]);
    if (failOn === name || (typeof failWhen === 'function' && failWhen(name, args))) {
      const error = new Error(`${name} 失败`);
      error.category = failureCategory || 'infrastructure';
      if (failureCode) error.code = failureCode;
      if (name === 'commit') error.commitDispatched = commitDispatched;
      throw error;
    }
  };

  return {
    kind,
    devtoolsCliSource,
    calls,
    start: () => invoke('start'),
    stop: () => invoke('stop'),
    open: (route) => invoke('open', route),
    arrangePageData: (data) => invoke('arrangePageData', data),
    tap: (target) => invoke('tap', target),
    commit: (target, options) => invoke('commit', target, options),
    fill: (target, value) => invoke('fill', target, value),
    expectText: (value) => invoke('expectText', value),
    expectVisible: (target) => invoke('expectVisible', target),
    expectDiagnostic: async (kind, messageIncludes) => {
      await invoke('expectDiagnostic', kind, messageIncludes);
      return { kind, level: 'info', message: messageIncludes };
    },
    screenshot: async (name) => {
      await invoke('screenshot', name);
      return `screenshots/${name}.png`;
    },
  };
}

function runPrepared(prepared, options = {}) {
  return runSession({
    casePath: prepared.casePath,
    reportDir: prepared.reportDir,
    contractDigest: prepared.plan.contractDigest,
    ...options,
  });
}

const readOnlySpec = {
  schemaVersion: 1,
  id: 'TC-HOME-001',
  title: '首页公开信息展示',
  objective: '验证首页能展示公开在售产品入口',
  inputSource: 'natural-language',
  mode: 'read-only',
  projectPath: '/example/miniprogram',
  identity: {
    source: 'current-devtools-session',
    required: false,
  },
  preconditions: ['微信开发者工具已打开目标项目'],
  sourceEvidence: [
    { path: 'pages/home/index.js', reason: '首页路由与产品查询逻辑' },
  ],
  verificationLayers: [
    { layer: 'runtime-ui', expected: '首页展示“热门产品”', status: 'planned' },
    { layer: 'backend', expected: '至少存在一个在售产品', status: 'not-verified', reason: '本轮未接入后台查询' },
    { layer: 'external', expected: '不涉及外部系统', status: 'not-applicable' },
  ],
  supplementalChecks: [
    { name: '页面标题静态回归', kind: 'static', status: 'passed', details: '标题渲染断言通过' },
    { name: '无产品空态静态回归', kind: 'static', status: 'passed', details: '空态渲染断言通过' },
  ],
  evidenceLevel: 'runtime-ui',
  screenshotPolicy: 'safe-only',
  stateChanges: [],
  cleanupPolicy: 'not-applicable',
  steps: [
    { action: 'open', path: '/pages/home/index' },
    { action: 'expectText', text: '热门产品' },
    { action: 'screenshot', name: 'home' },
  ],
};

const statefulSpec = {
  schemaVersion: 1,
  id: 'TC-BANK-001',
  title: '银行卡绑定',
  mode: 'stateful',
  projectPath: '/example/miniprogram',
  evidenceLevel: 'runtime-ui',
  screenshotPolicy: 'safe-only',
  stateChanges: ['创建银行卡绑定关系'],
  cleanupPolicy: 'not-allowed',
  submissionPolicy: {
    uiAttempts: 1,
    clientReplayRisk: 'possible',
    networkAttemptsObservable: false,
    reason: '统一请求封装在首次 401 后可能重放原 POST 请求',
  },
  testData: {
    cardNumber: {
      env: 'TEST_BANK_CARD',
      sensitive: true,
      description: '测试银行卡号',
    },
  },
  steps: [
    { action: 'open', path: '/pages/bank-card/create' },
    {
      action: 'arrangePageData',
      arrangementId: 'open-manual-card-form',
      data: { showAddCardDialog: true },
      reason: '跳过无法稳定自动化的系统选图器，仅打开页面已有的手工录入表单',
      evidenceImpact: '不覆盖 OCR 选图，只验证手工录入、提交和结果回显',
    },
    { action: 'fill', target: '银行卡号', dataKey: 'cardNumber' },
    { action: 'commit', commitId: 'bind-bank-card', target: '.confirm-bind' },
    { action: 'expectText', text: '绑定成功' },
  ],
};

const authenticatedReadSpec = {
  ...readOnlySpec,
  id: 'TC-BANK-READ-001',
  title: '当前账号银行卡列表只读查看',
  objective: '验证当前开发者工具微信身份能够读取已有银行卡列表',
  mode: 'authenticated-read',
  identity: {
    source: 'current-devtools-session',
    required: true,
  },
  verificationLayers: [
    { layer: 'runtime-ui', expected: '银行卡页面展示至少一张卡片', status: 'planned' },
    { layer: 'authenticated-business', expected: '当前微信身份能够读取其已有银行卡', status: 'planned' },
    { layer: 'backend', expected: '数据库记录与页面一致', status: 'not-verified', reason: '本轮未直接查询数据库' },
    { layer: 'external', expected: '不涉及外部系统', status: 'not-applicable' },
  ],
  evidenceLevel: 'authenticated-business',
  evidenceLevels: ['runtime-ui', 'authenticated-business'],
  steps: [
    { action: 'open', path: '/subpackages/other/bank-card/bank-card' },
    { action: 'expectText', text: '我的银行卡' },
    { action: 'expectVisible', target: '.card-item' },
    { action: 'screenshot', name: 'bank-card-list' },
  ],
};

test('准备只读会话只生成方案、可读脚本和报告目录', () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: readOnlySpec,
    outputRoot,
    runId: '20260721T100000',
  });

  assert.equal(prepared.plan.stateChangeApprovalRequired, false);
  assert.equal(prepared.plan.retry, 'never');
  assert.equal(prepared.plan.attempts, 1);
  assert.match(prepared.plan.contractDigest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(fs.readdirSync(outputRoot).sort(), ['cases', 'reports']);
  assert.match(fs.readFileSync(prepared.casePath, 'utf8'), /await t\.open\('\/pages\/home\/index'\)/);
  assert.match(fs.readFileSync(prepared.casePath, 'utf8'), /await t\.expectText\('热门产品'\)/);
  const planText = fs.readFileSync(prepared.planPath, 'utf8');
  assert.match(planText, /首页公开信息展示/);
  assert.match(planText, /pages\/home\/index\.js/);
  assert.match(planText, /current-devtools-session/);
  assert.match(planText, /后台.*未验证/);
  assert.match(planText, new RegExp(prepared.plan.contractDigest));
  assert.equal(
    path.relative(outputRoot, prepared.casePath),
    path.join('cases', '20260721T100000', 'TC-HOME-001.js'),
  );
});

test('准备阶段拒绝不安全产物标识且不允许路径越界', () => {
  const root = temporaryOutput();
  const outputRoot = path.join(root, 'test-e2e-miniprogram');

  assert.throws(
    () => prepareSession({
      spec: { ...readOnlySpec, id: '../../escaped-case' },
      outputRoot,
      runId: 'safe-run',
    }),
    (error) => error.code === 'UNSAFE_ARTIFACT_IDENTIFIER',
  );
  assert.throws(
    () => prepareSession({
      spec: readOnlySpec,
      outputRoot,
      runId: '../../escaped-run',
    }),
    (error) => error.code === 'UNSAFE_ARTIFACT_IDENTIFIER',
  );
  assert.equal(fs.existsSync(path.join(root, 'escaped-case.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'escaped-run')), false);
});

test('准备阶段要求绝对输出目录且拒绝前不写入文件', () => {
  const root = temporaryOutput();
  const relativeOutput = path.relative(process.cwd(), path.join(root, 'relative-output'));

  assert.throws(
    () => prepareSession({
      spec: readOnlySpec,
      outputRoot: relativeOutput,
      runId: 'safe-run',
    }),
    (error) => error.code === 'OUTPUT_ROOT_NOT_ABSOLUTE',
  );
  assert.equal(fs.existsSync(path.join(root, 'relative-output')), false);
});

test('同一 run-id 不得重复准备且不会改写已有方案或脚本', () => {
  const outputRoot = temporaryOutput();
  const first = prepareSession({
    spec: readOnlySpec,
    outputRoot,
    runId: '20260722T110001',
  });
  const originalCase = fs.readFileSync(first.casePath, 'utf8');
  const originalPlan = fs.readFileSync(first.planPath, 'utf8');

  assert.throws(
    () => prepareSession({
      spec: { ...readOnlySpec, title: '不得覆盖的变化' },
      outputRoot,
      runId: '20260722T110001',
    }),
    (error) => error.code === 'PREPARATION_ALREADY_EXISTS',
  );
  assert.equal(fs.readFileSync(first.casePath, 'utf8'), originalCase);
  assert.equal(fs.readFileSync(first.planPath, 'utf8'), originalPlan);
});

test('同一用例的不同 run-id 生成彼此隔离的脚本', () => {
  const outputRoot = temporaryOutput();
  const first = prepareSession({ spec: readOnlySpec, outputRoot, runId: '20260722T110002A' });
  const second = prepareSession({ spec: readOnlySpec, outputRoot, runId: '20260722T110002B' });

  assert.notEqual(first.casePath, second.casePath);
  assert.equal(fs.existsSync(first.casePath), true);
  assert.equal(fs.existsSync(second.casePath), true);
});

test('重复截图名称在准备阶段失败关闭', () => {
  assert.throws(
    () => prepareSession({
      spec: {
        ...readOnlySpec,
        id: 'TC-DUPLICATE-SCREENSHOT-001',
        steps: [
          { action: 'open', path: '/pages/home/index' },
          { action: 'screenshot', name: 'same-shot' },
          { action: 'screenshot', name: 'same-shot' },
        ],
      },
      outputRoot: temporaryOutput(),
      runId: '20260722T110003',
    }),
    (error) => error.code === 'DUPLICATE_SCREENSHOT_NAME',
  );
});

test('诊断断言进入绑定契约、执行证据和独立报告区块', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: {
      ...readOnlySpec,
      id: 'TC-DIAGNOSTIC-001',
      title: '刷新提示诊断',
      steps: [
        { action: 'open', path: '/pages/logs/index' },
        { action: 'tap', target: '刷新' },
        { action: 'expectDiagnostic', kind: 'toast', messageIncludes: '已刷新' },
      ],
    },
    outputRoot,
    runId: '20260721T100000D',
  });
  const adapter = createAdapter({ kind: 'devtools' });

  const caseText = fs.readFileSync(prepared.casePath, 'utf8');
  assert.match(caseText, /await t\.expectDiagnostic\('toast', '已刷新'\)/);
  assert.equal(prepared.plan.steps[2].target, 'toast:已刷新');

  const result = await runPrepared(prepared, { adapter });

  assert.equal(result.status, 'passed');
  assert.equal(result.diagnosticAssertions.length, 1);
  assert.deepEqual(result.diagnosticAssertions[0], {
    kind: 'diagnostic-assertion',
    action: 'expectDiagnostic',
    target: 'toast:已刷新',
    diagnosticKind: 'toast',
    messageIncludes: '已刷新',
    observedKind: 'toast',
    observedLevel: 'info',
    passed: true,
  });
  const report = fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8');
  assert.match(report, /已通过的诊断断言/);
  assert.match(report, /`toast` 包含“已刷新”：通过/);
  assert.match(report, /捕获的诊断事件/);
});

test('诊断事件未出现时用例失败且不能留下通过断言', async () => {
  const prepared = prepareSession({
    spec: {
      ...readOnlySpec,
      id: 'TC-DIAGNOSTIC-MISSING-001',
      steps: [
        { action: 'open', path: '/pages/logs/index' },
        { action: 'expectDiagnostic', kind: 'toast', messageIncludes: '不会出现' },
      ],
    },
    outputRoot: temporaryOutput(),
    runId: '20260721T100000E',
  });
  const adapter = createAdapter({ kind: 'devtools', failOn: 'expectDiagnostic' });

  const result = await runPrepared(prepared, { adapter });

  assert.equal(result.status, 'failed');
  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.businessOutcome, 'failed');
  assert.deepEqual(result.diagnosticAssertions, []);
  assert.equal(adapter.calls.filter(([name]) => name === 'expectDiagnostic').length, 1);
});

test('诊断断言拒绝未知类型、长文本和疑似敏感值', () => {
  for (const [id, step, pattern] of [
    ['kind', { action: 'expectDiagnostic', kind: 'network', messageIncludes: '请求完成' }, /只支持/],
    ['long', { action: 'expectDiagnostic', kind: 'toast', messageIncludes: '长'.repeat(201) }, /不得超过 200/],
    ['sensitive', { action: 'expectDiagnostic', kind: 'toast', messageIncludes: 'accountNo=1234567890123456' }, /不得包含身份、凭据或疑似敏感值/],
  ]) {
    assert.throws(
      () => prepareSession({
        spec: {
          ...readOnlySpec,
          id: `TC-DIAGNOSTIC-INVALID-${id}`,
          steps: [step],
        },
        outputRoot: temporaryOutput(),
        runId: `20260721T100000-${id}`,
      }),
      pattern,
    );
  }
});

test('有状态会话未经明确批准时在 Adapter 启动前阻断', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot,
    runId: '20260721T100001',
  });
  const adapter = createAdapter();

  await assert.rejects(
    runPrepared(prepared, {
      adapter,
      runtimeData: { cardNumber: 'sensitive-card-runtime-value' },
    }),
    (error) => error.code === 'STATE_CHANGE_APPROVAL_REQUIRED',
  );
  assert.deepEqual(adapter.calls, []);
  assert.equal(fs.existsSync(path.join(prepared.reportDir, 'execution-claim.json')), false);
});

test('获准会话只执行一次并生成不泄露敏感数据的三格式报告', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot,
    runId: '20260721T100002',
  });
  const adapter = createAdapter();
  const sensitiveCard = 'sensitive-card-runtime-value';

  const result = await runPrepared(prepared, {
    adapter,
    runtimeData: { cardNumber: sensitiveCard },
    approveStateChange: true,
    approvedPlanDigest: prepared.plan.contractDigest,
  });

  assert.equal(result.status, 'not-verified');
  assert.equal(result.executionStatus, 'passed');
  assert.equal(result.businessOutcome, 'not-verified');
  assert.equal(result.attempts, 1);
  assert.equal(result.contract.preparedDigest, prepared.plan.contractDigest);
  assert.equal(result.contract.actualDigest, prepared.plan.contractDigest);
  assert.equal(result.contract.approvedDigest, prepared.plan.contractDigest);
  assert.equal(result.contract.approvalBound, true);
  assert.equal(adapter.calls.filter(([name]) => name === 'start').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'arrangePageData').length, 1);
  assert.ok(
    adapter.calls.findIndex(([name]) => name === 'arrangePageData')
      < adapter.calls.findIndex(([name]) => name === 'fill'),
  );
  assert.equal(adapter.calls.filter(([name]) => name === 'commit').length, 1);
  assert.equal(result.arrangements[0].arrangementId, 'open-manual-card-form');
  assert.equal(result.arrangements[0].status, 'applied');
  assert.equal(result.commits[0].commitId, 'bind-bank-card');
  assert.equal(result.commits[0].status, 'observed-success');
  assert.equal(result.commits[0].uiAttempts, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'stop').length, 1);
  const reportText = [
    fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8'),
    fs.readFileSync(path.join(prepared.reportDir, 'report.html'), 'utf8'),
    fs.readFileSync(path.join(prepared.reportDir, 'result.json'), 'utf8'),
  ].join('\n');
  assert.doesNotMatch(reportText, new RegExp(sensitiveCard));
  assert.match(reportText, /not-allowed/);
  assert.match(reportText, /声明的状态变化与清理政策/);
  assert.match(reportText, /提交前页面准备与证据边界/);
  assert.match(reportText, /不覆盖 OCR 选图/);
  assert.match(reportText, /状态变更批准绑定：是/);
});

test('缺少执行契约摘要时在加载用例和启动 Adapter 前阻断', async () => {
  const prepared = prepareSession({
    spec: readOnlySpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100002A',
  });
  const adapter = createAdapter();

  await assert.rejects(
    runSession({
      casePath: prepared.casePath,
      reportDir: prepared.reportDir,
      adapter,
    }),
    (error) => error.code === 'CONTRACT_DIGEST_REQUIRED',
  );
  assert.deepEqual(adapter.calls, []);
});

test('有状态批准缺少方案摘要时在 Adapter 启动前阻断', async () => {
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100002B',
  });
  const adapter = createAdapter();

  await assert.rejects(
    runPrepared(prepared, {
      adapter,
      approveStateChange: true,
    }),
    (error) => error.code === 'STATEFUL_PLAN_DIGEST_REQUIRED',
  );
  assert.deepEqual(adapter.calls, []);
});

test('有状态批准摘要错配时在 Adapter 启动前阻断', async () => {
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100002C',
  });
  const adapter = createAdapter();

  await assert.rejects(
    runPrepared(prepared, {
      adapter,
      approveStateChange: true,
      approvedPlanDigest: 'sha256:wrong-plan',
    }),
    (error) => error.code === 'STATEFUL_PLAN_DIGEST_MISMATCH',
  );
  assert.deepEqual(adapter.calls, []);
});

test('准备后脚本发生变化时即使声称获批也不能启动 Adapter', async () => {
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100002D',
  });
  const adapter = createAdapter();
  fs.appendFileSync(prepared.casePath, "\n// 方案展示后发生的脚本变化\n");

  await assert.rejects(
    runPrepared(prepared, {
      adapter,
      approveStateChange: true,
      approvedPlanDigest: prepared.plan.contractDigest,
    }),
    (error) => error.code === 'CONTRACT_DIGEST_MISMATCH',
  );
  assert.deepEqual(adapter.calls, []);
});

test('同一报告目录只能执行一次且重复调用不会启动 Adapter', async () => {
  const prepared = prepareSession({
    spec: readOnlySpec,
    outputRoot: temporaryOutput(),
    runId: '20260722T110004',
  });
  const firstAdapter = createAdapter();
  const first = await runPrepared(prepared, { adapter: firstAdapter });
  const resultPath = path.join(prepared.reportDir, 'result.json');
  const originalResult = fs.readFileSync(resultPath, 'utf8');
  const secondAdapter = createAdapter();

  await assert.rejects(
    runPrepared(prepared, { adapter: secondAdapter }),
    (error) => error.code === 'RUN_ALREADY_CLAIMED',
  );

  assert.equal(first.executionStatus, 'passed');
  assert.equal(firstAdapter.calls.filter(([name]) => name === 'start').length, 1);
  assert.equal(secondAdapter.calls.length, 0);
  assert.equal(fs.readFileSync(resultPath, 'utf8'), originalResult);
  const claim = JSON.parse(fs.readFileSync(path.join(prepared.reportDir, 'execution-claim.json'), 'utf8'));
  assert.equal(claim.schemaVersion, 1);
  assert.equal(claim.contractDigest, prepared.plan.contractDigest);
  assert.equal(claim.caseId, readOnlySpec.id);
  assert.match(
    fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8'),
    /单次执行声明：`execution-claim\.json`/,
  );
});

test('并发执行同一报告目录时只有一个调用取得执行声明', async () => {
  const prepared = prepareSession({
    spec: readOnlySpec,
    outputRoot: temporaryOutput(),
    runId: '20260722T110005',
  });
  const firstAdapter = createAdapter();
  const secondAdapter = createAdapter();

  const outcomes = await Promise.allSettled([
    runPrepared(prepared, { adapter: firstAdapter }),
    runPrepared(prepared, { adapter: secondAdapter }),
  ]);

  assert.equal(outcomes.filter((item) => item.status === 'fulfilled').length, 1);
  const rejected = outcomes.find((item) => item.status === 'rejected');
  assert.equal(rejected.reason.code, 'RUN_ALREADY_CLAIMED');
  const starts = [...firstAdapter.calls, ...secondAdapter.calls]
    .filter(([name]) => name === 'start').length;
  assert.equal(starts, 1);
});

test('执行失败不自动重试并保留失败分类报告', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: readOnlySpec,
    outputRoot,
    runId: '20260721T100003',
  });
  const adapter = createAdapter({ failOn: 'expectText' });

  const result = await runPrepared(prepared, {
    adapter,
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.businessOutcome, 'not-verified');
  assert.equal(result.attempts, 1);
  assert.equal(result.failure.category, 'infrastructure');
  assert.equal(adapter.calls.filter(([name]) => name === 'expectText').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'start').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'stop').length, 1);
  assert.match(fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8'), /infrastructure/);
});

test('报告保留分层证据、CLI 来源并明确未验证的后台层级', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: readOnlySpec,
    outputRoot,
    runId: '20260721T100004',
  });
  const adapter = createAdapter({ kind: 'devtools', devtoolsCliSource: 'standard' });

  const result = await runPrepared(prepared, {
    adapter,
  });

  assert.equal(result.inputSource, 'natural-language');
  assert.deepEqual(result.sourceEvidence, readOnlySpec.sourceEvidence);
  assert.equal(result.verificationLayers[0].status, 'verified');
  assert.equal(result.verificationLayers[1].status, 'not-verified');
  assert.equal(result.verificationLayers[2].status, 'not-applicable');
  assert.equal(result.runtime.adapter, 'devtools');
  assert.equal(result.runtime.executionMode, 'real-devtools');
  assert.equal(result.runtime.devtoolsCliSource, 'standard');
  assert.equal(result.runtime.nodeBootstrap, 'current-process');
  assert.equal(result.executionStatus, 'passed');
  assert.equal(result.businessOutcome, 'verified');
  assert.equal(result.runtime.nodeVersion, process.version);
  assert.match(result.runtime.skillVersion, /^0\.(10|11|12)\./);
  assert.equal(result.supplementalChecks.length, 2);
  assert.equal(result.contract.preparedDigest, result.contract.actualDigest);
  assert.equal(result.contract.approvedDigest, null);
  assert.equal(result.contract.approvalBound, false);
  const report = fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8');
  assert.match(report, /来源代码证据/);
  assert.match(report, /运行时\/UI.*已验证/);
  assert.match(report, /后台.*未验证.*本轮未接入后台查询/);
  assert.match(report, /外部系统.*不适用/);
  assert.match(report, /执行环境/);
  assert.match(report, /real-devtools/);
  assert.match(report, /开发者工具 CLI 来源：`standard`/);
  assert.match(report, /Node 引导：`current-process`/);
  assert.match(report, /补充检查.*2\/2 通过/s);
  assert.match(report, /执行契约/);
  assert.match(report, /状态变更批准绑定：不适用/);
  const htmlReport = fs.readFileSync(path.join(prepared.reportDir, 'report.html'), 'utf8');
  assert.match(htmlReport, /开发者工具 CLI 来源：`standard`/);
  const structuredReport = JSON.parse(fs.readFileSync(path.join(prepared.reportDir, 'result.json'), 'utf8'));
  assert.equal(structuredReport.runtime.devtoolsCliSource, 'standard');
});

test('Adapter 启动权限失败不冒充业务失败并保留机器错误码', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: readOnlySpec,
    outputRoot,
    runId: '20260722T100004P',
  });
  const adapter = createAdapter({
    kind: 'devtools',
    devtoolsCliSource: 'standard',
    failOn: 'start',
    failureCode: 'AUTOMATION_PORT_PERMISSION_DENIED',
    failureCategory: 'environment-permission',
  });

  const result = await runPrepared(prepared, { adapter });

  assert.equal(result.status, 'failed');
  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.businessOutcome, 'not-verified');
  assert.deepEqual(result.failure, {
    code: 'AUTOMATION_PORT_PERMISSION_DENIED',
    category: 'environment-permission',
    message: 'start 失败',
  });
  assert.equal(adapter.calls.filter(([name]) => name === 'start').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'stop').length, 0);
  assert.equal(result.verificationLayers[0].status, 'not-verified');
  const report = fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8');
  assert.match(report, /错误码：`AUTOMATION_PORT_PERMISSION_DENIED`/);
  assert.match(report, /业务结果：`not-verified`/);
});

test('只读用例聚合独立断言失败并继续后续断言与安全截图', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: {
      ...readOnlySpec,
      id: 'TC-READ-SOFT-ASSERTIONS-001',
      title: '只读断言证据完整性',
      steps: [
        { action: 'open', path: '/pages/home/index' },
        { action: 'expectText', text: '缺失文案一' },
        { action: 'expectVisible', target: '.present-card' },
        { action: 'expectText', text: '缺失文案二' },
        { action: 'screenshot', name: 'readonly-assertions' },
      ],
    },
    outputRoot,
    runId: '20260722T100004S',
  });
  const adapter = createAdapter({
    kind: 'devtools',
    devtoolsCliSource: 'standard',
    failureCode: 'ASSERTION_TEXT_NOT_FOUND',
    failureCategory: 'assertion',
    failWhen: (name, args) => name === 'expectText' && String(args[0]).startsWith('缺失文案'),
  });

  const result = await runPrepared(prepared, { adapter });

  assert.equal(result.status, 'failed');
  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.businessOutcome, 'failed');
  assert.equal(result.failure.code, 'ASSERTION_FAILED');
  assert.equal(result.failure.category, 'assertion');
  assert.equal(result.assertionFailures.length, 2);
  assert.deepEqual(result.assertionFailures.map((item) => item.target), ['缺失文案一', '缺失文案二']);
  assert.ok(result.assertionFailures.every((item) => item.code === 'ASSERTION_TEXT_NOT_FOUND'));
  assert.equal(adapter.calls.filter(([name]) => name === 'open').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'expectText').length, 2);
  assert.equal(adapter.calls.filter(([name]) => name === 'expectVisible').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'screenshot').length, 1);
  assert.equal(result.evidence.filter((item) => item.kind === 'assertion' && item.passed === false).length, 2);
  assert.equal(result.evidence.some((item) => item.action === 'expectVisible' && item.passed === true), true);
  assert.equal(result.screenshots.length, 1);
  assert.equal(result.verificationLayers[0].status, 'not-verified');
  const report = fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8');
  assert.match(report, /失败的只读断言/);
  assert.match(report, /缺失文案一/);
  assert.match(report, /缺失文案二/);
  assert.match(report, /业务结果：`failed`/);
});

test('认证只读诊断断言失败可以继续普通断言与安全截图', async () => {
  const prepared = prepareSession({
    spec: {
      ...authenticatedReadSpec,
      id: 'TC-AUTH-READ-SOFT-DIAGNOSTIC-001',
      steps: [
        { action: 'open', path: '/subpackages/other/bank-card/bank-card' },
        { action: 'expectDiagnostic', kind: 'toast', messageIncludes: '不会出现' },
        { action: 'expectVisible', target: '.card-item' },
        { action: 'screenshot', name: 'authenticated-read-diagnostic' },
      ],
    },
    outputRoot: temporaryOutput(),
    runId: '20260722T100004D',
  });
  const adapter = createAdapter({
    kind: 'devtools',
    devtoolsCliSource: 'standard',
    failOn: 'expectDiagnostic',
    failureCode: 'DIAGNOSTIC_EXPECTATION_NOT_MET',
    failureCategory: 'assertion',
  });

  const result = await runPrepared(prepared, { adapter });

  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.businessOutcome, 'failed');
  assert.equal(result.assertionFailures.length, 1);
  assert.equal(result.assertionFailures[0].code, 'DIAGNOSTIC_EXPECTATION_NOT_MET');
  assert.equal(adapter.calls.filter(([name]) => name === 'expectVisible').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'screenshot').length, 1);
  assert.equal(result.diagnosticAssertions.length, 0);
});

test('只读断言失败明细有界并保留实际失败总数', async () => {
  const assertionCount = 52;
  const prepared = prepareSession({
    spec: {
      ...readOnlySpec,
      id: 'TC-READ-ASSERTION-BOUND-001',
      steps: [
        { action: 'open', path: '/pages/home/index' },
        ...Array.from({ length: assertionCount }, (_, index) => ({
          action: 'expectText',
          text: `缺失文案-${index + 1}`,
        })),
        { action: 'screenshot', name: 'bounded-assertions' },
      ],
    },
    outputRoot: temporaryOutput(),
    runId: '20260722T100004B',
  });
  const adapter = createAdapter({
    kind: 'devtools',
    devtoolsCliSource: 'standard',
    failOn: 'expectText',
    failureCode: 'ASSERTION_TEXT_NOT_FOUND',
    failureCategory: 'assertion',
  });

  const result = await runPrepared(prepared, { adapter });

  assert.equal(result.assertionFailureTotal, assertionCount);
  assert.equal(result.assertionFailures.length, 50);
  assert.equal(result.assertionFailuresTruncated, true);
  assert.equal(adapter.calls.filter(([name]) => name === 'expectText').length, assertionCount);
  assert.equal(adapter.calls.filter(([name]) => name === 'screenshot').length, 1);
  assert.match(
    fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8'),
    /仅保留前 50 项；本轮共 52 项失败断言/,
  );
});

test('认证只读会话用动态元素同时形成 UI 与认证业务证据', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: authenticatedReadSpec,
    outputRoot,
    runId: '20260721T100004A',
  });
  const adapter = createAdapter({ kind: 'devtools' });

  const result = await runPrepared(prepared, {
    adapter,
  });

  assert.equal(result.status, 'passed');
  assert.deepEqual(result.evidenceLevels, ['runtime-ui', 'authenticated-business']);
  assert.equal(result.verificationLayers[0].status, 'verified');
  assert.equal(result.verificationLayers[1].status, 'verified');
  assert.equal(result.verificationLayers[2].status, 'not-verified');
  assert.equal(result.verificationLayers[3].status, 'not-applicable');
  assert.equal(adapter.calls.filter(([name]) => name === 'expectVisible').length, 1);
  const caseText = fs.readFileSync(prepared.casePath, 'utf8');
  assert.match(caseText, /await t\.expectVisible\('\.card-item'\)/);
  const report = fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8');
  assert.match(report, /`runtime-ui`、`authenticated-business`/);
  assert.match(report, /运行时\/UI.*已验证/);
  assert.match(report, /认证业务.*已验证/);
});

test('业务信息不完整时生成草案但在 Adapter 启动前阻断执行', async () => {
  const outputRoot = temporaryOutput();
  const draftSpec = {
    ...statefulSpec,
    id: 'TC-BANK-DRAFT-001',
    openQuestions: ['需明确待签约银行卡和产品'],
  };
  const prepared = prepareSession({
    spec: draftSpec,
    outputRoot,
    runId: '20260721T100005',
  });
  const adapter = createAdapter();

  assert.equal(prepared.plan.executionReady, false);
  assert.match(fs.readFileSync(prepared.planPath, 'utf8'), /待补信息/);
  assert.match(fs.readFileSync(prepared.planPath, 'utf8'), /需明确待签约银行卡和产品/);
  await assert.rejects(
    runPrepared(prepared, {
      adapter,
      runtimeData: { cardNumber: '运行时敏感值' },
      approveStateChange: true,
      approvedPlanDigest: prepared.plan.contractDigest,
    }),
    (error) => error.code === 'TEST_CONTRACT_INCOMPLETE',
  );
  assert.deepEqual(adapter.calls, []);
});

test('memory Adapter 通过也不能把真实运行时 UI 与认证业务标记为已验证', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: authenticatedReadSpec,
    outputRoot,
    runId: '20260721T100006',
  });
  const adapter = { ...createAdapter(), kind: 'memory' };

  const result = await runPrepared(prepared, {
    adapter,
  });

  assert.equal(result.status, 'not-verified');
  assert.equal(result.executionStatus, 'passed');
  assert.equal(result.businessOutcome, 'not-verified');
  assert.equal(result.runtime.executionMode, 'skill-self-test');
  assert.equal(result.runtime.devtoolsCliSource, 'not-applicable');
  assert.equal(result.runtime.nodeBootstrap, 'current-process');
  assert.equal(result.verificationLayers[0].status, 'not-verified');
  assert.match(result.verificationLayers[0].reason, /memory Adapter/);
  assert.equal(result.verificationLayers[1].status, 'not-verified');
  assert.match(result.verificationLayers[1].reason, /memory Adapter/);
});

test('补充检查失败时整体结果不能报告为通过', async () => {
  const outputRoot = temporaryOutput();
  const prepared = prepareSession({
    spec: {
      ...readOnlySpec,
      id: 'TC-HOME-STATIC-FAILED-001',
      supplementalChecks: [
        { name: '页面标题静态回归', kind: 'static', status: 'failed', details: '标题断言失败' },
      ],
    },
    outputRoot,
    runId: '20260721T100007',
  });

  const result = await runPrepared(prepared, {
    adapter: createAdapter(),
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.failure.category, 'supplemental-check');
  assert.match(result.failure.message, /页面标题静态回归/);
});

test('只读规格声明提交动作时在生成任何文件前阻断', () => {
  const outputRoot = temporaryOutput();
  assert.throws(
    () => prepareSession({
      spec: {
        ...readOnlySpec,
        id: 'TC-READ-COMMIT-001',
        steps: [
          { action: 'open', path: '/pages/home/index' },
          { action: 'commit', commitId: 'unexpected-write', target: '.submit' },
        ],
      },
      outputRoot,
      runId: '20260721T100008',
    }),
    /只有有状态测试可以声明 commit/,
  );
  assert.deepEqual(fs.readdirSync(outputRoot), []);
});

test('页面状态准备只允许有状态规格并且必须早于输入和提交', () => {
  const arrangement = statefulSpec.steps.find((step) => step.action === 'arrangePageData');
  assert.throws(
    () => prepareSession({
      spec: {
        ...readOnlySpec,
        id: 'TC-READ-ARRANGE-001',
        steps: [
          { action: 'open', path: '/pages/home/index' },
          arrangement,
        ],
      },
      outputRoot: temporaryOutput(),
      runId: '20260721T100008A',
    }),
    /只有有状态测试可以声明 arrangePageData/,
  );

  assert.throws(
    () => prepareSession({
      spec: {
        ...statefulSpec,
        id: 'TC-BANK-LATE-ARRANGE-001',
        steps: [
          { action: 'open', path: '/pages/bank-card/create' },
          { action: 'fill', target: '银行卡号', dataKey: 'cardNumber' },
          arrangement,
          { action: 'commit', commitId: 'bind-bank-card', target: '.confirm-bind' },
        ],
      },
      outputRoot: temporaryOutput(),
      runId: '20260721T100008B',
    }),
    /arrangePageData 必须发生在输入或提交之前/,
  );
});

test('页面状态准备拒绝身份凭据、敏感业务字段和疑似敏感数字', () => {
  const baseSteps = statefulSpec.steps.filter((step) => step.action !== 'arrangePageData');
  for (const [id, data] of [
    ['token-field', { token: 'runtime-token' }],
    ['account-field', { accountNo: true }],
    ['sensitive-number', { selectedValue: '1234567890123456' }],
  ]) {
    assert.throws(
      () => prepareSession({
        spec: {
          ...statefulSpec,
          id: `TC-BANK-UNSAFE-ARRANGE-${id}`,
          steps: [
            baseSteps[0],
            {
              action: 'arrangePageData',
              arrangementId: id,
              data,
              reason: '测试不安全页面准备值',
              evidenceImpact: '不应生成用例',
            },
            ...baseSteps.slice(1),
          ],
        },
        outputRoot: temporaryOutput(),
        runId: `20260721T100008-${id}`,
      }),
      /不得设置身份、凭据或敏感业务字段|不得包含长文本或疑似敏感数字/,
    );
  }
});

test('页面状态准备失败发生在提交前且不会触发业务写入', async () => {
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100008C',
  });
  const adapter = createAdapter({ failOn: 'arrangePageData' });

  const result = await runPrepared(prepared, {
    adapter,
    runtimeData: { cardNumber: '运行时敏感值' },
    approveStateChange: true,
    approvedPlanDigest: prepared.plan.contractDigest,
  });

  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.arrangements[0].status, 'not-applied');
  assert.equal(result.commits[0].status, 'not-attempted');
  assert.equal(adapter.calls.filter(([name]) => name === 'commit').length, 0);
});

test('有状态规格的提交必须使用稳定选择器并披露提交策略', () => {
  assert.throws(
    () => prepareSession({
      spec: {
        ...statefulSpec,
        id: 'TC-BANK-TEXT-COMMIT-001',
        steps: statefulSpec.steps.map((step) => (
          step.action === 'commit' ? { ...step, target: '确认绑定' } : step
        )),
      },
      outputRoot: temporaryOutput(),
      runId: '20260721T100009',
    }),
    /commit.*稳定选择器/,
  );

  const withoutPolicy = { ...statefulSpec, id: 'TC-BANK-NO-POLICY-001' };
  delete withoutPolicy.submissionPolicy;
  assert.throws(
    () => prepareSession({
      spec: withoutPolicy,
      outputRoot: temporaryOutput(),
      runId: '20260721T100010',
    }),
    /submissionPolicy/,
  );
});

test('计划不能预先把后台或外部证据声明为已验证', () => {
  assert.throws(
    () => prepareSession({
      spec: {
        ...readOnlySpec,
        id: 'TC-PREFILLED-EVIDENCE-001',
        verificationLayers: [
          { layer: 'backend', expected: '后台状态正确', status: 'verified' },
        ],
      },
      outputRoot: temporaryOutput(),
      runId: '20260721T100010A',
    }),
    /不能在执行前声明为 verified/,
  );
});

test('提交前失败明确记录未尝试且不调用提交动作', async () => {
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100011',
  });
  const adapter = createAdapter({ failOn: 'fill' });

  const result = await runPrepared(prepared, {
    adapter,
    runtimeData: { cardNumber: '运行时敏感值' },
    approveStateChange: true,
    approvedPlanDigest: prepared.plan.contractDigest,
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.businessOutcome, 'not-verified');
  assert.equal(result.commits[0].status, 'not-attempted');
  assert.equal(result.commits[0].uiAttempts, 0);
  assert.equal(adapter.calls.filter(([name]) => name === 'commit').length, 0);
});

test('提交动作发出后失败归类为未知且绝不重放', async () => {
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100012',
  });
  const adapter = createAdapter({ failOn: 'commit', commitDispatched: true });

  const result = await runPrepared(prepared, {
    adapter,
    runtimeData: { cardNumber: '运行时敏感值' },
    approveStateChange: true,
    approvedPlanDigest: prepared.plan.contractDigest,
  });

  assert.equal(result.status, 'unknown');
  assert.equal(result.executionStatus, 'failed');
  assert.equal(result.businessOutcome, 'unknown');
  assert.equal(result.commits[0].status, 'unknown');
  assert.equal(result.commits[0].uiAttempts, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'commit').length, 1);
  assert.match(fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8'), /业务结果：`unknown`/);
});

test('提交成功后必要断言失败仍归类为未知且有状态链立即停止', async () => {
  const prepared = prepareSession({
    spec: {
      ...statefulSpec,
      steps: [
        ...statefulSpec.steps,
        { action: 'screenshot', name: 'must-not-run-after-stateful-assertion' },
      ],
    },
    outputRoot: temporaryOutput(),
    runId: '20260721T100013',
  });
  const adapter = createAdapter({
    failOn: 'expectText',
    failureCode: 'ASSERTION_TEXT_NOT_FOUND',
    failureCategory: 'assertion',
  });

  const result = await runPrepared(prepared, {
    adapter,
    runtimeData: { cardNumber: '运行时敏感值' },
    approveStateChange: true,
    approvedPlanDigest: prepared.plan.contractDigest,
  });

  assert.equal(result.status, 'unknown');
  assert.equal(result.businessOutcome, 'unknown');
  assert.equal(result.commits[0].status, 'unknown');
  assert.equal(adapter.calls.filter(([name]) => name === 'commit').length, 1);
  assert.equal(adapter.calls.filter(([name]) => name === 'screenshot').length, 0);
  assert.equal(result.assertionFailures.length, 0);
});

test('应用诊断进入报告前脱敏且不改变未知结果语义', async () => {
  const prepared = prepareSession({
    spec: statefulSpec,
    outputRoot: temporaryOutput(),
    runId: '20260721T100014',
  });
  const adapter = createAdapter({ failOn: 'expectText' });
  const sensitiveCard = '1234567890123456';
  adapter.getDiagnostics = () => ({
    capture: { console: true, exception: true, toastModal: true, notes: [] },
    events: [
      { kind: 'toast', level: 'info', message: '添加成功', observedAt: new Date().toISOString() },
      { kind: 'console', level: 'error', message: `accountNo=${sensitiveCard}`, observedAt: new Date().toISOString() },
    ],
  });

  const result = await runPrepared(prepared, {
    adapter,
    runtimeData: { cardNumber: sensitiveCard },
    approveStateChange: true,
    approvedPlanDigest: prepared.plan.contractDigest,
  });

  assert.equal(result.businessOutcome, 'unknown');
  assert.equal(result.commits[0].uiAttempts, 1);
  assert.equal(result.diagnostics.capture.toastModal, true);
  const reportText = [
    fs.readFileSync(path.join(prepared.reportDir, 'report.md'), 'utf8'),
    fs.readFileSync(path.join(prepared.reportDir, 'report.html'), 'utf8'),
    fs.readFileSync(path.join(prepared.reportDir, 'result.json'), 'utf8'),
  ].join('\n');
  assert.match(reportText, /应用诊断/);
  assert.match(reportText, /添加成功/);
  assert.doesNotMatch(reportText, new RegExp(sensitiveCard));
  assert.match(reportText, /\[REDACTED\]/);
});

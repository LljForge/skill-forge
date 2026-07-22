const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const skillRoot = require('./skill-root');

const cli = path.join(skillRoot, 'scripts/session.js');

function sha256(filePath) {
  return `sha256:${require('node:crypto').createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
}

test('单一会话脚本完成准备与内存 Adapter 纵向演练', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-testing-lite-cli-'));
  const output = path.join(root, 'test-e2e-miniprogram');
  const specPath = path.join(root, 'spec.json');
  fs.writeFileSync(specPath, JSON.stringify({
    schemaVersion: 1,
    id: 'TC-DEMO-001',
    title: '原型纵向演练',
    mode: 'read-only',
    projectPath: '/example/miniprogram',
    evidenceLevel: 'runtime-ui',
    screenshotPolicy: 'safe-only',
    stateChanges: [],
    cleanupPolicy: 'not-applicable',
    steps: [
      { action: 'open', path: '/pages/home/index' },
      { action: 'expectText', text: '首页' },
      { action: 'screenshot', name: 'home' },
      { action: 'screenshot', name: '首页结果' },
    ],
  }, null, 2));

  const prepared = spawnSync(process.execPath, [
    cli,
    'prepare',
    '--spec', specPath,
    '--output', output,
    '--run-id', '20260721T110000',
  ], { encoding: 'utf8' });
  assert.equal(prepared.status, 0, prepared.stderr);
  const preparation = JSON.parse(prepared.stdout);
  assert.equal(preparation.status, 'prepared');

  const executed = spawnSync(process.execPath, [
    cli,
    'run',
    '--case', preparation.casePath,
    '--report-dir', preparation.reportDir,
    '--adapter', 'memory',
    '--contract-digest', preparation.plan.contractDigest,
  ], {
    encoding: 'utf8',
    env: { ...process.env, MINIPROGRAM_TEST_NODE_REEXEC: '1' },
  });
  assert.equal(executed.status, 0, executed.stderr);
  const result = JSON.parse(executed.stdout);
  assert.equal(result.status, 'not-verified');
  assert.equal(result.executionStatus, 'passed');
  assert.equal(result.businessOutcome, 'not-verified');
  assert.equal(result.attempts, 1);
  assert.equal(result.runtime.adapter, 'memory');
  assert.equal(result.runtime.executionMode, 'skill-self-test');
  assert.equal(result.runtime.nodeBootstrap, 'auto-reexecuted');
  assert.equal(result.contract.preparedDigest, preparation.plan.contractDigest);
  assert.equal(result.contract.actualDigest, preparation.plan.contractDigest);
  assert.ok(fs.existsSync(path.join(preparation.reportDir, 'screenshots/home.png')));
  assert.ok(
    fs.readdirSync(path.join(preparation.reportDir, 'screenshots'))
      .some((name) => /^screenshot-[a-f0-9]{10}\.png$/.test(name)),
  );
  assert.ok(fs.existsSync(path.join(preparation.reportDir, 'report.md')));
  assert.ok(fs.existsSync(path.join(preparation.reportDir, 'execution-claim.json')));

  const repeated = spawnSync(process.execPath, [
    cli,
    'run',
    '--case', preparation.casePath,
    '--report-dir', preparation.reportDir,
    '--adapter', 'memory',
    '--contract-digest', preparation.plan.contractDigest,
  ], {
    encoding: 'utf8',
    env: { ...process.env, MINIPROGRAM_TEST_NODE_REEXEC: '1' },
  });
  assert.equal(repeated.status, 2);
  assert.match(repeated.stderr, /RUN_ALREADY_CLAIMED/);
});

test('真实开发者工具执行缺少启动授权时在加载 SDK 前阻断', () => {
  const result = spawnSync(process.execPath, [
    cli,
    'run',
    '--case', '/not-used.js',
    '--report-dir', '/not-used',
    '--adapter', 'devtools',
    '--contract-digest', 'sha256:not-used',
  ], { encoding: 'utf8' });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /RUNTIME_AUTHORIZATION_REQUIRED/);
});

test('无效开发者工具 CLI 在加载 SDK 和生成执行结果前阻断', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-testing-cli-path-gate-'));
  const output = path.join(root, 'test-e2e-miniprogram');
  const specPath = path.join(root, 'spec.json');
  fs.writeFileSync(specPath, JSON.stringify({
    schemaVersion: 1,
    id: 'TC-CLI-PATH-001',
    title: '开发者工具路径门禁',
    mode: 'read-only',
    projectPath: '/example/miniprogram',
    evidenceLevel: 'runtime-ui',
    screenshotPolicy: 'disabled',
    stateChanges: [],
    cleanupPolicy: 'not-applicable',
    steps: [{ action: 'open', path: '/pages/home/index' }],
  }, null, 2));

  const prepared = spawnSync(process.execPath, [
    cli,
    'prepare',
    '--spec', specPath,
    '--output', output,
    '--run-id', '20260722T120000',
  ], { encoding: 'utf8' });
  assert.equal(prepared.status, 0, prepared.stderr);
  const preparation = JSON.parse(prepared.stdout);

  const executed = spawnSync(process.execPath, [
    cli,
    'run',
    '--case', preparation.casePath,
    '--report-dir', preparation.reportDir,
    '--adapter', 'devtools',
    '--contract-digest', preparation.plan.contractDigest,
    '--service-port-confirmed',
    '--approve-startup-effects',
    '--cli-path', path.join(root, 'missing-cli'),
  ], {
    encoding: 'utf8',
    env: { ...process.env, MINIPROGRAM_TEST_NODE_REEXEC: '1' },
  });

  assert.equal(executed.status, 2, executed.stderr);
  assert.match(executed.stderr, /DEVTOOLS_CLI_INVALID/);
  assert.equal(fs.existsSync(path.join(preparation.reportDir, 'result.json')), false);
});

test('单一会话脚本为未知有状态结果生成不可变对账附件', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-testing-lite-cli-reconcile-'));
  const reportDir = path.join(root, 'reports', 'run-001');
  fs.mkdirSync(reportDir, { recursive: true });
  const resultPath = path.join(reportDir, 'result.json');
  const artifactPath = path.join(root, 'backend-evidence.json');
  const evidencePath = path.join(root, 'evidence.json');
  fs.writeFileSync(resultPath, `${JSON.stringify({
    schemaVersion: 1,
    caseId: 'TC-WRITE-CLI-001',
    title: 'CLI 写入结果对账',
    mode: 'stateful',
    status: 'unknown',
    executionStatus: 'failed',
    businessOutcome: 'unknown',
    commits: [{ commitId: 'submit-write', status: 'unknown', uiAttempts: 1 }],
  }, null, 2)}\n`);
  fs.writeFileSync(artifactPath, '{"recordExists":true}\n');
  fs.writeFileSync(evidencePath, `${JSON.stringify({
    schemaVersion: 1,
    caseId: 'TC-WRITE-CLI-001',
    summary: '只读后台证据确认唯一提交已经产生状态变化',
    commitEffect: 'applied',
    commitEffects: [{
      commitId: 'submit-write',
      effect: 'applied',
      observation: '后台目标记录已经存在',
    }],
    businessOutcome: 'verified',
    layers: [{
      layer: 'backend',
      status: 'verified',
      method: 'read-only-api',
      observation: '后台只读接口返回预期最终状态',
      artifacts: [{ label: '后台只读结果', path: artifactPath, digest: sha256(artifactPath) }],
    }],
  }, null, 2)}\n`);

  const originalDigest = sha256(resultPath);
  const reconciled = spawnSync(process.execPath, [
    cli,
    'reconcile',
    '--result', resultPath,
    '--evidence', evidencePath,
  ], { encoding: 'utf8' });

  assert.equal(reconciled.status, 0, reconciled.stderr);
  const output = JSON.parse(reconciled.stdout);
  assert.equal(output.reconciliation.commitEffect, 'applied');
  assert.equal(output.reconciliation.reconciledBusinessOutcome, 'verified');
  assert.equal(output.originalResultUnchanged, true);
  assert.equal(sha256(resultPath), originalDigest);
  assert.ok(fs.existsSync(path.join(reportDir, 'reconciliation.json')));
});

test('单一会话脚本为已完成结果绑定独立脱敏证据', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-testing-lite-cli-attest-'));
  const reportDir = path.join(root, 'reports', 'run-001');
  fs.mkdirSync(reportDir, { recursive: true });
  const resultPath = path.join(reportDir, 'result.json');
  const artifactPath = path.join(root, 'backend-readonly.json');
  const evidencePath = path.join(root, 'evidence.json');
  fs.writeFileSync(resultPath, `${JSON.stringify({
    schemaVersion: 1,
    caseId: 'TC-READ-CLI-001',
    title: 'CLI 认证只读结果',
    mode: 'authenticated-read',
    status: 'passed',
    executionStatus: 'passed',
    businessOutcome: 'verified',
    commits: [],
  }, null, 2)}\n`);
  fs.writeFileSync(artifactPath, '{"matchingRows":1}\n');
  fs.writeFileSync(evidencePath, `${JSON.stringify({
    schemaVersion: 1,
    caseId: 'TC-READ-CLI-001',
    summary: '后台只读证据确认目标状态符合预期',
    layers: [{
      layer: 'backend',
      status: 'verified',
      method: 'read-only-api',
      observation: '后台只读接口返回唯一匹配记录',
      artifacts: [{ label: '后台只读结果', path: artifactPath, digest: sha256(artifactPath) }],
    }],
  }, null, 2)}\n`);

  const originalDigest = sha256(resultPath);
  const attached = spawnSync(process.execPath, [
    cli,
    'attach-evidence',
    '--result', resultPath,
    '--evidence', evidencePath,
  ], { encoding: 'utf8' });

  assert.equal(attached.status, 0, attached.stderr);
  const output = JSON.parse(attached.stdout);
  assert.equal(output.attestation.kind, 'supplemental-evidence-attestation');
  assert.equal(output.originalResultUnchanged, true);
  assert.equal(sha256(resultPath), originalDigest);
  assert.ok(fs.existsSync(path.join(reportDir, 'attestation.json')));
});

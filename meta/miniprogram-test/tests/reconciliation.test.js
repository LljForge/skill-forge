const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const skillRoot = require('./skill-root');

const { createReconciliation, sha256File } = require(path.join(skillRoot, 'scripts/runtime/reconciliation'));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-reconciliation-'));
  const reportDir = path.join(root, 'reports', 'run-001');
  fs.mkdirSync(reportDir, { recursive: true });
  const resultPath = path.join(reportDir, 'result.json');
  fs.writeFileSync(resultPath, `${JSON.stringify({
    schemaVersion: 1,
    caseId: 'TC-WRITE-001',
    title: '真实业务写入',
    mode: 'stateful',
    status: 'unknown',
    executionStatus: 'failed',
    businessOutcome: 'unknown',
    commits: [{ commitId: 'submit-write', status: 'unknown', uiAttempts: 1 }],
  }, null, 2)}\n`);
  const uiPath = path.join(root, 'ui-result.json');
  const backendPath = path.join(root, 'backend-evidence.json');
  fs.writeFileSync(uiPath, '{"status":"failed","cardVisible":false}\n');
  fs.writeFileSync(backendPath, '{"recordExists":true,"identityOwnerMatches":false}\n');
  const evidencePath = path.join(root, 'evidence.json');
  const evidence = {
    schemaVersion: 1,
    caseId: 'TC-WRITE-001',
    summary: '提交已经创建后台记录，但身份归属错误，当前账号无法回读',
    commitEffect: 'applied',
    commitEffects: [{
      commitId: 'submit-write',
      effect: 'applied',
      observation: '只读后台查询确认记录已创建',
    }],
    businessOutcome: 'failed',
    layers: [
      {
        layer: 'runtime-ui',
        status: 'failed',
        method: 'read-only-ui',
        observation: '当前账号页面仍未展示目标记录',
        artifacts: [{ label: 'UI 只读结果', path: uiPath, digest: sha256File(uiPath) }],
      },
      {
        layer: 'backend',
        status: 'failed',
        method: 'read-only-database',
        observation: '后台记录存在，但身份归属字段不符合预期',
        artifacts: [{ label: '后台脱敏结果', path: backendPath, digest: sha256File(backendPath) }],
      },
      {
        layer: 'external',
        status: 'not-verified',
        method: 'manual-review',
        observation: '没有取得外部系统直接证据',
        artifacts: [],
      },
    ],
  };
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  return { root, reportDir, resultPath, evidencePath, evidence, uiPath, backendPath };
}

test('以原结果摘要绑定一次性执行后对账附件且不覆盖原结论', () => {
  const value = fixture();
  const before = sha256File(value.resultPath);
  const output = createReconciliation({ resultPath: value.resultPath, evidencePath: value.evidencePath });

  assert.equal(output.originalResultUnchanged, true);
  assert.equal(sha256File(value.resultPath), before);
  assert.equal(output.reconciliation.originalResult.businessOutcome, 'unknown');
  assert.equal(output.reconciliation.commitEffect, 'applied');
  assert.equal(output.reconciliation.reconciledBusinessOutcome, 'failed');
  assert.equal(output.reconciliation.originalResult.digest, before);
  assert.ok(fs.existsSync(path.join(value.reportDir, 'reconciliation.json')));
  assert.ok(fs.existsSync(path.join(value.reportDir, 'reconciliation.md')));
  assert.ok(fs.existsSync(path.join(value.reportDir, 'reconciliation.html')));
  const markdown = fs.readFileSync(path.join(value.reportDir, 'reconciliation.md'), 'utf8');
  assert.match(markdown, /原业务结果：`unknown`/);
  assert.match(markdown, /对账后提交效果：`applied`/);
  assert.match(markdown, /对账后业务结果：`failed`/);
});

test('对账附件已存在时拒绝覆盖', () => {
  const value = fixture();
  createReconciliation({ resultPath: value.resultPath, evidencePath: value.evidencePath });
  assert.throws(
    () => createReconciliation({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'RECONCILIATION_ALREADY_EXISTS',
  );
});

test('拒绝敏感业务值且不生成任何附件', () => {
  const value = fixture();
  value.evidence.layers[1].observation = '银行卡号为 1234567890123456';
  fs.writeFileSync(value.evidencePath, `${JSON.stringify(value.evidence, null, 2)}\n`);
  assert.throws(
    () => createReconciliation({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'RECONCILIATION_SENSITIVE_VALUE',
  );
  assert.equal(fs.existsSync(path.join(value.reportDir, 'reconciliation.json')), false);
});

test('拒绝被篡改的证据文件摘要', () => {
  const value = fixture();
  fs.appendFileSync(value.backendPath, '{"tampered":true}\n');
  assert.throws(
    () => createReconciliation({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'RECONCILIATION_ARTIFACT_DIGEST_MISMATCH',
  );
});

test('未发出的提交不得被对账为已生效', () => {
  const value = fixture();
  const original = JSON.parse(fs.readFileSync(value.resultPath, 'utf8'));
  original.commits[0].status = 'not-attempted';
  fs.writeFileSync(value.resultPath, `${JSON.stringify(original, null, 2)}\n`);
  assert.throws(
    () => createReconciliation({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'RECONCILIATION_COMMIT_MISMATCH',
  );
});

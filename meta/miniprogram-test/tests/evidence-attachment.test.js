const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const skillRoot = require('./skill-root');

const { createEvidenceAttachment } = require(path.join(skillRoot, 'scripts/runtime/evidence-attachment'));
const { sha256File } = require(path.join(skillRoot, 'scripts/runtime/reconciliation'));

function fixture({ mode = 'authenticated-read', businessOutcome = 'verified', commits = [] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-evidence-attachment-'));
  const reportDir = path.join(root, 'reports', 'run-001');
  fs.mkdirSync(reportDir, { recursive: true });
  const resultPath = path.join(reportDir, 'result.json');
  fs.writeFileSync(resultPath, `${JSON.stringify({
    schemaVersion: 1,
    caseId: 'TC-READ-001',
    title: '认证只读业务结果',
    mode,
    status: businessOutcome === 'verified' ? 'passed' : businessOutcome,
    executionStatus: businessOutcome === 'verified' ? 'passed' : 'failed',
    businessOutcome,
    commits,
  }, null, 2)}\n`);
  const artifactPath = path.join(root, 'backend-readonly.json');
  fs.writeFileSync(artifactPath, '{"matchingRows":1,"remainingRows":0}\n');
  const evidencePath = path.join(root, 'evidence.json');
  const evidence = {
    schemaVersion: 1,
    caseId: 'TC-READ-001',
    summary: '后台只读证据确认目标记录符合预期状态',
    layers: [
      {
        layer: 'backend',
        status: 'verified',
        method: 'read-only-database',
        observation: '唯一目标记录已归属且没有遗留异常记录',
        artifacts: [{
          label: '后台脱敏只读结果',
          path: artifactPath,
          digest: sha256File(artifactPath),
        }],
      },
      {
        layer: 'external',
        status: 'not-verified',
        method: 'manual-review',
        observation: '本轮没有取得外部系统直接证据',
        artifacts: [],
      },
    ],
  };
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  return { root, reportDir, resultPath, artifactPath, evidencePath, evidence };
}

test('为已完成结果生成不可变证据附件且不覆盖原结论', () => {
  const value = fixture();
  const before = sha256File(value.resultPath);
  const output = createEvidenceAttachment({ resultPath: value.resultPath, evidencePath: value.evidencePath });

  assert.equal(output.originalResultUnchanged, true);
  assert.equal(sha256File(value.resultPath), before);
  assert.equal(output.attestation.originalResult.businessOutcome, 'verified');
  assert.equal(output.attestation.originalResult.digest, before);
  assert.equal(output.attestation.layers[0].status, 'verified');
  assert.deepEqual(Object.keys(output.attestation.layers[0].artifacts[0]).sort(), ['digest', 'label']);
  assert.ok(fs.existsSync(path.join(value.reportDir, 'attestation.json')));
  assert.ok(fs.existsSync(path.join(value.reportDir, 'attestation.md')));
  assert.ok(fs.existsSync(path.join(value.reportDir, 'attestation.html')));
  const markdown = fs.readFileSync(path.join(value.reportDir, 'attestation.md'), 'utf8');
  assert.match(markdown, /原业务结果：`verified`/);
  assert.match(markdown, /不改写原业务结果：是/);
  assert.match(markdown, /后台：`verified`/);
});

test('证据附件已存在时拒绝覆盖', () => {
  const value = fixture();
  createEvidenceAttachment({ resultPath: value.resultPath, evidencePath: value.evidencePath });
  assert.throws(
    () => createEvidenceAttachment({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'EVIDENCE_ATTACHMENT_ALREADY_EXISTS',
  );
});

test('拒绝敏感业务值且不生成附件', () => {
  const value = fixture();
  value.evidence.layers[0].observation = '银行卡号为 1234567890123456';
  fs.writeFileSync(value.evidencePath, `${JSON.stringify(value.evidence, null, 2)}\n`);
  assert.throws(
    () => createEvidenceAttachment({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'EVIDENCE_ATTACHMENT_SENSITIVE_VALUE',
  );
  assert.equal(fs.existsSync(path.join(value.reportDir, 'attestation.json')), false);
});

test('拒绝被篡改的证据文件摘要', () => {
  const value = fixture();
  fs.appendFileSync(value.artifactPath, '{"tampered":true}\n');
  assert.throws(
    () => createEvidenceAttachment({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'EVIDENCE_ATTACHMENT_ARTIFACT_DIGEST_MISMATCH',
  );
});

test('未知有状态提交必须继续使用 reconcile', () => {
  const value = fixture({
    mode: 'stateful',
    businessOutcome: 'unknown',
    commits: [{ commitId: 'submit-write', status: 'unknown', uiAttempts: 1 }],
  });
  assert.throws(
    () => createEvidenceAttachment({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'EVIDENCE_ATTACHMENT_RECONCILIATION_REQUIRED',
  );
});

test('证据用例必须与原结果一致', () => {
  const value = fixture();
  value.evidence.caseId = 'TC-OTHER-001';
  fs.writeFileSync(value.evidencePath, `${JSON.stringify(value.evidence, null, 2)}\n`);
  assert.throws(
    () => createEvidenceAttachment({ resultPath: value.resultPath, evidencePath: value.evidencePath }),
    (error) => error.code === 'EVIDENCE_ATTACHMENT_CASE_MISMATCH',
  );
});

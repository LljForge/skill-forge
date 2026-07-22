const fs = require('node:fs');
const path = require('node:path');

const { createEvidenceTools, sha256File } = require('./evidence-core');

const {
  evidenceError,
  assertExactKeys,
  assertSafeText,
  readJsonFile,
  validateLayers,
} = createEvidenceTools('EVIDENCE_ATTACHMENT');

function validateOriginalResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result) || result.schemaVersion !== 1) {
    throw evidenceError('RESULT_INVALID', '原结果必须是结构版本 1 的对象');
  }
  for (const field of ['caseId', 'title', 'mode', 'status', 'executionStatus', 'businessOutcome']) {
    assertSafeText(result[field], `result.${field}`, { maxLength: 240 });
  }
  const commits = Array.isArray(result.commits) ? result.commits : [];
  if (result.mode === 'stateful' && (
    result.businessOutcome === 'unknown'
    || commits.some((item) => item && item.status === 'unknown')
  )) {
    throw evidenceError('RECONCILIATION_REQUIRED', '未知有状态提交必须使用 reconcile 逐提交对账');
  }
}

function validateAttachmentEvidence(evidence, originalResult, evidencePath) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw evidenceError('SCHEMA_INVALID', '证据附件必须是对象');
  }
  assertExactKeys(evidence, new Set(['schemaVersion', 'caseId', 'summary', 'layers']), 'evidence');
  if (evidence.schemaVersion !== 1) {
    throw evidenceError('SCHEMA_INVALID', '只支持证据附件结构版本 1');
  }
  if (evidence.caseId !== originalResult.caseId) {
    throw evidenceError('CASE_MISMATCH', '证据附件用例与原结果不一致');
  }
  const layers = validateLayers(evidence.layers, evidencePath);
  if (!layers.some((item) => ['verified', 'failed'].includes(item.status))) {
    throw evidenceError('EVIDENCE_INSUFFICIENT', '证据附件必须至少包含一层带摘要的确定性只读证据');
  }
  return {
    schemaVersion: 1,
    caseId: evidence.caseId,
    summary: assertSafeText(evidence.summary, 'evidence.summary'),
    layers,
  };
}

function layerLabel(layer) {
  return {
    'runtime-ui': '运行时/UI',
    'authenticated-business': '认证业务',
    backend: '后台',
    external: '外部系统',
  }[layer] || layer;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderMarkdown(attestation) {
  const layers = attestation.layers.map((item) => {
    const artifacts = item.artifacts.length > 0
      ? item.artifacts.map((artifact) => `${artifact.label}（\`${artifact.digest}\`）`).join('、')
      : '无';
    return `- ${layerLabel(item.layer)}：\`${item.status}\`；方法：\`${item.method}\`；${item.observation}；证据：${artifacts}`;
  }).join('\n');
  return `# 独立证据附件：${attestation.originalResult.title}\n\n- 用例：\`${attestation.originalResult.caseId}\`\n- 原始结果摘要：\`${attestation.originalResult.digest}\`\n- 原执行结果：\`${attestation.originalResult.executionStatus}\`\n- 原业务结果：\`${attestation.originalResult.businessOutcome}\`\n- 证据说明摘要：\`${attestation.evidenceDigest}\`\n- 不改写原业务结果：是\n\n## 摘要\n\n${attestation.summary}\n\n## 分层独立证据\n\n${layers}\n`;
}

function writeImmutableFiles(outputDir, attestation) {
  const targets = {
    json: path.join(outputDir, 'attestation.json'),
    markdown: path.join(outputDir, 'attestation.md'),
    html: path.join(outputDir, 'attestation.html'),
  };
  for (const target of Object.values(targets)) {
    if (fs.existsSync(target)) {
      throw evidenceError('ALREADY_EXISTS', '当前报告已经存在不可变证据附件，不允许覆盖');
    }
  }
  const markdown = renderMarkdown(attestation);
  const contents = {
    [targets.json]: `${JSON.stringify(attestation, null, 2)}\n`,
    [targets.markdown]: markdown,
    [targets.html]: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>独立证据附件</title></head><body><pre>${escapeHtml(markdown)}</pre></body></html>\n`,
  };
  const temporary = [];
  const created = [];
  try {
    for (const [target, content] of Object.entries(contents)) {
      const temp = `${target}.tmp-${process.pid}`;
      fs.writeFileSync(temp, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      temporary.push(temp);
    }
    for (const target of Object.keys(contents)) {
      const temp = `${target}.tmp-${process.pid}`;
      fs.renameSync(temp, target);
      created.push(target);
    }
  } catch (error) {
    for (const temp of temporary) fs.rmSync(temp, { force: true });
    for (const target of created) fs.rmSync(target, { force: true });
    throw error;
  }
  return targets;
}

function createEvidenceAttachment({ resultPath, evidencePath }) {
  const original = readJsonFile(resultPath, 2 * 1024 * 1024, 'resultPath');
  validateOriginalResult(original.value);
  const evidenceFile = readJsonFile(evidencePath, 64 * 1024, 'evidencePath');
  const originalDigest = sha256File(original.absolute);
  const evidenceDigest = sha256File(evidenceFile.absolute);
  const evidence = validateAttachmentEvidence(evidenceFile.value, original.value, evidenceFile.absolute);
  const publicLayers = evidence.layers.map((layer) => ({
    ...layer,
    artifacts: layer.artifacts.map(({ label, digest }) => ({ label, digest })),
  }));
  const attestation = {
    schemaVersion: 1,
    kind: 'supplemental-evidence-attestation',
    createdAt: new Date().toISOString(),
    originalResult: {
      path: original.absolute,
      digest: originalDigest,
      caseId: original.value.caseId,
      title: original.value.title,
      status: original.value.status,
      executionStatus: original.value.executionStatus,
      businessOutcome: original.value.businessOutcome,
    },
    evidenceDigest,
    summary: evidence.summary,
    layers: publicLayers,
  };
  const targets = writeImmutableFiles(path.dirname(original.absolute), attestation);
  if (sha256File(original.absolute) !== originalDigest) {
    for (const target of Object.values(targets)) fs.rmSync(target, { force: true });
    throw evidenceError('ORIGINAL_CHANGED', '生成证据附件期间原始结果发生变化，已撤销附件');
  }
  return { attestation, paths: targets, wroteFiles: true, originalResultUnchanged: true };
}

module.exports = {
  createEvidenceAttachment,
};

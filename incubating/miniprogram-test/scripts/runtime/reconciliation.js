const fs = require('node:fs');
const path = require('node:path');

const { createEvidenceTools, sha256File } = require('./evidence-core');

const COMMIT_EFFECTS = new Set(['applied', 'not-applied', 'partial', 'unknown']);
const BUSINESS_OUTCOMES = new Set(['verified', 'failed', 'unknown']);
const {
  evidenceError: reconciliationError,
  assertExactKeys,
  assertSafeText,
  readJsonFile,
  validateLayers,
} = createEvidenceTools('RECONCILIATION');

function deriveCommitEffect(items) {
  const effects = [...new Set(items.map((item) => item.effect))];
  if (effects.length === 1) return effects[0];
  if (effects.includes('partial')) return 'partial';
  if (effects.includes('unknown')) return 'unknown';
  return 'partial';
}

function validateEvidence(evidence, originalResult, evidencePath) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw reconciliationError('SCHEMA_INVALID', '对账证据必须是对象');
  }
  assertExactKeys(evidence, new Set([
    'schemaVersion',
    'caseId',
    'summary',
    'commitEffect',
    'commitEffects',
    'businessOutcome',
    'layers',
  ]), 'evidence');
  if (evidence.schemaVersion !== 1) {
    throw reconciliationError('SCHEMA_INVALID', '只支持对账证据结构版本 1');
  }
  if (evidence.caseId !== originalResult.caseId) {
    throw reconciliationError('CASE_MISMATCH', '对账证据用例与原结果不一致');
  }
  const summary = assertSafeText(evidence.summary, 'evidence.summary');
  if (!COMMIT_EFFECTS.has(evidence.commitEffect)) {
    throw reconciliationError('SCHEMA_INVALID', 'evidence.commitEffect 无效');
  }
  if (!BUSINESS_OUTCOMES.has(evidence.businessOutcome)) {
    throw reconciliationError('SCHEMA_INVALID', 'evidence.businessOutcome 无效');
  }

  const originalCommits = Array.isArray(originalResult.commits) ? originalResult.commits : [];
  if (originalResult.mode !== 'stateful' || originalCommits.length === 0) {
    throw reconciliationError('RESULT_INELIGIBLE', '只有包含提交点的有状态原结果可以追加执行后对账');
  }
  if (!Array.isArray(evidence.commitEffects) || evidence.commitEffects.length !== originalCommits.length) {
    throw reconciliationError('SCHEMA_INVALID', 'evidence.commitEffects 必须逐一覆盖原结果的全部提交点');
  }
  const originalById = new Map(originalCommits.map((item) => [item.commitId, item]));
  const seenCommitIds = new Set();
  const commitEffects = evidence.commitEffects.map((item, index) => {
    const field = `evidence.commitEffects[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw reconciliationError('SCHEMA_INVALID', `${field} 必须是对象`);
    }
    assertExactKeys(item, new Set(['commitId', 'effect', 'observation']), field);
    if (typeof item.commitId !== 'string' || !/^[A-Za-z0-9._-]+$/.test(item.commitId)) {
      throw reconciliationError('SCHEMA_INVALID', `${field}.commitId 无效`);
    }
    if (!originalById.has(item.commitId) || seenCommitIds.has(item.commitId)) {
      throw reconciliationError('COMMIT_MISMATCH', `${field}.commitId 与原结果不一致或重复`);
    }
    if (!COMMIT_EFFECTS.has(item.effect)) {
      throw reconciliationError('SCHEMA_INVALID', `${field}.effect 无效`);
    }
    const original = originalById.get(item.commitId);
    if (original.status === 'not-attempted' && item.effect !== 'not-applied') {
      throw reconciliationError('COMMIT_MISMATCH', `${field}.effect 与原结果的未提交状态冲突`);
    }
    seenCommitIds.add(item.commitId);
    return {
      commitId: item.commitId,
      effect: item.effect,
      observation: assertSafeText(item.observation, `${field}.observation`),
    };
  });
  if (deriveCommitEffect(commitEffects) !== evidence.commitEffect) {
    throw reconciliationError('COMMIT_MISMATCH', 'evidence.commitEffect 与逐提交对账结果不一致');
  }

  const layers = validateLayers(evidence.layers, evidencePath);

  const conclusiveLayers = layers.filter((item) => ['verified', 'failed'].includes(item.status));
  if (evidence.commitEffect !== 'unknown' && conclusiveLayers.length === 0) {
    throw reconciliationError('EVIDENCE_INSUFFICIENT', '确定提交效果必须至少有一层带摘要的只读证据');
  }
  if (evidence.businessOutcome === 'verified' && !layers.some((item) => item.status === 'verified')) {
    throw reconciliationError('EVIDENCE_INSUFFICIENT', '业务通过必须至少有一层已验证证据');
  }
  if (evidence.businessOutcome === 'failed' && !layers.some((item) => item.status === 'failed')) {
    throw reconciliationError('EVIDENCE_INSUFFICIENT', '业务失败必须至少有一层失败证据');
  }

  return {
    schemaVersion: 1,
    caseId: evidence.caseId,
    summary,
    commitEffect: evidence.commitEffect,
    commitEffects,
    businessOutcome: evidence.businessOutcome,
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

function renderMarkdown(result) {
  const commits = result.commitEffects
    .map((item) => `- \`${item.commitId}\`：\`${item.effect}\`；${item.observation}`)
    .join('\n');
  const layers = result.layers.map((item) => {
    const artifacts = item.artifacts.length > 0
      ? item.artifacts.map((artifact) => `${artifact.label}（\`${artifact.digest}\`）`).join('、')
      : '无';
    return `- ${layerLabel(item.layer)}：\`${item.status}\`；方法：\`${item.method}\`；${item.observation}；证据：${artifacts}`;
  }).join('\n');
  return `# 执行后对账：${result.originalResult.title}\n\n- 用例：\`${result.originalResult.caseId}\`\n- 原始结果摘要：\`${result.originalResult.digest}\`\n- 原汇总结论：\`${result.originalResult.status}\`\n- 原业务结果：\`${result.originalResult.businessOutcome}\`\n- 对账后提交效果：\`${result.commitEffect}\`\n- 对账后业务结果：\`${result.reconciledBusinessOutcome}\`\n- 对账附件摘要来源：\`${result.evidenceDigest}\`\n- 原始结果已保持不变：是\n\n## 对账摘要\n\n${result.summary}\n\n## 提交效果\n\n${commits}\n\n## 分层只读证据\n\n${layers}\n`;
}

function writeImmutableFiles(outputDir, reconciliation) {
  const targets = {
    json: path.join(outputDir, 'reconciliation.json'),
    markdown: path.join(outputDir, 'reconciliation.md'),
    html: path.join(outputDir, 'reconciliation.html'),
  };
  for (const target of Object.values(targets)) {
    if (fs.existsSync(target)) {
      throw reconciliationError('ALREADY_EXISTS', '当前报告已经存在不可变对账附件，不允许覆盖');
    }
  }
  const markdown = renderMarkdown(reconciliation);
  const contents = {
    [targets.json]: `${JSON.stringify(reconciliation, null, 2)}\n`,
    [targets.markdown]: markdown,
    [targets.html]: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>执行后对账</title></head><body><pre>${escapeHtml(markdown)}</pre></body></html>\n`,
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

function createReconciliation({ resultPath, evidencePath }) {
  const original = readJsonFile(resultPath, 2 * 1024 * 1024, 'resultPath');
  const evidenceFile = readJsonFile(evidencePath, 64 * 1024, 'evidencePath');
  const originalDigest = sha256File(original.absolute);
  const evidenceDigest = sha256File(evidenceFile.absolute);
  const evidence = validateEvidence(evidenceFile.value, original.value, evidenceFile.absolute);
  const reconciliation = {
    schemaVersion: 1,
    kind: 'post-run-reconciliation',
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
    commitEffect: evidence.commitEffect,
    commitEffects: evidence.commitEffects,
    reconciledBusinessOutcome: evidence.businessOutcome,
    layers: evidence.layers,
  };
  const targets = writeImmutableFiles(path.dirname(original.absolute), reconciliation);
  if (sha256File(original.absolute) !== originalDigest) {
    for (const target of Object.values(targets)) fs.rmSync(target, { force: true });
    throw reconciliationError('ORIGINAL_CHANGED', '生成对账附件期间原始结果发生变化，已撤销附件');
  }
  return { reconciliation, paths: targets, wroteFiles: true, originalResultUnchanged: true };
}

module.exports = {
  createReconciliation,
  sha256File,
};

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ARTIFACT_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function createArtifactError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.category = 'artifact-integrity';
  return error;
}

function validateArtifactIdentifier(value, field) {
  if (typeof value !== 'string' || !ARTIFACT_IDENTIFIER_PATTERN.test(value)) {
    throw createArtifactError(
      'UNSAFE_ARTIFACT_IDENTIFIER',
      `${field} 只能包含 1 到 64 位字母、数字、点、下划线或连字符，且必须以字母或数字开头`,
    );
  }
  return value;
}

function safeScreenshotName(name) {
  const raw = String(name);
  if (/^[A-Za-z0-9_-]{1,80}$/.test(raw)) return raw;

  const base = raw
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  const digest = crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 10);
  return `${base || 'screenshot'}-${digest}`;
}

function assertScreenshotTargetAvailable(target) {
  if (fs.existsSync(target)) {
    throw createArtifactError(
      'SCREENSHOT_ALREADY_EXISTS',
      `截图证据已经存在，拒绝覆盖：${path.basename(target)}`,
    );
  }
}

function claimExecution({ reportDir, contractDigest, caseId, skillVersion }) {
  fs.mkdirSync(reportDir, { recursive: true, mode: 0o700 });
  const existingArtifacts = ['result.json', 'report.md', 'report.html', 'screenshots']
    .filter((name) => fs.existsSync(path.join(reportDir, name)));
  if (existingArtifacts.length > 0) {
    throw createArtifactError(
      'RUN_ALREADY_CLAIMED',
      `报告目录已经包含执行产物，拒绝再次执行：${existingArtifacts.join('、')}`,
    );
  }

  const claimPath = path.join(reportDir, 'execution-claim.json');
  const claim = {
    schemaVersion: 1,
    caseId,
    contractDigest,
    skillVersion,
    claimedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(claimPath, `${JSON.stringify(claim, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
  } catch (cause) {
    if (cause && cause.code === 'EEXIST') {
      throw createArtifactError('RUN_ALREADY_CLAIMED', '报告目录已经取得执行声明，拒绝再次执行');
    }
    throw cause;
  }
  return {
    ...claim,
    path: 'execution-claim.json',
  };
}

module.exports = {
  assertScreenshotTargetAvailable,
  claimExecution,
  safeScreenshotName,
  validateArtifactIdentifier,
};

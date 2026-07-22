const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const LAYERS = new Set(['runtime-ui', 'authenticated-business', 'backend', 'external']);
const LAYER_STATUSES = new Set(['verified', 'failed', 'not-verified']);
const METHODS = new Set([
  'read-only-ui',
  'read-only-api',
  'read-only-database',
  'read-only-external',
  'manual-review',
]);
const ARTIFACT_EXTENSIONS = new Set(['.json', '.md', '.html', '.png', '.txt']);

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return `sha256:${hash.digest('hex')}`;
}

function createEvidenceTools(errorPrefix) {
  function evidenceError(suffix, message) {
    const error = new Error(message);
    error.code = `${errorPrefix}_${suffix}`;
    return error;
  }

  function assertExactKeys(value, allowed, field) {
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        throw evidenceError('SCHEMA_INVALID', `${field}.${key} 不在允许的证据结构中`);
      }
    }
  }

  function assertSafeText(value, field, { maxLength = 1000 } = {}) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw evidenceError('SCHEMA_INVALID', `${field} 必须是非空字符串`);
    }
    if (value.length > maxLength) {
      throw evidenceError('SCHEMA_INVALID', `${field} 超过 ${maxLength} 字符限制`);
    }
    const sensitivePatterns = [
      /\b\d{10,}\b/,
      /\bBearer\s+\S+/i,
      /(?:token|authorization|password|secret|openid|unionid|sessionid|idcard|certid|accountno)\s*[:=]/i,
      /(?:mysql|mongodb|postgres(?:ql)?):\/\//i,
      /[A-Za-z0-9_-]{40,}/,
    ];
    if (sensitivePatterns.some((pattern) => pattern.test(value))) {
      throw evidenceError('SENSITIVE_VALUE', `${field} 包含疑似身份、凭据或敏感业务值`);
    }
    return value.trim();
  }

  function readJsonFile(filePath, maxBytes, field) {
    const absolute = path.resolve(filePath);
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) throw evidenceError('FILE_INVALID', `${field} 必须是普通文件`);
    if (stat.size > maxBytes) throw evidenceError('FILE_INVALID', `${field} 超过大小限制`);
    try {
      return { absolute, value: JSON.parse(fs.readFileSync(absolute, 'utf8')) };
    } catch (cause) {
      throw evidenceError('FILE_INVALID', `${field} 不是有效 JSON：${cause.message}`);
    }
  }

  function validateDigest(value, field) {
    if (typeof value !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value)) {
      throw evidenceError('SCHEMA_INVALID', `${field} 必须是 sha256 摘要`);
    }
  }

  function resolveArtifact(artifact, evidenceDir, field) {
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
      throw evidenceError('SCHEMA_INVALID', `${field} 必须是对象`);
    }
    assertExactKeys(artifact, new Set(['label', 'path', 'digest']), field);
    const label = assertSafeText(artifact.label, `${field}.label`, { maxLength: 120 });
    if (typeof artifact.path !== 'string' || artifact.path.length === 0 || artifact.path.length > 1024 || artifact.path.includes('\0')) {
      throw evidenceError('SCHEMA_INVALID', `${field}.path 无效`);
    }
    validateDigest(artifact.digest, `${field}.digest`);
    const absolute = path.isAbsolute(artifact.path)
      ? path.resolve(artifact.path)
      : path.resolve(evidenceDir, artifact.path);
    const stat = fs.statSync(absolute);
    if (!stat.isFile() || stat.size > 20 * 1024 * 1024) {
      throw evidenceError('ARTIFACT_INVALID', `${field}.path 必须是 20MB 以内的普通文件`);
    }
    if (!ARTIFACT_EXTENSIONS.has(path.extname(absolute).toLowerCase())) {
      throw evidenceError('ARTIFACT_INVALID', `${field}.path 使用了不允许的证据文件类型`);
    }
    const actualDigest = sha256File(absolute);
    if (actualDigest !== artifact.digest) {
      throw evidenceError('ARTIFACT_DIGEST_MISMATCH', `${field}.digest 与证据文件不一致`);
    }
    return { label, path: absolute, digest: actualDigest };
  }

  function validateLayers(layersValue, evidencePath) {
    if (!Array.isArray(layersValue) || layersValue.length === 0 || layersValue.length > 8) {
      throw evidenceError('SCHEMA_INVALID', 'evidence.layers 必须包含 1 到 8 项');
    }
    const evidenceDir = path.dirname(path.resolve(evidencePath));
    const seenLayers = new Set();
    return layersValue.map((item, index) => {
      const field = `evidence.layers[${index}]`;
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw evidenceError('SCHEMA_INVALID', `${field} 必须是对象`);
      }
      assertExactKeys(item, new Set(['layer', 'status', 'method', 'observation', 'artifacts']), field);
      if (!LAYERS.has(item.layer) || seenLayers.has(item.layer)) {
        throw evidenceError('SCHEMA_INVALID', `${field}.layer 无效或重复`);
      }
      if (!LAYER_STATUSES.has(item.status)) {
        throw evidenceError('SCHEMA_INVALID', `${field}.status 无效`);
      }
      if (!METHODS.has(item.method)) {
        throw evidenceError('SCHEMA_INVALID', `${field}.method 无效`);
      }
      const artifacts = (item.artifacts || []).map((artifact, artifactIndex) => (
        resolveArtifact(artifact, evidenceDir, `${field}.artifacts[${artifactIndex}]`)
      ));
      if (['verified', 'failed'].includes(item.status)) {
        if (item.method === 'manual-review' || artifacts.length === 0) {
          throw evidenceError('EVIDENCE_INSUFFICIENT', `${field} 的确定性结论必须来自带摘要的只读证据`);
        }
      }
      seenLayers.add(item.layer);
      return {
        layer: item.layer,
        status: item.status,
        method: item.method,
        observation: assertSafeText(item.observation, `${field}.observation`),
        artifacts,
      };
    });
  }

  return {
    evidenceError,
    assertExactKeys,
    assertSafeText,
    readJsonFile,
    validateLayers,
  };
}

module.exports = {
  createEvidenceTools,
  sha256File,
};


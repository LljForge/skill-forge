const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const { NODE_REEXEC_MARKER } = require('./node-version');
const {
  claimExecution,
  safeScreenshotName,
  validateArtifactIdentifier,
} = require('./artifact-integrity');

const SUPPORTED_MODES = new Set(['read-only', 'authenticated-read', 'stateful']);
const SUPPORTED_ACTIONS = new Set(['open', 'tap', 'arrangePageData', 'commit', 'fill', 'expectText', 'expectVisible', 'expectDiagnostic', 'screenshot']);
const SUPPORTED_DIAGNOSTIC_KINDS = new Set(['toast', 'modal', 'console', 'exception']);
const SUPPORTED_INPUT_SOURCES = new Set(['natural-language', 'provided-cases', 'provided-spec']);
const SUPPORTED_LAYER_STATUSES = new Set(['planned', 'verified', 'not-verified', 'not-applicable']);
const SUPPORTED_CHECK_STATUSES = new Set(['passed', 'failed', 'not-run']);
const SUPPORTED_CLIENT_REPLAY_RISKS = new Set(['none', 'possible', 'unknown']);
const MAX_ASSERTION_FAILURES = 50;

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} 必须是非空字符串`);
  }
  return value;
}

function resolveEvidenceLevels(value) {
  const configured = Array.isArray(value.evidenceLevels) && value.evidenceLevels.length > 0
    ? value.evidenceLevels
    : [value.evidenceLevel || 'runtime-ui'];
  return [...new Set(configured)];
}

function digestText(value) {
  return `sha256:${crypto.createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function actualContractDigest(casePath) {
  return digestText(fs.readFileSync(path.resolve(casePath), 'utf8'));
}

function isStableSelector(target) {
  return typeof target === 'string' && /^[.#[]/.test(target);
}

function validatePageArrangementData(data, field) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${field} 必须是非空对象`);
  }
  const entries = Object.entries(data);
  if (entries.length === 0 || entries.length > 20) {
    throw new Error(`${field} 必须包含 1 到 20 个页面状态字段`);
  }
  for (const [key, value] of entries) {
    if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(key)) {
      throw new Error(`${field}.${key} 不是安全的页面状态路径`);
    }
    if (/(token|authorization|password|secret|openid|unionid|session|accountno|idcard|certid|mobile|phone)/i.test(key)) {
      throw new Error(`${field}.${key} 不得设置身份、凭据或敏感业务字段`);
    }
    const primitive = value === null || ['boolean', 'string', 'number'].includes(typeof value);
    if (!primitive || (typeof value === 'number' && !Number.isFinite(value))) {
      throw new Error(`${field}.${key} 只允许布尔值、有限数字、短字符串或 null`);
    }
    if (typeof value === 'string' && (value.length > 128 || /\d{6,}/.test(value))) {
      throw new Error(`${field}.${key} 不得包含长文本或疑似敏感数字`);
    }
  }
  if (JSON.stringify(data).length > 4096) {
    throw new Error(`${field} 超过 4096 字节限制`);
  }
}

function validateDiagnosticExpectation(step, field) {
  if (!SUPPORTED_DIAGNOSTIC_KINDS.has(step.kind)) {
    throw new Error(`${field}.kind 只支持 toast、modal、console 或 exception`);
  }
  const message = assertString(step.messageIncludes, `${field}.messageIncludes`);
  if (message.length > 200) {
    throw new Error(`${field}.messageIncludes 不得超过 200 个字符`);
  }
  if (
    /\bBearer\s+\S+/i.test(message)
    || /(?:token|authorization|password|secret|openid|unionid|sessionid|idcard|certid|accountno)\s*[:=]/i.test(message)
    || /\d{10,}/.test(message)
    || /[A-Za-z0-9_-]{40,}/.test(message)
  ) {
    throw new Error(`${field}.messageIncludes 不得包含身份、凭据或疑似敏感值`);
  }
}

function verifyContractDigest(casePath, expectedDigest) {
  if (typeof expectedDigest !== 'string' || expectedDigest.length === 0) {
    const error = new Error('执行前必须提供准备阶段生成的契约摘要');
    error.code = 'CONTRACT_DIGEST_REQUIRED';
    throw error;
  }
  const actualDigest = actualContractDigest(casePath);
  if (actualDigest !== expectedDigest) {
    const error = new Error('测试脚本已在准备后发生变化，必须重新生成方案并重新取得批准');
    error.code = 'CONTRACT_DIGEST_MISMATCH';
    error.expectedDigest = expectedDigest;
    error.actualDigest = actualDigest;
    throw error;
  }
  return actualDigest;
}

function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('测试规格必须是对象');
  if (spec.schemaVersion !== 1) throw new Error('只支持结构版本 1');
  validateArtifactIdentifier(spec.id, 'id');
  assertString(spec.title, 'title');
  assertString(spec.projectPath, 'projectPath');
  if (spec.inputSource && !SUPPORTED_INPUT_SOURCES.has(spec.inputSource)) {
    throw new Error(`不支持的 inputSource：${spec.inputSource}`);
  }
  if (!SUPPORTED_MODES.has(spec.mode)) throw new Error(`不支持的 mode：${spec.mode}`);
  if (spec.evidenceLevel !== undefined) assertString(spec.evidenceLevel, 'evidenceLevel');
  if (spec.evidenceLevels !== undefined) {
    if (!Array.isArray(spec.evidenceLevels) || spec.evidenceLevels.length === 0) {
      throw new Error('evidenceLevels 必须是非空数组');
    }
    spec.evidenceLevels.forEach((item, index) => assertString(item, `evidenceLevels[${index}]`));
  }
  if (spec.identity) {
    if (typeof spec.identity !== 'object') throw new Error('identity 必须是对象');
    assertString(spec.identity.source, 'identity.source');
  }
  for (const [index, item] of (spec.sourceEvidence || []).entries()) {
    assertString(item && item.path, `sourceEvidence[${index}].path`);
    assertString(item.reason, `sourceEvidence[${index}].reason`);
  }
  for (const [index, item] of (spec.verificationLayers || []).entries()) {
    assertString(item && item.layer, `verificationLayers[${index}].layer`);
    assertString(item.expected, `verificationLayers[${index}].expected`);
    if (!SUPPORTED_LAYER_STATUSES.has(item.status)) {
      throw new Error(`verificationLayers[${index}].status 无效`);
    }
    if (item.status === 'verified') {
      throw new Error(`verificationLayers[${index}].status 不能在执行前声明为 verified`);
    }
    if (item.status === 'not-verified') assertString(item.reason, `verificationLayers[${index}].reason`);
  }
  for (const [index, item] of (spec.openQuestions || []).entries()) {
    assertString(item, `openQuestions[${index}]`);
  }
  for (const [index, item] of (spec.supplementalChecks || []).entries()) {
    assertString(item && item.name, `supplementalChecks[${index}].name`);
    assertString(item.kind, `supplementalChecks[${index}].kind`);
    if (!SUPPORTED_CHECK_STATUSES.has(item.status)) {
      throw new Error(`supplementalChecks[${index}].status 无效`);
    }
    if (item.details !== undefined) assertString(item.details, `supplementalChecks[${index}].details`);
  }
  if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
    throw new Error('steps 至少包含一个步骤');
  }
  const commitIds = new Set();
  const arrangementIds = new Set();
  const screenshotNames = new Set();
  let commitCount = 0;
  let formInteractionStarted = false;
  for (const [index, step] of spec.steps.entries()) {
    if (!step || !SUPPORTED_ACTIONS.has(step.action)) {
      throw new Error(`steps[${index}] 使用了不支持的操作`);
    }
    if (step.action === 'open') assertString(step.path, `steps[${index}].path`);
    if (step.action === 'tap') assertString(step.target, `steps[${index}].target`);
    if (step.action === 'arrangePageData') {
      if (spec.mode !== 'stateful') {
        throw new Error('只有有状态测试可以声明 arrangePageData');
      }
      if (formInteractionStarted) {
        throw new Error(`steps[${index}].arrangePageData 必须发生在输入或提交之前`);
      }
      assertString(step.arrangementId, `steps[${index}].arrangementId`);
      assertString(step.reason, `steps[${index}].reason`);
      assertString(step.evidenceImpact, `steps[${index}].evidenceImpact`);
      validatePageArrangementData(step.data, `steps[${index}].data`);
      if (arrangementIds.has(step.arrangementId)) {
        throw new Error(`steps[${index}].arrangementId 重复：${step.arrangementId}`);
      }
      arrangementIds.add(step.arrangementId);
    }
    if (step.action === 'commit') {
      formInteractionStarted = true;
      commitCount += 1;
      assertString(step.commitId, `steps[${index}].commitId`);
      assertString(step.target, `steps[${index}].target`);
      if (!isStableSelector(step.target)) {
        throw new Error(`steps[${index}].commit 必须使用稳定选择器`);
      }
      if (commitIds.has(step.commitId)) {
        throw new Error(`steps[${index}].commitId 重复：${step.commitId}`);
      }
      commitIds.add(step.commitId);
    }
    if (step.action === 'expectText') assertString(step.text, `steps[${index}].text`);
    if (step.action === 'expectVisible') assertString(step.target, `steps[${index}].target`);
    if (step.action === 'expectDiagnostic') validateDiagnosticExpectation(step, `steps[${index}]`);
    if (step.action === 'screenshot') {
      assertString(step.name, `steps[${index}].name`);
      const screenshotName = safeScreenshotName(step.name);
      if (screenshotNames.has(screenshotName)) {
        const error = new Error(`steps[${index}].name 与已有截图名称重复：${step.name}`);
        error.code = 'DUPLICATE_SCREENSHOT_NAME';
        error.category = 'artifact-integrity';
        throw error;
      }
      screenshotNames.add(screenshotName);
    }
    if (step.action === 'fill') {
      formInteractionStarted = true;
      assertString(step.target, `steps[${index}].target`);
      assertString(step.dataKey, `steps[${index}].dataKey`);
      if (!spec.testData || !spec.testData[step.dataKey]) {
        throw new Error(`steps[${index}].dataKey 未在 testData 声明`);
      }
    }
  }
  if (spec.mode === 'stateful') {
    if (!Array.isArray(spec.stateChanges) || spec.stateChanges.length === 0) {
      throw new Error('有状态测试必须声明 stateChanges');
    }
    if (commitCount === 0) throw new Error('有状态测试必须至少声明一个 commit');
    if (!spec.submissionPolicy || typeof spec.submissionPolicy !== 'object') {
      throw new Error('有状态测试必须声明 submissionPolicy');
    }
    if (spec.submissionPolicy.uiAttempts !== 1) {
      throw new Error('submissionPolicy.uiAttempts 必须为 1');
    }
    if (!SUPPORTED_CLIENT_REPLAY_RISKS.has(spec.submissionPolicy.clientReplayRisk)) {
      throw new Error('submissionPolicy.clientReplayRisk 无效');
    }
    if (typeof spec.submissionPolicy.networkAttemptsObservable !== 'boolean') {
      throw new Error('submissionPolicy.networkAttemptsObservable 必须是布尔值');
    }
    assertString(spec.submissionPolicy.reason, 'submissionPolicy.reason');
  } else if (commitCount > 0) {
    throw new Error('只有有状态测试可以声明 commit');
  }
}

function jsString(value) {
  return `'${String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')}'`;
}

function renderStep(step) {
  if (step.action === 'open') return `    await t.open(${jsString(step.path)});`;
  if (step.action === 'tap') return `    await t.tap(${jsString(step.target)});`;
  if (step.action === 'arrangePageData') {
    return `    await t.arrangePageData(${jsString(step.arrangementId)}, ${JSON.stringify(step.data)});`;
  }
  if (step.action === 'commit') {
    return `    await t.commit(${jsString(step.commitId)}, ${jsString(step.target)});`;
  }
  if (step.action === 'fill') {
    return `    await t.fill(${jsString(step.target)}, t.data(${jsString(step.dataKey)}));`;
  }
  if (step.action === 'expectText') return `    await t.expectText(${jsString(step.text)});`;
  if (step.action === 'expectVisible') return `    await t.expectVisible(${jsString(step.target)});`;
  if (step.action === 'expectDiagnostic') {
    return `    await t.expectDiagnostic(${jsString(step.kind)}, ${jsString(step.messageIncludes)});`;
  }
  return `    await t.screenshot(${jsString(step.name)});`;
}

function serializableTestData(testData = {}) {
  return Object.fromEntries(
    Object.entries(testData).map(([key, value]) => [key, {
      env: value.env,
      sensitive: value.sensitive === true,
      description: value.description || key,
    }]),
  );
}

function renderCase(spec) {
  const metadata = {
    schemaVersion: 1,
    id: spec.id,
    title: spec.title,
    objective: spec.objective || spec.title,
    inputSource: spec.inputSource || 'provided-spec',
    mode: spec.mode,
    projectPath: spec.projectPath,
    identity: spec.identity || { source: 'not-specified', required: false },
    preconditions: spec.preconditions || [],
    sourceEvidence: spec.sourceEvidence || [],
    verificationLayers: spec.verificationLayers || [],
    supplementalChecks: spec.supplementalChecks || [],
    openQuestions: spec.openQuestions || [],
    evidenceLevel: spec.evidenceLevel || resolveEvidenceLevels(spec)[0],
    evidenceLevels: resolveEvidenceLevels(spec),
    screenshotPolicy: spec.screenshotPolicy || 'safe-only',
    stateChanges: spec.stateChanges || [],
    submissionPolicy: spec.submissionPolicy || null,
    arrangements: spec.steps
      .filter((step) => step.action === 'arrangePageData')
      .map((step) => ({
        arrangementId: step.arrangementId,
        data: step.data,
        reason: step.reason,
        evidenceImpact: step.evidenceImpact,
      })),
    commits: spec.steps
      .filter((step) => step.action === 'commit')
      .map((step) => ({ commitId: step.commitId, target: step.target })),
    cleanupPolicy: spec.cleanupPolicy || 'not-specified',
    testData: serializableTestData(spec.testData),
  };
  const lines = [
    `const metadata = ${JSON.stringify(metadata, null, 2)};`,
    '',
    'module.exports = {',
    '  ...metadata,',
    '  retry: \'never\',',
    '  attempts: 1,',
    '  async run(t) {',
    ...spec.steps.map(renderStep),
    '  },',
    '};',
    '',
  ];
  return lines.join('\n');
}

function createPlan(spec, runId, contractDigest) {
  return {
    schemaVersion: 1,
    runId,
    caseId: spec.id,
    title: spec.title,
    objective: spec.objective || spec.title,
    inputSource: spec.inputSource || 'provided-spec',
    mode: spec.mode,
    projectPath: spec.projectPath,
    identity: spec.identity || { source: 'not-specified', required: false },
    preconditions: spec.preconditions || [],
    sourceEvidence: spec.sourceEvidence || [],
    verificationLayers: spec.verificationLayers || [],
    supplementalChecks: spec.supplementalChecks || [],
    openQuestions: spec.openQuestions || [],
    executionReady: (spec.openQuestions || []).length === 0,
    contractDigest,
    evidenceLevel: spec.evidenceLevel || resolveEvidenceLevels(spec)[0],
    evidenceLevels: resolveEvidenceLevels(spec),
    screenshotPolicy: spec.screenshotPolicy || 'safe-only',
    stateChanges: spec.stateChanges || [],
    submissionPolicy: spec.submissionPolicy || null,
    arrangements: spec.steps
      .filter((step) => step.action === 'arrangePageData')
      .map((step) => ({
        arrangementId: step.arrangementId,
        data: step.data,
        reason: step.reason,
        evidenceImpact: step.evidenceImpact,
      })),
    commits: spec.steps
      .filter((step) => step.action === 'commit')
      .map((step) => ({ commitId: step.commitId, target: step.target })),
    cleanupPolicy: spec.cleanupPolicy || 'not-specified',
    testData: serializableTestData(spec.testData),
    steps: spec.steps.map((step, index) => ({
      index: index + 1,
      action: step.action,
      target: step.path || step.target || step.text || step.name || step.arrangementId
        || (step.action === 'expectDiagnostic' ? `${step.kind}:${step.messageIncludes}` : undefined),
      dataKey: step.dataKey,
      commitId: step.commitId,
      arrangementId: step.arrangementId,
    })),
    stateChangeApprovalRequired: spec.mode === 'stateful',
    retry: 'never',
    attempts: 1,
  };
}

function renderPlan(plan) {
  const stateChanges = plan.stateChanges.length > 0
    ? plan.stateChanges.map((item) => `- ${item}`).join('\n')
    : '- 无';
  const data = Object.entries(plan.testData);
  const testData = data.length > 0
    ? data.map(([key, value]) => `- ${value.description}：运行时环境变量 \`${value.env}\`（${value.sensitive ? '敏感' : '普通'}）`).join('\n')
    : '- 无';
  const steps = plan.steps
    .map((step) => `${step.index}. ${step.action}${step.commitId ? ` [${step.commitId}]` : ''}：${step.target}${step.dataKey ? `（数据：${step.dataKey}）` : ''}`)
    .join('\n');
  const preconditions = plan.preconditions.length > 0
    ? plan.preconditions.map((item) => `- ${item}`).join('\n')
    : '- 无';
  const sourceEvidence = plan.sourceEvidence.length > 0
    ? plan.sourceEvidence.map((item) => `- \`${item.path}\`：${item.reason}`).join('\n')
    : '- 未提供';
  const verificationLayers = plan.verificationLayers.length > 0
    ? plan.verificationLayers.map(renderVerificationLayer).join('\n')
    : '- 仅按用例步骤验证运行时/UI，不宣称后台或外部系统闭环';
  const openQuestions = plan.openQuestions.length > 0
    ? plan.openQuestions.map((item) => `- ${item}`).join('\n')
    : '- 无';
  const supplementalChecks = renderSupplementalChecks(plan.supplementalChecks);
  const submissionPolicy = plan.submissionPolicy
    ? `- UI 提交次数：${plan.submissionPolicy.uiAttempts}\n- 客户端自动重放风险：\`${plan.submissionPolicy.clientReplayRisk}\`\n- 网络提交次数可观测：${plan.submissionPolicy.networkAttemptsObservable ? '是' : '否'}\n- 依据：${plan.submissionPolicy.reason}`
    : '- 不适用';
  const arrangements = plan.arrangements.length > 0
    ? plan.arrangements.map((item) => `- \`${item.arrangementId}\`：页面状态 \`${JSON.stringify(item.data)}\`；原因：${item.reason}；证据边界：${item.evidenceImpact}`).join('\n')
    : '- 无';

  return `# 测试方案：${plan.title}

- 用例：\`${plan.caseId}\`
- 目标：${plan.objective}
- 输入来源：\`${plan.inputSource}\`
- 类型：\`${plan.mode}\`
- 身份来源：\`${plan.identity.source}\`（${plan.identity.required ? '必需' : '非必需'}）
- 证据等级：${plan.evidenceLevels.map((item) => `\`${item}\``).join('、')}
- 截图策略：\`${plan.screenshotPolicy}\`
- 最大尝试次数：1
- 自动重试：禁止
- 状态变更批准：${plan.stateChangeApprovalRequired ? '执行前必须取得' : '不需要'}
- 执行契约摘要：\`${plan.contractDigest}\`
- 清理政策：\`${plan.cleanupPolicy}\`
- 执行就绪：${plan.executionReady ? '是' : '否（补齐下列信息前不得执行）'}

## 前置条件

${preconditions}

## 来源代码证据

${sourceEvidence}

## 分层验证计划

${verificationLayers}

## 补充检查

${supplementalChecks}

## 待补信息

${openQuestions}

## 状态变化

${stateChanges}

## 提交前页面准备

${arrangements}

## 提交策略

${submissionPolicy}

## 测试数据

${testData}

## 步骤

${steps}
`;
}

function prepareSession({ spec, outputRoot, runId }) {
  validateSpec(spec);
  assertString(outputRoot, 'outputRoot');
  validateArtifactIdentifier(runId, 'runId');
  if (!path.isAbsolute(outputRoot)) {
    const error = new Error('outputRoot 必须是绝对路径');
    error.code = 'OUTPUT_ROOT_NOT_ABSOLUTE';
    error.category = 'artifact-integrity';
    throw error;
  }

  const casesDir = path.join(outputRoot, 'cases');
  const reportsDir = path.join(outputRoot, 'reports');
  const caseRunDir = path.join(casesDir, runId);
  const reportDir = path.join(outputRoot, 'reports', runId);
  fs.mkdirSync(casesDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  const casePath = path.join(caseRunDir, `${spec.id}.js`);
  const planPath = path.join(reportDir, 'plan.md');
  const caseSource = renderCase(spec);
  const contractDigest = digestText(caseSource);
  const plan = createPlan(spec, runId, contractDigest);
  if (fs.existsSync(caseRunDir) || fs.existsSync(reportDir)) {
    const error = new Error(`run-id 已存在，拒绝覆盖准备产物：${runId}`);
    error.code = 'PREPARATION_ALREADY_EXISTS';
    error.category = 'artifact-integrity';
    throw error;
  }

  let caseDirectoryCreated = false;
  let reportDirectoryCreated = false;
  let caseWritten = false;
  let planWritten = false;
  try {
    fs.mkdirSync(caseRunDir, { mode: 0o700 });
    caseDirectoryCreated = true;
    fs.mkdirSync(reportDir, { mode: 0o700 });
    reportDirectoryCreated = true;
    fs.writeFileSync(casePath, caseSource, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    caseWritten = true;
    fs.writeFileSync(planPath, renderPlan(plan), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    planWritten = true;
  } catch (cause) {
    if ((planWritten || reportDirectoryCreated) && fs.existsSync(planPath)) {
      try { fs.unlinkSync(planPath); } catch {}
    }
    if ((caseWritten || caseDirectoryCreated) && fs.existsSync(casePath)) {
      try { fs.unlinkSync(casePath); } catch {}
    }
    if (reportDirectoryCreated) {
      try { fs.rmdirSync(reportDir); } catch {}
    }
    if (caseDirectoryCreated) {
      try { fs.rmdirSync(caseRunDir); } catch {}
    }
    if (cause && cause.code === 'EEXIST') {
      const error = new Error(`run-id 已被并发准备，拒绝覆盖：${runId}`);
      error.code = 'PREPARATION_ALREADY_EXISTS';
      error.category = 'artifact-integrity';
      throw error;
    }
    throw cause;
  }

  return { plan, casePath, planPath, reportDir };
}

function redactText(value, secrets) {
  let result = String(value || '');
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 0) result = result.replaceAll(secret, '[REDACTED]');
  }
  return result;
}

function redactDiagnosticText(value, secrets) {
  return redactText(value, secrets)
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/((?:token|authorization|password|secret|openid|unionid|sessionid|idcard|certid|accountno)\s*[:=]\s*)\S+/gi, '$1[REDACTED]')
    .replace(/\b\d{10,}\b/g, '[REDACTED_NUMBER]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[REDACTED_VALUE]')
    .slice(0, 1000);
}

function collectDiagnostics(adapter, secrets) {
  if (typeof adapter.getDiagnostics !== 'function') {
    return {
      capture: { console: false, exception: false, toastModal: false, notes: ['Adapter 未提供应用诊断能力'] },
      events: [],
    };
  }
  let raw;
  try {
    raw = adapter.getDiagnostics();
  } catch (error) {
    return {
      capture: {
        console: false,
        exception: false,
        toastModal: false,
        notes: [`读取应用诊断失败：${redactDiagnosticText(error.message, secrets)}`],
      },
      events: [],
    };
  }
  const capture = raw && raw.capture && typeof raw.capture === 'object' ? raw.capture : {};
  const notes = Array.isArray(capture.notes)
    ? capture.notes.slice(0, 10).map((item) => redactDiagnosticText(item, secrets))
    : [];
  const events = Array.isArray(raw && raw.events)
    ? raw.events.slice(0, 50).map((item) => ({
      kind: typeof item.kind === 'string' && /^[a-z-]{1,40}$/.test(item.kind) ? item.kind : 'application-message',
      level: typeof item.level === 'string' && /^[a-z-]{1,20}$/.test(item.level) ? item.level : 'info',
      message: redactDiagnosticText(item.message, secrets),
      observedAt: typeof item.observedAt === 'string' ? item.observedAt : null,
    })).filter((item) => item.message.length > 0)
    : [];
  return {
    capture: {
      console: capture.console === true,
      exception: capture.exception === true,
      toastModal: capture.toastModal === true,
      notes,
    },
    events,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderReportMarkdown(result) {
  const failure = result.failure
    ? `\n## 失败\n\n- 错误码：\`${result.failure.code}\`\n- 分类：\`${result.failure.category}\`\n- 信息：${result.failure.message}\n`
    : '';
  const screenshots = result.screenshots.length > 0
    ? result.screenshots.map((item) => `- ${item.name}：\`${item.path}\``).join('\n')
    : '- 无';
  const stateChanges = result.stateChanges.length > 0
    ? result.stateChanges.map((item) => `- ${item}`).join('\n')
    : '- 无';
  const sourceEvidence = result.sourceEvidence.length > 0
    ? result.sourceEvidence.map((item) => `- \`${item.path}\`：${item.reason}`).join('\n')
    : '- 未提供';
  const verificationLayers = result.verificationLayers.length > 0
    ? result.verificationLayers.map(renderVerificationLayer).join('\n')
    : '- 仅验证运行时/UI';
  const evidence = result.evidence.length > 0
    ? result.evidence.map((item) => `- ${item.kind}/${item.action || item.name}：${item.target || item.path || ''}`).join('\n')
    : '- 无';
  const supplementalChecks = renderSupplementalChecks(result.supplementalChecks);
  const approvedDigest = result.contract.approvedDigest || 'not-applicable';
  const submissionPolicy = result.submissionPolicy
    ? `- UI 提交次数上限：${result.submissionPolicy.uiAttempts}\n- 客户端自动重放风险：\`${result.submissionPolicy.clientReplayRisk}\`\n- 网络提交次数可观测：${result.submissionPolicy.networkAttemptsObservable ? '是' : '否'}\n- 依据：${result.submissionPolicy.reason}`
    : '- 不适用';
  const commits = result.commits.length > 0
    ? result.commits.map((item) => `- \`${item.commitId}\`：\`${item.status}\`；目标：\`${item.target}\`；UI 尝试：${item.uiAttempts}`).join('\n')
    : '- 无';
  const arrangements = result.arrangements.length > 0
    ? result.arrangements.map((item) => `- \`${item.arrangementId}\`：\`${item.status}\`；页面状态 \`${JSON.stringify(item.data)}\`；原因：${item.reason}；证据边界：${item.evidenceImpact}`).join('\n')
    : '- 无';
  const diagnosticCapture = `- 控制台警告/错误：${result.diagnostics.capture.console ? '已监听' : '不可用'}\n- 应用异常：${result.diagnostics.capture.exception ? '已监听' : '不可用'}\n- Toast/Modal：${result.diagnostics.capture.toastModal ? '已监听（保留原调用行为）' : '不可用'}${result.diagnostics.capture.notes.length > 0 ? `\n- 说明：${result.diagnostics.capture.notes.join('；')}` : ''}`;
  const diagnosticEvents = result.diagnostics.events.length > 0
    ? result.diagnostics.events.map((item) => `- \`${item.kind}\`/\`${item.level}\`：${item.message}`).join('\n')
    : '- 无';
  const diagnosticAssertions = result.diagnosticAssertions.length > 0
    ? result.diagnosticAssertions.map((item) => `- \`${item.diagnosticKind}\` 包含“${item.messageIncludes}”：通过`).join('\n')
    : '- 无';
  const assertionFailures = result.assertionFailures.length > 0
    ? result.assertionFailures.map((item) => `- \`${item.action}\` / \`${item.code}\`：${item.target}；${item.message}`).join('\n')
    : '- 无';
  const assertionFailureLimit = result.assertionFailuresTruncated
    ? `\n- 仅保留前 ${MAX_ASSERTION_FAILURES} 项；本轮共 ${result.assertionFailureTotal} 项失败断言。`
    : '';

  return `# 测试报告：${result.title}

- 用例：\`${result.caseId}\`
- 目标：${result.objective}
- 输入来源：\`${result.inputSource}\`
- 汇总结论：\`${result.status}\`
- 执行结果：\`${result.executionStatus}\`
- 业务结果：\`${result.businessOutcome}\`
- 类型：\`${result.mode}\`
- 身份来源：\`${result.identity.source}\`
- 证据等级：${result.evidenceLevels.map((item) => `\`${item}\``).join('、')}
- 执行次数：${result.attempts}
- 自动重试：禁止
- 清理政策：\`${result.cleanupPolicy}\`

## 执行环境

- Skill 运行时：\`${result.runtime.skillVersion}\`
- Node.js：\`${result.runtime.nodeVersion}\`
- Adapter：\`${result.runtime.adapter}\`
- 执行模式：\`${result.runtime.executionMode}\`
- Node 引导：\`${result.runtime.nodeBootstrap}\`
- 开发者工具 CLI 来源：\`${result.runtime.devtoolsCliSource}\`

## 执行契约

- 准备摘要：\`${result.contract.preparedDigest}\`
- 实际摘要：\`${result.contract.actualDigest}\`
- 批准摘要：\`${approvedDigest}\`
- 状态变更批准绑定：${result.contract.approvalBound ? '是' : '不适用'}
- 单次执行声明：\`${result.executionClaim.path}\`
- 执行声明时间：\`${result.executionClaim.claimedAt}\`

## 分层验证结论

${verificationLayers}

## 执行证据

${evidence}

## 失败的只读断言

${assertionFailures}${assertionFailureLimit}

## 应用诊断

${diagnosticCapture}

### 已通过的诊断断言

${diagnosticAssertions}

### 捕获的诊断事件

${diagnosticEvents}

## 补充检查

${supplementalChecks}

## 来源代码证据

${sourceEvidence}

## 声明的状态变化与清理政策

${stateChanges}

## 提交前页面准备与证据边界

${arrangements}

## 提交策略与结果

${submissionPolicy}

${commits}

## 截图

${screenshots}
${failure}
`;
}

function layerLabel(layer) {
  const labels = {
    'runtime-ui': '运行时/UI',
    'authenticated-business': '认证业务',
    backend: '后台',
    external: '外部系统',
  };
  return labels[layer] || layer;
}

function statusLabel(status) {
  const labels = {
    planned: '计划验证',
    verified: '已验证',
    'not-verified': '未验证',
    'not-applicable': '不适用',
  };
  return labels[status] || status;
}

function renderVerificationLayer(item) {
  const reason = item.reason ? `；${item.reason}` : '';
  return `- ${layerLabel(item.layer)}：${statusLabel(item.status)}；预期：${item.expected}${reason}`;
}

function resolveVerificationLayers(testCase, passed, runtime) {
  const evidenceLevels = new Set(resolveEvidenceLevels(testCase));
  const adapterVerifiedLayers = new Set(['runtime-ui', 'authenticated-business']);
  return (testCase.verificationLayers || []).map((item) => {
    if (item.status !== 'planned') return { ...item };
    if (runtime.executionMode !== 'real-devtools') {
      return {
        ...item,
        status: 'not-verified',
        reason: `${runtime.adapter} Adapter 不能形成真实业务证据`,
      };
    }
    if (!adapterVerifiedLayers.has(item.layer)) {
      return {
        ...item,
        status: 'not-verified',
        reason: item.reason || '开发者工具 UI 执行不能直接证明后台或外部系统状态',
      };
    }
    if (passed && evidenceLevels.has(item.layer)) {
      return { ...item, status: 'verified' };
    }
    return {
      ...item,
      status: 'not-verified',
      reason: item.reason || (passed ? '本轮没有取得该层级证据' : '用例未通过，未形成该层级证据'),
    };
  });
}

function deriveBusinessOutcome({
  testCase,
  runtime,
  failure,
  adapterStarted,
  caseCompleted,
  commits,
  verificationLayers,
}) {
  if (commits.some((item) => item.status === 'unknown')) return 'unknown';
  if (runtime.executionMode !== 'real-devtools') return 'not-verified';
  if (failure && !adapterStarted) return 'not-verified';
  if (failure && failure.category === 'assertion') return 'failed';
  if (failure && (!caseCompleted || failure.category === 'supplemental-check')) return 'failed';

  const requiredLayers = resolveEvidenceLevels(testCase);
  const allRequiredVerified = requiredLayers.every((layer) => (
    verificationLayers.some((item) => item.layer === layer && item.status === 'verified')
  ));
  return allRequiredVerified ? 'verified' : 'not-verified';
}

function aggregateStatus(executionStatus, businessOutcome) {
  if (executionStatus === 'failed') return businessOutcome === 'unknown' ? 'unknown' : 'failed';
  return businessOutcome === 'verified' ? 'passed' : businessOutcome;
}

function renderSupplementalChecks(checks = []) {
  if (checks.length === 0) return '- 无';
  const executed = checks.filter((item) => item.status !== 'not-run');
  const passed = executed.filter((item) => item.status === 'passed').length;
  const summary = executed.length > 0 ? `${passed}/${executed.length} 通过` : '0 项已执行';
  const items = checks.map((item) => {
    const details = item.details ? `；${item.details}` : '';
    return `- ${item.name}（${item.kind}）：${item.status}${details}`;
  });
  return [`- 汇总：${summary}`, ...items].join('\n');
}

function readSkillVersion() {
  const candidates = [
    path.join(__dirname, '..', '..', 'package.json'),
  ];
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(fs.readFileSync(candidate, 'utf8')).version;
      if (typeof value === 'string' && value.length > 0) return value;
    } catch {}
  }
  return 'unknown';
}

function createRuntimeInfo(adapter) {
  const adapterKind = typeof adapter.kind === 'string' ? adapter.kind : 'unknown';
  let executionMode = 'unknown';
  if (adapterKind === 'devtools') executionMode = 'real-devtools';
  else if (adapterKind === 'memory') executionMode = 'skill-self-test';
  else if (adapterKind === 'test-double') executionMode = 'test-double';
  const allowedCliSources = new Set(['explicit', 'environment', 'standard', 'unknown']);
  const devtoolsCliSource = adapterKind === 'devtools'
    ? (allowedCliSources.has(adapter.devtoolsCliSource) ? adapter.devtoolsCliSource : 'unknown')
    : 'not-applicable';
  return {
    skillVersion: readSkillVersion(),
    nodeVersion: process.version,
    nodeBootstrap: process.env[NODE_REEXEC_MARKER] === '1' ? 'auto-reexecuted' : 'current-process',
    adapter: adapterKind,
    executionMode,
    devtoolsCliSource,
  };
}

function writeReports(reportDir, result) {
  fs.mkdirSync(reportDir, { recursive: true });
  const markdown = renderReportMarkdown(result);
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(result.title)}</title></head><body><pre>${escapeHtml(markdown)}</pre></body></html>\n`;
  const outputs = [
    ['report.md', markdown],
    ['report.html', html],
    ['result.json', `${JSON.stringify(result, null, 2)}\n`],
  ];
  for (const [name, content] of outputs) {
    try {
      fs.writeFileSync(path.join(reportDir, name), content, {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'wx',
      });
    } catch (cause) {
      if (cause && cause.code === 'EEXIST') {
        const error = new Error(`报告产物已经存在，拒绝覆盖：${name}`);
        error.code = 'RUN_ARTIFACT_ALREADY_EXISTS';
        error.category = 'artifact-integrity';
        throw error;
      }
      throw cause;
    }
  }
}

function loadCase(casePath) {
  const absolute = path.resolve(casePath);
  delete require.cache[require.resolve(absolute)];
  const testCase = require(absolute);
  if (!testCase || typeof testCase.run !== 'function') throw new Error('测试脚本必须导出 run(t)');
  if (!SUPPORTED_MODES.has(testCase.mode)) throw new Error(`测试脚本 mode 无效：${testCase.mode}`);
  return testCase;
}

async function runSession({
  casePath,
  reportDir,
  adapter,
  runtimeData = {},
  approveStateChange = false,
  contractDigest,
  approvedPlanDigest,
}) {
  if (!adapter || typeof adapter.start !== 'function' || typeof adapter.stop !== 'function') {
    throw new Error('adapter 必须实现 start() 和 stop()');
  }
  const verifiedContractDigest = verifyContractDigest(casePath, contractDigest);
  const testCase = loadCase(casePath);
  if ((testCase.openQuestions || []).length > 0) {
    const error = new Error(`测试契约仍有待补信息：${testCase.openQuestions.join('；')}`);
    error.code = 'TEST_CONTRACT_INCOMPLETE';
    throw error;
  }
  if (testCase.mode === 'stateful' && approveStateChange !== true) {
    const error = new Error('有状态测试必须先获得明确执行批准');
    error.code = 'STATE_CHANGE_APPROVAL_REQUIRED';
    throw error;
  }
  if (testCase.mode === 'stateful') {
    if (typeof approvedPlanDigest !== 'string' || approvedPlanDigest.length === 0) {
      const error = new Error('有状态测试必须提供用户已批准的方案摘要');
      error.code = 'STATEFUL_PLAN_DIGEST_REQUIRED';
      throw error;
    }
    if (approvedPlanDigest !== contractDigest) {
      const error = new Error('用户批准的方案摘要与准备阶段执行契约不一致');
      error.code = 'STATEFUL_PLAN_DIGEST_MISMATCH';
      throw error;
    }
  }

  const runtime = createRuntimeInfo(adapter);
  const executionClaim = claimExecution({
    reportDir,
    contractDigest: verifiedContractDigest,
    caseId: testCase.id,
    skillVersion: runtime.skillVersion,
  });

  const resolvedRuntimeData = { ...runtimeData };
  for (const [key, descriptor] of Object.entries(testCase.testData || {})) {
    if (
      !Object.prototype.hasOwnProperty.call(resolvedRuntimeData, key) &&
      descriptor &&
      typeof descriptor.env === 'string' &&
      process.env[descriptor.env] !== undefined
    ) {
      resolvedRuntimeData[key] = process.env[descriptor.env];
    }
  }
  const secrets = Object.values(resolvedRuntimeData).filter((value) => typeof value === 'string');
  const evidence = [];
  const screenshots = [];
  const assertionFailures = [];
  let assertionFailureTotal = 0;
  const commits = (testCase.commits || []).map((item) => ({
    commitId: item.commitId,
    target: item.target,
    status: 'not-attempted',
    uiAttempts: 0,
    startedAt: null,
    finishedAt: null,
  }));
  const arrangements = (testCase.arrangements || []).map((item) => ({
    ...item,
    status: 'not-applied',
  }));
  const commitsById = new Map(commits.map((item) => [item.commitId, item]));
  const arrangementsById = new Map(arrangements.map((item) => [item.arrangementId, item]));
  let started = false;
  let caseCompleted = false;
  let failure = null;
  let diagnostics = {
    capture: { console: false, exception: false, toastModal: false, notes: [] },
    events: [],
  };
  const startedAt = new Date().toISOString();

  const invoke = async (name, args, record) => {
    if (typeof adapter[name] !== 'function') throw new Error(`adapter 未实现 ${name}()`);
    const value = await adapter[name](...args);
    if (record) evidence.push(record(value));
    return value;
  };
  const invokeAssertion = async (name, args, {
    action,
    target,
    successRecord,
  }) => {
    try {
      return await invoke(name, args, successRecord);
    } catch (error) {
      const shouldCollect = testCase.mode !== 'stateful' && error.category === 'assertion';
      if (!shouldCollect) throw error;

      assertionFailureTotal += 1;
      if (assertionFailures.length < MAX_ASSERTION_FAILURES) {
        const item = {
          action,
          target: redactText(target, secrets),
          code: error.code || 'ASSERTION_FAILED',
          message: redactText(error.message, secrets),
        };
        assertionFailures.push(item);
        evidence.push({
          kind: 'assertion',
          action,
          target: item.target,
          code: item.code,
          message: item.message,
          passed: false,
        });
      }
      return null;
    }
  };
  const context = {
    data(key) {
      if (!Object.prototype.hasOwnProperty.call(resolvedRuntimeData, key)) {
        throw new Error(`缺少运行时测试数据：${key}`);
      }
      return resolvedRuntimeData[key];
    },
    open: (route) => invoke('open', [route], () => ({ kind: 'ui', action: 'open', target: route })),
    tap: (target) => invoke('tap', [target], () => ({ kind: 'ui', action: 'tap', target })),
    async arrangePageData(arrangementId, data) {
      const arrangement = arrangementsById.get(arrangementId);
      if (!arrangement || JSON.stringify(arrangement.data) !== JSON.stringify(data)) {
        const error = new Error(`页面准备动作不在已批准契约中：${arrangementId}`);
        error.code = 'ARRANGEMENT_CONTRACT_MISMATCH';
        throw error;
      }
      if (arrangement.status !== 'not-applied') {
        const error = new Error(`页面准备动作不得重复执行：${arrangementId}`);
        error.code = 'ARRANGEMENT_ALREADY_APPLIED';
        throw error;
      }
      validatePageArrangementData(data, `arrangements.${arrangementId}.data`);
      await invoke('arrangePageData', [data]);
      arrangement.status = 'applied';
      evidence.push({
        kind: 'test-setup',
        action: 'arrangePageData',
        arrangementId,
        keys: Object.keys(data),
        reason: arrangement.reason,
        evidenceImpact: arrangement.evidenceImpact,
      });
    },
    async commit(commitId, target) {
      const commit = commitsById.get(commitId);
      if (!commit || commit.target !== target) {
        const error = new Error(`提交动作不在已批准契约中：${commitId}`);
        error.code = 'COMMIT_CONTRACT_MISMATCH';
        throw error;
      }
      if (commit.status !== 'not-attempted') {
        const error = new Error(`提交动作不得重复执行：${commitId}`);
        error.code = 'COMMIT_ALREADY_ATTEMPTED';
        throw error;
      }
      if (typeof adapter.commit !== 'function') {
        const error = new Error('adapter 未实现 commit()');
        error.commitDispatched = false;
        throw error;
      }

      commit.status = 'attempting';
      commit.startedAt = new Date().toISOString();
      try {
        await adapter.commit(target, { commitId });
        commit.status = 'attempted';
        commit.uiAttempts = 1;
        commit.finishedAt = new Date().toISOString();
      } catch (error) {
        if (error.commitDispatched === false) {
          commit.status = 'not-attempted';
          commit.uiAttempts = 0;
        } else {
          commit.status = 'unknown';
          commit.uiAttempts = 1;
        }
        commit.finishedAt = new Date().toISOString();
        throw error;
      }
    },
    fill: (target, value) => invoke('fill', [target, value], () => ({ kind: 'ui', action: 'fill', target, value: '[REDACTED]' })),
    expectText: (text) => invokeAssertion('expectText', [text], {
      action: 'expectText',
      target: text,
      successRecord: () => ({ kind: 'assertion', action: 'expectText', target: text, passed: true }),
    }),
    expectVisible: (target) => invokeAssertion('expectVisible', [target], {
      action: 'expectVisible',
      target,
      successRecord: () => ({ kind: 'assertion', action: 'expectVisible', target, passed: true }),
    }),
    expectDiagnostic: (kind, messageIncludes) => invokeAssertion(
      'expectDiagnostic',
      [kind, messageIncludes],
      {
        action: 'expectDiagnostic',
        target: `${kind}:${messageIncludes}`,
        successRecord: (matched) => ({
        kind: 'diagnostic-assertion',
        action: 'expectDiagnostic',
        target: `${kind}:${messageIncludes}`,
        diagnosticKind: kind,
        messageIncludes,
        observedKind: matched && matched.kind,
        observedLevel: matched && matched.level,
        passed: true,
        }),
      },
    ),
    async screenshot(name) {
      const screenshotPath = await invoke('screenshot', [name]);
      const item = { name, path: screenshotPath };
      screenshots.push(item);
      evidence.push({ kind: 'screenshot', ...item });
      return screenshotPath;
    },
  };

  try {
    await adapter.start();
    started = true;
    await testCase.run(context);
    caseCompleted = true;
  } catch (error) {
    failure = {
      code: error.code || (started ? 'AUTOMATION_FAILED' : 'ADAPTER_START_FAILED'),
      category: error.category || (started ? 'automation' : 'infrastructure'),
      message: redactText(error.message, secrets),
    };
  } finally {
    if (started) {
      try {
        await adapter.stop();
      } catch (error) {
        if (!failure) {
          failure = {
            code: error.code || 'ADAPTER_STOP_FAILED',
            category: error.category || 'infrastructure',
            message: redactText(error.message, secrets),
          };
        }
      }
    }
    diagnostics = collectDiagnostics(adapter, secrets);
  }

  for (const commit of commits) {
    if (caseCompleted && commit.status === 'attempted') {
      commit.status = 'observed-success';
    } else if (!caseCompleted && ['attempting', 'attempted'].includes(commit.status)) {
      commit.status = 'unknown';
      commit.finishedAt ||= new Date().toISOString();
    }
  }

  if (!failure && assertionFailureTotal > 0) {
    failure = {
      code: 'ASSERTION_FAILED',
      category: 'assertion',
      message: `本轮共有 ${assertionFailureTotal} 个只读断言失败`,
    };
  }

  const supplementalChecks = testCase.supplementalChecks || [];
  const failedSupplementalChecks = supplementalChecks.filter((item) => item.status === 'failed');
  if (!failure && failedSupplementalChecks.length > 0) {
    failure = {
      code: 'SUPPLEMENTAL_CHECK_FAILED',
      category: 'supplemental-check',
      message: `补充检查失败：${failedSupplementalChecks.map((item) => item.name).join('、')}`,
    };
  }


  const verificationLayers = resolveVerificationLayers(
    testCase,
    caseCompleted && assertionFailureTotal === 0,
    runtime,
  );
  const executionStatus = failure ? 'failed' : 'passed';
  const businessOutcome = deriveBusinessOutcome({
    testCase,
    runtime,
    failure,
    adapterStarted: started,
    caseCompleted,
    commits,
    verificationLayers,
  });
  const status = aggregateStatus(executionStatus, businessOutcome);
  evidence.push(...commits
    .filter((item) => item.status !== 'not-attempted' || item.startedAt)
    .map((item) => ({
      kind: 'commit',
      action: 'commit',
      commitId: item.commitId,
      target: item.target,
      status: item.status,
      uiAttempts: item.uiAttempts,
    })));
  const diagnosticAssertions = evidence
    .filter((item) => item.kind === 'diagnostic-assertion')
    .map((item) => ({ ...item }));

  const result = {
    schemaVersion: 1,
    caseId: testCase.id,
    title: testCase.title,
    objective: testCase.objective || testCase.title,
    inputSource: testCase.inputSource || 'provided-spec',
    mode: testCase.mode,
    identity: testCase.identity || { source: 'not-specified', required: false },
    status,
    executionStatus,
    businessOutcome,
    attempts: 1,
    retry: 'never',
    evidenceLevel: testCase.evidenceLevel || resolveEvidenceLevels(testCase)[0],
    evidenceLevels: resolveEvidenceLevels(testCase),
    screenshotPolicy: testCase.screenshotPolicy || 'safe-only',
    cleanupPolicy: testCase.cleanupPolicy || 'not-specified',
    contract: {
      preparedDigest: contractDigest,
      actualDigest: verifiedContractDigest,
      approvedDigest: testCase.mode === 'stateful' ? approvedPlanDigest : null,
      approvalBound: testCase.mode === 'stateful',
    },
    executionClaim,
    runtime,
    stateChanges: testCase.stateChanges || [],
    submissionPolicy: testCase.submissionPolicy || null,
    arrangements,
    commits,
    sourceEvidence: testCase.sourceEvidence || [],
    verificationLayers,
    supplementalChecks,
    startedAt,
    finishedAt: new Date().toISOString(),
    evidence,
    screenshots,
    assertionFailures,
    assertionFailureTotal,
    assertionFailuresTruncated: assertionFailureTotal > assertionFailures.length,
    diagnosticAssertions,
    diagnostics,
    failure,
  };
  writeReports(reportDir, result);
  return result;
}

module.exports = {
  prepareSession,
  runSession,
  verifyContractDigest,
};

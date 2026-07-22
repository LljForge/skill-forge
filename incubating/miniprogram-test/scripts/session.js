#!/usr/bin/env node

const { ensureSupportedNodeRuntime } = require('./runtime/node-version');

try {
  const runtime = ensureSupportedNodeRuntime({
    scriptPath: __filename,
    args: process.argv.slice(2),
  });
  if (runtime.reexecuted) process.exit(runtime.status);
} catch (error) {
  process.stderr.write(`${error.code || 'NODE_RUNTIME_ERROR'}: ${error.message}\n`);
  process.exit(2);
}

const fs = require('node:fs');
const path = require('node:path');

const { prepareSession, runSession, verifyContractDigest } = require('./runtime/session');
const { createDevtoolsAdapter } = require('./runtime/devtools-adapter');
const { resolveDevtoolsCliPath } = require('./runtime/devtools-cli');
const { createReconciliation } = require('./runtime/reconciliation');
const { createEvidenceAttachment } = require('./runtime/evidence-attachment');
const {
  inspectRuntimeDependency,
  installRuntimeDependencies,
  loadAutomator,
  publicDependencyStatus,
} = require('./runtime/dependency-bootstrap');
const {
  assertScreenshotTargetAvailable,
  safeScreenshotName,
} = require('./runtime/artifact-integrity');

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const values = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) throw new Error(`无法识别的参数：${token}`);
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      values[key] = true;
    } else {
      values[key] = next;
      index += 1;
    }
  }
  return { command, values };
}

function required(values, key) {
  const value = values[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`缺少 --${key}`);
  return value;
}

function createMemoryAdapter(reportDir) {
  return {
    kind: 'memory',
    async start() {},
    async stop() {},
    async open() {},
    async arrangePageData() {},
    async tap() {},
    async commit() {},
    async fill() {},
    async expectText() {},
    async expectVisible() {},
    async expectDiagnostic() {},
    async screenshot(name) {
      const screenshotsDir = path.join(reportDir, 'screenshots');
      fs.mkdirSync(screenshotsDir, { recursive: true });
      const target = path.join(screenshotsDir, `${safeScreenshotName(name)}.png`);
      assertScreenshotTargetAvailable(target);
      const onePixelPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      );
      fs.writeFileSync(target, onePixelPng, { mode: 0o600 });
      return path.relative(reportDir, target);
    },
  };
}

async function main() {
  const { command, values } = parseArguments(process.argv.slice(2));
  if (command === 'deps-status') {
    const result = publicDependencyStatus(inspectRuntimeDependency());
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'install-deps') {
    const result = installRuntimeDependencies({
      approved: values['approve-dependency-install'] === true,
      offline: values.offline === true,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'prepare') {
    const specPath = path.resolve(required(values, 'spec'));
    const outputRoot = path.resolve(required(values, 'output'));
    const runId = required(values, 'run-id');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const prepared = prepareSession({ spec, outputRoot, runId });
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      status: 'prepared',
      casePath: prepared.casePath,
      planPath: prepared.planPath,
      reportDir: prepared.reportDir,
      plan: prepared.plan,
      wroteFiles: true,
      executionStarted: false,
    }, null, 2)}\n`);
    return;
  }

  if (command === 'run') {
    const adapterName = required(values, 'adapter');
    const casePath = path.resolve(required(values, 'case'));
    const reportDir = path.resolve(required(values, 'report-dir'));
    const contractDigest = values['contract-digest'];
    if (typeof contractDigest !== 'string' || contractDigest.length === 0) {
      const error = new Error('执行前必须提供 prepare 返回的 --contract-digest');
      error.code = 'CONTRACT_DIGEST_REQUIRED';
      throw error;
    }
    let adapter;
    if (adapterName === 'memory') {
      adapter = createMemoryAdapter(reportDir);
    } else if (adapterName === 'devtools') {
      if (values['service-port-confirmed'] !== true || values['approve-startup-effects'] !== true) {
        const error = new Error('真实执行前必须确认服务端口并批准启动影响');
        error.code = 'RUNTIME_AUTHORIZATION_REQUIRED';
        throw error;
      }
      verifyContractDigest(casePath, contractDigest);
      const testCase = require(casePath);
      const cli = resolveDevtoolsCliPath({ explicitPath: values['cli-path'] });
      const automator = loadAutomator();
      adapter = createDevtoolsAdapter({
        automator,
        projectPath: testCase.projectPath,
        cliPath: cli.path,
        cliSource: cli.source,
        reportDir,
      });
    } else {
      throw new Error(`不支持的 Adapter：${adapterName}`);
    }
    const result = await runSession({
      casePath,
      reportDir,
      adapter,
      approveStateChange: values['approve-state-change'] === true,
      contractDigest,
      approvedPlanDigest: values['approve-plan-digest'],
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.executionStatus !== 'passed') process.exitCode = 1;
    return;
  }

  if (command === 'reconcile') {
    const result = createReconciliation({
      resultPath: path.resolve(required(values, 'result')),
      evidencePath: path.resolve(required(values, 'evidence')),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'attach-evidence') {
    const result = createEvidenceAttachment({
      resultPath: path.resolve(required(values, 'result')),
      evidencePath: path.resolve(required(values, 'evidence')),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  throw new Error('用法：session.js deps-status|install-deps|prepare|run|reconcile|attach-evidence [参数]');
}

main().catch((error) => {
  process.stderr.write(`${error.code || 'SESSION_ERROR'}: ${error.message}\n`);
  process.exitCode = [
    'STATE_CHANGE_APPROVAL_REQUIRED',
    'STATEFUL_PLAN_DIGEST_REQUIRED',
    'STATEFUL_PLAN_DIGEST_MISMATCH',
    'CONTRACT_DIGEST_REQUIRED',
    'CONTRACT_DIGEST_MISMATCH',
    'UNSAFE_ARTIFACT_IDENTIFIER',
    'OUTPUT_ROOT_NOT_ABSOLUTE',
    'PREPARATION_ALREADY_EXISTS',
    'DUPLICATE_SCREENSHOT_NAME',
    'RUN_ALREADY_CLAIMED',
    'RUN_ARTIFACT_ALREADY_EXISTS',
    'SCREENSHOT_ALREADY_EXISTS',
    'RUNTIME_AUTHORIZATION_REQUIRED',
    'AUTOMATOR_DEPENDENCY_MISSING',
    'DEPENDENCY_LOCK_INVALID',
    'DEPENDENCY_INSTALL_APPROVAL_REQUIRED',
    'DEPENDENCY_INSTALLER_NOT_FOUND',
    'DEPENDENCY_INSTALL_FAILED',
    'DEPENDENCY_INSTALL_VERIFICATION_FAILED',
    'DEVTOOLS_CLI_INVALID',
    'DEVTOOLS_CLI_NOT_FOUND',
    'RECONCILIATION_SCHEMA_INVALID',
    'RECONCILIATION_SENSITIVE_VALUE',
    'RECONCILIATION_CASE_MISMATCH',
    'RECONCILIATION_COMMIT_MISMATCH',
    'RECONCILIATION_EVIDENCE_INSUFFICIENT',
    'RECONCILIATION_ARTIFACT_DIGEST_MISMATCH',
    'RECONCILIATION_ALREADY_EXISTS',
    'EVIDENCE_ATTACHMENT_SCHEMA_INVALID',
    'EVIDENCE_ATTACHMENT_SENSITIVE_VALUE',
    'EVIDENCE_ATTACHMENT_CASE_MISMATCH',
    'EVIDENCE_ATTACHMENT_RESULT_INVALID',
    'EVIDENCE_ATTACHMENT_RECONCILIATION_REQUIRED',
    'EVIDENCE_ATTACHMENT_EVIDENCE_INSUFFICIENT',
    'EVIDENCE_ATTACHMENT_ARTIFACT_INVALID',
    'EVIDENCE_ATTACHMENT_ARTIFACT_DIGEST_MISMATCH',
    'EVIDENCE_ATTACHMENT_ALREADY_EXISTS',
    'EVIDENCE_ATTACHMENT_ORIGINAL_CHANGED',
  ].includes(error.code) ? 2 : 1;
});

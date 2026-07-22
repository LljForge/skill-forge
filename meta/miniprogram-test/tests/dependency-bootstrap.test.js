const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const skillRoot = require('./skill-root');
const cli = path.join(skillRoot, 'scripts', 'session.js');
const {
  dependencyContract,
  inspectRuntimeDependency,
  installRuntimeDependencies,
  loadAutomator,
  npmCliCandidates,
  publicDependencyStatus,
} = require(path.join(skillRoot, 'scripts/runtime/dependency-bootstrap'));

function temporarySkill({ installedVersion } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-test-dependency-'));
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify({
    name: 'dependency-test',
    version: '1.0.0',
    dependencies: { 'miniprogram-automator': '0.12.1' },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'package-lock.json'), `${JSON.stringify({
    name: 'dependency-test',
    version: '1.0.0',
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'dependency-test',
        version: '1.0.0',
        dependencies: { 'miniprogram-automator': '0.12.1' },
      },
      'node_modules/miniprogram-automator': { version: '0.12.1' },
    },
  }, null, 2)}\n`);
  if (installedVersion) installFakeAutomator(root, installedVersion);
  return root;
}

function installFakeAutomator(root, version = '0.12.1') {
  const moduleRoot = path.join(root, 'node_modules', 'miniprogram-automator');
  fs.mkdirSync(moduleRoot, { recursive: true });
  fs.writeFileSync(path.join(moduleRoot, 'package.json'), `${JSON.stringify({
    name: 'miniprogram-automator',
    version,
    main: 'index.js',
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(moduleRoot, 'index.js'), 'module.exports = { launch: async () => {} };\n');
}

function tree(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? [target, ...tree(target)] : [target];
  }).map((entry) => path.relative(root, entry)).sort();
}

test('依赖契约要求 package 与锁文件精确一致', () => {
  const root = temporarySkill();
  const contract = dependencyContract(root);
  assert.equal(contract.expectedVersion, '0.12.1');

  const lockPath = path.join(root, 'package-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.packages['node_modules/miniprogram-automator'].version = '0.12.0';
  fs.writeFileSync(lockPath, JSON.stringify(lock));
  assert.throws(
    () => dependencyContract(root),
    (error) => error.code === 'DEPENDENCY_LOCK_INVALID',
  );
});

test('缺失或版本不符的 Skill 本地依赖返回可审阅安装计划', () => {
  const missingRoot = temporarySkill();
  const missing = inspectRuntimeDependency({ skillRoot: missingRoot, env: {} });
  assert.equal(missing.status, 'install-required');
  assert.equal(missing.reason, 'missing');
  assert.deepEqual(missing.install.npmArgs, ['ci', '--omit=dev', '--ignore-scripts']);
  assert.equal(missing.install.requiresApproval, true);
  assert.equal(missing.wroteFiles, false);

  const mismatchRoot = temporarySkill({ installedVersion: '0.12.0' });
  const mismatch = inspectRuntimeDependency({ skillRoot: mismatchRoot, env: {} });
  assert.equal(mismatch.status, 'install-required');
  assert.equal(mismatch.reason, 'version-mismatch');
  assert.equal(mismatch.dependency.installedVersion, '0.12.0');
});

test('只接受 Skill 自身 node_modules 中精确版本的运行依赖', () => {
  const root = temporarySkill({ installedVersion: '0.12.1' });
  const status = inspectRuntimeDependency({ skillRoot: root, env: {} });
  assert.equal(status.status, 'ready');
  assert.equal(status.source, 'skill-local');
  assert.equal(typeof status.modulePath, 'string');
  const visible = publicDependencyStatus(status);
  assert.equal(Object.hasOwn(visible, 'modulePath'), false);
  assert.equal(visible.wroteFiles, false);
  assert.equal(typeof loadAutomator({ skillRoot: root }).launch, 'function');
});

test('只读状态检查不执行依赖顶层代码，真实加载阶段才执行', () => {
  const root = temporarySkill({ installedVersion: '0.12.1' });
  let loads = 0;
  const status = inspectRuntimeDependency({ skillRoot: root });
  assert.equal(status.status, 'ready');
  assert.equal(loads, 0);
  const loaded = loadAutomator({
    skillRoot: root,
    loadModule: (target) => {
      loads += 1;
      return { target };
    },
  });
  assert.equal(loads, 1);
  assert.equal(loaded.target, status.modulePath);
});

test('依赖解析到 Skill 目录外时拒绝使用', () => {
  const root = temporarySkill();
  const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-test-external-'));
  const externalPackage = path.join(externalRoot, 'package.json');
  const externalModule = path.join(externalRoot, 'index.js');
  fs.writeFileSync(externalPackage, JSON.stringify({ version: '0.12.1' }));
  fs.writeFileSync(externalModule, 'module.exports = {};\n');
  const status = inspectRuntimeDependency({
    skillRoot: root,
    env: {},
    resolveModule: (request) => request.endsWith('/package.json')
      ? externalPackage
      : externalModule,
  });
  assert.equal(status.status, 'install-required');
  assert.equal(status.reason, 'not-skill-local');
  assert.equal(status.source, 'external');
});

test('安装依赖未经批准时不检查、不启动进程也不写文件', () => {
  let inspected = false;
  let spawned = false;
  assert.throws(() => installRuntimeDependencies({
    approved: false,
    inspect: () => {
      inspected = true;
      return {};
    },
    spawn: () => {
      spawned = true;
      return { status: 0 };
    },
  }), (error) => error.code === 'DEPENDENCY_INSTALL_APPROVAL_REQUIRED');
  assert.equal(inspected, false);
  assert.equal(spawned, false);
});

test('获批安装只调用当前 Node 下的 npm CLI，固定参数且禁用 Shell', () => {
  const root = temporarySkill();
  const npmCli = path.join(root, 'npm-cli.js');
  fs.writeFileSync(npmCli, '');
  const calls = [];
  const result = installRuntimeDependencies({
    approved: true,
    offline: true,
    skillRoot: root,
    env: {},
    nodeExecutable: '/supported/node',
    resolveNpmCli: () => npmCli,
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      installFakeAutomator(root);
      return { status: 0 };
    },
  });
  assert.equal(result.status, 'installed');
  assert.equal(result.networkMode, 'offline');
  assert.equal(result.wroteFiles, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, '/supported/node');
  assert.deepEqual(calls[0].args, [npmCli, 'ci', '--omit=dev', '--ignore-scripts', '--offline']);
  assert.equal(calls[0].options.cwd, root);
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.encoding, 'utf8');
  assert.deepEqual(calls[0].options.stdio, ['ignore', 'pipe', 'pipe']);
});

test('npm CLI 候选只接受受支持 Node 配套的标准位置', () => {
  const candidates = npmCliCandidates({
    nodeExecutable: '/runtime/bin/node',
    platform: 'darwin',
  });
  assert.deepEqual(candidates, ['/runtime/lib/node_modules/npm/bin/npm-cli.js']);
});

test('deps-status 是零写入命令，install-deps 无批准时失败关闭', () => {
  const before = tree(skillRoot);
  const status = spawnSync(process.execPath, [cli, 'deps-status'], {
    encoding: 'utf8',
    env: { ...process.env, MINIPROGRAM_TEST_NODE_REEXEC: '1' },
  });
  assert.equal(status.status, 0, status.stderr);
  const output = JSON.parse(status.stdout);
  assert.equal(output.status, 'install-required');
  assert.equal(output.wroteFiles, false);
  assert.deepEqual(tree(skillRoot), before);

  const rejected = spawnSync(process.execPath, [cli, 'install-deps'], {
    encoding: 'utf8',
    env: { ...process.env, MINIPROGRAM_TEST_NODE_REEXEC: '1' },
  });
  assert.equal(rejected.status, 2);
  assert.match(rejected.stderr, /DEPENDENCY_INSTALL_APPROVAL_REQUIRED/);
  assert.deepEqual(tree(skillRoot), before);
});

test('真实执行依赖缺失时不生成 execution-claim', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-test-preclaim-'));
  const specPath = path.join(root, 'spec.json');
  const outputRoot = path.join(root, 'output');
  const projectPath = path.join(root, 'project');
  const devtoolsCli = path.join(root, 'cli');
  fs.mkdirSync(projectPath);
  fs.writeFileSync(devtoolsCli, '#!/bin/sh\n');
  fs.chmodSync(devtoolsCli, 0o700);
  fs.writeFileSync(specPath, `${JSON.stringify({
    schemaVersion: 1,
    id: 'TC-DEPS-PRECLAIM-001',
    title: '依赖执行前门禁',
    mode: 'read-only',
    projectPath,
    evidenceLevel: 'runtime-ui',
    screenshotPolicy: 'disabled',
    stateChanges: [],
    cleanupPolicy: 'not-applicable',
    steps: [{ action: 'open', path: '/pages/home/index' }],
  }, null, 2)}\n`);
  const prepared = spawnSync(process.execPath, [
    cli, 'prepare', '--spec', specPath, '--output', outputRoot, '--run-id', 'deps-preclaim',
  ], {
    encoding: 'utf8',
    env: { ...process.env, MINIPROGRAM_TEST_NODE_REEXEC: '1' },
  });
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
    '--cli-path', devtoolsCli,
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MINIPROGRAM_TEST_NODE_REEXEC: '1',
    },
  });
  assert.equal(executed.status, 2);
  assert.match(executed.stderr, /AUTOMATOR_DEPENDENCY_MISSING/);
  assert.equal(fs.existsSync(path.join(preparation.reportDir, 'execution-claim.json')), false);
  assert.equal(fs.existsSync(path.join(preparation.reportDir, 'result.json')), false);
});

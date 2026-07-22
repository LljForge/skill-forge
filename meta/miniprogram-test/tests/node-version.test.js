const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const skillRoot = require('./skill-root');

const {
  NODE_REEXEC_MARKER,
  assertSupportedNodeVersion,
  collectNodeCandidates,
  ensureSupportedNodeRuntime,
  selectSupportedNode,
} = require(path.join(skillRoot, 'scripts/runtime/node-version'));

test('只接受 Node.js 22 或 24', () => {
  assert.equal(assertSupportedNodeVersion('22.23.1'), 22);
  assert.equal(assertSupportedNodeVersion('v24.12.0'), 24);
});

test('拒绝 Node.js 25 和无法识别的版本', () => {
  assert.throws(
    () => assertSupportedNodeVersion('25.8.1'),
    (error) => error.code === 'UNSUPPORTED_NODE_VERSION' && /22 或 24/.test(error.message),
  );
  assert.throws(
    () => assertSupportedNodeVersion('unknown'),
    (error) => error.code === 'UNSUPPORTED_NODE_VERSION',
  );
});

test('从标准版本管理器目录收集候选且不依赖项目 PATH', () => {
  const candidates = collectNodeCandidates({
    env: {
      NVM_DIR: '/users/demo/.nvm',
      NVM_BIN: '/users/demo/.nvm/versions/node/v25.8.1/bin',
      ASDF_DATA_DIR: '/users/demo/.asdf',
      VOLTA_HOME: '/users/demo/.volta',
    },
    homeDir: '/users/demo',
    platform: 'darwin',
    readDirectory(directory) {
      if (directory === '/users/demo/.nvm/versions/node') {
        return ['v25.8.1', 'v24.12.0', 'v22.23.1'];
      }
      if (directory === '/users/demo/.asdf/installs/nodejs') return ['24.11.0'];
      return [];
    },
  });

  assert.equal(candidates.override, null);
  assert.ok(candidates.paths.includes('/users/demo/.nvm/versions/node/v24.12.0/bin/node'));
  assert.ok(candidates.paths.includes('/users/demo/.nvm/versions/node/v22.23.1/bin/node'));
  assert.ok(candidates.paths.includes('/users/demo/.asdf/installs/nodejs/24.11.0/bin/node'));
  assert.ok(candidates.paths.includes('/opt/homebrew/opt/node@24/bin/node'));
  assert.ok(!candidates.paths.some((item) => item.includes('node_modules/.bin')));
});

test('自动候选跳过 Node 25 并选择最高版本 Node 24', () => {
  const versions = new Map([
    ['/runtime/node25', '25.8.1'],
    ['/runtime/node22', '22.23.1'],
    ['/runtime/node24-old', '24.10.0'],
    ['/runtime/node24-new', '24.12.0'],
  ]);
  const selected = selectSupportedNode({
    override: null,
    paths: [...versions.keys()],
    currentExecutable: '/runtime/node25',
    probeNode: (candidate) => versions.get(candidate) || null,
  });

  assert.deepEqual(selected, {
    executable: '/runtime/node24-new',
    version: '24.12.0',
    major: 24,
    source: 'discovered',
  });
});

test('显式 Node 覆盖优先且无效时失败关闭', () => {
  const selected = selectSupportedNode({
    override: '/runtime/node22',
    paths: ['/runtime/node24'],
    probeNode: (candidate) => ({
      '/runtime/node22': '22.23.1',
      '/runtime/node24': '24.12.0',
    })[candidate] || null,
  });
  assert.equal(selected.executable, '/runtime/node22');
  assert.equal(selected.source, 'override');

  assert.throws(
    () => selectSupportedNode({
      override: '/runtime/node25',
      paths: ['/runtime/node24'],
      probeNode: () => '25.8.1',
    }),
    (error) => error.code === 'NODE_RUNTIME_OVERRIDE_INVALID',
  );
});

test('不支持的当前 Node 使用受支持候选单次重启并传递退出码', () => {
  let spawnCall;
  const result = ensureSupportedNodeRuntime({
    currentVersion: '25.8.1',
    currentExecutable: '/runtime/node25',
    env: {},
    scriptPath: '/plugin/session.js',
    args: ['attach-evidence', '--result', '/tmp/result.json'],
    collectCandidates: () => ({ override: null, paths: ['/runtime/node24'] }),
    probeNode: () => '24.12.0',
    spawnNode(executable, args, options) {
      spawnCall = { executable, args, options };
      return { status: 7, signal: null };
    },
  });

  assert.equal(result.reexecuted, true);
  assert.equal(result.status, 7);
  assert.equal(spawnCall.executable, '/runtime/node24');
  assert.deepEqual(spawnCall.args, ['/plugin/session.js', 'attach-evidence', '--result', '/tmp/result.json']);
  assert.equal(spawnCall.options.shell, false);
  assert.equal(spawnCall.options.env[NODE_REEXEC_MARKER], '1');
});

test('受支持的当前 Node 直接继续且不探测候选', () => {
  let collected = false;
  const result = ensureSupportedNodeRuntime({
    currentVersion: '24.12.0',
    collectCandidates() {
      collected = true;
      return { override: null, paths: [] };
    },
  });

  assert.deepEqual(result, { reexecuted: false, major: 24, version: '24.12.0' });
  assert.equal(collected, false);
});

test('找不到受支持候选时保持原有版本阻断且不启动子进程', () => {
  let spawned = false;
  assert.throws(
    () => ensureSupportedNodeRuntime({
      currentVersion: '25.8.1',
      env: {},
      collectCandidates: () => ({ override: null, paths: ['/runtime/node25'] }),
      probeNode: () => '25.8.1',
      spawnNode() {
        spawned = true;
        return { status: 0 };
      },
    }),
    (error) => error.code === 'UNSUPPORTED_NODE_VERSION',
  );
  assert.equal(spawned, false);
});

test('重启标记阻止不支持版本递归执行', () => {
  assert.throws(
    () => ensureSupportedNodeRuntime({
      currentVersion: '25.8.1',
      env: { [NODE_REEXEC_MARKER]: '1' },
      collectCandidates: () => ({ override: null, paths: ['/runtime/node24'] }),
      probeNode: () => '24.12.0',
    }),
    (error) => error.code === 'NODE_RUNTIME_REEXEC_LOOP',
  );
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const skillRoot = require('./skill-root');

const { resolveDevtoolsCliPath } = require(path.join(skillRoot, 'scripts/runtime/devtools-cli'));

test('显式开发者工具 CLI 绝对路径具有最高优先级', () => {
  const explicitPath = '/custom/wechat-devtools/cli';
  const resolved = resolveDevtoolsCliPath({
    explicitPath,
    env: { WECHAT_DEVTOOLS_CLI: '/environment/cli' },
    platform: 'darwin',
    probeFile: (candidate) => candidate === explicitPath,
  });

  assert.deepEqual(resolved, {
    path: explicitPath,
    source: 'argument',
  });
});

test('环境变量在没有显式参数时提供开发者工具 CLI', () => {
  const environmentPath = '/environment/wechat-devtools/cli';
  const resolved = resolveDevtoolsCliPath({
    env: { WECHAT_DEVTOOLS_CLI: environmentPath },
    platform: 'darwin',
    probeFile: (candidate) => candidate === environmentPath,
  });

  assert.deepEqual(resolved, {
    path: environmentPath,
    source: 'environment',
  });
});

test('macOS 自动发现官方标准开发者工具 CLI 路径', () => {
  const standardPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
  const resolved = resolveDevtoolsCliPath({
    env: {},
    platform: 'darwin',
    probeFile: (candidate) => candidate === standardPath,
  });

  assert.deepEqual(resolved, {
    path: standardPath,
    source: 'standard',
  });
});

test('Windows 从系统 Program Files 目录发现标准 cli.bat', () => {
  const standardPath = 'D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat';
  const resolved = resolveDevtoolsCliPath({
    env: { 'ProgramFiles(x86)': 'D:\\Program Files (x86)' },
    platform: 'win32',
    probeFile: (candidate) => candidate === standardPath,
  });

  assert.deepEqual(resolved, {
    path: standardPath,
    source: 'standard',
  });
});

test('找不到标准 CLI 时返回可操作错误且不扫描其他位置', () => {
  assert.throws(
    () => resolveDevtoolsCliPath({
      env: { 'ProgramFiles(x86)': 'D:\\Program Files (x86)' },
      platform: 'win32',
      probeFile: () => false,
    }),
    (error) => {
      assert.equal(error.code, 'DEVTOOLS_CLI_NOT_FOUND');
      assert.match(error.message, /--cli-path/);
      assert.match(error.message, /WECHAT_DEVTOOLS_CLI/);
      assert.deepEqual(error.attemptedPaths, [
        'D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
        'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
      ]);
      return true;
    },
  );
});

test('macOS 显式路径必须是可执行普通文件', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-cli-'));
  const cliPath = path.join(root, 'cli');
  fs.writeFileSync(cliPath, '#!/bin/sh\n', { mode: 0o600 });

  assert.throws(
    () => resolveDevtoolsCliPath({ explicitPath: cliPath, platform: 'darwin' }),
    (error) => error.code === 'DEVTOOLS_CLI_INVALID',
  );
});

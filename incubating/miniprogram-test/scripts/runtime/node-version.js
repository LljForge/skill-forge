const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const NODE_REEXEC_MARKER = 'MINIPROGRAM_TEST_NODE_REEXEC';
const SUPPORTED_MAJORS = new Set([22, 24]);

function parseNodeVersion(version) {
  const match = String(version).trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return {
    version: [match[1], match[2] || '0', match[3] || '0'].join('.'),
    major: Number(match[1]),
    parts: [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)],
  };
}

function assertSupportedNodeVersion(version = process.versions.node) {
  const parsed = parseNodeVersion(version);
  const major = parsed ? parsed.major : Number.NaN;
  if (![22, 24].includes(major)) {
    const error = new Error(`当前 Node.js ${version} 不受支持；请使用 Node.js 22 或 24`);
    error.code = 'UNSUPPORTED_NODE_VERSION';
    throw error;
  }
  return major;
}

function collectNodeCandidates({
  env = process.env,
  homeDir = os.homedir(),
  platform = process.platform,
  readDirectory = (directory) => fs.readdirSync(directory, { withFileTypes: true }),
} = {}) {
  const binary = platform === 'win32' ? 'node.exe' : 'node';
  const paths = [];
  const add = (candidate) => {
    if (typeof candidate !== 'string' || candidate.length === 0) return;
    const absolute = path.resolve(candidate);
    if (!paths.includes(absolute)) paths.push(absolute);
  };
  const addVersions = (root) => {
    if (!root) return;
    let entries;
    try {
      entries = readDirectory(root);
    } catch {
      return;
    }
    for (const entry of entries) {
      const name = typeof entry === 'string' ? entry : entry.name;
      if (!name || (typeof entry !== 'string' && !entry.isDirectory())) continue;
      add(platform === 'win32'
        ? path.join(root, name, binary)
        : path.join(root, name, 'bin', binary));
    }
  };

  add(env.NVM_BIN && path.join(env.NVM_BIN, binary));
  addVersions(env.NVM_DIR && path.join(env.NVM_DIR, 'versions', 'node'));
  addVersions(homeDir && path.join(homeDir, '.nvm', 'versions', 'node'));
  addVersions(env.ASDF_DATA_DIR && path.join(env.ASDF_DATA_DIR, 'installs', 'nodejs'));
  addVersions(homeDir && path.join(homeDir, '.asdf', 'installs', 'nodejs'));
  addVersions(homeDir && path.join(homeDir, '.local', 'share', 'mise', 'installs', 'node'));
  add(env.VOLTA_HOME && path.join(env.VOLTA_HOME, 'bin', binary));
  add(homeDir && path.join(homeDir, '.volta', 'bin', binary));

  if (platform === 'darwin') {
    add('/opt/homebrew/opt/node@24/bin/node');
    add('/opt/homebrew/opt/node@22/bin/node');
    add('/usr/local/opt/node@24/bin/node');
    add('/usr/local/opt/node@22/bin/node');
  }
  if (platform === 'win32') {
    add(env.NVM_SYMLINK && path.join(env.NVM_SYMLINK, binary));
    add(env.ProgramFiles && path.join(env.ProgramFiles, 'nodejs', binary));
  }

  return {
    override: env.MINIPROGRAM_TEST_NODE || null,
    paths,
  };
}

function probeNodeVersion(candidate) {
  try {
    if (!path.isAbsolute(candidate)) return null;
    const real = fs.realpathSync(candidate);
    if (!fs.statSync(real).isFile()) return null;
    fs.accessSync(real, fs.constants.X_OK);
    return execFileSync(real, ['-p', 'process.versions.node'], {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function selectSupportedNode({
  override,
  paths = [],
  currentExecutable = process.execPath,
  probeNode = probeNodeVersion,
} = {}) {
  if (override) {
    if (!path.isAbsolute(override)) {
      const error = new Error('MINIPROGRAM_TEST_NODE 必须是绝对路径');
      error.code = 'NODE_RUNTIME_OVERRIDE_INVALID';
      throw error;
    }
    const parsed = parseNodeVersion(probeNode(override));
    if (!parsed || !SUPPORTED_MAJORS.has(parsed.major)) {
      const error = new Error('MINIPROGRAM_TEST_NODE 必须指向 Node.js 22 或 24');
      error.code = 'NODE_RUNTIME_OVERRIDE_INVALID';
      throw error;
    }
    return {
      executable: override,
      version: parsed.version,
      major: parsed.major,
      source: 'override',
    };
  }

  const current = path.resolve(currentExecutable);
  const supported = [];
  for (const candidate of [...new Set(paths)]) {
    if (!path.isAbsolute(candidate) || path.resolve(candidate) === current) continue;
    const parsed = parseNodeVersion(probeNode(candidate));
    if (!parsed || !SUPPORTED_MAJORS.has(parsed.major)) continue;
    supported.push({
      executable: candidate,
      version: parsed.version,
      major: parsed.major,
      parts: parsed.parts,
      source: 'discovered',
    });
  }
  supported.sort((left, right) => {
    for (let index = 0; index < 3; index += 1) {
      if (left.parts[index] !== right.parts[index]) return right.parts[index] - left.parts[index];
    }
    return left.executable.localeCompare(right.executable);
  });
  const selected = supported[0];
  if (!selected) return null;
  return {
    executable: selected.executable,
    version: selected.version,
    major: selected.major,
    source: selected.source,
  };
}

function ensureSupportedNodeRuntime({
  currentVersion = process.versions.node,
  currentExecutable = process.execPath,
  env = process.env,
  scriptPath,
  args = [],
  collectCandidates = collectNodeCandidates,
  probeNode = probeNodeVersion,
  spawnNode = spawnSync,
} = {}) {
  const parsed = parseNodeVersion(currentVersion);
  if (parsed && SUPPORTED_MAJORS.has(parsed.major)) {
    return { reexecuted: false, major: parsed.major, version: parsed.version };
  }
  if (env[NODE_REEXEC_MARKER] === '1') {
    const error = new Error(`受支持 Node 重启后仍运行在 ${currentVersion}，已停止递归执行`);
    error.code = 'NODE_RUNTIME_REEXEC_LOOP';
    throw error;
  }

  const collected = collectCandidates({ env });
  const selected = selectSupportedNode({
    ...collected,
    currentExecutable,
    probeNode,
  });
  if (!selected) assertSupportedNodeVersion(currentVersion);
  if (typeof scriptPath !== 'string' || scriptPath.length === 0) {
    const error = new Error('自动切换 Node 时缺少当前脚本路径');
    error.code = 'NODE_RUNTIME_REEXEC_FAILED';
    throw error;
  }

  const child = spawnNode(selected.executable, [scriptPath, ...args], {
    env: {
      ...env,
      MINIPROGRAM_TEST_NODE: selected.executable,
      [NODE_REEXEC_MARKER]: '1',
    },
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (child.error) {
    const error = new Error(`无法使用受支持 Node.js 重新执行：${child.error.message}`);
    error.code = 'NODE_RUNTIME_REEXEC_FAILED';
    throw error;
  }
  if (!Number.isInteger(child.status)) {
    const error = new Error(`受支持 Node.js 子进程异常终止${child.signal ? `：${child.signal}` : ''}`);
    error.code = 'NODE_RUNTIME_REEXEC_FAILED';
    throw error;
  }
  return {
    reexecuted: true,
    status: child.status,
    executable: selected.executable,
    version: selected.version,
  };
}

module.exports = {
  NODE_REEXEC_MARKER,
  assertSupportedNodeVersion,
  collectNodeCandidates,
  ensureSupportedNodeRuntime,
  parseNodeVersion,
  probeNodeVersion,
  selectSupportedNode,
};

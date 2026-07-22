const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEPENDENCY_NAME = 'miniprogram-automator';
const SKILL_ROOT = path.resolve(__dirname, '../..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function dependencyContract(skillRoot = SKILL_ROOT) {
  const packagePath = path.join(skillRoot, 'package.json');
  const lockPath = path.join(skillRoot, 'package-lock.json');
  const packageJson = readJson(packagePath);
  const lockJson = readJson(lockPath);
  const expectedVersion = packageJson.dependencies && packageJson.dependencies[DEPENDENCY_NAME];
  const lockRootVersion = lockJson.packages
    && lockJson.packages['']
    && lockJson.packages[''].dependencies
    && lockJson.packages[''].dependencies[DEPENDENCY_NAME];
  const lockPackageVersion = lockJson.packages
    && lockJson.packages[`node_modules/${DEPENDENCY_NAME}`]
    && lockJson.packages[`node_modules/${DEPENDENCY_NAME}`].version;
  if (
    typeof expectedVersion !== 'string'
    || expectedVersion.length === 0
    || lockRootVersion !== expectedVersion
    || lockPackageVersion !== expectedVersion
  ) {
    const error = new Error(`${DEPENDENCY_NAME} 的 package.json 与 package-lock.json 版本不一致`);
    error.code = 'DEPENDENCY_LOCK_INVALID';
    throw error;
  }
  return {
    name: DEPENDENCY_NAME,
    expectedVersion,
    packagePath,
    lockPath,
  };
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative.length === 0 || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function installPlan(skillRoot, contract) {
  return {
    requiresApproval: true,
    command: {
      script: path.join(skillRoot, 'scripts', 'session.js'),
      name: 'install-deps',
      args: ['--approve-dependency-install'],
    },
    npmArgs: ['ci', '--omit=dev', '--ignore-scripts'],
    network: '首次安装可能访问 npm registry；已有缓存时可离线完成',
    writeScopes: [
      path.join(skillRoot, 'node_modules'),
      '当前用户的 npm 缓存与日志目录',
    ],
    dependency: {
      name: contract.name,
      expectedVersion: contract.expectedVersion,
    },
  };
}

function inspectRuntimeDependency({
  skillRoot = SKILL_ROOT,
  resolveModule = require.resolve,
} = {}) {
  const contract = dependencyContract(skillRoot);
  const localModules = path.join(fs.realpathSync(skillRoot), 'node_modules');
  let packagePath;
  let modulePath;
  try {
    packagePath = resolveModule(`${DEPENDENCY_NAME}/package.json`, { paths: [skillRoot] });
    modulePath = resolveModule(DEPENDENCY_NAME, { paths: [skillRoot] });
  } catch {
    return {
      schemaVersion: 1,
      status: 'install-required',
      reason: 'missing',
      source: 'skill-local',
      dependency: {
        name: contract.name,
        expectedVersion: contract.expectedVersion,
        installedVersion: null,
      },
      install: installPlan(skillRoot, contract),
      wroteFiles: false,
    };
  }
  try {
    packagePath = fs.realpathSync(packagePath);
    modulePath = fs.realpathSync(modulePath);
  } catch {
    return {
      schemaVersion: 1,
      status: 'install-required',
      reason: 'invalid-path',
      source: 'skill-local',
      dependency: {
        name: contract.name,
        expectedVersion: contract.expectedVersion,
        installedVersion: null,
      },
      install: installPlan(skillRoot, contract),
      wroteFiles: false,
    };
  }
  if (!isInside(localModules, packagePath) || !isInside(localModules, modulePath)) {
    return {
      schemaVersion: 1,
      status: 'install-required',
      reason: 'not-skill-local',
      source: 'external',
      dependency: {
        name: contract.name,
        expectedVersion: contract.expectedVersion,
        installedVersion: null,
      },
      install: installPlan(skillRoot, contract),
      wroteFiles: false,
    };
  }
  let installedVersion = null;
  try {
    installedVersion = readJson(packagePath).version || null;
  } catch {
    return {
      schemaVersion: 1,
      status: 'install-required',
      reason: 'invalid-package',
      source: 'skill-local',
      dependency: {
        name: contract.name,
        expectedVersion: contract.expectedVersion,
        installedVersion,
      },
      install: installPlan(skillRoot, contract),
      wroteFiles: false,
    };
  }
  if (installedVersion !== contract.expectedVersion) {
    return {
      schemaVersion: 1,
      status: 'install-required',
      reason: 'version-mismatch',
      source: 'skill-local',
      dependency: {
        name: contract.name,
        expectedVersion: contract.expectedVersion,
        installedVersion,
      },
      install: installPlan(skillRoot, contract),
      wroteFiles: false,
    };
  }
  return {
    schemaVersion: 1,
    status: 'ready',
    reason: null,
    source: 'skill-local',
    dependency: {
      name: contract.name,
      expectedVersion: contract.expectedVersion,
      installedVersion,
    },
    install: null,
    wroteFiles: false,
    modulePath,
  };
}

function publicDependencyStatus(status) {
  const { modulePath, ...publicStatus } = status;
  return {
    ...publicStatus,
    nodeVersion: process.versions.node,
  };
}

function loadAutomator({
  loadModule = (target) => require(target),
  ...inspectOptions
} = {}) {
  const status = inspectRuntimeDependency(inspectOptions);
  if (status.status !== 'ready') {
    const error = new Error(
      `Skill 自身缺少可用的 ${DEPENDENCY_NAME} ${status.dependency.expectedVersion}；请先运行 deps-status 并在获批后执行 install-deps`,
    );
    error.code = 'AUTOMATOR_DEPENDENCY_MISSING';
    error.dependencyStatus = publicDependencyStatus(status);
    throw error;
  }
  try {
    return loadModule(status.modulePath);
  } catch (cause) {
    const error = new Error(`${DEPENDENCY_NAME} 已安装但无法加载：${cause.message}`);
    error.code = 'AUTOMATOR_DEPENDENCY_MISSING';
    throw error;
  }
}

function npmCliCandidates({
  nodeExecutable = process.execPath,
  platform = process.platform,
} = {}) {
  const candidates = [];
  const add = (candidate) => {
    if (typeof candidate !== 'string' || candidate.length === 0 || !path.isAbsolute(candidate)) return;
    const absolute = path.resolve(candidate);
    if (!candidates.includes(absolute)) candidates.push(absolute);
  };
  const nodeDirectory = path.dirname(nodeExecutable);
  if (platform === 'win32') {
    add(path.join(nodeDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  } else {
    add(path.resolve(nodeDirectory, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  }
  return candidates;
}

function findNpmCli(options = {}) {
  for (const candidate of npmCliCandidates(options)) {
    try {
      const real = fs.realpathSync(candidate);
      if (fs.statSync(real).isFile()) return real;
    } catch {
      // 继续检查下一个受控候选。
    }
  }
  const error = new Error('当前受支持 Node.js 未找到配套 npm CLI；请安装包含 npm 的 Node.js 22 或 24');
  error.code = 'DEPENDENCY_INSTALLER_NOT_FOUND';
  throw error;
}

function installRuntimeDependencies({
  approved = false,
  offline = false,
  skillRoot = SKILL_ROOT,
  env = process.env,
  nodeExecutable = process.execPath,
  spawn = spawnSync,
  resolveNpmCli = findNpmCli,
  inspect = inspectRuntimeDependency,
} = {}) {
  if (!approved) {
    const error = new Error('安装 Skill 运行依赖前必须获得用户明确批准并提供 --approve-dependency-install');
    error.code = 'DEPENDENCY_INSTALL_APPROVAL_REQUIRED';
    throw error;
  }
  const before = inspect({ skillRoot });
  if (before.status === 'ready') {
    return {
      ...publicDependencyStatus(before),
      status: 'already-ready',
      wroteFiles: false,
    };
  }
  const npmCli = resolveNpmCli({ nodeExecutable, platform: process.platform });
  const npmArgs = [npmCli, 'ci', '--omit=dev', '--ignore-scripts'];
  if (offline) npmArgs.push('--offline');
  const child = spawn(nodeExecutable, npmArgs, {
    cwd: skillRoot,
    env,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  if (child.error || !Number.isInteger(child.status) || child.status !== 0) {
    const detail = child.error ? child.error.message : `退出码 ${child.status}`;
    const error = new Error(`npm ci 安装 Skill 运行依赖失败：${detail}；node_modules 可能已改变，请保持失败关闭`);
    error.code = 'DEPENDENCY_INSTALL_FAILED';
    error.wroteFiles = true;
    throw error;
  }
  const after = inspect({ skillRoot });
  if (after.status !== 'ready') {
    const error = new Error(`npm ci 完成后 ${DEPENDENCY_NAME} 仍不可用：${after.reason}`);
    error.code = 'DEPENDENCY_INSTALL_VERIFICATION_FAILED';
    error.wroteFiles = true;
    throw error;
  }
  return {
    ...publicDependencyStatus(after),
    status: 'installed',
    wroteFiles: true,
    networkMode: offline ? 'offline' : 'registry-or-cache',
  };
}

module.exports = {
  DEPENDENCY_NAME,
  SKILL_ROOT,
  dependencyContract,
  findNpmCli,
  inspectRuntimeDependency,
  installRuntimeDependencies,
  loadAutomator,
  npmCliCandidates,
  publicDependencyStatus,
};

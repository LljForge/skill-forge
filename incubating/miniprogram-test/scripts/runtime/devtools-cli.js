const fs = require('node:fs');
const path = require('node:path');

function resolveDevtoolsCliPath({
  explicitPath,
  env = process.env,
  platform = process.platform,
  probeFile,
} = {}) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const isUsableFile = probeFile || ((candidate) => {
    try {
      if (!fs.statSync(candidate).isFile()) return false;
      if (platform !== 'win32') fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
  if (typeof explicitPath === 'string' && explicitPath.length > 0) {
    if (!pathApi.isAbsolute(explicitPath) || !isUsableFile(explicitPath)) {
      const error = new Error('显式开发者工具 CLI 必须是存在的绝对文件路径');
      error.code = 'DEVTOOLS_CLI_INVALID';
      throw error;
    }
    return { path: explicitPath, source: 'argument' };
  }
  const environmentPath = env.WECHAT_DEVTOOLS_CLI;
  if (typeof environmentPath === 'string' && environmentPath.length > 0) {
    if (!pathApi.isAbsolute(environmentPath) || !isUsableFile(environmentPath)) {
      const error = new Error('WECHAT_DEVTOOLS_CLI 必须是存在的绝对文件路径');
      error.code = 'DEVTOOLS_CLI_INVALID';
      throw error;
    }
    return { path: environmentPath, source: 'environment' };
  }
  const standardPaths = platform === 'darwin'
    ? ['/Applications/wechatwebdevtools.app/Contents/MacOS/cli']
    : platform === 'win32'
      ? [
        env['ProgramFiles(x86)'] && path.win32.join(env['ProgramFiles(x86)'], 'Tencent', '微信web开发者工具', 'cli.bat'),
        'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
      ].filter(Boolean)
      : [];
  const uniqueStandardPaths = [...new Set(standardPaths)];
  const discovered = uniqueStandardPaths.find((candidate) => isUsableFile(candidate));
  if (discovered) return { path: discovered, source: 'standard' };
  const error = new Error('未找到微信开发者工具 CLI；请通过 --cli-path 或 WECHAT_DEVTOOLS_CLI 提供绝对路径');
  error.code = 'DEVTOOLS_CLI_NOT_FOUND';
  error.attemptedPaths = uniqueStandardPaths;
  throw error;
}

module.exports = {
  resolveDevtoolsCliPath,
};

const fs = require('node:fs');
const path = require('node:path');

const candidates = [
  process.env.MINIPROGRAM_TEST_SKILL_ROOT,
  path.resolve(__dirname, '../miniprogram-test'),
  path.resolve(__dirname, '../../../incubating/miniprogram-test'),
].filter(Boolean).map((candidate) => path.resolve(candidate));

const skillRoot = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'SKILL.md')));
if (!skillRoot) {
  throw new Error(`未找到 miniprogram-test Skill；已检查：${candidates.join(', ')}`);
}

module.exports = skillRoot;

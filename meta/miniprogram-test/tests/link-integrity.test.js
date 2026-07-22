const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skillRoot = require('./skill-root');

function filesUnder(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return [];
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

function resolveLocalModule(fromFile, request) {
  const base = path.resolve(path.dirname(fromFile), request);
  const candidates = [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

test('Skill 内所有静态相对模块引用都能解析', () => {
  const scripts = filesUnder(path.join(skillRoot, 'scripts')).filter((file) => file.endsWith('.js'));
  for (const file of scripts) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)) {
      assert.ok(
        resolveLocalModule(file, match[1]),
        `${path.relative(skillRoot, file)} 存在无法解析的模块引用：${match[1]}`,
      );
    }
  }
});

test('SKILL.md 引用的脚本和资产全部存在', () => {
  const expected = [
    'scripts/session.js',
    'assets/test-spec.example.json',
    'assets/test-spec.stateful.example.json',
    'assets/evidence-attachment.example.json',
    'assets/reconciliation-evidence.example.json',
  ];
  for (const relative of expected) {
    assert.ok(fs.existsSync(path.join(skillRoot, relative)), `缺少 Skill 引用文件：${relative}`);
  }
});

test('Skill 不引用旧 Plugin、业务仓库、安装缓存或不分发的 meta 目录', () => {
  const forbidden = [
    '/Users/lilongjian/Projects/GMZB/edoc',
    '/Users/lilongjian/.codex/plugins/cache',
    'miniprogram-testing-plugin',
    '.codex-plugin',
    'meta/miniprogram-test',
    '../meta/',
  ];
  for (const file of filesUnder(skillRoot)) {
    if (!/\.(?:md|js|json|yaml)$/.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const token of forbidden) {
      assert.equal(content.includes(token), false, `${path.relative(skillRoot, file)} 包含禁用引用：${token}`);
    }
  }
});

test('Skill 目录不包含符号链接', () => {
  for (const file of filesUnder(skillRoot)) {
    assert.equal(fs.lstatSync(file).isSymbolicLink(), false, `发现符号链接：${file}`);
  }
});

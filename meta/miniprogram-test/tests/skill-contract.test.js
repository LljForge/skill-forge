const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const skillRoot = require('./skill-root');
const skillPath = path.join(skillRoot, 'SKILL.md');
const statefulExamplePath = path.join(skillRoot, 'assets/test-spec.stateful.example.json');
const sessionScriptPath = path.join(skillRoot, 'scripts/session.js');

test('Skill 是自包含的轻量微信小程序测试入口', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  assert.doesNotMatch(skill, /\[TODO:/);
  assert.match(skill, /自然语言功能目标或用户提供的测试用例/);
  assert.match(skill, /测试方案、可读测试脚本和测试报告/);
  assert.match(skill, /首次环境检查是测试流程的内部步骤/);
  assert.match(skill, /只读测试.*不因普通流程重复请求确认/s);
  assert.match(skill, /状态变更、造数、签约、支付或不可逆操作/);
  assert.match(skill, /不得生成 manifest、setup-state、framework 副本、Probe Pack/);
  assert.match(skill, /memory Adapter.*不得冒充真实微信开发者工具测试/s);
  assert.match(skill, /`npm ci --omit=dev --ignore-scripts`.*Skill 自身/s);
  assert.match(skill, /不得在被测小程序项目安装依赖/);
  assert.match(skill, /session\.js deps-status/);
  assert.match(skill, /session\.js install-deps --approve-dependency-install/);
  assert.match(skill, /不得静默安装/);
  assert.match(skill, /execution-claim\.json.*前再次校验/s);
  assert.doesNotMatch(skill, /miniprogram-testing-plugin|\.codex-plugin|plugins\/miniprogram-testing/);
});

test('Skill 固定通过单一确定性脚本准备和运行会话', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  assert.match(skill, /<Skill 目录>\/scripts\/session\.js prepare/);
  assert.match(skill, /<Skill 目录>\/scripts\/session\.js run/);
  assert.match(skill, /--approve-state-change/);
  assert.match(skill, /Skill 更新前.*完整更新内容/s);
  assert.match(skill, /Skill 运行时版本、Node 版本.*Adapter/s);
  assert.match(skill, /Node 自动切换只重新启动同一条 Skill 命令，不是业务重试/);
  assert.match(skill, /--cli-path.*WECHAT_DEVTOOLS_CLI.*macOS.*Windows/s);
  assert.match(skill, /AUTOMATION_PORT_PERMISSION_DENIED/);
  assert.match(skill, /assertionFailures/);
  assert.match(skill, /有状态.*首个失败.*停止/s);
  assert.match(skill, /cases\/<run-id>\/<case-id>\.js/);
  assert.match(skill, /execution-claim\.json/);
  assert.match(skill, /RUN_ALREADY_CLAIMED/);
  assert.match(skill, /SCREENSHOT_ALREADY_EXISTS/);
  assert.match(skill, /session\.js reconcile/);
  assert.match(skill, /session\.js attach-evidence/);

  const readOnlyExample = JSON.parse(fs.readFileSync(
    path.join(skillRoot, 'assets/test-spec.example.json'),
    'utf8',
  ));
  assert.equal(readOnlyExample.steps.filter((step) => step.action === 'expectDiagnostic').length, 1);
  const statefulExample = JSON.parse(fs.readFileSync(statefulExamplePath, 'utf8'));
  assert.equal(statefulExample.mode, 'stateful');
  assert.equal(statefulExample.steps.filter((step) => step.action === 'commit').length, 1);
  assert.equal(statefulExample.steps.filter((step) => step.action === 'arrangePageData').length, 1);
  assert.equal(statefulExample.submissionPolicy.uiAttempts, 1);
  const reconciliationExample = JSON.parse(fs.readFileSync(
    path.join(skillRoot, 'assets/reconciliation-evidence.example.json'),
    'utf8',
  ));
  assert.equal(reconciliationExample.schemaVersion, 1);
  assert.equal(reconciliationExample.commitEffect, 'applied');
  const sessionScript = fs.readFileSync(sessionScriptPath, 'utf8');
  assert.match(sessionScript, /require\('\.\/runtime\/session'\)/);
  assert.match(sessionScript, /cliSource:\s*cli\.source/);
});

test('Skill 在确定性命令后按固定字段有界收尾', () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  assert.match(skill, /有界收尾协议/);
  assert.match(skill, /命令退出后立即进入收尾/);
  assert.match(skill, /不得为了补充汇报继续遍历项目、历史报告或无关代码/);
  assert.match(skill, /executionStatus.*businessOutcome.*尝试次数.*提交效果/s);
  assert.match(skill, /run.*attach-evidence.*reconcile.*不自动重试/s);
  assert.match(skill, /结论、证据边界、产物和必要后续四部分/);
});

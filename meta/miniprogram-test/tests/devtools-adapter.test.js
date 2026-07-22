const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const skillRoot = require('./skill-root');

const {
  createDevtoolsAdapter,
  findAvailablePort,
  isPortAvailable,
} = require(path.join(skillRoot, 'scripts/runtime/devtools-adapter'));

function createPortServerDouble({ errorCode } = {}) {
  let errorListener;
  return {
    listenOptions: null,
    unref() {},
    once(event, listener) {
      if (event === 'error') errorListener = listener;
    },
    listen(options, listener) {
      this.listenOptions = options;
      queueMicrotask(() => {
        if (errorCode) {
          const error = new Error(errorCode);
          error.code = errorCode;
          errorListener(error);
        } else {
          listener();
        }
      });
    },
    close(listener) {
      listener();
    },
  };
}

test('端口探测只绑定本地回环地址并正常释放', async () => {
  const server = createPortServerDouble();
  const available = await isPortAvailable(9420, { serverFactory: () => server });

  assert.equal(available, true);
  assert.deepEqual(server.listenOptions, {
    port: 9420,
    host: '127.0.0.1',
    exclusive: true,
  });
});

test('只有端口占用才继续扫描，权限拒绝立即失败', async () => {
  const scanned = [];
  const available = await findAvailablePort(9420, 3, {
    probePort: async (port, options) => {
      scanned.push([port, options.host]);
      return port === 9421;
    },
  });
  assert.equal(available, 9421);
  assert.deepEqual(scanned, [[9420, '127.0.0.1'], [9421, '127.0.0.1']]);

  const deniedServer = createPortServerDouble({ errorCode: 'EPERM' });
  await assert.rejects(
    isPortAvailable(9420, { serverFactory: () => deniedServer }),
    (error) => {
      assert.equal(error.code, 'AUTOMATION_PORT_PERMISSION_DENIED');
      assert.equal(error.category, 'environment-permission');
      assert.match(error.message, /本地回环套接字权限/);
      return true;
    },
  );

  const occupiedServer = createPortServerDouble({ errorCode: 'EADDRINUSE' });
  assert.equal(await isPortAvailable(9420, { serverFactory: () => occupiedServer }), false);
});

test('开发者工具 Adapter 隐藏连接、元素操作、截图和关闭细节', async () => {
  const calls = [];
  const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-'));
  const selectorButton = {
    tap: async () => calls.push(['selectorTap']),
    input: async (value) => calls.push(['input', value]),
    text: async () => '选择器按钮',
  };
  const textButton = {
    tap: async () => calls.push(['textTap']),
    input: async (value) => calls.push(['textInput', value]),
    text: async () => '确认绑定',
  };
  const successText = {
    tap: async () => {},
    input: async () => {},
    text: async () => '绑定成功',
  };
  const page = {
    $: async (selector) => (['#account', '.card-item'].includes(selector) ? selectorButton : null),
    $$: async (selector) => (selector === 'view' ? [textButton, successText] : []),
    setData: async (data) => calls.push(['setData', data]),
  };
  const miniProgram = {
    callWxMethod: async (method, payload) => calls.push(['wx', method, payload]),
    currentPage: async () => page,
    screenshot: async ({ path: screenshotPath }) => {
      calls.push(['screenshot', screenshotPath]);
      fs.writeFileSync(screenshotPath, 'png');
    },
    close: async () => calls.push(['close']),
  };
  const automator = {
    launch: async (options) => {
      calls.push(['launch', options]);
      return miniProgram;
    },
  };
  const adapter = createDevtoolsAdapter({
    automator,
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    cliSource: 'standard',
    reportDir,
    portResolver: async () => 9427,
    timeoutMs: 1000,
    routeSettleMs: 0,
    assertionTimeoutMs: 2,
    assertionPollMs: 1,
  });

  assert.equal(adapter.kind, 'devtools');
  assert.equal(adapter.devtoolsCliSource, 'standard');
  await adapter.start();
  await adapter.open('/pages/bank-card/create');
  await adapter.arrangePageData({ showAddCardDialog: true });
  await adapter.tap('确认绑定');
  await adapter.commit('.card-item', { commitId: 'bind-bank-card' });
  await adapter.fill('#account', 'sensitive-card-runtime-value');
  await adapter.expectText('绑定成功');
  await adapter.expectVisible('.card-item');
  const screenshot = await adapter.screenshot('result');
  await adapter.stop();

  assert.deepEqual(calls[0], ['launch', {
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    projectPath: '/example/miniprogram',
    port: 9427,
    timeout: 1000,
  }]);
  assert.equal(calls.filter(([name]) => name === 'launch').length, 1);
  assert.ok(calls.some(([name, method]) => name === 'wx' && method === 'reLaunch'));
  assert.ok(calls.some(([name, data]) => name === 'setData' && data.showAddCardDialog === true));
  assert.ok(calls.some(([name]) => name === 'textTap'));
  assert.equal(calls.filter(([name]) => name === 'selectorTap').length, 1);
  assert.ok(calls.some(([name, value]) => name === 'input' && value === 'sensitive-card-runtime-value'));
  assert.equal(calls.filter(([name]) => name === 'close').length, 1);
  assert.equal(screenshot, 'screenshots/result.png');
  assert.ok(fs.existsSync(path.join(reportDir, screenshot)));
});

test('中文截图名称生成稳定且互不冲突的安全文件名', async () => {
  const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-'));
  const written = [];
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        screenshot: async ({ path: screenshotPath }) => {
          written.push(screenshotPath);
          fs.writeFileSync(screenshotPath, 'png');
        },
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir,
    portResolver: async () => 9450,
    timeoutMs: 1000,
  });

  await adapter.start();
  const first = await adapter.screenshot('首页产品区域');
  const second = await adapter.screenshot('首页公开产品展示');
  await adapter.stop();

  assert.notEqual(first, second);
  assert.match(first, /^screenshots\/screenshot-[a-f0-9]{10}\.png$/);
  assert.match(second, /^screenshots\/screenshot-[a-f0-9]{10}\.png$/);
  assert.equal(written.length, 2);
  assert.ok(fs.existsSync(path.join(reportDir, first)));
  assert.ok(fs.existsSync(path.join(reportDir, second)));
});

test('截图目标已经存在时拒绝覆盖且不再次调用开发者工具', async () => {
  const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-'));
  let screenshotCalls = 0;
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        screenshot: async ({ path: screenshotPath }) => {
          screenshotCalls += 1;
          fs.writeFileSync(screenshotPath, 'original');
        },
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir,
    portResolver: async () => 9451,
    timeoutMs: 1000,
  });

  await adapter.start();
  const screenshotPath = await adapter.screenshot('same-shot');
  await assert.rejects(
    adapter.screenshot('same-shot'),
    (error) => error.code === 'SCREENSHOT_ALREADY_EXISTS',
  );
  await adapter.stop();

  assert.equal(screenshotCalls, 1);
  assert.equal(fs.readFileSync(path.join(reportDir, screenshotPath), 'utf8'), 'original');
});

test('开发者工具 Adapter 拒绝非枚举 CLI 来源，避免路径或任意文本进入报告', () => {
  assert.throws(() => createDevtoolsAdapter({
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    cliSource: '/secret/custom/path',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
  }), /cliSource 只能是/);
});

test('文本和可见性断言失败具有明确错误码且不触发业务操作', async () => {
  let pageReads = 0;
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        currentPage: async () => {
          pageReads += 1;
          return { $: async () => null, $$: async () => [] };
        },
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9429,
    timeoutMs: 1000,
    routeSettleMs: 0,
    assertionTimeoutMs: 2,
    assertionPollMs: 1,
  });

  await adapter.start();
  await assert.rejects(adapter.expectVisible('.missing'), (error) => {
    assert.equal(error.code, 'ASSERTION_ELEMENT_NOT_VISIBLE');
    assert.equal(error.category, 'assertion');
    assert.match(error.message, /未找到预期可见元素/);
    return true;
  });
  await assert.rejects(adapter.expectText('缺失文案'), (error) => {
    assert.equal(error.code, 'ASSERTION_TEXT_NOT_FOUND');
    assert.equal(error.category, 'assertion');
    assert.match(error.message, /未找到预期文本/);
    return true;
  });
  await adapter.stop();
  assert.ok(pageReads >= 1);
});

test('找不到目标元素时只做有界读取且不重试点击', async () => {
  let pageReads = 0;
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        currentPage: async () => {
          pageReads += 1;
          return { $: async () => null, $$: async () => [] };
        },
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9428,
    timeoutMs: 1000,
    routeSettleMs: 0,
    assertionTimeoutMs: 2,
    assertionPollMs: 1,
  });

  await adapter.start();
  await assert.rejects(adapter.tap('不存在'), /未找到可操作元素/);
  await adapter.stop();
  assert.ok(pageReads >= 1);
});

test('文本断言执行有界轮询并在异步内容出现后通过', async () => {
  let pageReads = 0;
  const expected = { text: async () => '异步成功' };
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        currentPage: async () => {
          pageReads += 1;
          return {
            $: async () => null,
            $$: async (selector) => (pageReads >= 2 && selector === 'view' ? [expected] : []),
          };
        },
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9430,
    timeoutMs: 1000,
    routeSettleMs: 0,
    assertionTimeoutMs: 1000,
    assertionPollMs: 1,
  });

  await adapter.start();
  await adapter.expectText('异步成功');
  await adapter.stop();
  assert.ok(pageReads >= 2);
});

test('文本定位出现多个精确匹配时失败关闭而不是点击第一个', async () => {
  let taps = 0;
  const duplicated = () => ({
    text: async () => '确认',
    tap: async () => { taps += 1; },
  });
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        currentPage: async () => ({
          $: async () => null,
          $$: async (selector) => (['button', '.items'].includes(selector) ? [duplicated(), duplicated()] : []),
        }),
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9431,
    timeoutMs: 1000,
    routeSettleMs: 0,
    assertionTimeoutMs: 2,
    assertionPollMs: 1,
  });

  await adapter.start();
  await adapter.expectText('确认');
  await adapter.expectVisible('.items');
  await assert.rejects(adapter.tap('确认'), /匹配到多个元素/);
  await adapter.stop();
  assert.equal(taps, 0);
});

test('提交动作只接受稳定选择器且点击异常标记为已发出未知结果', async () => {
  let taps = 0;
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        currentPage: async () => ({
          $: async () => null,
          $$: async (selector) => (selector === '.commit-button' ? [{
            tap: async () => {
              taps += 1;
              throw new Error('连接中断');
            },
          }] : []),
        }),
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9432,
    timeoutMs: 1000,
    routeSettleMs: 0,
    assertionTimeoutMs: 2,
    assertionPollMs: 1,
  });

  await adapter.start();
  await assert.rejects(
    adapter.commit('确认', { commitId: 'bad-target' }),
    (error) => error.code === 'COMMIT_SELECTOR_REQUIRED' && error.commitDispatched === false,
  );
  await assert.rejects(
    adapter.commit('.commit-button', { commitId: 'bind-bank-card' }),
    (error) => error.commitDispatched === true,
  );
  await adapter.stop();
  assert.equal(taps, 1);
});

test('最佳努力捕获应用错误与 Toast 并在停止时恢复监听', async () => {
  const listeners = new Map();
  const applicationCalls = [];
  const originalToast = (options) => {
    applicationCalls.push(['toast', options]);
    return 'toast-result';
  };
  const originalModal = (options) => {
    applicationCalls.push(['modal', options]);
    return 'modal-result';
  };
  globalThis.wx = { showToast: originalToast, showModal: originalModal };
  const miniProgram = {
    on: (event, listener) => listeners.set(event, listener),
    off: (event) => listeners.delete(event),
    exposeFunction: async (name, binding) => {
      globalThis[name] = binding;
    },
    evaluate: async (fn, ...args) => fn(...args),
    close: async () => {},
  };
  const adapter = createDevtoolsAdapter({
    automator: { launch: async () => miniProgram },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9433,
    timeoutMs: 1000,
  });

  await adapter.start();
  listeners.get('console')({ type: 'error', args: [{ value: '请求失败' }] });
  listeners.get('exception')({ description: '应用异常' });
  assert.equal(globalThis.wx.showToast({ title: '添加成功' }), 'toast-result');
  assert.equal(globalThis.wx.showModal({ title: '提示', content: '业务拒绝' }), 'modal-result');
  const toastEvidence = await adapter.expectDiagnostic('toast', '添加成功');
  const modalEvidence = await adapter.expectDiagnostic('modal', '业务拒绝');
  assert.equal(toastEvidence.kind, 'toast');
  assert.equal(modalEvidence.kind, 'modal');
  const beforeStop = adapter.getDiagnostics();
  assert.equal(beforeStop.capture.console, true);
  assert.equal(beforeStop.capture.exception, true);
  assert.equal(beforeStop.capture.toastModal, true);
  assert.deepEqual(beforeStop.events.map((item) => item.kind), ['console', 'exception', 'toast', 'modal']);
  assert.deepEqual(applicationCalls.map(([kind]) => kind), ['toast', 'modal']);
  await adapter.stop();
  assert.equal(globalThis.wx.showToast, originalToast);
  assert.equal(globalThis.wx.showModal, originalModal);
  assert.equal(listeners.size, 0);
  delete globalThis.__miniprogramTestingDiagnostic;
  delete globalThis.wx;
});

test('诊断断言只做有界等待，事件缺失时明确失败', async () => {
  const miniProgram = {
    on() {},
    off() {},
    exposeFunction: async (name, binding) => {
      globalThis[name] = binding;
    },
    evaluate: async (fn, ...args) => fn(...args),
    close: async () => {},
  };
  globalThis.wx = { showToast() {}, showModal() {} };
  const adapter = createDevtoolsAdapter({
    automator: { launch: async () => miniProgram },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9434,
    timeoutMs: 1000,
    assertionTimeoutMs: 2,
    assertionPollMs: 1,
  });

  await adapter.start();
  await assert.rejects(
    adapter.expectDiagnostic('toast', '未出现'),
    (error) => (
      error.code === 'DIAGNOSTIC_EXPECTATION_NOT_MET'
      && error.category === 'assertion'
    ),
  );
  await adapter.stop();
  delete globalThis.__miniprogramTestingDiagnostic;
  delete globalThis.wx;
});

test('运行时不支持监听时诊断断言失败关闭', async () => {
  const adapter = createDevtoolsAdapter({
    automator: {
      launch: async () => ({
        close: async () => {},
      }),
    },
    projectPath: '/example/miniprogram',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    reportDir: fs.mkdtempSync(path.join(os.tmpdir(), 'miniprogram-devtools-adapter-')),
    portResolver: async () => 9435,
    timeoutMs: 1000,
    assertionTimeoutMs: 2,
    assertionPollMs: 1,
  });

  await adapter.start();
  await assert.rejects(
    adapter.expectDiagnostic('toast', '任意提示'),
    (error) => (
      error.code === 'DIAGNOSTIC_CAPTURE_UNAVAILABLE'
      && error.category === 'infrastructure'
    ),
  );
  await adapter.stop();
});

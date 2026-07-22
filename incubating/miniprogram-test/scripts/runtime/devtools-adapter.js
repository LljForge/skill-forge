const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const {
  assertScreenshotTargetAvailable,
  safeScreenshotName,
} = require('./artifact-integrity');
const { loadAutomator } = require('./dependency-bootstrap');

const TEXT_SELECTORS = ['button', 'view', 'text', 'van-button', 'input'];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isPortAvailable(port, {
  host = '127.0.0.1',
  serverFactory = () => net.createServer(),
} = {}) {
  return new Promise((resolve, reject) => {
    const server = serverFactory();
    server.unref();
    server.once('error', (cause) => {
      if (cause && cause.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      const permissionDenied = cause && ['EPERM', 'EACCES'].includes(cause.code);
      const error = new Error(permissionDenied
        ? `当前执行环境缺少本地回环套接字权限，无法探测自动化端口 ${host}:${port}；请使用 Codex 受控权限执行真实 devtools 命令`
        : `探测自动化端口 ${host}:${port} 失败${cause && cause.code ? `：${cause.code}` : ''}`);
      error.code = permissionDenied
        ? 'AUTOMATION_PORT_PERMISSION_DENIED'
        : 'AUTOMATION_PORT_PROBE_FAILED';
      error.category = permissionDenied ? 'environment-permission' : 'infrastructure';
      error.cause = cause;
      reject(error);
    });
    server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
  });
}

async function findAvailablePort(startPort = 9420, scanLimit = 50, {
  host = '127.0.0.1',
  probePort = isPortAvailable,
} = {}) {
  for (let offset = 0; offset < scanLimit; offset += 1) {
    const port = startPort + offset;
    if (await probePort(port, { host })) return port;
  }
  throw new Error(`未找到可用自动化端口：${startPort}-${startPort + scanLimit - 1}`);
}

function isColdStartHandshakeError(error) {
  const message = String(error && error.message);
  return message.includes("reading 'split'") || message.includes("property 'split'");
}

function looksLikeSelector(target) {
  return /^[.#[]/.test(target) || target.includes(' ') || target.includes('>');
}

function diagnosticMessage(value, depth = 0) {
  if (depth > 3 || value === null || value === undefined) return '';
  if (['string', 'number', 'boolean'].includes(typeof value)) return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => diagnosticMessage(item, depth + 1)).filter(Boolean).join(' ');
  }
  if (typeof value !== 'object') return '';
  const preferred = ['message', 'description', 'title', 'content', 'value', 'text', 'args'];
  return preferred
    .map((key) => diagnosticMessage(value[key], depth + 1))
    .filter(Boolean)
    .join(' ');
}

async function findByText(page, expectedText, { requireUnique = true } = {}) {
  const expected = String(expectedText).replace(/\s+/g, ' ').trim();
  for (const selector of TEXT_SELECTORS) {
    const elements = await page.$$(selector);
    const matches = [];
    for (const element of elements) {
      const text = String(await element.text()).replace(/\s+/g, ' ').trim();
      if (text === expected) matches.push(element);
    }
    if (matches.length > 1 && requireUnique) {
      const error = new Error(`文本“${expected}”匹配到多个元素，请改用稳定选择器`);
      error.code = 'ELEMENT_AMBIGUOUS';
      throw error;
    }
    if (matches.length > 0) return matches[0];
  }
  return null;
}

async function findElement(page, target, { requireUnique = true } = {}) {
  if (looksLikeSelector(target)) {
    if (typeof page.$$ === 'function') {
      const elements = await page.$$(target);
      if (elements.length > 1 && requireUnique) {
        const error = new Error(`选择器“${target}”匹配到多个元素`);
        error.code = 'ELEMENT_AMBIGUOUS';
        throw error;
      }
      if (elements.length > 0) return elements[0];
    }
    const element = typeof page.$ === 'function' ? await page.$(target) : null;
    if (element) return element;
    return null;
  }
  return findByText(page, target, { requireUnique });
}

function createDevtoolsAdapter({
  automator,
  projectPath,
  cliPath,
  cliSource = 'unknown',
  reportDir,
  portResolver = findAvailablePort,
  timeoutMs = 30_000,
  routeSettleMs = 800,
  assertionTimeoutMs = 5_000,
  assertionPollMs = 250,
  coldStartDelayMs = 6_000,
  coldStartTimeoutMs = 15_000,
}) {
  if (!path.isAbsolute(projectPath)) throw new Error('projectPath 必须是绝对路径');
  if (!path.isAbsolute(cliPath)) throw new Error('cliPath 必须是绝对路径');
  if (!path.isAbsolute(reportDir)) throw new Error('reportDir 必须是绝对路径');
  if (!['explicit', 'environment', 'standard', 'unknown'].includes(cliSource)) {
    throw new Error('cliSource 只能是 explicit、environment、standard 或 unknown');
  }

  let miniProgram = null;
  const diagnosticEvents = [];
  const diagnosticCapture = {
    console: false,
    exception: false,
    toastModal: false,
    notes: [],
  };
  const diagnosticBinding = '__miniprogramTestingDiagnostic';
  const diagnosticHookKey = '__miniprogramTestingDiagnosticHooks';
  let consoleListener = null;
  let exceptionListener = null;

  function recordDiagnostic(kind, payload, level) {
    if (diagnosticEvents.length >= 50) return;
    const message = diagnosticMessage(payload).replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (!message) return;
    diagnosticEvents.push({
      kind,
      level: level || (payload && payload.type) || 'info',
      message,
      observedAt: new Date().toISOString(),
    });
  }

  async function enableDiagnostics(active) {
    if (typeof active.on === 'function') {
      consoleListener = (event) => {
        const level = String(event && event.type || 'log').toLowerCase();
        if (['error', 'warn', 'warning'].includes(level)) recordDiagnostic('console', event, level);
      };
      exceptionListener = (event) => recordDiagnostic('exception', event, 'error');
      active.on('console', consoleListener);
      active.on('exception', exceptionListener);
      diagnosticCapture.console = true;
      diagnosticCapture.exception = true;
    } else {
      diagnosticCapture.notes.push('当前 automator 不支持应用日志与异常事件');
    }

    if (typeof active.exposeFunction !== 'function' || typeof active.evaluate !== 'function') {
      diagnosticCapture.notes.push('当前 automator 不支持非侵入式 Toast/Modal 监听');
      return;
    }
    try {
      await withTimeout(active.exposeFunction(diagnosticBinding, (event) => {
        recordDiagnostic(event && event.kind || 'application-message', event, 'info');
      }), timeoutMs, '注册应用诊断回调超时');
      const installed = await withTimeout(active.evaluate(function installDiagnosticHooks(bindingName, hookKey) {
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this);
        const wxObject = typeof wx !== 'undefined' ? wx : root && root.wx;
        if (!root || !wxObject || root[hookKey]) return false;
        const originals = {
          showToast: wxObject.showToast,
          showModal: wxObject.showModal,
        };
        const notify = (payload) => {
          try {
            if (typeof root[bindingName] === 'function') root[bindingName](payload);
          } catch {}
        };
        if (typeof originals.showToast === 'function') {
          wxObject.showToast = function observedShowToast(options) {
            notify({ kind: 'toast', message: String(options && options.title || '') });
            return originals.showToast.apply(this, arguments);
          };
        }
        if (typeof originals.showModal === 'function') {
          wxObject.showModal = function observedShowModal(options) {
            notify({
              kind: 'modal',
              title: String(options && options.title || ''),
              message: String(options && options.content || ''),
            });
            return originals.showModal.apply(this, arguments);
          };
        }
        root[hookKey] = { originals, wxObject };
        return true;
      }, diagnosticBinding, diagnosticHookKey), timeoutMs, '安装 Toast/Modal 诊断监听超时');
      diagnosticCapture.toastModal = installed === true;
      if (!diagnosticCapture.toastModal) diagnosticCapture.notes.push('当前运行时未安装 Toast/Modal 监听');
    } catch (error) {
      diagnosticCapture.notes.push(`Toast/Modal 监听不可用：${String(error.message).slice(0, 200)}`);
    }
  }

  async function disableDiagnostics(active) {
    if (diagnosticCapture.toastModal && typeof active.evaluate === 'function') {
      try {
        await withTimeout(active.evaluate(function restoreDiagnosticHooks(hookKey) {
          const root = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this);
          const hooks = root && root[hookKey];
          if (!hooks || !hooks.wxObject) return false;
          if (typeof hooks.originals.showToast === 'function') hooks.wxObject.showToast = hooks.originals.showToast;
          if (typeof hooks.originals.showModal === 'function') hooks.wxObject.showModal = hooks.originals.showModal;
          delete root[hookKey];
          return true;
        }, diagnosticHookKey), timeoutMs, '恢复 Toast/Modal 原函数超时');
      } catch (error) {
        diagnosticCapture.notes.push(`Toast/Modal 监听恢复失败：${String(error.message).slice(0, 200)}`);
      }
    }
    const remove = typeof active.off === 'function'
      ? active.off.bind(active)
      : typeof active.removeListener === 'function'
        ? active.removeListener.bind(active)
        : null;
    if (remove && consoleListener) remove('console', consoleListener);
    if (remove && exceptionListener) remove('exception', exceptionListener);
  }

  async function currentPage() {
    if (!miniProgram) throw new Error('开发者工具会话尚未启动');
    return withTimeout(miniProgram.currentPage(), timeoutMs, '读取当前页面超时');
  }

  async function waitForElement(target, message, {
    requireUnique = true,
    failureCode,
    failureCategory,
  } = {}) {
    const deadline = Date.now() + assertionTimeoutMs;
    do {
      const page = await currentPage();
      const element = await findElement(page, target, { requireUnique });
      if (element) return element;
      const remaining = deadline - Date.now();
      if (remaining > 0) await wait(Math.min(assertionPollMs, remaining));
    } while (Date.now() < deadline);
    const error = new Error(message);
    if (failureCode) error.code = failureCode;
    if (failureCategory) error.category = failureCategory;
    throw error;
  }

  async function waitForDiagnostic(kind, messageIncludes) {
    const capabilityAvailable = ['toast', 'modal'].includes(kind)
      ? diagnosticCapture.toastModal
      : diagnosticCapture[kind] === true;
    if (!capabilityAvailable) {
      const error = new Error(`当前开发者工具会话无法监听 ${kind} 诊断事件`);
      error.code = 'DIAGNOSTIC_CAPTURE_UNAVAILABLE';
      error.category = 'infrastructure';
      throw error;
    }
    const deadline = Date.now() + assertionTimeoutMs;
    do {
      const matched = diagnosticEvents.find((item) => (
        item.kind === kind && String(item.message).includes(messageIncludes)
      ));
      if (matched) return { ...matched };
      const remaining = deadline - Date.now();
      if (remaining > 0) await wait(Math.min(assertionPollMs, remaining));
    } while (Date.now() < deadline);
    const error = new Error(`未观察到预期诊断事件：${kind} 包含“${messageIncludes}”`);
    error.code = 'DIAGNOSTIC_EXPECTATION_NOT_MET';
    error.category = 'assertion';
    throw error;
  }

  return {
    kind: 'devtools',
    devtoolsCliSource: cliSource,
    async start() {
      if (miniProgram) throw new Error('开发者工具会话已经启动');
      const runtimeAutomator = automator || loadAutomator();
      const port = await portResolver();
      try {
        miniProgram = await withTimeout(runtimeAutomator.launch({
          cliPath,
          projectPath,
          port,
          timeout: timeoutMs,
        }), timeoutMs, `开发者工具自动化连接超过 ${timeoutMs}ms`);
      } catch (error) {
        if (!isColdStartHandshakeError(error)) throw error;
        await wait(coldStartDelayMs);
        miniProgram = await withTimeout(
          runtimeAutomator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` }),
          coldStartTimeoutMs,
          `开发者工具冷启动握手恢复超过 ${coldStartTimeoutMs}ms`,
        );
      }
      await enableDiagnostics(miniProgram);
    },

    async stop() {
      if (!miniProgram) return;
      const active = miniProgram;
      miniProgram = null;
      await disableDiagnostics(active);
      try {
        await withTimeout(active.close(), timeoutMs, '关闭开发者工具自动化会话超时');
      } catch (error) {
        if (!String(error.message).includes('CLOSED')) throw error;
      }
    },

    async open(route) {
      if (!miniProgram) throw new Error('开发者工具会话尚未启动');
      await withTimeout(
        miniProgram.callWxMethod('reLaunch', { url: route }),
        timeoutMs,
        '打开目标页面超时',
      );
      if (routeSettleMs > 0) await wait(routeSettleMs);
    },

    async arrangePageData(data) {
      const page = await currentPage();
      if (typeof page.setData !== 'function') {
        throw new Error('当前开发者工具页面不支持受控页面状态准备');
      }
      await withTimeout(page.setData(data), timeoutMs, '准备页面状态超时');
      if (routeSettleMs > 0) await wait(routeSettleMs);
    },

    async tap(target) {
      const element = await waitForElement(target, `未找到可操作元素：${target}`);
      await withTimeout(element.tap(), timeoutMs, `点击元素超时：${target}`);
    },

    async commit(target, { commitId } = {}) {
      if (!looksLikeSelector(target) || !/^[.#[]/.test(target)) {
        const error = new Error(`提交动作必须使用稳定选择器：${target}`);
        error.code = 'COMMIT_SELECTOR_REQUIRED';
        error.commitDispatched = false;
        throw error;
      }
      let element;
      try {
        element = await waitForElement(target, `未找到提交元素：${target}`);
      } catch (error) {
        error.commitDispatched = false;
        throw error;
      }
      try {
        await withTimeout(element.tap(), timeoutMs, `提交动作超时：${commitId || target}`);
      } catch (error) {
        error.commitDispatched = true;
        throw error;
      }
    },

    async fill(target, value) {
      const element = await waitForElement(target, `未找到可输入元素：${target}`);
      await withTimeout(element.input(value), timeoutMs, `输入元素超时：${target}`);
    },

    async expectText(expectedText) {
      await waitForElement(expectedText, `未找到预期文本：${expectedText}`, {
        requireUnique: false,
        failureCode: 'ASSERTION_TEXT_NOT_FOUND',
        failureCategory: 'assertion',
      });
    },

    async expectVisible(target) {
      await waitForElement(target, `未找到预期可见元素：${target}`, {
        requireUnique: false,
        failureCode: 'ASSERTION_ELEMENT_NOT_VISIBLE',
        failureCategory: 'assertion',
      });
    },

    async expectDiagnostic(kind, messageIncludes) {
      return waitForDiagnostic(kind, messageIncludes);
    },

    async screenshot(name) {
      if (!miniProgram) throw new Error('开发者工具会话尚未启动');
      const screenshotsDir = path.join(reportDir, 'screenshots');
      fs.mkdirSync(screenshotsDir, { recursive: true });
      const target = path.join(screenshotsDir, `${safeScreenshotName(name)}.png`);
      assertScreenshotTargetAvailable(target);
      await withTimeout(miniProgram.screenshot({ path: target }), timeoutMs, '截图超时');
      return path.relative(reportDir, target);
    },

    getDiagnostics() {
      return {
        capture: {
          ...diagnosticCapture,
          notes: [...diagnosticCapture.notes],
        },
        events: diagnosticEvents.map((item) => ({ ...item })),
      };
    },
  };
}

module.exports = {
  createDevtoolsAdapter,
  findAvailablePort,
  isPortAvailable,
  loadAutomator,
};

# miniprogram-test 变更记录

## 2026-07-22 · 0.12.0 依赖准备体验

- 新增只读 `deps-status` 命令，报告 Skill 本地 `miniprogram-automator` 的精确期望版本、当前状态、安装命令、网络范围和写入范围。
- 新增显式 `install-deps --approve-dependency-install` 命令；只在 Node.js 22/24 下以无 Shell 方式调用 `npm ci --omit=dev --ignore-scripts`，且只向 Skill 自身 `node_modules` 和用户 npm 缓存/日志写入。
- 禁止从被测项目或全局依赖兜底；依赖缺失、版本不符、锁文件不一致或模块加载失败都保持失败关闭。
- 把真实 devtools 执行的依赖门禁前移到 `execution-claim.json` 之前，依赖未就绪不会消耗单次执行声明。
- `devtools` Adapter 统一使用依赖准备模块加载 SDK；移除任意外部模块与 npm CLI 覆盖，只接受 Skill 本地精确依赖和当前受支持 Node 配套的 npm CLI。
- `deps-status` 只验证锁文件、真实路径、版本和可读性，不执行依赖顶层代码；SDK 仅在获授权的真实 devtools 执行阶段加载。
- 运行时版本升级到 `0.12.0`，`miniprogram-automator` 继续精确锁定为 `0.12.1`。
- 恢复并持久化维护侧回归套件，新增 10 项依赖准备测试；Node.js 22.23.1 与 24.12.0 均完成 99/99 回归。
- 隔离副本完成一次离线依赖安装：安装前为 `install-required`，安装后为 `ready`，除 `node_modules` 外源文件零差异。
- 完成等价 `npx skills add` 目录复制模拟，复制后的 Skill 不依赖原路径且能独立输出安装计划。官方 `npx skills` CLI 在线获取被本机安全策略拒绝，未将模拟结果表述为真实 CLI 执行。
- 独立安全审查发现并修复外部 automator 覆盖、任意 npm CLI 覆盖和状态检查执行依赖顶层代码三项问题；复核结论为无阻断问题。
- 孵化源与本机实体 Skill 均已同步到 `0.12.0`；本机既有 `miniprogram-automator 0.12.1` 无需重装，`deps-status` 返回 `ready`。
- 0.12.0 真实开发者工具前向只执行一次且未重试：依赖门禁、SDK 加载、标准 CLI 启动和执行声明均成功，但测试规格误用未注册的 `/pages/home/index`，在导航阶段以 `AUTOMATION_FAILED` 结束；实际注册路由为 `/pages/index/index`。未执行 UI 断言、未截图、未产生状态变化。该结果不记为 0.12.0 完整 UI 前向通过。
- 随后使用已注册路由 `/pages/index/index` 创建全新用例和报告目录，完成一次新的 0.12.0 真实公开只读前向：执行 1 次、无重试，`passed / verified`，`热门产品`、`.products-section`、`.product-card`、`.product-name` 四项断言全部通过，并生成不含个人敏感数据的安全截图。未点击、未产生业务状态变化、未访问后台或数据库、未运行 Git；0.12.0 完整 UI 前向门禁由此通过。

## 2026-07-22 · Plugin 转 Skill 孵化候选

- 将 0.11.11 轻量 Plugin 中唯一的 `miniprogram-test` 能力重组为独立 Skill。
- 将 `runtime/*.js` 移入 Skill 自身的 [scripts/runtime](../../incubating/miniprogram-test/scripts/runtime)，修正所有相对模块路径。
- 保留四个规格/证据 JSON 资产并验证引用存在。
- 移除 `.codex-plugin/plugin.json`、marketplace、Plugin 包装和项目级 framework 概念。
- 报告运行时载体由 Plugin 改称 Skill，运行时版本从 Skill 根 `package.json` 读取。
- 将 memory 执行模式由 `plugin-self-test` 改为 `skill-self-test`。
- 将执行声明版本字段由 `pluginVersion` 改为 `skillVersion`。
- `miniprogram-automator` 改为只安装在 Skill 自身目录，不要求被测项目安装依赖。
- 新增旧 Plugin/业务仓库/缓存禁用引用、相对模块、资产存在性和符号链接门禁。
- Node.js 22.23.1 与 24.12.0 均完成 89/89 回归。

旧 Plugin 源目录和已安装缓存尚未删除；待 Skill 真实开发者工具前向通过后再执行退役。

## 2026-07-22 · Skill 隔离真实前向通过

- 将孵化 Skill 逐文件复制到隔离目录，并在 Skill 自身目录离线安装生产依赖。
- 使用 Node.js 24.12.0 和标准微信开发者工具 CLI 单次执行首页公开产品展示用例，无重试。
- 4/4 UI 断言通过：`热门产品`、`.products-section`、`.product-card`、`.product-name`。
- 执行结果为 `passed / verified`，证据层级为运行时/UI；后台层未独立验证。
- 生成测试方案、可读脚本、结构化结果、Markdown/HTML 报告及安全截图。
- 输出文件中未发现旧 Plugin 源目录、业务仓库、Codex Plugin 缓存或 `.codex-plugin` 引用。
- 测试产物仅写入 `/private/tmp/miniprogram-test-skill-forward-run-20260722`，未修改业务项目、业务数据或 Git 状态。

## 2026-07-22 · 本机实体安装完成

- 将孵化 Skill 以实体副本安装到 `/Users/lilongjian/.codex/skills/miniprogram-test`，未使用指向孵化仓库、业务仓库或 Plugin 缓存的符号链接。
- 使用 Node.js 24.12.0 在 Skill 自身目录离线安装锁定依赖，审计结果为 0 个已知漏洞。
- 安装目录通过 Skill 结构校验；与孵化目录比较时除 `node_modules` 外无差异。
- `miniprogram-automator` 从 Skill 自身目录解析成功。
- 对孵化目录、安装目录和维护文档执行引用审计，39 个文件中的 11 处引用全部可达；源码目录无符号链接和旧 Plugin 路径。
- 临时只读 Codex 子会话因本机 CLI 模型缓存兼容错误未返回结果，因此新会话自动发现仍待通过 Codex App 新任务验证。

## 2026-07-22 · Codex App 新任务发现通过

- 新 Codex App 任务实际加载 `/Users/lilongjian/.codex/skills/miniprogram-test/SKILL.md`。
- 新任务确认加载的是独立个人 Skill，不依赖 `miniprogram-testing` Plugin、GMZB/edoc 业务仓库或 Codex Plugin 缓存。
- 发现与加载验证全程只读，未执行测试、安装依赖或修改文件。
- 旧 Plugin 已满足退役前置条件；删除仍需按审核清单获得明确批准。

## 2026-07-22 · 旧 Plugin 全量退役完成

- 使用 Codex CLI 卸载 `miniprogram-testing@miniprogram-testing-team`，安装缓存由 CLI 正常清除。
- 使用 Codex CLI 注销 `miniprogram-testing-team` marketplace，配置中的 Plugin 与 marketplace 注册段均已消失。
- 删除业务仓库内旧 Plugin 源目录、旧个人 Plugin 源目录，以及仅包含旧条目的个人 marketplace 文件。
- 清理后复核 Codex Plugin 和 marketplace 列表，未发现旧 Plugin 加载项或注册项。
- 独立个人 Skill 再次通过结构校验、孵化源一致性检查、Node.js 24 依赖解析和引用审计。
- 退役过程使用临时回滚包保护；完整验证后不保留旧 Plugin 归档。
- 未运行 Git，未修改业务代码、小程序项目或业务数据。

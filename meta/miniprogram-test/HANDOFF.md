# miniprogram-test 当前状态与续接

更新时间：2026-07-22

单页恢复入口：[STATE.md](STATE.md)。本文件保留详细交接背景与完整续接 Prompt。

## 当前定位

`miniprogram-test` 是一个孵化中的轻量 Skill：接收自然语言功能目标或现成测试用例，生成测试方案和可读脚本，通过真实微信开发者工具受控执行，并输出截图与分层证据报告。它不在业务项目中搭建或维护重型测试框架。

## 当前状态

- 目标实现：[SKILL.md](../../incubating/miniprogram-test/SKILL.md)
- 运行时基线：`0.12.0`
- Node.js 22.23.1：99/99 通过
- Node.js 24.12.0：99/99 通过
- Skill 结构与引用检查：通过
- Skill 本地依赖锁文件安装：通过，0 个已知漏洞
- 分发依赖准备：已提供 `deps-status` 与显式获批的 `install-deps`；缺失依赖不会生成执行声明
- 分发复制验证：等价隔离复制通过；官方 `npx skills` CLI 在线获取因本机安全策略未执行
- Skill 0.11.11 真实微信开发者工具前向：已通过；隔离实体副本单次执行，4/4 UI 断言通过，含安全截图
- Skill 0.12.0 真实完整前向：已通过；使用已注册路由 `/pages/index/index` 的全新用例单次执行，4/4 UI 断言通过，结果为 `passed / verified`，含安全截图
- 本机安装：`/Users/lilongjian/.codex/skills/miniprogram-test`，实体副本，结构、依赖、相对引用和旧路径扫描均通过
- 新会话发现：已通过；Codex App 新任务实际加载 `/Users/lilongjian/.codex/skills/miniprogram-test/SKILL.md`，并确认不依赖旧 Plugin、业务仓库或 Plugin 缓存
- 旧 Plugin：已全量退役，不再作为运行入口或回滚源

## 旧 Plugin 退役结果

- `miniprogram-testing@miniprogram-testing-team` 已通过 Codex CLI 卸载。
- `miniprogram-testing-team` marketplace 已通过 Codex CLI 注销。
- 业务仓库旧源、旧个人源和陈旧个人 marketplace 文件均已删除。
- 安装缓存由 Codex CLI 正常清除，没有以手工删缓存代替卸载。
- Codex 配置、Plugin 列表和 marketplace 列表均不再包含旧加载项或注册项。
- 独立个人 Skill 仍从 `/Users/lilongjian/.codex/skills/miniprogram-test/SKILL.md` 加载，并与孵化源保持一致。

当前可迁移能力包括公开只读、认证只读、单次有状态提交门禁、报告与截图、不可覆盖执行声明、显式 Skill 本地依赖准备、独立证据附件和未知结果对账。0.12.0 的正确路由完整 UI 前向已经通过；复杂业务的主要缺口仍是进程中断恢复、真实双提交链和 Windows 前向，详见 BACKLOG.md。

## 新会话续接 Prompt

```text
继续完善 skill-forge 中孵化的 miniprogram-test Skill。

请先只读完整阅读：

1. /Users/lilongjian/Projects/AI/skill-forge/CLAUDE.md
2. /Users/lilongjian/Projects/AI/skill-forge/meta/README.md
3. /Users/lilongjian/Projects/AI/skill-forge/meta/miniprogram-test/STATE.md
4. /Users/lilongjian/Projects/AI/skill-forge/meta/miniprogram-test/MAINTAINING.md
5. /Users/lilongjian/Projects/AI/skill-forge/meta/miniprogram-test/BACKLOG.md
6. /Users/lilongjian/Projects/AI/skill-forge/meta/miniprogram-test/COVERAGE.md
7. /Users/lilongjian/Projects/AI/skill-forge/meta/miniprogram-test/CHANGELOG.md
8. /Users/lilongjian/Projects/AI/skill-forge/meta/miniprogram-test/HANDOFF.md
9. /Users/lilongjian/Projects/AI/skill-forge/incubating/miniprogram-test/SKILL.md

先核对目标 Skill 的实际文件、版本、相对模块引用、资产引用、依赖状态和 Node 22/24 回归结果。Skill 内不得引用旧 GMZB/edoc 业务仓库、旧 miniprogram-testing-plugin、Codex Plugin 缓存或 meta 目录；所有文件引用必须真实存在，不允许符号链接或死链。

工作重心是 Skill。真实小程序项目只作为实验对象，不执行 Git 提交。普通只读流程不反复确认；状态变化、造数、签约、支付、依赖安装或其他安全操作才暂停。wx.login + refreshByCode 并覆盖本地 Token 无需单独确认。造数脚本必须先展示并获得批准。真实执行不自动重试，未知提交只允许只读对账。当前暂不继续证据脱敏优化。

Skill 0.12.0 已补齐 `npx skills add` 分发后的显式依赖准备体验：先运行 `deps-status`，缺失时展示计划并获批后运行 `install-deps --approve-dependency-install`；依赖只落在 Skill 自身目录，缺失时不消耗执行声明。状态检查不执行依赖顶层代码，且不接受外部 automator 或任意 npm CLI 覆盖。Node 22/24 均为 99/99 回归，等价隔离复制与离线安装已通过。使用已注册路由 `/pages/index/index` 的全新用例已完成一次真实公开只读前向：4/4 UI 断言通过，结果为 `passed / verified`，含安全截图，无业务状态变化。下一步优先推进进程中断恢复与不可覆盖终结结果，再完成真实双提交业务链和 Windows 前向。任何 Skill 运行时更新前先展示完整变更、兼容性、验证与回滚方案，等待批准后再修改。
```

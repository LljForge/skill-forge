# miniprogram-test 维护约束

## 权威实现

孵化期权威实现是 [SKILL.md](../../incubating/miniprogram-test/SKILL.md)。维护前先完整读取本目录所有文件，再修改 Skill。

## 不可变约束

1. 保持 Skill 轻量，不在被测项目搭建 framework、manifest、Probe Pack、Runner Identity 或项目级依赖。
2. Skill 目录必须自包含，不得引用本 `meta/` 目录、旧 Plugin 源仓库、业务仓库或 Codex 安装缓存。
3. 所有相对模块、资产和 Markdown 链接必须在目标位置实际存在；不得用符号链接连接旧目录。
4. 业务提交只执行一次，未知结果不得重放，只允许独立只读对账。
5. Skill 更新前必须展示完整范围、兼容性、验证和回滚方案并获得用户批准。
6. 实际业务项目只作为实验对象，不执行 Git 提交。
7. 造数脚本必须先展示并获得批准；不允许清理时不得擅自删除数据。
8. 真实执行失败或卡顿只做有限排查，不循环重试。

## 目录边界

Skill 发布目录只保留运行所需内容：

```text
incubating/miniprogram-test/
├── SKILL.md
├── agents/openai.yaml
├── assets/*.json
├── package.json
├── package-lock.json
└── scripts/
    ├── session.js
    └── runtime/*.js
```

维护账、覆盖记录、变更史和后续计划只保留在本 `meta/miniprogram-test/` 目录，不得从 Skill 反向引用。

回归测试保存在 `meta/miniprogram-test/tests/`，只属于维护侧，不随 Skill 分发。测试会优先读取 `MINIPROGRAM_TEST_SKILL_ROOT`，其次识别隔离测试旁的 `miniprogram-test/`，最后解析本仓库的孵化实现；每个候选都必须实际包含 `SKILL.md`，避免死链和陈旧副本。

## 变更后验证

至少执行：

1. Skill 结构验证；
2. Node.js 22 与 24 双版本确定性回归；
3. 相对模块、Skill 资产、Markdown 链接和符号链接扫描；
4. `npm ci --omit=dev --ignore-scripts` 锁文件验证；
5. source 与隔离副本一致性核查；
6. 涉及真实 Adapter 时，执行一次无状态真实开发者工具前向，不自动重试。

Node 双版本回归示例：

```bash
MINIPROGRAM_TEST_SKILL_ROOT=/Users/lilongjian/Projects/AI/skill-forge/incubating/miniprogram-test \
  <Node22绝对路径> --test meta/miniprogram-test/tests/*.test.js

MINIPROGRAM_TEST_SKILL_ROOT=/Users/lilongjian/Projects/AI/skill-forge/incubating/miniprogram-test \
  <Node24绝对路径> --test meta/miniprogram-test/tests/*.test.js
```

分发后的依赖准备必须只通过 Skill 统一入口验证：先运行 `session.js deps-status`；只有用户看到安装计划并明确批准后，才运行 `session.js install-deps --approve-dependency-install`。不得用业务项目的 `node_modules`、全局模块或手工 `npm install` 掩盖缺失依赖。

# 运行前置契约（宿主能力握手 + 路径事实）

> **起步常载**:只读下面「能力握手」与「路径事实」两段。权限边界、宿主适配示例、降级细则在本文件后段、**按需/异常分支才读**（薄账 design §4.3）。
> 由 SKILL.md「起步:preflight gate」引入;判据单一权威在本文件,脊柱只路由不复述。

## 能力握手（用能力名、不绑具体工具名）

| 能力 | 语义 |
|---|---|
| spawn-fresh-agent | 派一个真正不继承主会话历史的子 agent |
| read-search | 读取文件并搜索代码，不限定具体工具名 |
| write-owned-file | 仅写本任务明确拥有的文件 |
| run-command | 执行只读检查、测试与 git 命令 |
| isolate-workspace | 创建或进入隔离工作区 |
| shared-artifact-path | 主/子 agent 可访问同一产物路径 |

**Claude Code 映射（参考、非判据）**:Task→spawn-fresh-agent;Read/Grep/Glob→read-search;Write→write-owned-file;Bash→run-command;原生 worktree 工具→isolate-workspace。

<!-- 批次 D 补:Codex 能力映射(零历史 sub-agent / shell search / patch / git);宿主强制流程优先于 Skill 内部偏好;spawn-fresh-agent 不可用与主/子 agent 文件系统不共享的降级路径(design §5.1) -->

## 路径事实（preflight 必确定并写入 run-state.md）

- SKILL_ROOT:当前已加载 SKILL.md 所在目录（**不猜安装根**）
- SOURCE_ROOT:用户原始工作区
- WORK_ROOT:①至⑤实际执行的工作区
- ARTIFACT_ROOT:本次产物目录绝对路径
- START_SHA:本次改动开始前精确 HEAD
- INITIAL_STATUS:任务开始前工作区状态
- HOST:宿主类型与能力降级项

任何 reference 或模板不得再猜 `~/.claude/skills` 等安装根。

## 权限边界与降级（按需读、不进常载）

<!-- 批次 D 补:prompt 工具列表是能力需求非安全 ACL;宿主不能给子 agent 配只读权限时主会话的核对流程(派发前记 git status/预期输出、派发后核对、发现非预期修改即停)(design §5.2);spawn-fresh-agent 不可用 / 文件系统不共享的降级(design §5.1) -->

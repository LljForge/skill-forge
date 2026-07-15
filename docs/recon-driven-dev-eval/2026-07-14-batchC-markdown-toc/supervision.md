# 实测监督笔记 · 2026-07-15 · batchC-markdown-toc
> 实跑 recon-driven-dev 全程的现场记录。元层维护资产，归档即弃。

## 走过的路径单元
①a、①c、②a、②b、②c、②d、②e、DP1、③a、③d；preflight git-worktree fallback。④/⑤ 因用户在③第六轮不通过后终止而未触发。

## 逐 ⏸ 体验自评
- ①⏸ 降级没走通：fresh recon-agent 回报写入 `/private/tmp/recon-markdown-toc-cli/.../directed-report.md`，主会话立即同路径 `sed` 报 `No such file or directory`；稍后同步却出现错名 `direct-report.md`，与要求的 `directed-report.md` 内容相同。runtime-contract 只留“Codex 能力映射待批次 D”注释，未说明子 agent 产物同步时点/取回法，遂让 agent 回传全文、主会话按契约名落盘并删除错名副本。 [→ IP-02 / 🔶D-gap]

## 非 ⏸ 前置异常
- preflight 卡：初始 `git rev-parse --show-toplevel` 报 `fatal: not a git repository`，runtime-contract 要求记录 START_SHA/建 worktree，但未给空目录初始化与基线提交路径；本次按新项目语义初始化 Git，仅提交 `开发任务.txt`，sentinel 保持 untracked。 [→ IP-01]

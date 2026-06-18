#!/usr/bin/env bash
# agent-guard.sh -- PreToolUse on Agent 守卫(skill-eval headless 批跑用)
# 单上下文 skill(manifest single_context: true → run.sh export EVAL_NO_SUBAGENT=1)在
# headless 下禁止派子 agent:挡掉 derail「误判多模块 → fan-out 起多个 survey-agent」。
# 用 hook 而非 --allowedTools——后者禁不掉子 agent 工具(Agent)。
# 仅 headless + 单上下文 skill 生效;多 agent skill(EVAL_NO_SUBAGENT 空)放行。
set -uo pipefail

[[ "${EVAL_HEADLESS:-}" == "1" ]] || exit 0
[[ "${EVAL_NO_SUBAGENT:-}" == "1" ]] || exit 0

echo "[agent-guard] 本批跑要求单上下文执行,headless 下禁止派子 agent。" >&2
echo "  请在当前上下文内自己读+写完成,不要起 Task/Agent 子任务。" >&2
exit 2

#!/usr/bin/env bash
# write-guard.sh -- PreToolUse on Write 守卫(skill-eval headless 批跑用)
# headless 下,Write 的目标必须落在 $EVAL_OUT/ 之内;写到项目内 docs/ 等交互落点一律 deny。
# 作用:即便靶 skill 偶发 derail/落点漂移,产物也机制性地落不到错地方(配合 run.sh 的回收兜底)。
# 仅 headless($EVAL_HEADLESS=1)生效;交互模式(无该 env)放行,不干扰用户正常写 docs/。
set -uo pipefail

# 非 headless 或无 EVAL_OUT:不守卫
[[ "${EVAL_HEADLESS:-}" == "1" ]] || exit 0
EVAL_OUT="${EVAL_OUT:-}"
[[ -n "$EVAL_OUT" ]] || exit 0

INPUT=$(cat)
FP=$(printf '%s' "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print((d.get('tool_input') or {}).get('file_path', ''))
except Exception:
    pass
" 2>/dev/null)

# 取不到 file_path:放行(信息不足不拦)
[[ -n "$FP" ]] || exit 0

case "$FP" in
  "$EVAL_OUT"/*)
    exit 0 ;;                       # 落在 EVAL_OUT 内,放行
  *)
    echo "[write-guard] headless 下禁止写到 EVAL_OUT 之外:$FP" >&2
    echo "  产物只能落 $EVAL_OUT/<module>/(防 derail 落点漂移到项目 docs/)。" >&2
    exit 2 ;;                       # PreToolUse exit 2 = 阻止该 Write
esac

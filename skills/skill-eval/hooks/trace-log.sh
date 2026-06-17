#!/usr/bin/env bash
# trace-log.sh — skill-eval 专用 trace hook
# 挂载点：PostToolUse + SubagentStop
# 作用：把每次工具调用/子 agent 停止追加一行 JSON 到 $EVAL_TRACE
#
# stdin 格式（Claude Code hook JSON）:
#   PostToolUse:  { hook_event_name, session_id, agent_id, agent_type,
#                   tool_name, tool_input, tool_response, tool_use_id, ... }
#   SubagentStop: { hook_event_name, session_id, agent_id, agent_type,
#                   stop_reason, stop_reason_details, ... }
#
# 若 $EVAL_TRACE 未设，静默退出（不干扰正常 claude 会话）

set -euo pipefail

# 未配置 EVAL_TRACE 时静默退出，不影响正常使用
if [[ -z "${EVAL_TRACE:-}" ]]; then
  exit 0
fi

# 读取 stdin hook payload
PAYLOAD=$(cat)

# 用 python3 解析并追加 trace 行
python3 - "$EVAL_TRACE" "$PAYLOAD" <<'PYEOF'
import sys
import json
import time
import os

trace_file = sys.argv[1]
payload_str = sys.argv[2]

if not payload_str.strip():
    sys.exit(0)

try:
    payload = json.loads(payload_str)
except json.JSONDecodeError:
    sys.exit(0)

event = payload.get('hook_event_name', '')
ts = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
agent_id = payload.get('agent_id', '') or ''
agent_type = payload.get('agent_type', '') or ''
session_id = payload.get('session_id', '') or ''

if event == 'PostToolUse':
    tool_name = payload.get('tool_name', '')
    tool_input = payload.get('tool_input', {})
    tool_response = payload.get('tool_response', {})

    # tool_input 摘要：保留关键字段，截断长字符串（避免 trace 爆炸）
    if isinstance(tool_input, dict):
        input_digest = {}
        for k, v in list(tool_input.items())[:5]:  # 最多 5 个字段
            sv = str(v)
            input_digest[k] = (sv[:200] + '...') if len(sv) > 200 else sv
    else:
        sv = str(tool_input)
        input_digest = (sv[:200] + '...') if len(sv) > 200 else sv

    # tool_response 状态判断
    if isinstance(tool_response, dict):
        resp_type = tool_response.get('type', '')
        if resp_type == 'error':
            resp_status = 'error'
        else:
            content = tool_response.get('text', tool_response.get('content', ''))
            resp_status = 'ok' if content else 'empty'
    elif tool_response:
        resp_status = 'ok'
    else:
        resp_status = 'empty'

    record = {
        'ts': ts,
        'event': event,
        'session_id': session_id,
        'agent_id': agent_id,
        'agent_type': agent_type,
        'tool_name': tool_name,
        'tool_input_digest': input_digest,
        'tool_response_status': resp_status,
    }

elif event == 'SubagentStop':
    stop_reason = payload.get('stop_reason', 'completed')
    record = {
        'ts': ts,
        'event': event,
        'session_id': session_id,
        'agent_id': agent_id,
        'agent_type': agent_type,
        'tool_name': '__SubagentStop__',
        'tool_input_digest': {},
        'tool_response_status': stop_reason or 'completed',
    }

else:
    # 其他事件静默忽略
    sys.exit(0)

# 确保 trace 文件父目录存在，追加一行 JSON
trace_dir = os.path.dirname(trace_file)
if trace_dir:
    os.makedirs(trace_dir, exist_ok=True)

with open(trace_file, 'a', encoding='utf-8') as f:
    f.write(json.dumps(record, ensure_ascii=False) + '\n')

sys.exit(0)
PYEOF

#!/usr/bin/env bash
# trace-log.sh -- skill-eval dedicated trace hook
# Attach points: PostToolUse + SubagentStop
# Purpose: append one JSON line to $EVAL_TRACE per tool call / subagent stop
#
# stdin format (Claude Code hook JSON):
#   PostToolUse:  { hook_event_name, session_id, agent_id, agent_type,
#                   tool_name, tool_input, tool_response, tool_use_id, ... }
#   SubagentStop: { hook_event_name, session_id, agent_id, agent_type,
#                   stop_reason, stop_reason_details, ... }
#
# If $EVAL_TRACE is not set, exit silently (no effect on normal claude sessions)

set -euo pipefail

# Silent exit when EVAL_TRACE not configured
if [[ -z "${EVAL_TRACE:-}" ]]; then
  exit 0
fi

# Read stdin hook payload
_HOOK_PAYLOAD=$(cat)

# Pass payload via env var to avoid shell quoting issues with JSON content
export _HOOK_PAYLOAD

python3 - "$EVAL_TRACE" <<'PYEOF'
import sys
import json
import time
import os

trace_file = sys.argv[1]
payload_str = os.environ.get('_HOOK_PAYLOAD', '')

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

    # tool_input digest: keep key fields, truncate long strings
    if isinstance(tool_input, dict):
        input_digest = {}
        for k, v in list(tool_input.items())[:5]:
            sv = str(v)
            input_digest[k] = (sv[:200] + '...') if len(sv) > 200 else sv
    else:
        sv = str(tool_input)
        input_digest = (sv[:200] + '...') if len(sv) > 200 else sv

    # tool_response status detection
    # Actual formats observed:
    #   Bash/Glob: {"stdout":"...","stderr":"...","interrupted":false,...}
    #   Read/Grep: {"type":"text","text":"..."} or similar
    #   Error:     {"type":"error",...}
    if isinstance(tool_response, dict):
        resp_type = tool_response.get('type', '')
        if resp_type == 'error':
            resp_status = 'error'
        elif 'stdout' in tool_response or 'stderr' in tool_response:
            # Bash-style response
            has_out = bool(tool_response.get('stdout', '')) or bool(tool_response.get('stderr', ''))
            resp_status = 'ok' if has_out else 'empty'
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
    # Ignore other events silently
    sys.exit(0)

# Ensure trace file parent dir exists, append one JSON line
trace_dir = os.path.dirname(trace_file)
if trace_dir:
    os.makedirs(trace_dir, exist_ok=True)

with open(trace_file, 'a', encoding='utf-8') as f:
    f.write(json.dumps(record, ensure_ascii=False) + '\n')

sys.exit(0)
PYEOF

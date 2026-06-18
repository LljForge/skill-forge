#!/usr/bin/env bash
# run.sh -- skill-eval batch runner
# Usage: bash run.sh <target_skill>
#   e.g. bash run.sh module-brief
#
# Env vars:
#   SKILL_EVAL_TARGET_PROJECT  target project absolute path (required)
#   SKILL_EVAL_SCRATCH         scratch workspace root (default: $HOME/.cache/skill-eval)
#   SKILL_EVAL_CORPUS_LIMIT    only process first N modules from corpus (for smoke testing)
#
# Output structure:
#   $SCRATCH/skill-eval/<skill>/<run_id>/
#     run-manifest.json          summary (ok[]/failed[] classification)
#     runs/<module>/
#       requirements.md          module-brief output
#       design.md                module-brief output
#       trace.jsonl              trace hook output
#       run.json                 raw claude -p output
#       run-meta.json            elapsed/exit_code/preset

set -euo pipefail

# ── status 子命令 ──────────────────────────────────────────────
# Usage: bash run.sh status <skill>
# 打印: none | running <run-id> | done <run-id>
# done 判据: run-manifest.json 存在且含 "summary" 字段(末尾写入)
# running 判据: STARTED 标记存在但 summary 尚未写入
if [[ "${1:-}" = "status" ]]; then
  skill="${2:-}"
  if [[ -z "$skill" ]]; then
    echo "[run.sh] Usage: bash run.sh status <skill>" >&2
    exit 1
  fi
  SCRATCH_STATUS="${SKILL_EVAL_SCRATCH:-$HOME/.cache/skill-eval}"
  base="${SCRATCH_STATUS}/skill-eval/${skill}"
  latest=$(ls -dt "${base}"/*/ 2>/dev/null | head -1 || true)
  if [[ -z "$latest" ]]; then
    echo "none"
    exit 0
  fi
  rid=$(basename "$latest")
  # 附 run 摘要(ok/failed/processed)供编排层判断「旧 run 是否匹配本次请求」——
  # 避免把历史/小批测试 run 误当本次结果(见 SKILL.md Step 0)。
  summary_kv=$(python3 - "${latest}/run-manifest.json" <<'PYEOF' 2>/dev/null || true
import json, sys
try:
    d = json.load(open(sys.argv[1], encoding='utf-8'))
except Exception:
    print(""); raise SystemExit
ok = d.get('ok', []); failed = d.get('failed', [])
print(f"ok={len(ok)} failed={len(failed)} processed={len(ok)+len(failed)}")
PYEOF
)
  if [[ -f "${latest}/run-manifest.json" ]] && grep -q '"summary"' "${latest}/run-manifest.json"; then
    echo "done ${rid} ${summary_kv}"
  else
    echo "running ${rid} ${summary_kv}"
  fi
  exit 0
fi

# ── args & paths ─────────────────────────────────────────────
TARGET_SKILL="${1:-}"
if [[ -z "$TARGET_SKILL" ]]; then
  echo "[run.sh] Usage: bash run.sh <target_skill>" >&2
  exit 1
fi

TARGET_PROJECT="${SKILL_EVAL_TARGET_PROJECT:-}"
if [[ -z "$TARGET_PROJECT" ]]; then
  echo "[run.sh] Error: SKILL_EVAL_TARGET_PROJECT not set" >&2
  exit 1
fi

if [[ ! -d "$TARGET_PROJECT" ]]; then
  echo "[run.sh] Error: SKILL_EVAL_TARGET_PROJECT does not exist: $TARGET_PROJECT" >&2
  exit 1
fi

SCRATCH="${SKILL_EVAL_SCRATCH:-$HOME/.cache/skill-eval}"
CORPUS_LIMIT="${SKILL_EVAL_CORPUS_LIMIT:-0}"

# skill-eval files live in the same directory as this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$SCRIPT_DIR/manifests/${TARGET_SKILL}.yml"
SETTINGS_FILE="$SCRIPT_DIR/eval-settings.json"

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "[run.sh] Error: manifest not found: $MANIFEST_FILE" >&2
  exit 1
fi

# ── read manifest ────────────────────────────────────────────
echo "[run.sh] reading manifest: $MANIFEST_FILE"

CORPUS_REL=$(python3 - "$MANIFEST_FILE" <<'PYEOF'
import yaml, sys
with open(sys.argv[1]) as f:
    d = yaml.safe_load(f)
print(d.get('corpus_file', ''))
PYEOF
)

RUNS_PER_TARGET=$(python3 - "$MANIFEST_FILE" <<'PYEOF'
import yaml, sys
with open(sys.argv[1]) as f:
    d = yaml.safe_load(f)
print(d.get('runs_per_target', 1))
PYEOF
)

# 期望产物名取自 rubric.artifacts(per-skill 契约),run.sh 不硬编码具体 skill 的产物名
RUBRIC_REL=$(python3 - "$MANIFEST_FILE" <<'PYEOF'
import yaml, sys
with open(sys.argv[1]) as f:
    d = yaml.safe_load(f)
print(d.get('rubric_ref', ''))
PYEOF
)
EXPECTED_ARTIFACTS=""
if [[ -n "$RUBRIC_REL" && -f "$SCRIPT_DIR/$RUBRIC_REL" ]]; then
  EXPECTED_ARTIFACTS=$(python3 - "$SCRIPT_DIR/$RUBRIC_REL" <<'PYEOF'
import re, yaml, sys
txt = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'```yaml\n(.*?)\n```', txt, re.S)
arts = (yaml.safe_load(m.group(1)).get('artifacts', []) if m else []) or []
print(' '.join(arts))
PYEOF
)
fi

# headless 落点异常兜底目录(相对目标项目根,{module} 占位);空=不兜底
INTERACTIVE_DIR_TPL=$(python3 - "$MANIFEST_FILE" <<'PYEOF'
import yaml, sys
with open(sys.argv[1]) as f:
    d = yaml.safe_load(f)
print(d.get('interactive_artifact_dir', '') or '')
PYEOF
)

CORPUS_FILE="$TARGET_PROJECT/$CORPUS_REL"
if [[ ! -f "$CORPUS_FILE" ]]; then
  echo "[run.sh] Error: corpus file not found: $CORPUS_FILE" >&2
  exit 1
fi

echo "[run.sh] corpus: $CORPUS_FILE"
echo "[run.sh] runs_per_target: $RUNS_PER_TARGET"

# ── count corpus modules ──────────────────────────────────────
TOTAL_MODULES=$(python3 - "$CORPUS_FILE" <<'PYEOF'
import yaml, sys
with open(sys.argv[1]) as f:
    d = yaml.safe_load(f)
print(len(d.get('modules', [])))
PYEOF
)
echo "[run.sh] corpus module count: $TOTAL_MODULES"
if [[ "${CORPUS_LIMIT}" != "0" ]]; then
  echo "[run.sh] SKILL_EVAL_CORPUS_LIMIT=${CORPUS_LIMIT}: only run first ${CORPUS_LIMIT} modules"
fi

# ── build run workspace ───────────────────────────────────────
RUN_ID=$(date '+%Y%m%d-%H%M%S')
RUN_DIR="$SCRATCH/skill-eval/${TARGET_SKILL}/${RUN_ID}"
mkdir -p "$RUN_DIR/runs"
touch "$RUN_DIR/STARTED"   # 批跑已启动标记; summary 写入后才算 done
echo "[run.sh] workspace: $RUN_DIR"

# ── init run-manifest ─────────────────────────────────────────
MANIFEST_OUT="$RUN_DIR/run-manifest.json"
python3 - <<PYEOF
import json
manifest = {
    'run_id': '${RUN_ID}',
    'target_skill': '${TARGET_SKILL}',
    'target_project': '${TARGET_PROJECT}',
    'corpus_file': '${CORPUS_FILE}',
    'runs_per_target': int('${RUNS_PER_TARGET}'),
    'ok': [],
    'failed': []
}
with open('${MANIFEST_OUT}', 'w') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
PYEOF

# ── per-module loop ───────────────────────────────────────────
OK_COUNT=0
FAIL_COUNT=0
PROCESSED=0

# read corpus into temp file to avoid subshell issues
CORPUS_TMP=$(mktemp)
python3 - "$CORPUS_FILE" "${CORPUS_LIMIT}" > "$CORPUS_TMP" <<'PYEOF'
import yaml, json, sys
with open(sys.argv[1]) as f:
    d = yaml.safe_load(f)
modules = d.get('modules', [])
limit = int(sys.argv[2]) if sys.argv[2] != '0' else len(modules)
for m in modules[:limit]:
    print(json.dumps(m, ensure_ascii=False))
PYEOF

# ── headless 落点隔离 ──────────────────────────────────────────
# 暂存目标项目的交互产物目录(interactive_artifact_dir 的父目录),消除靶 skill 在
# headless 下「ls 到历史产物 → 误判多模块批量」的 derail 触发源(见交接包 C1 取证)。
# trap 保证正常/异常/中断都恢复;每模块跑后清掉本轮 derail 副本,保持下一模块干净视野。
DOCS_LIVE=""; DOCS_STASH=""
if [[ -n "$INTERACTIVE_DIR_TPL" ]]; then
  DOCS_PARENT_REL="${INTERACTIVE_DIR_TPL%%/\{module\}*}"
  # 路径防御:必须是项目内相对、多级路径(非空、不以 / 开头、含 /),否则不隔离
  if [[ -n "$DOCS_PARENT_REL" && "$DOCS_PARENT_REL" != /* && "$DOCS_PARENT_REL" == */* ]]; then
    DOCS_LIVE="$TARGET_PROJECT/$DOCS_PARENT_REL"
  fi
fi
restore_docs() {
  [[ -n "$DOCS_LIVE" ]] || return 0
  rm -rf "$DOCS_LIVE"
  [[ -n "$DOCS_STASH" && -d "$DOCS_STASH" ]] && mv "$DOCS_STASH" "$DOCS_LIVE"
}
if [[ -n "$DOCS_LIVE" ]]; then
  trap restore_docs EXIT
  if [[ -d "$DOCS_LIVE" ]]; then
    DOCS_STASH="$RUN_DIR/.interactive-docs-stash"
    mv "$DOCS_LIVE" "$DOCS_STASH"
    echo "[run.sh] 已暂存历史交互产物 $DOCS_LIVE(消除 headless 多模块联想;批跑结束自动恢复)"
  fi
fi

while IFS= read -r MODULE_JSON; do
  PROCESSED=$((PROCESSED + 1))

  MODULE=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('module',''))" "$MODULE_JSON")
  MODULE_CN=$(python3 -c "
import json,sys
d = json.loads(sys.argv[1])
pa = d.get('preset_answers', {})
print(pa.get('module_cn', d.get('module','')))
" "$MODULE_JSON")

  # Build EVAL_PRESET JSON for this module
  PRESET=$(python3 -c "
import json,sys
d = json.loads(sys.argv[1])
pa = d.get('preset_answers', {})
out = {
    'module':    d.get('module', ''),
    'module_cn': pa.get('module_cn', d.get('module','')),
    'scope':     pa.get('scope', ''),
    'exclude':   pa.get('exclude', [])
}
print(json.dumps(out, ensure_ascii=False))
" "$MODULE_JSON")

  MODULE_RUN_DIR="$RUN_DIR/runs/$MODULE"
  mkdir -p "$MODULE_RUN_DIR"

  echo ""
  echo "[run.sh] [$PROCESSED] module: $MODULE ($MODULE_CN)"

  TRACE_FILE="$MODULE_RUN_DIR/trace.jsonl"
  RUN_JSON="$MODULE_RUN_DIR/run.json"
  META_FILE="$MODULE_RUN_DIR/run-meta.json"

  # write initial meta
  echo "$PRESET" > "$META_FILE"

  EXIT_CODE=0
  ELAPSED=0
  for ((run_i=1; run_i<=RUNS_PER_TARGET; run_i++)); do
    START_TS=$(date +%s)

    # run claude -p with restricted permissions + eval-settings (trace hook attached)
    MODEL_FLAG=()
    [[ -n "${SKILL_EVAL_MODEL:-}" ]] && MODEL_FLAG=(--model "$SKILL_EVAL_MODEL")
    (
      cd "$TARGET_PROJECT"
      export EVAL_HEADLESS=1
      export EVAL_OUT="$RUN_DIR/runs"
      export EVAL_TRACE="$TRACE_FILE"
      export EVAL_PRESET="$PRESET"

      claude -p "/$TARGET_SKILL $MODULE" ${MODEL_FLAG[@]+"${MODEL_FLAG[@]}"} \
        --output-format json \
        --settings "$SETTINGS_FILE" \
        --allowedTools 'Read' 'Grep' 'Glob' 'Bash' 'Write' 'Edit' 'Task' \
        > "$RUN_JSON" 2>&1
    ) || EXIT_CODE=$?

    END_TS=$(date +%s)
    ELAPSED=$((END_TS - START_TS))
    echo "  done: exit=${EXIT_CODE}  elapsed=${ELAPSED}s"
  done

  # update meta with timing/exit info
  python3 - "$META_FILE" "$EXIT_CODE" "$ELAPSED" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
d['exit_code'] = int(sys.argv[2])
d['elapsed_sec'] = int(sys.argv[3])
with open(sys.argv[1], 'w') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
PYEOF

  # check artifacts exist;EVAL_OUT 缺失时从交互落点(interactive_artifact_dir)回收(headless 落点兜底)
  MISSING_LIST=""
  FALLBACK_DIR=""
  if [[ -n "$INTERACTIVE_DIR_TPL" ]]; then
    FALLBACK_DIR="$TARGET_PROJECT/${INTERACTIVE_DIR_TPL//\{module\}/$MODULE}"
  fi
  for art in $EXPECTED_ARTIFACTS; do
    if [[ ! -f "$MODULE_RUN_DIR/$art" ]]; then
      if [[ -n "$FALLBACK_DIR" && -f "$FALLBACK_DIR/$art" ]]; then
        cp "$FALLBACK_DIR/$art" "$MODULE_RUN_DIR/$art"
        echo "  warn: $art 未落 EVAL_OUT,已从交互落点回收 ($FALLBACK_DIR/$art) — 落点异常,根因见交接包 C1"
      else
        MISSING_LIST="${MISSING_LIST}${art},"
      fi
    fi
  done
  [[ -f "$TRACE_FILE" ]]                     || MISSING_LIST="${MISSING_LIST}trace.jsonl,"
  [[ -f "$RUN_JSON" ]]                       || MISSING_LIST="${MISSING_LIST}run.json,"
  MISSING_LIST="${MISSING_LIST%,}"

  # 清掉本模块若 derail 写到交互落点的副本(当前模块的已被上面 fallback 回收进 EVAL_OUT),
  # 保持下一模块「看不到本轮/历史产物」的干净视野;trap 在批跑结束统一恢复历史
  [[ -n "$DOCS_LIVE" && -d "$DOCS_LIVE" ]] && rm -rf "$DOCS_LIVE"

  if [[ -z "$MISSING_LIST" && $EXIT_CODE -eq 0 ]]; then
    echo "  status: OK"
    OK_COUNT=$((OK_COUNT + 1))
    python3 - "$MANIFEST_OUT" "$MODULE" "$EXIT_CODE" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    m = json.load(f)
m['ok'].append({'module': sys.argv[2], 'exit_code': int(sys.argv[3])})
with open(sys.argv[1], 'w') as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
PYEOF
  else
    REASON=""
    [[ $EXIT_CODE -ne 0 ]] && REASON="exit_code=${EXIT_CODE}"
    if [[ -n "$MISSING_LIST" ]]; then
      REASON="${REASON:+${REASON},}missing=${MISSING_LIST}"
    fi
    echo "  status: FAILED (${REASON})"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    python3 - "$MANIFEST_OUT" "$MODULE" "$EXIT_CODE" "$REASON" "$MISSING_LIST" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    m = json.load(f)
missing = [x for x in sys.argv[5].split(',') if x] if len(sys.argv) > 5 and sys.argv[5] else []
m['failed'].append({
    'module':     sys.argv[2],
    'exit_code':  int(sys.argv[3]),
    'reason':     sys.argv[4] if len(sys.argv) > 4 else '',
    'missing':    missing
})
with open(sys.argv[1], 'w') as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
PYEOF
  fi

done < "$CORPUS_TMP"
rm -f "$CORPUS_TMP"

# ── update manifest summary ───────────────────────────────────
python3 - "$MANIFEST_OUT" "$PROCESSED" "$OK_COUNT" "$FAIL_COUNT" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    m = json.load(f)
m['summary'] = {
    'total_processed': int(sys.argv[2]),
    'ok':              int(sys.argv[3]),
    'failed':          int(sys.argv[4])
}
with open(sys.argv[1], 'w') as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
PYEOF

# ── summary output ────────────────────────────────────────────
echo ""
echo "========================================"
echo "[run.sh] batch run complete"
echo "  ok: ${OK_COUNT}  failed: ${FAIL_COUNT}  processed: ${PROCESSED}"
echo "  workspace: ${RUN_DIR}"
echo "  run-manifest: ${MANIFEST_OUT}"
echo "========================================"

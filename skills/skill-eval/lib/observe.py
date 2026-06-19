#!/usr/bin/env python3
"""per-run 确定性观察器:读 rubric 机读块 + 一个 run 的模块产物,产 findings.json。
引擎项目无关:所有 skill 特有参数从 rubric 读,本脚本只提供检查原语。"""
import os, re, json, argparse, glob

def load_rubric_yaml(skill_dir, skill):
    import yaml
    p = os.path.join(skill_dir, "rubrics", f"{skill}.md")
    m = re.search(r'```yaml\n(.*?)\n```', open(p, encoding='utf-8').read(), re.S)
    if m is None:
        raise ValueError(f"rubric {p} 缺 ```yaml 机读块")
    return yaml.safe_load(m.group(1))

def resolve_module_dir(run_dir, module):
    """单层 runs/<m>/ 优先;双层 runs/<m>/<m>/ 回退(历史 EVAL_OUT bug 遗留)。
    返回 (artifact_dir, meta_dir):产物可能在内层,trace/run.json 在外层。"""
    outer = os.path.join(run_dir, "runs", module)
    inner = os.path.join(outer, module)
    art_dir = inner if os.path.exists(os.path.join(inner, "design.md")) else outer
    return art_dir, outer

def read_trace(meta_dir):
    rows = []
    p = os.path.join(meta_dir, "trace.jsonl")
    if os.path.exists(p):
        for ln in open(p, encoding='utf-8'):
            ln = ln.strip()
            if ln:
                try: rows.append(json.loads(ln))
                except json.JSONDecodeError: pass
    return rows

def fnd(check_id, klass, verdict, severity, summary, evidence):
    return {"check_id":check_id,"klass":klass,"verdict":verdict,"severity":severity,
            "summary":summary,"evidence":evidence}

def observe_module(run_dir, run_id, module, skill, rub):
    art_dir, meta_dir = resolve_module_dir(run_dir, module)
    trace = read_trace(meta_dir)
    findings, process = [], {}
    # --- run.json ---
    rj = {}
    rjp = os.path.join(meta_dir, "run.json")
    if os.path.exists(rjp):
        try: rj = json.load(open(rjp, encoding='utf-8'))
        except Exception: rj = {}
    exit_ok = (rj.get("is_error") is False) and (rj.get("subtype") == "success")
    stop = rj.get("stop_reason")
    process["exit_ok"] = exit_ok; process["stop_reason"] = stop
    process["duration_ms"] = rj.get("duration_ms")
    findings.append(fnd("run_completed","A","pass" if exit_ok else "flag",
        "info" if exit_ok else "defect-candidate",
        f"跑完={exit_ok} stop_reason={stop}",
        [{"source":"run.json","detail":f"is_error={rj.get('is_error')} subtype={rj.get('subtype')} stop={stop}"}]))
    if stop and stop != "end_turn":
        findings.append(fnd("abnormal_stop","A","flag","defect-candidate",
            f"非正常结束:{stop}(可能截断)",[{"source":"run.json","detail":f"stop_reason={stop}"}]))
    # headless 门:AskUserQuestion 不该出现在 permission_denials
    denied = [d.get("tool_name") for d in (rj.get("permission_denials") or [])]
    gate = rub.get("headless_gate","AskUserQuestion")
    gate_ok = gate not in denied
    process["headless_gate_ok"] = gate_ok
    findings.append(fnd("headless_gate","A","pass" if gate_ok else "flag",
        "info" if gate_ok else "defect-candidate",
        f"headless 门剥干净={gate_ok}",
        [{"source":"run.json","detail":f"permission_denials={denied}"}]))
    # --- trace 归属:spawn / distinct agent_id / SubagentStop ---
    spawns = sum(1 for r in trace if r.get("event")=="PostToolUse" and r.get("tool_name")=="Agent")
    sub_ids = sorted({r.get("agent_id") for r in trace if r.get("agent_id")})
    stops = sum(1 for r in trace if r.get("event")=="SubagentStop")
    exp = rub.get("expected_subagents",1)
    process.update(subagent_spawns=spawns, distinct_agent_ids=len(sub_ids), subagent_stops=stops)
    one_agent = (spawns==exp) and (len(sub_ids)==exp) and (stops==exp)
    findings.append(fnd("subagent_count","A","pass" if one_agent else "flag",
        "info" if one_agent else "defect-candidate",
        f"恰 {exp} 个子 agent:spawn={spawns} ids={len(sub_ids)} stop={stops}",
        [{"source":"trace","detail":f"agent_ids={sub_ids}"}]))
    # 读代码证据:去子 agent 化后改统计主上下文(agent_id 为空)的 Read/Grep(近乎没读=幻觉红旗)
    read_cnt = sum(1 for r in trace if (not r.get("agent_id")) and r.get("tool_name") in ("Read","Grep"))
    process["main_context_reads"] = read_cnt
    rmin = rub.get("read_evidence_min",5)
    findings.append(fnd("read_evidence","A","pass" if read_cnt>=rmin else "flag",
        "info" if read_cnt>=rmin else "defect-candidate",
        f"主上下文读代码 {read_cnt} 次(下限 {rmin})",
        [{"source":"trace","detail":f"main-context Read+Grep={read_cnt}"}]))
    # --- 产物存在 + 非空 ---
    present = []
    for a in rub.get("artifacts",[]):
        ap = os.path.join(art_dir, a); sz = os.path.getsize(ap) if os.path.exists(ap) else 0
        ok = sz >= rub.get("artifact_min_bytes",200); present.append(a) if ok else None
        findings.append(fnd(f"artifact_{a}","A","pass" if ok else "flag",
            "info" if ok else "defect-candidate",
            f"{a} 存在且≥{rub.get('artifact_min_bytes',200)}B={ok}(size={sz})",
            [{"source":a,"detail":f"path={ap} size={sz}"}]))
    process["artifacts_present"] = present
    # --- B 类:design.md 节齐 ---
    design = ""
    dp = os.path.join(art_dir,"design.md")
    if os.path.exists(dp): design = open(dp,encoding='utf-8').read()
    for sec in rub.get("design_sections",[]):
        # 容前缀匹配(节名后可带补充字)
        hit = any(line.startswith(sec[:8]) for line in design.splitlines())
        findings.append(fnd(f"design_section::{sec[:12]}","B","pass" if hit else "flag",
            "info" if hit else "defect-candidate",
            f"design 节『{sec}』在={hit}",[{"source":"design.md","detail":sec}]))
    # 陷阱条数(§5 内的有序/无序列表条目近似计数)
    traps = count_trap_items(design, rub.get("trap_section_header","## 5"))
    twarn = rub.get("trap_count_warn",8)
    findings.append(fnd("trap_count","B","needs_judge" if traps>twarn else "pass",
        "warn" if traps>twarn else "info",
        f"陷阱 {traps} 条" + (f" > {twarn} → 疑 count 爆量,交 judge 复核注水" if traps>twarn else ""),
        [{"source":"design.md","detail":f"trap_items={traps}"}]))
    # hedge 自标注反模式(命中=候选,交 judge 语义确认)
    for pat in rub.get("hedge_patterns",[]):
        for i,line in enumerate(design.splitlines(),1):
            if re.search(pat, line):
                findings.append(fnd("hedge_selfannotation","B","needs_judge","defect-candidate",
                    f"疑自标注反模式(v1.0.1 缺陷类):命中 /{pat}/",
                    [{"source":"design.md","detail":f"L{i}: {line.strip()[:80]}"}]))
    # §5 禁示例代码块
    if rub.get("code_block_in_trap"):
        sec5 = slice_section(design, rub.get("trap_section_header","## 5"))
        if "```" in sec5:
            findings.append(fnd("code_block_in_trap","B","needs_judge","warn",
                "§5 陷阱节疑含示例代码块(design-format 禁)",
                [{"source":"design.md","detail":"§5 内出现 ``` 围栏"}]))
    # --- B 类:requirements.md 节齐 + 禁代码标识 ---
    req = ""
    rp = os.path.join(art_dir,"requirements.md")
    if os.path.exists(rp): req = open(rp,encoding='utf-8').read()
    for sec in rub.get("requirements_sections",[]):
        hit = any(line.startswith(sec[:10]) for line in req.splitlines())
        findings.append(fnd(f"req_section::{sec[:12]}","B","pass" if hit else "flag",
            "info" if hit else "defect-candidate",
            f"requirements 节『{sec}』在={hit}",[{"source":"requirements.md","detail":sec}]))
    for fp in rub.get("requirements_forbidden_patterns",[]):
        hits=[]
        for i,line in enumerate(req.splitlines(),1):
            if re.search(fp["regex"], line): hits.append(f"L{i}: {line.strip()[:70]}")
        if hits:
            findings.append(fnd(f"req_forbidden::{fp['id']}","B","flag","defect-candidate",
                f"requirements 抽象层越界:{fp['desc']}({len(hits)} 处)",
                [{"source":"requirements.md","detail":h} for h in hits[:5]]))
    return {"module":module,"run_id":run_id,"skill":skill,"process":process,"findings":findings}

def count_trap_items(design, header):
    sec = slice_section(design, header)
    return sum(1 for ln in sec.splitlines() if re.match(r'\s*([-*]|\d+\.|\*\*)\s', ln) and len(ln.strip())>6)

def slice_section(text, header):
    lines = text.splitlines(); out=[]; cap=False
    for ln in lines:
        if ln.startswith(header[:8]): cap=True; continue
        if cap and ln.startswith("## ") : break
        if cap: out.append(ln)
    return "\n".join(out)

def discover_modules(run_dir):
    return sorted(os.path.basename(p.rstrip("/")) for p in glob.glob(os.path.join(run_dir,"runs","*/")))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir"); ap.add_argument("--skill", required=True)
    ap.add_argument("--module", default=None)
    a = ap.parse_args()
    skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rub = load_rubric_yaml(skill_dir, a.skill)
    run_id = os.path.basename(a.run_dir.rstrip("/"))
    mods = [a.module] if a.module else discover_modules(a.run_dir)
    for m in mods:
        res = observe_module(a.run_dir, run_id, m, a.skill, rub)
        _, meta_dir = resolve_module_dir(a.run_dir, m)
        outp = os.path.join(meta_dir, "findings.json")
        json.dump(res, open(outp,"w",encoding='utf-8'), ensure_ascii=False, indent=2)
        nf = sum(1 for f in res["findings"] if f["verdict"]!="pass")
        print(f"[{m}] findings={len(res['findings'])} 非pass={nf} → {outp}")

if __name__ == "__main__":
    main()

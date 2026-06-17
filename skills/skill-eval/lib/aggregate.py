#!/usr/bin/env python3
"""跨轮聚合 prep(确定性半):读多个 run 的 findings.json,算 recurrence/consistency/耗时离群。
判断半(同根因聚类、通用/特有、诚实标)由 aggregator agent 接力。"""
import os, json, glob, argparse, statistics

def load_findings(run_dirs):
    """返回 [(run_id, module, findings_obj)]"""
    out=[]
    for rd in run_dirs:
        for fp in glob.glob(os.path.join(rd,"runs","*","findings.json")):
            f=json.load(open(fp,encoding='utf-8'))
            out.append((f.get("run_id"), f.get("module"), f))
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--skill",required=True)
    ap.add_argument("--run",action="append",default=[],help="一个或多个 run-dir")
    ap.add_argument("--runs-root",default=None,help="一个目录,其下每个子目录是一个 run-dir")
    ap.add_argument("--out",required=True)
    a=ap.parse_args()
    run_dirs=list(a.run)
    if a.runs_root:
        run_dirs+=sorted(glob.glob(os.path.join(a.runs_root,"*/")))
    recs=load_findings(run_dirs)
    modules=sorted({m for _,m,_ in recs}); total=len(recs)
    # --- recurrence:按 check_id 聚合非 pass finding,以模块计复发 ---
    groups={}
    for rid,mod,f in recs:
        for fn in f["findings"]:
            if fn["verdict"]=="pass": continue
            g=groups.setdefault(fn["check_id"], {"check_id":fn["check_id"],"klass":fn["klass"],
                "modules":set(),"instances":[]})
            g["modules"].add(mod)
            g["instances"].append({"run_id":rid,"module":mod,"summary":fn["summary"],
                "evidence":fn.get("evidence",[])[:2]})
    group_list=[]
    for g in groups.values():
        fr=len(g["modules"])
        group_list.append({"check_id":g["check_id"],"klass":g["klass"],
            "flagged_runs":fr,"total_runs":len(modules),
            "modules":sorted(g["modules"]),"recurrence":f"{fr}/{len(modules)}",
            "instances":g["instances"]})
    group_list.sort(key=lambda x:(-x["flagged_runs"], x["check_id"]))
    # --- consistency:同模块多 run 的指标发散(陷阱数 / 节数差) ---
    by_mod={}
    for rid,mod,f in recs:
        by_mod.setdefault(mod,[]).append((rid,f))
    consistency=[]
    for mod,lst in by_mod.items():
        if len(lst)<2: continue
        traps=[ _trap_count(f) for _,f in lst ]
        consistency.append({"module":mod,"runs":len(lst),"metric":"trap_count",
            "values":traps,"divergent": (max(traps)-min(traps))>=2})
    # --- 耗时离群 ---
    durs=[(mod, f.get("process", {}).get("duration_ms")) for _,mod,f in recs if f.get("process", {}).get("duration_ms")]
    outliers=[]
    if len(durs)>=3:
        med=statistics.median([d for _,d in durs])
        for mod,d in durs:
            if med and d>=4*med: outliers.append({"module":mod,"duration_ms":d,"median_ms":int(med),"ratio":round(d/med,1)})
    res={"skill":a.skill,"modules":modules,"total_runs":total,
         "run_ids":sorted({rid for rid,_,_ in recs}),
         "groups":group_list,
         "consistency_signals":consistency,"duration_outliers":outliers}
    json.dump(res, open(a.out,"w",encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"aggregate: modules={len(modules)} groups={len(group_list)} consistency={len(consistency)} outliers={len(outliers)} → {a.out}")

def _trap_count(f):
    import re
    for fn in f["findings"]:
        if fn["check_id"]=="trap_count":
            for ev in fn.get("evidence",[]):
                m=re.search(r'trap_items=(\d+)', ev.get("detail",""))
                if m: return int(m.group(1))
            m=re.search(r'陷阱 (\d+) 条', fn.get("summary",""))
            if m:
                import sys as _s; print(f"[aggregate] warn: trap_count via summary fallback (evidence trap_items missing)", file=_s.stderr)
                return int(m.group(1))
    return 0

if __name__=="__main__": main()

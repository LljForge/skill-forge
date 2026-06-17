#!/usr/bin/env python3
"""校验 + 针对性修复 B2/B3 agent 写的 judge.json / grounding.json。

背景:agent 裸写 JSON 时,常在中文叙述里夹英文直双引号(如 的"删除"是),破坏 JSON 结构。
本工具只修这一类「被中文紧邻包围的成对英文双引号」→ 中文引号「」,不猜测结构引号
(结构引号前是 ASCII,不被匹配)。修不好的列出,交编排层重派对应 agent(SKILL B4.5)。

用法:
  python3 validate_json.py <run_dir>
退出码 0=全部合法(可能经修复);1=仍有坏档(名单见 stdout 的 STILL_BROKEN 行)。
"""
import os, sys, json, re, glob

# 被中文字符/中文标点紧邻包围的成对英文双引号 → 中文「」;反复替换处理嵌套
_PAT = re.compile(r'([一-鿿])"([^"\n]{1,40}?)"(?=[一-鿿，。、；：）)】」！？])')

def repair_text(text):
    prev = None
    while prev != text:
        prev = text
        text = _PAT.sub(r'\1「\2」', text)
    return text

def try_load(path):
    """返回 ('ok', obj) / ('repaired', obj) / ('broken', err)"""
    raw = open(path, encoding='utf-8').read()
    try:
        return 'ok', json.loads(raw)
    except json.JSONDecodeError:
        pass
    fixed = repair_text(raw)
    try:
        obj = json.loads(fixed)
    except json.JSONDecodeError as e:
        return 'broken', str(e)
    # 修复成功 → 覆写
    open(path, 'w', encoding='utf-8').write(fixed)
    return 'repaired', obj

def main():
    if len(sys.argv) != 2:
        print("用法: python3 validate_json.py <run_dir>", file=sys.stderr)
        sys.exit(2)
    run_dir = sys.argv[1]
    paths = sorted(glob.glob(os.path.join(run_dir, "runs", "*", "judge.json")) +
                   glob.glob(os.path.join(run_dir, "runs", "*", "grounding.json")))
    repaired, broken = [], []
    for p in paths:
        status, _ = try_load(p)
        rel = os.path.relpath(p, run_dir)
        if status == 'repaired':
            repaired.append(rel); print(f"REPAIRED {rel}")
        elif status == 'broken':
            broken.append(rel); print(f"BROKEN   {rel}")
        else:
            print(f"OK       {rel}")
    print(f"\n汇总: 合法 {len(paths)-len(repaired)-len(broken)} / 修复 {len(repaired)} / 仍坏 {len(broken)}")
    if broken:
        # 名单供编排层重派对应 agent(模块名=父目录名)
        mods = sorted({os.path.basename(os.path.dirname(b)) for b in broken})
        print("STILL_BROKEN " + " ".join(f"{os.path.basename(os.path.dirname(b))}/{os.path.basename(b)}" for b in broken))
        print("STILL_BROKEN_MODULES " + " ".join(mods))
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()

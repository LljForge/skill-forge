# 整支代码评审 — <change-name>

> 收尾前整支评审本次分支改动(`merge-base..HEAD`),由 ⑤ 整支评审 sub-agent 产出。
> 两轴判据与档位见本 skill 的 references/code-reviewer.md（即派发你的那份评审 prompt）,本表只填结论与发现。

## 评审范围
- 分支 diff:`<BASE>..HEAD`　|　设计依据:`design.md` + `requirements.md`

## 轴一 · Standards(代码质量)
- 结论:[✅ 通过 / ⚠️ 须改 / ❌ 阻断]
- 发现(无则"无";每条:`[阻断/须改/可改] @<file:line> — <问题> → <建议>`):
  - <无则"无">

## 轴二 · Spec(对设计忠实)
- 结论:[✅ 通过 / ⚠️ 须改 / ❌ 阻断]
- 发现(同上形态,无则"无";覆盖:`design.md` 检查锚点逐条接住 / scope creep / 与 design 矛盾):
  - <无则"无">

## 修订事项清单
（任一轴出"须改 / 阻断"时必填,标所属轴 + 严重度;两轴各自独立、不合并成总排序）
1. [Standards / Spec · 阻断/须改/可改] <修订项>

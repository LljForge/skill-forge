# dogfood 覆盖账本(COVERAGE)

> codebase-exploration 验证覆盖的单一载体。元层维护资产,**运行时不读**。dogfood 协议(目标来源 / 双目标各压一面 / 完整图整体回归准入)权威见 [MAINTAINING.md](MAINTAINING.md)。
> 目的:让**「哪些项目 / 栈 / 形态 / 维度还没验」一眼可见**——防 v0.11「完整图散文区从未被压、欠账累积到引爆」那类盲区。
> 产物落 `~/Projects/AI/cbx-validation/runs/`(非 git);弃用项目(GitNexus)历史成绩留痕、不再跑。

## 覆盖矩阵(项目 × 形态 × 已验维度)

| 项目 | 栈 / 形态 | 近期 dogfood | 已验维度 | 盲区 / 待验 |
|---|---|---|---|---|
| **master-data** | Java / 扁平分层伞形包(大) | v0.10 / v0.11 / v0.12 / **v1.1** | §5.5 防脚本化威慑 · D6 路径接地 · D7 scope(扁平分层有,v1.1 `^BaseEmployee` 前缀锚定重验) · 精确计数清零 · 伞形包拆分 · 反向边逐边核 · **v1.1 解耦落产物(零 /module-brief) · 新三态 schema · 指针询问式只读** | 跨栈边(D4 未建) · D5-A 大仓折叠 |
| **edoc**(原 GMZB-NJZL) | Java+TS / 包即模块(中) | v0.11 / v0.12 / **v1.1** | D6 路径接地(含 **TS 侧**相对路径) · D7 免 scope(包即模块不画蛇添足,v1.1 重验) · 精确计数清零 · 慢变 · **v1.1 解耦落产物(零 /module-brief) · 新三态 schema · 指针询问式只读** | 跨栈边(D4) · 伞形包形态(本仓无) |
| **slp** | Java SpringCloud + React 微前端 + 微信小程序 / 最大仓(1663 java) | v0.12 / v0.13 | 三栈识别(qiankun/micro-app + 小程序) · **D5-A 大仓可读性守住灵魂**(三重降噪) · D6/D7/精确计数大仓重验 · 强度档未坍缩 · Feign 自暴露判对 · 编排团/空壳剔除属实 · **@Lazy 降档/漏环修复(v0.13)** | D5-B 仍未触发 · 跨栈边(D4 未建) |
| **flycat** | Java + Next.js/React + uni-app/**Vue** / 三栈最丰富(1066 java) | v0.12 | 三栈合并 · **Vue/uni-app 识别**(重点证伪坐实) · D6 路径接地(25 锚点双命中) · D7 scope · 精确计数 · 新旧 business 双包断言准 | 跨栈边(D4 未建) |
| **factoring** | Java+TS / **no-git** | — 本轮未跑(v0.6/v0.7 曾跑) | — | 新鲜度节优雅降级(no-git) · D6/D7/精确计数未验 |
| ~~GitNexus~~ | ~~纯 TS~~ | **已弃用、不再跑** | (v0.6–v0.10 历史) | — |

## 进度小结(随实跑更新)

- **本轮(v0.9–v0.13)深度覆盖**:master-data(扁平分层)+ edoc(包即模块)+ **slp(最大仓三栈)+ flycat(三栈最丰富)**——四形态跑透,D6/D7/精确计数 + §5.5 + 三栈识别全 ship。
- **本轮收口(v0.12→v0.13)**:
  1. **slp 大仓**:三栈(SpringCloud+React 微前端+小程序)全识、D5-A 可读性**实证守住**(三重降噪)→ BACKLOG #2 出列;assessor 抓出 **@Lazy 降档/漏环**缺陷 → v0.13 §1.C/§1.D 根因修 + 定向 dogfood 复验闭合。
  2. **flycat 三栈**:Vue/uni-app 识别 + 三栈合并 + 新旧 business 双包,经回源坐实 PASS。
- **v1.1 解耦验证(edoc + master-data,executor/assessor 分离,均 ship)**:与 /module-brief 彻底解耦 + 三态改名 ✅深读/⚖️你定/⬜略读 + 指针改询问式——触产物 schema,按准入条双目标各压一面(edoc 包即模块压不回归 / master-data 扁平分层压暴露)各出完整 7 节图 + 全文精确计数 grep 整体回归;assessor 回源核 **A–G 全 PASS、零 /module-brief、零新人字眼、指针询问式只读未污染目标仓、scope `^` 锚定无过匹配**。产物 `runs/{edoc,master-data}-2026-06-25-v1.1-map.md`。
- **仍存盲区(下次优先补)**:
  1. **跨栈边(D4)** — 能力未建,所有多栈仓前端→后端边是已知缺口(BACKLOG #1)。
  2. **D5-B** — 单域超大模块未触发(继续盯 slp,BACKLOG #3)。
  3. **factoring(no-git)** — 新鲜度优雅降级自 v0.7 未重验。
- **准入提醒**:触 SKILL 契约段 schema / 新增散文区的版本,至少一次出**完整 7 节图** + 全文精确计数 grep 整体回归(MAINTAINING dogfood 协议)。

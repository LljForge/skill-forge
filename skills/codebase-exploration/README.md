# codebase-exploration（代码探索 · 跨栈项目结构活地图)

帮**第一次接手陌生项目**的新人快速建立结构认知:有哪些模块、各自干什么、模块间怎么调、哪里有坑、从哪读起。从源码客观测绘,产出 [docs/codebase-map.md](../../docs/codebase-map.md) 一份**活地图**。

> 完整运行规则见 [SKILL.md](SKILL.md),本文件只做总览与导航。

---

## 这是什么

一份**项目结构地图(活文档)**:记录慢变的架构结构(模块边界 / 依赖形状 / 约定与横切),给还不懂业务的新人 **5 分钟**建立全局认知——不是给分析师的技术报告。

- **跨栈**:Java / TS / Python / Go 等,按 manifest 探测栈、取对应配方(见 [references/stack-recipes.md](references/stack-recipes.md))。
- **不易过时**:只写抗重构的慢变结构,易变细节(行号 / 精确计数 / 穷举清单)剔除、交 `/module-brief`;配漂移自检 + 一键重生。
- **双重用途**:既是人接手项目的资产,也是 AI 编程时的架构指引。

**何时触发**(本 Skill 模型可自动触发,也可手动点名):用户刚接手项目想先熟悉全局、问「这代码库怎么分模块 / 什么结构」、或要「画个项目地图」时。

**产出 `docs/codebase-map.md` 七节**:① 技术栈与分层 · ② 模块总览 + 读者卡片 · ③ 约定与横切机制 · ④ 改动前必读 / 陷阱 · ⑤ 上手顺序(✅跑 / ⚖️你定 / ⬜不跑 + `/module-brief` 命令)· ⑥ 模块依赖矩阵 · ⑦ 新鲜度与重生。

## 与姊妹 Skill 的分工(互不依赖)

| Skill | 性质 | 何时用 |
|------|------|--------|
| **codebase-exploration**(本) | 广、快、跨栈、活地图 | 刚接手,先建立全局认知 |
| `module-brief` | 选定**一个**模块、读进上下文产出需求+设计认知文档 | 探索后要深入读懂某个模块 |
| `module-spec-baseline` | 把模块现状逆向成 openspec 规范基线(长期、过 validate) | 要为某模块引入 openspec 治理 |

三者**完全独立、互不读写依赖**——本 Skill 出地图,经地图里的 `/module-brief <模块>` 命令导向下游,但不耦合其实现。

## 目录结构

```
codebase-exploration/
├── SKILL.md              # 运行脊柱 + 全部能力(① 模块测绘 / ⑤ 约定横切 / 信号配方层 / 产物 schema / 自检 · 权威)
├── README.md             # 本文件 · 总览与导航
├── MAINTAINING.md        # 维护宪法(改本 Skill 自己时读 · 纪律 / dogfood 协议 / 质量边界 · 不随运行载入)
├── BACKLOG.md            # 候选优化清单(D4/D5/②④ · 待触发条件 · 运行时不读)
├── COVERAGE.md           # dogfood 覆盖账本(项目×形态×维度 · 盲区可见 · 运行时不读)
├── CHANGELOG.md          # 变更日志(证据先行 · 已采纳的历史)
├── docs/
│   └── theory-foundation.md   # SAR 谱系理论底座(D4–D7+②④ 对标成熟项目 + 可借鉴范式)
└── references/
    ├── example.md             # 读者卡片完整范例(虚构 TS 项目)
    └── stack-recipes.md       # 框架约定速查表(派生种子 · 新栈结晶进此、不回灌 SKILL.md)
```

## 如何开始

**用它**(在你要探索的项目里):刚接手时说「带我熟悉下这个项目 / 这代码库怎么分模块」即可触发;跑完产出 `docs/codebase-map.md`,从「⑤ 上手顺序」按 `/module-brief <模块>` 命令逐个深入。

**优化它**(在 skill-forge 仓):说「优化 codebase-exploration 的 X」(X = `BACKLOG.md` 某条 / 一个新痛点 / dogfood 浮出的问题)——维护流程(理论先行 → 改根因 → dogfood → 立 CHANGELOG)权威在 [MAINTAINING.md](MAINTAINING.md);开放候选看 `BACKLOG.md`、验证覆盖与盲区看 `COVERAGE.md`。

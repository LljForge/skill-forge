# module-brief 观察 rubric

> 观察器的尺子=module-brief 自己声明的契约。偏离这里声明的才算 finding。所有阈值/正则/节名均来自 module-brief 的 SKILL.md 与 references/ 下 format 文件;改 module-brief 契约时同步改本文件。

## 机读检查参数(observe.py 解析下面这个 ```yaml 块)

```yaml
skill: module-brief
# A 类·流程性
expected_subagents: 1            # SKILL.md「全程只 1 个子 agent」。数 spawn/distinct agent_id/SubagentStop
subagent_type_hint: general-purpose   # 实测 agent_type;仅信息用,检查禁止以此匹配(见下)
artifacts:                       # 两份产物,落 $EVAL_OUT/<module>/
  - requirements.md
  - design.md
artifact_min_bytes: 200          # 兜底线:产物非空(SKILL.md「两份齐」)
read_evidence_min: 5             # 子 agent 对模块代码的 Read+Grep 计数下限(近乎没读=幻觉红旗)
headless_gate: AskUserQuestion   # 该工具若出现在 run.json.permission_denials = 门没剥干净
# B 类·产物契约性
design_sections:                 # design-format.md 五节骨架,缺=结构不完整(N/A 显式除外)
  - "## 1. 分层结构概览"
  - "## 2. 关键类 / 接口入口"
  - "## 3. 核心调用链"
  - "## 4. 数据模型概览"
  - "## 5. 陷阱与护栏"
requirements_sections:           # requirements-format.md 四节骨架
  - "## 1. 模块为谁解决什么"
  - "## 2. 核心业务能力与规则"
  - "## 3. 术语表"
  - "## 4. 主要业务场景与流程"
requirements_forbidden_patterns: # requirements 禁一切代码标识(requirements-format.md 抽象层约束)
  - { id: camelcase_class, regex: '`[A-Z][a-z]+[A-Z][A-Za-z]+`', desc: 驼峰类名 }
  - { id: java_file, regex: '\.java\b', desc: .java 文件名 }
  - { id: method_call, regex: '\.[a-zA-Z_]+\(', desc: 方法调用语法 }
  - { id: sql_kw, regex: '\b(SELECT|INSERT|UPDATE|DELETE|JOIN|WHERE)\b', desc: SQL 关键字 }
  - { id: status_eq, regex: 'status\s*=\s*[0-9'']', desc: status=0 式取值 }
  - { id: http_path, regex: '\b(GET|POST|PUT)\s+/|@RequestMapping', desc: HTTP 路径 }
trap_section_header: "## 5. 陷阱与护栏"
trap_count_warn: 8               # 陷阱条数 > 此值 → count-爆量候选(format「只留最狠的几条」)。判断 agent 复核是否注水
hedge_patterns:                  # 自标注反模式(v1.0.1 黄金缺陷)。grep 命中=候选,交 judge 语义确认
  - '这条?偏通用'
  - '比较通用'
  - '可能不(特定|针对)'
  - '通用规范.{0,6}(保留|但)'
code_block_in_trap: true         # §5 禁示例代码块(design-format.md);检测 ``` 围栏出现在陷阱节
```

## prose 指引(quality-judge agent 读,做软判断)

### 陷阱质量(逐条判 具体 vs 通用废话)
module-brief 的 design-format §5 入选双测(每条都过,不过=该删):
1. **模块替换测试**:把模块名换成另一个模块这条还成立吗?还成立=通用规范(事务/日志/异常/命名/空值、`@MapperScan` 注册新 DAO 这类),**应删**——家在项目级 CLAUDE.md。
2. **能否写成「改 X 会踩 P」**?写不出=普通业务陈述,应删。
- ✅ 留(本模块特有):点名具体 PO/表/触发器、有「改 A 必连带改 B」的协同关系。例:"取消订单必须同步反写库存占用表,否则库存虚高"。
- ❌ 删(换模块也成立):"异常要捕获并记日志"、"状态字段建议用枚举"。
> 判断输出:逐条陷阱标 `specific` / `generic` / `borderline`,generic/borderline 给理由。

### 自标注反模式(v1.0.1 黄金缺陷,最强回归判据)
v1.0.1 根因:survey-agent 把一条偏通用陷阱(`@MapperScan` 注册新 DAO)**保留并自加一句「这条偏通用规范」**,而非按模块替换测试删掉。收紧后契约:**边界性通用项一律直接删、不许「保留+标注它偏通用」的折中**。
> 判断输出:observe.py 的 `hedge_patterns` 命中项,逐条确认是否真是「保留通用陷阱 + 对冲标注」(是=`confirmed` 黄金缺陷复发;否=误报,如「通用方法/通用基类」这类正当技术描述)。

### 刻意不做(design-format「刻意不做」清单,碰了=候选)
- 不穷举 PO 字段(只点关键字段)。
- 不画全部状态机(只点名 + 挑核心画一个)。
- 不做跨模块依赖合并/去重重机制(提一句「依赖谁」即可)。
- 锚点放宽(`OrderService#cancel` 或口语「见取消逻辑」都行,不要求机器可 grep)。
> 判断输出:design.md 是否有穷举字段表/画了多个状态机/陷阱注水等越界,逐条标。

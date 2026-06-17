# 清单（manifest）字段说明

清单文件是**引擎侧**配置，描述"用 skill-eval 评哪个 skill、怎么评"。**严禁在清单文件中写入目标项目的真值**（具体模块名、业务前缀、代码路径等）——这些真值只进对应项目侧的 `corpus_file`。

---

## 字段一览

| 字段 | 类型 | 说明 |
|---|---|---|
| `target_skill` | string | 被评的 skill 名，与 `skills/<name>/` 目录名一致 |
| `target_project_env` | string | 目标项目根路径由该环境变量传入（调用方 `export` 后传给 run.sh），清单不硬编码路径 |
| `corpus_file` | string | 相对目标项目根的 corpus 路径；真值（模块清单/预设答案）只在此文件里 |
| `runs_per_target` | int | 每个 corpus 条目（如每个模块）跑几次，默认 1；将来用于多次采样计算一致性 |
| `gates[]` | list | 技能门控列表；每个 gate 描述某个"需要用户交互的门"如何在 headless 模式下被绕过 |
| `gates[].step` | string | 门所在的步骤描述（可读标识，不要求与 skill 内部字符串完全匹配） |
| `gates[].answer_from` | string | 门的答案来源：`preset_answers` 表示从 corpus 的 `preset_answers` 字段取值 |
| `hard_validators[]` | list | 硬校验器列表（程序化可自动判 pass/fail）；无硬校验器时留空 `[]` |
| `rubric_ref` | string | 主观评分标准文件路径（相对 skill-eval 目录）；批跑侧先占位，评分侧（计划 2B）才建内容 |

---

## 示例

以下例子用 `com.<root>.x` 占位，**不写任何真实项目/模块名**。

### corpus 条目结构（项目侧 corpus_file 内的每个元素）

```yaml
modules:
  - module: <skill-target-id>                  # 如 com.<root>.x-module-a
    preset_answers:
      module_cn: "<中文名占位>"                 # 如 X模块
      scope: "com.<root>.x 前缀=X*"            # scope 文本对应 skill Step 1 需要的定位信息
      exclude: []                               # 可选排除子包
```

### 清单文件结构（引擎侧，无真值）

```yaml
target_skill: <skill-name>
target_project_env: SKILL_EVAL_TARGET_PROJECT
corpus_file: .skill-eval/corpus/<skill-name>.yml
runs_per_target: 1
gates:
  - step: "<Step 名称>"
    answer_from: preset_answers
hard_validators: []
rubric_ref: rubrics/<skill-name>.md
```

---

## 铁律

1. 清单文件（本目录下 `*.yml`）**项目无关**——不写模块名、业务前缀、仓库路径。
2. 目标项目真值（模块清单 + 预设答案）**只进各项目的 `corpus_file`**（如 `GMZB/.skill-eval/corpus/module-brief.yml`）。
3. `rubric_ref` 在批跑侧（计划 2A）是**占位指针**；rubric 内容由计划 2B 建立，届时对着真实 trace 写，不投机。

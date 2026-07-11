---
name: codex-design-review
description: 用户显式说「Codex 审这个设计 / 这个方案」时,拉 Codex 引擎(companion task,read-only 沙箱)独立审一份设计意图——design/spec/plan/brief/RFC 文档,或一段还没落文档的想法。视角是假设是否成立 / 完整性 / 内部一致性 / DoD 可验证性 / 有无更优解 / 风险,非代码 severity。输入可为路径(Claude 读)或 inline 文本,**不依赖 git**。**不自动触发**。审"代码改动 / 本次变更"改用 codex-code-review。
---

# Codex 审设计方案(codex-design-review)

对一份设计意图——design / spec / plan / brief / RFC 文档,或一段还没落文档的想法——拉**不同引擎(Codex)**做独立对抗式评审,消除单模型确认偏差。本 Skill 只覆盖"审设计"这一情境;审"代码改动/本次变更"不在本 Skill 范围。**本 Skill 自包含、零跨调**——不依赖仓库里其它 Skill,只与情境对偶的 `codex-code-review` 共享引擎分离铁律与显式触发规矩,不互相调用。

**触发**:仅当用户显式说出"Codex 审这个设计 / Codex 审这个方案 / Codex 审 xxx 这份 spec"这类词根 + 对象时启动。**不自动触发**。用户若说"Codex 审本次变更/我刚写的改动"(审的是 git 改动,而非设计意图),改用 `codex-code-review`,不要在本 Skill 里处理。

## 执行流程

### 1. 识别输入
- **路径**(文件/目录):用 Read 读入;目录则枚举其中的设计文档(*.md 等),逐个读入。
- **inline 文本**:用户在对话里直接给的方案,直接取用。
- 范围收口:只审 design/spec/plan/brief/RFC 这类"设计意图"。若被要求审代码改动,改指 codex-code-review。

### 2. 组装 prompt(安全传参)
- Read `references/design-review-prompt.md` 模板。
- 把 `{{USER_FOCUS}}` 替换为用户附加重点(无则"无额外重点"),`{{REVIEW_INPUT}}` 替换为第 1 步读到的设计内容。
- **用 Write 把成品 prompt 落到临时文件 `$PROMPT_FILE`**——绝不把设计内容(含 markdown 反引号)直接拼进 shell 串。

### 3. 派 Codex 审(task,read-only)
```bash
CODEX="$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)"
node "$CODEX" task --wait "$(cat -- "$PROMPT_FILE")"
# 大设计可后台:Bash run_in_background + --background,再看 /codex:status
```
`task` 缺省 read-only(不 --write),reviewer 只审不改。**不加 --write。**

### 4. 呈现裁决
把 Codex 的发现按其自带格式原样呈现,逐条给裁决建议(修 / 归后续 / 记录),由用户拍板。

## 铁律
- 引擎分离:reviewer 固定 Codex,只审不改;裁决权在 controller。
- 不 pre-judge:不得指示 reviewer 忽略/降级某问题。
- 不用 adversarial-review:它审 diff 且硬依赖 git,不匹配"审静态设计"。

# 技术栈检测器

> 由 SKILL.md 主逻辑在 Step 0 前置校验中 Read 后在主上下文执行。不启动 Agent。

## 检测流程

1. 检查 `openspec/.spec-baseline-scratchpad/.stack-profile.yml` 是否存在
   - 存在 → Read 文件，解析 YAML，跳过检测，直接进入"检测结果 → 变量映射"环节
   - 不存在 → 执行下方自动检测 → 写入缓存文件

## 自动检测步骤

> 各技术栈的「识别特征」（注解、依赖关键词、目录约定）权威源在本检测器的 Step 2–6；策略文件（`shared/strategies/`）不再重复识别特征，只承载分析模式 / 关键词召回底线 / 栈特有陷阱 / 输出 schema。

### Step 1 — 后端根目录发现

Glob 搜索 `**/pom.xml` 和 `**/build.gradle`，排除 `node_modules/` 和 `target/`。

判定规则（互斥条件，按优先级依次检查）：
- **规则一**：仅存在一个 pom.xml 且含 `<packaging>pom</packaging>` → 其所在目录为后端根目录
- **规则二**：存在多个 pom.xml → 取最顶层包含 `<modules>` 的父 pom 所在目录
- **规则三**：仅存在 build.gradle（无 pom.xml）→ 取包含 `subprojects` 或 `allprojects` 的顶层 gradle 所在目录
- **规则四**：项目根目录直接就是 Java 项目（根 pom.xml/build.gradle 无子模块）→ 后端根目录为 `.`

> **互斥性说明**：规则一和规则二为互斥条件：单个 pom.xml 时走规则一，多个 pom.xml 时走规则二。
> **混用场景**：若同时存在 pom.xml 和 build.gradle，优先以 pom.xml 为准。

### Step 2 — Web 框架检测

在后端根目录下 Grep：
1. Grep `@SpringBootApplication` 或 `@EnableAutoConfiguration`
   - 命中 → `web: spring-boot`
2. 否则 Grep `@Controller` 且 Glob 搜索 `**/web.xml`
   - 命中 → `web: spring-mvc`
3. 都无 → `web: spring-boot`（默认，Spring Boot 是当前 Java 生态最常见的框架）

### Step 3 — ORM 检测

在后端根目录下：
1. Grep `pom.xml` 或 `build.gradle` 中是否含 `mybatis` 关键词
   - 若命中 `mybatis-plus` → `orm: mybatis-plus`
   - 否则仅命中 `mybatis` → `orm: mybatis`
2. 否则 Grep `spring-data-jpa` 或 `hibernate-core`
   - 命中 → `orm: jpa`
3. 都无 → `orm: mybatis`（默认）

### Step 4 — RPC 检测

在后端根目录下 Grep：
1. Grep `@FeignClient` 或 `@EnableFeignClients`
   - 命中 → `rpc: feign`
2. 否则 Grep `@DubboReference` 或 `@DubboService` 或 `pom.xml`/`build.gradle` 中含 `dubbo`
   - 命中 → `rpc: dubbo`
3. 都无 → `rpc: none`

### Step 5 — 项目结构检测

在后端根目录下 Glob：
1. 存在匹配 `*-domain/` 或 `*-app/` 或 `*-api/` 的子目录
   - 命中 → `structure: ddd`
2. 否则存在 `**/controller/` 且 `**/service/` 且 `**/dao/`（或 `**/mapper/` 或 `**/repository/`）
   - 命中 → `structure: three-tier`
3. 都无 → `structure: three-tier`（默认）

### Step 6 — 前端发现

Glob 搜索项目根目录下的 `*/package.json`（仅一层深度，排除 node_modules）。

对每个找到的 package.json 及其目录：
1. **优先检查微信小程序**：若目录下存在 `app.json` 且 Grep 含 `"pages"` → `framework: wechat-miniprogram`，`name` 取目录名
2. 否则 Read package.json 文件，检查 dependencies/devDependencies：
   - 含 `react` → `framework: react`，`name` 取目录名
   - 含 `vue` → `framework: vue`，`name` 取目录名
3. 都不匹配 → 跳过该目录

前端发现结果为数组，可能有 0~N 个。

### Step 7 — 写入缓存

将检测结果写入 `openspec/.spec-baseline-scratchpad/.stack-profile.yml`。示例（有前端）：

```yaml
# 自动检测生成，可手动编辑覆盖
# 重新检测：删除此文件后重新运行 skill

detected_at: 2026-04-19T10:30:00Z

backend:
  language: java
  root: myapp-be
  web: spring-boot
  orm: mybatis-plus
  rpc: feign
  structure: ddd

frontend:
  - name: myapp-weixin-fe
    root: myapp-weixin-fe
    framework: wechat-miniprogram
  - name: myapp-fe
    root: myapp-fe
    framework: react

# 模块定位别名（可选，boundary 定位加速）；本 skill 产物单元是 capability、不依赖此字典，留空即可
module_aliases: {}
```

若前端为空，写入：

```yaml
backend:
  language: java
  root: {{BACKEND_ROOT}}
  web: {{WEB_TYPE}}
  orm: {{ORM_TYPE}}
  rpc: {{RPC_TYPE}}
  structure: {{PROJECT_STRUCTURE}}

frontend: []

module_aliases: {}
```

## 检测结果 → 变量映射

检测完成后，SKILL.md 编排层从 `.stack-profile.yml` 读取值并设置以下变量：

| 变量名 | 来源 |
|--------|------|
| `BACKEND_ROOT` | `backend.root` |
| `WEB_TYPE` | `backend.web` |
| `ORM_TYPE` | `backend.orm` |
| `RPC_TYPE` | `backend.rpc` |
| `PROJECT_STRUCTURE` | `backend.structure` |
| `WEB_STRATEGY_PATH` | 拼接 `shared/strategies/web/{{WEB_TYPE}}.md` |
| `ORM_STRATEGY_PATH` | 按 `ORM_TYPE` 查表：`mybatis` / `mybatis-plus` → `shared/strategies/orm/mybatis.md`（同一份，MyBatis 家族）；`jpa` → `shared/strategies/orm/jpa.md` |
| `RPC_STRATEGY_PATH` | 拼接 `shared/strategies/rpc/{{RPC_TYPE}}.md` |

> **前端**：本 skill 不继承 frontend-agent、无前端策略文件（specs 描述系统可观察行为，不建模 UI）。检测仍记录 `frontend[]` 仅供「某 capability 确属纯客户端行为」例外时，由 C 综合就该 capability 定点 grep 前端代码——非默认路径。

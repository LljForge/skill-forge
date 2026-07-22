---
name: miniprogram-test
description: 根据自然语言功能目标或用户提供的测试用例，为原生微信小程序制定测试方案、生成可读自动化脚本、通过微信开发者工具受控执行并输出包含截图与证据等级的测试报告。用于用户提出“测试某个功能”“按这些用例测试”“生成小程序测试脚本或报告”“验证当前微信账号下的业务数据”时；环境未准备好时在同一流程内引导处理，不要求用户先搭建持久化测试框架。
---

# 微信小程序轻量测试

## 定位

把用户的一句话目标或现有用例转换为三个产物：测试方案、可读测试脚本和测试报告。首次环境检查是测试流程的内部步骤，不暴露独立搭建体系，也不要求用户理解 framework、manifest、Probe、Runner 或语义版本。

将当前 `SKILL.md` 所在绝对目录记为 `<Skill 目录>`。始终通过 `<Skill 目录>/scripts/session.js` 调用确定性实现，不依赖当前工作目录或 PATH 中的同名命令。

## 工作流

1. 优先采用用户给出的项目路径、功能目标、测试用例、微信身份、测试数据和清理限制。只补问无法从代码或当前环境判断、且会改变测试结果或安全边界的信息。
2. 把自然语言目标或现成用例归一为：测试目标、身份、前置条件、步骤、预期结果、测试数据、状态变化、清理政策、截图和证据层级。只读取目标页面、直接组件、接口封装和必要后台实现，用 `sourceEvidence` 记录支撑路由、交互和预期的文件；明确区分代码事实、合理推断和仍需用户补充的业务信息。不要为建立长期资产而遍历整个项目、历史报告、依赖目录或无关业务。
3. 始终通过统一 `session.js` 入口执行命令。入口会在读取测试规格或写入产物前检查 Node.js：当前版本不是 22/24 时，先验证 `MINIPROGRAM_TEST_NODE`，再从 NVM、asdf、mise、Volta、Homebrew 或 Windows NVM 的标准位置确定性选择受支持版本并单次重新执行；代理不需要自行拼接 Node 路径。候选必须通过版本探测，不经过 Shell，重启标记阻止递归；找不到受支持版本时保持失败关闭。首次实际执行前再即时检查原生小程序结构、微信开发者工具 CLI、当前项目和服务端口。CLI 按 `--cli-path`、`WECHAT_DEVTOOLS_CLI`、macOS 或 Windows 标准安装位置的顺序选择，只接受存在的绝对文件路径；不扫描项目目录、PATH 或整个磁盘，找不到时提示用户提供显式路径。发现阻断时给出具体处理方式；不要另外搭建或升级项目 framework。

   首次真实开发者工具执行前先运行：

   ```bash
   node <Skill 目录>/scripts/session.js deps-status
   ```

   该命令只读检查 `<Skill 目录>/node_modules/miniprogram-automator`，输出所需精确版本、当前状态、安装命令、网络范围和写入范围，且不得从项目目录或全局依赖兜底。状态为 `ready` 时直接继续；状态为 `install-required` 时，先把输出中的安装计划展示给用户并取得明确批准，再运行：

   ```bash
   node <Skill 目录>/scripts/session.js install-deps --approve-dependency-install
   ```

   安装入口只在受支持的 Node.js 22/24 下以无 Shell 方式运行 `npm ci --omit=dev --ignore-scripts`，只写 Skill 自身 `node_modules` 以及当前用户的 npm 缓存和日志目录。不得静默安装，不得在被测小程序项目安装依赖；需要强制只用本机缓存时可追加 `--offline`。Skill 升级后若锁文件版本变化或依赖不一致，必须重新检查并按相同流程处理。`prepare`、memory 自测和静态检查不要求该依赖；真实 `run --adapter devtools` 会在生成 `execution-claim.json` 前再次校验，缺失或版本不匹配时保持失败关闭，不消耗单次执行声明。
4. 按 `assets/test-spec.example.json` 的结构在临时目录生成结构版本 1 规格；有状态测试改用 `assets/test-spec.stateful.example.json`。用例 `id` 和后续 `run-id` 只使用 1 到 64 位字母、数字、点、下划线或连字符，并以字母或数字开头；不得把用户输入直接拼成路径。`inputSource` 记录 `natural-language`、`provided-cases` 或 `provided-spec`；`verificationLayers` 分开描述运行时/UI、认证业务、后台和外部系统，把本轮实际能够证明的层级同时写入 `evidenceLevels`，把暂时拿不到的证据标为 `not-verified`，把明确不在本功能范围内的层级标为 `not-applicable`。动态列表优先用 `expectVisible` 断言稳定选择器，避免把卡号、证件号等敏感业务文本写入脚本。测试目标要求出现特定 Toast、Modal、warning 或 exception 时，必须使用 `expectDiagnostic` 并声明 `kind` 与非敏感 `messageIncludes`，不得只在执行后人工查看诊断事件；该断言只支持 `toast`、`modal`、`console` 和 `exception`，事件未出现或监听不可用都应失败关闭。把静态回归、接口预检等额外结果写入 `supplementalChecks`，不得只在最终回复中宣称。把无法从代码或用户输入确定、且会改变执行路径的信息写入 `openQuestions`；这类规格可以生成草案，但在问题清零前不得执行。敏感值不得写入规格或脚本；只记录运行时环境变量名。用例步骤优先保持人能直接读懂；同一用例内截图名称不得重复。

   有状态测试必须把导航、选择等普通交互写成 `tap`，把真正发起业务写入的动作写成 `commit`。每个 `commit` 声明唯一 `commitId` 并使用以 `.`、`#` 或 `[` 开头的稳定选择器；发送验证码和确认签约属于两个不同提交点。读取小程序请求封装，使用 `submissionPolicy.clientReplayRisk` 记录应用是否可能在 401 等情况下重放请求；`uiAttempts` 固定为 1，无法观测网络层次数时将 `networkAttemptsObservable` 写为 `false`，不得把“UI 只点击一次”表述为“网络只提交一次”。

   页面入口依赖相册、相机等无法稳定自动化的原生系统选择器，而目标表单已经存在于当前页面时，可以在有状态规格中使用一次或多次 `arrangePageData`，仅通过 `Page.setData` 打开现有 UI。每个动作声明唯一 `arrangementId`、要设置的非敏感页面状态、原因和证据影响，并且必须发生在首次输入或提交之前。不得用它注入银行卡、证件号、身份、Token、业务主键或期望结果，不得读写 Storage 或直接调用页面业务方法。方案和报告必须展示设置值并明确被绕过的入口不在验证范围内。
5. 运行准备入口：

   ```bash
   node <Skill 目录>/scripts/session.js prepare \
     --spec <临时规格JSON> \
     --output <小程序目录>/test-e2e-miniprogram \
     --run-id <本地时间ID>
   ```

   保存 prepare 输出中的 `plan.contractDigest`。该摘要绑定生成的执行脚本；脚本或方案需要变化时，必须重新 prepare，有状态测试还必须重新展示并取得批准。
   `run-id` 必须在当前输出目录内唯一；准备产物已存在时不得覆盖。始终使用 prepare 返回的 `casePath`，新脚本位于 `cases/<run-id>/<case-id>.js`，不要自行假定或拼接旧的扁平路径。

6. 向用户展示生成的测试范围、步骤、数据来源、状态变化、截图、证据等级和清理政策。只读测试在用户已经要求执行时继续，不因普通流程重复请求确认。涉及状态变更、造数、签约、支付或不可逆操作时，必须在执行前展示测试数据、操作、预期副作用、截图和清理政策，并等待明确批准。
7. 真实 Adapter 就绪后，通过同一入口运行：

   ```bash
   node <Skill 目录>/scripts/session.js run \
     --case <生成的用例脚本> \
     --report-dir <本轮报告目录> \
     --adapter devtools \
     --contract-digest <prepare 返回的 plan.contractDigest> \
     --service-port-confirmed \
     --approve-startup-effects
   ```

   真实 devtools 执行需要监听本地回环端口并连接开发者工具。调用命令工具时应直接申请具备本地回环套接字权限的受控权限，不要先在受限沙箱运行后再把同一用例当作重试；不得使用 Shell 绕过权限。运行会在 Adapter 启动前原子生成 `execution-claim.json`；同一报告目录只能取得一次执行声明，重复或并发调用返回 `RUN_ALREADY_CLAIMED`，不得删除声明后重跑。若返回 `AUTOMATION_PORT_PERMISSION_DENIED`，固定报告权限阻断并停止，不自动重跑。只有本轮有状态计划已经获得明确批准时追加 `--approve-state-change --approve-plan-digest <用户批准的 plan.contractDigest>`。批准摘要必须与准备摘要和实际脚本摘要一致；缺失、错配或脚本变化都必须在 Adapter 启动前阻断。批准只覆盖已展示的用例、数据和状态变化，不能扩展到其他业务操作。
8. 交付 `plan.md`、用例脚本、`execution-claim.json`、`report.md`、`report.html`、`result.json` 和安全截图。中文或特殊字符截图名会得到稳定短摘要；目标文件已经存在时返回 `SCREENSHOT_ALREADY_EXISTS`，绝不覆盖旧截图。只读或认证只读用例中的独立断言失败时，将有界明细写入 `assertionFailures`，继续执行后续独立断言与安全截图；只允许在同一已打开会话中继续取证，不重复导航、点击、输入、请求或提交。导航、交互、基础设施错误仍立即停止；有状态用例在首个失败断言处停止，保持提交结果未知与只读对账规则。报告必须带上输入来源、身份来源、来源代码证据、实际执行证据、失败的只读断言、补充检查、分层验证结论、单次执行声明、准备/实际/批准摘要，以及 Skill 运行时版本、Node 版本、Adapter、`nodeBootstrap`、`devtoolsCliSource`、`failure.code` 执行溯源和脱敏应用诊断；Node 引导只允许 `current-process` 或 `auto-reexecuted`，CLI 来源只允许 `explicit`、`environment`、`standard`、`unknown` 或 `not-applicable`，不得记录实际 Node 或 CLI 路径。把已通过的 `expectDiagnostic` 断言与仅捕获但未断言的诊断事件分开呈现。诊断监听不可用时明确标记，不得为了捕获 Toast/Modal 改变原业务调用结果。`stateChanges` 只表示方案声明的副作用，不得当作已观察结果。分别读取 `executionStatus` 与 `businessOutcome`：工具步骤完成不等于业务已验证，memory 自测通过时业务结果仍为 `not-verified`；Adapter 尚未启动便失败时业务结果也是 `not-verified`；汇总到任何只读断言失败时执行与业务结果都为 `failed`，顶层错误码为 `ASSERTION_FAILED`；提交已经发出但必要后置结果无法确认时为 `unknown`。无法直接核对的层级写成未验证，不用截图代替后台闭环。
9. 已完成且结果确定的测试若后来取得独立后台、接口或外部系统证据，保持原 `result.json`、`report.md` 和 `report.html` 不变。按 `assets/evidence-attachment.example.json` 生成只含脱敏事实的临时 JSON，为每项确定性结论引用一个可复算 SHA-256 的证据文件，然后运行：

   ```bash
   node <Skill 目录>/scripts/session.js attach-evidence \
     --result <原报告目录>/result.json \
     --evidence <临时脱敏证据JSON>
   ```

   该命令只校验现成证据，不执行 SQL、后台接口或外部调用；只生成一次不可覆盖的 `attestation.json`、`attestation.md` 和 `attestation.html`，绑定原结果与证据摘要，但不改写原业务结果。未知有状态提交禁止使用该入口，必须继续执行下一步的逐提交对账。
10. 有状态提交结果为 `unknown` 时保持原 `result.json`、`report.md` 和 `report.html` 不变，不重跑提交。按业务范围取得独立的 UI、接口、数据库或外部系统只读证据；把脱敏事实按 `assets/reconciliation-evidence.example.json` 写入临时 JSON，并为每项确定性结论引用一个可复算 SHA-256 的证据文件。不得把 SQL、Shell、连接凭据或秘密值写入对账规格。证据齐备后运行：

   ```bash
   node <Skill 目录>/scripts/session.js reconcile \
     --result <原报告目录>/result.json \
     --evidence <临时脱敏对账证据JSON>
   ```

   该命令只能为带提交点的有状态结果生成一次 `reconciliation.json`、`reconciliation.md` 和 `reconciliation.html`，并绑定原结果与证据摘要；已有附件、摘要错配、敏感值、无摘要的确定性结论或原结果变化都必须失败关闭。对账附件用 `commitEffect` 表示提交是否生效，用 `reconciledBusinessOutcome` 表示业务最终结果，不反向覆盖原报告的 `businessOutcome`。最终回复先汇总原结果，再单独汇总对账附件。

## 有界收尾协议

每次 `session.js` 命令退出后立即进入收尾，不得为了补充汇报继续遍历项目、历史报告或无关代码。只读取命令返回的路径和本轮目标产物；除非用户提出新问题，不再扩大调查范围。

- `prepare` 成功：固定汇报测试范围、身份、状态变化、证据层级、输出目录，以及是否需要用户批准；只读且用户已要求执行时继续进入 `run`。
- `run` 成功或失败：固定汇报 `executionStatus`、`businessOutcome`、尝试次数、提交效果、分层证据和产物链接，然后结束本轮测试。不得为了得到更好结论重跑。
- `attach-evidence` 成功：只核对原结果摘要未变、分层结论、三个附件路径及摘要，然后立即回复。一个目标只调用一次，不用第二次调用证明不可覆盖。
- `reconcile` 成功：只核对原结果摘要未变、逐提交效果、对账后业务结果、分层结论、三个附件路径及摘要，然后立即回复。一个目标只调用一次。
- 命令非零退出：只读检查命令明确返回的目标文件是否存在，固定汇报错误码、是否写入、已知状态和安全下一步，然后停止。对 `run`、`attach-evidence` 和 `reconcile` 不自动重试；不得用反复搜索或新的业务操作补救。

最终回复控制在结论、证据边界、产物和必要后续四部分内。没有必要后续时直接结束，不追加泛化建议或再次询问已经给出的信息。

## 项目产物

项目默认只保留：

```text
test-e2e-miniprogram/
├── cases/
│   └── <run-id>/
│       └── <case-id>.js
└── reports/<run-id>/
    ├── plan.md
    ├── execution-claim.json
    ├── report.md
    ├── report.html
    ├── result.json
    ├── attestation.md          # 已完成结果补充独立证据时生成
    ├── attestation.html
    ├── attestation.json
    ├── reconciliation.md       # 仅未知有状态结果完成只读对账后生成
    ├── reconciliation.html
    ├── reconciliation.json
    └── screenshots/
```

不得生成 manifest、setup-state、framework 副本、Probe Pack、business-chain、coverage、Runner Identity、升级备份或项目级 `node_modules`。只有用户明确希望复用公共配置时，才提议增加一个无秘密值配置文件。

## 安全行为

- 使用当前开发者工具微信身份时，在报告中注明身份来源；Token、OpenID、身份证、银行卡、验证码和密钥只允许运行时注入。
- Skill 对每个 `commit` 最多发出一次 UI 操作且绝不自动重放；应用自身的网络重放风险必须在方案和报告中披露。`expectDiagnostic` 只轮询已捕获事件，不重放触发事件的点击、路由、请求或提交。基础设施故障有限排查后停止，不循环重试。
- 每个 `run-id` 只能准备一次，每个报告目录只能执行一次；不得覆盖脚本、方案、执行声明、报告、结果或截图，也不得通过删除 `execution-claim.json` 规避单次执行边界。
- Node 自动切换只重新启动同一条 Skill 命令，不是业务重试；它发生在加载规格、报告和 Adapter 之前，只允许经过版本探测的 Node 22/24，且绝不通过 Shell 执行。
- `arrangePageData` 只能准备当前页面内存状态，必须由摘要批准绑定并记录证据边界；它不是业务提交，也不能用于伪造业务结果。
- 认证失效时把身份刷新作为独立步骤；不得在未知提交结果后自动登录并重放业务操作。
- `commit` 已经发出后发生超时、断联或必要断言失败时，把 `businessOutcome` 记为 `unknown` 并停止；只能继续只读对账，不能重跑原提交。
- 证据附件和对账命令都只校验脱敏结构化证据与文件摘要，不执行 SQL、Shell、后台接口或外部系统调用；实际只读查询仍由当前测试任务按项目边界完成。
- 原始结果、证据附件和对账附件都不可覆盖；一个报告目录每种附件只允许生成一次，不得通过新入口篡改已有结论。
- 不允许清理数据时，只核对最终状态并报告残留，不擅自删除。
- 敏感页面不自动截图；截图失败不能掩盖业务结果，也不能把 UI 证据提升为后台或外部证明。
- 造数脚本必须先展示并获得批准。无数据时不得为了覆盖率自行创建数据。
- Skill 更新前必须暂停并展示完整更新内容、影响范围、验证和回滚方式；业务执行授权不能覆盖 Skill 更新。

## 实现边界

窄 `devtools` Adapter 支持打开注册页面、提交前受控页面状态准备、精确文本断言、稳定选择器可见性断言、普通点击、单次提交、输入、安全截图、应用警告/异常与最佳努力 Toast/Modal 监听、显式诊断事件断言，以及分层报告。读取等待必须有界，只能重复读取页面或已捕获诊断事件；不能重放路由、请求或业务动作。存在性断言允许页面出现多个匹配节点；点击和输入的文本或选择器出现多个匹配时必须失败关闭，`commit` 只允许唯一稳定选择器。memory Adapter 仅可用于 Skill 自测，不得冒充真实微信开发者工具测试，其通过结果不会把真实运行时/UI 或认证业务标为已验证。后台状态与外部系统证据仍须按具体用例单独取得，不能由 UI 结果外推。`miniprogram-automator` 只能安装在 Skill 自身目录，不得要求每个被测项目安装依赖。

# Changelog

All notable changes to this project will be documented in this file.

## 0.1.32 - 2026-06-22

### 说明

- 本次为版本同步发布，未引入新的命令、接口或行为差异；代码内容与 `v0.1.31` 保持一致。
- 发布前重新执行 `pnpm check` 与 `pnpm release:smoke-query`，确认当前构建、类型、测试和固定查询回归仍可通过。

## 0.1.31 - 2026-06-18

### 修复

- 修复 `getMyWeeklyActivity` 把 `account` 设成必填、导致快捷入口文案 `zentao getMyWeeklyActivity --week this` 直接报 `account 不能为空` 的问题：命令 schema 改为可选，API 层在 `account` 缺省时默认回退到当前登录账号，并同步更新 README / skill 文档示例。

### 变更

- 查询 smoke 脚本 `pnpm release:smoke-query`（`scripts/release-query-smoke.mjs`）从“只校验退出码”升级为“按命令校验返回内容”：
  - 补齐之前没真正验过的读命令：`getProductAll` / `getProductTrack` / `getProductWhitelist` / `getProductDashboard` / `getProductRoadmap` / `getProductDynamic`、`getProjectTeam` / `getProjectGroup` / `getProjectManageMembers` / `getProjectWhitelist` / `getProjectDynamic` / `getProjectLinkedProducts`、`getExecutionManageMembers` / `getExecutionAll` / `getExecutionStoryKanban` / `getExecutionKanban` / `getExecutionTaskKanban` / `getExecutionExecutionKanban`、`getReleaseDetail` / `getTodoDetail`（依赖前置查询得到的 ID）、`getProgramAll` / `getProgramTrack` / `getProgramStakeholders` 等。
  - 为列表/详情/统计/关系/上下文类命令补充结构断言：必含字段、目标 ID 命中、列表数组、统计计数、关系/上下文快照等，避免“返回 200 但数据错”漏检。
  - 自动跳过缺少 `ZENTAO_SMOKE_RELEASE_PROJECT_ID` / `TODO_ID` / `RELEASE_ID` 这类前置环境变量的项；不再因为权限/数据缺失而污染失败统计。
- `getProgramAll` / `getProgramTrack` 在服务端缺少对应旧版控制器时，回退到 REST `/programs` + `/programs/{id}` + `program-stakeholder-{id}.json` 的稳定实现，不再因 `module program has no all/track method` 直接报错。
- 旧版响应解析（`src/utils/json.ts:1`）增强对 `{"status":"success","data":"{...}"}` 这种二次 JSON 包裹的解包，让 `getProductAll` / `getExecutionAll` / `getProgramAll` 等命令直接返回结构化字段而不是双层字符串。

### 文档

- 同步 README / skill 参考：`getMyWeeklyActivity` 不再把 `--account` 写为例必填；查询 smoke 脚本可作为发布前 / 修复后的内容回归手段。

## 0.1.30 - 2026-06-18

### 新增

- 新增 3 个面向 AI / 脚本短链路消费的快照命令：
  - `getBugSnapshot`：聚合 Bug 关键信息、生命周期字段、裁剪后的复现步骤和最近动作。
  - `getDevelopmentContextSnapshot`：聚合需求 / Bug 的开发上下文，返回 focus、关联 Bug / 需求和摘要。
  - `getExecutionSnapshot`：聚合执行详情、构建、动态、未关闭 Bug 和逾期任务，减少“先查详情再查列表”的往返次数。
- 新增 `src/core/http-metrics.ts`，统一记录命令执行期间的请求次数和最近一次请求耗时，供 CLI 输出层透出。

### 变更

- CLI 新增全局输出模式 `--output compact|normal|verbose`：
  - `compact` 默认裁剪长文本、长列表，降低 AI / 脚本消费成本。
  - `normal` 在紧凑输出基础上保留常用分页和来源元信息。
  - `verbose` 保留原始 JSON 输出，便于排查完整字段。
- 所有 JSON 命令输出统一追加 `meta.requestCount` 和 `meta.durationMs`，便于 Agent 判断链路成本和慢请求。
- HTTP 读取链路增强：
  - REST / legacy / download 请求统一记录耗时。
  - 401 失效后继续保留一次自动重试。
  - 对 `ECONNRESET`、`ETIMEDOUT`、`EAI_AGAIN`、`socket hang up`、`timeout` 等网络类错误增加一次自动重试。
  - REST `GET` 请求新增 15 秒 TTL 的轻量缓存，命中时返回 `cacheHit: true`。
- `help` 输出新增命令级提示：
  - `预估成本`（`low` / `medium` / `high`）
  - `下一步` 推荐命令（`nextBestTools`）
- 为高价值只读命令批量补齐 `costHint` 和 `nextBestTools`，覆盖 task / bug / story / product / project / plan / execution / build / release / testcase / testtask / search / profile / todo / relation / phase3c / program 等主要查询入口。
- `zentao install` / `zentao update` 内部安装 skill 时，统一改为非交互的全局 agent 安装参数：`skills add <source> --global --agent universal --yes`，避免旧交互式行为阻塞自动化环境。

### 文档

- 更新 README，补充输出模式、快照命令、帮助提示增强和新的 skill 安装命令示例。
- README 的“这版补了什么”改为聚焦 AI 友好输出、短链路命令和安装更新体验增强。

### 测试

- 新增 snapshot API 测试，覆盖 `getBugSnapshot`、`getDevelopmentContextSnapshot`、`getExecutionSnapshot`。
- 新增 CLI 测试，覆盖 `--output normal|verbose`、`help` 中的 `预估成本` / `下一步` 展示。
- 新增 HTTP 缓存测试，校验重复 GET 只发一次请求并返回 `cacheHit: true`。
- 新增 registry / tool-registry 测试，校验 `CliCommandMetadata` 存储与 snapshot 工具派发。

## 0.1.29 - 2026-06-17

### 修复

- 按照本地 `zentaopms-18.5` 源码逐条复核最近几次新增的旧页面链路，修正一批 18.5 下原本会提交错字段、打错路径或命中不存在控制器的写操作。
- 修复产品线维护链路：`manageProductLine` 现已按页面真实字段提交 `modules[id]` / `modules[]` / `programs[id]` / `programs[]`，兼容已有项与新增项混合提交。
- 修复测试用例批量操作链路：
  - `updateTestCaseOrder` 改为提交真实 `scenes` / `orderBy` 字段。
  - `batchChangeTestCaseBranch` / `batchChangeTestCaseModule` / `batchChangeTestCaseType` 改为使用 18.5 控制器要求的路径段与 `caseIDList[]`。
  - `batchCreateTestCases` / `batchEditTestCases` 改为按行提交 `title[i]`、`type[i]`、`stage[i][]`、`steps[i][j][...]` 以及 `title[id]`、`types[id]`、`stages[id][]` 等真实模型字段。
  - `batchDeleteTestCases` 统一改为 `caseIDList[]`。
- 修复任务批量操作链路：
  - `batchChangeTaskModule` 改为走真实 `task-batchChangeModule-{moduleId}.json`。
  - `batchEditTasks` 改为按任务 ID 提交 `taskIDList[]`、`names[id]`、`types[id]`、`pris[id]`、`estStarteds[id]`、`deadlines[id]` 等真实表单字段。
  - `batchCloseTasks` 在服务端返回 `skipTaskIdList` 确认链接时会自动继续跟进，避免只关闭一部分任务后静默漏掉剩余任务。
- 修复 Bug / 待办 / 需求相关旧页面链路：
  - `batchCloseBugs` 在 `releaseId` 非空时同时提交 `unlinkBugs[]`，避免 18.5 控制器覆盖 `bugIDList` 后拿不到待关闭 Bug。
  - `batchCreateTodos` / `batchEditTodos` 改为按 `names[i]`、`types[i]`、`assignedTos[i]`、`todoIDList[id]`、`dates[id]` 等真实页面字段提交。
  - `batchToTaskStories` 改为真正按行提交批量转任务表单，而不再只打开页面前半段。
- 修复执行模块大量 18.5 兼容问题：
  - `startExecution` / `closeExecution` / `suspendExecution` / `activateExecution` / `putoffExecution` 改为真实 legacy action 路径。
  - `computeCfd` 改为调用真实 `execution-computeCFD-yes-{executionId}.json`；`computeBurn` / `computeExecutionBurn` 保持显式拒绝，避免在 18.5 下错误注入 `executionId`。
  - `linkStoriesToExecution` / `linkStoryToExecutionSingle` 改为提交 `products[storyId]`。
  - `batchEditExecutions`、`storyEstimate`、`updateOrder`、`storySort`、`batchChangeExecutionStatus` 等全部改为提交 18.5 控制器真实字段。
  - 对 `batchImportBugsToExecution`、`linkBugToExecution`、`unlinkBugFromExecution`、`executionTrack`、`executionStoryTasks`、`addExecutionWhitelist` 等 18.5 不存在或无法安全构造的入口改为明确报错，避免误调用 404/错链路。
- 修复多处工具层 schema / 描述与真实链路不一致的问题：把一批原本误导性的扁平参数改为 JSON 行数组或 map 结构，并在 18.5 不支持的入口上直接写明“确认执行时会报错”。

### 新增

- 新增 `pnpm coverage` / `scripts/coverage.mjs`，用于统计 CLI 对禅道 18.5 控制器入口的覆盖率，并输出模块缺口。
- 新增 `src/tools/phase3c.ts`，继续补全开发态 / 覆盖率相关工具入口与命令分组。

### 文档

- 更新 Skill 参考命令清单与开发覆盖率参考文档，补齐批量操作、执行链路和覆盖率维护说明。
- 更新 README，补充 18.5 写操作兼容说明、批量操作示例和发布前校验说明。

### 测试

- 扩充 API 回归测试，覆盖 task / testcase / todo / story / execution / bug 等旧页面兼容路径修正。
- 新增执行模块兼容测试，校验真实 legacy 路由、数组字段、按 ID 索引字段以及不支持入口的显式报错。

## 0.1.28 - 2026-06-15

### 修复

- 修复 `0.1.27` 发布包中未包含 `zentao skill` 的问题。
  - 根因：`skills/zentao-cli` 是符号链接，npm pack 不跟随，导致安装/更新时无法找到 skill。
  - 解决：新增 `scripts/copy-skills.mjs`，在 build 时将 `.agents/skills/zentao-cli` 复制为真实目录 `skills/zentao-cli`。

## 0.1.27 - 2026-06-15

### 新增

- **任务批量操作**：新增 8 个批量任务命令，覆盖禅道 18.5 任务列表页全部批量按钮：
  - `batchFinishTasks` / `batchCancelTasks` / `batchCloseTasks`：批量完成、取消、关闭任务
  - `batchChangeTaskBranch` / `batchChangeTaskModule` / `batchChangeTaskPlan`：批量切换分支、模块、计划
  - `batchAssignTasksTo`：批量指派任务
  - `batchActivateTasks`：批量激活任务
- **执行模块补全**：
  - `confirmStoryChange`：确认执行需求变更
  - `computeBurn`：重新计算燃尽图
- **构建模块补全**：
  - `notifyBug`：通知构建关联 Bug
  - `assignTo`：指派构建负责人
  - `linkStoriesToBuild` / `unlinkStoryFromBuild` / `batchUnlinkStoriesFromBuild`：构建关联/取消关联需求
  - `linkBugsToBuild` / `unlinkBugFromBuild` / `batchUnlinkBugsFromBuild`：构建关联/取消关联 Bug
- **计划模块补全**：
  - `startPlan` / `finishPlan` / `activatePlan` / `closePlan`：计划开始、完成、激活、关闭
- **发布模块补全**：
  - `changeReleaseStatus` / `notifyRelease` / `deleteRelease`：发布状态变更、通知、删除
  - `linkStoriesToRelease` / `unlinkStoryFromRelease` / `batchUnlinkStoriesFromRelease`：发布关联/取消关联需求
  - `linkBugsToRelease` / `unlinkBugFromRelease` / `batchUnlinkBugsFromRelease`：发布关联/取消关联 Bug
- **测试单模块补全**：
  - `startTestTask` / `activateTestTask` / `blockTestTask` / `closeTestTask` / `deleteTestTask`：测试单全生命周期操作
- **测试用例模块补全**：
  - `confirmTestCaseStoryChange` / `confirmTestCaseLibcaseChange` / `ignoreTestCaseLibcaseChange`：确认/忽略用例关联变更
  - `batchConfirmTestCaseStoryChange`：批量确认用例需求变更
- **任务工具补全**：
  - `editEstimate` / `deleteEstimate`：编辑/删除任务工时估算
  - `confirmStoryChange`：确认任务需求变更
  - `cancelTask`：取消任务
- **需求批量操作**：
  - `recallStory` / `submitStoryReview` / `processStoryChange`：需求撤回、提交评审、处理变更
  - `batchReviewStories` / `batchCloseStories`：批量评审、关闭需求
  - `batchChangeStoryModule` / `batchChangeStoryPlan` / `batchChangeStoryBranch` / `batchChangeStoryStage`：批量切换需求模块、计划、分支、阶段
  - `batchAssignStoriesTo`：批量指派需求
  - `linkStoriesToStory` / `unlinkStoryFromStory`：需求关联/取消关联子需求
- **Bug 批量操作**：
  - `batchChangeBugBranch` / `batchChangeBugModule` / `batchChangeBugPlan`：批量切换 Bug 分支、模块、计划
  - `batchAssignBugs` / `batchConfirmBugs` / `batchResolveBugs` / `batchCloseBugs` / `batchActivateBugs`：批量指派、确认、解决、关闭、激活 Bug
- **待办补全**：
  - `startTodo` / `closeTodo` / `assignTodo`：开始、关闭、指派待办
  - `importTodosToToday`：导入待办到今日
  - `batchFinishTodos` / `batchCloseTodos`：批量完成、关闭待办
- **Bug 工具补全**：
  - `confirmStoryChange`：确认 Bug 需求变更

### 测试

- 新增 8 个 task batch 操作的 tool-registry parse 测试，测试总数从 246 增至 254。
- 新增 execution、build、plan、release、testtask、testcase、todo 等模块的 API 单元测试。
- 新增批量操作（story-batch、bug-batch、todo-batch）的 tool-registry 完整命令清单测试。

## 0.1.26 - 2026-06-14

### 修复

- `zentao install` / `zentao update` / `zentao uninstall` 内部调用 `npx skills add/remove` 遇到 `ENOTEMPTY` 缓存残留时，自动清理 `~/.npm/_npx/` 下对应的 hash 目录并重试一次，避免安装/卸载 skill 因中断残留而失败。
- `cleanupGlobalPackageResidues` 预防性清理扩展到 npx 缓存目录，每次安装 skill 前主动扫描并删除 `~/.npm/_npx/*/node_modules/@cloudglab/` 和 `.zentao-cli-*` 残留。

## 0.1.25 - 2026-06-14

### 变更

- 重构 CLI 输出层：将 `src/cli.ts` 中的帮助、命令列表、`whoami` 格式化、`changelog` 渲染等显示逻辑抽离到新的 `src/core/cli-output.ts`，`cli.ts` 从 1033 行精简到 359 行，内置命令帮助集中维护。
- 统一通用工具函数：
  - 新增 `src/utils/date.ts`，集中管理日期解析（`YYYY-MM-DD` / 中文年月日 / 月日）、格式化、范围判断和加减运算。
  - 新增 `src/core/value.ts`，提供 `firstString` 和 `isRecord` 通用空值/类型判断。
  - 新增 `src/core/validation.ts`，提供 `requireNonBlank` 必填字符串校验。
  - 新增 `src/core/http-error.ts`，提供按 HTTP 状态码判断错误类型的工具。
- 抽象分页拉取：在 `src/core/pagination.ts` 新增 `fetchAllPages`，封装“先拉首页、再并发拉剩余页”的通用模式，简化 `statistics.ts` 等模块的全量读取代码。
- 多处 API 和工具层去重：`bug.ts`、`build.ts`、`comment.ts`、`execution.ts`、`relation.ts`、`search.ts`、`statistics.ts`、`story.ts`、`task.ts`、`testcase.ts`、`testtask.ts`、`todo.ts` 等模块复用新的日期、分页和校验工具，减少重复样板。
- 写操作参数统一使用 `optionalTrimmedText` schema：空白字符串会被视为 `undefined`，避免误传空值到禅道。

### 修复

- 修复 `src/api/resource-analysis.ts` 中仍通过 `normalizeOptionalPath` 中转调用日期工具的问题，改为直接使用 `normalizeOptionalText`。
- 修复内置命令 help 在某些别名场景下输出不一致的问题，`help --version` / `help -v` 现在统一走 `getBuiltinCommandHelp`。

### 测试

- 更新 `tests/cli.test.ts`：将重复的 help 场景测试合并为 `it.each` 参数化用例，并补充 `zentao --help` 聚焦常用命令的新断言。

## 0.1.24 - 2026-06-13

### Added

- 新增 `zentao changelog` 内置命令，支持 `--limit`、`--version`、`--since`、`--raw` 等选项查看 CHANGELOG。
- README 新增「版本要求」章节，明确禅道 **18.5** / 18.x 与 **Node.js >= 16.0.0** 的适配范围。
- 构建时静态 manifest 生成：`scripts/generate-manifest.ts` 扫描全部命令并生成 `src/core/command-groups.generated.ts` 与 `dist/manifest.json`；`cli.ts` 中 `help` / `list` / `--version` 直接走 manifest，真实命令按命令名懒加载对应 group。
- 命令级懒加载：`src/core/tool-registry.ts` 改为 `groupLoaders` 动态 import，`registerTools` 支持 `commandName` 选项，只加载目标命令所属 group，显著降低启动 import 开销。
- HTTP keep-alive：axios 实例启用 `http.Agent({ keepAlive: true })` 与 `https.Agent({ keepAlive: true })`。
- 分页并发拉取：新增 `fetchRemainingPagesConcurrently`，有 `total` 时按总页数并发剩余页（默认并发 3），无 `total` 时顺序拉取至空页停。
- `ZentaoHttpClient` 新增请求计数能力 `getRequestCount()` / `resetRequestCount()`，便于测试和运行时观测真实 HTTP 调用次数。
- 新增防回退指标测试：分页并发请求次数、命令懒加载 group 数量。

### Changed

- 每日更新探针去阻塞化：`runDailyUpdateProbe` 改为只读缓存、后台触发 `npm view`；安装/更新成功后调用 `writeUpdateCacheAfterInstall()` 同步写缓存。
- `zentao install` / `zentao update` 成功后写操作提示简化为「写操作默认已开启。写命令需要加 `--confirm` 才会真正执行。如需禁用写操作，设置 `ZENTAO_DISABLE_WRITE=true`。」

### Fixed

- `zentao update` 在 `npm install -g` 遇到 `ENOTEMPTY` 全局目录残留时，先自动清理再重试一次安装。

## 0.1.23 - 2026-06-13

### Fixed

- `zentao install` / `zentao update` 及 `npx update` 在 `npm install -g` 之前主动清理全局安装残留目录（上一次安装/更新中断留下的半更新状态目录），从根源避免 ENOTEMPTY 错误。此前只在失败后重试清理，现在改为每次安装前无条件做预防性清理。

## 0.1.22 - 2026-06-13

### Added

- 新增 `zentao uninstall` / `zentao remove` 主动卸载命令，支持 `--confirm true` 真实卸载、`--keep-config true` 保留配置、`--cli-only true` / `--skill-only true` 部分卸载；同时补充 `npx -y @cloudglab/zentao-cli@latest uninstall --confirm true` 用法。
- `zentao whoami` 优化为人性化菜单展示：根据时间给出问候语（早上好/中午好/下午好/傍晚好/深夜好/凌晨好），按 projects/products/sprints 参与范围计算等级（黑铁/青铜/白银/黄金/铂金/翡翠/钻石/王者），汇总任务/Bug 数量和状态分布，提供工作量和工作重心小分析。
- `zentao list` 改为分组展示（开始使用/我的工作/测试·构建·发布/任务·Bug·需求/执行·项目·产品·计划/评论·动态·统计·搜索/其他），`zentao list --raw` 保留原始字母序命令名输出。
- `zentao help` 精简：增加版本适配说明、运行时要求、常用命令分组和查看更多提示。

## 0.1.21 - 2026-06-12

### Fixed

- 修复 `zentao install` / `zentao update` 安装 skill 时进入 `skills` agent 选择交互界面后无法响应 Enter 的问题；现在统一调用 `skills add <source> --yes`，保持安装 / 更新流程非交互执行。
- 避免安装 skill 时传入 `--global` 触发 `PromptScript does not support global skill installation`，确保默认 skill 安装路径可正常完成。

## 0.1.20 - 2026-06-12

### Added

- `zentao install` / `zentao update` 成功后新增 `zentao-cli` ASCII banner、快速开始命令和写操作提示，便于安装后直接确认下一步用法。
- 安装 / 更新执行 `npm install -g` 遇到 `ENOTEMPTY` 全局目录残留时，会输出可复制的清理和重装命令。

### Fixed

- 构建后自动修正 `dist/bin/*.js` 可执行权限，避免 npm 全局安装后 `zentao` / `zentao-cli` 因 bin 文件无执行权限而无法启动。

## 0.1.19 - 2026-06-12

### Added

- `getExecutionBugs` 新增 `--search`、`--module` 和 `--moduleId` 参数，支持在明确查询某个执行 / 迭代 Bug 时按关键词、模块名、模块别名或模块 ID 做客户端过滤。
- 新增共享 Bug 过滤逻辑，产品 Bug 与执行 Bug 均支持中文模块首字母别名匹配，例如 `云镜` 可用 `yj`。
- 测试覆盖补充执行 Bug 模块过滤、线上问题来源分流提示、CLI 参数解析、更新探针和安装配置链路。

### Changed

- 线上 / 生产 / 客户反馈问题的文档与工具提示统一为“先判断来源”：市场 / 售后 / 客户反馈查 `市场和售后问题跟踪`，测试 / 开发自发现查 `测试`，再按模块过滤真实业务产品。
- Bug 写操作补齐禅道 18.5 兼容处理，更新 Bug 改为走旧版编辑表单以保留必要字段，其他 Bug 流转会统一清理空白输入。
- 普通命令的每日更新探针与安装 / 更新配置流程继续收敛，只提示更新命令，不在查询时自动改动本机环境。

## 0.1.18 - 2026-06-11

### Added

- 新增 `getReleaseDetail`，支持按发布 ID 查询发布详情，补齐项目发布列表后的详情查询链路。
- 新增 `analyzeBugResources` 和 `analyzeTaskResources`，可从 Bug / 任务详情中解析附件和资源线索，下载到本地临时目录，并对小文本、图片、压缩包和二进制资源给出分析路由。
- 新增 `okBug`，通过旧版 `bug-ok-{id}.json` 控制器支持 Bug 验证通过动作。

### Changed

- `startTask` 针对禅道 18.5 REST start 行为异常增加状态和负责人恢复逻辑，避免开始任务后被错误置为完成。
- `resolveBug` 支持 `tostory` 解决方案，覆盖转需求场景。
- 发布前查询回归脚本补充 `okBug` 命令面检查。
- 每日更新探针改为只提示更新命令，不再在普通查询命令里自动执行安装；同时补齐 `legacyBaseUrl` 的配置录入链路。

## 0.1.17 - 2026-06-11

### Added

- `getProductBugs` 新增 `--search`、`--module` 和 `--moduleId` 参数，支持按关键词、模块别名或模块 ID 查询产品 Bug。
- 线上 / 生产 / 客户反馈 Bug 场景支持按来源分流：市场 / 售后 / 客户反馈来源查 `市场和售后问题跟踪`，测试 / 开发自发现来源查 `测试`，再通过模块匹配真实业务产品；模块别名大小写不敏感，常见中文模块支持首字母缩写，例如 `云镜` 可用 `yj`。

### Fixed

- 修复禅道 REST v1 忽略产品 Bug 列表 `query/moduleId` 参数时，CLI 无法按关键词或模块准确过滤的问题；现在会在需要过滤时全量分页拉取后做客户端过滤、排序和分页。

## 0.1.16 - 2026-06-10

### Added

- 新增每日更新探针：每天首次执行普通 `zentao` 命令时检查 npm 最新版本，发现新版本后提示并自动执行 `zentao update --skip-config-check`。
- 新增 GitHub Pages 极简命令速查页，提供安装、更新、角色入口、常用查询和环境变量命令的一键复制入口。
- 新增 Pages 发布工作流，推送 `main` 后自动部署 `docs/` 静态页面。

### Changed

- 命令速查页改为黑白线条风格，并在桌面端使用 hover/focus 显示复制动作，移动端保持复制按钮可见。
- 命令速查页新增本地 Wiki / 检索入口，可按关键词过滤本页维护的命令清单。

## 0.1.15 - 2026-06-10

### Added

- 新增命令级帮助：支持 `zentao help <command>` 与 `zentao <command> --help`，输出参数类型、必填/可选和字段说明。
- 新增发布前查询回归脚本 `pnpm release:smoke-query`，先检查全部 CLI 命令的 `help` / schema 入口，再用执行 `2140` 及其关联固定数据覆盖主要真实查询命令。
- Skill 新增 `reference/commands.md` 查询命令速查，覆盖全部查询入口、URL 映射和常用组合。

### Changed

- `/release` 项目命令和维护说明加入本地查询回归步骤，避免发布前只跑单元测试而遗漏真实 CLI 查询场景。
- Skill 增加命令选择强制规则：参数不确定时优先运行 `zentao help <command>`，避免凭印象猜参数。

## 0.1.14 - 2026-06-10

### Added

- README 增加图标与封面图资源，并补充标准 REST API 之外的页面 JSON、动作记录和前端请求模拟扩展场景说明。
- 新增 `ZENTAO_LEGACY_BASE_URL` 配置项，支持非标准部署路径下的旧版页面 JSON 请求。

### Changed

- CLI 参数解析支持 `--key=value` 写法，并对未知参数直接报错，避免拼写错误被静默忽略。
- tag 发布工作流改为执行完整 `pnpm check`，并将 `contents` 权限收敛为只读；GitHub Release 仍只由 `/release` 流程手动创建。
- 任务全量拉取在旧快捷方式返回不完整时会回退标准分页扫描；批量分页读取统一限制最大页数，避免异常 `total` 导致过量请求。
- Skill 执行参考文档泛化迭代名称示例，避免出现具体内部迭代名。

### Fixed

- 修复服务端将分页元信息返回为字符串数字时统计不准确的问题。
- 修复旧版页面请求 token 过期后不会自动重试的问题。

## 0.1.13 - 2026-06-08

### Added

- 新增项目级 `/release` 命令模板，固定发布顺序：检查状态、更新文档、提升版本、验证、提交、打 tag、推送、手动创建 GitHub Release、检查 Actions 和 npm。

### Changed

- GitHub Actions 发布链路只负责 tag push 后校验、构建和发布 npm；GitHub Release 统一由 `/release` 命令手动创建，避免多个来源同时创建 Release。

## 0.1.12 - 2026-06-08

### Added

- 新增 Task 状态流转与删除工具：`startTask`、`pauseTask`、`restartTask`、`closeTask`、`activateTask`、`assignTask`、`deleteTask`。
- 新增 Bug 写操作工具：`createBug`、`updateBug`、`assignBug`、`confirmBug`、`closeBug`、`activateBug`、`deleteBug`。
- 新增 Story 写操作工具：`createStory`、`closeStory`、`assignStory`、`activateStory`、`reviewStory`。
- 新增 Todo 完整能力：`getMyTodos`、`getTodoDetail`、`createTodo`、`updateTodo`、`deleteTodo`、`finishTodo`、`activateTodo`。

### Changed

- `addComment` 改为通过旧版 `action-comment-{type}-{id}.json` 控制器写入备注，适配禅道 18.5 REST v1 无独立 comment entry 的限制。
- `updateExecution` 和 `updateTestTask` 改为通过旧版编辑控制器提交表单，绕过禅道 18.5 REST v1 对应入口缺失或字段拼接问题。
- `updateTask` 补充 `type`、`desc`、`estStarted`、`module`、`story`、`status`、`closedReason`、`mailto` 等字段，并移除 REST PUT 不支持的 `comment` 字段。

## 0.1.11 - 2026-06-08

### Fixed

- 修复旧配置中 `apiVersion: legacy` 会在安装校验时继续沿用旧接口的问题；旧值和空值现在统一归一化为 `v1`。

## 0.1.10 - 2026-06-08

### Added

- `zentao update` 新增 `--skip-config-check`，支持只更新 CLI / skill 时跳过禅道登录校验。
- `zentao update` 新增 `--cli-only` 和 `--skill-only`，支持分开更新 CLI 或 skill。
- 文档新增 `npx -y @cloudglab/zentao-cli@latest update` 自举更新方式，避免本机旧版 update 行为异常时无法升级。

### Changed

- 默认 skill 更新链路改为从全局已安装的最新 `@cloudglab/zentao-cli` 包内读取 `skills/zentao-cli`，确保 `zentao update` 安装的是新版本 skill，而不是旧进程所在包内的旧 skill。

## 0.1.9 - 2026-06-08

### Added

- 新增 `zentao whoami`、`zentao who-am-i` 和 `zentao who am i`，用于查看当前登录用户信息。
- `zentao install` / `zentao update` 配置校验通过后会明确说明写操作状态：默认支持写，真实写入仍需 `confirm=true`，可用 `ZENTAO_DISABLE_WRITE=true` 禁用。

### Changed

- `zentao install` / `zentao update` 默认从 CLI 包内自带的 `skills/zentao-cli` 安装 skill；保留 `--skill-source git` 和 `--skill-source npm` 作为显式兜底。
- 禅道地址输入会自动提取协议、域名/IP 和端口，支持从完整页面 URL 中提取根地址。
- 写操作默认支持真实写入能力，仍保留 `confirm=true` 防误操作；显式禁用改为 `ZENTAO_DISABLE_WRITE=true`。
- README、skill 和安装参考文档同步安装链路、whoami、URL 处理、默认写状态和已拆分任务调整链路。

### Fixed

- 修复禅道旧 PHP 警告 HTML 混入 JSON 响应时的解析失败问题，可从警告文本中提取完整 JSON。

## 0.1.8 - 2026-06-07

### Fixed

- 同步 `src/version.ts` 的 CLI 运行时版本号，确保 `zentao --version` 输出与 npm 包版本一致。

## 0.1.7 - 2026-06-07

### Added

- README 和 skill 文档新增“场景命中链路”规则，按用户表达路由到 Bug、任务、需求、项目/执行、排期和父子任务场景。
- 补充拆任务/排任务默认链路：确认 `executionId` 和排期限制、查询父任务、必要时创建父任务、创建子任务并汇总。

## 0.1.6 - 2026-06-06

### Fixed

- 修正 `zentao install` / `zentao update` 的 skill 安装源，默认使用 `cloudglab/zentao-cli` GitHub 仓库源，避免把 npm 包名误解析为错误仓库地址。

### Added

- 新增 `--skill-source npm` 安装模式：在不能访问远程 `.git` 仓库但可以访问 npm 的环境中，自动下载 `@cloudglab/zentao-cli` 静态包、解压并通过本地路径安装 skill。
- 新增 `--skill-local-path` 参数，支持直接从已解压的本地 skill 包目录安装。
- 新增安装流程测试，覆盖默认 GitHub 源和 npm 静态包本地路径安装流程。

### Changed

- README、skill 文档和安装参考文档补充 GitHub 源、npm 静态包、本地路径三种 skill 安装方式。

## 0.1.5 - 2026-06-06

### Fixed

- 修正 skill 安装源：默认使用 `cloudglab/zentao-cli` GitHub 仓库源；不能访问远程 `.git` 仓库时，支持通过 npm 静态包解压后的本地路径安装 skill。

### Added

- 新增 `zentao install` / `zentao update` 内置命令，一键安装或更新 CLI 与 skill，并校验禅道配置。
- 新增 `getExecutionDynamic`，支持按执行 ID 近似读取执行动态摘要。
- 新增 `getExecutionDailyBugStats`，输出迭代每日 Bug、任务、参与人员和问题明细统计报告。
- 新增 `getMyWeeklyActivity`，支持上周、本周、最近 N 天、单日和自定义日期范围的个人阶段性工作清单。
- 新增 Vitest 测试体系、覆盖率配置和 lefthook pre-commit 检查入口。
- 新增核心函数、API 封装、工具注册、配置、认证和 HTTP 客户端测试。

### Changed

- `getMyTasks` 改为尽量拉取完整任务列表后在客户端按状态和分页过滤，以适配部分禅道部署忽略查询参数的问题。
- QA 角色新增任务相关命令入口。
- npm 发布文件列表加入 `skills` 目录，确保 skill 随包发布。
- README、skill 和 reference 文档同步到新增安装、动态和统计能力。

## 0.1.4 - 2026-06-05

### Changed

- 触发一次真实的 npm trusted publishing 自动发布验证。

## 0.1.3 - 2026-06-05

### Fixed

- 修复构建前未清理 `dist` 导致 npm 包可能混入旧 MCP 产物的问题；构建现会先清空 `dist` 再重新编译。

## 0.1.2 - 2026-06-05

### Changed

- 为 npm trusted publishing 补齐 `package.json.repository.url`，明确绑定到 `https://github.com/cloudglab/zentao-cli.git`。
- 版本提升到 `0.1.2`，用于重新触发自动发布链路。

## 0.1.1 - 2026-06-05

### Changed

- 发布工作流切换为 npm trusted publishing，去掉 `NPM_TOKEN` 发布依赖。
- GitHub Actions 发布环境升级为 Node.js 24，以满足 npm OIDC trusted publishing 运行要求。

## 0.1.0 - 2026-06-05

### Added

- 新增更稳的认证错误分类：区分账号密码错误、接口不存在、服务端异常、网络错误、响应异常。
- 新增 `ZENTAO_API_BASE_URL` 配置，支持非标准禅道 API 部署路径。
- 新增 `initZentao --save` 显式落盘控制，默认仅校验当前会话配置。
- 新增线上 Bug 查询强制判断与默认口径文档：`市场和售后问题跟踪` + 模块匹配。
- 新增 `getMyBugs` / `getMyBugStatistics` 默认跨产品查询能力，`productId` 改为可选收窄条件。
- 新增 GitHub Actions 发布链路：push `v*` tag 后自动校验、构建、发布 npm、创建 GitHub Release。
- 新增纯 CLI 运行层：`zentao help`、`zentao list`、`zentao --version`。

### Changed

- 包名统一为 `@cloudglab/zentao-cli`，本地命令统一为 `zentao`。
- skill 安装方式统一为 `npx skills add @cloudglab/zentao-cli -g`。
- 运行架构从 MCP server 切换为本地 CLI 命令执行链路。
- 发布产物运行时目标下调为 `Node.js >= 16`。
- TypeScript 构建目标下调为 `ES2020`，并移除运行时 `@modelcontextprotocol/sdk` 依赖。
- README、skill、reference 文档整体同步到“本地 `zentao` + skill 调用”口径。

### Fixed

- 修复 token 获取失败时对所有错误都盲目回退 MD5 的问题，仅在明确鉴权失败时回退。
- 修复固定 API 路径导致部分实例无法登录的问题。
- 修复默认将敏感配置落盘的问题，改为显式保存才写入本地。

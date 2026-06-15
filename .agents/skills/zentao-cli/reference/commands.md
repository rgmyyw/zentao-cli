# 查询命令速查

## 使用规则

- 先按用户场景选命令，再用 `zentao help <command>` 校对参数。
- 参数名以 `zentao help <command>` 输出为准；不要猜 `id`、`execution`、`project` 这类相似参数。
- 查询命令不需要 `confirm=true`；写操作必须显式传 `--confirm true`。
- 如果命令返回 `未知参数`，立即运行 `zentao help <command>` 修正命令。
- 本机没有 `zentao` 时，用 `npx -y @cloudglab/zentao-cli@latest <command> ...`。

## 通用入口

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 查看全部命令 | `list` | `zentao list` | 只列命令名，用于确认命令是否存在。 |
| 查看总帮助 | `help` | `zentao help` | 查看 CLI 总体用法和可用命令。 |
| 查看单命令帮助 | `help <command>` | `zentao help getExecutionDetail` | 查看参数名、类型、必填/可选。 |
| 当前版本 | `version` | `zentao version` / `zentao --version` | 发布后确认本机 CLI 版本。 |
| 初始化配置 | `initZentao` | `zentao initZentao --url <url> --username <account> --password <password>` | 校验并初始化当前进程配置；需要落盘时看 `zentao help initZentao`。 |

## 用户与个人数据

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 当前登录人 | `whoami` | `zentao whoami` | 返回当前账号资料。 |
| 当前登录人 | `who-am-i` | `zentao who-am-i` | `whoami` 的别名。 |
| 当前登录人 | `getMyProfile` | `zentao getMyProfile` | 与 `whoami` 等价。 |
| 我的任务 | `getMyTasks` | `zentao getMyTasks --status all --limit 20` | `status` 支持 `wait/doing/done/cancel/closed/all`。 |
| 任务详情 | `getTaskDetail` | `zentao getTaskDetail --taskId <taskId>` | 查单个任务、父任务、来源 Bug、动作记录。 |
| 登记任务工时 | `recordTaskEstimate` | `zentao recordTaskEstimate --taskId <taskId> --date <YYYY-MM-DD> --consumed 2 --left 8 --work <work> --confirm true` | 按 18.5 `task/recordEstimate` 链路登记工时。 |
| 编辑任务工时 | `editTaskEstimate` | `zentao editTaskEstimate --estimateId <effortId> --date <YYYY-MM-DD> --consumed 2 --left 8 --work <work> --confirm true` | 按 18.5 `task/editEstimate` 页面修改工时记录。 |
| 删除任务工时 | `deleteTaskEstimate` | `zentao deleteTaskEstimate --estimateId <effortId> --confirm true` | 按 18.5 `task/deleteEstimate` 链路删除工时记录。 |
| 确认需求变更 | `confirmTaskStoryChange` | `zentao confirmTaskStoryChange --taskId <taskId> --confirm true` | 对齐任务详情页确认关联需求变更按钮。 |
| 我的 Bug | `getMyBugs` | `zentao getMyBugs --limit 20` | 不传 `productId` 时查跨产品指派给我的 Bug。 |
| 我的 Todo | `getMyTodos` | `zentao getMyTodos` | 查当前账号待办。 |
| Todo 详情 | `getTodoDetail` | `zentao getTodoDetail --todoId <todoId>` | 需要先从 `getMyTodos` 取 ID。 |
| 启动待办 | `startTodo` | `zentao startTodo --todoId <todoId> --confirm true` | 按 18.5 待办详情页启动按钮。 |
| 关闭待办 | `closeTodo` | `zentao closeTodo --todoId <todoId> --confirm true` | 按 18.5 待办详情页关闭按钮。 |
| 分配待办 | `assignTodo` | `zentao assignTodo --todoId <todoId> --assignedTo <account> --confirm true` | 按 18.5 待办详情页分配按钮。 |
| 批量结束待办 | `batchFinishTodos` | `zentao batchFinishTodos --todoIds <id1> --todoIds <id2> --confirm true` | 按 18.5 待办列表页批量结束表单。 |
| 批量关闭待办 | `batchCloseTodos` | `zentao batchCloseTodos --todoIds <id1> --todoIds <id2> --confirm true` | 按 18.5 待办列表页批量关闭表单。 |
| 激活待办 | `activateTodo` | `zentao activateTodo --todoId <todoId> --confirm true` | 按 18.5 待办详情页激活按钮。 |
| 结束待办 | `finishTodo` | `zentao finishTodo --todoId <todoId> --confirm true` | 按 18.5 待办详情页结束按钮。 |
| 删除待办 | `deleteTodo` | `zentao deleteTodo --todoId <todoId> --confirm true` | 按 18.5 待办详情页删除按钮。 |
| 批量结束待办 | `batchFinishTodos` | `zentao batchFinishTodos --todoIds <id1> --todoIds <id2> --confirm true` | 按 18.5 待办列表批量结束按钮。 |
| 批量关闭待办 | `batchCloseTodos` | `zentao batchCloseTodos --todoIds <id1> --todoIds <id2> --confirm true` | 按 18.5 待办列表批量关闭按钮。 |
| 导入到今天 | `importTodosToToday` | `zentao importTodosToToday --todoIds <id1> --todoIds <id2> --date 2026-06-15 --confirm true` | 按 18.5 待办列表导入今天按钮。 |

## 统计与动态

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 我的任务统计 | `getMyTaskStatistics` | `zentao getMyTaskStatistics` | 统计当前账号任务状态分布。 |
| 我的 Bug 统计 | `getMyBugStatistics` | `zentao getMyBugStatistics` | 统计当前账号 Bug 状态分布。 |
| 产品内我的 Bug 统计 | `getMyBugStatistics` | `zentao getMyBugStatistics --productId <productId>` | 收窄到指定产品。 |
| 周活动 / 工作清单 | `getMyWeeklyActivity` | `zentao getMyWeeklyActivity --account <account> --week this` | 查解决 Bug、关闭 Bug、评论、指派、任务动作。 |
| 自然语言日期活动 | `getMyWeeklyActivity` | `zentao getMyWeeklyActivity --account <account> --dateRange 最近3天` | 支持 `上周/本周/今天/昨天/最近3天/YYYY-MM-DD/日期到日期`。 |

## 产品、项目、项目集

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 产品列表 | `getProducts` | `zentao getProducts` | 查可见产品，用于确认 `productId`。 |
| 产品详情 | `getProductDetail` | `zentao getProductDetail --productId <productId>` | 查产品负责人、项目数、需求/Bug/用例统计。 |
| 项目列表 | `getProjects` | `zentao getProjects --limit 20` | 查可见项目，用于确认 `projectId`。 |
| 项目详情 | `getProjectDetail` | `zentao getProjectDetail --projectId <projectId>` | 查项目状态、父级、项目负责人。 |
| 项目集列表 | `getPrograms` | `zentao getPrograms --order id_desc` | 查项目集 / 项目群。 |
| 项目集详情 | `getProgramDetail` | `zentao getProgramDetail --programId <programId>` | 查项目集详情。 |

## 执行 / 迭代

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 执行详情 | `getExecutionDetail` | `zentao getExecutionDetail --executionId <executionId>` | 查迭代基本信息、项目、成员、进度。 |
| 项目下执行 | `getProjectExecutions` | `zentao getProjectExecutions --projectId <projectId>` | 查某项目有哪些执行 / 迭代。 |
| 执行动态 | `getExecutionDynamic` | `zentao getExecutionDynamic --executionId <executionId>` | 近似读取执行动态摘要。 |
| 执行 Bug | `getExecutionBugs` | `zentao getExecutionBugs --executionId <executionId> --limit 100` | 查迭代下 Bug；可加 `--status`。 |
| 执行构建 | `getExecutionBuilds` | `zentao getExecutionBuilds --executionId <executionId>` | 查迭代关联构建。 |
| 每日迭代统计 | `getExecutionDailyBugStats` | `zentao getExecutionDailyBugStats --executionId <executionId> --iterationName <name>` | 输出 Bug、任务、参与人员和风险明细报告。 |

不要用 `getDevelopmentContext --executionId ...` 查执行；`getDevelopmentContext` 只支持 `story/bug`。

## Bug

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| Bug 详情 | `getBugDetail` | `zentao getBugDetail --bugId <bugId>` | 查复现步骤、状态、负责人、动作记录、转任务。 |
| 线上 Bug（市场/售后/客户反馈） | `getProductBugs` | `zentao getProductBugs --productId <市场和售后问题跟踪产品ID> --status all --limit 100 --order id_desc --module <模块别名>` | 非测试 / 非开发发现的线上 / 生产 / 客户反馈问题默认走这里；先 `getProducts` 找到 `市场和售后问题跟踪`。 |
| 线上 Bug（测试/开发自发现） | `getProductBugs` | `zentao getProductBugs --productId <测试产品ID> --status all --limit 100 --order id_desc --module <模块别名>` | 明确是测试或开发在线上发现并记录在测试相关模块下的问题走这里；先 `getProducts` 找到 `测试`，再按模块过滤，例如 `云镜` / `yj`。 |
| 产品 Bug | `getProductBugs` | `zentao getProductBugs --productId <productId> --status all --limit 100` | 仅在用户明确说“查某个禅道产品下的 Bug”时使用。 |
| 我的 Bug | `getMyBugs` | `zentao getMyBugs --productId <productId> --limit 50` | 产品内指派给我的 Bug。 |
| Bug 关联需求 | `getBugRelatedStory` | `zentao getBugRelatedStory --bugId <bugId>` | 从 Bug 查关联需求。 |
| 确认 Bug 关联需求变更 | `confirmBugStoryChange` | `zentao confirmBugStoryChange --bugId <bugId> --confirm true` | 按 18.5 Bug 详情页确认按钮同步最新需求版本。 |
| 批量修改 Bug 分支 | `batchChangeBugBranch` | `zentao batchChangeBugBranch --bugIds <id1> --bugIds <id2> --branchId <branchId> --confirm true` | 按 18.5 `bug/batchChangeBranch` 页面批量修改所属分支。 |
| 批量修改 Bug 模块 | `batchChangeBugModule` | `zentao batchChangeBugModule --bugIds <id1> --bugIds <id2> --moduleId <moduleId> --confirm true` | 按 18.5 `bug/batchChangeModule` 页面批量修改所属模块。 |
| 批量修改 Bug 计划 | `batchChangeBugPlan` | `zentao batchChangeBugPlan --bugIds <id1> --bugIds <id2> --planId <planId> --confirm true` | 按 18.5 `bug/batchChangePlan` 页面批量修改所属计划。 |
| 批量指派 Bug | `batchAssignBugs` | `zentao batchAssignBugs --bugIds <id1> --bugIds <id2> --objectId <id> --type execution --assignedTo <account> --confirm true` | 按 18.5 `bug/batchAssignTo` 页面批量指派。 |
| 批量确认 Bug | `batchConfirmBugs` | `zentao batchConfirmBugs --bugIds <id1> --bugIds <id2> --confirm true` | 按 18.5 `bug/batchConfirm` 页面批量确认。 |
| 批量解决 Bug | `batchResolveBugs` | `zentao batchResolveBugs --bugIds <id1> --bugIds <id2> --resolution fixed --resolvedBuild trunk --confirm true` | 按 18.5 `bug/batchResolve` 页面批量解决。 |
| 批量关闭 Bug | `batchCloseBugs` | `zentao batchCloseBugs --bugIds <id1> --bugIds <id2> --confirm true` | 按 18.5 `bug/batchClose` 页面批量关闭。 |
| 批量激活 Bug | `batchActivateBugs` | `zentao batchActivateBugs --productId <productId> --bugIds <id1> --bugIds <id2> --confirm true` | 按 18.5 `bug/batchActivate` 页面批量激活。 |

线上 / 生产 / 客户反馈问题不要直接按真实业务产品名查产品；先按 `reference/bug.md` 判断来源：市场 / 售后 / 客户反馈查 `市场和售后问题跟踪`，测试 / 开发自发现查 `测试`，再按模块匹配真实业务产品。

## 需求 / Story

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 需求详情 | `getStoryDetail` | `zentao getStoryDetail --storyId <storyId>` | 查需求标题、状态、评审、用例等。 |
| 产品需求 | `getProductStories` | `zentao getProductStories --productId <productId> --limit 50` | 查某产品需求列表。 |
| 关键词搜需求 | `searchStories` | `zentao searchStories --keyword <keyword> --productId <productId>` | 指定产品内搜索需求。 |
| 按产品名搜需求 | `searchStoriesByProductName` | `zentao searchStoriesByProductName --productName <name> --keyword <keyword>` | 不知道产品 ID 时使用。 |
| 需求关联 Bug | `getStoryRelatedBugs` | `zentao getStoryRelatedBugs --storyId <storyId> --productId <productId>` | 查需求关联 Bug；`productId` 用于兜底过滤。 |
| 需求关联需求 | `linkStoriesToStory` | `zentao linkStoriesToStory --storyId <storyId> --storyIds <id1> --storyIds <id2> --confirm true` | 按 18.5 `story/linkStory` 页面把相关需求关联到当前需求。 |
| 需求移除相关需求 | `unlinkStoryFromStory` | `zentao unlinkStoryFromStory --storyId <storyId> --linkedStoryId <linkedStoryId> --confirm true` | 按 18.5 `story/linkStory&type=remove` 链路移除相关需求。 |
| 批量修改需求模块 | `batchChangeStoryModule` | `zentao batchChangeStoryModule --storyIds <id1> --storyIds <id2> --moduleId <moduleId> --confirm true` | 按 18.5 `story/batchChangeModule` 页面批量修改所属模块。 |
| 批量修改需求计划 | `batchChangeStoryPlan` | `zentao batchChangeStoryPlan --storyIds <id1> --storyIds <id2> --planId <planId> --confirm true` | 按 18.5 `story/batchChangePlan` 页面批量修改所属计划。 |
| 批量修改需求分支 | `batchChangeStoryBranch` | `zentao batchChangeStoryBranch --storyIds <id1> --storyIds <id2> --branchId <branchId> --confirmBranch yes --confirm true` | 按 18.5 `story/batchChangeBranch` 页面批量修改所属分支。 |
| 批量修改需求阶段 | `batchChangeStoryStage` | `zentao batchChangeStoryStage --storyIds <id1> --storyIds <id2> --stage <stage> --confirm true` | 按 18.5 `story/batchChangeStage` 页面批量修改阶段。 |
| 批量指派需求 | `batchAssignStoriesTo` | `zentao batchAssignStoriesTo --storyIds <id1> --storyIds <id2> --assignedTo <account> --confirm true` | 按 18.5 `story/batchAssignTo` 页面批量指派。 |
| 撤回需求评审 | `recallStory` | `zentao recallStory --storyId <storyId> --confirm true` | 按 18.5 `story/recall` 页面撤回评审中或已评审需求。 |
| 提交需求评审 | `submitStoryReview` | `zentao submitStoryReview --storyId <storyId> --confirm true` | 按 18.5 `story/submitReview` 页面提交需求评审。 |
| 确认需求变更 | `processStoryChange` | `zentao processStoryChange --storyId <storyId> --result yes --confirm true` | 按 18.5 `story/processStoryChange` 页面确认/忽略需求变更。 |
| 批量评审需求 | `batchReviewStories` | `zentao batchReviewStories --storyIds <id1> --storyIds <id2> --result pass --reason <reason> --confirm true` | 按 18.5 `story/batchReview` 页面批量评审需求。 |
| 批量关闭需求 | `batchCloseStories` | `zentao batchCloseStories --productId <productId> --storyIds <id1> --storyIds <id2> --closedReasons done --comments note --confirm true` | 按 18.5 `story/batchClose` 页面批量关闭需求。 |
| 开发上下文：需求 | `getDevelopmentContext` | `zentao getDevelopmentContext --entityType story --entityId <storyId> --productId <productId>` | 聚合需求、关联 Bug、测试用例。 |
| 开发上下文：Bug | `getDevelopmentContext` | `zentao getDevelopmentContext --entityType bug --entityId <bugId>` | 聚合 Bug 和关联需求。 |

## 任务写入

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 登记任务工时 | `recordTaskEstimate` | `zentao recordTaskEstimate --taskId <taskId> --date <YYYY-MM-DD> --consumed 2 --left 8 --work <work> --confirm true` | 按 18.5 任务工时登记页面写入工时。 |
| 编辑任务工时 | `editTaskEstimate` | `zentao editTaskEstimate --estimateId <effortId> --date <YYYY-MM-DD> --consumed 2 --left 8 --work <work> --confirm true` | 按 18.5 `task/editEstimate` 页面编辑工时记录。 |
| 删除任务工时 | `deleteTaskEstimate` | `zentao deleteTaskEstimate --estimateId <effortId> --confirm true` | 按 18.5 `task/deleteEstimate` 链路删除工时记录。 |
| 取消任务 | `cancelTask` | `zentao cancelTask --taskId <taskId> --comment <comment> --confirm true` | 按 18.5 `task/cancel` 页面取消任务。 |
| 确认任务需求变更 | `confirmTaskStoryChange` | `zentao confirmTaskStoryChange --taskId <taskId> --confirm true` | 按 18.5 任务详情页确认关联需求版本变更。 |

## 计划、构建、发布

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 产品计划 | `getProductPlans` | `zentao getProductPlans --productId <productId> --order id_desc` | 查产品计划列表。 |
| 计划详情 | `getPlanDetail` | `zentao getPlanDetail --planId <planId>` | 查计划详情、关联需求/Bug 统计。 |
| 启动计划 | `startPlan` | `zentao startPlan --planId <planId> --confirm true` | 按 18.5 页面按钮启动计划。 |
| 完成计划 | `finishPlan` | `zentao finishPlan --planId <planId> --confirm true` | 按 18.5 页面按钮完成计划。 |
| 激活计划 | `activatePlan` | `zentao activatePlan --planId <planId> --confirm true` | 按 18.5 页面按钮重新激活计划。 |
| 关闭计划 | `closePlan` | `zentao closePlan --planId <planId> --closedReason done --confirm true` | 按 18.5 页面表单关闭计划。 |
| 项目构建 | `getProjectBuilds` | `zentao getProjectBuilds --projectId <projectId>` | 查项目下构建。 |
| 构建详情 | `getBuildDetail` | `zentao getBuildDetail --buildId <buildId>` | 查构建关联 Bug / 需求。 |
| 关联构建需求 | `linkStoriesToBuild` | `zentao linkStoriesToBuild --buildId <id> --storyIds <storyId> --confirm true` | 按 18.5 `build/linkStory` 页面把需求关联到构建。 |
| 移除构建需求 | `unlinkStoryFromBuild` | `zentao unlinkStoryFromBuild --buildId <id> --storyId <storyId> --confirm true` | 按 18.5 `build/unlinkStory` 页面移除构建需求。 |
| 批量移除构建需求 | `batchUnlinkStoriesFromBuild` | `zentao batchUnlinkStoriesFromBuild --buildId <id> --storyIds <storyId> --confirm true` | 按 18.5 构建详情页批量移除需求。 |
| 关联构建 Bug | `linkBugsToBuild` | `zentao linkBugsToBuild --buildId <id> --bugIds <bugId> --confirm true` | 按 18.5 `build/linkBug` 页面把 Bug 关联到构建。 |
| 移除构建 Bug | `unlinkBugFromBuild` | `zentao unlinkBugFromBuild --buildId <id> --bugId <bugId> --confirm true` | 按 18.5 `build/unlinkBug` 页面移除构建 Bug。 |
| 批量移除构建 Bug | `batchUnlinkBugsFromBuild` | `zentao batchUnlinkBugsFromBuild --buildId <id> --bugIds <bugId> --confirm true` | 按 18.5 构建详情页批量移除 Bug。 |
| 项目发布 | `getProjectReleases` | `zentao getProjectReleases --projectId <projectId>` | 查项目发布列表；当前账号无权限时可能 403。 |
| 发布详情 | `getReleaseDetail` | `zentao getReleaseDetail --releaseId <releaseId>` | 查单个发布详情、关联需求和 Bug。 |
| 发布切状态 | `changeReleaseStatus` | `zentao changeReleaseStatus --releaseId <releaseId> --status terminate --confirm true` | 按 18.5 页面按钮切换 `normal/terminate`。 |
| 发布通知 | `notifyRelease` | `zentao notifyRelease --releaseId <releaseId> --notify FB --notify BETA --confirm true` | 按 18.5 页面通知表单发送发布通知。 |
| 删除发布 | `deleteRelease` | `zentao deleteRelease --releaseId <releaseId> --confirm true` | 按 18.5 页面删除发布。 |
| 发布关联需求 | `linkStoriesToRelease` | `zentao linkStoriesToRelease --releaseId <releaseId> --storyIds <id1> --storyIds <id2> --confirm true` | 按 18.5 页面把需求关联到发布。 |
| 发布移除需求 | `unlinkStoryFromRelease` | `zentao unlinkStoryFromRelease --releaseId <releaseId> --storyId <storyId> --confirm true` | 从发布中移除单个需求。 |
| 发布批量移除需求 | `batchUnlinkStoriesFromRelease` | `zentao batchUnlinkStoriesFromRelease --releaseId <releaseId> --storyIds <id1> --storyIds <id2> --confirm true` | 从发布中批量移除需求。 |
| 发布关联 Bug | `linkBugsToRelease` | `zentao linkBugsToRelease --releaseId <releaseId> --bugIds <id1> --bugIds <id2> --type bug --confirm true` | 按 18.5 页面把 Bug 或遗留 Bug 关联到发布。 |
| 发布移除 Bug | `unlinkBugFromRelease` | `zentao unlinkBugFromRelease --releaseId <releaseId> --bugId <bugId> --type bug --confirm true` | 从发布中移除单个 Bug。 |
| 发布批量移除 Bug | `batchUnlinkBugsFromRelease` | `zentao batchUnlinkBugsFromRelease --releaseId <releaseId> --bugIds <id1> --bugIds <id2> --type bug --confirm true` | 从发布中批量移除 Bug。 |

## 测试

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 产品测试用例 | `getProductTestCases` | `zentao getProductTestCases --productId <productId> --limit 50` | 查产品下测试用例；可加 `--status`、`--moduleId`。 |
| 测试用例详情 | `getTestCaseDetail` | `zentao getTestCaseDetail --testCaseId <testCaseId>` | 查单条测试用例详情。 |
| 确认测试用例需求变更 | `confirmTestCaseStoryChange` | `zentao confirmTestCaseStoryChange --caseId <caseId> --confirm true` | 按 18.5 测试用例详情页确认按钮同步最新需求版本。 |
| 同步用例库变更 | `confirmTestCaseLibcaseChange` | `zentao confirmTestCaseLibcaseChange --caseId <caseId> --libcaseId <libcaseId> --confirm true` | 按 18.5 测试用例详情页同步用例库修改。 |
| 忽略用例库变更 | `ignoreTestCaseLibcaseChange` | `zentao ignoreTestCaseLibcaseChange --caseId <caseId> --confirm true` | 按 18.5 测试用例详情页忽略用例库修改。 |
| 批量确认测试用例需求变更 | `batchConfirmTestCaseStoryChange` | `zentao batchConfirmTestCaseStoryChange --productId <productId> --caseIds <caseId> --caseIds <caseId> --confirm true` | 按 18.5 测试用例列表批量确认变更。 |
| 产品测试单 | `getTestTasks` | `zentao getTestTasks --productId <productId> --limit 50` | 查产品测试单列表。 |
| 测试单详情 | `getTestTaskDetail` | `zentao getTestTaskDetail --testTaskId <testTaskId>` | 查测试单详情、构建、执行。 |
| 启动测试单 | `startTestTask` | `zentao startTestTask --testTaskId <testTaskId> --confirm true` | 按 18.5 测试单页面启动测试单。 |
| 激活测试单 | `activateTestTask` | `zentao activateTestTask --testTaskId <testTaskId> --confirm true` | 按 18.5 测试单页面激活测试单。 |
| 阻塞测试单 | `blockTestTask` | `zentao blockTestTask --testTaskId <testTaskId> --confirm true` | 按 18.5 测试单页面阻塞测试单。 |
| 关闭测试单 | `closeTestTask` | `zentao closeTestTask --testTaskId <testTaskId> --realFinishedDate <YYYY-MM-DD> --mailto <account> --confirm true` | 按 18.5 测试单页面关闭测试单。 |
| 删除测试单 | `deleteTestTask` | `zentao deleteTestTask --testTaskId <testTaskId> --confirm true` | 按 18.5 测试单页面删除测试单。 |

## 评论 / 动作记录

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 查对象评论 | `getComments` | `zentao getComments --objectType bug --objectID <bugId>` | `objectType` 支持 `task/bug/story/product/project/execution`。 |
| 查执行评论 | `getComments` | `zentao getComments --objectType execution --objectID <executionId>` | 禅道 18.5 会 fallback 到 actions。 |
| 查任务评论 | `getComments` | `zentao getComments --objectType task --objectID <taskId>` | 用于补充任务动作和备注。 |

## URL 到命令

| URL 形态 | 命令 |
| --- | --- |
| `execution-bug-2130.html` | `zentao getExecutionBugs --executionId 2130 --limit 100` |
| `execution-build-2130.html` | `zentao getExecutionBuilds --executionId 2130` |
| `execution-dynamic-2130.html` | `zentao getExecutionDynamic --executionId 2130` |
| `bug-view-84362.html` | `zentao getBugDetail --bugId 84362` |
| `task-view-79922.html` | `zentao getTaskDetail --taskId 79922` |
| `story-view-10154.html` | `zentao getStoryDetail --storyId 10154` |
| `testcase-view-58191.html` | `zentao getTestCaseDetail --testCaseId 58191` |
| `testtask-view-2319.html` | `zentao getTestTaskDetail --testTaskId 2319` |
| `build-view-5648.html` | `zentao getBuildDetail --buildId 5648` |

## 常用组合

### 查一个迭代的完整上下文

```bash
zentao getExecutionDetail --executionId <executionId>
zentao getExecutionBugs --executionId <executionId> --limit 100
zentao getExecutionBuilds --executionId <executionId>
zentao getExecutionDailyBugStats --executionId <executionId> --iterationName <name>
```

### 从 Bug 追任务和上下文

```bash
zentao getBugDetail --bugId <bugId>
zentao getBugRelatedStory --bugId <bugId>
zentao getDevelopmentContext --entityType bug --entityId <bugId>
```

如果 Bug 详情里有 `toTask`，再查：

```bash
zentao getTaskDetail --taskId <toTask>
```

### 把 Bug 挂到指定执行

```bash
zentao getExecutionDetail --executionId <executionId>
zentao updateBug --bugId <bugId> --project <projectId> --execution <executionId> --confirm true
```

如果用户只有 `executionId`，先从 `getExecutionDetail` 返回里取 `project` / `projectId`，不要直接猜项目。

### 把 Bug 转成任务

```bash
zentao getExecutionDetail --executionId <executionId>
zentao createTaskFromBug --bugId <bugId> --project <projectId> --execution <executionId> --assignedTo <account> --estStarted <YYYY-MM-DD> --deadline <YYYY-MM-DD> --confirm true
```

按页面链路，`createTaskFromBug` 必须显式传 `project` 和 `execution`；如果用户只有 `executionId`，先查 `getExecutionDetail` 再回填 `projectId`。

### 从需求追实现风险

```bash
zentao getStoryDetail --storyId <storyId>
zentao getStoryRelatedBugs --storyId <storyId> --productId <productId>
zentao getDevelopmentContext --entityType story --entityId <storyId> --productId <productId>
```

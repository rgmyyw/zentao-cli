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
| 我的 Bug | `getMyBugs` | `zentao getMyBugs --limit 20` | 不传 `productId` 时查跨产品指派给我的 Bug。 |
| 我的 Todo | `getMyTodos` | `zentao getMyTodos` | 查当前账号待办。 |
| Todo 详情 | `getTodoDetail` | `zentao getTodoDetail --todoId <todoId>` | 需要先从 `getMyTodos` 取 ID。 |

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
| 线上 Bug（默认优先） | `getProductBugs` | `zentao getProductBugs --productId <市场和售后问题跟踪产品ID> --status all --limit 100 --order id_desc --module <模块别名>` | 线上 / 生产 / 客户反馈问题默认走这里；先 `getProducts` 找到 `市场和售后问题跟踪`，模块名支持中文名、路径和 `YJ` / `yj` / `Yj` 这类别名。 |
| 产品 Bug | `getProductBugs` | `zentao getProductBugs --productId <productId> --status all --limit 100` | 仅在用户明确说“查某个禅道产品下的 Bug”时使用。 |
| 我的 Bug | `getMyBugs` | `zentao getMyBugs --productId <productId> --limit 50` | 产品内指派给我的 Bug。 |
| Bug 关联需求 | `getBugRelatedStory` | `zentao getBugRelatedStory --bugId <bugId>` | 从 Bug 查关联需求。 |

线上 / 生产 / 客户反馈问题不要直接按真实业务产品名查产品；按 `reference/bug.md` 的固定口径：先查 `市场和售后问题跟踪` 产品，再按模块匹配真实业务产品。

## 需求 / Story

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 需求详情 | `getStoryDetail` | `zentao getStoryDetail --storyId <storyId>` | 查需求标题、状态、评审、用例等。 |
| 产品需求 | `getProductStories` | `zentao getProductStories --productId <productId> --limit 50` | 查某产品需求列表。 |
| 关键词搜需求 | `searchStories` | `zentao searchStories --keyword <keyword> --productId <productId>` | 指定产品内搜索需求。 |
| 按产品名搜需求 | `searchStoriesByProductName` | `zentao searchStoriesByProductName --productName <name> --keyword <keyword>` | 不知道产品 ID 时使用。 |
| 需求关联 Bug | `getStoryRelatedBugs` | `zentao getStoryRelatedBugs --storyId <storyId> --productId <productId>` | 查需求关联 Bug；`productId` 用于兜底过滤。 |
| 开发上下文：需求 | `getDevelopmentContext` | `zentao getDevelopmentContext --entityType story --entityId <storyId> --productId <productId>` | 聚合需求、关联 Bug、测试用例。 |
| 开发上下文：Bug | `getDevelopmentContext` | `zentao getDevelopmentContext --entityType bug --entityId <bugId>` | 聚合 Bug 和关联需求。 |

## 计划、构建、发布

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 产品计划 | `getProductPlans` | `zentao getProductPlans --productId <productId> --order id_desc` | 查产品计划列表。 |
| 计划详情 | `getPlanDetail` | `zentao getPlanDetail --planId <planId>` | 查计划详情、关联需求/Bug 统计。 |
| 项目构建 | `getProjectBuilds` | `zentao getProjectBuilds --projectId <projectId>` | 查项目下构建。 |
| 构建详情 | `getBuildDetail` | `zentao getBuildDetail --buildId <buildId>` | 查构建关联 Bug / 需求。 |
| 项目发布 | `getProjectReleases` | `zentao getProjectReleases --projectId <projectId>` | 查项目发布列表；当前账号无权限时可能 403。 |

## 测试

| 场景 | 命令 | 用法 | 说明 |
| --- | --- | --- | --- |
| 产品测试用例 | `getProductTestCases` | `zentao getProductTestCases --productId <productId> --limit 50` | 查产品下测试用例；可加 `--status`、`--moduleId`。 |
| 测试用例详情 | `getTestCaseDetail` | `zentao getTestCaseDetail --testCaseId <testCaseId>` | 查单条测试用例详情。 |
| 产品测试单 | `getTestTasks` | `zentao getTestTasks --productId <productId> --limit 50` | 查产品测试单列表。 |
| 测试单详情 | `getTestTaskDetail` | `zentao getTestTaskDetail --testTaskId <testTaskId>` | 查测试单详情、构建、执行。 |

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

### 从需求追实现风险

```bash
zentao getStoryDetail --storyId <storyId>
zentao getStoryRelatedBugs --storyId <storyId> --productId <productId>
zentao getDevelopmentContext --entityType story --entityId <storyId> --productId <productId>
```

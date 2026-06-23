# Reference 索引

按场景分类的二级文档。SKILL.md 主入口保持精简，本目录覆盖 CLI 注册的全部 306 个命令。

## 主链路（高频 / 日常）

| 文档 | 场景 | 关键命令 |
| --- | --- | --- |
| [install.md](./install.md) | 安装 / 更新 / 卸载 | `install`, `update`, `uninstall` |
| [cli.md](./cli.md) | CLI 基础 | `help`, `list`, `version`, `whoami`, `initZentao` |
| [bug.md](./bug.md) | Bug 主链路 | `getMyBugs`, `getProductBugs`, `getBugDetail`, `resolveBug`, `updateBug` |
| [task.md](./task.md) | 任务主链路 | `getMyTasks`, `getTaskDetail`, `updateTask`, `finishTask`, `recordTaskEstimate` |
| [story.md](./story.md) | 需求主链路 | `getStoryDetail`, `getProductStories`, `searchStories`, `updateStory`, `changeStory` |
| [execution.md](./execution.md) | 执行 / 迭代主链路 | `getExecutionDetail`, `getExecutionBugs`, `getExecutionBuilds`, `getExecutionDynamic`, `getExecutionDailyBugStats` |
| [product.md](./product.md) | 产品主链路 | `getProducts`, `getProductDetail` |
| [project.md](./project.md) | 项目主链路 | `getProjects`, `getProjectDetail`, `getProjectExecutions` |
| [program.md](./program.md) | 项目集 Program | `getPrograms`, `getProgramDetail` + 全部 program 写入 |
| [plan.md](./plan.md) | 计划 Plan | `getProductPlans`, `getPlanDetail`, `startPlan`, `finishPlan`, `closePlan` |
| [build.md](./build.md) | 构建主链路 | `getProjectBuilds`, `getBuildDetail`, `createBuild`, `updateBuild` |
| [release.md](./release.md) | 发布 Release | `getProjectReleases`, `getReleaseDetail`, `changeReleaseStatus`, `notifyRelease` |
| [testcase.md](./testcase.md) | 测试用例主链路 | `getProductTestCases`, `getTestCaseDetail`, `createTestCase`, `updateTestCase` |
| [testtask.md](./testtask.md) | 测试单主链路 | `getTestTasks`, `getTestTaskDetail`, `createTestTask`, `updateTestTask` |
| [todo.md](./todo.md) | 待办 Todo | `getMyTodos`, `getTodoDetail`, `createTodo`, `updateTodo`, `startTodo`, `finishTodo`, `closeTodo` |
| [statistics.md](./statistics.md) | 统计 | `getMyTaskStatistics`, `getMyBugStatistics`, `getMyWeeklyActivity` |
| [context.md](./context.md) | 开发上下文 | `getDevelopmentContext`, `getDevelopmentContextSnapshot` |
| [relation.md](./relation.md) | 关联查询 | `getStoryRelatedBugs`, `getBugRelatedStory` |
| [comment.md](./comment.md) | 评论 | `getComments`, `addComment` |
| [search.md](./search.md) | 搜索 | `searchStories`, `searchStoriesByProductName` |
| [resource-analysis.md](./resource-analysis.md) | 资源分析 | `analyzeBugResources`, `analyzeTaskResources` |
| [url-intent.md](./url-intent.md) | URL 解析 | `parseUrlIntent` |

## 高级 / 批量 / 状态变更 / 管理员（低频）

| 文档 | 场景 |
| --- | --- |
| [bug-advanced.md](./bug-advanced.md) | Bug 批量修改 / 状态变更 / 删除 / 关联 |
| [task-advanced.md](./task-advanced.md) | 任务批量 / 状态变更 / 导出 / 团队 |
| [story-advanced.md](./story-advanced.md) | 需求批量 / 评审 / 阶段 / 关联 |
| [execution-advanced.md](./execution-advanced.md) | 执行批量 / 状态变更 / 成员 / 看板 / 链接 |
| [product-advanced.md](./product-advanced.md) | 产品批量 / 状态变更 / 白名单 / 动态 / 路线图 |
| [project-advanced.md](./project-advanced.md) | 项目批量 / 状态变更 / 成员 / 分组 / 白名单 |
| [build-advanced.md](./build-advanced.md) | 构建通知 / 指派 / 删除 |
| [testcase-advanced.md](./testcase-advanced.md) | 测试用例批量 / 导入 / 导出 / 用例库 / 关联 |
| [testtask-advanced.md](./testtask-advanced.md) | 测试单批量 / 用例运行 / 单位结果导入 |

## 兜底

| 文档 | 作用 |
| --- | --- |
| [cheatsheet.md](./cheatsheet.md) | 全量 306 命令速查（一行一条） |
| [scenarios.md](./scenarios.md) | 场景化组合（典型链路） |

## 验证

跑下面命令验证 reference 覆盖 vs CLI 注册：

```bash
node scripts/check-coverage.mjs
```

应当看到 `未覆盖: 0 误识别: 0`。
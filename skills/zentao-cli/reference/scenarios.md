# 场景化组合

典型用户意图 → 命令组合示例。所有写操作必须传 `--confirm true`。

## 1. 查一个迭代的完整上下文

```bash
zentao getExecutionDetail --executionId <executionId>
zentao getExecutionBugs --executionId <executionId> --limit 100
zentao getExecutionBuilds --executionId <executionId>
zentao getExecutionDynamic --executionId <executionId>
zentao getExecutionDailyBugStats --executionId <executionId> --iterationName <name>
```

## 2. 我的 Bug 全链路（普通产品）

```bash
zentao getMyBugs --limit 50
zentao getBugDetail --bugId <id>
zentao getBugRelatedStory --bugId <id>
zentao getDevelopmentContext --entityType bug --entityId <id>
```

## 3. 我的 Bug 全链路（线上 / 生产 / 客户反馈）

```bash
zentao getProducts                                     # 找 "市场和售后问题跟踪"
zentao getProductBugs --productId <市场和售后问题跟踪> --status all --limit 100 --order id_desc
zentao getBugDetail --bugId <id>
```

## 4. 测试 / 开发自发现的线上 Bug

```bash
zentao getProducts                                     # 找 "测试"
zentao getProductBugs --productId <测试产品> --status all --limit 100 --order id_desc --module <模块>
```

## 5. 把 Bug 挂到指定执行（需要 project + execution）

```bash
zentao getExecutionDetail --executionId <executionId>   # 取 project / projectId
zentao updateBug --bugId <bugId> --project <projectId> --execution <executionId> --confirm true
```

## 6. 把 Bug 转成任务

```bash
zentao getExecutionDetail --executionId <executionId>
zentao createTaskFromBug --bugId <bugId> --project <projectId> --execution <executionId> \
  --assignedTo <account> --estStarted <YYYY-MM-DD> --deadline <YYYY-MM-DD> --confirm true
```

## 7. 按需求拆任务（父子两层）

```bash
zentao getStoryDetail --storyId <storyId> --productId <productId>
zentao getDevelopmentContext --entityType story --entityId <storyId> --productId <productId>
zentao createTaskFromStory --storyId <storyId> --execution <executionId> \
  --assignedTo <account> --estStarted <YYYY-MM-DD> --deadline <YYYY-MM-DD> --confirm true
# 再用 createTask --parent <parentTaskId> 创建子任务
```

## 8. 完成一个任务 + 登记工时

```bash
zentao getTaskDetail --taskId <id>                    # 校验状态
zentao recordTaskEstimate --taskId <id> --date <YYYY-MM-DD> --consumed 4 --left 0 --work <备注> --confirm true
zentao finishTask --taskId <id> --confirm true
```

## 9. 解决 Bug + 同步需求

```bash
zentao resolveBug --bugId <id> --resolution fixed --resolvedBuild trunk --confirm true
zentao getBugRelatedStory --bugId <id>                 # 查关联需求
zentao confirmBugStoryChange --bugId <id> --confirm true
```

## 10. 关闭需求 + 批量联动

```bash
zentao changeStory --storyId <id> --title <新标题> --comment <备注> --confirm true
zentao closeStory --storyId <id> --closedReason done --confirm true
```

## 11. 评审一批需求

```bash
zentao batchReviewStories --storyIds <id1> --storyIds <id2> --result pass --reason <reason> --confirm true
```

## 12. 测试单全流程

```bash
zentao createTestTask --project <projectId> --productID <productId> --name <name> \
  --build <buildId> --begin <YYYY-MM-DD> --end <YYYY-MM-DD> --confirm true
zentao startTestTask --testTaskId <id> --confirm true
zentao linkCaseToTestTask --testTaskId <id> --caseIds <caseId> --confirm true
zentao runCase --testTaskId <id> --caseId <id> --result pass --confirm true
zentao closeTestTask --testTaskId <id> --realFinishedDate <YYYY-MM-DD> --mailto <account> --confirm true
```

## 13. 周报 / 工作清单（自然语言日期）

```bash
zentao getMyWeeklyActivity --account <account> --week last
zentao getMyWeeklyActivity --account <account> --dateRange 上周
zentao getMyWeeklyActivity --account <account> --dateRange 最近3天
zentao getMyWeeklyActivity --account <account> --dateRange 2026-05-28
zentao getMyWeeklyActivity --account <account> --startDate 2026-05-25 --endDate 2026-05-29
zentao getMyWeeklyActivity --account <account> --days 3
```

## 14. URL → 命令

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

任何 URL 都先用 `zentao parseUrlIntent --url <url>` 解析。

## 15. 角色过滤

```bash
zentao --role qa getMyBugs --limit 50
zentao --role pm getProductStories --productId <productId>
zentao --role dev getMyTasks --status doing
```

角色只过滤 CLI 暴露的命令，不改变禅道登录身份或服务端权限。

## 16. 排查问题

```bash
zentao help <command>                                   # 校对参数名
zentao list                                             # 列全部命令
zentao --version                                        # CLI 版本
zentao whoami                                           # 当前登录账号
zentao parseUrlIntent --url <禅道页面 URL>              # URL 解析
```
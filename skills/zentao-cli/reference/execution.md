# Execution

## 查询

```bash
zentao getExecutionDetail --executionId <id>
zentao getExecutionDynamic --executionId <id>
zentao getExecutionBugs --executionId <id>
zentao getExecutionDailyBugStats --executionId <id> --iterationName 某个迭代
zentao getExecutionBuilds --executionId <id>
```

`getExecutionDynamic` 是近似读取：调用禅道 REST `GET /executions/{id}?fields=dynamics`，用于快速查看执行动态摘要。它不是旧版页面 `execution-dynamic-<id>.html` 的完整等价实现，暂不支持 `today/all/自定义时间范围` 参数。

`getExecutionDailyBugStats` 用于“每日迭代执行统计”场景：按执行下 Bug 当前字段统计总 Bug、延期处理、reopen、已关闭、已解决、未解决、测试未及时关闭 Bug、开发今日未及时解决 Bug，并输出参与人员 Bug 情况和文本报告。

统计口径：

- reopen：`activatedCount > 0`
- 延期处理：`resolution` 为 `postponed/delay/delayed`
- 测试未及时关闭 Bug：当前 `status=resolved` 但还没关闭
- 开发今日未及时解决 Bug：当前未解决且创建日期不晚于统计日期
- 参与人员归属：优先 `resolvedBy`，其次 `assignedTo`，再其次 `openedBy`

## 写入

```bash
zentao startExecution --executionId <id> --confirm true
zentao closeExecution --executionId <id> --confirm true
```

## 场景

- 看执行详情
- 看执行动态摘要
- 看执行 Bug / 构建
- 做每日迭代执行 Bug 统计报告
- 启动 / 关闭执行

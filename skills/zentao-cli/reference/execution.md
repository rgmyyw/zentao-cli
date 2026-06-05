# Execution

## 查询

```bash
zentao getExecutionDetail --executionId <id>
zentao getExecutionBugs --executionId <id>
zentao getExecutionBuilds --executionId <id>
```

## 写入

```bash
zentao startExecution --executionId <id> --confirm true
zentao closeExecution --executionId <id> --confirm true
```

## 场景

- 看执行详情
- 看执行 Bug / 构建
- 启动 / 关闭执行

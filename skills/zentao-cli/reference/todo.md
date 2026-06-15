# Todo

## 查询

```bash
zentao getMyTodos
zentao getTodoDetail --todoId <todoId>
```

## 写入

```bash
zentao startTodo --todoId <todoId> --confirm true
zentao closeTodo --todoId <todoId> --confirm true
zentao assignTodo --todoId <todoId> --assignedTo <account> [--comment <comment>] --confirm true
zentao batchFinishTodos --todoIds <id1> --todoIds <id2> --confirm true
zentao batchCloseTodos --todoIds <id1> --todoIds <id2> --confirm true
zentao importTodosToToday --todoIds <id1> --todoIds <id2> [--date YYYY-MM-DD] --confirm true
zentao activateTodo --todoId <todoId> --confirm true
zentao deleteTodo --todoId <todoId> --confirm true
zentao finishTodo --todoId <todoId> --confirm true
```

## 场景

- 启动待办
- 关闭待办
- 分配待办
- 批量结束待办
- 批量关闭待办
- 导入到今天
- 激活待办
- 删除待办
- 结束待办
- 查看我的待办

# TestTask

## 查询

```bash
zentao getTestTasks --productId <productId>
zentao getTestTaskDetail --testTaskId <id>
```

## 写入

```bash
zentao createTestTask --project <projectId> --productID <productId> --name <name> --build <buildId> --begin <YYYY-MM-DD> --end <YYYY-MM-DD> --confirm true
zentao updateTestTask --testTaskId <id> --confirm true
zentao startTestTask --testTaskId <id> --confirm true
zentao activateTestTask --testTaskId <id> --confirm true
zentao blockTestTask --testTaskId <id> --confirm true
zentao closeTestTask --testTaskId <id> --realFinishedDate <YYYY-MM-DD> --mailto <account> --confirm true
zentao deleteTestTask --testTaskId <id> --confirm true
```

## 场景

- 创建 / 修改测试单
- 启动 / 激活 / 阻塞 / 关闭 / 删除测试单
- 查看产品测试单列表

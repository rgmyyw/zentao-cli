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
```

## 场景

- 创建 / 修改测试单
- 查看产品测试单列表

# Build

## 查询

```bash
zentao getProjectBuilds --projectId <projectId>
zentao getBuildDetail --buildId <id>
```

## 写入

```bash
zentao createBuild --project <projectId> --execution <executionId> --product <productId> --name <name> --builder <user> --confirm true
zentao updateBuild --buildId <id> --confirm true
```

## 场景

- 创建版本
- 更新版本信息
- 查看项目版本列表

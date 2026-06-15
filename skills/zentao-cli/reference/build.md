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

## 关联需求 / Bug

```bash
zentao linkStoriesToBuild --buildId <id> --storyIds <storyId> --confirm true
zentao unlinkStoryFromBuild --buildId <id> --storyId <storyId> --confirm true
zentao batchUnlinkStoriesFromBuild --buildId <id> --storyIds <storyId> --confirm true
zentao linkBugsToBuild --buildId <id> --bugIds <bugId> --confirm true
zentao unlinkBugFromBuild --buildId <id> --bugId <bugId> --confirm true
zentao batchUnlinkBugsFromBuild --buildId <id> --bugIds <bugId> --confirm true
```

## 场景

- 创建版本
- 更新版本信息
- 查看项目版本列表
- 关联 / 移除构建中的需求与 Bug

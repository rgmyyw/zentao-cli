# Release

## 查询

```bash
zentao getProjectReleases --projectId <projectId>
zentao getReleaseDetail --releaseId <releaseId>
```

## 状态与通知

```bash
zentao changeReleaseStatus --releaseId <releaseId> --status terminate --confirm true
zentao notifyRelease --releaseId <releaseId> --notify FB --notify BETA --confirm true
zentao deleteRelease --releaseId <releaseId> --confirm true
```

## 关联需求 / Bug

```bash
zentao linkStoriesToRelease --releaseId <releaseId> --storyIds <id1> --storyIds <id2> --confirm true
zentao unlinkStoryFromRelease --releaseId <releaseId> --storyId <storyId> --confirm true
zentao batchUnlinkStoriesFromRelease --releaseId <releaseId> --storyIds <id1> --storyIds <id2> --confirm true

zentao linkBugsToRelease --releaseId <releaseId> --bugIds <id1> --bugIds <id2> --type bug --confirm true
zentao unlinkBugFromRelease --releaseId <releaseId> --bugId <bugId> --type bug --confirm true
zentao batchUnlinkBugsFromRelease --releaseId <releaseId> --bugIds <id1> --bugIds <id2> --type bug --confirm true
```

## 场景

- 查看发布详情与关联对象
- 切换发布状态为正常 / 停止维护
- 发送发布通知
- 关联 / 移除需求与 Bug

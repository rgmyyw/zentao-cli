# Story

## 查询

```bash
zentao getStoryDetail --storyId <id>
zentao getProductStories --productId <productId>
zentao searchStories --productId <productId> --keyword <keyword>
```

## 写入

```bash
zentao updateStory --storyId <id> --confirm true
zentao changeStory --storyId <id> --confirm true
zentao recallStory --storyId <id> --confirm true
zentao submitStoryReview --storyId <id> --confirm true
zentao processStoryChange --storyId <id> --result yes --confirm true
zentao batchReviewStories --storyIds <id1> --storyIds <id2> --result pass --confirm true
zentao batchCloseStories --productId <productId> --storyIds <id1> --storyIds <id2> --closedReasons done --closedReasons cancel --comments note1 --comments note2 --confirm true
zentao batchChangeStoryModule --storyIds <id1> --storyIds <id2> --moduleId <moduleId> --confirm true
zentao batchChangeStoryPlan --storyIds <id1> --storyIds <id2> --planId <planId> --confirm true
zentao batchChangeStoryBranch --storyIds <id1> --storyIds <id2> --branchId <branchId> --confirmBranch yes --confirm true
zentao batchChangeStoryStage --storyIds <id1> --storyIds <id2> --stage <stage> --confirm true
zentao batchAssignStoriesTo --storyIds <id1> --storyIds <id2> --assignedTo <account> --confirm true
zentao linkStoriesToStory --storyId <id> --storyIds <linkedId> --confirm true
zentao unlinkStoryFromStory --storyId <id> --linkedStoryId <linkedId> --confirm true
```

## 场景

- 查看需求
- 修改需求内容
- 变更需求状态
- 撤回需求评审 / 确认需求变更
- 批量评审 / 批量关闭需求
- 批量修改需求模块 / 计划 / 分支 / 阶段
- 批量指派需求
- 关联 / 移除相关需求

# 需求高级操作

需求批量、评审、关闭、阶段变更等低频操作。日常主链路见 `story.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `createStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `batchCreateStories` | 产品 ID。对应 18.5 story/batchCreate 页面 productID 参数 |
| `batchEditStories` | 产品 ID。对应 18.5 story/batchEdit 页面 productID 参数 |
| `deleteStory` | 产品 ID。对应 18.5 story/export 页面 productID 参数 |
| `exportStories` | 产品 ID。对应 18.5 story/export 页面 productID 参数 |
| `assignStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `activateStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `reviewStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `linkStoriesToStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `linkRequirements` | 需求 ID。对齐 18.5 story/recall 页面按钮，仅在状态为 reviewing/changing 时可撤回 |
| `unlinkStoryFromStory` | 需求 ID。对齐 18.5 story/recall 页面按钮，仅在状态为 reviewing/changing 时可撤回 |
| `batchReviewStories` | 要批量评审的需求 ID 列表，对应 18.5 story/batchReview 页面 storyIdList[] 字段 |
| `batchChangeStoryModule` | 要批量修改所属模块的需求 ID 列表，对应 18.5 story/batchChangeModule 页面 storyIdList[] 字段 |
| `batchChangeStoryPlan` | 要批量修改所属计划的需求 ID 列表，对应 18.5 story/batchChangePlan 页面 storyIdList[] 字段 |
| `batchChangeStoryBranch` | 要批量修改所属分支的需求 ID 列表，对应 18.5 story/batchChangeBranch 页面 storyIdList[] 字段 |
| `batchChangeStoryStage` | 要批量修改阶段的需求 ID 列表，对应 18.5 story/batchChangeStage 页面 storyIdList[] 字段 |
| `batchAssignStoriesTo` | 要批量指派的需求 ID 列表，对应 18.5 story/batchAssignTo 页面 storyIdList[] 字段 |

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
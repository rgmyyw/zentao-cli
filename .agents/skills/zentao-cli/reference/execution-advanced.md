# 执行 / 迭代高级操作

执行批量、状态变更、成员、看板、链接等低频 / 管理员操作。日常主链路见 `execution.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `updateExecution` | 所属项目 ID。禅道官方文档标为必填，建议从 getExecutionDetail 读回后原样传入 |
| `startExecution` | 格式 YYYY-MM-DD |
| `closeExecution` | 格式 YYYY-MM-DD |
| `suspendExecution` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `activateExecution` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `putoffExecution` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `computeCfd` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `computeExecutionBurn` | 执行 ID。禅道 18.5 execution::computeBurn($reload) 不接收 executionId，确认执行时会显式报错 |
| `confirmExecutionStoryChange` | 执行 ID。禅道 18.5 无 execution/confirmStoryChange 控制器，确认执行时会提示使用 task/testcase 对应能力 |
| `createExecution` | 所属项目 ID，对齐禅道 18.5 execution/create 路径 {projectID} 段 |
| `batchEditExecutions` | 要批量编辑的执行 ID 列表，对应 18.5 execution/batchEdit 页面 executionIDList[] 字段 |
| `batchChangeExecutionStatus` | 要变更状态的执行 ID 列表，对应 18.5 execution/batchChangeStatus 页面 executionIdList[] 字段 |
| `deleteExecution` | 要评估工时的成员账号数组，对应 18.5 story::saveEstimateInfo 页面 account[] 字段 |
| `getExecutionAll` | 可选，状态过滤，默认 undone（wait/doing/suspended/closed/finished），对应 18.5 execution::all $status 段 |
| `getExecutionTrack` | 执行 ID。禅道 18.5 execution 模块无 track 控制器，确认执行时会显式报错 |
| `getExecutionManageMembers` | 执行 ID。对齐禅道 18.5 execution/manageMembers 页面按钮 |
| `getExecutionSnapshot` | 可选，按禅道接口支持的状态过滤 |
| `getExecutionKanban` | 执行 ID。对齐禅道 18.5 execution/kanban 页面视图 |
| `getExecutionTaskKanban` | 执行 ID。对齐禅道 18.5 execution/taskKanban 页面视图 |
| `getExecutionStoryKanban` | 执行 ID。对齐禅道 18.5 execution/storyKanban 页面视图 |
| `getExecutionStoryTasks` | 执行 ID。禅道 18.5 execution 模块无 storyTasks 控制器，确认执行时会显式报错 |
| `getExecutionExecutionKanban` | 可选参数。禅道 18.5 execution/executionKanban 是全公司执行看板，无路径参数；本参数仅用于占位/未来的 from 过滤，不写入 URL |
| `linkStoriesToExecution` | 要关联到执行的需求 ID 列表，对应 18.5 execution/linkStory 页面 stories[] 字段 |
| `linkStoryToExecutionSingle` | 所属产品 ID，CLI 内部编码为 products[storyId]=productId |
| `unlinkStoryFromExecution` | 要从执行批量移除的需求 ID 列表，对应 18.5 execution/batchUnlinkStory 页面 storyIdList[] 字段 |
| `batchUnlinkStoriesFromExecution` | 要从执行批量移除的需求 ID 列表，对应 18.5 execution/batchUnlinkStory 页面 storyIdList[] 字段 |
| `unlinkMemberFromExecution` | 要评估工时的成员账号数组，对应 18.5 story::saveEstimateInfo 页面 account[] 字段 |
| `addExecutionMember` | 要加入的成员账号数组。禅道 18.5 execution 模块无 addMember 控制器，真实写入走 manageMembers POST，对应 accounts[] 字段 |
| `importBugToExecution` | 要导入的 Bug ID |
| `batchImportBugsToExecution` | 禅道 18.5 execution 模块无 batchImportBug 控制器，确认执行时会明确报错 |
| `addExecutionWhitelist` | 禅道 18.5 execution::addWhitelist 只 fetch 页面，真实写入在 personnel::addWhitelist，确认执行时会明确报错 |
| `unbindExecutionWhitelist` | 白名单关系 ID |
| `storyEstimate` | 要评估工时的成员账号数组，对应 18.5 story::saveEstimateInfo 页面 account[] 字段 |
| `fixFirstExecution` | 必填数字 estimate，对应 18.5 execution::fixFirst 模型 is_numeric 校验；未传会在 API 层显式报错 |
| `updateExecutionOrder` | 要排序的执行 ID 数组。CLI 内部用逗号串提交到 18.5 execution::updateOrder 页面 executions 字段，对应 18.5 executionModel 期望格式 |
| `storySortExecution` | 要排序的需求 ID 数组。CLI 内部用逗号串提交到 18.5 execution::storySort 页面 storys 字段 |

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
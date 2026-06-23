# 全量命令速查

> 兜底文档。CLI 注册的全部 306 条命令在此处都有名字 + 简要说明。
> 写操作示例和参数细节见对应场景文档（`bug.md` / `task.md` / ...）。

## 入口与基础

| 命令 | 简介 |
| --- | --- |
| `initZentao` | 禅道根域名，例如 https://zentao.cloudglab.cn，不要带 /zentao |
| `parseUrlIntent` | 要解析的禅道浏览器 URL、页面文件路径或页面文件名。 |
| `getMyProfile` | - |
| `whoami` | - |

## Bug

| 命令 | 简介 |
| --- | --- |
| `getMyBugs` | 可选。禅道产品 ID。不传时默认查询跨所有产品“指派给我的 Bug”；传入时只查该产品内我的 Bug。若用户问线上 / 生产 / 客户反馈 / 售后反馈问题，先判断来源：市场 / 售后 / 客户反馈查“市场和售后问题跟踪”，测试 / 开发自发现查“测试”，不要直接把业务产品名当成这里的 productId。 |
| `getProductBugs` | 禅道产品 ID。仅用于查询某个禅道产品下的 Bug。若用户问的是外部线上 / 生产 / 客户反馈问题，先查固定禅道产品 |
| `getBugDetail` | 解决日期/时间，禅道 18.5 bugresolve 支持该字段 |
| `getBugSnapshot` | 解决日期/时间，禅道 18.5 bugresolve 支持该字段 |
| `resolveBug` | 解决日期/时间，禅道 18.5 bugresolve 支持该字段 |
| `createBug` | 可选。所属项目 ID。跨项目调整 Bug 到指定执行时通常需要和 execution 一起传；如果用户只知道 executionId，可先运行  |
| `updateBug` | 可选。所属项目 ID。跨项目调整 Bug 到指定执行时通常需要和 execution 一起传；如果用户只知道 executionId，可先运行  |
| `assignBug` | Bug ID。对齐禅道 18.5 bug/confirmStoryChange 页面按钮 |
| `okBug` | Bug ID。对齐禅道 18.5 bug/confirmStoryChange 页面按钮 |
| `confirmBug` | Bug ID。对齐禅道 18.5 bug/confirmStoryChange 页面按钮 |
| `confirmBugStoryChange` | Bug ID。对齐禅道 18.5 bug/confirmStoryChange 页面按钮 |
| `closeBug` | Bug ID。对齐禅道 18.5 bug/delete 页面确认链路 |
| `activateBug` | Bug ID。对齐禅道 18.5 bug/delete 页面确认链路 |
| `deleteBug` | Bug ID。对齐禅道 18.5 bug/delete 页面确认链路 |
| `deleteBugViaForm` | Bug ID。对齐禅道 18.5 bug/delete 页面确认链路 |
| `batchCreateBugs` | 批量 Bug 标题数组，对应页面表单 titles[] |
| `batchEditBugs` | 要批量编辑的 Bug ID 列表，对应 bugIDList[] |
| `linkBugs` | 要关联到当前 Bug 的 Bug ID 列表，对应 18.5 bug/linkBugs 页面 bugs[] 字段 |
| `exportBugs` | 要切换分支的 Bug ID 列表，对应 18.5 bug/batchChangeBranch 页面 bugIDList[] 字段 |
| `batchChangeBugBranch` | 要切换分支的 Bug ID 列表，对应 18.5 bug/batchChangeBranch 页面 bugIDList[] 字段 |
| `batchChangeBugModule` | 要切换模块的 Bug ID 列表，对应 18.5 bug/batchChangeModule 页面 bugIDList[] 字段 |
| `batchChangeBugPlan` | 要切换计划的 Bug ID 列表，对应 18.5 bug/batchChangePlan 页面 bugIDList[] 字段 |
| `batchAssignBugs` | 要指派的 Bug ID 列表，对应 18.5 bug/batchAssignTo 页面 bugIDList[] 字段 |
| `batchConfirmBugs` | 要确认的 Bug ID 列表，对应 18.5 bug/batchConfirm 页面 bugIDList[] 字段 |
| `batchResolveBugs` | 要解决的 Bug ID 列表，对应 18.5 bug/batchResolve 页面 bugIDList[] 字段 |
| `batchCloseBugs` | 要关闭的 Bug ID 列表，对应 18.5 bug/batchClose 页面 bugIDList[] / unlinkBugs[] 字段 |
| `batchActivateBugs` | 所属产品 ID。18.5 bug/batchActivate 页面要求先传 productID 渲染 statusList 表单 |
| `getBugTrack` | - |

## 任务

| 命令 | 简介 |
| --- | --- |
| `getMyTasks` | 登记日期，推荐 YYYY-MM-DD。 |
| `getTaskDetail` | 登记日期，推荐 YYYY-MM-DD。 |
| `recordTaskEstimate` | 登记日期，推荐 YYYY-MM-DD。 |
| `editTaskEstimate` | 工时记录 ID，对应 18.5 task/editEstimate 页面里的 estimateID/effortID |
| `deleteTaskEstimate` | 工时记录 ID，对应 18.5 task/deleteEstimate 页面里的 estimateID/effortID |
| `confirmTaskStoryChange` | 任务描述。禅道 18.5 REST PUT 支持 desc 但不支持 comment，备注请通过 finishTask/assignTask 等状态变更操作附带 |
| `updateTask` | 任务描述。禅道 18.5 REST PUT 支持 desc 但不支持 comment，备注请通过 finishTask/assignTask 等状态变更操作附带 |
| `finishTask` | 本次消耗工时。禅道 18.5 /tasks/{id}/finish 必填 |
| `startTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `pauseTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `restartTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `closeTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `cancelTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `activateTask` | 要批量完成的任务 ID 列表。禅道 18.5 无 task/batchFinish 控制器，确认执行时会提示改用 finishTask |
| `assignTask` | 要批量完成的任务 ID 列表。禅道 18.5 无 task/batchFinish 控制器，确认执行时会提示改用 finishTask |
| `deleteTask` | 要批量完成的任务 ID 列表。禅道 18.5 无 task/batchFinish 控制器，确认执行时会提示改用 finishTask |
| `batchFinishTasks` | 要批量完成的任务 ID 列表。禅道 18.5 无 task/batchFinish 控制器，确认执行时会提示改用 finishTask |
| `batchCancelTasks` | 要批量取消的任务 ID 列表，对应 18.5 task/batchCancel 页面 taskIDList[] 字段 |
| `batchCloseTasks` | 要批量关闭的任务 ID 列表，对应 18.5 task/batchClose 页面 taskIDList[] 字段；若服务端返回 skipTaskIdList 确认链接会自动跟进关闭 |
| `batchChangeTaskBranch` | 要批量切换分支的任务 ID 列表。禅道 18.5 无 task/batchChangeBranch 控制器 |
| `batchChangeTaskModule` | 要批量切换模块的任务 ID 列表，对应 18.5 task/batchChangeModule 页面 taskIDList[] 字段 |
| `batchChangeTaskPlan` | 要批量切换计划的任务 ID 列表。禅道 18.5 无 task/batchChangePlan 控制器 |
| `batchAssignTasksTo` | 要批量指派的任务 ID 列表，对应 18.5 task/batchAssignTo 页面 taskIDList[] 字段 |
| `batchActivateTasks` | 要批量激活的任务 ID 列表。禅道 18.5 无 task/batchActivate 控制器 |
| `batchChangeTaskStory` | 要批量调整所属需求的任务 ID 列表。禅道 18.5 无 task/batchChangeStory 控制器 |
| `batchCreateTasks` | 执行 ID，对应 18.5 task/batchCreate 路径段 {execution} |
| `batchEditTasks` | 任务行 JSON 数组。每项至少含 taskId/name/type/pri/estStarted/deadline，对应 18.5 task/batchEdit 页面 taskIDList[] 与 names[id]/types[id]/pris[id] 等字段 |
| `importTaskToLib` | 任务 ID，对应 18.5 task/importToLib 路径段 {id} |
| `exportTasks` | 执行 ID，对应 18.5 task/export 路径段 {executionID} |
| `editTaskTeam` | 任务 ID，对应 18.5 task/editTeam 路径段 {id} |

## 需求

| 命令 | 简介 |
| --- | --- |
| `getProductStories` | JSON 字符串。数组项对应 18.5 batchToTask 表单行：{story,name,module?,assignedTo?,estStarted?,deadline?,type?,pri?,estimate?,color?} |
| `getStoryDetail` | JSON 字符串。数组项对应 18.5 batchToTask 表单行：{story,name,module?,assignedTo?,estStarted?,deadline?,type?,pri?,estimate?,color?} |
| `batchToTaskStories` | JSON 字符串。数组项对应 18.5 batchToTask 表单行：{story,name,module?,assignedTo?,estStarted?,deadline?,type?,pri?,estimate?,color?} |

## 执行 / 迭代

| 命令 | 简介 |
| --- | --- |
| `getExecutionDetail` | 可选，按禅道接口支持的状态过滤 |
| `getExecutionSnapshot` | 可选，按禅道接口支持的状态过滤 |
| `getExecutionDynamic` | 可选，按禅道接口支持的状态过滤 |
| `getProjectExecutions` | 可选，按禅道接口支持的状态过滤 |
| `getExecutionBuilds` | 可选，按禅道接口支持的状态过滤 |
| `getExecutionBugs` | 可选，按禅道接口支持的状态过滤 |
| `getExecutionDailyBugStats` | 输出报告里的迭代名称，例如 1.2.3迭代。 |
| `confirmExecutionStoryChange` | 执行 ID。禅道 18.5 无 execution/confirmStoryChange 控制器，确认执行时会提示使用 task/testcase 对应能力 |
| `computeExecutionBurn` | 执行 ID。禅道 18.5 execution::computeBurn($reload) 不接收 executionId，确认执行时会显式报错 |
| `getExecutionManageMembers` | 执行 ID。对齐禅道 18.5 execution/manageMembers 页面按钮 |
| `getExecutionAll` | 可选，状态过滤，默认 undone（wait/doing/suspended/closed/finished），对应 18.5 execution::all $status 段 |
| `getExecutionTrack` | 执行 ID。禅道 18.5 execution 模块无 track 控制器，确认执行时会显式报错 |
| `getExecutionStoryKanban` | 执行 ID。对齐禅道 18.5 execution/storyKanban 页面视图 |
| `getExecutionStoryTasks` | 执行 ID。禅道 18.5 execution 模块无 storyTasks 控制器，确认执行时会显式报错 |
| `getExecutionKanban` | 执行 ID。对齐禅道 18.5 execution/kanban 页面视图 |
| `getExecutionTaskKanban` | 执行 ID。对齐禅道 18.5 execution/taskKanban 页面视图 |
| `getExecutionExecutionKanban` | 可选参数。禅道 18.5 execution/executionKanban 是全公司执行看板，无路径参数；本参数仅用于占位/未来的 from 过滤，不写入 URL |

## 构建

| 命令 | 简介 |
| --- | --- |
| `getProjectBuilds` | 要通知的 Bug ID 列表，对应 18.5 build/notifyBug 页面 bugs[] 字段 |
| `getBuildDetail` | 要通知的 Bug ID 列表，对应 18.5 build/notifyBug 页面 bugs[] 字段 |
| `notifyBuildBug` | 要通知的 Bug ID 列表，对应 18.5 build/notifyBug 页面 bugs[] 字段 |
| `assignBuildTo` | - |
| `deleteBuild` | - |

## 计划

| 命令 | 简介 |
| --- | --- |
| `getProductPlans` | 禅道 18.5 REST v1 支持的计划搜索关键字 |
| `getPlanDetail` | 关闭原因。18.5 页面默认候选通常为 done/cancel |
| `startPlan` | 关闭原因。18.5 页面默认候选通常为 done/cancel |
| `finishPlan` | 关闭原因。18.5 页面默认候选通常为 done/cancel |
| `activatePlan` | 关闭原因。18.5 页面默认候选通常为 done/cancel |
| `closePlan` | 关闭原因。18.5 页面默认候选通常为 done/cancel |

## 产品

| 命令 | 简介 |
| --- | --- |
| `getProducts` | 禅道产品 ID。若用户问的是外部线上/客户反馈/售后/生产问题，不要先用业务产品名找禅道产品；应固定查询 |
| `getProductDetail` | 禅道产品 ID。若用户问的是外部线上/客户反馈/售后/生产问题，不要先用业务产品名找禅道产品；应固定查询 |
| `manageProductLine` | JSON 字符串，已有产品线映射对象。键形如 id123，值为产品线名称，对应页面 modules[id123]。 |

## 项目

| 命令 | 简介 |
| --- | --- |
| `getProjects` | - |
| `getProjectDetail` | - |

## 项目集

| 命令 | 简介 |
| --- | --- |
| `getPrograms` | - |
| `getProgramDetail` | - |

## 发布

| 命令 | 简介 |
| --- | --- |
| `getProjectReleases` | 通知渠道数组，如 FB/BETA |
| `getReleaseDetail` | 通知渠道数组，如 FB/BETA |
| `changeReleaseStatus` | 通知渠道数组，如 FB/BETA |
| `notifyRelease` | 通知渠道数组，如 FB/BETA |
| `deleteRelease` | - |
| `linkStoriesToRelease` | - |
| `unlinkStoryFromRelease` | - |
| `batchUnlinkStoriesFromRelease` | - |
| `linkBugsToRelease` | - |
| `unlinkBugFromRelease` | - |
| `batchUnlinkBugsFromRelease` | - |
| `createRelease` | - |
| `updateRelease` | - |
| `exportRelease` | - |

## 测试用例

| 命令 | 简介 |
| --- | --- |
| `getProductTestCases` | 拖拽排序后的场景/用例 ID 顺序，对应 18.5 testcase/updateOrder 页面 scenes 字段 |
| `getTestCaseDetail` | 拖拽排序后的场景/用例 ID 顺序，对应 18.5 testcase/updateOrder 页面 scenes 字段 |
| `updateTestCaseOrder` | 拖拽排序后的场景/用例 ID 顺序，对应 18.5 testcase/updateOrder 页面 scenes 字段 |

## 测试单

| 命令 | 简介 |
| --- | --- |
| `getTestTasks` | - |
| `getTestTaskDetail` | - |

## 待办

| 命令 | 简介 |
| --- | --- |
| `getMyTodos` | 分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段 |
| `getTodoDetail` | 分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段 |
| `createTodo` | 分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段 |
| `updateTodo` | 分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段 |
| `startTodo` | 分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段 |
| `closeTodo` | 分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段 |
| `assignTodo` | 分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段 |
| `deleteTodo` | 要批量结束的待办 ID 列表，对应 18.5 todo/batchFinish 页面 todoIDList[] 字段 |
| `finishTodo` | 要批量结束的待办 ID 列表，对应 18.5 todo/batchFinish 页面 todoIDList[] 字段 |
| `activateTodo` | 要批量结束的待办 ID 列表，对应 18.5 todo/batchFinish 页面 todoIDList[] 字段 |
| `batchFinishTodos` | 要批量结束的待办 ID 列表，对应 18.5 todo/batchFinish 页面 todoIDList[] 字段 |
| `batchCloseTodos` | 要批量关闭的待办 ID 列表，对应 18.5 todo/batchClose 页面 todoIDList[] 字段 |
| `importTodosToToday` | 要导入到今天的待办 ID 列表，对应 18.5 todo/import2Today 页面 todoIDList[] 字段 |
| `batchCreateTodos` | 目标日期，默认 today |
| `batchEditTodos` | JSON 字符串。数组项对应 18.5 batchEdit 行：{todoId,date?,type?,pri?,status?,name?,begin?,end?,assignedTo?} |
| `exportTodos` | 用户账号，默认当前用户 |
| `createTodoCycle` | 开始日期 YYYY-MM-DD |

## 评论

| 命令 | 简介 |
| --- | --- |
| `getComments` | - |
| `addComment` | - |

## 开发上下文

| 命令 | 简介 |
| --- | --- |
| `getDevelopmentContext` | 可选。story 上下文查询关联 Bug 时可用于兜底过滤。 |
| `getDevelopmentContextSnapshot` | 可选。story 上下文查询关联 Bug 时可用于兜底过滤。 |

## 关联查询

| 命令 | 简介 |
| --- | --- |
| `getStoryRelatedBugs` | 可选。若 story 详情没有直接返回 bugs，则用产品 Bug 列表兜底过滤。 |
| `getBugRelatedStory` | - |

## 搜索

| 命令 | 简介 |
| --- | --- |
| `searchStories` | - |
| `searchStoriesByProductName` | - |

## 资源分析

| 命令 | 简介 |
| --- | --- |
| `analyzeBugResources` | - |
| `analyzeTaskResources` | - |

## 统计

| 命令 | 简介 |
| --- | --- |
| `getMyTaskStatistics` | 可选。禅道产品 ID。不传时统计跨所有产品指派给我的 Bug；传入时收窄到指定产品。 |
| `getMyBugStatistics` | 可选。禅道产品 ID。不传时统计跨所有产品指派给我的 Bug；传入时收窄到指定产品。 |
| `getMyWeeklyActivity` | 可选。禅道账号，例如 lixm1；不传时默认使用当前登录账号。 |

## Phase3A（story/testcase/plan/task 等写入）

| 命令 | 简介 |
| --- | --- |
| `batchCreateStories` | 产品 ID。对应 18.5 story/batchCreate 页面 productID 参数 |
| `batchEditStories` | 产品 ID。对应 18.5 story/batchEdit 页面 productID 参数 |
| `deleteStory` | 产品 ID。对应 18.5 story/export 页面 productID 参数 |
| `exportStories` | 产品 ID。对应 18.5 story/export 页面 productID 参数 |
| `updateStory` | 禅道 18.5 change story 必填 |
| `changeStory` | 禅道 18.5 change story 必填 |
| `createStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `closeStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `assignStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `activateStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `reviewStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `linkStoriesToStory` | 要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段 |
| `linkRequirements` | 需求 ID。对齐 18.5 story/recall 页面按钮，仅在状态为 reviewing/changing 时可撤回 |
| `unlinkStoryFromStory` | 需求 ID。对齐 18.5 story/recall 页面按钮，仅在状态为 reviewing/changing 时可撤回 |
| `recallStory` | 需求 ID。对齐 18.5 story/recall 页面按钮，仅在状态为 reviewing/changing 时可撤回 |
| `submitStoryReview` | 需求 ID。对齐 18.5 story/submitReview 提交评审按钮 |
| `processStoryChange` | 需求 ID。对齐 18.5 story/processStoryChange 确认变更按钮 |
| `batchReviewStories` | 要批量评审的需求 ID 列表，对应 18.5 story/batchReview 页面 storyIdList[] 字段 |
| `batchCloseStories` | 产品 ID。对齐 18.5 story/batchClose 页面 productID 参数 |
| `batchChangeStoryModule` | 要批量修改所属模块的需求 ID 列表，对应 18.5 story/batchChangeModule 页面 storyIdList[] 字段 |
| `batchChangeStoryPlan` | 要批量修改所属计划的需求 ID 列表，对应 18.5 story/batchChangePlan 页面 storyIdList[] 字段 |
| `batchChangeStoryBranch` | 要批量修改所属分支的需求 ID 列表，对应 18.5 story/batchChangeBranch 页面 storyIdList[] 字段 |
| `batchChangeStoryStage` | 要批量修改阶段的需求 ID 列表，对应 18.5 story/batchChangeStage 页面 storyIdList[] 字段 |
| `batchAssignStoriesTo` | 要批量指派的需求 ID 列表，对应 18.5 story/batchAssignTo 页面 storyIdList[] 字段 |
| `createTaskFromStory` | 指派人账号。禅道 18.5 创建任务必填 |
| `createTaskFromBug` | 所属项目 ID。按禅道页面转任务链路，需与 execution 一起显式提供 |
| `createTask` | - |
| `linkStoriesToPlan` | - |
| `unlinkStoriesFromPlan` | - |
| `linkBugsToPlan` | - |
| `unlinkBugsFromPlan` | - |

## Phase3B（execution/testtask/build/release 等写入）

| 命令 | 简介 |
| --- | --- |
| `updateExecution` | 所属项目 ID。禅道官方文档标为必填，建议从 getExecutionDetail 读回后原样传入 |
| `startExecution` | 格式 YYYY-MM-DD |
| `closeExecution` | 格式 YYYY-MM-DD |
| `suspendExecution` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `activateExecution` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `putoffExecution` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `computeCfd` | 执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent |
| `linkStoriesToExecution` | 要关联到执行的需求 ID 列表，对应 18.5 execution/linkStory 页面 stories[] 字段 |
| `unlinkStoryFromExecution` | 要从执行批量移除的需求 ID 列表，对应 18.5 execution/batchUnlinkStory 页面 storyIdList[] 字段 |
| `batchUnlinkStoriesFromExecution` | 要从执行批量移除的需求 ID 列表，对应 18.5 execution/batchUnlinkStory 页面 storyIdList[] 字段 |
| `batchChangeExecutionStatus` | 要变更状态的执行 ID 列表，对应 18.5 execution/batchChangeStatus 页面 executionIdList[] 字段 |
| `unlinkMemberFromExecution` | 要评估工时的成员账号数组，对应 18.5 story::saveEstimateInfo 页面 account[] 字段 |
| `deleteExecution` | 要评估工时的成员账号数组，对应 18.5 story::saveEstimateInfo 页面 account[] 字段 |
| `storyEstimate` | 要评估工时的成员账号数组，对应 18.5 story::saveEstimateInfo 页面 account[] 字段 |
| `addExecutionMember` | 要加入的成员账号数组。禅道 18.5 execution 模块无 addMember 控制器，真实写入走 manageMembers POST，对应 accounts[] 字段 |
| `linkStoryToExecutionSingle` | 所属产品 ID，CLI 内部编码为 products[storyId]=productId |
| `importBugToExecution` | 要导入的 Bug ID |
| `batchImportBugsToExecution` | 禅道 18.5 execution 模块无 batchImportBug 控制器，确认执行时会明确报错 |
| `addExecutionWhitelist` | 禅道 18.5 execution::addWhitelist 只 fetch 页面，真实写入在 personnel::addWhitelist，确认执行时会明确报错 |
| `unbindExecutionWhitelist` | 白名单关系 ID |
| `fixFirstExecution` | 必填数字 estimate，对应 18.5 execution::fixFirst 模型 is_numeric 校验；未传会在 API 层显式报错 |
| `updateExecutionOrder` | 要排序的执行 ID 数组。CLI 内部用逗号串提交到 18.5 execution::updateOrder 页面 executions 字段，对应 18.5 executionModel 期望格式 |
| `storySortExecution` | 要排序的需求 ID 数组。CLI 内部用逗号串提交到 18.5 execution::storySort 页面 storys 字段 |
| `createExecution` | 所属项目 ID，对齐禅道 18.5 execution/create 路径 {projectID} 段 |
| `batchEditExecutions` | 要批量编辑的执行 ID 列表，对应 18.5 execution/batchEdit 页面 executionIDList[] 字段 |
| `createBuild` | 格式 YYYY-MM-DD |
| `updateBuild` | 格式 YYYY-MM-DD |
| `linkStoriesToBuild` | 要关联到构建的需求 ID 列表，对应 18.5 build/linkStory 页面 stories[] 字段 |
| `unlinkStoryFromBuild` | 要从构建批量移除的需求 ID 列表，对应 18.5 build/batchUnlinkStory 页面 unlinkStories[] 字段 |
| `batchUnlinkStoriesFromBuild` | 要从构建批量移除的需求 ID 列表，对应 18.5 build/batchUnlinkStory 页面 unlinkStories[] 字段 |
| `linkBugsToBuild` | 要关联到构建的 Bug ID 列表，对应 18.5 build/linkBug 页面 bugs[] 字段 |
| `unlinkBugFromBuild` | 要从构建批量移除的 Bug ID 列表，对应 18.5 build/batchUnlinkBug 页面 unlinkBugs[] 字段 |
| `batchUnlinkBugsFromBuild` | 要从构建批量移除的 Bug ID 列表，对应 18.5 build/batchUnlinkBug 页面 unlinkBugs[] 字段 |
| `createTestCase` | 禅道 18.5 REST v1 创建用例不接收该字段，传入会被忽略 |
| `updateTestCase` | 禅道 18.5 REST v1 更新用例不接收该字段，传入会被忽略 |
| `confirmTestCaseStoryChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `confirmTestCaseLibcaseChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `ignoreTestCaseLibcaseChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `batchConfirmTestCaseStoryChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `linkBugToTestCase` | 要关联的 Bug ID 列表，对应 18.5 testcase/linkBugs 页面 bugIdList[] 字段 |
| `unlinkBugFromTestCase` | 要关联的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段 |
| `linkCasesToTestCase` | 要关联的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段 |
| `createBugFromTestCase` | 要批量创建的测试用例数组。每项对应 18.5 testcase/batchCreate 页面的一行，支持 title/type/pri/stage/module/story/branch/scene/color/needReview/steps |
| `batchCreateTestCases` | 要批量创建的测试用例数组。每项对应 18.5 testcase/batchCreate 页面的一行，支持 title/type/pri/stage/module/story/branch/scene/color/needReview/steps |
| `batchEditTestCases` | 测试用例行 JSON 数组。每项至少含 caseId/title/type/pri/module/story，对应 18.5 testcase/batchEdit 页面 caseIDList[] 与 title[id]/types[id]/pris[id]/modules[id]/story[id] 等字段 |
| `batchDeleteTestCases` | 要批量删除的测试用例 ID 列表，对应 18.5 testcase/batchDelete 页面 caseIDList[] 字段 |
| `batchChangeTestCaseBranch` | 要切换分支的测试用例 ID 列表，对应 18.5 testcase/batchChangeBranch 页面 caseIDList[] 字段 |
| `batchChangeTestCaseModule` | 要切换模块的测试用例 ID 列表，对应 18.5 testcase/batchChangeModule 页面 caseIDList[] 字段 |
| `batchChangeTestCaseType` | 目标用例类型，对应 18.5 testcase/batchCaseTypeChange 页面 type 字段 |
| `deleteTestCase` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `exportTestCases` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `exportTestCaseTemplate` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `importTestCases` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `importTestCasesFromLib` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `importTestCaseToLib` | 目标产品库 ID，对应 18.5 testcase/importToLib 路径 libID 段 |
| `reviewTestCase` | 要批量评审的测试用例 ID 列表，对应 18.5 testcase/batchReview 页面 caseIdList[] 字段 |
| `batchReviewTestCases` | 要批量评审的测试用例 ID 列表，对应 18.5 testcase/batchReview 页面 caseIdList[] 字段 |
| `confirmTestCaseChange` | 测试用例 ID，对应 18.5 testcase/confirmChange 路径 |
| `editTestCaseViaForm` | 测试用例 ID，对应 18.5 testcase/edit 路径 {id} 段 |
| `linkCasesToBug` | 要关联到 Bug 的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段 |
| `batchAssignTestCases` | 要批量分派的测试用例 ID 列表。禅道 18.5 无 testcase/batchAssignTo 控制器 |
| `createTestTask` | 所属项目 ID，实机验证发现当前实例创建测试单时必填 |
| `updateTestTask` | 格式 YYYY-MM-DD |
| `startTestTask` | 开始备注。对应 18.5 testtask/start 页面 comment 字段 |
| `activateTestTask` | 激活备注。对应 18.5 testtask/activate 页面 comment 字段 |
| `blockTestTask` | 阻塞备注。对应 18.5 testtask/block 页面 comment 字段 |
| `closeTestTask` | 实际完成时间。对应 18.5 testtask/close 页面 realFinishedDate 字段 |
| `deleteTestTask` | 测试单用例执行记录（testrun）的 ID，对应 18.5 testtask/unlinkCase 页面 rowID 参数 |
| `unlinkCase` | 测试单用例执行记录（testrun）的 ID，对应 18.5 testtask/unlinkCase 页面 rowID 参数 |
| `batchUnlinkCases` | 要从测试单批量移除的用例 ID 列表，对应 18.5 testtask/batchUnlinkCases 页面 caseIDList[] 字段 |
| `runCase` | testrun 记录 ID；与 caseID 二选一 |
| `batchRunTestCases` | 当 from=testtask 时必填 |
| `batchAssignTestTasks` | 要指派的用例 ID 列表，对应 18.5 testtask/batchAssign 页面 caseIDList[] 字段 |
| `importTestTaskUnitResult` | 测试单参与人账号列表，对应 18.5 testtask/importUnitResult 页面 members[] 字段 |
| `linkCaseToTestTask` | 要关联到测试单的用例 ID 列表，对应 18.5 testtask/linkCase 页面 caseIDList[] 字段 |

## Phase3C（product/project/program 等写入）

| 命令 | 简介 |
| --- | --- |
| `createProduct` | 产品类型，对应 18.5 product/create 页面 type 字段 |
| `editProduct` | 产品 ID 列表，对应 18.5 product/batchEdit 页面 productIdList[] 字段 |
| `batchEditProducts` | 产品 ID 列表，对应 18.5 product/batchEdit 页面 productIdList[] 字段 |
| `closeProduct` | 白名单账号数组，对应 18.5 product/addWhitelist 页面 accounts 字段 |
| `deleteProduct` | 白名单账号数组，对应 18.5 product/addWhitelist 页面 accounts 字段 |
| `addProductWhitelist` | 白名单账号数组，对应 18.5 product/addWhitelist 页面 accounts 字段 |
| `unbindProductWhitelist` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `setProductOrder` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductAll` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductTrack` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductWhitelist` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductDashboard` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductRoadmap` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductDynamic` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `exportProducts` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `createProject` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `editProject` | 格式 YYYY-MM-DD |
| `batchEditProjects` | 项目 ID 列表，对应 18.5 project/batchEdit 页面 projectIdList[] 字段 |
| `startProject` | 格式 YYYY-MM-DD |
| `suspendProject` | 格式 YYYY-MM-DD |
| `activateProject` | 格式 YYYY-MM-DD |
| `closeProject` | 格式 YYYY-MM-DD |
| `deleteProject` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `unlinkProjectMember` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `addProjectWhitelist` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `unbindProjectWhitelist` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `setProjectOrder` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectTeam` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectGroup` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectManageMembers` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectWhitelist` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectDynamic` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectLinkedProducts` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `createProjectGroup` | 项目 ID，对齐禅道 18.5 project/createGroup 路径 {projectID} 段 |
| `editProjectGroup` | 用户组 ID，对齐禅道 18.5 project/editGroup 路径 {groupID} 段。注意 18.x control.php editGroup 只接 groupID，不再含 projectID |
| `copyProjectGroup` | 源用户组 ID，对齐禅道 18.5 project/copyGroup 路径 {groupID} 段。projectID 服务端从 group 反查 |
| `createProgram` | 格式 YYYY-MM-DD |
| `editProgram` | 格式 YYYY-MM-DD |
| `startProgram` | 格式 YYYY-MM-DD |
| `activateProgram` | 格式 YYYY-MM-DD |
| `suspendProgram` | 格式 YYYY-MM-DD |
| `closeProgram` | 格式 YYYY-MM-DD |
| `deleteProgram` | 干系人账号数组，对应 18.5 program/batchUnlinkStakeholders 页面 userIdList[] 字段 |
| `createProgramStakeholder` | 干系人账号数组，对应 18.5 program/batchUnlinkStakeholders 页面 userIdList[] 字段 |
| `unlinkProgramStakeholder` | 干系人账号数组，对应 18.5 program/batchUnlinkStakeholders 页面 userIdList[] 字段 |
| `batchUnlinkProgramStakeholders` | 干系人账号数组，对应 18.5 program/batchUnlinkStakeholders 页面 userIdList[] 字段 |
| `unbindProgramWhitelist` | - |
| `setProgramOrder` | - |
| `getProgramAll` | - |
| `getProgramTrack` | - |
| `getProgramStakeholders` | - |

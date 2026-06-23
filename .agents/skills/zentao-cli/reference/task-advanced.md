# 任务高级操作

任务批量、状态变更、删除、工时调整等低频操作。日常主链路见 `task.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `startTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `pauseTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `restartTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
| `closeTask` | 取消备注。对应 18.5 task/cancel 页面里的 comment 字段。 |
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
| `batchToTaskStories` | JSON 字符串。数组项对应 18.5 batchToTask 表单行：{story,name,module?,assignedTo?,estStarted?,deadline?,type?,pri?,estimate?,color?} |

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
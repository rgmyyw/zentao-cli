# 任务 Task

## 查询

```bash
zentao getMyTasks
zentao getTaskDetail --taskId <id>
```

## 写入

```bash
zentao updateTask --taskId <id> --status done --confirm true
zentao finishTask --taskId <id> --confirm true
zentao recordTaskEstimate --taskId <id> --date <YYYY-MM-DD> --consumed 2 --left 8 --work <work> --confirm true
zentao editTaskEstimate --estimateId <effortId> --date <YYYY-MM-DD> --consumed 2 --left 8 --work <work> --confirm true
zentao deleteTaskEstimate --estimateId <effortId> --confirm true
zentao confirmTaskStoryChange --taskId <id> --confirm true
zentao cancelTask --taskId <id> --comment <comment> --confirm true
```

## 场景

- 看我的待办
- 改任务状态
- 完成任务
- 登记 / 编辑 / 删除任务工时
- 取消任务
- 确认任务关联需求变更

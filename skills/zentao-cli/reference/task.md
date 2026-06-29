# 任务 Task

## 查询

```bash
zentao getMyTasks
zentao getTaskDetail --taskId <id>
zentao getMyWeeklyActivity --startDate <YYYY-MM-DD> --endDate <YYYY-MM-DD>
```

说明：

- `getMyTasks --status done` 在部分禅道部署里拿不到已完成任务，因为“我的任务”接口本身只返回活跃任务或返回集不完整。
- 如果目标是查某一周 / 某一月的已完成任务，优先用 `getMyWeeklyActivity`，再读返回里的 `finishedTasks`。

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
- 看阶段内已完成任务（优先 `getMyWeeklyActivity`）
- 改任务状态
- 完成任务
- 登记 / 编辑 / 删除任务工时
- 取消任务
- 确认任务关联需求变更

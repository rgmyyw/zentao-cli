# Plan

## 查询

```bash
zentao getProductPlans --productId <productId>
zentao getPlanDetail --planId <id>
```

## 关系操作

```bash
zentao linkStoriesToPlan --planId <id> --storyIds <id1,id2>
zentao linkBugsToPlan --planId <id> --bugIds <id1,id2>
```

## 状态流转

```bash
zentao startPlan --planId <id> --confirm true
zentao finishPlan --planId <id> --confirm true
zentao activatePlan --planId <id> --confirm true
zentao closePlan --planId <id> --closedReason done --confirm true
```

## 场景

- 查看计划
- 关联需求 / Bug 到计划
- 启动 / 结束 / 激活 / 关闭计划

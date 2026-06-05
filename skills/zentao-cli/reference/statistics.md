# Statistics

## 查询

```bash
zentao getMyTaskStatistics
zentao getMyBugStatistics
zentao getMyBugStatistics --productId <productId>
```

## 场景

- 看个人任务统计
- 看个人 Bug 统计

说明：

- `getMyBugStatistics` 不传 `productId` 时，默认统计跨所有产品“指派给我的 Bug”
- 传 `productId` 时，只统计指定产品内我的 Bug

# Statistics

## 查询

```bash
zentao getMyTaskStatistics
zentao getMyBugStatistics
zentao getMyBugStatistics --productId <productId>
zentao getMyWeeklyActivity --account <account> --week last
zentao getMyWeeklyActivity --account <account> --dateRange 上周
zentao getMyWeeklyActivity --account <account> --dateRange 最近3天
zentao getMyWeeklyActivity --account <account> --dateRange 2026-05-28
zentao getMyWeeklyActivity --account <account> --startDate 2026-05-25 --endDate 2026-05-29
```

## 场景

- 看个人任务统计
- 看个人 Bug 统计
- 看指定账号上周 / 本周做了什么：解决 Bug、关闭 Bug、评论补充、指派流转、任务相关动作和每日清单

说明：

- `getMyBugStatistics` 不传 `productId` 时，默认统计跨所有产品“指派给我的 Bug”
- 传 `productId` 时，只统计指定产品内我的 Bug
- `getMyWeeklyActivity` 是近似读取：调用禅道旧版动态页面 JSON 获取动态原始数据，再按原始 `originalDate` / `date` 在客户端筛选日期范围，用于快速生成“我某段时间做了什么”清单
- 日期不要写死为周：优先支持 `--dateRange` 自然语言描述，也支持 `--startDate/--endDate` 和 `--days`
- `--dateRange` 支持示例：`上周`、`本周`、`今天`、`昨天`、`最近3天`、`3天前`、`2026-05-28`、`2026-05-25到2026-05-29`
- 未传日期范围时，默认兼容旧参数：`--week last` 映射 `lastWeek`，`--week this` 映射 `thisWeek`
- bug 转任务去重会优先识别动态记录中的来源 Bug 字段；如果动态记录没有来源 Bug 字段，该任务会按独立任务计数并在结果限制说明中提示

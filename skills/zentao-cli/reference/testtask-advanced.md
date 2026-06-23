# 测试单高级操作

测试单批量、用例运行、单位结果导入等低频操作。日常主链路见 `testtask.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `activateTestTask` | 激活备注。对应 18.5 testtask/activate 页面 comment 字段 |
| `blockTestTask` | 阻塞备注。对应 18.5 testtask/block 页面 comment 字段 |
| `deleteTestTask` | 测试单用例执行记录（testrun）的 ID，对应 18.5 testtask/unlinkCase 页面 rowID 参数 |
| `unlinkCase` | 测试单用例执行记录（testrun）的 ID，对应 18.5 testtask/unlinkCase 页面 rowID 参数 |
| `batchUnlinkCases` | 要从测试单批量移除的用例 ID 列表，对应 18.5 testtask/batchUnlinkCases 页面 caseIDList[] 字段 |
| `runCase` | testrun 记录 ID；与 caseID 二选一 |
| `batchRunTestCases` | 当 from=testtask 时必填 |
| `batchAssignTestTasks` | 要指派的用例 ID 列表，对应 18.5 testtask/batchAssign 页面 caseIDList[] 字段 |
| `importTestTaskUnitResult` | 测试单参与人账号列表，对应 18.5 testtask/importUnitResult 页面 members[] 字段 |
| `linkCaseToTestTask` | 要关联到测试单的用例 ID 列表，对应 18.5 testtask/linkCase 页面 caseIDList[] 字段 |

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
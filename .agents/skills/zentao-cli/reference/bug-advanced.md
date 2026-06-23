# Bug 高级操作

Bug 批量修改、状态变更、删除、关联等低频 / 批量操作。日常主链路见 `bug.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `okBug` | Bug ID。对齐禅道 18.5 bug/confirmStoryChange 页面按钮 |
| `confirmBugStoryChange` | Bug ID。对齐禅道 18.5 bug/confirmStoryChange 页面按钮 |
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

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
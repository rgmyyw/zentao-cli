# 测试用例高级操作

测试用例批量、导入、导出、用例库、关联等低频操作。日常主链路见 `testcase.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `confirmTestCaseStoryChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `confirmTestCaseLibcaseChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `ignoreTestCaseLibcaseChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `batchConfirmTestCaseStoryChange` | 要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段 |
| `confirmTestCaseChange` | 测试用例 ID，对应 18.5 testcase/confirmChange 路径 |
| `reviewTestCase` | 要批量评审的测试用例 ID 列表，对应 18.5 testcase/batchReview 页面 caseIdList[] 字段 |
| `batchReviewTestCases` | 要批量评审的测试用例 ID 列表，对应 18.5 testcase/batchReview 页面 caseIdList[] 字段 |
| `batchAssignTestCases` | 要批量分派的测试用例 ID 列表。禅道 18.5 无 testcase/batchAssignTo 控制器 |
| `linkBugToTestCase` | 要关联的 Bug ID 列表，对应 18.5 testcase/linkBugs 页面 bugIdList[] 字段 |
| `unlinkBugFromTestCase` | 要关联的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段 |
| `linkCasesToTestCase` | 要关联的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段 |
| `linkCasesToBug` | 要关联到 Bug 的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段 |
| `createBugFromTestCase` | 要批量创建的测试用例数组。每项对应 18.5 testcase/batchCreate 页面的一行，支持 title/type/pri/stage/module/story/branch/scene/color/needReview/steps |
| `batchCreateTestCases` | 要批量创建的测试用例数组。每项对应 18.5 testcase/batchCreate 页面的一行，支持 title/type/pri/stage/module/story/branch/scene/color/needReview/steps |
| `batchEditTestCases` | 测试用例行 JSON 数组。每项至少含 caseId/title/type/pri/module/story，对应 18.5 testcase/batchEdit 页面 caseIDList[] 与 title[id]/types[id]/pris[id]/modules[id]/story[id] 等字段 |
| `batchDeleteTestCases` | 要批量删除的测试用例 ID 列表，对应 18.5 testcase/batchDelete 页面 caseIDList[] 字段 |
| `batchChangeTestCaseBranch` | 要切换分支的测试用例 ID 列表，对应 18.5 testcase/batchChangeBranch 页面 caseIDList[] 字段 |
| `batchChangeTestCaseModule` | 要切换模块的测试用例 ID 列表，对应 18.5 testcase/batchChangeModule 页面 caseIDList[] 字段 |
| `batchChangeTestCaseType` | 目标用例类型，对应 18.5 testcase/batchCaseTypeChange 页面 type 字段 |
| `deleteTestCase` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `editTestCaseViaForm` | 测试用例 ID，对应 18.5 testcase/edit 路径 {id} 段 |
| `updateTestCaseOrder` | 拖拽排序后的场景/用例 ID 顺序，对应 18.5 testcase/updateOrder 页面 scenes 字段 |
| `exportTestCases` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `exportTestCaseTemplate` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `importTestCases` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `importTestCasesFromLib` | 目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段 |
| `importTestCaseToLib` | 目标产品库 ID，对应 18.5 testcase/importToLib 路径 libID 段 |

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
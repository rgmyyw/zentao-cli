# TestCase

## 查询

```bash
zentao getProductTestCases --productId <productId>
zentao getTestCaseDetail --testCaseId <id>
```

## 写入

```bash
zentao createTestCase --productId <productId> --title <title> --type feature --confirm true
zentao updateTestCase --testCaseId <id> --confirm true
zentao confirmTestCaseStoryChange --caseId <caseId> --confirm true
zentao confirmTestCaseLibcaseChange --caseId <caseId> --libcaseId <libcaseId> --confirm true
zentao ignoreTestCaseLibcaseChange --caseId <caseId> --confirm true
zentao batchConfirmTestCaseStoryChange --productId <productId> --caseIds <caseId> --caseIds <caseId> --confirm true
```

## 场景

- 创建 / 修改测试用例
- 确认测试用例关联需求变更
- 同步 / 忽略用例库变更
- 批量确认测试用例需求变更
- 查看产品用例列表

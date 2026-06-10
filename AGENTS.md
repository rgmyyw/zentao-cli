# AGENTS.md

给 AI Agent / Skill 维护者看的项目说明。README 面向用户，只保留图片、安装方式和场景化用法；实现细节、MVP 能力、已知限制和发布说明放在这里。

## 项目定位

`@cloudglab/zentao-cli` 是基于 TypeScript 重建的禅道命令行工具，优先适配禅道 `18.5` REST v1 API，并补充部分旧版页面 JSON 能力。

核心目标：把任务、Bug、需求、执行、测试、计划、构建、发布、动态和统计能力暴露给命令行、脚本和 AI Skill 使用。

## Agent 使用原则

- 优先使用本机 `zentao`。
- 未安装时，优先推荐一键安装：`npx -y @cloudglab/zentao-cli@latest install`。
- 当前环境不方便安装时，才临时使用 `npx -y @cloudglab/zentao-cli@latest`。
- 查询旧版禅道页面 URL 时，先解析路径里的对象类型和 ID，再调用 CLI 查询结构化数据。
- 默认支持写操作；真实写入仍必须传 `confirm=true`。如需禁用写操作，可设置 `ZENTAO_DISABLE_WRITE=true`。
- 如果遇到 `ECONNRESET` / TLS 断开，可重试一次；连续失败两次先报告网络阻塞。

## 角色入口

- `full`：完整能力。
- `dev`：开发常用任务、Bug、需求、执行、构建能力。
- `qa`：测试常用 Bug、任务、执行、产品、用例、测试单、构建、发布、统计、搜索能力。
- `pm`：产品 / 项目 / 需求 / 计划 / 执行管理能力。

角色只过滤 CLI 暴露命令，不改变禅道登录身份或服务端权限。

## 当前核心能力

- 登录和 token 管理：token 登录、token 失效后自动重试一次、明文密码失败时回退 MD5。
- 任务：`getMyTasks`、`getTaskDetail`、`updateTask`、`finishTask`。
- Bug：`getMyBugs`、`getProductBugs`、`getBugDetail`、`resolveBug`。
- 执行：`getExecutionDetail`、`getProjectExecutions`、`getExecutionBugs`、`getExecutionBuilds`、`getExecutionDynamic`、`getExecutionDailyBugStats`。
- 统计：`getMyTaskStatistics`、`getMyBugStatistics`、`getMyWeeklyActivity`。
- 需求：`getStoryDetail`、`getProductStories`、`searchStories`、`searchStoriesByProductName`、`updateStory`、`changeStory`。
- 产品 / 项目 / 计划：`getProducts`、`getProductDetail`、`getProjects`、`getProjectDetail`、`getProductPlans`、`getPlanDetail`。
- 测试：`getProductTestCases`、`getTestCaseDetail`、`getTestTasks`、`getTestTaskDetail`、`createTestCase`、`updateTestCase`、`createTestTask`、`updateTestTask`。
- 构建 / 发布：`getProjectBuilds`、`getBuildDetail`、`getExecutionBuilds`、`createBuild`、`updateBuild`、`getProjectReleases`。
- 评论 / 动态：`getComments`，以及 execution / user dynamic 的近似读取能力。
- 关联能力：`getStoryRelatedBugs`、`getBugRelatedStory`、`getDevelopmentContext`、`createTaskFromStory`、`createTaskFromBug`、`linkStoriesToPlan`、`unlinkStoriesFromPlan`、`linkBugsToPlan`、`unlinkBugsFromPlan`。

## 场景能力说明

### URL 解析

- `execution-bug-2130.html`：解析为 execution ID `2130` 的 Bug 列表，命令 `getExecutionBugs --executionId 2130 --limit 100`。
- `execution-build-2130.html`：解析为 execution ID `2130` 的版本 / 构建列表，命令 `getExecutionBuilds --executionId 2130`。
- `execution-dynamic-2130.html`：解析为 execution ID `2130` 的执行动态，命令 `getExecutionDynamic --executionId 2130`。

### 我的任务

`getMyTasks` 支持 `status`、`limit`、`page`。如果服务端忽略部分过滤参数，CLI 会尽量拉取后在客户端分页 / 过滤，并在返回中标明 `source`、`total`、`scanned`。

### 我的阶段性工作清单

`getMyWeeklyActivity` 支持：

- `--week last` / `--week this`
- `--dateRange 上周`
- `--dateRange 最近3天`
- `--dateRange 2026-05-28`
- `--dateRange 2026-05-25到2026-05-29`
- `--startDate YYYY-MM-DD --endDate YYYY-MM-DD`
- `--days N`

它基于旧版 dynamic JSON 和客户端日期过滤，输出解决 Bug、关闭 Bug、评论、指派 / 流转、任务动作、每天清单和去重工作事项。

限制：Bug 转任务会尽量按来源 Bug 字段合并，识别不到来源 Bug 的任务会单独计数。

### 每日迭代执行统计

`getExecutionDailyBugStats --executionId <id> --iterationName <name> [--date YYYY-MM-DD]` 输出：

- Bug 摘要：总数、延期处理、reopen、已关闭、已解决、未解决、测试未及时关闭、开发今日未及时解决。
- 严重程度分布：按 `severity` 汇总。
- 任务摘要：总任务、已完成 / 进行中 / 未开始 / 已取消、今日完成、逾期未完成、Bug 转任务、预计 / 消耗工时。
- 参与人员：Bug 负责情况、任务负责情况；会尽量通过 `/users/{account}` 把账号转成中文姓名。
- 问题明细：reopen、延期、测试未关闭、开发未解决、今日完成任务、逾期任务、Bug 转任务。
- 统计口径：在 `report` 末尾输出。

限制：

- reopen 当前使用 `activatedCount > 0`，是历史累计，不一定等于今天 / 当前迭代发生的 reopen。
- Bug 负责人优先级：`resolvedBy > assignedTo > openedBy`。
- 任务负责人优先级：`finishedBy > assignedTo > openedBy`。
- 任务统计来自 `/executions/{id}/tasks`，不同禅道版本的分页行为可能不同。

## 禅道 18.5 已知限制

- `getExecutionDynamic` 是近似读取：调用 `GET /executions/{id}?fields=dynamics`，不是旧版 `execution-dynamic` 页面完整等价实现。
- `getComments` 在禅道 18.5 上会 fallback 到对象详情里的 `actions`，返回结果会标注 `source: "actions-fallback"`。
- `addComment`：禅道 18.5 v1 没有 `/comment` REST entry，已改为走旧版 `action-comment-{type}-{id}.json` 控制器。非 API 模式返回 HTML（js::reload），客户端通过响应模式判定成功。
- `updateTask` 和 `updateStory`：禅道 18.5 Task PUT / Story PUT 的 `batchSetPost` 字段列表不包含 `comment`，无法直接通过 PUT 写备注，备注请通过 `finishTask` / `resolveBug` / `changeStory` 等状态变更操作附带。
- `updateExecution`：禅道 18.5 REST PUT 在启用迭代代号时 `code` 字段拼接缺逗号，已改为走旧版 `execution-edit-{id}.json` 控制器。
- `updateTestTask`：禅道 18.5 v1 没有 testtask PUT 入口，已改为走旧版 `testtask-edit-{id}.json` 控制器。
- `createTaskFromBug` 只保证基于 Bug 预填任务内容并尝试创建任务，不保证创建后自动建立 Bug 关联。

## 写操作保护

默认支持写操作；真实写入仍必须传 `confirm=true`。

如需禁用写操作，可设置 `ZENTAO_DISABLE_WRITE=true`。

默认 preview 或直接返回诊断，不应静默写入线上。

## 环境变量

一键安装 CLI + Skill，并校验禅道配置：

```bash
npx -y @cloudglab/zentao-cli@latest install
```

该命令会依次安装全局 CLI、安装 skill，并在禅道配置缺失或登录校验失败时引导输入配置。

```bash
export ZENTAO_URL="https://zentao.cloudglab.cn"
export ZENTAO_USERNAME="your-account"
export ZENTAO_PASSWORD="your-password"
export ZENTAO_API_VERSION="v1"
# 可选：非标准部署时直接指定完整 API 基础地址
# export ZENTAO_API_BASE_URL="https://zentao.cloudglab.cn/custom/api.php/v1"
```

`ZENTAO_URL` 传根域名即可，不要带 `/zentao`。

`initZentao` 默认只校验并在当前进程内生效，不会自动把密码写入 `~/.zentao/config.json`；只有显式传 `save: true` 才会落盘。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm build
```

不要在未被明确要求时提交代码。

## 发布链路

已内置 GitHub Actions：push 形如 `v*` 的 tag 时会安装依赖、执行 `pnpm check`、发布 npm 包。GitHub Release 由项目级 `/release` 流程手动创建，Actions 不自动创建 Release。

工作流文件：`.github/workflows/publish.yml`。

发版前确保：

- `package.json` 中的 `version` 与 tag 一致。
- 本地先运行 `pnpm check`，再运行 `pnpm release:smoke-query` 做查询回归；默认使用执行 `2140` 及其关联固定数据：`ZENTAO_SMOKE_ACCOUNT=lixm1`、`ZENTAO_SMOKE_PRODUCT_ID=153`、`ZENTAO_SMOKE_PROJECT_ID=1772`、`ZENTAO_SMOKE_PROGRAM_ID=620`、`ZENTAO_SMOKE_STORY_ID=10154`、`ZENTAO_SMOKE_BUG_ID=84362`、`ZENTAO_SMOKE_TASK_ID=79922`、`ZENTAO_SMOKE_BUILD_ID=5648`、`ZENTAO_SMOKE_PLAN_ID=360`、`ZENTAO_SMOKE_TEST_CASE_ID=58191`、`ZENTAO_SMOKE_TEST_TASK_ID=2319`；`getProjectReleases` 因当前账号常见 403 默认跳过，如需覆盖可设置 `ZENTAO_SMOKE_RELEASE_PROJECT_ID`；如数据变化，可用同名环境变量覆盖。
- npm 包已配置 GitHub Actions trusted publisher，绑定仓库 `cloudglab/zentao-cli`。

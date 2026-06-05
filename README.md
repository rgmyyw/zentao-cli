# @cloudglab/zentao-cli

基于 TypeScript 重建的禅道命令行工具，优先适配当前禅道 `18.5` 的 REST v1 API。

![zentao-cli hero](./assets/readme/zentao-cli-hero.png)

> 把任务、Bug、需求、测试、计划、构建、发布这些禅道操作，直接接进本地 `zentao` 命令，给命令行、脚本和 skill 调用。

## 亮点

- `60` 个 CLI 命令，覆盖任务、Bug、需求、执行、测试、计划、构建、发布、搜索等核心场景
- `4` 个内置角色：`Dev / QA / PM / Full`
- 基于 TypeScript 重建，优先适配禅道 `18.5` REST v1 API
- 发布产物运行时目标：`Node.js >= 16`
- 默认写保护，写操作需要显式开启并确认，更适合接入智能体和自动化流程

## 快速开始

环境要求：`Node.js >= 16`

### 安装

```bash
# 运行时要求：Node.js >= 16

# 直接运行
npx -y @cloudglab/zentao-cli@latest

# 全局安装
npm i -g @cloudglab/zentao-cli@latest
```

### 配置

```bash
export ZENTAO_URL="https://your-zentao.example.com"
export ZENTAO_USERNAME="your-account"
export ZENTAO_PASSWORD="your-password"
export ZENTAO_API_VERSION="v1"

# 可选：非标准部署时指定完整 API 基础地址
# export ZENTAO_API_BASE_URL="https://your-zentao.example.com/custom/api.php/v1"
```

### 运行

```bash
# 查看帮助 / 版本
zentao help
zentao --version

# 默认 full 角色
zentao list
zentao getMyTasks --status all --limit 20

# 按角色启动
zentao --role dev getMyTasks --status all
zentao --role qa getMyBugs --limit 50
zentao --role pm getProducts

# 也可以直接用 npx
npx -y @cloudglab/zentao-cli@latest --role qa getMyBugs --limit 50
```

## 使用方式

### CLI

适合手动查数据、排查问题、批量执行脚本。

常见场景：
- 查我的任务 / Bug / 统计
- 查询需求、执行、计划、构建、发布
- 创建或更新任务、测试用例、测试单
- 做任务流转、Bug 处理、批量排期、回填工时、同步状态
- 通过 `Dev / QA / PM / Full` 角色入口提供差异化能力

### 智能体 / Skill 接入建议

推荐顺序：

1. 先检查本机有没有 `zentao`
2. 没有就安装：`npm i -g @cloudglab/zentao-cli@latest`
3. skill 内优先调用本地 `zentao`
4. 只在不能安装时，才退回 `npx -y @cloudglab/zentao-cli@latest`

常用检查命令：

```bash
command -v zentao
zentao --version
```

skill / 自动化里推荐直接执行：

```bash
zentao --role qa getMyBugs --limit 50
zentao getProductBugs --productId 123 --status all --limit 100
```

### Skill

适合把当前能力包装成可复用的 AI Skill，对外推广更友好。

相关文档：
- `skills/zentao-cli/reference/overview.md`
- `skills/zentao-cli/reference/install.md`

安装 skill 时，统一走：

```bash
npx skills add @cloudglab/zentao-cli -g
```

skill 内部入口建议：

- 优先：`zentao`
- 或按角色：`zentao --role qa`
- 无本地安装时兜底：`npx -y @cloudglab/zentao-cli@latest`

适合场景：
- 给团队成员提供统一入口
- 给非开发用户提供更低门槛的禅道操作方式
- 做内部推广和标准化接入

## 当前 MVP 能力

- token 登录：仅在明确鉴权失败时才从明文密码回退到 MD5
- 登录错误分类：区分账号密码错误、token 接口不存在、网络失败、服务端异常
- 自动清洗 PHP warning + JSON 混合响应
- `getMyTasks`
- `getTaskDetail`
- `getBugDetail`
- `getStoryDetail`
- `getExecutionDetail`
- `getExecutionBugs`
- `getMyBugs`
- `getProductBugs`
- `getComments`
- 写操作 preview：`updateTask`、`finishTask`、`resolveBug`、`addComment`
- `getMyProfile`
- `getMyTaskStatistics`
- `getMyBugStatistics`
- `getStoryRelatedBugs`
- `getBugRelatedStory`
- `getDevelopmentContext`
- `getProducts` / `getProductDetail`
- `getProjects` / `getProjectDetail`
- `getProjectExecutions` / `getExecutionBuilds`
- `getProductStories`
- `getProductTestCases` / `getTestCaseDetail`
- `getTestTasks` / `getTestTaskDetail`
- `getPrograms` / `getProgramDetail`
- `getProductPlans` / `getPlanDetail`
- `getProjectBuilds` / `getBuildDetail`
- `getProjectReleases`
- `searchStories`
- `searchStoriesByProductName`
- `updateStory` / `changeStory`（默认 preview）
- `createTaskFromStory` / `createTaskFromBug`（默认 preview）
- `linkStoriesToPlan` / `unlinkStoriesFromPlan`（默认 preview）
- `linkBugsToPlan` / `unlinkBugsFromPlan`（默认 preview）
- `updateExecution` / `startExecution` / `closeExecution` / `suspendExecution` / `activateExecution` / `putoffExecution`（默认 preview）
- `createBuild` / `updateBuild`（默认 preview）
- `createTestCase` / `updateTestCase`（默认 preview）
- `createTestTask` / `updateTestTask`（默认 preview）

`updateExecution` 按禅道 18.5 REST v1 文档/源码需要保留/传入：

- `project`
- `name`
- `code`
- `begin`
- `end`

注意：`updateExecution` 在禅道 18.5 且后台启用代号时存在服务端源码问题：`api/v1/entries/execution.php` 中 `$fields .= 'code'` 缺少前置逗号，导致请求体里的 `code` 不会进入服务端 `$_POST`，服务端会误报 `『迭代代号』不能为空。`。客户端无法稳定绕过；工具仍保留，但调用时会直接返回该诊断错误，不做真实写入。

`createBuild` 当前按禅道 18.5 实机/参考包契约使用 `POST /projects/{project}/builds`，通常需要提供：

- `project`
- `execution`
- `product`
- `name`
- `builder`

补充说明：

- `createTaskFromStory` / `createTaskFromBug` 在当前实例上实机验证发现通常需要额外提供：
  - `assignedTo`
  - `estStarted`
  - `deadline`
- `createTaskFromBug` 当前只保证：
  - 基于 Bug 预填任务内容并尝试创建任务
  - 不保证创建后自动建立 Bug 关联
- 角色工具过滤：`full` / `dev` / `qa` / `pm`
- 写操作保护 helper：默认禁用写操作，后续写工具必须配合 `ZENTAO_ENABLE_WRITE=true` 和 `confirm: true`；已知 18.5 不支持或服务端有缺陷的写工具会保留入口，但调用时直接返回明确诊断错误。
- Phase 3B 写工具（execution / build / testcase / testtask）默认同样返回 preview，真实执行仍需 `ZENTAO_ENABLE_WRITE=true` + `confirm=true`：
  - execution：`updateExecution` / `startExecution` / `closeExecution` / `suspendExecution` / `activateExecution` / `putoffExecution`
  - build：`createBuild` / `updateBuild`
  - testcase：`createTestCase` / `updateTestCase`
  - testtask：`createTestTask` / `updateTestTask`
  - 角色权限：
    - `full` 拥有 `execution-write` + `build-write` + `testcase-write` + `testtask-write`
    - `dev` 拥有 `execution-write` + `build-write`
    - `pm` 仅拥有 `execution-write`
    - `qa` 拥有 `testcase-write` + `testtask-write`
- `createTestCase` / `updateTestCase` 当前按禅道 18.5 REST v1 契约：
  - 创建路径：`POST /products/{productId}/testcases`
  - 更新路径：`PUT /testcases/{testCaseId}`
  - `steps` 数组每项形如 `{ desc, expect, type? }`，`type` 支持 `step` / `item` / `group`，默认 `step`
  - `module` / `story` 允许传 `0` 表示无模块 / 无关联需求
- `project` / `execution` / `keywords` 不是禅道 18.5 REST v1 用例创建/更新 entry 接收字段，传入会被服务端忽略；18.5 v1 创建的是产品用例，不会直接绑定项目/执行。
- `createTestTask` 当前按禅道 18.5 REST v1 契约：
  - 创建路径：`POST /projects/{project}/testtasks`
  - 创建必填：`project` / `productID` / `name` / `build` / `begin` / `end`，`begin` / `end` 格式 `YYYY-MM-DD`
  - 创建请求体实际使用 `product` 字段，工具入参保留 `productID` 并在 API 层映射
  - `build` 兼容数字 ID 和字符串 ID
  - `createTestTask` 当前实例真实写验证通过
- `updateTestTask`：禅道 18.5 v1 `api/v1/entries/testtask.php` 只有 `get/delete`，没有 `put` 更新入口。工具仍保留，但调用时会直接返回该诊断错误，不做真实写入。
- `linkBugsToPlan` 已按 18.5 源码修正为 `POST /productplans/{planId}/linkbugs`。
- `finishTask` 已按 18.5 源码改为 `POST /tasks/{taskId}/finish`，需要 `currentConsumed` / `realStarted` / `finishedDate`。
- `addComment`：禅道 18.5 v1 没有 `comment/comments` entry，当前只支持 `getComments` 从对象详情 actions 回退读取；`addComment` 工具仍保留，但调用时会直接返回该诊断错误。
- token 失效后自动重试一次
- 可选 `ZENTAO_API_BASE_URL`：用于非标准 `/zentao/api.php/v1` 部署

## 配置

说明：

- `getMyBugs` 当前默认语义是“跨所有产品指派给我的 Bug”；传 `productId` 时收窄到指定产品。
- `getMyBugStatistics` 默认统计跨所有产品指派给我的 Bug；传 `productId` 时收窄到指定产品。
- `getComments` 在禅道 18.5 上会 fallback 到对象详情里的 `actions`，返回结果会明确标注 `source: "actions-fallback"`。
- `updateTask` / `finishTask` 不会默认修改 `assignedTo`，只有显式传入才会更新指派人。

支持环境变量：

```bash
export ZENTAO_URL="https://zentao.cloudglab.cn"
export ZENTAO_USERNAME="your-account"
export ZENTAO_PASSWORD="your-password"
export ZENTAO_API_VERSION="v1"
# 可选：非标准部署时直接指定完整 API 基础地址
# export ZENTAO_API_BASE_URL="https://zentao.cloudglab.cn/custom/api.php/v1"
```

注意：`ZENTAO_URL` 传根域名即可，不要带 `/zentao`。

`initZentao` 现在默认只校验并在当前进程内生效，不会自动把密码写入 `~/.zentao/config.json`。
只有显式传 `save: true` 才会落盘。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm build
```

## 发布链路

已内置 GitHub Actions：当你 push 形如 `v*` 的 tag 时，会自动：

1. 安装依赖
2. 执行 `pnpm typecheck`
3. 执行 `pnpm build`
4. 发布 npm 包到 registry
5. 自动创建对应 GitHub Release

工作流文件：

- `.github/workflows/publish.yml`

### 使用前准备

1. 先把代码推到 GitHub 仓库
2. 在 npm 上为 `@cloudglab/zentao-cli` 配置 GitHub Actions trusted publisher，绑定仓库 `cloudglab/zentao-cli`
3. 确保 `package.json` 中的 `version` 与你要打的 tag 一致

### 发版方式

例如当前 `package.json` 版本是 `0.1.0`，则发版命令：

```bash
git tag v0.1.0
git push origin v0.1.0
```

工作流会校验：

- tag `v0.1.0` 是否与 `package.json` 中的 `0.1.0` 一致

如果不一致，Action 会直接失败，避免把错误版本发布到 npm。

### 推荐顺序

```bash
# 1. 修改 package.json version
# 2. 提交代码
# 3. 推送分支
# 4. 打 tag
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

### 当前还未自动完成的部分

下面这些仍需要你首次手动完成一次：

- 初始化本地 git 仓库
- 首次 commit
- 创建 GitHub 仓库并 push 上去
- 在 npm 包侧完成 trusted publisher 绑定

## 启动

```bash
pnpm dev
```

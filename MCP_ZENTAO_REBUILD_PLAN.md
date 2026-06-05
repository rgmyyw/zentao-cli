# mcp-zentao 重建计划

## 目标

在 `/Users/lixiaoming/Desktop/doing/zentao-cli` 中重建一个新的禅道 MCP 项目。

目标不是 1:1 反编译原作者源码，而是基于现有可运行产物和已验证行为，写一个结构清晰、可维护、适配当前禅道 18.5 的 TypeScript 项目。

## 当前依据

参考来源：

- 全局包：`@zzp123/mcp-zentao@1.18.15`
  - 路径：`~/.nvm/versions/node/v20.19.2/lib/node_modules/@zzp123/mcp-zentao`
  - 主要参考：`dist/api/zentaoApi.js`、`dist/index.js`、`dist/index-dev.js`、`README.md`
- 本地 Legacy 项目：`/Users/lixiaoming/Desktop/open/mcp-zentao-11-3`
  - 主要参考：导出、批量处理、AI 摘要、图片下载等能力
- 当前环境验证结果：
  - 禅道版本：`18.5`
  - 地址根域名：`https://zentao.cloudglab.cn`
  - 实际 API 路径：`/zentao/api.php/v1`
  - `zentao-cli` 依赖 v2，不适配当前环境
  - `@zzp123/mcp-zentao` 补丁后可用

## 已验证的关键行为

### 认证

当前禅道 `18.5` 的 token 接口：

```txt
POST /zentao/api.php/v1/tokens
```

要求：

- 密码优先使用明文
- 部分环境可能需要 MD5，因此保留 MD5 回退

认证逻辑：

1. 先用明文密码请求 token
2. 明文失败后再用 MD5 密码请求 token
3. 成功后请求头携带：`Token: <token>`

### 脏 JSON 响应清洗

当前服务端会在 JSON 前输出 PHP warning，例如：

```html
<br />
<b>Deprecated</b>: ...
{"token":"..."}
```

因此 HTTP 层必须实现：

1. 如果响应已经是 object，直接返回
2. 如果响应是 string，查找第一个 `{` 或 `[`
3. 截取 JSON 部分后再 `JSON.parse`

### 已验证 API

这些接口已经在当前环境验证可用：

```txt
GET /tasks
GET /bugs/:id
GET /stories/:id
GET /executions/:id
GET /executions/:id/bugs
```

其中：

- `getMyTasks()` 成功
- `getBugDetail(84362)` 成功
- `getStoryDetail(9680)` 成功
- `getExecutionDetail(2140)` 成功
- `request('GET', '/executions/2140/bugs')` 成功

## 技术栈

建议：

- TypeScript
- Node.js >= 20
- `@modelcontextprotocol/sdk`
- `zod`
- `axios` 或 `ofetch`
- `tsx` 用于本地开发
- `tsc` 用于类型检查和构建
- `oxlint` 用于 lint
- `oxfmt` 可用于格式化，先试点

不建议一开始使用 OXC 作为主构建系统。当前项目更适合：

```txt
TypeScript + tsc + oxlint + oxfmt
```

## 推荐目录结构

```txt
src/
  bin/
    zentao.ts
    zentao-dev.ts
    zentao-pm.ts
    zentao-qa.ts

  core/
    auth.ts
    config.ts
    errors.ts
    http.ts
    roles.ts
    tool-registry.ts
    transport.ts

  api/
    bug.ts
    build.ts
    comment.ts
    execution.ts
    feedback.ts
    file.ts
    product.ts
    project.ts
    story.ts
    task.ts
    testcase.ts
    ticket.ts
    user.ts

  tools/
    bug.ts
    comment.ts
    execution.ts
    init.ts
    product.ts
    story.ts
    task.ts
    shared.ts

  schemas/
    bug.ts
    execution.ts
    story.ts
    task.ts

  types/
    common.ts
    zentao.ts

  utils/
    date.ts
    html.ts
    json.ts
    markdown.ts
```

## 核心模块设计

### `core/http.ts`

职责：

- 创建 HTTP client
- 统一拼接 API base URL
- 注入 `Token` header
- 清洗 PHP warning 脏响应
- 统一错误格式

必须内置：

```ts
sanitizeJsonLikeResponse(data)
```

### `core/auth.ts`

职责：

- 获取 token
- 明文优先
- MD5 回退
- 缓存 token
- 后续可扩展 401 自动重登

### `core/config.ts`

职责：

- 读取环境变量
- 读取本地配置
- 保存配置

建议支持：

```txt
ZENTAO_URL
ZENTAO_USERNAME
ZENTAO_PASSWORD
ZENTAO_API_VERSION
```

本地配置路径建议：

```txt
~/.zentao/config.json
```

### `core/transport.ts`

职责：

- 启动 stdio MCP server
- 后续支持 HTTP transport

### `core/tool-registry.ts`

职责：

- 统一注册所有工具
- 根据角色过滤工具

不要复制四份入口文件。

推荐方式：

```ts
registerTools(server, { role: 'dev' })
```

## 角色设计

### full

完整能力，适合维护和排查。

### dev

开发常用：

- task 查询、更新、完成
- bug 查询、解决、评论
- story 查询
- execution 查询
- build 查询

### qa

测试常用：

- bug 查询、创建、解决
- testcase 查询
- testtask 查询
- story 查询

### pm

产品常用：

- product
- story
- requirement
- plan
- feedback
- project

## 分阶段计划

### 阶段 0：项目初始化

产出：

- `package.json`
- `tsconfig.json`
- `oxlint` 配置
- `src/` 基础目录
- `README.md`
- 基础 bin 入口

验收：

```bash
pnpm install
pnpm typecheck
pnpm lint
```

### 阶段 1：MVP 内核

实现：

- `core/config.ts`
- `core/http.ts`
- `core/auth.ts`
- `core/transport.ts`
- `core/tool-registry.ts`
- `tools/init.ts`

验收：

- 能启动 MCP server
- 能读取配置
- 能拿到 token
- 能清洗 PHP warning

### 阶段 2：开发最小闭环

实现 API：

- `api/task.ts`
- `api/bug.ts`
- `api/story.ts`
- `api/execution.ts`

实现工具：

- `getMyTasks`
- `getTaskDetail`
- `getBugDetail`
- `getStoryDetail`
- `getExecutionDetail`
- `getExecutionBugs`

验收：

- `getBugDetail(84362)` 成功
- `getExecutionBugs(2140)` 成功
- `getStoryDetail(9680)` 成功

### 阶段 3：开发常用写操作

实现：

- `updateTask`
- `finishTask`
- `resolveBug`
- `addComment`

注意：

- 写操作必须由调用方确认后再执行
- 先做只读验证，再做写操作

### 阶段 4：完整模块迁移

按优先级迁移：

1. task
2. bug
3. story
4. execution
5. product
6. project
7. build
8. testcase
9. file
10. comment
11. feedback
12. ticket
13. user

### 阶段 5：吸收 Legacy 项目增强能力

从 `/Users/lixiaoming/Desktop/open/mcp-zentao-11-3` 借鉴：

- `batchUpdateTasks`
- `batchResolveBugs`
- `getStoryRelatedBugs`
- `getBugRelatedStory`
- `exportStory`
- `exportBug`
- `exportItems`
- Markdown 格式化
- 图片下载
- story/bug/task 分析摘要
- 下一步建议

### 阶段 6：角色入口和发布准备

实现 bin：

- `zentao`
- `zentao-dev`
- `zentao-qa`
- `zentao-pm`

验收：

- 每个 bin 可启动
- 工具数量符合角色配置
- 文档和实际工具一致

## API 优先级清单

### P0

必须先实现：

- token 登录
- request
- response sanitize
- getMyTasks
- getBugDetail
- getStoryDetail
- getExecutionBugs
- getExecutionDetail

### P1

开发日常需要：

- updateTask
- finishTask
- resolveBug
- addComment
- getProductBugs
- getProductStories

### P2

完整能力：

- createTask
- createBug
- createStory
- product/project/execution CRUD
- testcase
- build
- file upload/download

### P3

增强体验：

- Markdown 导出
- 图片下载
- 批量处理
- AI 摘要
- 智能建议

## 与现有包的差异目标

新项目不要重复旧包的问题：

- 不要一个 1400 行 `ZentaoAPI` 大文件
- 不要四份入口复制大量代码
- 不要 README 工具数和真实工具数不一致
- 不要把补丁脚本作为长期方案
- 不要默认强制 MD5 密码
- 不要忽略 PHP warning 脏响应

新项目需要内置：

- 明文密码优先
- MD5 回退
- PHP warning 清洗
- execution bug list 正式方法
- 可扩展的角色工具过滤
- 后续可加 401 自动重登

## 验收基准

最小验收：

```txt
getToken 成功
getMyTasks 成功
getBugDetail(84362) 成功
getExecutionBugs(2140) 成功
getStoryDetail(9680) 成功
```

完整验收：

```txt
dev 角色可完成日常开发相关任务
full 角色覆盖当前 @zzp123/mcp-zentao 的主要能力
导出能力覆盖 mcp-zentao-11-3 的 Markdown + 图片下载场景
```

## 后续第一步

建议下一步直接初始化项目：

```bash
pnpm init
pnpm add @modelcontextprotocol/sdk zod axios
pnpm add -D typescript tsx oxlint
```

然后优先实现：

```txt
src/core/http.ts
src/core/auth.ts
src/api/bug.ts
src/api/execution.ts
src/tools/bug.ts
src/tools/execution.ts
```

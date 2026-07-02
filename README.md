# @cloudglab/zentao-cli

![zentao-cli hero](./assets/readme/zentao-cli-hero.png)

把禅道任务、Bug、需求、执行、测试、构建、动态和统计能力接到命令行，方便在终端、脚本、CI 和 AI Skill 里直接调用。

除了标准 REST API，本工具还补充了部分扩展场景：会在必要时读取页面 JSON、详情页动作记录，或模拟禅道前端请求，把标准接口不好覆盖的查询、统计和流转动作封装成可调用命令。

[文档](https://cloudglab.github.io/zentao-cli/)

## 核心能力

- 覆盖禅道任务、Bug、需求、执行、测试、构建、发布、动态与统计等常见终端工作流。
- 在标准 REST API 之外，补充 legacy 页面 JSON、动作记录、URL 意图解析等扩展场景，用来覆盖标准接口不完整的查询和流转动作。
- 支持附件上传/下载、富文本写入兼容、`whoami`、`changelog`、`parseUrlIntent`、安装/更新/卸载等内置链路。
- 写命令统一要求显式传入 `--confirm true`；未确认时返回 preview，不直接发起写请求。
- 支持 `compact / normal / verbose / pretty` 输出模式，适合终端查看、脚本消费和 Agent 调用。

## 典型用法

- 富文本写入：
  ```bash
  zentao updateTask --taskId 80704 --desc '<h3>标题</h3><p>正文</p>' --confirm true
  zentao updateTask --taskId 80704 --comment '<p>补充说明</p>' --confirm true
  ```
- 附件工作流：
  ```bash
  zentao uploadFile --uid task-attach-1 --file /path/to/screenshot.png
  zentao createTask --execution 2140 --name "修复登录 bug" --type devel \
    --assignedTo dev --estStarted 2026-06-26 --deadline 2026-06-30 \
    --uid task-attach-1 --confirm true
  ```
- URL 解析：
  ```bash
  zentao parseUrlIntent --url "https://your-zentao.example.com/zentao/bug-view-84362.html"
  ```
- 直接贴 URL：`zentao program-view-620.html`、`zentao todo-view-2319.html` 可直接跳到详情命令；`zentao doc-view-12.html` 会返回 explain JSON 和候选命令。
- Skill 文档采用 2 级索引：先看 `SKILL.md` 的 Reference 路由表，按场景跳到 `reference/<场景>.md`；批量 / 状态变更 / 管理员命令下沉到 `reference/<场景>-advanced.md`；不确定命令是否存在直接看 `reference/cheatsheet.md`。

## 版本要求

- **禅道版本**：优先适配禅道 **18.5** 的 REST v1 API，部分扩展能力依赖旧版页面 JSON，建议目标环境为 18.x 系列。
- **Node.js 版本**：需要 **Node.js >= 16.0.0**。推荐在 Node 18/20/22 LTS 上运行，以获得更稳定的 `fetch`、定时器和子进程行为。

## 安装方式

### 一键安装 CLI + Skill

```bash
npx -y @cloudglab/zentao-cli@latest install
```

该命令会安装全局 CLI 和内置 Skill，并在禅道配置缺失或登录校验失败时引导输入配置。配置完成后可以执行写操作；真实写入仍需要显式传入 `confirm=true`，也可以通过 `ZENTAO_DISABLE_WRITE=true` 临时禁用写入。

安装成功后会打印 `zentao-cli` ASCII 标识、快速开始命令和写操作提示，便于直接复制下一步命令：

```text
快速开始：
  zentao help                    查看帮助
  zentao list                    查看可用命令
  zentao whoami                  校验当前账号
  zentao getMyTasks --limit 10   查看我的任务
  zentao getMyBugs --limit 10    查看我的 Bug
```

后续更新可以运行 `zentao update`，卸载可以运行 `zentao uninstall`。

## MCP 接入方式

除了 Skill + CLI 模式，zentao-cli 也支持 MCP（Model Context Protocol）接入，可直接在兼容 MCP 的客户端里使用禅道工具。

### 安装和配置

MCP server 随 npm 包一起发布，通过 `zentao-mcp` 命令启动。支持通过客户端 `env` 传入禅道配置，与 CLI 环境变量完全一致：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "zentao-mcp",
      "args": ["--role=dev", "--mode=compact"],
      "env": {
        "ZENTAO_URL": "https://your-zentao.example.com",
        "ZENTAO_USERNAME": "your-account",
        "ZENTAO_PASSWORD": "your-password",
        "ZENTAO_API_VERSION": "v1"
      }
    }
  }
}
```

如果本机尚未全局安装，也可以用 npx 启动：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "npx",
      "args": ["-y", "@cloudglab/zentao-cli@latest", "zentao-mcp", "--role=dev", "--mode=compact"],
      "env": {
        "ZENTAO_URL": "https://your-zentao.example.com",
        "ZENTAO_USERNAME": "your-account",
        "ZENTAO_PASSWORD": "your-password"
      }
    }
  }
}
```

### 启动参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--role` | `dev` | 工具角色：`full` / `dev` / `qa` / `pm` |
| `--mode` | `compact` | 注册模式：`compact`（少量入口工具，省上下文） / `native`（全量注册） |
| `--tools` | 无 | 工具白名单，逗号分隔。如 `--tools=getMyTasks,getBugDetail,updateTask` |

### compact 模式（默认，推荐）

只注册 4 个入口工具，最省上下文，适合 Agent 长会话：

- **`zentao_list_tools`**：列出当前 role 下所有可用工具名称。
- **`zentao_help`**：查看指定工具的参数说明和元信息。
- **`zentao_call_tool`**：调用任意禅道工具（通过名称 + 参数字典）。
- **`zentao_parse_url`**：解析禅道 URL / 文件路径，返回可调用命令建议。

工作流：`zentao_list_tools` → 选工具 → `zentao_help` 了解参数 → `zentao_call_tool` 执行。

### native 模式

将当前 role 下的每个禅道工具注册为独立 MCP tool，体验好但上下文占用较高：

- `--role=dev --mode=native`：~238 个工具（任务、Bug、需求、执行、构建等）。
- `--role=qa --mode=native`：~225 个工具。
- `--role=pm --mode=native`：~188 个工具。
- `--role=full --mode=native`：~312 个工具。

native 模式建议配合 `--tools` 白名单缩小范围，避免大量工具占用模型上下文。

### 写操作保护

与 CLI 一致，写操作仍需显式传入 `confirm: true`。在 compact 模式下通过 `zentao_call_tool` 的 `args` 传 `"confirm": true`：

```json
// compact 模式写操作示例
{
  "tool": "createBug",
  "args": {
    "product": 1,
    "title": "页面按钮无响应",
    "steps": "复现步骤",
    "confirm": true
  }
}
```

## CI / 脚本里临时使用

```bash
npx -y @cloudglab/zentao-cli@latest --help
npx -y @cloudglab/zentao-cli@latest --role qa getMyTasks --status all --limit 20
npx -y @cloudglab/zentao-cli@latest --output normal getExecutionSnapshot --executionId 2140
```

## AI / 脚本推荐读法

```bash
zentao --output compact getBugSnapshot --bugId 84362
zentao --output normal getDevelopmentContextSnapshot --entityType story --entityId 10154 --productId 153
zentao --output normal getExecutionSnapshot --executionId 2140
zentao help getExecutionBugs
```

如果你手里只有浏览器页面 URL，也可以先让 CLI 做“意图解析”：

```bash
zentao parseUrlIntent --url "https://your-zentao.example.com/zentao/bug-view-84362.html"
zentao parseUrlIntent --url "execution-task-2140.html"
zentao parseUrlIntent --url "program-view-620.html"
zentao parseUrlIntent --url "todo-view-2319.html"
```

- 同站且有直连读命令的页面，会返回 `primaryCommand`、语义化参数和 `action: "execute"`，例如 `program-view`、`todo-view`。
- 无直连命令、跨实例 URL 或明显是写页面时，会返回 `action: "explain"` 和候选命令，不会自动执行写操作。
- 直接把 URL 当首参传给 CLI 时，也会复用同一套解析逻辑；能安全执行时自动跳到对应读命令，不能直达时直接输出解析 JSON。

输出模式说明：

- `compact`：默认模式，优先少返回，适合 Agent 首轮探测。
- `normal`：保留 `source`、`page`、`total`、`scanned`、`durationMs`、`cacheHit` 等常用元信息。
- `verbose`：保留原始 JSON，全字段排查时使用。

## 批量写操作示例

```bash
zentao batchEditTasks \
  --tasks '[{"taskId":12,"name":"联调任务","type":"devel","pri":2,"module":66,"status":"doing","estimate":4,"left":3,"estStarted":"2026-06-01","deadline":"2026-06-02","assignedTo":"dev","consumed":1.5}]' \
  --confirm true

zentao batchEditTestCases \
  --productId 153 \
  --branch 1 \
  --type feature \
  --moduleId 66 \
  --cases '[{"caseId":58191,"title":"登录成功","type":"feature","pri":2,"module":66,"story":10154,"stage":["wait","developed"]}]' \
  --confirm true

zentao batchCreateTodos \
  --date today \
  --todos '[{"name":"跟进线上问题","type":"custom","pri":2,"begin":"0900","end":"1830","assignedTo":"ditto"}]' \
  --confirm true
```

如果某个写命令在禅道 18.5 下没有对应 controller，CLI 会在确认执行时直接报错，而不是继续请求一个必然 404 或语义错误的旧页面入口。

## 可以这样问

下面这些自然语言请求可以交给 AI Skill / Agent 转成对应的 zentao-cli 命令。

### 我的任务和 Bug

- 我今天的 Bug 有多少？
- 获取我的所有任务。
- 看我等待中、进行中或已取消的任务。
- 分页看我的任务。
- 看我当前指派的 Bug。
- 统计我当前任务和 Bug 的状态分布。

### 一段时间内我做了什么

- 分析上周我都干了什么。
- 查一下某个人上周解决了多少个 Bug。
- 看某个人最近 3 天做了什么。
- 拉一下 2026-05-25 到 2026-05-29 的工作清单。
- 汇总我上周的评论、指派、流转和解决记录。
- 按天列出我最近几天处理过的 Bug、任务和评论。

### 执行 / 迭代统计

- 这个迭代有多少个 Bug？
- 这个迭代今天解决了多少个问题？
- 分析某个执行的每日迭代执行统计。
- 生成某个迭代的日报。
- 统计某个迭代今天 Bug 和任务情况。
- 看这个执行的 Bug、任务、参与人员和风险明细。
- 统计延期、reopen、未解决、未及时关闭的问题。
- 看这个迭代的任务完成数、逾期数和工时消耗。

### 禅道页面 URL 查询

- 列出 `execution-bug-1234.html` 里面的 Bug。
- 看 `execution-build-1234.html` 这个执行有哪些版本。
- 看 `execution-dynamic-1234.html` 这个执行最近的动态。
- 从禅道页面 URL 里提取对象类型和 ID，再查询结构化数据。

### Bug 和版本

- 看某个执行下有哪些版本。
- 看某个项目下有哪些发布：`zentao getProjectReleases --projectId 1772`。
- 看某个发布详情：`zentao getReleaseDetail --releaseId 1`。
- 查某个产品下包含关键词的 Bug：`zentao getProductBugs --productId 87 --status all --search 浙江 --limit 100`。
- 查线上 / 生产 / 客户反馈问题时，先判断来源：市场 / 售后 / 客户反馈来源查 `市场和售后问题跟踪`，测试 / 开发自发现来源查 `测试`，再按模块过滤真实业务产品：`zentao getProductBugs --productId <产品ID> --status all --module yj --order id_desc --limit 100`。
- 提一个新的 Bug 并指派负责人。
- 调整 Bug 的优先级、严重程度、模块、关联需求或计划。
- 指派、确认、解决、验证通过、激活、关闭或删除某个 Bug。
- 解决 Bug 时关联到某个版本。
- 解决 Bug 时转需求：`zentao resolveBug --bugId 123 --resolution tostory --confirm true`。
- 查某个执行下已解决未关闭、延期处理或 reopen 过的 Bug。
- 分析 Bug 附件和图片资源：`zentao analyzeBugResources --bugId 123`。

### 需求、产品、项目和测试

- 查某个产品下的需求。
- 创建需求，或指派、关闭、激活、评审需求。
- 查某个产品下的 Bug。
- 查某个项目下的执行列表。
- 查某个产品下的测试用例。
- 查某个测试单详情。
- 创建、更新、完成、激活或删除我的待办。
- 搜索包含某个关键词的需求。

## 场景命中链路

Skill / Agent 处理禅道请求时，优先按下面格式路由：

`用户表达 → 命中链路 → 必要参数 → 缺参追问 → 函数调用链路 → 输出汇总`

### Bug 类

- 查我的 Bug：我的 bug、我负责的 bug、分配给我的 bug、待我处理的 bug → 确认范围 → 调 `getMyBugs` → 过滤/分页 → 汇总。
- 查线上 Bug：线上问题、生产问题、客户反馈问题、售后反馈 Bug → 先判断来源 → 市场 / 售后 / 客户反馈查 `市场和售后问题跟踪`，测试 / 开发自发现查 `测试` → 调 `getProductBugs --module <模块别名>` → 汇总未关闭和近期已解决问题。
- 查 Bug 列表：查 bug、缺陷列表、某产品/执行 bug、未关闭/激活/已解决 bug → 确认产品或执行 → 查询列表 → 汇总。
- 查 Bug 详情：这个 bug 什么情况、复现步骤、当前状态、谁负责 → 确认 `bugId` → 查详情 → 汇总。
- 创建/更新 Bug：提 bug、报缺陷、指派、确认、关闭、激活、解决、改优先级/严重级别 → 补齐必要字段 → 写操作确认 → 调对应命令 → 汇总。

### 任务类

- 查任务：查任务、我的任务、某人的任务、任务进度、父子任务 → 确认 `executionId` 或负责人 → 查询任务 → 按父子结构汇总。
- 拆任务/排任务：拆任务、排任务、按需求建任务、给执行排期 → 确认 `executionId`/请假/周末加班/节假日 → 查询执行任务 → 判断父任务 → 必要时创建父任务 → 创建子任务 → 汇总。
- 调整已拆分任务：用户已给出迭代 / 父任务 / 子任务，且表达“调整、重排、延期、换人、增删其中几项” → 不再走“拆任务/排任务” → 先查 `executionId` 下现有任务 → 定位父任务和受影响子任务 → 给出调整清单 → 写操作确认后调用 `updateTask` / `assignTask` / 必要时 `createTask`。
- 创建/更新任务：建任务、新增任务、挂到父任务下、改负责人/工时/截止时间、开始/暂停/重启/完成/关闭/激活/删除任务 → 补齐字段 → 写操作确认 → 调对应命令 → 汇总。

### 需求和执行类

- 查需求：查需求、需求列表、我负责的需求、未完成需求、需求状态 → 确认产品/项目范围 → 查需求 → 过滤 → 汇总。
- 需求转任务：按需求拆任务、需求转任务、基于需求排期 → 先查需求详情 → 按技术方案/任务实施拆分 → 走拆任务链路。
- 创建/流转需求：创建需求、指派需求、关闭/激活需求、评审需求 → 补齐产品、标题、评审人、结果或关闭原因 → 写操作确认 → 调对应命令。
- 查项目/执行：有哪些项目、当前迭代、`executionId` 是多少、项目下执行、进行中的执行 → 查询可选项 → 让用户确认范围。
- 查发布：项目发布、发布详情、版本发布记录 → 确认 `projectId` 或 `releaseId` → 调 `getProjectReleases` / `getReleaseDetail` → 汇总。

### 特殊扩展场景

- 页面 URL 查询：从旧版禅道页面 URL 解析对象类型和 ID，再返回结构化结果。
- 动态和评论：REST API 缺少完整入口时，读取对象详情或页面 JSON 中的动作记录补全。
- 每日迭代统计：组合执行 Bug、任务、构建、人员和动作记录，生成标准接口之外的汇总视图。
- 附件资源分析：从 Bug / 任务详情解析附件、图片、日志和压缩包线索，下载到本地临时目录；小文本直接内联摘要，图片交给视觉模型或 OCR。
- 写入类补全：标准 REST API 不覆盖的少量动作，会在明确 `confirm=true` 后模拟禅道前端 JSON 请求完成。

### 排期和父子结构

- 默认跳过周末和节假日；只有用户明确周末/节假日加班时才排。
- 创建任务前先查父任务，优先复用“技术方案”和“任务实施”父任务。
- 已拆分任务的调整不是重新拆任务：只有新增独立工作项时才补建任务；改时间、负责人、工时、状态、父子归属时优先更新原任务。
- 最多只创建父子两层，不创建孙任务。

## 查看 Changelog

```bash
zentao changelog
zentao changelog --limit 5
zentao changelog --version 1.0.0
zentao changelog --since 0.1.0
zentao changelog --raw
```

> 提示：`zentao help <command>` 对 `install`、`update`、`uninstall`、`changelog` 等内置命令也会输出完整参数说明；`zentao --help` 会按当前 role 推荐常用命令，并优先引导使用 `zentao list` 查看全部可用命令。

## 常用命令示例

```bash
# 我的任务
zentao whoami
zentao who am i
zentao help getMyTasks
zentao --role qa getMyTasks --status all --limit 100
zentao --role qa getMyTasks --status wait --limit 50

# 我的阶段性工作清单
zentao --role qa getMyWeeklyActivity --week this
zentao --role qa getMyWeeklyActivity --account some-account --week last
zentao --role qa getMyWeeklyActivity --dateRange 最近3天
zentao --role qa getMyWeeklyActivity --dateRange 2026-05-25到2026-05-29

# 执行 Bug / 构建 / 动态
zentao help getExecutionDetail
zentao --role qa getExecutionBugs --executionId 1234 --limit 100
zentao --role qa getExecutionBugs --executionId 1234 --status all --module yj --search 登录 --limit 100
zentao --role qa getExecutionBuilds --executionId 1234
zentao --role qa getExecutionDynamic --executionId 1234
zentao getProjectReleases --projectId 1772
zentao getReleaseDetail --releaseId 1

# 产品 Bug / 线上问题来源分流
zentao getProductBugs --productId <市场售后产品ID> --status all --module yj --order id_desc --limit 100
zentao getProductBugs --productId <测试产品ID> --status all --module yj --order id_desc --limit 100

# 附件资源分析
zentao analyzeBugResources --bugId 123
zentao analyzeTaskResources --taskId 123 --download false

# 每日迭代执行统计
zentao --role qa getExecutionDailyBugStats --executionId 1234 --iterationName 某个迭代
zentao --role qa getExecutionDailyBugStats --executionId 1234 --iterationName 某个迭代 --date 2026-06-06

# 写操作示例（必须显式 confirm=true）
zentao --role dev assignTask --taskId 123 --assignedTo some-account --confirm true
zentao --role qa createBug --product 1 --title "页面按钮无响应" --openedBuild trunk --steps "复现步骤" --confirm true
zentao --role qa okBug --bugId 123 --comment "回归通过" --confirm true
zentao --role pm createStory --product 1 --title "新增导出能力" --spec "需求说明" --verify "验收标准" --confirm true
zentao createTodo --name "跟进缺陷回归" --begin 09:00 --end 10:00 --confirm true

# 批量操作示例
zentao --role dev batchFinishTasks --taskIds 1 --taskIds 2 --confirm true
zentao --role dev batchAssignTasksTo --taskIds 1 --taskIds 2 --assignedTo dev --comment "请处理" --confirm true
zentao --role dev batchActivateTasks --taskIds 1 --confirm true
zentao --role qa batchResolveBugs --bugIds 1 --bugIds 2 --confirm true
zentao --role pm batchReviewStories --storyIds 1 --storyIds 2 --confirm true
```

## 写操作保护

默认支持写操作；真实写入仍需要在命令参数里显式传入 `confirm=true`。

如需临时禁用写操作，可设置：

```bash
export ZENTAO_DISABLE_WRITE=true
```

## 下一步自动推荐

加 `--recommend` 可以在命令返回的 `meta.next` 拿到结构化推荐（含 `tool / reason / args / example`），Agent 无需再翻 docs。

```bash
zentao --recommend getBugDetail --bugId 84362
zentao --recommend getExecutionDetail --executionId 2130
```

约束：默认 opt-in，不传则不输出；推荐按当前 role 过滤；`args` 由声明从 `input` / `payload` 路径解析。

## 更多命令

```bash
zentao help
zentao help getExecutionDetail
zentao list
zentao --role qa list
```

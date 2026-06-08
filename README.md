# @cloudglab/zentao-cli

![zentao-cli hero](./assets/readme/zentao-cli-hero.png)

把禅道任务、Bug、执行、构建、动态和统计能力接到命令行，方便在 CI、脚本和 AI Skill 里直接调用。

## 安装方式

### 一键安装 CLI + Skill

```bash
npx -y @cloudglab/zentao-cli@latest install
```

该命令会依次安装全局 CLI、从 CLI 包内自带的 `skills/zentao-cli` 安装 skill，并在禅道配置缺失或登录校验失败时引导输入配置。配置完成后默认支持写操作；真实写入仍需要在命令参数中传 `confirm=true`，如需禁用写操作可设置 `ZENTAO_DISABLE_WRITE=true`。

如果需要强制重新下载 npm 静态包，可改用 npm 模式：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source npm
```

npm 模式会下载 `@cloudglab/zentao-cli` 包，解压其中的 `skills/` 目录，再通过本地路径安装 skill。

如果需要从 GitHub 仓库安装 skill，可显式指定：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source git
```

如果已经提前下载并解压好了 npm 静态包，也可以直接指定本地目录：

```bash
zentao install --skill-local-path ./package
```

后续更新也可以直接运行：

```bash
zentao update
```

`zentao update` 会重新安装最新 CLI，然后从全局已安装的最新 CLI 包内安装 skill，最后校验禅道配置。只是更新工具、不想被配置校验阻塞时可以跳过校验：

```bash
zentao update --skip-config-check
```

如果本机旧版 `zentao update` 行为异常，可用最新 npm 包自举更新：

```bash
npx -y @cloudglab/zentao-cli@latest update
```

只更新其中一部分时可使用：

```bash
zentao update --cli-only
zentao update --skill-only
```

### CI / 脚本里临时使用

```bash
npx -y @cloudglab/zentao-cli@latest --help
npx -y @cloudglab/zentao-cli@latest --role qa getMyTasks --status all --limit 20
```

### 全局安装

```bash
npm i -g @cloudglab/zentao-cli@latest
zentao --version
zentao version
zentao help
zentao whoami
```

### Skill 安装

默认一键安装会使用 CLI 包内自带 skill。手动从 GitHub 仓库安装：

```bash
npx -y skills add -g cloudglab/zentao-cli
```

如果只能访问 npm，不能 clone `.git` 仓库：

```bash
npm pack @cloudglab/zentao-cli@latest
tar -xzf cloudglab-zentao-cli-*.tgz
npx -y skills add -g ./package
```

Skill / Agent 里推荐优先调用本地命令：

```bash
zentao --role qa getMyBugs --limit 50
```

本地没有安装时再退回：

```bash
npx -y @cloudglab/zentao-cli@latest --role qa getMyBugs --limit 50
```

## 环境变量

```bash
export ZENTAO_URL="https://your-zentao.example.com"
export ZENTAO_USERNAME="your-account"
export ZENTAO_PASSWORD="your-password"
export ZENTAO_API_VERSION="v1"

# 可选：非标准部署时指定完整 API 基础地址
# export ZENTAO_API_BASE_URL="https://your-zentao.example.com/custom/api.php/v1"
```

`ZENTAO_URL` 传根域名即可，不要带 `/zentao`。

## 可以这样描述场景

下面这些话可以交给 AI Skill / Agent 转成对应的 zentao-cli 命令。

### 我的任务和 Bug

- 我今天的 Bug 有多少？
- 我今天的任务有多少？
- 获取我的所有任务。
- 我当前登录的是谁？
- 查看当前禅道登录用户信息。
- 看我等待中的任务。
- 看我进行中的任务。
- 看我已取消的任务。
- 分页看我的任务。
- 看我当前指派的 Bug。
- 统计我当前 Bug 的状态分布。
- 统计我当前任务的状态分布。

### 一段时间内我做了什么

- 分析上周我都干了什么。
- 查一下我本周解决了多少个 Bug。
- 查一下 lixm1 上周解决了多少个 Bug。
- 看 lixm1 最近 3 天做了什么。
- 看我 2026-05-28 做了什么。
- 拉一下 2026-05-25 到 2026-05-29 的工作清单。
- 汇总我上周的评论、指派、流转和解决记录。
- 按天列出我最近几天处理过的 Bug 和任务。

### 执行 / 迭代统计

- 这个迭代有多少个 Bug？
- 这个迭代今天解决了多少个问题？
- 分析 execution 2067 的每日迭代执行统计。
- 生成 1.2.3 迭代日报。
- 统计某个迭代今天 Bug 和任务情况。
- 看这个执行的 Bug、任务、参与人员和风险明细。
- 统计这个迭代的延期 Bug、reopen Bug 和未解决 Bug。
- 看这个迭代里测试未及时关闭的问题。
- 看这个迭代里开发今日未及时解决的问题。
- 看这个迭代的任务总数、完成数、逾期未完成数和工时消耗。
- 看这个迭代每个人负责了多少 Bug 和任务。

### 禅道页面 URL 查询

- 列出 `execution-bug-2130.html` 里面的 Bug。
- 看 `execution-build-2130.html` 这个执行有哪些版本。
- 看 `execution-dynamic-2130.html` 这个执行最近的动态。
- 从禅道 Bug 列表页里提取 execution ID 并列出 Bug。
- 从禅道版本页里提取 execution ID 并列出构建。

### Bug 和版本

- 看某个执行下有哪些版本。
- 提一个新的 Bug 并指派负责人。
- 调整 Bug 的优先级、严重程度、模块、关联需求或计划。
- 指派、确认、激活、关闭或删除某个 Bug。
- 解决 Bug 时关联到某个版本。
- 查某个执行下已解决但还没关闭的 Bug。
- 查某个执行下延期处理的 Bug。
- 查某个执行下 reopen 过的 Bug。

### 需求、产品、项目和测试

- 查某个产品下的需求。
- 创建需求，或指派、关闭、激活、评审需求。
- 查某个产品下的 Bug。
- 查某个项目下的执行列表。
- 查某个执行下的构建列表。
- 查某个产品下的测试用例。
- 查某个测试单详情。
- 创建、更新、完成、激活或删除我的待办。
- 搜索包含某个关键词的需求。

## 场景命中链路

Skill / Agent 处理禅道请求时，优先按下面格式路由：

`用户表达 → 命中链路 → 必要参数 → 缺参追问 → 函数调用链路 → 输出汇总`

### Bug 类

- 查我的 Bug：我的 bug、我负责的 bug、分配给我的 bug、待我处理的 bug → 确认范围 → 调 `getMyBugs` → 过滤/分页 → 汇总。
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

### 排期和父子结构

- 默认跳过周末和节假日；只有用户明确周末/节假日加班时才排。
- 创建任务前先查父任务，优先复用“技术方案”和“任务实施”父任务。
- 已拆分任务的调整不是重新拆任务：只有新增独立工作项时才补建任务；改时间、负责人、工时、状态、父子归属时优先更新原任务。
- 最多只创建父子两层，不创建孙任务。

## 常用命令示例

```bash
# 我的任务
zentao whoami
zentao who am i
zentao --role qa getMyTasks --status all --limit 100
zentao --role qa getMyTasks --status wait --limit 50

# 我的阶段性工作清单
zentao --role qa getMyWeeklyActivity --account lixm1 --week last
zentao --role qa getMyWeeklyActivity --account lixm1 --dateRange 最近3天
zentao --role qa getMyWeeklyActivity --account lixm1 --dateRange 2026-05-25到2026-05-29

# 执行 Bug / 构建 / 动态
zentao --role qa getExecutionBugs --executionId 2130 --limit 100
zentao --role qa getExecutionBuilds --executionId 2130
zentao --role qa getExecutionDynamic --executionId 2130

# 每日迭代执行统计
zentao --role qa getExecutionDailyBugStats --executionId 2067 --iterationName 1.2.3迭代
zentao --role qa getExecutionDailyBugStats --executionId 2067 --iterationName 1.2.3迭代 --date 2026-06-06

# 写操作示例（必须显式 confirm=true）
zentao --role dev assignTask --taskId 123 --assignedTo lixm1 --confirm true
zentao --role qa createBug --product 1 --title "页面按钮无响应" --openedBuild trunk --steps "复现步骤" --confirm true
zentao --role pm createStory --product 1 --title "新增导出能力" --spec "需求说明" --verify "验收标准" --confirm true
zentao createTodo --name "跟进缺陷回归" --begin 09:00 --end 10:00 --confirm true
```

## 写操作保护

默认支持写操作；真实写入仍需要在命令参数里显式传入 `confirm=true`。

如需临时禁用写操作，可设置：

```bash
export ZENTAO_DISABLE_WRITE=true
```

## 更多命令

```bash
zentao help
zentao list
zentao --role qa list
```

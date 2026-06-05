# @cloudglab/zentao-cli

![zentao-cli hero](./assets/readme/zentao-cli-hero.png)

把禅道任务、Bug、执行、构建、动态和统计能力接到命令行，方便在 CI、脚本和 AI Skill 里直接调用。

## 安装方式

### 一键安装 CLI + Skill

```bash
npx -y @cloudglab/zentao-cli@latest install
```

该命令会依次安装全局 CLI、安装 skill，并在禅道配置缺失或登录校验失败时引导输入配置。

默认通过 GitHub 仓库安装 skill。如果当前环境不能访问远程 `.git` 仓库，但可以访问 npm 包，可改用 npm 静态包模式：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source npm
```

npm 模式会下载 `@cloudglab/zentao-cli` 包，解压其中的 `skills/` 目录，再通过本地路径安装 skill。

如果已经提前下载并解压好了 npm 静态包，也可以直接指定本地目录：

```bash
zentao install --skill-local-path ./package
```

后续更新也可以直接运行：

```bash
zentao update
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
```

### Skill 安装

默认 GitHub 仓库方式：

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
- 解决 Bug 时关联到某个版本。
- 查某个执行下已解决但还没关闭的 Bug。
- 查某个执行下延期处理的 Bug。
- 查某个执行下 reopen 过的 Bug。

### 需求、产品、项目和测试

- 查某个产品下的需求。
- 查某个产品下的 Bug。
- 查某个项目下的执行列表。
- 查某个执行下的构建列表。
- 查某个产品下的测试用例。
- 查某个测试单详情。
- 搜索包含某个关键词的需求。

## 常用命令示例

```bash
# 我的任务
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
```

## 写操作保护

默认不写入线上。真实写操作需要同时满足：

```bash
export ZENTAO_ENABLE_WRITE=true
```

并且命令参数里显式传入 `confirm=true`。

## 更多命令

```bash
zentao help
zentao list
zentao --role qa list
```

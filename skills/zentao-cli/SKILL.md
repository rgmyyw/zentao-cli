---
name: zentao-cli
description: 禅道 CLI 技能包
triggers:
  - zentao
  - 禅道
  - bug
  - task
  - testcase
  - testtask
argument-hint: "[command]"
---

# @cloudglab/zentao-cli

## 概览

把禅道能力暴露给命令行 / 智能体使用，默认带写保护。

建议把它当成一个“命令行技能包”：先安装，再按 `reference/` 文档执行。

## 命令选择强制规则

- 不确定命令名或参数时，先查 `reference/*.md`，不要猜参数名。
- 需要确认某条命令参数时，优先运行 `zentao help <command>`；本机没有安装时用 `npx -y @cloudglab/zentao-cli@latest help <command>`。
- 如果用户给的是禅道旧版页面 URL，先按 URL 里的对象类型和 ID 映射到 reference 中的命令，再执行 CLI 查询。
- 如果 CLI 返回 `未知参数`，立即运行 `zentao help <command>` 校对参数；不要换一个看起来相似但未确认的参数。

## Reference 路由表

- 任务 / 我的任务 / 任务详情 / 完成任务：`reference/task.md`
- Bug / 我的 Bug / 产品 Bug / 线上问题：`reference/bug.md`
- 需求 / 产品需求 / 搜索需求：`reference/story.md`
- 执行 / 迭代 / 执行 Bug / 执行构建 / 执行日报：`reference/execution.md`
- 统计 / 周报 / 最近几天做了什么：`reference/statistics.md`
- 产品 / 项目 / 计划 / 构建 / 测试用例 / 测试单：分别看 `reference/product.md`、`reference/project.md`、`reference/plan.md`、`reference/build.md`、`reference/testcase.md`、`reference/testtask.md`

注意：`getDevelopmentContext` 只用于 `story` / `bug` 上下文，不接收 `executionId`。查执行上下文应使用 `getExecutionDetail`、`getExecutionBugs`、`getExecutionBuilds`、`getExecutionDynamic` 或 `getExecutionDailyBugStats`。

## 入口优先级

1. 本机已安装 `zentao`：直接执行
2. 未安装时：先 `npm i -g @cloudglab/zentao-cli@latest`
3. 如果当前环境不方便安装，再临时用 `npx -y @cloudglab/zentao-cli@latest`
4. 需要固定版本：全局安装后再运行
5. 默认只 preview；写操作必须显式确认

## Bug 查询强制判断

在调用任何 Bug 查询工具或产品查询工具前，先判断用户问的是：

1. 普通禅道产品 Bug
2. 真实业务产品的线上 Bug / 生产问题 / 客户反馈问题

如果用户表达了以下任一意图，必须走“线上 Bug 查询口径”：

- `<产品名> 最近一周有哪些线上 bug`
- `<产品名> 有哪些线上问题`
- `<产品名> 生产环境问题`
- `<产品名> 客户反馈问题`
- `<产品名> 售后反馈 Bug`
- `<产品名> 线上报错`

这类场景里，用户说的 `<产品名>` 是真实业务产品 / 模块名，不是禅道产品名。

禁止：

- 直接用这个 `<产品名>` 去匹配禅道产品
- 先解释“找到了 `<产品名>` 对应的禅道产品”

只有当用户明确说“查某个禅道产品下的 Bug”，或上下文明显不是线上 / 生产 / 客户反馈问题时，才按普通产品 Bug 查询。

### 线上 Bug 固定查询口径

公司线上 Bug 统一挂在禅道产品 **`市场和售后问题跟踪`** 下，再通过 Bug 模块区分真实业务产品。

固定流程：

1. 先 `getProducts`
2. 找到名称为 `市场和售后问题跟踪` 的产品
3. 用该产品 ID 调 `getProductBugs`
4. 必要时继续分页
5. 用 `module` / `moduleName` / `modulePath` / `path`，以及标题、关键词等字段匹配真实业务产品

输出必须说明：

- 查询的是固定禅道产品：`市场和售后问题跟踪`
- 真实业务产品是通过模块匹配出来的
- 匹配到的模块名 / 模块路径
- 查询页数和候选 Bug 数
- 未关闭线上 Bug、近期已解决线上 Bug、无法确认归属的疑似 Bug

## 安装 / 更新

一键安装 CLI + skill，并校验禅道配置：

```bash
npx -y @cloudglab/zentao-cli@latest install
```

默认会从 CLI 包内自带的 `skills/zentao-cli` 安装 skill，并随配置校验一起说明写保护状态：配置完成后默认支持写操作；真实写入仍需要在命令参数中传 `confirm=true`，如需禁用写操作可设置 `ZENTAO_DISABLE_WRITE=true`。

需要强制重新下载 npm 静态包时：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source npm
```

需要从 GitHub 仓库安装 skill 时：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source git
```

已经提前下载并解压 npm 静态包时：

```bash
zentao install --skill-local-path ./package
```

更新 CLI + skill：

```bash
zentao update
npx -y @cloudglab/zentao-cli@latest update
zentao update --skip-config-check
zentao update --cli-only
zentao update --skill-only
```

```bash
npm i -g @cloudglab/zentao-cli@latest
zentao --version
npx -y @cloudglab/zentao-cli@latest --help
```

手动从 GitHub 仓库安装 skill：

```bash
npx -y skills add -g cloudglab/zentao-cli
```

只能访问 npm 时：

```bash
npm pack @cloudglab/zentao-cli@latest
tar -xzf cloudglab-zentao-cli-*.tgz
npx -y skills add -g ./package
```

检查是否已安装：

```bash
command -v zentao
zentao --version
zentao version
```

## 启动方式

```bash
zentao help
zentao list
zentao version
zentao whoami
zentao --role qa getMyBugs --limit 50
```

或直接：

```bash
npx -y @cloudglab/zentao-cli@latest
npx -y @cloudglab/zentao-cli@latest --role qa
```

## 文档入口

- `reference/overview.md`
- `reference/install.md`
- `reference/cli.md`
- `reference/commands.md`
- `reference/task.md`
- `reference/bug.md`
- `reference/story.md`
- `reference/execution.md`
- `reference/build.md`
- `reference/testcase.md`
- `reference/testtask.md`
- `reference/plan.md`
- `reference/product.md`
- `reference/project.md`
- `reference/statistics.md`

## 典型能力

- 查任务、Bug、需求、项目、执行、构建
- 查看当前登录用户信息：`whoami` / `who-am-i` / `who am i`
- 创建 / 更新任务、构建、测试用例、测试单
- 从 Bug 派生任务
- 生成统计和开发上下文

## 场景命中链路

处理用户请求时，按以下结构减少无效解释：

`用户表达 → 命中链路 → 必要参数 → 缺参追问 → 函数调用链路 → 输出汇总`

### Bug 类

- 查我的 Bug：我的 bug、我负责的 bug、分配给我的 bug、待我处理的 bug → 确认范围 → 调 `getMyBugs` → 过滤/分页 → 汇总。
- 查 Bug 列表：查 bug、缺陷列表、某产品/执行 bug、未关闭/激活/已解决 bug → 确认产品或执行 → 查询列表 → 汇总。
- 查 Bug 详情：这个 bug 什么情况、复现步骤、当前状态、谁负责 → 确认 `bugId` → 查详情 → 汇总。
- 创建/更新 Bug：提 bug、报缺陷、指派、关闭、解决、改优先级/严重级别 → 补齐必要字段 → 写操作确认 → 调对应命令 → 汇总。

### 任务类

- 查任务：查任务、我的任务、某人的任务、任务进度、父子任务 → 确认 `executionId` 或负责人 → 查询任务 → 按父子结构汇总。
- 拆任务/排任务：拆任务、排任务、按需求建任务、给执行排期 → 确认 `executionId`/请假/周末加班/节假日 → 查询执行任务 → 判断父任务 → 必要时创建父任务 → 创建子任务 → 汇总。
- 调整已拆分任务：用户已给出迭代 / 父任务 / 子任务，且表达“调整、重排、延期、换人、增删其中几项” → 不再走“拆任务/排任务” → 先查 `executionId` 下现有任务 → 定位父任务和受影响子任务 → 给出调整清单 → 写操作确认后调用 `updateTask` / 必要时 `createTask`。
- 创建/更新任务：建任务、新增任务、挂到父任务下、改负责人/工时/截止时间、完成/关闭任务 → 补齐字段 → 写操作确认 → 调对应命令 → 汇总。

### 需求和执行类

- 查需求：查需求、需求列表、我负责的需求、未完成需求、需求状态 → 确认产品/项目范围 → 查需求 → 过滤 → 汇总。
- 需求转任务：按需求拆任务、需求转任务、基于需求排期 → 先查需求详情 → 按技术方案/任务实施拆分 → 走拆任务链路。
- 查项目/执行：有哪些项目、当前迭代、`executionId` 是多少、项目下执行、进行中的执行 → 查询可选项 → 让用户确认范围。

### 排期和父子结构

- 默认跳过周末和节假日；只有用户明确周末/节假日加班时才排。
- 创建任务前先查父任务，优先复用“技术方案”和“任务实施”父任务。
- 已拆分任务的调整不是重新拆任务：只有新增独立工作项时才补建任务；改时间、负责人、工时、状态、父子归属时优先更新原任务。
- 最多只创建父子两层，不创建孙任务。

## 写保护

默认支持写操作；真实写入仍需要显式确认：

- `confirm=true`

如需禁用写操作，设置：

- `ZENTAO_DISABLE_WRITE=true`

## 运行时要求

- 发布产物：`Node.js >= 16`
- 开发 / 构建环境可以高于 16

## 适用场景

- 命令行手工操作禅道
- 智能体自动化调用

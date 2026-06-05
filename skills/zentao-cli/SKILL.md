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

```bash
npm i -g @cloudglab/zentao-cli@latest
zentao --version
npx -y @cloudglab/zentao-cli@latest --help
```

安装 skill：

```bash
npx skills add @cloudglab/zentao-cli -g
```

检查是否已安装：

```bash
command -v zentao
zentao --version
```

## 启动方式

```bash
zentao help
zentao list
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
- 创建 / 更新任务、构建、测试用例、测试单
- 从 Bug 派生任务
- 生成统计和开发上下文

## 写保护

默认不写入线上。
真实写操作需要同时满足：

- `ZENTAO_ENABLE_WRITE=true`
- `confirm=true`

## 运行时要求

- 发布产物：`Node.js >= 16`
- 开发 / 构建环境可以高于 16

## 适用场景

- 命令行手工操作禅道
- 智能体自动化调用

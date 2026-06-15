# Bug

## 强制判断

在调用任何 Bug 查询工具或产品查询工具前，先判断用户问的是普通禅道产品 Bug，还是线上 Bug；如果是线上 Bug，还要继续判断来源。

如果用户表达了以下任一意图，就必须先走“线上 Bug 来源分流”：

- `<产品名> 最近一周有哪些线上 bug`
- `<产品名> 有哪些线上问题`
- `<产品名> 生产环境问题`
- `<产品名> 客户反馈问题`
- `<产品名> 售后反馈 Bug`
- `<产品名> 线上报错`

线上 Bug 场景中，用户说的 `<产品名>` 通常是真实业务产品 / 模块名，不一定是禅道产品名。禁止不判断来源就直接用这个 `<产品名>` 去匹配禅道产品，也不要先解释“找到了 `<产品名>` 对应的禅道产品”。

只有当用户明确说“查某个禅道产品下的 Bug”或上下文不是线上 / 生产 / 客户反馈 / 测试开发自发现问题时，才按普通产品 Bug 查询。

## 线上 Bug 来源分流

默认来源：非测试 / 非开发发现的线上、生产、客户反馈、售后反馈问题，优先查禅道产品 **`市场和售后问题跟踪`**，再通过 Bug 的模块区分真实业务产品。

例外来源：如果上下文明确说明问题是测试或开发自己在线上发现的，通常查禅道产品 **`测试`** 及其业务模块体系，例如 `测试 > 云镜`，再通过 Bug 的模块过滤具体业务产品。

默认流程：

1. 调用 `getProducts`，找到名称为 **`市场和售后问题跟踪`** 的产品，确认它的 `productId`
2. 调用 `getProductBugs` 查询这个固定产品下的 Bug：

```bash
zentao getProductBugs --productId <市场和售后问题跟踪产品ID> --status all --limit 100 --order id_desc
```

3. 如果结果不足，继续分页：

```bash
zentao getProductBugs --productId <市场和售后问题跟踪产品ID> --status all --page 2 --limit 100 --order id_desc
```

4. 在返回结果中，用用户提到的真实产品名匹配 Bug 的模块字段，例如 `module`、`moduleName`、`modulePath`、`path`，以及标题、关键词等补充字段；模块别名按不区分大小写匹配，`YJ` / `Yj` / `yj` 视为同一个模块查询，常见中文模块名支持首字母缩写，例如 `云镜` 可用 `yj`。
5. 如果用户没有指定状态，默认同时看未关闭和近期已解决的 Bug；输出时优先展示未关闭 / 激活 / 待处理问题。
6. 如果用户问“最近”，优先用 `openedDate`、`editedDate`、`assignedDate`、`resolvedDate`、`closedDate` 等时间字段判断；缺少时间字段时，说明只能按 `id_desc` 近似代表最近。

测试 / 开发自发现流程：

1. 调用 `getProducts`，找到名称为 **`测试`** 的产品，确认它的 `productId`
2. 调用 `getProductBugs` 查询这个产品下的 Bug：

```bash
zentao getProductBugs --productId <测试产品ID> --status all --limit 100 --order id_desc
```

3. 用用户提到的业务模块匹配 Bug 的模块字段，例如 `测试 > 云镜` 可用 `--module 云镜` 或 `--module yj` 过滤。
4. 如果结果不足，继续分页；不要改走 `市场和售后问题跟踪`，除非用户说明这是市场、售后或客户反馈来源。

输出必须说明：

- 查询的是哪个禅道产品：默认来源是 `市场和售后问题跟踪`；测试 / 开发自发现来源是 `测试`
- 真实业务产品是通过模块匹配出来的
- 匹配到的模块名 / 模块路径
- 查询页数和候选 Bug 数
- 未关闭线上 Bug、近期已解决线上 Bug、无法确认是否属于该产品的疑似 Bug

如果没有结果，不要直接说“产品没有 Bug”。应说明“在本次选择的来源产品下，未通过模块匹配到该真实业务产品的线上 Bug”，并建议扩大模块关键词、确认模块命名或确认问题来源。

## 查询

```bash
zentao getBugDetail --bugId <id>
zentao getMyBugs
zentao getMyBugs --productId <productId>
zentao getProductBugs --productId <productId>
```

## 写入

```bash
zentao resolveBug --bugId <id> --resolution fixed --confirm true
zentao confirmBugStoryChange --bugId <id> --confirm true
```

说明：`confirmBugStoryChange` 对齐 18.5 Bug 详情页在关联需求版本变化时出现的“确认”按钮，会更新 Bug 记录里的需求版本并写入 `confirmed` 动作。

### 把 Bug 关联到指定执行

如果用户只给了 `executionId`，不要直接猜 `projectId`。先查执行详情，再把返回里的 `project` / `projectId` 一起传给 `updateBug`：

```bash
zentao getExecutionDetail --executionId <executionId>
zentao updateBug --bugId <bugId> --project <projectId> --execution <executionId> --confirm true
```

说明：

- 只传 `execution` 时，服务端可能因为缺少所属 `project` 而拒绝更新。
- 跨项目 / 跨执行迁移 Bug 时，优先走上面的两步链路。
- 如果用户给的是旧版页面 URL，例如 `bug-view-84733.html`，先解析成 `bugId=84733` 再执行。

### 把 Bug 转成任务

先查执行，再把页面链路里的 `project` / `execution` 显式带上：

```bash
zentao getExecutionDetail --executionId <executionId>
zentao createTaskFromBug --bugId <bugId> --project <projectId> --execution <executionId> --assignedTo <account> --estStarted <YYYY-MM-DD> --deadline <YYYY-MM-DD> --confirm true
```

说明：

- `createTaskFromBug` 走的是旧版 `task/create + bugID`，不是 REST `/executions/{id}/tasks`。
- 不要只传 `execution` 让 CLI 猜 `project`；按页面链路显式传参，才能稳定对齐 `toTask` 语义。

### updateBug 字段保留规则

`updateBug` 在禅道 18.5 上实际走的是旧版 `bug-edit-<id>.json` 表单链路，不是 REST PATCH。

这类旧版编辑接口的特点是：**未传的表单字段可能被服务端清空**，典型受影响字段包括：

- `execution`
- `plan`
- `module`
- `steps`

CLI 现在已在 `updateBug` 内部自动先读取当前 Bug，再合并用户显式传入的变更字段后提交，避免只改一个字段时把其他现有字段顺手清掉。

推荐用法：

```bash
zentao updateBug --bugId <bugId> --steps '<html>' --confirm true
zentao updateBug --bugId <bugId> --plan <planId> --confirm true
zentao updateBug --bugId <bugId> --project <projectId> --execution <executionId> --confirm true
```

说明：

- 只需要传你这次真正想改的字段即可，CLI 会自动带上需要保留的旧值。
- 如果要修富文本 `steps`，建议直接传原始 HTML，不要先手动做 HTML 转义。

## 场景

- 看我的 Bug
- 解决 Bug
- 查看产品 Bug 列表
- 查看某个真实业务产品的线上 Bug，并按来源分流到市场售后或测试产品

说明：

- `getMyBugs` 不传 `productId` 时，默认查跨所有产品“指派给我的 Bug”
- 传 `productId` 时，只查指定产品内我的 Bug

## 线上 Bug 分流场景

- `<产品名> 最近一周有哪些线上 bug`
- `<产品名> 有哪些线上问题`
- `<产品名> 生产环境问题`
- `<产品名> 客户反馈问题`
- `<产品名> 售后反馈 Bug`
- `<产品名> 线上报错`

## 普通产品 Bug 场景

- 查某个禅道产品下的 Bug
- 查看禅道产品 `<产品名>` 的 Bug
- 看产品ID `<id>` 下的 Bug

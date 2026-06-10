# Bug

## 强制判断

在调用任何 Bug 查询工具或产品查询工具前，先判断用户问的是普通禅道产品 Bug，还是线上 Bug。

如果用户表达了以下任一意图，就必须走“线上 Bug 查询口径”：

- `<产品名> 最近一周有哪些线上 bug`
- `<产品名> 有哪些线上问题`
- `<产品名> 生产环境问题`
- `<产品名> 客户反馈问题`
- `<产品名> 售后反馈 Bug`
- `<产品名> 线上报错`

线上 Bug 场景中，用户说的 `<产品名>` 是真实业务产品 / 模块名，不是禅道产品名。禁止直接用这个 `<产品名>` 去匹配禅道产品，也不要先解释“找到了 `<产品名>` 对应的禅道产品”。

只有当用户明确说“查某个禅道产品下的 Bug”或上下文不是线上 / 生产 / 客户反馈问题时，才按普通产品 Bug 查询。

## 线上 Bug 查询口径

公司线上 Bug 不按真实业务产品分别挂在各自产品下管理。所有产品的线上 Bug 统一放在禅道产品 **`市场和售后问题跟踪`** 下，再通过 Bug 的模块区分真实业务产品。

正确流程：

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

输出必须说明：

- 查询的是固定禅道产品：`市场和售后问题跟踪`
- 真实业务产品是通过模块匹配出来的
- 匹配到的模块名 / 模块路径
- 查询页数和候选 Bug 数
- 未关闭线上 Bug、近期已解决线上 Bug、无法确认是否属于该产品的疑似 Bug

如果没有结果，不要直接说“产品没有 Bug”。应说明“在 `市场和售后问题跟踪` 产品下，未通过模块匹配到该真实业务产品的线上 Bug”，并建议扩大模块关键词或确认模块命名。

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
```

## 场景

- 看我的 Bug
- 解决 Bug
- 查看产品 Bug 列表
- 查看某个真实业务产品的线上 Bug

说明：

- `getMyBugs` 不传 `productId` 时，默认查跨所有产品“指派给我的 Bug”
- 传 `productId` 时，只查指定产品内我的 Bug

## 线上 Bug 固定场景

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

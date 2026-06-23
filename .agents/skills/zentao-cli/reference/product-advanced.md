# 产品高级操作

产品批量、状态变更、白名单、动态、路线图等低频 / 管理员操作。日常主链路见 `product.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `createProduct` | 产品类型，对应 18.5 product/create 页面 type 字段 |
| `editProduct` | 产品 ID 列表，对应 18.5 product/batchEdit 页面 productIdList[] 字段 |
| `batchEditProducts` | 产品 ID 列表，对应 18.5 product/batchEdit 页面 productIdList[] 字段 |
| `closeProduct` | 白名单账号数组，对应 18.5 product/addWhitelist 页面 accounts 字段 |
| `deleteProduct` | 白名单账号数组，对应 18.5 product/addWhitelist 页面 accounts 字段 |
| `addProductWhitelist` | 白名单账号数组，对应 18.5 product/addWhitelist 页面 accounts 字段 |
| `unbindProductWhitelist` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `setProductOrder` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `manageProductLine` | JSON 字符串，已有产品线映射对象。键形如 id123，值为产品线名称，对应页面 modules[id123]。 |
| `getProductAll` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductTrack` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductWhitelist` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductDashboard` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductRoadmap` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `getProductDynamic` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `exportProducts` | 项目类型，对应 18.5 project/create 页面 type 字段 |

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
# 18.5 控制器入口覆盖率

## 这份文档做什么

- 用一个零依赖脚本统计 `zentao-cli` 已注册 CLI 工具 vs 真实禅道 18.5 控制器的覆盖情况。
- 入口指的是页面按钮可调用的 public function（剔除了 ajaxGet/commonAction/browse/report/view/index 等内部 helper）。
- 适合在做模块补全前评估工作量、提交前自检、写周报/进度汇报时引用。

## 怎么跑

项目根目录执行：

```bash
pnpm coverage
# 等价于：node scripts/coverage.mjs
```

输出包括：

- 总览：合计 `已覆盖 / 总数 = 比例`
- 各模块：`execution / testcase / product / project / program / task / build / bug / testtask / story / release / todo` 的逐项数字
- 各模块缺失入口：每个模块下还差的 controller 入口名（entry 名，而非 CLI 工具名）
- CLI 工具总数：当前 `src/tools/*.ts` 里注册的所有 `server.tool(...)` 第一字符串字面量

可选参数：

| 参数 | 作用 |
| --- | --- |
| `--json` | 输出结构化 JSON 到 stdout |
| `--json <path>` | 写到指定文件 |
| `--missing` | 只打印缺失入口 |
| `--missing <module>` | 只打印指定模块缺失入口 |

退出码：100% 覆盖返回 0，否则返回 1，可在 CI 里直接用 `pnpm coverage` 失败阻断合并。

## 当前结果（手动同步）

> 数字会随补全进度变化；以下是 2026-06-16 实测：

- 合计：`192 / 218 = 88.1%`
- CLI 工具总数：280
- 已 100% 模块：`program`
- 高覆盖（>=95%）：`testcase / task / bug / story`
- 仍需补齐（按缺口数排序）：`execution (5) / project (5) / todo (4) / release (3) / testtask (3) / testcase (1) / product (1) / task (1) / build (1) / bug (1) / story (1)`

> 维护约定：每次提交补全类 PR 时，必须把"当前结果"小节更新一次，CI 也按这个数字卡门禁。

## 工作原理（给维护者看）

脚本 `scripts/coverage.mjs` 做的事情：

1. 用 awk 从 `src/tools/*.ts` 的 `server.tool(` 调用块里切出第一字符串字面量 → 已注册 CLI 工具名集合。
2. 在脚本里写死两份表：
   - `ENTRIES[module] = [entry, ...]`：用户真正可调用的 controller entry 名清单。
   - `ALIAS["module|entry"] = [cliTool, ...]`：每个 entry 对应的 CLI 工具名（含别名）。
3. 对每个 `(module, entry)`，查 `ALIAS` 看有没有任何一个 CLI 工具已注册；命中算 1 个覆盖。
4. 输出 `覆盖 / 总数 / 比例` 与缺失清单。

为什么写死 `ENTRIES` 和 `ALIAS`：因为 zentao 18.5 controller.php 里同名的 entry 会出现在多个模块（如 `create` 同时是 execution / testcase / product / project / program / task / build / bug / testtask / story / release / todo 的入口），CLI 工具名又带模块前缀（`createExecution` / `createTestCase` / ...），动态推断会产生大量 false positive / false negative。手写表是已知最稳的方式。

新增模块 / 新增 entry 时，同步更新：

- `ENTRIES[新模块] = [...]`
- `ALIAS["新模块|entry"] = [cliTool, ...]`
- 如果有 `entry → 多 cliTool` 的关系，给该 entry 多个候选。

# Changelog

All notable changes to this project will be documented in this file.

## 0.1.21 - 2026-06-12

### Fixed

- 修复 `zentao install` / `zentao update` 安装 skill 时进入 `skills` agent 选择交互界面后无法响应 Enter 的问题；现在统一调用 `skills add <source> --yes`，保持安装 / 更新流程非交互执行。
- 避免安装 skill 时传入 `--global` 触发 `PromptScript does not support global skill installation`，确保默认 skill 安装路径可正常完成。

## 0.1.20 - 2026-06-12

### Added

- `zentao install` / `zentao update` 成功后新增 `zentao-cli` ASCII banner、快速开始命令和写操作提示，便于安装后直接确认下一步用法。
- 安装 / 更新执行 `npm install -g` 遇到 `ENOTEMPTY` 全局目录残留时，会输出可复制的清理和重装命令。

### Fixed

- 构建后自动修正 `dist/bin/*.js` 可执行权限，避免 npm 全局安装后 `zentao` / `zentao-cli` 因 bin 文件无执行权限而无法启动。

## 0.1.19 - 2026-06-12

### Added

- `getExecutionBugs` 新增 `--search`、`--module` 和 `--moduleId` 参数，支持在明确查询某个执行 / 迭代 Bug 时按关键词、模块名、模块别名或模块 ID 做客户端过滤。
- 新增共享 Bug 过滤逻辑，产品 Bug 与执行 Bug 均支持中文模块首字母别名匹配，例如 `云镜` 可用 `yj`。
- 测试覆盖补充执行 Bug 模块过滤、线上问题来源分流提示、CLI 参数解析、更新探针和安装配置链路。

### Changed

- 线上 / 生产 / 客户反馈问题的文档与工具提示统一为“先判断来源”：市场 / 售后 / 客户反馈查 `市场和售后问题跟踪`，测试 / 开发自发现查 `测试`，再按模块过滤真实业务产品。
- Bug 写操作补齐禅道 18.5 兼容处理，更新 Bug 改为走旧版编辑表单以保留必要字段，其他 Bug 流转会统一清理空白输入。
- 普通命令的每日更新探针与安装 / 更新配置流程继续收敛，只提示更新命令，不在查询时自动改动本机环境。

## 0.1.18 - 2026-06-11

### Added

- 新增 `getReleaseDetail`，支持按发布 ID 查询发布详情，补齐项目发布列表后的详情查询链路。
- 新增 `analyzeBugResources` 和 `analyzeTaskResources`，可从 Bug / 任务详情中解析附件和资源线索，下载到本地临时目录，并对小文本、图片、压缩包和二进制资源给出分析路由。
- 新增 `okBug`，通过旧版 `bug-ok-{id}.json` 控制器支持 Bug 验证通过动作。

### Changed

- `startTask` 针对禅道 18.5 REST start 行为异常增加状态和负责人恢复逻辑，避免开始任务后被错误置为完成。
- `resolveBug` 支持 `tostory` 解决方案，覆盖转需求场景。
- 发布前查询回归脚本补充 `okBug` 命令面检查。
- 每日更新探针改为只提示更新命令，不再在普通查询命令里自动执行安装；同时补齐 `legacyBaseUrl` 的配置录入链路。

## 0.1.17 - 2026-06-11

### Added

- `getProductBugs` 新增 `--search`、`--module` 和 `--moduleId` 参数，支持按关键词、模块别名或模块 ID 查询产品 Bug。
- 线上 / 生产 / 客户反馈 Bug 场景支持按来源分流：市场 / 售后 / 客户反馈来源查 `市场和售后问题跟踪`，测试 / 开发自发现来源查 `测试`，再通过模块匹配真实业务产品；模块别名大小写不敏感，常见中文模块支持首字母缩写，例如 `云镜` 可用 `yj`。

### Fixed

- 修复禅道 REST v1 忽略产品 Bug 列表 `query/moduleId` 参数时，CLI 无法按关键词或模块准确过滤的问题；现在会在需要过滤时全量分页拉取后做客户端过滤、排序和分页。

## 0.1.16 - 2026-06-10

### Added

- 新增每日更新探针：每天首次执行普通 `zentao` 命令时检查 npm 最新版本，发现新版本后提示并自动执行 `zentao update --skip-config-check`。
- 新增 GitHub Pages 极简命令速查页，提供安装、更新、角色入口、常用查询和环境变量命令的一键复制入口。
- 新增 Pages 发布工作流，推送 `main` 后自动部署 `docs/` 静态页面。

### Changed

- 命令速查页改为黑白线条风格，并在桌面端使用 hover/focus 显示复制动作，移动端保持复制按钮可见。
- 命令速查页新增本地 Wiki / 检索入口，可按关键词过滤本页维护的命令清单。

## 0.1.15 - 2026-06-10

### Added

- 新增命令级帮助：支持 `zentao help <command>` 与 `zentao <command> --help`，输出参数类型、必填/可选和字段说明。
- 新增发布前查询回归脚本 `pnpm release:smoke-query`，先检查全部 CLI 命令的 `help` / schema 入口，再用执行 `2140` 及其关联固定数据覆盖主要真实查询命令。
- Skill 新增 `reference/commands.md` 查询命令速查，覆盖全部查询入口、URL 映射和常用组合。

### Changed

- `/release` 项目命令和维护说明加入本地查询回归步骤，避免发布前只跑单元测试而遗漏真实 CLI 查询场景。
- Skill 增加命令选择强制规则：参数不确定时优先运行 `zentao help <command>`，避免凭印象猜参数。

## 0.1.14 - 2026-06-10

### Added

- README 增加图标与封面图资源，并补充标准 REST API 之外的页面 JSON、动作记录和前端请求模拟扩展场景说明。
- 新增 `ZENTAO_LEGACY_BASE_URL` 配置项，支持非标准部署路径下的旧版页面 JSON 请求。

### Changed

- CLI 参数解析支持 `--key=value` 写法，并对未知参数直接报错，避免拼写错误被静默忽略。
- tag 发布工作流改为执行完整 `pnpm check`，并将 `contents` 权限收敛为只读；GitHub Release 仍只由 `/release` 流程手动创建。
- 任务全量拉取在旧快捷方式返回不完整时会回退标准分页扫描；批量分页读取统一限制最大页数，避免异常 `total` 导致过量请求。
- Skill 执行参考文档泛化迭代名称示例，避免出现具体内部迭代名。

### Fixed

- 修复服务端将分页元信息返回为字符串数字时统计不准确的问题。
- 修复旧版页面请求 token 过期后不会自动重试的问题。

## 0.1.13 - 2026-06-08

### Added

- 新增项目级 `/release` 命令模板，固定发布顺序：检查状态、更新文档、提升版本、验证、提交、打 tag、推送、手动创建 GitHub Release、检查 Actions 和 npm。

### Changed

- GitHub Actions 发布链路只负责 tag push 后校验、构建和发布 npm；GitHub Release 统一由 `/release` 命令手动创建，避免多个来源同时创建 Release。

## 0.1.12 - 2026-06-08

### Added

- 新增 Task 状态流转与删除工具：`startTask`、`pauseTask`、`restartTask`、`closeTask`、`activateTask`、`assignTask`、`deleteTask`。
- 新增 Bug 写操作工具：`createBug`、`updateBug`、`assignBug`、`confirmBug`、`closeBug`、`activateBug`、`deleteBug`。
- 新增 Story 写操作工具：`createStory`、`closeStory`、`assignStory`、`activateStory`、`reviewStory`。
- 新增 Todo 完整能力：`getMyTodos`、`getTodoDetail`、`createTodo`、`updateTodo`、`deleteTodo`、`finishTodo`、`activateTodo`。

### Changed

- `addComment` 改为通过旧版 `action-comment-{type}-{id}.json` 控制器写入备注，适配禅道 18.5 REST v1 无独立 comment entry 的限制。
- `updateExecution` 和 `updateTestTask` 改为通过旧版编辑控制器提交表单，绕过禅道 18.5 REST v1 对应入口缺失或字段拼接问题。
- `updateTask` 补充 `type`、`desc`、`estStarted`、`module`、`story`、`status`、`closedReason`、`mailto` 等字段，并移除 REST PUT 不支持的 `comment` 字段。

## 0.1.11 - 2026-06-08

### Fixed

- 修复旧配置中 `apiVersion: legacy` 会在安装校验时继续沿用旧接口的问题；旧值和空值现在统一归一化为 `v1`。

## 0.1.10 - 2026-06-08

### Added

- `zentao update` 新增 `--skip-config-check`，支持只更新 CLI / skill 时跳过禅道登录校验。
- `zentao update` 新增 `--cli-only` 和 `--skill-only`，支持分开更新 CLI 或 skill。
- 文档新增 `npx -y @cloudglab/zentao-cli@latest update` 自举更新方式，避免本机旧版 update 行为异常时无法升级。

### Changed

- 默认 skill 更新链路改为从全局已安装的最新 `@cloudglab/zentao-cli` 包内读取 `skills/zentao-cli`，确保 `zentao update` 安装的是新版本 skill，而不是旧进程所在包内的旧 skill。

## 0.1.9 - 2026-06-08

### Added

- 新增 `zentao whoami`、`zentao who-am-i` 和 `zentao who am i`，用于查看当前登录用户信息。
- `zentao install` / `zentao update` 配置校验通过后会明确说明写操作状态：默认支持写，真实写入仍需 `confirm=true`，可用 `ZENTAO_DISABLE_WRITE=true` 禁用。

### Changed

- `zentao install` / `zentao update` 默认从 CLI 包内自带的 `skills/zentao-cli` 安装 skill；保留 `--skill-source git` 和 `--skill-source npm` 作为显式兜底。
- 禅道地址输入会自动提取协议、域名/IP 和端口，支持从完整页面 URL 中提取根地址。
- 写操作默认支持真实写入能力，仍保留 `confirm=true` 防误操作；显式禁用改为 `ZENTAO_DISABLE_WRITE=true`。
- README、skill 和安装参考文档同步安装链路、whoami、URL 处理、默认写状态和已拆分任务调整链路。

### Fixed

- 修复禅道旧 PHP 警告 HTML 混入 JSON 响应时的解析失败问题，可从警告文本中提取完整 JSON。

## 0.1.8 - 2026-06-07

### Fixed

- 同步 `src/version.ts` 的 CLI 运行时版本号，确保 `zentao --version` 输出与 npm 包版本一致。

## 0.1.7 - 2026-06-07

### Added

- README 和 skill 文档新增“场景命中链路”规则，按用户表达路由到 Bug、任务、需求、项目/执行、排期和父子任务场景。
- 补充拆任务/排任务默认链路：确认 `executionId` 和排期限制、查询父任务、必要时创建父任务、创建子任务并汇总。

## 0.1.6 - 2026-06-06

### Fixed

- 修正 `zentao install` / `zentao update` 的 skill 安装源，默认使用 `cloudglab/zentao-cli` GitHub 仓库源，避免把 npm 包名误解析为错误仓库地址。

### Added

- 新增 `--skill-source npm` 安装模式：在不能访问远程 `.git` 仓库但可以访问 npm 的环境中，自动下载 `@cloudglab/zentao-cli` 静态包、解压并通过本地路径安装 skill。
- 新增 `--skill-local-path` 参数，支持直接从已解压的本地 skill 包目录安装。
- 新增安装流程测试，覆盖默认 GitHub 源和 npm 静态包本地路径安装流程。

### Changed

- README、skill 文档和安装参考文档补充 GitHub 源、npm 静态包、本地路径三种 skill 安装方式。

## 0.1.5 - 2026-06-06

### Fixed

- 修正 skill 安装源：默认使用 `cloudglab/zentao-cli` GitHub 仓库源；不能访问远程 `.git` 仓库时，支持通过 npm 静态包解压后的本地路径安装 skill。

### Added

- 新增 `zentao install` / `zentao update` 内置命令，一键安装或更新 CLI 与 skill，并校验禅道配置。
- 新增 `getExecutionDynamic`，支持按执行 ID 近似读取执行动态摘要。
- 新增 `getExecutionDailyBugStats`，输出迭代每日 Bug、任务、参与人员和问题明细统计报告。
- 新增 `getMyWeeklyActivity`，支持上周、本周、最近 N 天、单日和自定义日期范围的个人阶段性工作清单。
- 新增 Vitest 测试体系、覆盖率配置和 lefthook pre-commit 检查入口。
- 新增核心函数、API 封装、工具注册、配置、认证和 HTTP 客户端测试。

### Changed

- `getMyTasks` 改为尽量拉取完整任务列表后在客户端按状态和分页过滤，以适配部分禅道部署忽略查询参数的问题。
- QA 角色新增任务相关命令入口。
- npm 发布文件列表加入 `skills` 目录，确保 skill 随包发布。
- README、skill 和 reference 文档同步到新增安装、动态和统计能力。

## 0.1.4 - 2026-06-05

### Changed

- 触发一次真实的 npm trusted publishing 自动发布验证。

## 0.1.3 - 2026-06-05

### Fixed

- 修复构建前未清理 `dist` 导致 npm 包可能混入旧 MCP 产物的问题；构建现会先清空 `dist` 再重新编译。

## 0.1.2 - 2026-06-05

### Changed

- 为 npm trusted publishing 补齐 `package.json.repository.url`，明确绑定到 `https://github.com/cloudglab/zentao-cli.git`。
- 版本提升到 `0.1.2`，用于重新触发自动发布链路。

## 0.1.1 - 2026-06-05

### Changed

- 发布工作流切换为 npm trusted publishing，去掉 `NPM_TOKEN` 发布依赖。
- GitHub Actions 发布环境升级为 Node.js 24，以满足 npm OIDC trusted publishing 运行要求。

## 0.1.0 - 2026-06-05

### Added

- 新增更稳的认证错误分类：区分账号密码错误、接口不存在、服务端异常、网络错误、响应异常。
- 新增 `ZENTAO_API_BASE_URL` 配置，支持非标准禅道 API 部署路径。
- 新增 `initZentao --save` 显式落盘控制，默认仅校验当前会话配置。
- 新增线上 Bug 查询强制判断与默认口径文档：`市场和售后问题跟踪` + 模块匹配。
- 新增 `getMyBugs` / `getMyBugStatistics` 默认跨产品查询能力，`productId` 改为可选收窄条件。
- 新增 GitHub Actions 发布链路：push `v*` tag 后自动校验、构建、发布 npm、创建 GitHub Release。
- 新增纯 CLI 运行层：`zentao help`、`zentao list`、`zentao --version`。

### Changed

- 包名统一为 `@cloudglab/zentao-cli`，本地命令统一为 `zentao`。
- skill 安装方式统一为 `npx skills add @cloudglab/zentao-cli -g`。
- 运行架构从 MCP server 切换为本地 CLI 命令执行链路。
- 发布产物运行时目标下调为 `Node.js >= 16`。
- TypeScript 构建目标下调为 `ES2020`，并移除运行时 `@modelcontextprotocol/sdk` 依赖。
- README、skill、reference 文档整体同步到“本地 `zentao` + skill 调用”口径。

### Fixed

- 修复 token 获取失败时对所有错误都盲目回退 MD5 的问题，仅在明确鉴权失败时回退。
- 修复固定 API 路径导致部分实例无法登录的问题。
- 修复默认将敏感配置落盘的问题，改为显式保存才写入本地。

# Changelog

All notable changes to this project will be documented in this file.

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
- 新增线上 Bug 查询强制判断与固定口径文档：`市场和售后问题跟踪` + 模块匹配。
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

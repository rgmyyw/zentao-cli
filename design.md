# 工程设计对齐文档

本文档提炼一类 TypeScript CLI + Agent Skill 项目中可复用的工程能力和组织方式。目标是让其他 CLI、Agent Skill 或自动化工具项目可以直接参考本文，把文档结构、安装维护、Skill 设计、测试方式、发布流程、代码风格和技术栈与本项目对齐。

## 1. 文档定位

### 1.1 适用项目

适用于以下类型的项目：

- 面向命令行用户的 TypeScript CLI。
- 面向 AI Agent / Skill 的工具包。
- 需要同时支持人工命令行、脚本调用、Agent 调用的自动化工具。
- 需要发布到 npm，并通过 GitHub Actions 做可信发布的包。
- 需要将大量能力按场景拆分成二级文档、命令清单和 reference 的工具项目。

### 1.2 对齐目标

其他项目参考本文时，应对齐这些方面：

- 文档结构：`README.md` 面向用户，`AGENTS.md` 面向维护者和 Agent，`CHANGELOG.md` 记录发布变化，`design.md` 记录可复用工程约定。
- 安装方式：提供一键安装、更新、卸载和配置校验。
- Skill 方式：将 Skill 源文件、发布产物、reference 文档和安装命令分层管理。
- 测试方式：统一使用 lint、typecheck、unit test、build、smoke query 和覆盖率脚本。
- Release 流程：以 `v*` tag 触发 npm publish，发布命令模板负责版本、文档、tag、GitHub Release、npm 校验。
- 代码风格：TypeScript strict、ESM、`.js` 后缀导入、zod schema、中文错误、写保护、按需加载。

## 2. 推荐目录结构

推荐沿用以下结构：

```text
.
├── .agents/skills/<skill-name>/       # Skill 开发源
├── .github/workflows/                 # CI、Pages、publish workflow
├── .opencode/opencode.json            # 项目级命令模板，例如 /release
├── assets/                            # README 图片等静态资源
├── docs/                              # GitHub Pages 静态页
├── scripts/                           # 构建、发布、覆盖率、文档生成脚本
├── skills/<skill-name>/               # npm 包内发布的 Skill 产物
├── src/
│   ├── api/                           # 远端服务 API 封装
│   ├── bin/                           # CLI 可执行入口
│   ├── core/                          # CLI 注册、配置、HTTP、输出、权限等基础设施
│   ├── tools/                         # 命令实现，按业务场景拆文件
│   ├── types/                         # 公共类型
│   ├── utils/                         # 纯函数工具
│   ├── cli.ts                         # CLI 主执行管线
│   ├── index.ts                       # 包导出入口
│   ├── install.ts                     # install/update/uninstall 实现
│   └── version.ts                     # CLI_VERSION
├── tests/                             # vitest 测试
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

目录职责约定：

- `src/api/` 只负责服务端接口、兼容逻辑、分页、旧版页面 fallback，不负责 CLI 参数解析。
- `src/tools/` 只负责 zod schema、命令注册、写保护、调用 API、返回 JSON。
- `src/core/` 放 CLI 框架能力，例如 registry、manifest、roles、config、http、write guard、output。
- `.agents/skills/` 是 Skill 的编辑源，`skills/` 是构建后放进 npm 包的发布产物。
- `scripts/` 中的脚本尽量零依赖、单职责、可在 CI 或 release 命令中复用。

## 3. 技术栈基线

### 3.1 运行时与语言

- Node.js：`>=16.0.0`。
- 包管理器：`pnpm@10.24.0`。
- TypeScript：`strict: true`。
- 模块系统：`type: "module"` + `module: "NodeNext"` + `moduleResolution: "NodeNext"`。
- 编译目标：`ES2020`。

### 3.2 依赖分层

运行时依赖保持克制：

- `axios`：HTTP 客户端。
- `zod`：CLI 参数 schema 和类型推断。

开发依赖：

- `typescript`：类型检查和构建。
- `tsx`：开发态运行 TypeScript。
- `vitest` + `@vitest/coverage-v8`：测试和覆盖率。
- `oxlint`：快速 lint。
- `lefthook`：pre-commit 钩子。

### 3.3 package scripts 模板

推荐脚本：

```json
{
  "scripts": {
    "build": "rm -rf dist && tsx scripts/generate-manifest.ts && node scripts/copy-skills.mjs && tsc -p tsconfig.json && node scripts/fix-bin-mode.mjs",
    "dev": "tsx src/bin/<cli>.ts",
    "lint": "oxlint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run --passWithNoTests",
    "coverage": "node scripts/coverage.mjs",
    "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build",
    "release:smoke-query": "node scripts/release-query-smoke.mjs",
    "prepare": "lefthook install"
  }
}
```

## 4. CLI 架构

### 4.1 多入口 bin

主入口只调用 `runCli(process.argv.slice(2))`。角色入口只是在参数前注入固定 role：

```ts
await runCli(['--role', 'qa', ...process.argv.slice(2)]).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
```

推荐同时提供：

- `<cli>`：完整入口。
- `<cli>-dev`：开发角色入口。
- `<cli>-qa`：测试角色入口。
- `<cli>-pm`：产品 / 项目角色入口。

角色入口只过滤命令暴露范围，不改变服务端账号权限。

### 4.2 命令注册机制

命令注册使用内存 registry：

```ts
export interface CliCommandDefinition {
  name: string;
  schema: ZodRawShape;
  handler: CliHandler;
  metadata?: {
    costHint?: 'low' | 'medium' | 'high';
    nextBestTools?: string[];
  };
}

export interface CliRegistry {
  tool<TShape extends ZodRawShape>(
    name: string,
    schema: TShape,
    handler: CliHandler<z.infer<z.ZodObject<TShape>>>,
    metadata?: CliCommandMetadata,
  ): void;
  listCommands(): CliCommandDefinition[];
}
```

实现约定：

- `server.tool('commandName', schema, handler, metadata)` 是唯一命令注册入口。
- `schema` 使用 zod raw shape，而不是完整 `z.object(...)`。
- CLI 参数解析时使用 `z.object(schema).strict()`，未知参数直接报错。
- 命令按名称排序输出，便于 `help`、`list` 和测试稳定。

### 4.3 group + role + manifest

推荐将命令按 group 拆分，并用动态 import 懒加载：

```ts
type GroupLoader = () => Promise<(server: CliRegistry) => void>;

export const groupLoaders: Record<ToolGroup, GroupLoader> = {
  task: async () => (await import('../tools/task.js')).registerTaskTools,
  bug: async () => (await import('../tools/bug.js')).registerBugTools,
};
```

运行时策略：

- `list/help` 优先读取 `dist/manifest.json`，避免启动时加载所有 tool 文件。
- 执行单个命令时，通过 `commandToGroup` 找到命令所属 group，只加载一个 group。
- manifest 缺失时回退到全量 `registerTools(registry, role)`，保证开发态可运行。
- 构建期生成 `src/core/command-groups.generated.ts` 和 `dist/manifest.json`。

### 4.4 CLI 执行管线

推荐主流程：

1. 解析 role、output、command、args。
2. 处理内置命令：`help`、`list`、`version`、`changelog`、`install`、`update`、`uninstall`。
3. 按需构建 registry。
4. 若命令带 `--help`，自动从 zod schema 渲染参数帮助。
5. 执行每日更新探针或轻量版本提醒。
6. 解析 CLI 参数并执行 handler。
7. 给 JSON 返回值注入 `meta.requestCount`、`meta.durationMs`。
8. 根据命令需要做定制化输出，例如 `whoami`。

## 5. Tool 写法

### 5.1 标准命令模板

读命令：

```ts
server.tool(
  'getMyTasks',
  {
    status: z.enum(['wait', 'doing', 'done', 'cancel', 'closed', 'all']).optional().default('all'),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional(),
  },
  async (input) => jsonResult(await getApi().task.getMyTasks(input)),
  { costHint: 'low', nextBestTools: ['getTaskDetail', 'getMyTaskStatistics'] },
);
```

写命令：

```ts
server.tool(
  'recordTaskEstimate',
  {
    taskId: z.number().int().positive(),
    date: z.string().trim().min(1).describe('登记日期，推荐 YYYY-MM-DD。'),
    consumed: z.number().positive().describe('本次登记消耗工时，必须大于 0。'),
    left: z.number().nonnegative().describe('登记后剩余工时，可为 0。'),
    work: optionalTrimmedText.describe('本次工作内容。'),
    confirm: z.boolean().optional().default(false),
  },
  async ({ confirm, ...input }) =>
    runWithPreview('recordTaskEstimate', confirm, input, previewOrAssertWriteAllowed,
      () => getApi().task.recordEstimate(input.taskId, input)),
);
```

### 5.2 zod schema 约定

- 数字 ID：`z.number().int().positive()`。
- 分页：`page: z.number().int().positive().optional()`、`limit: z.number().int().positive().max(100).optional()`。
- 必填字符串：`z.string().trim().min(1).describe('...')`。
- 可选字符串：统一使用 `optionalTrimmedText`，空字符串转 `undefined`。
- 枚举：`z.enum([...]).optional().default('all')`。
- 数组：`z.array(z.number().int().positive()).min(1).describe('...')`。
- 写命令：必须带 `confirm: z.boolean().optional().default(false)`。

### 5.3 命名约定

- 普通查询：`getXxx`、`searchXxx`。
- 我的工作：`getMyXxx`。
- 写操作：`createXxx`、`updateXxx`、`deleteXxx`、`closeXxx`、`activateXxx`。
- 批量操作：`batchCreateXxx`、`batchEditXxx`、`batchCloseXxx`。
- 关联操作：`linkXxxToYyy`、`unlinkXxxFromYyy`、`batchUnlinkXxxFromYyy`。
- 跨对象创建：`createTaskFromBug`、`createBugFromTestCase`。
- 快照或报表：`getXxxStatistics`、`getXxxSnapshot`。

### 5.4 输出模式

统一提供三档输出：

- `compact`：默认模式，适合 Agent 和终端预览。数组超过 20 条截断，长文本截断到约 600 字符。
- `normal`：保留主要数据，并抽取 `meta.source`、`meta.total`、`meta.scanned`、`meta.cacheHit` 等元信息。
- `verbose`：完整原始 JSON，适合调试。

Tool handler 永远返回：

```ts
{
  content: [{ type: 'text', text: JSON.stringify(payload) }]
}
```

## 6. API 层风格

### 6.1 聚合类

推荐提供一个 API 聚合类：

```ts
export class ProjectApi {
  readonly http: HttpClient;
  readonly task: TaskApi;
  readonly bug: BugApi;
  readonly user: UserApi;

  constructor(config: ProjectConfig) {
    this.http = new HttpClient(config);
    this.task = new TaskApi(this.http);
    this.bug = new BugApi(this.http);
    this.user = new UserApi(this.http);
  }
}
```

约定：

- 子 API 通过构造函数注入共享 HTTP client。
- 跨 API 协作通过构造注入，而不是在 API 内部临时 new。
- 测试中通过 `setApi(...)` 替换全局 API provider。

### 6.2 HTTP 封装

推荐 HTTP client 支持：

- `baseURL` 从配置归一化得到。
- 默认 `timeout: 30_000`。
- `http.Agent` / `https.Agent` 开启 keepAlive。
- GET 请求 15 秒内存缓存。
- 401 清 token 后重试一次。
- `ECONNRESET`、`ETIMEDOUT`、`EAI_AGAIN`、timeout、socket hang up、network 类错误重试一次。
- 错误统一包装成含 `statusCode`、`responseBody` 的 Error。
- 请求计数和最近请求耗时可被 CLI 注入到返回 `meta`。

### 6.3 兼容与 fallback

API 层可以封装服务端差异：

- REST v1 优先：`http.request('GET', '/tasks/{id}', { params })`。
- 旧版页面 fallback：`http.legacyRequest('POST', '/task-cancel-123.json', { data, headers })`。
- 服务端缺失能力时明确抛错，例如：`throw new Error('当前版本不支持 task/batchActivate')`。
- 服务端分页不稳定时，在 API 层做客户端分页和过滤，并在结果中标注 `source`、`total`、`scanned`。

## 7. 写保护

写操作默认允许预览，但真实执行必须显式确认。

### 7.1 环境变量

- 默认：支持写操作，但必须传 `confirm=true`。
- 禁用写操作：设置 `<APP>_DISABLE_WRITE=true`。

### 7.2 写保护结果

未传 `confirm=true` 时，不抛错，返回预览：

```json
{
  "ok": false,
  "preview": true,
  "reason": "写操作缺少确认。若要执行 updateTask，需要传入 confirm: true。",
  "action": "updateTask",
  "payload": {}
}
```

推荐规则：

- Tool 层统一使用 `runWithPreview(...)` 包裹写操作。
- API 层只表达具体业务写入，不判断 CLI confirm。
- 不支持的写操作返回明确诊断，不静默忽略。

## 8. 配置与认证

### 8.1 配置路径

默认配置文件：

```text
~/.<app>/config.json
```

文件权限建议：

- 配置目录：`0o700`。
- 配置文件：`0o600`。

### 8.2 环境变量优先级

推荐优先读取环境变量：

- `<APP>_URL`
- `<APP>_USERNAME` / `<APP>_ACCOUNT`
- `<APP>_PASSWORD`
- `<APP>_API_VERSION`
- `<APP>_API_BASE_URL`
- `<APP>_LEGACY_BASE_URL`

当核心三项 `url + username + password` 都存在时，直接使用环境变量，不读本地配置。否则读取本地配置，再用存在的环境变量覆盖。

### 8.3 install 配置校验

安装命令完成后应自动校验配置：

- 已有配置可用：输出 mask 后的配置诊断。
- 配置不可用且当前是 TTY：交互式引导输入。
- 非交互环境缺少配置：抛出明确错误，提示先设置环境变量。

## 9. 安装与维护方式

### 9.1 用户入口

推荐提供一键安装：

```bash
npx -y <package>@latest install
```

安装内容：

1. 安装全局 CLI：`npm install -g <package>@latest`。
2. 安装 Skill：`npx -y skills add <source> --global --agent universal --yes`。
3. 校验远端配置。
4. 输出快速开始说明。

### 9.2 install/update/uninstall 参数

推荐支持：

- `--skill-source local|git|npm`：选择 Skill 来源。
- `--skill-local-path <path>`：使用本地 Skill 目录。
- `--skip-config-check true`：跳过配置校验。
- `--cli-only true`：只安装 / 卸载 CLI。
- `--skill-only true`：只安装 / 卸载 Skill。
- `uninstall --confirm true`：真实卸载。
- `--keep-config true`：卸载时保留配置。

### 9.3 残留清理

安装和更新要处理 npm/npx 残留：

- 遇到 `ENOTEMPTY` 或 `directory not empty` 时，清理全局包残留后重试。
- 清理 `~/.npm/_npx` 中包含当前包的缓存目录。
- 卸载时先卸 Skill，再卸 CLI，再按参数决定是否删除配置。

## 10. Skill 设计与安装

### 10.1 Skill 双目录模式

本项目使用双目录：

```text
.agents/skills/<skill-name>/   # 开发源，维护者编辑这里
skills/<skill-name>/           # 发布产物，构建时复制到这里并打入 npm 包
```

构建时复制：

```js
const source = path.resolve('.agents/skills/<skill-name>');
const target = path.resolve('skills/<skill-name>');
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
```

好处：

- `.agents/skills/` 保持为真实编辑源。
- `skills/` 只作为 npm 包内容，避免手工改错目录。
- npm `files` 中显式包含 `skills`。

### 10.2 SKILL.md frontmatter

推荐格式：

```md
---
name: <skill-name>
description: 一句话说明这个 skill 暴露什么能力、默认保护策略是什么。
triggers:
  - cli-name
  - 中文关键词
  - 业务关键词
argument-hint: "[command]"
---
```

正文结构：

1. 项目一句话定位。
2. 入口优先级。
3. 写保护。
4. 命令选择强制规则。
5. reference 路由表。
6. 启动命令。
7. role 说明。
8. 适用场景。

### 10.3 reference 文档

推荐按场景拆成二级 reference：

```text
reference/
├── index.md
├── cli.md
├── install.md
├── task.md
├── task-advanced.md
├── bug.md
├── bug-advanced.md
├── scenarios.md
└── cheatsheet.md
```

原则：

- `SKILL.md` 保持短，只负责路由和强规则。
- 高频场景放 `<scene>.md`。
- 低频、批量、管理员、状态变更放 `<scene>-advanced.md`。
- 全量命令放 `cheatsheet.md`。
- 典型组合放 `scenarios.md`。

### 10.4 Skill 安装命令

推荐 install 内部生成：

```bash
npx -y skills add <source> --global --agent universal --yes
```

删除：

```bash
npx -y skills remove <skill-name> --yes
npx -y skills remove <skill-name> --yes --global
```

## 11. 测试方式

### 11.1 vitest 配置

推荐配置：

```ts
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    globals: false,
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    maxConcurrency: 1,
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage'
    }
  }
});
```

说明：

- `globals: false`，测试显式 import `describe/it/expect/vi`。
- `pool: forks` 且串行，减少全局状态、环境变量、模块 mock 的相互影响。
- 覆盖率使用 V8。

### 11.2 测试目录

推荐：

```text
tests/
├── cli.test.ts
├── install.test.ts
├── core/
├── tools/
├── api/
└── utils/
```

测试风格：

- 测试标题使用中文，描述行为而不是实现。
- API 和 handler 用 `vi.fn()` mock。
- CLI 集成测试 mock `process.stdout.write` / `process.stderr.write`。
- 模块 mock 使用 `vi.doMock(...)`，且必须在动态 `import(...)` 前。
- 每个测试后恢复全局状态：`vi.restoreAllMocks()`、`vi.resetModules()`、恢复 env。
- 写保护测试必须断言 preview 时真实 handler 没有被调用。

### 11.3 smoke query

发布前保留 `release:smoke-query`：

- 检查 `dist/bin/<cli>.js` 是否存在。
- 对关键命令跑 `help <command>`，确保 schema 能渲染帮助。
- 对真实查询命令跑 JSON 校验。
- 支持 `--dry-run` 和 `--continue-on-error`。
- 固定数据 ID 用环境变量覆盖，例如 `<APP>_SMOKE_TASK_ID`、`<APP>_SMOKE_PROJECT_ID`。
- 失败时退出码为 1。

### 11.4 覆盖率统计脚本

对于“CLI 覆盖远端控制器 / API entry”的项目，推荐维护：

- `ENTRIES`：手写的服务端入口清单。
- `ALIAS`：服务端入口到 CLI 命令名的映射。
- 扫描 `src/tools/*.ts` 中 `server.tool('name', ...)` 得到实际 CLI 命令。
- 输出各模块 `已覆盖 / 总数 / 比例`。
- 覆盖率低于 100% 时 `process.exitCode = 1`，可作为 CI 门禁。

不要试图完全自动从服务端源码推断入口；同名 entry 在多个模块复用时容易误判。

## 12. 质量门禁

### 12.1 本地 check

统一门禁：

```bash
pnpm check
```

展开为：

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### 12.2 pre-commit

使用 `lefthook.yml`：

```yaml
pre-commit:
  commands:
    check:
      run: pnpm check
```

### 12.3 忽略规则

推荐忽略：

```text
node_modules/
dist/
coverage/
.codegraph/
.codex/
.cursor/
.DS_Store
*.log
.env
```

## 13. 发布流程

### 13.1 GitHub Actions publish

推荐 publish workflow：

- `push tags: v*` 触发。
- `concurrency` 按 `github.ref` 分组，`cancel-in-progress: false`。
- 权限：`contents: read`、`id-token: write`。
- Setup pnpm、Node.js、registry-url。
- `pnpm install --frozen-lockfile`。
- 校验 tag 版本等于 `package.json` 版本。
- `pnpm check`。
- `npm publish --provenance --access public`。

GitHub Actions 只负责 npm publish，不负责创建 GitHub Release。

### 13.2 Pages

如项目有静态命令速查页，推荐：

- `docs/` 作为 Pages artifact。
- main 分支 push 和 `workflow_dispatch` 触发。
- 权限：`contents: read`、`pages: write`、`id-token: write`。

### 13.3 项目级 /release 命令模板

推荐在 `.opencode/opencode.json` 中维护项目级 release command。模板要固定顺序：

1. 检查发布前状态：`git status`、最近提交、`package.json` 版本、`src/version.ts` 版本、最新 tag、`gh auth status`。
2. 检查工作区改动，确认这些改动就是本次发布内容。
3. 更新 `CHANGELOG.md`，新增目标版本记录，补齐断档版本。
4. 更新 `README.md`，同步用户可见能力和命令示例。
5. 提升 patch 版本，同步 `package.json` 与 `src/version.ts`。
6. 运行 `pnpm check`。
7. 运行 `pnpm release:smoke-query`。
8. 提交代码，commit message 使用 `feat/fix/docs/chore/release` 中合适的一种。
9. 创建 annotated tag：`vX.Y.Z`，message 为 `Release vX.Y.Z`。
10. 推送 main 和 tag。
11. 手动创建 GitHub Release，使用 CHANGELOG 中该版本内容作为 release notes，并包含 compare 链接。
12. 检查 GitHub Actions publish workflow，确认 npm publish 成功。
13. 用 `npm view <package>@X.Y.Z version` 确认 npm 版本可见。
14. 最后检查 `git status --short`，确保工作区干净。

防 failure 规则：

- 发布前检查 `.github/workflows/publish.yml`，不得包含自动创建 GitHub Release 的步骤。
- GitHub Release 只能由 `/release` command 创建，避免多个来源创建 Release。
- 如果 Actions 失败，用 `gh run view <run-id> --log-failed` 排查。
- CHANGELOG 新增内容使用中文，命令名、版本号、URL 和代码片段除外。
- 不跳过 `CHANGELOG.md`、`README.md`、`pnpm check`、`pnpm release:smoke-query`。

## 14. 文档结构

### 14.1 README.md

`README.md` 面向用户，只保留：

- 项目定位和 hero 图。
- 当前版本补了什么。
- 版本要求。
- 安装方式。
- 命令速查页。
- 临时 npx 用法。
- AI / 脚本推荐读法。
- 批量写操作示例。
- 环境变量。
- “可以这样问”的自然语言示例。
- 场景命中链路。
- 更新记录和常用命令示例。
- 写操作保护。
- 更多命令入口。

README 不承载实现细节、MVP 限制和维护规则。

### 14.2 AGENTS.md

`AGENTS.md` 面向维护者和 Agent，放：

- 项目定位。
- Agent 使用原则。
- 角色入口说明。
- 当前核心能力清单。
- 场景能力说明。
- 已知限制。
- 写操作保护。
- 环境变量。
- 开发命令。
- 覆盖率统计说明。
- 发布链路。

### 14.3 CHANGELOG.md

推荐格式：

```md
# Changelog

## X.Y.Z - YYYY-MM-DD

### 新增

- ...

### 变更

- ...

### 修复

- ...

### 验证

- `pnpm typecheck`、`pnpm lint`、`pnpm build`、`pnpm test` 全部通过。
```

### 14.4 docs/

`docs/` 用于 GitHub Pages，不随 npm 包核心逻辑耦合。适合放：

- 命令速查静态页。
- 可搜索命令表。
- 使用示例集合。

## 15. 代码风格

### 15.1 TypeScript 与 ESM

- 源码使用 TypeScript strict。
- 包使用 ESM。
- 所有源码 import 都写 `.js` 后缀，即使实际源文件是 `.ts`：

```ts
import { runCli } from '../cli.js';
import type { Role } from './types/common.js';
```

### 15.2 类型风格

- 尽量不用 `any`，使用 `unknown` + 类型守卫。
- 公共类型放 `src/types/`。
- API 输入输出类型放在对应 `src/api/*.ts` 附近。
- 构造注入成员使用 `private readonly`。

### 15.3 错误风格

- 错误消息使用中文。
- 直接 `throw new Error('...')`。
- CLI 顶层 catch 后写入 stderr 并 `process.exit(1)`。
- 错误消息要说明问题和下一步，例如：
  - `未知参数: --xxx`
  - `无法解析数字: abc`
  - `写操作缺少确认。若要执行 updateTask，需要传入 confirm: true。`
  - `当前版本不支持 task/batchActivate，请逐个调用 activateTask`。

### 15.4 纯函数与工具函数

- 查询过滤、字段归一、日期处理、表单序列化放到纯函数。
- 纯函数输入输出明确，便于单测。
- 业务 API 内只组合这些工具，不写重复字符串处理。

### 15.5 生成文件

- 生成文件加头部注释：`由 scripts/... 在 build 时自动生成，请勿手动编辑。`
- 生成文件必须可重建。
- 生成结果参与构建，不手工修改。

## 16. 可执行规则清单

以下规则都是本项目实际落地、并能被工具链、CI 或脚本自动验证的硬性约定。新项目对齐时，每条都应可被某个命令检查。

### 16.1 关键字与版本锁定

| 规则 | 实际值 | 验证来源 |
| --- | --- | --- |
| 包管理器 | `pnpm@10.24.0` | `package.json` 的 `packageManager` |
| Node 运行时 | `>=16.0.0` | `package.json` 的 `engines.node` |
| CI Node 版本 | `24` | `.github/workflows/publish.yml` 的 `setup-node` |
| CI pnpm 版本 | `10.24.0` | `.github/workflows/publish.yml` 的 `pnpm/action-setup` |
| 模块系统 | ESM（`"type": "module"`） | `package.json` |
| TS 目标 | `ES2020` | `tsconfig.json` |

### 16.2 类型与 lint 规则（`pnpm typecheck` / `pnpm lint`）

- `tsconfig.json` 必须开启：`strict: true`、`forceConsistentCasingInFileNames: true`、`skipLibCheck: true`、`declaration: true`、`sourceMap: true`。
- 模块解析：`module: "NodeNext"` + `moduleResolution: "NodeNext"`。
- 编译范围：只 `include: ["src/**/*.ts"]`，`rootDir: "src"`，`outDir: "dist"`。
- `typecheck` 命令必须 `--noEmit`，只做类型检查不产出。
- lint 使用 `oxlint src`，默认规则集，无自定义配置文件（项目根没有 `.oxlintrc`）。新增 lint 规则应显式落到配置文件，不要散在命令行。
- 不允许 `any`：统一用 `unknown` + 类型守卫。

### 16.3 构建规则（`pnpm build`）

构建必须按固定顺序执行，任何一步失败即构建失败：

1. `rm -rf dist`。
2. `tsx scripts/generate-manifest.ts`：生成 `src/core/command-groups.generated.ts` 和 `dist/manifest.json`。
3. `node scripts/copy-skills.mjs`：把 `.agents/skills/<skill-name>` 复制到 `skills/<skill-name>`。
4. `tsc -p tsconfig.json`。
5. `node scripts/fix-bin-mode.mjs`：给 `dist/bin/*.js` 设置 `0o755` 可执行位。

可验证的约束：

- 生成文件头必须含 `由 scripts/... 在 build 时自动生成，请勿手动编辑。`
- `dist/manifest.json` 必须含 `version / commands / groups / commandToGroup` 四个字段。
- npm 包 `files` 白名单只允许：`dist`、`assets/readme/*`、`skills`、`README.md`、`CHANGELOG.md`。

### 16.4 测试规则（`pnpm test`）

| 规则 | 实际值 | 来源 |
| --- | --- | --- |
| 框架 | vitest | `vitest.config.ts` |
| 全局 API | 关闭（`globals: false`） | `vitest.config.ts` |
| 环境 | `node` | `vitest.config.ts` |
| pool | `forks` | `vitest.config.ts` |
| 并发 | 关闭（`fileParallelism: false`、`maxConcurrency: 1`、`maxWorkers: 1`） | `vitest.config.ts` |
| 覆盖率 provider | `v8` | `vitest.config.ts` |
| 测试文件 | `src/**/*.test.ts`、`tests/**/*.test.ts` | `vitest.config.ts` |
| 无测试不报错 | `--passWithNoTests` | `package.json` |

测试内强制写法：

- 显式 `import { describe, it, expect, vi } from 'vitest'`，禁止依赖全局。
- `describe` / `it` 标题使用中文。
- 模块 mock 必须先 `vi.doMock(...)` 再 `await import(...)`，并在每个用例后 `vi.resetModules()` + `vi.restoreAllMocks()`。
- 修改 `process.env` 的测试必须 `afterEach` 恢复原始值。
- 写保护测试必须断言 preview 返回时真实 handler 未被调用（`expect(fn).not.toHaveBeenCalled()`）。

### 16.5 质量门禁（`pnpm check`）

- `pnpm check` 等价于 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`，四步串联，任意一步失败即失败。
- `lefthook.yml` 在 `pre-commit` 阶段强制运行 `pnpm check`。
- `prepare` 脚本为 `lefthook install`，克隆后自动装配钩子。

### 16.6 写保护运行时规则

可被运行时和测试验证的写保护语义：

- `<APP>_DISABLE_WRITE` 严格判定：仅当值为字符串 `'true'` 时禁用，`'false'` 视为开启。
- 写命令缺 `confirm: true` 时**不抛错**，返回 `{ ok: false, preview: true, reason, action, payload }` 预览。
- 命中不支持写操作表时返回明确诊断，不静默忽略。
- 所有写命令 schema 必须含 `confirm: z.boolean().optional().default(false)`。
- CLI 收到 `--confirm` 无值时归一为 `true`。

### 16.7 配置与文件权限规则

- 配置目录 `~/.<app>/`：`mkdirSync(..., { recursive: true, mode: 0o700 })`。
- 配置文件 `~/.<app>/config.json`：写入 `mode: 0o600`。
- 配置损坏时抛 `配置文件损坏，请检查 <path>：<message>`。
- 环境变量优先级：核心三项 `URL + USERNAME + PASSWORD` 齐全时直接使用，不读本地文件；否则读本地文件后用环境变量覆盖。
- `<APP>_URL` 只传根域名，不带 API 子路径，由 `normalizeServerUrl` 补协议和归一。

### 16.8 HTTP 与认证运行时规则

- `baseURL` 缺省为 `${config.url}/<api-base-path>/${config.apiVersion}`，例如 `/api.php/v1`。
- 请求 `timeout: 30_000`。
- 启用 `http.Agent` / `https.Agent` 的 keepAlive。
- GET 请求内存缓存，TTL 15 秒，命中注入 `cacheHit: true`。
- 401：清 token 后重试一次。
- 网络重试一次，触发条件命中 `ECONNRESET / ETIMEDOUT / EAI_AGAIN` 或 `/timeout|socket hang up|network/i`。
- 连续两次网络失败按网络阻塞上报，不无限重试。
- 登录：明文密码失败回退 MD5 再试一次；仍失败抛 `登录失败：账号或密码错误；已尝试明文密码和 MD5 密码。`
- 全部 HTTP 错误统一包装为含 `statusCode` 与 `responseBody` 的 Error。

### 16.9 CLI 参数解析规则

- `z.object(schema).strict()` 解析，未知 `--key` 抛 `未知参数: --xxx`。
- 位置参数抛 `无法识别的位置参数: xxx`。
- 布尔值支持 `true/false/1/0/yes/no/y/n/on/off`，大小写不敏感，否则抛 `无法解析布尔值: ...`。
- 数字用 `Number(value)` + `Number.isFinite` 校验，否则抛 `无法解析数字: ...`。
- 数组支持：重复参数累积、`a,b,c` 自动切分、JSON 字符串 `[1,2]`。
- 对象参数强制 `JSON.parse`，否则抛 `无法解析对象参数: ...`。
- role 写法：`--role=qa` / `--role qa` / `-r=qa` / `-r qa` / 裸 `qa` 全部支持，非法值抛 `无效 role: <value>`。
- output 模式：`--output=normal` / `--output normal`，非法值抛 `无效 output: <value>`。

### 16.10 输出模式规则

| 模式 | 数组 | 长字符串 | meta |
| --- | --- | --- | --- |
| `compact`（默认） | 超 20 条截断为 `{ total, items }` | `content/data/raw/html/text/message` 等超 600 字符截断 | 不附加 |
| `normal` | 原样 | 原样 | 抽取 `source/partial/page/limit/total/scanned/durationMs/cacheHit/fallbackUsed` 中存在的 key |
| `verbose` | 原样 | 原样 | 原样 |

- CLI 顶层在每个命令返回值里注入 `meta.requestCount` 与 `meta.durationMs`。
- `whoami` 命令走专用渲染，不走通用 JSON 输出。

### 16.11 覆盖率与 reference 门禁

两套覆盖率脚本，用途不同：

- `pnpm coverage`（`scripts/coverage.mjs`）：CLI 覆盖远端控制器 entry。
  - 事实源为手维护的 `ENTRIES` 与 `ALIAS`，禁止从服务端源码自动推断。
  - 新增 entry 必须同步更新 `ENTRIES` / `ALIAS`。
  - 每次补全 PR 必须更新 AGENTS.md 的"当前快照"数字。
  - 覆盖率 < 100% 时 `process.exitCode = 1`，CI 视为门禁失败。

- `scripts/check-coverage.mjs`：reference 文档覆盖 CLI 命令。
  - 必须先用 `scripts/extract-commands.mjs` 生成 `/tmp/commands.json`。
  - 校验 `CLI 注册命令数 == reference 提到命令数`，且 `未覆盖 = 0`、`误识别 = 0`。
  - 当前快照：CLI 注册 306、reference 提到 306、diff 0。

### 16.12 发布规则（CI + release 模板）

CI 可验证：

- 触发条件：`push tags: v*`。
- 并发组 `publish-${{ github.ref }}`，`cancel-in-progress: false`（发布不可被取消）。
- 权限：`contents: read`、`id-token: write`。
- 锁文件：`pnpm install --frozen-lockfile`。
- Tag 版本必须等于 `package.json` 的 `version`，不等直接 `exit 1`。
- 发布前必须 `pnpm check` 通过。
- 发布命令：`npm publish --provenance --access public`（可信发布）。
- GitHub Actions 只做 npm publish，**禁止**包含任何自动创建 GitHub Release 的步骤。

`/release` 模板强制顺序（13 步）+ 防 failure 规则：

- 发布前必须检查 `git status`、最近提交、`package.json` 版本、`src/version.ts` 版本、最新 tag、`gh auth status`。
- 不跳过 `CHANGELOG.md`、`README.md`、`pnpm check`、`pnpm release:smoke-query` 任一步。
- `src/version.ts` 的 `CLI_VERSION` 必须与 `package.json` 的 `version` 同步。
- CHANGELOG 新增内容必须中文，命令名、版本号、URL、代码片段除外。
- 创建 annotated tag `vX.Y.Z`，message 为 `Release vX.Y.Z`。
- GitHub Release 只能由 `/release` 创建，release notes 取自 CHANGELOG 该版本内容并含 compare 链接。
- 发布后用 `npm view <package>@X.Y.Z version` 确认可见，最后 `git status --short` 确认工作区干净。

### 16.13 smoke query 规则

- 缺 `dist/bin/<cli>.js` 直接退出 1。
- 对每个命令面跑 `help <name>`，断言输出含命令名和 `用法：` 区块。
- 对真实查询跑 JSON 校验，固定数据 ID 用环境变量覆盖（`<APP>_SMOKE_*`）。
- 支持 `--dry-run` 与 `--continue-on-error`。
- 失败计数 `failed > 0` 时退出码 1。

### 16.14 忽略规则（`.gitignore`）

必须忽略且不提交：`node_modules/`、`dist/`、`coverage/`、`.codegraph/`、`.codex/`、`.cursor/`、`.DS_Store`、`*.log`、`.env`。

### 16.15 提交与维护约定

- 未被明确要求时**不得提交代码**，也不得主动建议提交。
- 不自动 commit、不自动 push、不自动创建 PR / Release。
- 不在未被要求时跑单元测试做正确性验证。
- 遇到 `ECONNRESET` / TLS 断开，可重试一次；连续失败两次先按网络阻塞上报。
- 写操作默认支持，真实写入必须 `confirm=true`；要完全禁用设置 `<APP>_DISABLE_WRITE=true`。
- 查询旧版页面 URL 时，先解析路径里的对象类型和 ID，再调 CLI 查结构化数据。
- 角色过滤只改变 CLI 暴露命令范围，不改变服务端账号权限。

## 17. 新项目对齐清单

创建新项目时按以下清单落地：

- [ ] `package.json` 使用 ESM、pnpm、Node engines、bin 多入口、`files` 白名单。
- [ ] `tsconfig.json` 使用 `ES2020`、`NodeNext`、`strict`、`declaration`、`sourceMap`。
- [ ] 建立 `src/api`、`src/core`、`src/tools`、`src/bin`、`src/types`、`src/utils`。
- [ ] 建立 `CliRegistry`、`registerTools`、`roles`、`manifest`、`write-guard`、`config`、`http`。
- [ ] 所有 tool 使用 `server.tool(name, schema, handler, metadata)`。
- [ ] 写命令统一 `confirm` + `runWithPreview`。
- [ ] API 层封装 HTTP 重试、错误包装、分页、fallback。
- [ ] 建立 `.agents/skills/<skill-name>` 作为 Skill 源。
- [ ] 构建时复制 `.agents/skills` 到 `skills`。
- [ ] `SKILL.md` 保持短，场景细节下沉到 `reference/`。
- [ ] `README.md` 面向用户，`AGENTS.md` 面向维护者，`CHANGELOG.md` 面向发布记录。
- [ ] 添加 `vitest.config.ts`，测试串行运行，显式 import vitest API。
- [ ] 添加 `pnpm check` 和 `lefthook` pre-commit。
- [ ] 添加 `release:smoke-query`。
- [ ] 添加 `.github/workflows/publish.yml`，tag `v*` 触发 npm provenance publish。
- [ ] 添加 `.opencode/opencode.json` 的 `/release` 模板。
- [ ] 发布前固定运行 `pnpm check` 和 `pnpm release:smoke-query`。

## 18. 最小可复制模板

如果只复制最小骨架，至少保留：

```text
src/bin/<cli>.ts
src/cli.ts
src/core/cli-registry.ts
src/core/tool-registry.ts
src/core/roles.ts
src/core/manifest.ts
src/core/write-guard.ts
src/core/config.ts
src/core/http.ts
src/tools/shared.ts
src/tools/profile.ts
src/api/index.ts
src/install.ts
scripts/generate-manifest.ts
scripts/copy-skills.mjs
scripts/fix-bin-mode.mjs
.agents/skills/<skill-name>/SKILL.md
.agents/skills/<skill-name>/reference/index.md
.github/workflows/publish.yml
README.md
AGENTS.md
CHANGELOG.md
```

这个最小模板可以支撑一个具备安装、Skill、help/list、写保护、测试、构建和发布能力的 CLI 项目。

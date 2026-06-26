---
name: zentao-cli
description: 禅道 CLI 技能包 - 把禅道 18.5 的任务、Bug、需求、执行、测试、构建、发布能力暴露给命令行 / 智能体使用，默认带写保护。
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

把禅道 18.5 REST v1 能力暴露给命令行和 AI Skill。优先本机 `zentao`；未安装时一键 `npx -y @cloudglab/zentao-cli@latest install`。

## 入口优先级

1. 本机已安装 `zentao` → 直接执行。
2. 未安装 → `npx -y @cloudglab/zentao-cli@latest install` 一键安装 CLI + skill + 配置校验。
3. 当前环境不方便安装 → 临时 `npx -y @cloudglab/zentao-cli@latest`。
4. 旧版页面 URL → 先 `parseUrlIntent` 解析为对象类型和 ID，再调对应命令。

## 写保护

- 默认支持写操作；真实写入仍必须传 `confirm=true`。
- 如需禁用写操作 → 设置 `ZENTAO_DISABLE_WRITE=true`。

## 下一步自动推荐（`--recommend`）

- 命令执行后可在 JSON 返回的 `meta.next` 看到结构化推荐，含 `tool / reason / args / example`。
- 全局 opt-in flag：传 `--recommend`（或 `--recommend=true`）；不传则不输出。
- 推荐按 `priority` 倒序；参数按声明从 `input` 或 `payload` 路径解析，解析不到则不预填。
- 例：

  ```bash
  zentao --recommend getBugDetail --bugId 84362
  # meta.next[0] = { tool: "resolveBug", reason: "Bug 已修复...", args: { bugId: 84362 }, example: "zentao resolveBug --bugId 84362 --confirm true" }
  ```

- 已覆盖首批 ~20 个查询入口（任务 / Bug / 需求 / 执行 / 项目 / 产品 / 构建 / 测试 / 搜索），其他命令会自然回退到原有 `nextBestTools`。

## 命令选择强制规则

- 不确定命令名 / 参数 → 先查 `reference/<场景>.md`，不要猜参数名。
- 二次校对 → `zentao help <command>`；本机没装时用 `npx -y @cloudglab/zentao-cli@latest help <command>`。
- 旧版 URL → 先解析 → 再调 CLI 查询结构化数据。
- 返回 `未知参数` → 立即 `zentao help <command>` 校对，不要换一个看起来相似但未确认的参数。

## Reference 路由

| 场景 | 主链路 | 高级 / 批量 |
| --- | --- | --- |
| 任务 Task | `task.md` | `task-advanced.md` |
| Bug | `bug.md` | `bug-advanced.md` |
| 需求 Story | `story.md` | `story-advanced.md` |
| 执行 / 迭代 Execution | `execution.md` | `execution-advanced.md` |
| 产品 Product | `product.md` | `product-advanced.md` |
| 项目 Project | `project.md` | `project-advanced.md` |
| 项目集 Program | `program.md` | — |
| 计划 Plan | `plan.md` | — |
| 构建 Build | `build.md` | `build-advanced.md` |
| 发布 Release | `release.md` | — |
| 测试用例 TestCase | `testcase.md` | `testcase-advanced.md` |
| 测试单 TestTask | `testtask.md` | `testtask-advanced.md` |
| 待办 Todo | `todo.md` | — |
| 统计 Statistics | `statistics.md` | — |
| 开发上下文 / 关联 / 评论 | `context.md` / `relation.md` / `comment.md` | — |
| 资源分析 / 搜索 | `resource-analysis.md` / `search.md` | — |
| URL 解析 | `url-intent.md` | — |
| CLI 基础（help / list / whoami） | `cli.md` | — |
| 安装 / 更新 / 卸载 | `install.md` | — |
| 全量 306 命令速查 | `cheatsheet.md` | — |
| 场景化组合示例 | `scenarios.md` | — |

速查入口：`reference/index.md`。

## 启动

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

## 角色

`--role full|dev|pm|qa` 只过滤 CLI 暴露的命令，不改变禅道登录身份或服务端权限。

## 适用场景

- 命令行手工操作禅道
- 智能体 / 脚本自动化调用
- AI Skill 调用禅道 API

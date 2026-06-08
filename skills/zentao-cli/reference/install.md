# 安装 / 更新

## 一键安装 CLI + Skill

```bash
npx -y @cloudglab/zentao-cli@latest install
```

它会依次执行：

1. 安装全局 CLI：`npm install -g @cloudglab/zentao-cli@latest`
2. 从 CLI 包内自带的 `skills/zentao-cli` 安装 skill
3. 如果没有禅道配置，或已有配置登录失败，则提示输入配置并校验
4. 配置校验通过后说明写保护状态：默认支持写操作；真实写入仍需要 `confirm=true`，如需禁用写操作可设置 `ZENTAO_DISABLE_WRITE=true`

需要强制重新下载 npm 静态包时，可改用 npm 模式：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source npm
```

需要从 GitHub 仓库安装 skill 时，可显式指定：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source git
```

如果已经提前下载并解压好了 npm 静态包，也可以直接指定本地目录：

```bash
zentao install --skill-local-path ./package
```

后续更新可运行：

```bash
zentao update
```

`zentao update` 会重新安装最新 CLI，然后从全局已安装的最新 CLI 包内安装 skill，并再次校验禅道配置。

只是更新 CLI / skill，不想被配置校验阻塞时：

```bash
zentao update --skip-config-check
```

如果本机旧版 `zentao update` 行为异常，可用最新 npm 包自举更新：

```bash
npx -y @cloudglab/zentao-cli@latest update
```

只更新其中一部分时：

```bash
zentao update --cli-only
zentao update --skill-only
```

## 安装 CLI

```bash
# 运行时要求：Node.js >= 16
npm i -g @cloudglab/zentao-cli@latest
```

或直接运行：

```bash
npx -y @cloudglab/zentao-cli@latest --help
```

## 安装 Skill

默认一键安装会使用 CLI 包内自带 skill。手动从 GitHub 仓库安装：

```bash
npx -y skills add -g cloudglab/zentao-cli
```

只能访问 npm、不能 clone `.git` 仓库时：

```bash
npm pack @cloudglab/zentao-cli@latest
tar -xzf cloudglab-zentao-cli-*.tgz
npx -y skills add -g ./package
```

## 检查是否已安装

```bash
command -v zentao
zentao --version
zentao version
zentao help
zentao whoami
```

## 更新

```bash
zentao update
npx -y @cloudglab/zentao-cli@latest update
```

skill 内推荐优先调用本地 `zentao`；只有在当前环境不方便安装时，才退回 `npx -y @cloudglab/zentao-cli@latest`。

如果你不想全局安装，也可以一直用：

```bash
npx -y @cloudglab/zentao-cli@latest
```

## 写操作说明

默认支持写操作；真实写入仍需要在命令参数中传 `confirm=true`。

如需禁用写操作，可设置 `ZENTAO_DISABLE_WRITE=true`。

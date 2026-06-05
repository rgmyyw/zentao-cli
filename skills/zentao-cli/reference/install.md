# 安装 / 更新

## 一键安装 CLI + Skill

```bash
npx -y @cloudglab/zentao-cli@latest install
```

它会依次执行：

1. 安装全局 CLI：`npm install -g @cloudglab/zentao-cli@latest`
2. 安装 skill：`npx -y skills add -g cloudglab/zentao-cli`
3. 如果没有禅道配置，或已有配置登录失败，则提示输入配置并校验

默认通过 GitHub 仓库安装 skill。如果当前环境不能访问远程 `.git` 仓库，但可以访问 npm 包，可改用 npm 静态包模式：

```bash
npx -y @cloudglab/zentao-cli@latest install --skill-source npm
```

如果已经提前下载并解压好了 npm 静态包，也可以直接指定本地目录：

```bash
zentao install --skill-local-path ./package
```

后续更新可运行：

```bash
zentao update
```

`zentao update` 会重新安装最新 CLI 和 skill，并再次校验禅道配置。

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

默认 GitHub 仓库方式：

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
```

## 更新

```bash
zentao update
```

skill 内推荐优先调用本地 `zentao`；只有在当前环境不方便安装时，才退回 `npx -y @cloudglab/zentao-cli@latest`。

如果你不想全局安装，也可以一直用：

```bash
npx -y @cloudglab/zentao-cli@latest
```

## 写操作前置条件

- `ZENTAO_ENABLE_WRITE=true`
- `confirm=true`

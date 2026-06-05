# 安装 / 更新

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

```bash
npx skills add @cloudglab/zentao-cli -g
```

## 检查是否已安装

```bash
command -v zentao
zentao --version
zentao help
```

## 更新

```bash
npm i -g @cloudglab/zentao-cli@latest
```

skill 内推荐优先调用本地 `zentao`；只有在当前环境不方便安装时，才退回 `npx -y @cloudglab/zentao-cli@latest`。

如果你不想全局安装，也可以一直用：

```bash
npx -y @cloudglab/zentao-cli@latest
```

## 写操作前置条件

- `ZENTAO_ENABLE_WRITE=true`
- `confirm=true`

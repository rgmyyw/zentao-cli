# Release Notes

## 发布经验

- 命令系统有新增、删除或改名时，必须同时检查并同步 `skills/` 下的说明文档与参考文件。
- `zentao-cli` 同时维护源码命令、skills reference、cheatsheet 和 manifest；改了命令但没同步 skills，会直接让 Agent 学到过期入口。
- 发版前至少做三件事：
  - 检查 reference、cheatsheet、场景文档是否同步更新。
  - 检查 `zentao list` / `zentao help <command>` 是否与文档一致。
  - 检查构建产物、技能目录和源码注册是否一致。

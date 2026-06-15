# CLI 参考

## 启动

```bash
zentao help
zentao help getExecutionDetail
zentao list
zentao whoami
zentao who am i
zentao --role qa getMyBugs --limit 50
```

## 常见参数

- `--role full|dev|pm|qa`
- `--version`

## 常见形式

- `zentao <command> --key value`
- `zentao help <command>` 查看单条命令参数
- `zentao --role qa <command> --key value`
- `zentao whoami` / `zentao who-am-i` / `zentao who am i` 查看当前登录用户

## 场景

- 手工查数据
- 排查问题
- 批量执行脚本

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
- `--output compact|normal|verbose`
- `--recommend` / `--recommend=true|false` 在 JSON 返回的 `meta.next` 注入结构化下一步推荐
- `--version`

## 常见形式

- `zentao <command> --key value`
- `zentao help <command>` 查看单条命令参数
- `zentao --role qa <command> --key value`
- `zentao whoami` / `zentao who-am-i` / `zentao who am i` 查看当前登录用户
- `zentao --recommend <command> --key value` 执行后在 `meta.next` 拿到推荐链路

## `--recommend` 输出形态

调用 `zentao --recommend getBugDetail --bugId 84362` 后，返回 JSON 大致是：

```json
{
  "id": 84362,
  "status": "active",
  "...": "原命令字段",
  "meta": {
    "requestCount": 1,
    "durationMs": 123,
    "next": [
      {
        "tool": "resolveBug",
        "reason": "Bug 已修复，可以提交解决方案",
        "args": { "bugId": 84362 },
        "example": "zentao resolveBug --bugId 84362 --confirm true",
        "priority": 0
      },
      {
        "tool": "getBugRelatedStory",
        "reason": "查看 Bug 关联的需求",
        "args": { "bugId": 84362 },
        "example": "zentao getBugRelatedStory --bugId 84362",
        "priority": 0
      }
    ]
  }
}
```

- `args` 来源：声明里 `args.<param>: { source: 'input'|'payload', path: 'dot.path' }` 解析；可与字面量混合。
- `example` 缺失：参数路径解析不到时仍会保留推荐条目，但不会生成可执行命令行（Agent 自己挑 ID）。
- 角色过滤：当前 role 看不到的推荐会被剔除。

## 场景

- 手工查数据
- 排查问题
- 批量执行脚本
- Agent 拿 `meta.next` 无脑衔接下一步

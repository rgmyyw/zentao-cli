// scripts/gen-cheatsheet.mjs
// 把 306 个命令按文件分组生成 reference/cheatsheet.md 兜底文档
import { readFile, writeFile } from 'node:fs/promises';

const cli = JSON.parse(await readFile('/tmp/commands.json', 'utf8'));
// 按源文件分组
const byFile = new Map();
for (const c of cli) {
  if (!byFile.has(c.file)) byFile.set(c.file, []);
  byFile.get(c.file).push(c);
}

// 文件名 → 场景标题
const sceneTitle = {
  'src/tools/bug.ts': 'Bug',
  'src/tools/task.ts': '任务',
  'src/tools/story.ts': '需求',
  'src/tools/execution.ts': '执行 / 迭代',
  'src/tools/build.ts': '构建',
  'src/tools/plan.ts': '计划',
  'src/tools/product.ts': '产品',
  'src/tools/project.ts': '项目',
  'src/tools/program.ts': '项目集',
  'src/tools/release.ts': '发布',
  'src/tools/testcase.ts': '测试用例',
  'src/tools/testtask.ts': '测试单',
  'src/tools/todo.ts': '待办',
  'src/tools/comment.ts': '评论',
  'src/tools/context.ts': '开发上下文',
  'src/tools/relation.ts': '关联查询',
  'src/tools/search.ts': '搜索',
  'src/tools/resource-analysis.ts': '资源分析',
  'src/tools/statistics.ts': '统计',
  'src/tools/profile.ts': '当前用户',
  'src/tools/init.ts': '初始化',
  'src/tools/url-intent.ts': 'URL 解析',
  'src/tools/phase3a.ts': 'Phase3A（story/testcase/plan/task 等写入）',
  'src/tools/phase3b.ts': 'Phase3B（execution/testtask/build/release 等写入）',
  'src/tools/phase3c.ts': 'Phase3C（product/project/program 等写入）',
};

const lines = [];
lines.push('# 全量命令速查');
lines.push('');
lines.push('> 兜底文档。CLI 注册的全部 306 条命令在此处都有名字 + 简要说明。');
lines.push('> 写操作示例和参数细节见对应场景文档（`bug.md` / `task.md` / ...）。');
lines.push('');
lines.push('## 入口与基础');
lines.push('');
lines.push('| 命令 | 简介 |');
lines.push('| --- | --- |');
for (const f of ['src/tools/init.ts', 'src/tools/url-intent.ts', 'src/tools/profile.ts', 'src/tools/cli.md']) {
  if (!byFile.has(f)) continue;
  for (const c of byFile.get(f)) lines.push(`| \`${c.name}\` | ${escMd(c.description || '-')} |`);
}
lines.push('');

// 其他按文件分组
const orderedFiles = [
  'src/tools/bug.ts',
  'src/tools/task.ts',
  'src/tools/story.ts',
  'src/tools/execution.ts',
  'src/tools/build.ts',
  'src/tools/plan.ts',
  'src/tools/product.ts',
  'src/tools/project.ts',
  'src/tools/program.ts',
  'src/tools/release.ts',
  'src/tools/testcase.ts',
  'src/tools/testtask.ts',
  'src/tools/todo.ts',
  'src/tools/comment.ts',
  'src/tools/context.ts',
  'src/tools/relation.ts',
  'src/tools/search.ts',
  'src/tools/resource-analysis.ts',
  'src/tools/statistics.ts',
  'src/tools/phase3a.ts',
  'src/tools/phase3b.ts',
  'src/tools/phase3c.ts',
];
for (const f of orderedFiles) {
  if (!byFile.has(f)) continue;
  const cmds = byFile.get(f);
  lines.push(`## ${sceneTitle[f] || f}`);
  lines.push('');
  lines.push('| 命令 | 简介 |');
  lines.push('| --- | --- |');
  for (const c of cmds) lines.push(`| \`${c.name}\` | ${escMd(c.description || '-')} |`);
  lines.push('');
}

function escMd(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160);
}

await writeFile('.agents/skills/zentao-cli/reference/cheatsheet.md', lines.join('\n'));
console.log(`已生成 cheatsheet.md，共 ${cli.length} 个命令`);
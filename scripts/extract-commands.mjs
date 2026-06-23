// scripts/extract-commands.mjs
// 扫描 src/tools/*.ts 提取所有 server.tool(name, schema, handler) 注册的命令
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const TOOLS_DIR = 'src/tools';

const files = [];
for await (const file of glob(`${TOOLS_DIR}/**/*.ts`)) {
  if (file.endsWith('/shared.ts')) continue;
  files.push(file);
}

const out = [];
for (const file of files.sort()) {
  const path = `${ROOT}/${file}`;
  const text = await readFile(path, 'utf8');
  // 容忍 server.tool( 换行 'name',
  const re = /server\.tool(?:<[^>]+>)?\([\s\S]{0,40}?['"`]([A-Za-z][A-Za-z0-9_]*)['"`]/g;
  let m = re.exec(text);
  while (m !== null) {
    const offset = m.index;
    const before = text.slice(0, offset);
    const line = before.split('\n').length;
    const name = m[1];
    // 名字后的描述
    const after = text.slice(re.lastIndex);
    const dm = after.match(/\.describe\(\s*['"`]([^'"`]{8,200})['"`]/);
    const description = dm ? dm[1] : '';
    // 参数计数: 从 m[0] 结束到下一个 ),  闭花括号匹配结束
    let depth = 0;
    let paramCount = 0;
    let started = false;
    for (let j = re.lastIndex; j < text.length; j++) {
      const ch = text[j];
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') { depth--; if (started && depth === 0) break; }
      if (ch === '\n' && started && depth > 0) {
        const nl = text.slice(text.lastIndexOf('\n', j) + 1, j + 1);
        const fm = nl.match(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(z\.|optionalTrimmedText|runWithPreview|previewOrAssertWriteAllowed)/);
        if (fm) paramCount++;
      }
    }
    out.push({ name, file, line, description, paramCount });
    m = re.exec(text);
  }
}

const dedup = new Map();
for (const item of out) {
  if (!dedup.has(item.name)) dedup.set(item.name, []);
  dedup.get(item.name).push(item);
}
const dupNames = [...dedup.entries()].filter(([, v]) => v.length > 1);
console.error(`找到 ${out.length} 条 tool 注册，去重后 ${dedup.size} 个命令，重名 ${dupNames.length}`);
for (const [n, list] of dupNames) {
  console.error(`  ${n}: ${list.map((x) => `${x.file}:${x.line}`).join(', ')}`);
}

console.log(JSON.stringify([...dedup.values()].map(([x]) => x), null, 2));

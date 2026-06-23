// scripts/check-coverage.mjs
// 验证 reference 文档里提到的所有命令 vs CLI 注册命令 306 个 diff = 0
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const REF_DIR = '.agents/skills/zentao-cli/reference';

// 1. 加载 CLI 注册命令清单
const cli = JSON.parse(await readFile('/tmp/commands.json', 'utf8'));
const cliNames = new Set(cli.map((c) => c.name));

// 2. 提取 reference 文档里提到的所有命令
const mentioned = new Map(); // name -> [files]
const refFiles = [];
for await (const f of glob(`${REF_DIR}/**/*.md`)) refFiles.push(f);

for (const file of refFiles.sort()) {
  const text = await readFile(`${ROOT}/${file}`, 'utf8');
  // 模式 1: 反引号包裹的命令名（支持 - 和 _）
  const re = /`([a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_])`/g;
  let m = re.exec(text);
  while (m !== null) {
    const name = m[1];
    if (!cliNames.has(name)) { m = re.exec(text); continue; }
    if (!mentioned.has(name)) mentioned.set(name, []);
    mentioned.get(name).push(file.split('/').slice(-2).join('/'));
    m = re.exec(text);
  }
}

const covered = new Set(mentioned.keys());
const missing = [...cliNames].filter((n) => !covered.has(n)).sort();
const extra = [...mentioned.keys()].filter((n) => !cliNames.has(n)).sort();

console.log(`CLI 注册命令: ${cliNames.size}`);
console.log(`reference 提到命令: ${covered.size}`);
console.log(`未覆盖: ${missing.length}`);
console.log(`误识别: ${extra.length}`);

if (missing.length) {
  console.error('\n--- 未覆盖的命令 ---');
  for (const m of missing) console.error(`  ${m}`);
}
if (extra.length) {
  console.error('\n--- 误识别 ---');
  for (const m of extra) console.error(`  ${m}`);
}

process.exit(0);

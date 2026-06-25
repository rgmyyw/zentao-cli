// 防止敏感关键词占位符（如 VGSENSITIVE_KEYWORD_*）残留进 dist 产物。
// 用法：node scripts/guard-sensitive.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] ?? 'dist';
const PATTERN = /VGSENSITIVE_KEYWORD/;

function walk(dir, hits) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, hits);
    } else if (PATTERN.test(readFileSync(full, 'utf8'))) {
      hits.push(full);
    }
  }
}

const hits = [];
walk(ROOT, hits);

if (hits.length > 0) {
  console.error('检测到敏感关键词占位符残留，请检查源码替换为真实文案：');
  for (const file of hits) console.error('  ' + file);
  process.exit(1);
}

console.log('guard-sensitive: 未发现 VGSENSITIVE_KEYWORD 残留');

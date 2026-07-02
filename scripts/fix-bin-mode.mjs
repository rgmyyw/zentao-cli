import { chmod } from 'node:fs/promises';
import path from 'node:path';

const binFiles = ['zentao.js', 'zentao-dev.js', 'zentao-pm.js', 'zentao-qa.js', 'zentao-mcp.js'];

await Promise.all(
  binFiles.map((file) => chmod(path.join('dist', 'bin', file), 0o755)),
);

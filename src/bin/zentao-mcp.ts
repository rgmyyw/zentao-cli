#!/usr/bin/env node
import { runMcp } from '../mcp.js';
import type { McpMode } from '../mcp.js';
import type { Role } from '../types/common.js';

const VALID_ROLES = new Set<Role>(['full', 'dev', 'pm', 'qa']);
const VALID_MODES = new Set<McpMode>(['compact', 'native']);

function parseMcpArgs(rawArgs: string[]): {
  role: Role;
  mode: McpMode;
  toolWhitelist?: string[];
} {
  let role: Role = 'dev';
  let mode: McpMode = 'compact';
  let toolWhitelist: string[] | undefined;

  for (const arg of rawArgs) {
    if (arg.startsWith('--role=')) {
      const value = arg.slice('--role='.length);
      if (VALID_ROLES.has(value as Role)) {
        role = value as Role;
      } else {
        process.stderr.write(`无效 role: ${value}，可选 full/dev/pm/qa，回退到 dev\n`);
        role = 'dev';
      }
    } else if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length);
      if (VALID_MODES.has(value as McpMode)) {
        mode = value as McpMode;
      } else {
        process.stderr.write(`无效 mode: ${value}，可选 compact/native，回退到 compact\n`);
        mode = 'compact';
      }
    } else if (arg.startsWith('--tools=')) {
      const value = arg.slice('--tools='.length);
      toolWhitelist = value.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  return { role, mode, toolWhitelist };
}

const options = parseMcpArgs(process.argv.slice(2));

await runMcp(options).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`MCP server 启动失败: ${message}\n`);
  process.exit(1);
});

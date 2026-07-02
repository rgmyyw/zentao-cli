import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { buildRegistryForRole } from './core/manifest.js';
import { loadConfig } from './core/config.js';
import { setGlobalOutputMode } from './tools/shared.js';
import type { Role } from './types/common.js';
import type { CliCommandDefinition } from './core/cli-registry.js';

export type McpMode = 'compact' | 'native';

export interface McpOptions {
  role: Role;
  mode: McpMode;
  toolWhitelist?: string[];
}

function filterCommands(commands: CliCommandDefinition[], whitelist?: string[]): CliCommandDefinition[] {
  if (!whitelist || whitelist.length === 0) return commands;
  const allowed = new Set(whitelist);
  return commands.filter((cmd) => allowed.has(cmd.name));
}

async function safeCall<T>(fn: () => Promise<T>): Promise<T | { content: Array<{ type: 'text'; text: string }> }> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }] };
  }
}

function registerCompactTools(server: McpServer, commands: CliCommandDefinition[]): void {
  const commandNames = new Set(commands.map((c) => c.name));

  // zentao_list_tools - list all available tools
  server.tool(
    'zentao_list_tools',
    '列出当前角色下所有可用的禅道 CLI 工具名称，用于发现可调用的命令。',
    async () => {
      const list = commands.map((c) => ({ name: c.name }));
      return { content: [{ type: 'text' as const, text: JSON.stringify({ tools: list, total: list.length }) }] };
    },
  );

  // zentao_help - get help for a specific tool
  server.tool(
    'zentao_help',
    '查看指定禅道工具的参数说明、用法和元信息，在调用前了解工具需要哪些参数。',
    { tool: z.string().describe('禅道工具名称，如 getMyTasks、getBugDetail 等。先通过 zentao_list_tools 获取可用工具列表。') },
    async ({ tool }) => {
      if (!commandNames.has(tool)) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `未找到工具: ${tool}` }) }] };
      }
      const command = commands.find((c) => c.name === tool)!;
      const params = Object.entries(command.schema).map(([key, schema]) => ({
        name: key,
        description: getZodDescription(schema) ?? '-',
        required: !isZodOptional(schema),
      }));
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            tool: command.name,
            params,
            metadata: command.metadata ?? {},
          }),
        }],
      };
    },
  );

  // zentao_call_tool - generic tool dispatcher
  server.tool(
    'zentao_call_tool',
    '调用指定的禅道 CLI 工具。传入工具名称和参数字典，返回工具执行结果。写操作需要在 args 中包含 confirm: true。',
    {
      tool: z.string().describe('禅道工具名称。先通过 zentao_list_tools 查看可用工具，用 zentao_help 查看工具参数。'),
      args: z.record(z.unknown()).describe('工具参数字典，如 { "status": "all", "limit": 10 }。写操作需包含 confirm: true。'),
    },
    async ({ tool, args }) => {
      if (!commandNames.has(tool)) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `未找到工具: ${tool}` }) }] };
      }
      const command = commands.find((c) => c.name === tool)!;
      const result = await safeCall(() => Promise.resolve(command.handler(args as Record<string, unknown>)));
      if ('content' in result && Array.isArray(result.content)) {
        return { content: result.content as Array<{ type: 'text'; text: string }> };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  // zentao_parse_url - URL intent parsing
  server.tool(
    'zentao_parse_url',
    '解析禅道浏览器 URL 或页面文件路径，提取对象类型和 ID，返回可调用的命令建议。支持 URL、路径和文件名格式。',
    {
      url: z.string().trim().min(1).describe('要解析的禅道浏览器 URL、页面文件路径或页面文件名，如 https://your-zentao.example.com/zentao/bug-view-123.html'),
    },
    async ({ url }) => {
      // Reuse parseUrlIntent from core, which is the same logic used by the CLI's parseUrlIntent tool
      const { parseUrlIntent } = await import('./core/url-intent.js');
      try {
        const result = parseUrlIntent(url, { serverUrl: loadConfig()?.url });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }] };
      }
    },
  );
}

function registerNativeTools(server: McpServer, commands: CliCommandDefinition[]): void {
  for (const command of commands) {
    server.tool(
      command.name,
      `禅道工具: ${command.name}${command.metadata?.costHint ? ` (${command.metadata.costHint} 开销)` : ''}`,
      command.schema as Record<string, z.ZodTypeAny>,
      async (input) => {
        const result = await safeCall(() => Promise.resolve(command.handler(input as Record<string, unknown>)));
        if ('content' in result && Array.isArray(result.content)) {
          return { content: result.content as Array<{ type: 'text'; text: string }> };
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      },
    );
  }
}

function getZodDescription(schema: z.ZodTypeAny): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)?._def;
  if (def?.description && typeof def.description === 'string') return def.description;
  return undefined;
}

function isZodOptional(schema: z.ZodTypeAny): boolean {
  return schema instanceof z.ZodOptional;
}

export async function runMcp(options: McpOptions): Promise<void> {
  const { role, mode, toolWhitelist } = options;

  // Load config from env vars (ZENTAO_URL, ZENTAO_USERNAME, etc.)
  loadConfig();

  setGlobalOutputMode('verbose');

  const registry = await buildRegistryForRole(role);
  const allCommands = registry.listCommands();
  const commands = filterCommands(allCommands, toolWhitelist);

  const server = new McpServer({
    name: 'zentao-cli',
    version: '1.0.0',
  });

  if (mode === 'compact') {
    registerCompactTools(server, commands);
  } else {
    registerNativeTools(server, commands);
  }

  await server.connect(new StdioServerTransport());
}

import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';
import { runWithPreview } from './shared.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';

export function registerProductTools(server: CliRegistry): void {
  server.tool(
    'getProducts',
    {},
    async () => jsonResult(await getApi().product.getProducts()),
    { costHint: 'low', nextBestTools: ['getProductDetail', 'getProductStories', 'getProductBugs'] },
  );

  server.tool(
    'getProductDetail',
    {
      productId: z.number().int().positive().describe('禅道产品 ID。若用户问的是外部线上/客户反馈/售后/生产问题，不要先用业务产品名找禅道产品；应固定查询"市场和售后问题跟踪"产品，再按 Bug 模块匹配真实业务产品。若明确是测试或开发在线上发现并记录到"测试"下的问题，应查询"测试"产品并按模块过滤。'),
    },
    async ({ productId }) => jsonResult(await getApi().product.getProductDetail(productId)),
    { costHint: 'low', nextBestTools: ['getProductStories', 'getProductBugs', 'getProductPlans'] },
  );

  server.tool(
    'manageProductLine',
    {
      productId: z.number().int().positive().describe('产品 ID'),
      modules: z.string().optional().describe('JSON 字符串，已有产品线映射对象。键形如 id123，值为产品线名称，对应页面 modules[id123]。'),
      newModules: z.string().optional().describe('JSON 字符串，新增产品线名称数组，对应页面 modules[]。'),
      programs: z.string().optional().describe('JSON 字符串，已有项目集映射对象。键形如 id123，值为项目集 ID/值，对应页面 programs[id123]。仅 ALM 模式使用。'),
      newPrograms: z.string().optional().describe('JSON 字符串，新增项目集值数组，对应页面 programs[]。仅 ALM 模式使用。'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ productId, modules, newModules, programs, newPrograms, confirm }) => {
      const parseMap = (raw: string | undefined): Record<string, string> | undefined => {
        if (typeof raw !== 'string' || raw.trim() === '') return undefined;
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('JSON 必须是对象');
          }
          const result: Record<string, string> = {};
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof value !== 'string') throw new Error('映射值必须为字符串');
            result[key] = value;
          }
          return result;
        } catch (error) {
          throw new Error(error instanceof Error ? `JSON 解析失败：${error.message}` : 'JSON 解析失败');
        }
      };
      const parseList = (raw: string | undefined): string[] | undefined => {
        if (typeof raw !== 'string' || raw.trim() === '') return undefined;
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (!Array.isArray(parsed)) throw new Error('JSON 必须是数组');
          return parsed.map((value) => {
            if (typeof value !== 'string') throw new Error('数组值必须为字符串');
            return value;
          });
        } catch (error) {
          throw new Error(error instanceof Error ? `JSON 解析失败：${error.message}` : 'JSON 解析失败');
        }
      };
      const payload = {
        productId,
        modules: parseMap(modules),
        newModules: parseList(newModules),
        programs: parseMap(programs),
        newPrograms: parseList(newPrograms),
      };
      return runWithPreview('manageProductLine', confirm, payload, previewOrAssertWriteAllowed, () =>
        getApi().product.manageProductLine(productId, {
          modules: payload.modules,
          newModules: payload.newModules,
          programs: payload.programs,
          newPrograms: payload.newPrograms,
        }),
      );
    },
  );
}

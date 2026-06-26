import { z } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult, runWithPreview } from './shared.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';

export function registerFileTools(server: CliRegistry): void {
  server.tool(
    'uploadFile',
    {
      uid: z.string().trim().min(1).describe('上传会话 UID。createXxx 时把同一个 uid 传给 uid 字段即可绑定附件到新对象。禅道 18.5 fileEntry 限制在 jpg/jpeg/png/gif 格式'),
      file: z.string().trim().min(1).describe('本地文件绝对路径，仅支持 jpg/jpeg/png/gif'),
    },
    async ({ uid, file }) => {
      const absolute = isAbsolute(file) ? file : resolve(process.cwd(), file);
      return jsonResult(await getApi().file.uploadFile(uid, absolute));
    },
    { costHint: 'low', nextBestTools: ['createBug', 'createTask', 'createStory', 'createTestCase'] },
  );

  server.tool(
    'uploadFiles',
    {
      uid: z.string().trim().min(1).describe('上传会话 UID'),
      files: z.array(z.string().trim().min(1)).min(1).describe('本地文件绝对路径列表，按顺序串行上传到同一个 uid；仅支持 jpg/jpeg/png/gif'),
    },
    async ({ uid, files }) => {
      const absolutes = files.map(f => (isAbsolute(f) ? f : resolve(process.cwd(), f)));
      return jsonResult(await getApi().file.uploadFiles(uid, absolutes));
    },
    { costHint: 'medium', nextBestTools: ['uploadFile', 'createBug', 'createTask', 'createStory'] },
  );

  server.tool(
    'removeFileFromSession',
    {
      uid: z.string().trim().min(1).describe('上传会话 UID，必须与 uploadFile 使用的 uid 相同'),
      fileId: z.number().int().positive().describe('要从 session 移除的文件 ID，对应 uploadFile 返回的 id'),
    },
    async ({ uid, fileId }) => jsonResult(await getApi().file.removeFileFromSession(uid, fileId)),
  );

  server.tool(
    'deleteFile',
    {
      fileId: z.number().int().positive().describe('要删除的文件 ID'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ fileId, confirm }) => runWithPreview('deleteFile', confirm, { fileId }, previewOrAssertWriteAllowed, () => getApi().file.deleteFile(fileId, 'yes')),
  );

  server.tool(
    'downloadFile',
    {
      fileId: z.number().int().positive().describe('要下载的文件 ID，对应 file.id'),
      output: z.string().trim().min(1).describe('本地保存路径（绝对或相对当前工作目录），目录不存在会自动创建'),
    },
    async ({ fileId, output }) => {
      const result = await getApi().file.downloadFile(fileId);
      const target = isAbsolute(output) ? output : resolve(process.cwd(), output);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, result.data);
      return jsonResult({
        fileId,
        savedAs: target,
        bytes: result.data.length,
        contentType: result.contentType,
        fileName: result.fileName,
      });
    },
    { costHint: 'low', nextBestTools: ['getBugDetail', 'getTaskDetail', 'getStoryDetail'] },
  );
}

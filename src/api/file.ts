import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import FormData from 'form-data';
import type { ZentaoHttpClient } from '../core/http.js';

export interface UploadedFileRef {
  id: number;
  url: string;
  path: string;
  title: string;
  size: number;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif']);

function isImagePath(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

export class FileApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  /**
   * 上传单个文件到禅道，返回 fileID。
   * 禅道 18.5 /files entry 限制在 jpg/jpeg/png/gif；其他类型请改用 saveUpload 流程。
   * 调用约定：先 uploadFile --uid 拿到 fileID，再把同一个 uid 传给 createBug/createTask/createStory 等
   * 的 uid 字段，禅道会把 session album 中该 uid 下的 fileID 绑定到新对象。
   */
  async uploadFile(uid: string, filePath: string): Promise<UploadedFileRef> {
    const safeUid = (uid ?? '').trim() || 'zentao';
    if (!isImagePath(filePath)) {
      throw new Error(`uploadFile 仅支持 jpg/jpeg/png/gif 格式；${filePath} 不在支持列表。非图片请改用对象级附件接口`);
    }
    const buffer = await readFile(filePath);
    const fileStat = await stat(filePath);
    const form = new FormData();
    form.append('imgFile', buffer, { filename: basename(filePath), filepath: filePath });
    const response = await this.http.request<{ id?: number; url?: string; data?: { id?: number; url?: string } }>('POST', `/files?uid=${encodeURIComponent(safeUid)}`, {
      data: form,
      headers: form.getHeaders(),
    });
    const id = response.id ?? response.data?.id;
    const url = response.url ?? response.data?.url;
    if (typeof id !== 'number' || id <= 0) {
      throw new Error(`uploadFile 返回缺少 id：${JSON.stringify(response)}`);
    }
    return { id, url: url ?? '', path: filePath, title: basename(filePath), size: fileStat.size };
  }

  /**
   * 批量上传图片到同一个 uid，按顺序串行（避免禅道 session 冲突）。
   */
  async uploadFiles(uid: string, filePaths: string[]): Promise<UploadedFileRef[]> {
    const results: UploadedFileRef[] = [];
    for (const filePath of filePaths) {
      const ref = await this.uploadFile(uid, filePath);
      results.push(ref);
    }
    return results;
  }

  /**
   * 从 session 移除文件绑定（不会真正删除磁盘文件，对应 fileEntry::put action=remove）。
   * 真正删除走 legacy file-delete-{id}-yes.json。
   */
  async removeFileFromSession(uid: string, fileID: number): Promise<unknown> {
    if (fileID <= 0) throw new Error('fileID 非法');
    return this.http.request('PUT', `/files/${fileID}?action=remove&uid=${encodeURIComponent(uid)}`, { data: {} });
  }

  /**
   * 真正删除附件（写盘 + 动作记录），走 legacy file-delete-{id}-yes.json。
   */
  async deleteFile(fileID: number, confirm: 'yes' | 'no' = 'yes'): Promise<unknown> {
    if (fileID <= 0) throw new Error('fileID 非法');
    return this.http.legacyRequest('GET', `/file-delete-${fileID}-${confirm}.json`);
  }

  /**
   * 下载附件。
   * fileEntry::get 直接返回原文件流；fileID 对应 file.id。
   * 返回 { data, contentType, fileName }；调用方可自行落盘。
   */
  async downloadFile(fileID: number): Promise<{ data: Buffer; contentType?: string; fileName?: string }> {
    if (fileID <= 0) throw new Error('fileID 非法');
    return this.http.downloadLegacy(`/file-read-${fileID}.json`);
  }
}

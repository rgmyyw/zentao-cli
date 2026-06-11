import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ZentaoHttpClient } from '../core/http.js';
import type { BugApi } from './bug.js';
import type { TaskApi } from './task.js';

export type ResourceObjectType = 'bug' | 'task';

export interface AnalyzeObjectResourcesInput {
  objectType: ResourceObjectType;
  objectID: number;
  outDir?: string;
  maxInlineBytes?: number;
  download?: boolean;
}

interface ResourceCandidate {
  source: string;
  name?: string;
  url?: string;
  path?: string;
  id?: number;
}

export class ResourceAnalysisApi {
  constructor(
    private readonly http: ZentaoHttpClient,
    private readonly bug: BugApi,
    private readonly task: TaskApi,
  ) {}

  async analyzeObjectResources(input: AnalyzeObjectResourcesInput): Promise<unknown> {
    const detail = await this.getObjectDetail(input.objectType, input.objectID);
    const candidates = dedupeCandidates(findResourceCandidates(detail));
    const outDir = input.outDir ?? path.join(tmpdir(), 'zentao-cli-resources', `${input.objectType}-${input.objectID}`);
    const maxInlineBytes = input.maxInlineBytes ?? 200 * 1024;
    const shouldDownload = input.download !== false;

    if (shouldDownload) await mkdir(outDir, { recursive: true });

    const resources = [];
    for (const candidate of candidates) {
      const report = await this.analyzeCandidate(candidate, outDir, maxInlineBytes, shouldDownload);
      resources.push(report);
    }

    return {
      objectType: input.objectType,
      objectID: input.objectID,
      outDir: shouldDownload ? outDir : undefined,
      total: resources.length,
      resources,
      summary: buildSummary(resources),
      note: '小文本/日志会内联摘要；图片已落盘并标记为需要视觉模型或 OCR；其他二进制仅给出文件信息。',
    };
  }

  private async getObjectDetail(objectType: ResourceObjectType, objectID: number): Promise<unknown> {
    return objectType === 'bug' ? this.bug.getBugDetail(objectID) : this.task.getTaskDetail(objectID);
  }

  private async analyzeCandidate(candidate: ResourceCandidate, outDir: string, maxInlineBytes: number, shouldDownload: boolean): Promise<Record<string, unknown>> {
    const url = candidate.url ?? candidate.path ?? (candidate.id ? `/file-read-${candidate.id}.html` : undefined);
    const base = {
      source: candidate.source,
      id: candidate.id,
      name: candidate.name,
      url,
    };

    if (!url) return { ...base, status: 'skipped', reason: '未发现可下载 URL 或文件 ID' };
    if (!shouldDownload) return { ...base, status: 'discovered' };

    try {
      const downloaded = await this.http.downloadLegacy(url);
      const fileName = safeFileName(downloaded.fileName ?? candidate.name ?? path.basename(url.split('?')[0]) ?? `resource-${Date.now()}`);
      const filePath = path.join(outDir, fileName);
      await writeFile(filePath, downloaded.data);

      const kind = classifyResource(fileName, downloaded.contentType);
      const report: Record<string, unknown> = {
        ...base,
        status: 'downloaded',
        filePath,
        size: downloaded.data.length,
        contentType: downloaded.contentType,
        kind,
        sha256: createHash('sha256').update(downloaded.data).digest('hex'),
      };

      if (kind === 'text' && downloaded.data.length <= maxInlineBytes) {
        const text = await readSmallText(filePath);
        report.analysisMode = 'inline-text';
        report.textPreview = summarizeText(text);
      } else if (kind === 'text') {
        report.analysisMode = 'large-text-needs-targeted-read';
        report.reason = `文件超过 maxInlineBytes=${maxInlineBytes}`;
      } else if (kind === 'image') {
        report.analysisMode = 'image-needs-vision-or-ocr';
      } else if (kind === 'archive') {
        report.analysisMode = 'archive-needs-extract';
      } else {
        report.analysisMode = 'binary-metadata-only';
      }

      return report;
    } catch (error) {
      return { ...base, status: 'download_failed', error: error instanceof Error ? error.message : String(error) };
    }
  }
}

function findResourceCandidates(value: unknown, source = 'detail'): ResourceCandidate[] {
  const candidates: ResourceCandidate[] = [];
  collectResources(value, source, candidates, new Set());
  return candidates;
}

function collectResources(value: unknown, source: string, candidates: ResourceCandidate[], seen: Set<unknown>): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      collectResources(item, `${source}[${index}]`, candidates, seen);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  const name = firstString(record.title, record.name, record.filename, record.fileName, record.realname, record.pathname);
  const url = firstString(record.url, record.webPath, record.downloadUrl, record.downloadURL, record.path, record.fullURL, record.fullUrl);
  const id = firstNumber(record.id, record.fileID, record.fileId);

  if (looksLikeFileRecord(record) || looksLikeResourceUrl(url) || (id && source.toLowerCase().includes('files'))) {
    candidates.push({ source, name, url, id });
  }

  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string') {
      for (const matchedUrl of extractUrls(item)) {
        if (looksLikeResourceUrl(matchedUrl)) candidates.push({ source: `${source}.${key}`, url: matchedUrl, name: path.basename(matchedUrl.split('?')[0]) });
      }
      continue;
    }
    collectResources(item, `${source}.${key}`, candidates, seen);
  }
}

function looksLikeFileRecord(record: Record<string, unknown>): boolean {
  if (['extension', 'downloads', 'pathname', 'webPath', 'fileName', 'filename'].some((key) => key in record)) return true;
  const name = firstString(record.title, record.name, record.realname);
  return !!name && /\.(png|jpe?g|gif|webp|svg|txt|log|zip|rar|7z|pdf|docx?|xlsx?)$/i.test(name);
}

function extractUrls(text: string): string[] {
  return [...text.matchAll(/(?:https?:\/\/[^\s"'<>]+|\/[A-Za-z0-9_./?=&%:-]+\.(?:png|jpe?g|gif|webp|svg|txt|log|zip|rar|7z|pdf|docx?|xlsx?))/gi)].map((match) => match[0]);
}

function looksLikeResourceUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /(?:file-|\/data\/upload\/|\.(?:png|jpe?g|gif|webp|svg|txt|log|zip|rar|7z|pdf|docx?|xlsx?)(?:\?|$))/i.test(url);
}

function dedupeCandidates(candidates: ResourceCandidate[]): ResourceCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.url ?? candidate.path ?? String(candidate.id ?? `${candidate.source}:${candidate.name}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classifyResource(fileName: string, contentType = ''): 'text' | 'image' | 'archive' | 'binary' {
  const lowerName = fileName.toLowerCase();
  const lowerType = contentType.toLowerCase();
  if (lowerType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(lowerName)) return 'image';
  if (lowerType.startsWith('text/') || /\.(txt|log|md|json|xml|csv|yaml|yml|ini|conf|sql|js|ts|css|html?)$/.test(lowerName)) return 'text';
  if (/\.(zip|rar|7z|tar|gz)$/.test(lowerName)) return 'archive';
  return 'binary';
}

async function readSmallText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString('utf8');
}

function summarizeText(text: string): Record<string, unknown> {
  const lines = text.split(/\r?\n/);
  const errorLines = lines.filter((line) => /error|exception|failed|失败|错误|异常/i.test(line)).slice(0, 20);
  return {
    lineCount: lines.length,
    firstLines: lines.slice(0, 40),
    errorLines,
  };
}

function buildSummary(resources: Array<Record<string, unknown>>): Record<string, number> {
  return resources.reduce<Record<string, number>>((summary, resource) => {
    const key = String(resource.kind ?? resource.status ?? 'unknown');
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function firstNumber(...values: unknown[]): number | undefined {
  return values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 180) || 'resource';
}

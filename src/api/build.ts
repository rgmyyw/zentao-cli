import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { requireNonBlank } from '../core/validation.js';
import { toFormUrlEncoded } from '../utils/form.js';

export interface CreateBuildInput {
  project: number;
  execution: number;
  product: number;
  branch?: number;
  name: string;
  builder: string;
  date?: string;
  desc?: string;
  scmPath?: string;
  filePath?: string;
}

export interface UpdateBuildInput {
  execution?: number;
  product?: number;
  name?: string;
  builder?: string;
  date?: string;
  desc?: string;
  scmPath?: string;
  filePath?: string;
}

export interface LinkStoriesToBuildInput {
  storyIds: number[];
}

export interface LinkBugsToBuildInput {
  bugIds: number[];
}

export interface BatchUnlinkStoriesFromBuildInput {
  storyIds: number[];
}

export interface BatchUnlinkBugsFromBuildInput {
  bugIds: number[];
}

export class BuildApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProjectBuilds(projectId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/projects/${projectId}/builds`);
    return toServerListResult(response, ['builds']);
  }

  async getBuildDetail(buildId: number): Promise<unknown> {
    return this.http.request('GET', `/builds/${buildId}`);
  }

  async createBuild(payload: CreateBuildInput): Promise<unknown> {
    const { project, ...build } = this.normalizeBuildInput(payload, ['name', 'builder']);
    return this.http.request('POST', `/projects/${project}/builds`, { data: build });
  }

  async updateBuild(buildId: number, update: UpdateBuildInput): Promise<unknown> {
    return this.http.request('PUT', `/builds/${buildId}`, { data: this.normalizeBuildInput(update, []) });
  }

  async linkStoriesToBuild(buildId: number, input: LinkStoriesToBuildInput): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    return this.http.legacyRequest('POST', `/build-linkStory-${buildId}--0.json`, {
      data: toFormUrlEncoded({ stories: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkStoryFromBuild(buildId: number, storyId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/build-unlinkStory-${buildId}-${storyId}-yes.json`);
  }

  async batchUnlinkStoriesFromBuild(buildId: number, input: BatchUnlinkStoriesFromBuildInput): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    return this.http.legacyRequest('POST', `/build-batchUnlinkStory-${buildId}.json`, {
      data: toFormUrlEncoded({ unlinkStories: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async linkBugsToBuild(buildId: number, input: LinkBugsToBuildInput): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    return this.http.legacyRequest('POST', `/build-linkBug-${buildId}--0.json`, {
      data: toFormUrlEncoded({ bugs: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkBugFromBuild(buildId: number, bugId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/build-unlinkBug-${buildId}-${bugId}.json`);
  }

  async batchUnlinkBugsFromBuild(buildId: number, input: BatchUnlinkBugsFromBuildInput): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    return this.http.legacyRequest('POST', `/build-batchUnlinkBug-${buildId}.json`, {
      data: toFormUrlEncoded({ unlinkBugs: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async notifyBug(buildId: number, input: { bugIds: number[] }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    return this.http.legacyRequest('POST', `/build-notifyBug-${buildId}.json`, {
      data: toFormUrlEncoded({ bugs: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async assignTo(buildId: number, input: { assignedTo: string; comment?: string }): Promise<unknown> {
    const assignedTo = requireNonBlank(input.assignedTo, 'assignedTo 不能为空');
    const payload: Record<string, unknown> = { assignedTo };
    if (typeof input.comment === 'string' && input.comment.trim() !== '') {
      payload.comment = input.comment.trim();
    }
    return this.http.legacyRequest('POST', `/build-assignTo-${buildId}.json`, {
      data: toFormUrlEncoded(payload),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteBuild(buildId: number, confirm: 'yes' | 'no' = 'yes'): Promise<unknown> {
    return this.http.legacyRequest('GET', `/build-delete-${buildId}-${confirm}.json`);
  }

  private normalizeBuildInput<T extends object>(input: T, requiredFields: Array<'name' | 'builder'>): T {
    const normalized = { ...(input as Record<string, unknown>) };

    for (const field of ['name', 'builder', 'date', 'desc', 'scmPath', 'filePath'] as const) {
      const value = normalized[field];
      if (typeof value !== 'string') continue;

      if (requiredFields.includes(field as 'name' | 'builder')) {
        normalized[field] = requireNonBlank(value, `${field} 不能为空`);
        continue;
      }

      const trimmed = this.normalizeOptionalString(value);
      if (trimmed === undefined) delete normalized[field];
      else normalized[field] = trimmed;
    }

    return normalized as T;
  }

  private normalizeOptionalString(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private normalizeIdArray(values: number[], fieldName: string): number[] {
    if (!values.length) throw new Error(`${fieldName} 至少需要 1 项`);
    return values;
  }

}

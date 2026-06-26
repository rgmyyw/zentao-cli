import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { requireNonBlank } from '../core/validation.js';
import { containsHtmlMarkup } from '../utils/html.js';
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
    if (containsHtmlMarkup(build.desc)) {
      const legacyPayload = this.normalizeBuildLegacyPayload(build as Record<string, unknown>);
      return this.http.legacyRequest('POST', `/build-create-${build.execution}-${build.product}-${project}.json`, {
        data: toFormUrlEncoded(legacyPayload),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    return this.http.request('POST', `/projects/${project}/builds`, { data: build });
  }

  async updateBuild(buildId: number, update: UpdateBuildInput): Promise<unknown> {
    const normalizedUpdate = this.normalizeBuildInput(update, []);
    if (containsHtmlMarkup(normalizedUpdate.desc)) {
      const current = await this.getBuildDetail(buildId) as Record<string, unknown>;
      const preserved = this.pickBuildEditDefaults(current);
      const legacyPayload = this.normalizeBuildLegacyPayload(this.normalizeBuildInput({ ...preserved, ...update }, []));
      return this.http.legacyRequest('POST', `/build-edit-${buildId}.json`, {
        data: toFormUrlEncoded(legacyPayload),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    return this.http.request('PUT', `/builds/${buildId}`, { data: normalizedUpdate });
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

  private normalizeBuildLegacyPayload(input: Record<string, unknown>): Record<string, unknown> {
    const payload = { ...input };
    const branchList = this.toCsvList(payload.branch);
    if (branchList.length > 0) payload.branch = branchList;
    const buildsList = this.toCsvList(payload.builds);
    if (buildsList.length > 0) payload.builds = buildsList;
    return payload;
  }

  private pickBuildEditDefaults(build: Record<string, unknown>): Record<string, unknown> {
    const defaults: Record<string, unknown> = {
      execution: build.execution,
      product: build.product,
      name: build.name,
      builder: this.extractAccountString(build.builder),
      date: build.date,
      scmPath: build.scmPath,
      filePath: build.filePath,
      desc: build.desc,
    };
    const branchList = this.toCsvList(build.branch);
    if (branchList.length > 0) defaults.branch = branchList;
    const buildsList = this.toCsvList(build.builds);
    if (buildsList.length > 0) defaults.builds = buildsList;
    return defaults;
  }

  private extractAccountString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'account' in value) {
      const account = (value as { account?: unknown }).account;
      return typeof account === 'string' ? account : undefined;
    }
    return undefined;
  }

  private toCsvList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item).trim())
        .filter((item) => item !== '' && item !== '0');
    }
    if (typeof value === 'number') return value > 0 ? [String(value)] : [];
    if (typeof value !== 'string') return [];
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '' && item !== '0');
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

import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { requireNonBlank } from '../core/validation.js';
import { toFormUrlEncoded } from '../utils/form.js';

export type ReleaseStatus = 'normal' | 'terminate';
export type ReleaseBugLinkType = 'bug' | 'leftBug';

export interface NotifyReleaseInput {
  notify: string[];
}

export interface LinkStoriesToReleaseInput {
  storyIds: number[];
}

export interface LinkBugsToReleaseInput {
  bugIds: number[];
  type?: ReleaseBugLinkType;
}

export interface BatchUnlinkStoriesFromReleaseInput {
  storyIds: number[];
}

export interface BatchUnlinkBugsFromReleaseInput {
  bugIds: number[];
  type?: ReleaseBugLinkType;
}

export class ReleaseApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProjectReleases(projectId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/projects/${projectId}/releases`);
    return toServerListResult(response, ['releases']);
  }

  async getReleaseDetail(releaseId: number): Promise<unknown> {
    return this.http.request('GET', `/releases/${releaseId}`);
  }

  async changeReleaseStatus(releaseId: number, status: ReleaseStatus): Promise<unknown> {
    return this.http.legacyRequest('GET', `/release-changeStatus-${releaseId}-${status}.json`);
  }

  async createRelease(input: { product: number; branch?: number; name: string; build?: number; date?: string; desc?: string; status?: string }): Promise<unknown> {
    const name = requireNonBlank(input.name, 'name 不能为空');
    const formData: Record<string, unknown> = { product: input.product, name };
    if (input.branch !== undefined) formData.branch = input.branch;
    if (input.build) formData.build = input.build;
    if (input.date) formData.date = input.date;
    if (input.desc) formData.desc = input.desc;
    if (input.status) formData.status = input.status;
    return this.http.legacyRequest('POST', `/release-create-${input.product}-${input.branch ?? 0}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async updateRelease(releaseId: number, input: { name?: string; build?: number; date?: string; desc?: string; status?: string }): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (typeof input.name === 'string' && input.name.trim() !== '') formData.name = input.name.trim();
    if (input.build !== undefined) formData.build = input.build;
    if (input.date) formData.date = input.date;
    if (typeof input.desc === 'string' && input.desc.trim() !== '') formData.desc = input.desc.trim();
    if (input.status) formData.status = input.status;
    return this.http.legacyRequest('POST', `/release-edit-${releaseId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async exportRelease(releaseId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/release-export-${releaseId}.json`);
  }

  async notifyRelease(releaseId: number, input: NotifyReleaseInput): Promise<unknown> {
    const notify = this.normalizeStringArray(input.notify, 'notify');
    return this.http.legacyRequest('POST', `/release-notify-${releaseId}.json`, {
      data: toFormUrlEncoded({ notify }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteRelease(releaseId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/release-delete-${releaseId}-yes.json`);
  }

  async linkStoriesToRelease(releaseId: number, input: LinkStoriesToReleaseInput): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    return this.http.legacyRequest('POST', this.buildLinkStoryPath(releaseId), {
      data: toFormUrlEncoded({ stories: storyIds }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkStoryFromRelease(releaseId: number, storyId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/release-unlinkStory-${releaseId}-${storyId}-yes.json`);
  }

  async batchUnlinkStoriesFromRelease(releaseId: number, input: BatchUnlinkStoriesFromReleaseInput): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    return this.http.legacyRequest('POST', `/release-batchUnlinkStory-${releaseId}.json`, {
      data: toFormUrlEncoded({ storyIdList: storyIds }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async linkBugsToRelease(releaseId: number, input: LinkBugsToReleaseInput): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    const type = input.type ?? 'bug';
    return this.http.legacyRequest('POST', this.buildLinkBugPath(releaseId, type), {
      data: toFormUrlEncoded({ bugs: bugIds }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkBugFromRelease(releaseId: number, bugId: number, type: ReleaseBugLinkType = 'bug'): Promise<unknown> {
    return this.http.legacyRequest('GET', `/release-unlinkBug-${releaseId}-${bugId}-${type}.json`);
  }

  async batchUnlinkBugsFromRelease(releaseId: number, input: BatchUnlinkBugsFromReleaseInput): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    const type = input.type ?? 'bug';
    return this.http.legacyRequest('POST', `/release-batchUnlinkBug-${releaseId}-${type}.json`, {
      data: toFormUrlEncoded({ unlinkBugs: bugIds }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private normalizeIdArray(values: number[], fieldName: string): number[] {
    if (!Array.isArray(values) || values.length < 1) {
      throw new Error(`${fieldName} 至少需要 1 项`);
    }

    return values;
  }

  private normalizeStringArray(values: string[], fieldName: string): string[] {
    if (!Array.isArray(values) || values.length < 1) {
      throw new Error(`${fieldName} 至少需要 1 项`);
    }

    return values.map((value, index) => requireNonBlank(value, `${fieldName}[${index}] 不能为空`));
  }

  private buildLinkStoryPath(releaseId: number): string {
    return `/release-linkStory-${releaseId}--0.json`;
  }

  private buildLinkBugPath(releaseId: number, type: ReleaseBugLinkType): string {
    return `/release-linkBug-${releaseId}--0-${type}.json`;
  }
}

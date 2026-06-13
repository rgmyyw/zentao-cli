import type { BugApi } from './bug.js';
import type { StoryApi } from './story.js';
import type { ListResult } from '../core/list-result.js';
import { fetchAllPages } from '../core/pagination.js';
import type { ZentaoBug, ZentaoStory } from '../types/zentao.js';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export class RelationApi {
  constructor(
    private readonly bugApi: BugApi,
    private readonly storyApi: StoryApi,
  ) {}

  async getBugRelatedStory(bugId: number): Promise<ZentaoStory | null> {
    const bug = await this.bugApi.getBugDetail(bugId);
    const storyId = toNumber(bug.story);
    if (!storyId || storyId <= 0) return null;
    return this.storyApi.getStoryDetail(storyId);
  }

  async getStoryRelatedBugs(storyId: number, productId?: number): Promise<{
    source: 'story-detail' | 'product-bugs-scan' | 'not-scanned';
    partial: boolean;
    scanned: number;
    total?: number;
    bugs: ZentaoBug[];
  }> {
    const story = await this.storyApi.getStoryDetail(storyId);
    if (Array.isArray(story.bugs) && story.bugs.length > 0) {
      return {
        source: 'story-detail',
        partial: false,
        scanned: story.bugs.length,
        total: story.bugs.length,
        bugs: story.bugs as ZentaoBug[],
      };
    }

    if (!productId) {
      return {
        source: 'not-scanned',
        partial: true,
        scanned: 0,
        bugs: [],
      };
    }

    const allBugs = await this.getAllProductBugs(productId);
    return {
      source: 'product-bugs-scan',
      partial: false,
      scanned: allBugs.length,
      total: allBugs.length,
      bugs: allBugs.filter((bug) => {
        const relatedStoryId = toNumber(bug.story ?? bug.storyID);
        return relatedStoryId === storyId;
      }),
    };
  }

  private async getAllProductBugs(productId: number): Promise<ZentaoBug[]> {
    return fetchAllPages<ZentaoBug>({
      fetchPage: (page) => this.bugApi.getProductBugs({ productId, status: 'all', page, limit: 100 }) as Promise<ListResult<ZentaoBug>>,
    });
  }
}

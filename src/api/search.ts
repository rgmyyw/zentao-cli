import type { ProductApi } from './product.js';
import type { StoryApi } from './story.js';
import { normalizeTotalPages } from '../core/pagination.js';

export interface SearchStoriesInput {
  keyword: string;
  productId?: number;
  limit?: number;
  deepSearch?: boolean;
}

function splitKeywords(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  const englishWords = lower.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];
  const chineseChars = lower.match(/[\u4e00-\u9fa5]/g) ?? [];
  const keywords = [...englishWords, ...chineseChars];
  return keywords.length > 0 ? keywords : [lower];
}

function calculateMatchScore(story: Record<string, unknown>, keyword: string, keywords: string[]): number {
  let score = 0;
  const title = String(story.title ?? '').toLowerCase();
  const spec = String(story.spec ?? '').toLowerCase();
  const moduleName = String(story.moduleName ?? '').toLowerCase();
  const productName = String(story.productName ?? '').toLowerCase();

  if (title === keyword) score += 100;
  else if (title.includes(keyword)) score += 80;
  else {
    const titleMatches = keywords.filter(k => title.includes(k)).length;
    if (titleMatches > 0) score += 60 * (titleMatches / keywords.length);
  }

  if (spec.includes(keyword)) score += 40;
  else {
    const specMatches = keywords.filter(k => spec.includes(k)).length;
    if (specMatches > 0) score += 20 * (specMatches / keywords.length);
  }

  if (moduleName.includes(keyword) || productName.includes(keyword)) score += 10;

  return score;
}

export class SearchApi {
  constructor(
    private readonly productApi: ProductApi,
    private readonly storyApi: StoryApi,
  ) {}

  async searchStories(input: SearchStoriesInput): Promise<unknown> {
    const { keyword, productId, limit = 20, deepSearch = false } = input;
    const storiesResult = await this.getAllStories(productId);
    const stories = storiesResult.items;
    const lowerKeyword = keyword.toLowerCase();
    const keywords = splitKeywords(keyword);
    let deepSearchFailures = 0;

    const scored = stories
      .map(story => ({
        story,
        score: calculateMatchScore(story as Record<string, unknown>, lowerKeyword, keywords),
      }))
      .filter(item => item.score > 0);

    if (deepSearch) {
      const candidates = scored
        .filter(item => {
          const title = String(item.story.title ?? '').toLowerCase();
          const spec = String(item.story.spec ?? '').toLowerCase();
          return title.includes(lowerKeyword) && !spec.includes(lowerKeyword) && item.score < 50;
        })
        .slice(0, 10);

      for (const item of candidates) {
        try {
          const detail = await this.storyApi.getStoryDetail(Number(item.story.id));
          const newScore = calculateMatchScore(detail as Record<string, unknown>, lowerKeyword, keywords);
          if (newScore > item.score) {
            item.story = detail as Record<string, unknown>;
            item.score = newScore;
          }
        } catch {
          deepSearchFailures += 1;
        }
      }
    }

    scored.sort((a, b) => b.score - a.score || Number(b.story.id ?? 0) - Number(a.story.id ?? 0));

    return {
      source: productId ? 'product-scoped-search' : 'global-search',
      partial: storiesResult.partial || deepSearchFailures > 0,
      failedProducts: storiesResult.failedProducts,
      scannedProducts: storiesResult.scannedProducts,
      scannedStories: stories.length,
      deepSearchFailures,
      keyword,
      productId: productId ?? null,
      limit,
      totalMatched: scored.length,
      items: scored.slice(0, limit).map(item => ({ ...item.story, matchScore: item.score })),
    };
  }

  async searchStoriesByProductName(productName: string, keyword: string, input: Omit<SearchStoriesInput, 'keyword' | 'productId'> = {}): Promise<unknown> {
    const productsResult = await this.productApi.getProducts() as { items: Array<Record<string, unknown>> };
    const matchedProducts = productsResult.items.filter(product => String(product.name ?? '').toLowerCase().includes(productName.toLowerCase()));

    const results = [] as Array<Record<string, unknown>>;
    let partial = false;
    let failedProducts = 0;
    let scannedProducts = 0;
    let deepSearchFailures = 0;
    for (const product of matchedProducts) {
      const productId = Number(product.id);
      scannedProducts += 1;
      try {
        const searchResult = await this.searchStories({ ...input, keyword, productId }) as Record<string, unknown>;
        partial = partial || Boolean(searchResult.partial);
        deepSearchFailures += Number(searchResult.deepSearchFailures ?? 0);
        results.push({
          product: { id: productId, name: product.name },
          result: searchResult,
        });
      } catch (error) {
        partial = true;
        failedProducts += 1;
        results.push({
          product: { id: productId, name: product.name },
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      source: 'product-name-search',
      partial,
      failedProducts,
      scannedProducts,
      deepSearchFailures,
      productName,
      keyword,
      matchedProducts: matchedProducts.length,
      items: results,
    };
  }

  private async getAllStories(productId?: number): Promise<{
    partial: boolean;
    failedProducts: number;
    scannedProducts: number;
    items: Array<Record<string, unknown>>;
  }> {
    if (productId) {
      return {
        partial: false,
        failedProducts: 0,
        scannedProducts: 1,
        items: await this.getAllStoriesByProduct(productId),
      };
    }

    const productsResult = await this.productApi.getProducts() as { items: Array<Record<string, unknown>> };
    const allStories: Array<Record<string, unknown>> = [];
    let failedProducts = 0;
    for (const product of productsResult.items) {
      try {
        allStories.push(...await this.getAllStoriesByProduct(Number(product.id)));
      } catch {
        failedProducts += 1;
      }
    }
    return {
      partial: failedProducts > 0,
      failedProducts,
      scannedProducts: productsResult.items.length,
      items: allStories,
    };
  }

  private async getAllStoriesByProduct(productId: number): Promise<Array<Record<string, unknown>>> {
    const firstPage = await this.storyApi.getProductStories({ productId, page: 1, limit: 100 }) as { total: number; items: Array<Record<string, unknown>> };
    const stories = [...firstPage.items];
    const totalPages = normalizeTotalPages(firstPage.total, 100, stories.length);

    for (let page = 2; page <= totalPages; page += 1) {
      const result = await this.storyApi.getProductStories({ productId, page, limit: 100 }) as { items: Array<Record<string, unknown>> };
      stories.push(...result.items);
    }

    return stories;
  }
}

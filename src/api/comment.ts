import type { ZentaoHttpClient } from '../core/http.js';

export type CommentObjectType = 'task' | 'bug' | 'story' | 'product' | 'project' | 'execution' | string;

export interface AddCommentInput {
  objectType: CommentObjectType;
  objectID: number;
  comment: string;
}

export interface CommentsFallbackResult {
  source: 'actions-fallback';
  note: string;
  actions: unknown;
}

export class CommentApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getComments(objectType: CommentObjectType, objectID: number): Promise<unknown> {
    try {
      return await this.http.request('GET', `/comments/${objectType}/${objectID}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return this.getActionsFromObjectDetail(objectType, objectID);
      }
      throw error;
    }
  }

  async addComment(input: AddCommentInput): Promise<unknown> {
    return this.http.request('POST', '/comment', { data: input });
  }

  private async getActionsFromObjectDetail(objectType: CommentObjectType, objectID: number): Promise<CommentsFallbackResult> {
    const endpoint = this.getObjectEndpoint(objectType, objectID);
    const detail = await this.http.request<Record<string, unknown>>('GET', endpoint);
    return {
      source: 'actions-fallback',
      note: '当前禅道版本不支持 /comments/{objectType}/{objectID}，这里返回对象详情中的 actions，其中包含评论以及状态变更等操作记录。',
      actions: detail.actions ?? [],
    };
  }

  private getObjectEndpoint(objectType: CommentObjectType, objectID: number): string {
    switch (objectType) {
      case 'task':
        return `/tasks/${objectID}`;
      case 'bug':
        return `/bugs/${objectID}`;
      case 'story':
        return `/stories/${objectID}`;
      case 'product':
        return `/products/${objectID}`;
      case 'project':
        return `/projects/${objectID}`;
      case 'execution':
        return `/executions/${objectID}`;
      default:
        throw new Error(`不支持从详情回退获取评论: ${objectType}`);
    }
  }
}

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
    /**
     * 禅道 18.5 v1 没有 REST comment entry。
     * 旧版 action::comment() 控制器仅当 RUN_MODE == 'api' 时返回 JSON，
     * 而 RUN_MODE 只在 api.php 入口被定义。
     *
     * 通过旧版 URL (action-comment-{type}-{id}.json) 触发控制器。
     * 非 API 模式返回 HTML：js::reload('parent') = 成功，其他 = 失败。
     * 备注实际已写入数据库，这里通过检查 HTML 模式判断成功与否。
     */
    const url = `/action-comment-${input.objectType}-${input.objectID}.json`;
    const formData = new URLSearchParams();
    formData.append('comment', input.comment);

    try {
      return await this.http.legacyRequest('POST', url, {
        data: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const isSuccess = message.includes('parent.location.reload');
      if (isSuccess) {
        return { status: 'success', message: '已添加备注' };
      }
      throw error;
    }
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

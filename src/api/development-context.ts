import type { BugApi } from './bug.js';
import type { RelationApi } from './relation.js';
import type { StoryApi } from './story.js';

export class DevelopmentContextApi {
  constructor(
    private readonly bugApi: BugApi,
    private readonly storyApi: StoryApi,
    private readonly relationApi: RelationApi,
  ) {}

  async getDevelopmentContext(input: { entityType: 'story' | 'bug'; entityId: number; productId?: number }): Promise<unknown> {
    if (input.entityType === 'story') {
      const story = await this.storyApi.getStoryDetail(input.entityId);
      const relatedBugs = await this.relationApi.getStoryRelatedBugs(input.entityId, input.productId);
      const testCases = Array.isArray(story.cases) ? story.cases : [];

      return {
        entityType: 'story',
        story,
        relatedBugs,
        testCases,
        summary: {
          relatedBugsCount: relatedBugs.bugs.length,
          testCasesCount: testCases.length,
        },
      };
    }

    const bug = await this.bugApi.getBugDetail(input.entityId);
    const relatedStory = await this.relationApi.getBugRelatedStory(input.entityId);

    return {
      entityType: 'bug',
      bug,
      relatedStory,
      summary: {
        hasRelatedStory: relatedStory !== null,
      },
    };
  }
}

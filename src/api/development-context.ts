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

  async getDevelopmentContextSnapshot(input: { entityType: 'story' | 'bug'; entityId: number; productId?: number }): Promise<unknown> {
    const context = await this.getDevelopmentContext(input) as Record<string, unknown>;

    if (input.entityType === 'story') {
      const story = asRecord(context.story);
      const relatedBugs = asRecord(context.relatedBugs);
      const bugItems = asArrayOfRecords(relatedBugs.bugs).slice(0, 10).map((bug) => ({
        id: bug.id,
        title: bug.title,
        status: bug.status,
        severity: bug.severity,
        assignedTo: bug.assignedTo,
        resolvedBy: bug.resolvedBy,
      }));
      const testCases = asArrayOfRecords(context.testCases).slice(0, 10).map((testCase) => ({
        id: testCase.id,
        title: testCase.title,
        status: testCase.status,
        lastRunResult: testCase.lastRunResult,
      }));

      return {
        entityType: 'story',
        focus: {
          id: story.id,
          title: story.title,
          status: story.status,
          stage: story.stage,
          assignedTo: story.assignedTo,
          openedBy: story.openedBy,
        },
        relatedBugs: bugItems,
        testCases,
        summary: {
          ...asRecord(context.summary),
          relatedBugsShown: bugItems.length,
          testCasesShown: testCases.length,
        },
      };
    }

    const bug = asRecord(context.bug);
    const relatedStory = asRecordOrNull(context.relatedStory);
    return {
      entityType: 'bug',
      focus: {
        id: bug.id,
        title: bug.title,
        status: bug.status,
        severity: bug.severity,
        assignedTo: bug.assignedTo,
        resolvedBy: bug.resolvedBy,
        openedBy: bug.openedBy,
      },
      relatedStory: relatedStory
        ? {
            id: relatedStory.id,
            title: relatedStory.title,
            status: relatedStory.status,
            stage: relatedStory.stage,
            assignedTo: relatedStory.assignedTo,
          }
        : null,
      summary: asRecord(context.summary),
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asRecordOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
    : [];
}

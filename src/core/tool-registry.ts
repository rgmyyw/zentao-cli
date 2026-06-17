import type { CliRegistry } from './cli-registry.js';
import type { Role } from '../types/common.js';
import { hasToolGroup, type ToolGroup } from './roles.js';

export interface RegisterToolsOptions {
  commandName?: string;
  onGroupRegister?: (group: ToolGroup, commands: string[]) => void;
}

type GroupLoader = () => Promise<(server: CliRegistry) => void>;

export const groupLoaders: Record<ToolGroup, GroupLoader> = {
  init: async () => (await import('../tools/init.js')).registerInitTools,
  task: async () => (await import('../tools/task.js')).registerTaskTools,
  todo: async () => (await import('../tools/todo.js')).registerTodoTools,
  bug: async () => (await import('../tools/bug.js')).registerBugTools,
  story: async () => (await import('../tools/story.js')).registerStoryTools,
  execution: async () => (await import('../tools/execution.js')).registerExecutionTools,
  comment: async () => (await import('../tools/comment.js')).registerCommentTools,
  profile: async () => (await import('../tools/profile.js')).registerProfileTools,
  statistics: async () => (await import('../tools/statistics.js')).registerStatisticsTools,
  relation: async () => (await import('../tools/relation.js')).registerRelationTools,
  context: async () => (await import('../tools/context.js')).registerContextTools,
  product: async () => (await import('../tools/product.js')).registerProductTools,
  project: async () => (await import('../tools/project.js')).registerProjectTools,
  testcase: async () => (await import('../tools/testcase.js')).registerTestCaseTools,
  testtask: async () => (await import('../tools/testtask.js')).registerTestTaskTools,
  program: async () => (await import('../tools/program.js')).registerProgramTools,
  plan: async () => (await import('../tools/plan.js')).registerPlanTools,
  build: async () => (await import('../tools/build.js')).registerBuildTools,
  release: async () => (await import('../tools/release.js')).registerReleaseTools,
  'resource-analysis': async () => (await import('../tools/resource-analysis.js')).registerResourceAnalysisTools,
  search: async () => (await import('../tools/search.js')).registerSearchTools,
  'story-write': async () => (await import('../tools/phase3a.js')).registerStoryWriteTools,
  'task-derived': async () => (await import('../tools/phase3a.js')).registerTaskDerivedTools,
  'plan-write': async () => (await import('../tools/plan.js')).registerPlanTools,
  'plan-relation': async () => (await import('../tools/phase3a.js')).registerPlanRelationTools,
  'execution-write': async () => (await import('../tools/phase3b.js')).registerExecutionWriteTools,
  'build-write': async () => (await import('../tools/phase3b.js')).registerBuildWriteTools,
  'release-write': async () => (await import('../tools/release.js')).registerReleaseWriteTools,
  'testcase-write': async () => (await import('../tools/phase3b.js')).registerTestCaseWriteTools,
  'testtask-write': async () => (await import('../tools/phase3b.js')).registerTestTaskWriteTools,
  'product-write': async () => (await import('../tools/phase3c.js')).registerProductWriteTools,
  'project-write': async () => (await import('../tools/phase3c.js')).registerProjectWriteTools,
  'program-write': async () => (await import('../tools/phase3c.js')).registerProgramWriteTools,
};

export async function registerTools(
  server: CliRegistry,
  role: Role,
  options: RegisterToolsOptions = {},
): Promise<void> {
  const { commandName, onGroupRegister } = options;

  if (commandName) {
    const group = await resolveCommandGroup(commandName);
    if (group && hasToolGroup(role, group)) {
      await registerGroup(server, group, onGroupRegister);
      return;
    }
  }

  for (const group of Object.keys(groupLoaders) as ToolGroup[]) {
    if (!hasToolGroup(role, group)) continue;
    await registerGroup(server, group, onGroupRegister);
  }
}

async function registerGroup(
  server: CliRegistry,
  group: ToolGroup,
  onGroupRegister?: (group: ToolGroup, commands: string[]) => void,
): Promise<void> {
  const before = new Set(server.listCommands().map((command) => command.name));
  const loader = groupLoaders[group];
  const register = await loader();
  register(server);
  const added = server.listCommands().map((command) => command.name).filter((name) => !before.has(name));
  onGroupRegister?.(group, added);
}

async function resolveCommandGroup(commandName: string): Promise<ToolGroup | undefined> {
  try {
    const { commandToGroup } = await import('./command-groups.generated.js');
    const group = commandToGroup[commandName];
    return group as ToolGroup | undefined;
  } catch {
    return undefined;
  }
}

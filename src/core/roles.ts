import type { Role } from '../types/common.js';

export type ToolGroup = 'init' | 'task' | 'todo' | 'bug' | 'story' | 'execution' | 'comment' | 'profile' | 'statistics' | 'relation' | 'context' | 'product' | 'project' | 'testcase' | 'testtask' | 'program' | 'plan' | 'build' | 'release' | 'resource-analysis' | 'search' | 'story-write' | 'task-derived' | 'plan-write' | 'plan-relation' | 'execution-write' | 'build-write' | 'release-write' | 'testcase-write' | 'testtask-write';

const ROLE_TOOL_GROUPS: Record<Role, ToolGroup[]> = {
  full: ['init', 'task', 'todo', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'testcase', 'testtask', 'program', 'plan', 'build', 'release', 'resource-analysis', 'search', 'story-write', 'task-derived', 'plan-write', 'plan-relation', 'execution-write', 'build-write', 'release-write', 'testcase-write', 'testtask-write'],
  dev: ['init', 'task', 'todo', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'build', 'release', 'resource-analysis', 'search', 'story-write', 'task-derived', 'execution-write', 'build-write', 'release-write'],
  qa: ['init', 'task', 'todo', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'testcase', 'testtask', 'build', 'release', 'resource-analysis', 'search', 'release-write', 'testcase-write', 'testtask-write'],
  pm: ['init', 'todo', 'story', 'execution', 'comment', 'profile', 'relation', 'context', 'product', 'project', 'program', 'plan', 'release', 'resource-analysis', 'search', 'story-write', 'plan-write', 'plan-relation', 'execution-write', 'release-write'],
};

export function hasToolGroup(role: Role, group: ToolGroup): boolean {
  return ROLE_TOOL_GROUPS[role].includes(group);
}

export function getToolGroups(role: Role): ToolGroup[] {
  return ROLE_TOOL_GROUPS[role];
}

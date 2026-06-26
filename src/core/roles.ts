import type { Role } from '../types/common.js';

export type ToolGroup = 'init' | 'task' | 'todo' | 'bug' | 'story' | 'execution' | 'comment' | 'profile' | 'statistics' | 'relation' | 'context' | 'product' | 'project' | 'testcase' | 'testtask' | 'program' | 'plan' | 'build' | 'release' | 'resource-analysis' | 'search' | 'url-intent' | 'story-write' | 'task-derived' | 'plan-write' | 'plan-relation' | 'execution-write' | 'build-write' | 'release-write' | 'testcase-write' | 'testtask-write' | 'product-write' | 'project-write' | 'program-write' | 'file';

const ROLE_TOOL_GROUPS: Record<Role, ToolGroup[]> = {
  full: ['init', 'task', 'todo', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'testcase', 'testtask', 'program', 'plan', 'build', 'release', 'resource-analysis', 'search', 'url-intent', 'story-write', 'task-derived', 'plan-write', 'plan-relation', 'execution-write', 'build-write', 'release-write', 'testcase-write', 'testtask-write', 'product-write', 'project-write', 'program-write', 'file'],
  dev: ['init', 'task', 'todo', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'build', 'release', 'resource-analysis', 'search', 'url-intent', 'story-write', 'task-derived', 'execution-write', 'build-write', 'release-write', 'product-write', 'project-write', 'file'],
  qa: ['init', 'task', 'todo', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'testcase', 'testtask', 'build', 'release', 'resource-analysis', 'search', 'url-intent', 'release-write', 'testcase-write', 'testtask-write', 'product-write', 'project-write', 'file'],
  pm: ['init', 'todo', 'story', 'execution', 'comment', 'profile', 'relation', 'context', 'product', 'project', 'program', 'plan', 'release', 'resource-analysis', 'search', 'url-intent', 'story-write', 'plan-write', 'plan-relation', 'execution-write', 'release-write', 'product-write', 'project-write', 'program-write', 'file'],
};

export function hasToolGroup(role: Role, group: ToolGroup): boolean {
  return ROLE_TOOL_GROUPS[role].includes(group);
}

export function getToolGroups(role: Role): ToolGroup[] {
  return ROLE_TOOL_GROUPS[role];
}

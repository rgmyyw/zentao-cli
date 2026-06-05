import type { Role } from '../types/common.js';

export type ToolGroup = 'init' | 'task' | 'bug' | 'story' | 'execution' | 'comment' | 'profile' | 'statistics' | 'relation' | 'context' | 'product' | 'project' | 'testcase' | 'testtask' | 'program' | 'plan' | 'build' | 'release' | 'search' | 'story-write' | 'task-derived' | 'plan-relation' | 'execution-write' | 'build-write' | 'testcase-write' | 'testtask-write';

const ROLE_TOOL_GROUPS: Record<Role, ToolGroup[]> = {
  full: ['init', 'task', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'testcase', 'testtask', 'program', 'plan', 'build', 'release', 'search', 'story-write', 'task-derived', 'plan-relation', 'execution-write', 'build-write', 'testcase-write', 'testtask-write'],
  dev: ['init', 'task', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'build', 'release', 'search', 'story-write', 'task-derived', 'execution-write', 'build-write'],
  qa: ['init', 'bug', 'story', 'execution', 'comment', 'profile', 'statistics', 'relation', 'context', 'product', 'project', 'testcase', 'testtask', 'build', 'release', 'search', 'testcase-write', 'testtask-write'],
  pm: ['init', 'story', 'execution', 'comment', 'profile', 'relation', 'context', 'product', 'project', 'program', 'plan', 'release', 'search', 'story-write', 'plan-relation', 'execution-write'],
};

export function hasToolGroup(role: Role, group: ToolGroup): boolean {
  return ROLE_TOOL_GROUPS[role].includes(group);
}

export function getToolGroups(role: Role): ToolGroup[] {
  return ROLE_TOOL_GROUPS[role];
}

import { describe, expect, it } from 'vitest';
import { getToolGroups, hasToolGroup } from '../../src/core/roles.js';

describe('roles', () => {
  it('hasToolGroup 能判断角色是否拥有工具组', () => {
    expect(hasToolGroup('dev', 'build')).toBe(true);
    expect(hasToolGroup('qa', 'program')).toBe(false);
  });

  it('getToolGroups 返回角色对应工具组列表', () => {
    expect(getToolGroups('pm')).toEqual([
      'init',
      'todo',
      'story',
      'execution',
      'comment',
      'profile',
      'relation',
      'context',
      'product',
      'project',
      'program',
      'plan',
      'release',
      'resource-analysis',
      'search',
      'story-write',
      'plan-write',
      'plan-relation',
      'execution-write',
      'release-write',
    ]);
  });
});

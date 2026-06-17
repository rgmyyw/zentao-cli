import { describe, expect, it } from 'vitest';
import { getToolGroups, hasToolGroup } from '../../src/core/roles.js';

describe('roles', () => {
  it('hasToolGroup 能判断角色是否拥有工具组', () => {
    expect(hasToolGroup('dev', 'build')).toBe(true);
    expect(hasToolGroup('qa', 'program')).toBe(false);
  });

  it('getToolGroups 返回角色对应工具组列表', () => {
    const groups = getToolGroups('pm');
    expect(groups).toEqual(expect.arrayContaining([
      'init',
      'todo',
      'story',
      'execution',
      'product',
      'project',
      'program',
      'plan',
      'release',
      'story-write',
      'plan-write',
      'plan-relation',
      'execution-write',
      'release-write',
      'product-write',
      'project-write',
      'program-write',
    ]));
    expect(groups).not.toContain('testcase-write');
  });
});

import type { Role } from '../types/common.js';
import { normalizeServerUrl } from './config.js';
import { hasToolGroup, type ToolGroup } from './roles.js';

export type UrlIntentAction = 'execute' | 'explain' | 'unknown';

export type UrlIntentSourceType = 'url' | 'path' | 'filename';

export type UrlRouteKind =
  | 'execution-bug'
  | 'execution-build'
  | 'execution-dynamic'
  | 'execution-task'
  | 'execution-story'
  | 'execution-view'
  | 'bug-view'
  | 'task-view'
  | 'story-view'
  | 'testcase-view'
  | 'testtask-view'
  | 'build-view'
  | 'project-view'
  | 'projectrelease-view'
  | 'program-view'
  | 'product-view'
  | 'productplan-view'
  | 'release-view'
  | 'todo-view'
  | 'doc-view'
  | 'job-view'
  | 'user-profile'
  | 'unknown';

export interface UrlIntentParam {
  name: string;
  value: string | number;
}

export interface ParsedUrlIntent {
  sourceType: UrlIntentSourceType;
  normalizedTarget: string;
  matchedServer: boolean;
  routeKind: UrlRouteKind;
  params: UrlIntentParam[];
  primaryCommand?: string;
  suggestedCommands: string[];
  action: UrlIntentAction;
  note?: string;
}

export interface ParseUrlIntentOptions {
  serverUrl?: string | null;
  role?: Role;
}

interface RouteSpec {
  routeKind: Exclude<UrlRouteKind, 'unknown'>;
  pattern: RegExp;
  params: (matched: RegExpMatchArray) => UrlIntentParam[];
  primaryCommand?: string;
  commandGroup?: ToolGroup;
  suggestedCommands: string[];
  defaultAction: Exclude<UrlIntentAction, 'unknown'>;
  buildCommandArgs?: (params: UrlIntentParam[]) => string[];
  note?: (params: UrlIntentParam[]) => string | undefined;
}

interface ParsedInputTarget {
  sourceType: UrlIntentSourceType;
  normalizedTarget: string;
  fileName: string;
  serverUrl?: string;
}

// 写页面命名清单：命中这些动词片段的页面/文件名一律降级为 explain，不自动执行写命令。
// 覆盖禅道常见写动作（finish/close/activate/start/pause/restart/cancel/confirm/suspend/putoff/assign/resolve
// 以及 batch* 批量写、create/edit/delete 等）。只读列表页（如 execution-bug、bug-view）不在此列。
const WRITE_PAGE_PATTERN = /(?:^|[-_/])(create|edit|delete|finish|close|assign|resolve|activate|start|pause|restart|cancel|confirm|suspend|putoff|batch\w*)(?:[-_/]|$)/i;

const ROUTE_SPECS: RouteSpec[] = [
  {
    routeKind: 'execution-bug',
    pattern: /^execution-bug-(\d+)\.html$/i,
    params: (matched) => [{ name: 'executionId', value: Number(matched[1]) }],
    primaryCommand: 'getExecutionBugs',
    commandGroup: 'execution',
    suggestedCommands: ['getExecutionDetail', 'getExecutionSnapshot', 'getExecutionDynamic'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--executionId', String(requireParam(params, 'executionId')), '--limit', '100'],
  },
  {
    routeKind: 'execution-build',
    pattern: /^execution-build-(\d+)\.html$/i,
    params: (matched) => [{ name: 'executionId', value: Number(matched[1]) }],
    primaryCommand: 'getExecutionBuilds',
    commandGroup: 'execution',
    suggestedCommands: ['getExecutionDetail', 'getExecutionSnapshot', 'getBuildDetail'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--executionId', String(requireParam(params, 'executionId'))],
  },
  {
    routeKind: 'execution-dynamic',
    pattern: /^execution-dynamic-(\d+)\.html$/i,
    params: (matched) => [{ name: 'executionId', value: Number(matched[1]) }],
    primaryCommand: 'getExecutionDynamic',
    commandGroup: 'execution',
    suggestedCommands: ['getExecutionDetail', 'getExecutionSnapshot', 'getExecutionBugs'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--executionId', String(requireParam(params, 'executionId'))],
  },
  {
    routeKind: 'execution-task',
    pattern: /^execution-task-(\d+)\.html$/i,
    params: (matched) => [{ name: 'executionId', value: Number(matched[1]) }],
    suggestedCommands: ['getExecutionDetail', 'getExecutionTaskKanban', 'getExecutionSnapshot'],
    defaultAction: 'explain',
    note: (params) => `该页面是执行任务列表，当前没有同名直达命令。可先调用 getExecutionDetail --executionId ${requireParam(params, 'executionId')} 或 getExecutionTaskKanban 查看上下文。`,
  },
  {
    routeKind: 'execution-story',
    pattern: /^execution-story-(\d+)\.html$/i,
    params: (matched) => [{ name: 'executionId', value: Number(matched[1]) }],
    suggestedCommands: ['getExecutionDetail', 'getExecutionStoryKanban', 'getExecutionSnapshot'],
    defaultAction: 'explain',
    note: (params) => `该页面是执行需求列表，当前没有同名直达命令。可先调用 getExecutionDetail --executionId ${requireParam(params, 'executionId')} 或 getExecutionStoryKanban 查看上下文。`,
  },
  {
    routeKind: 'execution-view',
    pattern: /^execution-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'executionId', value: Number(matched[1]) }],
    primaryCommand: 'getExecutionDetail',
    commandGroup: 'execution',
    suggestedCommands: ['getExecutionSnapshot', 'getExecutionBugs', 'getExecutionDynamic'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--executionId', String(requireParam(params, 'executionId'))],
  },
  {
    routeKind: 'program-view',
    pattern: /^program-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'programId', value: Number(matched[1]) }],
    primaryCommand: 'getProgramDetail',
    commandGroup: 'program',
    suggestedCommands: ['getPrograms', 'getProgramTrack', 'getProgramStakeholders'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--programId', String(requireParam(params, 'programId'))],
  },
  {
    routeKind: 'bug-view',
    pattern: /^bug-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'bugId', value: Number(matched[1]) }],
    primaryCommand: 'getBugDetail',
    commandGroup: 'bug',
    suggestedCommands: ['getBugSnapshot', 'getComments', 'getBugRelatedStory'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--bugId', String(requireParam(params, 'bugId'))],
  },
  {
    routeKind: 'task-view',
    pattern: /^task-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'taskId', value: Number(matched[1]) }],
    primaryCommand: 'getTaskDetail',
    commandGroup: 'task',
    suggestedCommands: ['getComments', 'getDevelopmentContext', 'getMyTasks'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--taskId', String(requireParam(params, 'taskId'))],
  },
  {
    routeKind: 'story-view',
    pattern: /^story-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'storyId', value: Number(matched[1]) }],
    primaryCommand: 'getStoryDetail',
    commandGroup: 'story',
    suggestedCommands: ['getStoryRelatedBugs', 'getDevelopmentContext', 'getComments'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--storyId', String(requireParam(params, 'storyId'))],
  },
  {
    routeKind: 'testcase-view',
    pattern: /^testcase-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'testCaseId', value: Number(matched[1]) }],
    primaryCommand: 'getTestCaseDetail',
    commandGroup: 'testcase',
    suggestedCommands: ['getComments', 'getProductTestCases', 'getTestTasks'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--testCaseId', String(requireParam(params, 'testCaseId'))],
  },
  {
    routeKind: 'testtask-view',
    pattern: /^testtask-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'testTaskId', value: Number(matched[1]) }],
    primaryCommand: 'getTestTaskDetail',
    commandGroup: 'testtask',
    suggestedCommands: ['getComments', 'getTestTasks', 'getExecutionBugs'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--testTaskId', String(requireParam(params, 'testTaskId'))],
  },
  {
    routeKind: 'build-view',
    pattern: /^build-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'buildId', value: Number(matched[1]) }],
    primaryCommand: 'getBuildDetail',
    commandGroup: 'build',
    suggestedCommands: ['getProjectBuilds', 'getProjectReleases', 'getComments'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--buildId', String(requireParam(params, 'buildId'))],
  },
  {
    routeKind: 'project-view',
    pattern: /^project-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'projectId', value: Number(matched[1]) }],
    primaryCommand: 'getProjectDetail',
    commandGroup: 'project',
    suggestedCommands: ['getProjectExecutions', 'getProjectBuilds', 'getComments'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--projectId', String(requireParam(params, 'projectId'))],
  },
  {
    routeKind: 'product-view',
    pattern: /^product-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'productId', value: Number(matched[1]) }],
    primaryCommand: 'getProductDetail',
    commandGroup: 'product',
    suggestedCommands: ['getProductStories', 'getProductBugs', 'getComments'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--productId', String(requireParam(params, 'productId'))],
  },
  {
    routeKind: 'productplan-view',
    pattern: /^productplan-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'planId', value: Number(matched[1]) }],
    primaryCommand: 'getPlanDetail',
    commandGroup: 'plan',
    suggestedCommands: ['getProductPlans', 'getProductStories', 'getProductBugs'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--planId', String(requireParam(params, 'planId'))],
  },
  {
    routeKind: 'projectrelease-view',
    pattern: /^projectrelease-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'releaseId', value: Number(matched[1]) }],
    primaryCommand: 'getReleaseDetail',
    commandGroup: 'release',
    suggestedCommands: ['getProjectReleases', 'getProjectDetail', 'getComments'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--releaseId', String(requireParam(params, 'releaseId'))],
  },
  {
    routeKind: 'release-view',
    pattern: /^release-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'releaseId', value: Number(matched[1]) }],
    primaryCommand: 'getReleaseDetail',
    commandGroup: 'release',
    suggestedCommands: ['getProjectBuilds', 'getProjectDetail', 'getComments'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--releaseId', String(requireParam(params, 'releaseId'))],
  },
  {
    routeKind: 'todo-view',
    pattern: /^todo-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'todoId', value: Number(matched[1]) }],
    primaryCommand: 'getTodoDetail',
    commandGroup: 'todo',
    suggestedCommands: ['getMyTodos', 'getComments', 'getMyTasks'],
    defaultAction: 'execute',
    buildCommandArgs: (params) => ['--todoId', String(requireParam(params, 'todoId'))],
  },
  {
    routeKind: 'doc-view',
    pattern: /^doc-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'docId', value: Number(matched[1]) }],
    suggestedCommands: [],
    defaultAction: 'explain',
    note: (params) => `当前 CLI 还没有 doc 详情命令，解析到的是文档页面 docID=${requireParam(params, 'docId')}。`,
  },
  {
    routeKind: 'job-view',
    pattern: /^job-view-(\d+)\.html$/i,
    params: (matched) => [{ name: 'jobId', value: Number(matched[1]) }],
    suggestedCommands: [],
    defaultAction: 'explain',
    note: (params) => `当前 CLI 还没有 job 详情命令，解析到的是构建任务页面 jobID=${requireParam(params, 'jobId')}。`,
  },
  {
    routeKind: 'user-profile',
    pattern: /^user-profile-(\d+)\.html$/i,
    params: (matched) => [{ name: 'userId', value: Number(matched[1]) }],
    suggestedCommands: [],
    defaultAction: 'explain',
    note: (params) => `当前 CLI 还没有用户档案直达命令，解析到的是用户资料页面 userID=${requireParam(params, 'userId')}。`,
  },
];

export function looksLikeUrlIntentInput(input?: string): boolean {
  if (!input) return false;
  return /^[a-z]+:\/\//i.test(input)
    || /[\\/]/.test(input)
    || /\.html?(?:[?#].*)?$/i.test(input);
}

export function parseUrlIntent(input: string, options: ParseUrlIntentOptions = {}): ParsedUrlIntent {
  const target = parseTarget(input);
  const matchedServer = isMatchedServer(target.serverUrl, options.serverUrl);

  for (const spec of ROUTE_SPECS) {
    const matched = target.fileName.match(spec.pattern);
    if (!matched) continue;

    const params = spec.params(matched);
    let action: UrlIntentAction = spec.defaultAction;
    const notes: string[] = [];
    const baseNote = spec.note?.(params);
    if (baseNote) notes.push(baseNote);

    if (WRITE_PAGE_PATTERN.test(target.fileName)) {
      action = 'explain';
      notes.push('该页面看起来对应写操作，解析器不会自动执行写命令。');
    }

    if (!matchedServer && target.sourceType === 'url') {
      action = 'explain';
      notes.push('该 URL 的 host 与当前禅道配置不一致，已降级为仅解释，不自动执行。');
    }

    if (spec.primaryCommand && spec.commandGroup && options.role && !hasToolGroup(options.role, spec.commandGroup)) {
      action = 'explain';
      notes.push(`当前 role=${options.role} 不暴露命令 ${spec.primaryCommand}，已降级为仅解释。`);
    }

    return {
      sourceType: target.sourceType,
      normalizedTarget: target.normalizedTarget,
      matchedServer,
      routeKind: spec.routeKind,
      params,
      primaryCommand: spec.primaryCommand,
      suggestedCommands: spec.suggestedCommands,
      action,
      note: notes.length > 0 ? notes.join(' ') : undefined,
    };
  }

  if (WRITE_PAGE_PATTERN.test(target.fileName)) {
    return {
      sourceType: target.sourceType,
      normalizedTarget: target.normalizedTarget,
      matchedServer,
      routeKind: 'unknown',
      params: [],
      suggestedCommands: [],
      action: 'explain',
      note: '该页面看起来对应写操作，解析器不会自动执行写命令。',
    };
  }

  return {
    sourceType: target.sourceType,
    normalizedTarget: target.normalizedTarget,
    matchedServer,
    routeKind: 'unknown',
    params: [],
    suggestedCommands: [],
    action: 'unknown',
    note: '暂未识别该 URL / 页面文件名对应的禅道路由。',
  };
}

export function resolveExecutableUrlIntent(intent: ParsedUrlIntent): { commandName: string; commandArgs: string[] } | undefined {
  if (intent.action !== 'execute' || !intent.primaryCommand) return undefined;
  const spec = ROUTE_SPECS.find((item) => item.routeKind === intent.routeKind);
  if (!spec?.buildCommandArgs) return undefined;
  return {
    commandName: intent.primaryCommand,
    commandArgs: spec.buildCommandArgs(intent.params),
  };
}

function parseTarget(input: string): ParsedInputTarget {
  const trimmed = input.trim();

  if (/^[a-z]+:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const normalizedTarget = parsed.pathname.split('/').filter(Boolean).pop() ?? (parsed.pathname || trimmed);
      return {
        sourceType: 'url',
        normalizedTarget,
        fileName: normalizedTarget.split(/[?#]/, 1)[0],
        serverUrl: `${parsed.protocol}//${parsed.host}`,
      };
    } catch {
      return {
        sourceType: 'url',
        normalizedTarget: trimmed,
        fileName: trimmed.split(/[?#]/, 1)[0]?.split(/[\\/]/).filter(Boolean).pop() ?? trimmed,
      };
    }
  }

  if (/[\\/]/.test(trimmed)) {
    const normalizedTarget = trimmed.split(/[?#]/, 1)[0] || trimmed;
    return {
      sourceType: 'path',
      normalizedTarget,
      fileName: normalizedTarget.split(/[\\/]/).filter(Boolean).pop() ?? normalizedTarget,
    };
  }

  return {
    sourceType: 'filename',
    normalizedTarget: trimmed,
    fileName: trimmed.split(/[?#]/, 1)[0] || trimmed,
  };
}

function isMatchedServer(targetServerUrl: string | undefined, configuredServerUrl: string | null | undefined): boolean {
  if (!targetServerUrl || !configuredServerUrl) return true;
  return normalizeServerUrl(targetServerUrl) === normalizeServerUrl(configuredServerUrl);
}

function requireParam(params: UrlIntentParam[], name: string): string | number {
  const param = params.find((item) => item.name === name);
  if (!param) throw new Error(`缺少 URL 参数 ${name}`);
  return param.value;
}

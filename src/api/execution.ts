import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult, toServerListResult, type ListResult } from '../core/list-result.js';
import { fetchAllPages, normalizePagination, type PaginationInput } from '../core/pagination.js';
import type { ZentaoBug, ZentaoExecution, ZentaoListResponse, ZentaoTask } from '../types/zentao.js';
import { addDays, formatDate, isOnOrBefore, makeCalendarDate, normalizeOptionalText, parseCalendarDate, toDateOnly } from '../utils/date.js';
import { toFormUrlEncoded } from '../utils/form.js';
import { bugMatchesKeyword, bugMatchesModuleAlias, normalizeBugFilterText } from './bug-filter.js';

export interface UpdateExecutionInput {
  project?: number;
  name?: string;
  code?: string;
  desc?: string;
  begin?: string;
  end?: string;
  days?: number;
  lifetime?: string;
  PO?: string;
  PM?: string;
  QD?: string;
  RD?: string;
  teamMembers?: string[];
  acl?: string;
  whitelist?: string[];
}

export interface ExecutionActionInput {
  comment?: string;
  realBegan?: string;
  realEnd?: string;
}

export interface PutoffExecutionInput {
  days: number;
  comment?: string;
}

export interface ExecutionDailyBugStatsInput {
  iterationName?: string;
  date?: string;
}

export interface ExecutionBugListParams extends PaginationInput {
  status?: string;
  search?: string;
  module?: string;
  moduleId?: number;
}

export class ExecutionApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getExecutionDetail(executionId: number): Promise<ZentaoExecution> {
    return this.http.request<ZentaoExecution>('GET', `/executions/${executionId}`);
  }

  async getExecutionDynamic(executionId: number): Promise<unknown> {
    const response = await this.http.request<{ dynamics?: unknown[]; [key: string]: unknown }>('GET', `/executions/${executionId}`, {
      params: { fields: 'dynamics' },
    });

    const dynamics = Array.isArray(response.dynamics) ? response.dynamics : [];
    return {
      source: 'execution-fields-dynamics',
      note: '近似读取：调用禅道 REST GET /executions/{id}?fields=dynamics，仅返回执行详情接口附带的动态摘要；不是旧版 execution-dynamic 页面完整等价实现，暂不支持 today/all/自定义时间范围。',
      executionId,
      total: dynamics.length,
      dynamics,
    };
  }

  async getProjectExecutions(projectId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/projects/${projectId}/executions`);
    return toServerListResult(response, ['executions']);
  }

  async getExecutionBuilds(executionId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/executions/${executionId}/builds`);
    return toServerListResult(response, ['builds']);
  }

  async getExecutionBugs(executionId: number, params: ExecutionBugListParams = {}): Promise<unknown> {
    const normalizedParams = this.normalizeExecutionBugQueryParams(params);
    const needsClientFilter = !!(normalizedParams.moduleId || normalizedParams.module || normalizedParams.search);

    if (needsClientFilter) {
      return this.getExecutionBugsWithClientFilter(executionId, normalizedParams);
    }

    const pagination = normalizePagination(normalizedParams);
    const response = await this.http.request<ZentaoListResponse<ZentaoBug> & { bugs?: ZentaoBug[] }>('GET', `/executions/${executionId}/bugs`, {
      params: {
        ...pagination,
        status: normalizedParams.status,
      },
    });
    return toServerListResult(response, ['bugs'], normalizedParams);
  }

  private async getExecutionBugsWithClientFilter(executionId: number, params: ExecutionBugListParams): Promise<ListResult<ZentaoBug>> {
    const pageSize = 100;
    const allBugs = await fetchAllPages<ZentaoBug>({
      pageSize,
      fetchPage: async (page) => {
        const response = await this.fetchExecutionBugsPage(executionId, params, page, pageSize);
        return toServerListResult<ZentaoBug>(response, ['bugs']);
      },
    });

    let filtered = allBugs;

    if (params.moduleId) {
      filtered = filtered.filter((bug) => {
        const bugModuleId = (bug as Record<string, unknown>).module ?? (bug as Record<string, unknown>).moduleId;
        return Number(bugModuleId) === params.moduleId;
      });
    }

    if (params.module) {
      const keyword = normalizeBugFilterText(params.module);
      filtered = filtered.filter((bug) => bugMatchesModuleAlias(bug, keyword));
    }

    if (params.search) {
      const keyword = normalizeBugFilterText(params.search);
      filtered = filtered.filter((bug) => bugMatchesKeyword(bug, keyword, ['id', 'title', 'name', 'keywords', 'steps', 'moduleTitle', 'moduleName', 'modulePath', 'path']));
    }

    const result = toClientPaginatedListResult<ZentaoBug>({ bugs: filtered }, ['bugs'], params);
    return {
      ...result,
      scanned: allBugs.length,
      ...(filtered.length !== allBugs.length ? { matched: filtered.length } : {}),
    } as ListResult<ZentaoBug> & { matched?: number };
  }

  private async fetchExecutionBugsPage(executionId: number, params: ExecutionBugListParams, page: number, limit: number): Promise<unknown> {
    return this.http.request('GET', `/executions/${executionId}/bugs`, {
      params: {
        page,
        limit,
        status: params.status,
      },
    });
  }

  async createExecution(input: { project: number; name: string; code?: string; begin: string; end: string; days?: number; lifetime?: string; desc?: string; PO?: string; PM?: string; QD?: string; RD?: string; acl?: string; whitelist?: string[]; teamMembers?: string[]; products?: number[]; plans?: number[] }): Promise<unknown> {
    const formData: Record<string, unknown> = {
      name: input.name,
      begin: input.begin,
      end: input.end,
    };
    if (input.code !== undefined) formData.code = input.code;
    if (input.days !== undefined) formData.days = input.days;
    if (input.lifetime !== undefined) formData.lifetime = input.lifetime;
    if (input.desc !== undefined) formData.desc = input.desc;
    if (input.PO !== undefined) formData.PO = input.PO;
    if (input.PM !== undefined) formData.PM = input.PM;
    if (input.QD !== undefined) formData.QD = input.QD;
    if (input.RD !== undefined) formData.RD = input.RD;
    if (input.acl !== undefined) formData.acl = input.acl;
    if (input.whitelist && input.whitelist.length > 0) formData.whitelist = input.whitelist.join(',');
    if (input.teamMembers && input.teamMembers.length > 0) formData.teamMembers = input.teamMembers.join(',');
    if (input.products && input.products.length > 0) formData.products = input.products.join(',');
    if (input.plans && input.plans.length > 0) formData.plans = input.plans.join(',');
    return this.http.legacyRequest('POST', `/execution-create-${input.project}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchEditExecutions(input: {
    executionIds: number[];
    names?: Record<string, string>;
    dayses?: Record<string, number>;
    descs?: Record<string, string>;
    begins?: Record<string, string>;
    ends?: Record<string, string>;
    lifetimes?: Record<string, string>;
    POs?: Record<string, string>;
    PMs?: Record<string, string>;
    QDs?: Record<string, string>;
    RDs?: Record<string, string>;
  }): Promise<unknown> {
    if (!Array.isArray(input.executionIds) || input.executionIds.length === 0) {
      throw new Error('executionIds 至少需要 1 项');
    }
    const params = new URLSearchParams();
    for (const id of input.executionIds) params.append('executionIDList[]', String(id));
    this.appendIdMap(params, 'names', input.names);
    this.appendIdMap(params, 'dayses', input.dayses);
    this.appendIdMap(params, 'descs', input.descs);
    this.appendIdMap(params, 'begins', input.begins);
    this.appendIdMap(params, 'ends', input.ends);
    this.appendIdMap(params, 'lifetimes', input.lifetimes);
    this.appendIdMap(params, 'POs', input.POs);
    this.appendIdMap(params, 'PMs', input.PMs);
    this.appendIdMap(params, 'QDs', input.QDs);
    this.appendIdMap(params, 'RDs', input.RDs);
    return this.http.legacyRequest('POST', '/execution-batchEdit-0.json', {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private appendIdMap(params: URLSearchParams, field: string, values?: Record<string, string | number>): void {
    if (!values) return;
    for (const [id, value] of Object.entries(values)) {
      if (value === undefined || value === null) continue;
      params.append(`${field}[${id}]`, String(value));
    }
  }

  async getExecutionKanban(executionId: number, input: { browseType?: string; orderBy?: string; groupBy?: string } = {}): Promise<unknown> {
    const params: string[] = [];
    if (input.browseType) params.push(input.browseType);
    if (input.orderBy) params.push(input.orderBy);
    if (input.groupBy) params.push(input.groupBy);
    const tail = params.length > 0 ? `-${params.join('-')}` : '';
    return this.http.legacyRequest('GET', `/execution-kanban-${executionId}${tail}.json`);
  }

  async getExecutionTaskKanban(executionId: number, input: { browseType?: string; orderBy?: string; groupBy?: string } = {}): Promise<unknown> {
    const params: string[] = [];
    if (input.browseType) params.push(input.browseType);
    if (input.orderBy) params.push(input.orderBy);
    if (input.groupBy) params.push(input.groupBy);
    const tail = params.length > 0 ? `-${params.join('-')}` : '';
    return this.http.legacyRequest('GET', `/execution-taskKanban-${executionId}${tail}.json`);
  }

  async getAllExecutionKanban(): Promise<unknown> {
    return this.http.legacyRequest('GET', '/execution-executionKanban.json');
  }

  async getExecutionDailyBugStats(executionId: number, input: ExecutionDailyBugStatsInput = {}): Promise<unknown> {
    const normalizedInput = {
      ...input,
      iterationName: this.normalizeOptionalText(input.iterationName),
      date: this.normalizeOptionalText(input.date),
    };
    const date = this.resolveStatsDate(normalizedInput.date);
    const bugs = await this.getAllExecutionBugs(executionId);
    const tasks = await this.getAllExecutionTasks(executionId);
    const total = bugs.length;
    const reopened = bugs.filter(bug => Number(bug.activatedCount ?? 0) > 0);
    const delayed = bugs.filter(bug => this.isDelayedBug(bug));
    const closed = bugs.filter(bug => this.toString(bug.status) === 'closed');
    const resolved = bugs.filter(bug => this.toString(bug.status) === 'resolved');
    const unresolved = bugs.filter(bug => !['closed', 'resolved'].includes(this.toString(bug.status)));
    const testerNotClosed = resolved.filter(bug => isOnOrBefore(toDateOnly(bug.resolvedDate), formatDate(addDays(parseCalendarDate(date) ?? new Date(), -1))));
    const devNotResolvedToday = unresolved.filter(bug => isOnOrBefore(toDateOnly(bug.openedDate), date));
    const userNames = await this.resolveUserNames(bugs.map(bug => this.getBugOwner(bug)));
    const participants = this.buildParticipantBugStats(bugs, total, devNotResolvedToday, userNames);
    const highReopenParticipants = participants.filter(item => item.reopened > 0).map(item => item.displayName);
    const iterationName = normalizedInput.iterationName ?? `执行 #${executionId}`;

    const result = {
      source: 'execution-bugs-current-state',
      note: '按执行下 Bug 当前字段近似统计：reopen 使用 activatedCount>0；延期处理使用 status=postponed 或 resolution=postponed/delay/delayed；测试未及时关闭Bug使用 resolvedDate 早于统计日且当前仍未关闭；开发今日未及时解决bug使用当前未解决且创建日期不晚于统计日期。',
      executionId,
      iterationName,
      date,
      total,
      delayed: delayed.length,
      reopened: reopened.length,
      reopenedRate: this.percent(reopened.length, total),
      closed: closed.length,
      resolved: resolved.length,
      unresolved: unresolved.length,
      testerNotClosed: testerNotClosed.length,
      devNotResolvedToday: devNotResolvedToday.length,
      participants,
      taskSummary: this.buildTaskSummary(tasks, date),
      severitySummary: this.buildSeveritySummary(bugs),
      details: {
        reopened: this.buildBugDetails(reopened, userNames),
        delayed: this.buildBugDetails(delayed, userNames),
        testerNotClosed: this.buildBugDetails(testerNotClosed, userNames),
        devNotResolvedToday: this.buildBugDetails(devNotResolvedToday, userNames),
        taskFinishedToday: this.buildTaskDetails(tasks.filter(task => toDateOnly(task.finishedDate) === date)),
        taskOverdueUnfinished: this.buildTaskDetails(tasks.filter(task => this.isOverdueUnfinishedTask(task, date))),
        taskFromBug: this.buildTaskDetails(tasks.filter(task => Number(task.fromBug ?? 0) > 0)),
      },
      notes: this.buildDailyBugNotes(reopened.length, total, highReopenParticipants),
    };

    return {
      ...result,
      report: this.formatDailyBugStatsReport(result),
    };
  }

  async updateExecution(executionId: number, update: UpdateExecutionInput): Promise<unknown> {
    /**
     * 禅道 18.5 v1 executionEntry::put() 在启用迭代代号时 code 字段拼接缺逗号。
     * 旧版 execution::edit() 控制器直接调用模型 update()，绕过该 bug。
     * 通过 $this->send() 返回 JSON，走 .json 扩展。
     */
    const formData = toFormUrlEncoded(this.normalizeExecutionUpdate(update) as Record<string, unknown>);
    return this.http.legacyRequest('POST', `/execution-edit-${executionId}.json`, {
      data: formData.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async startExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    /**
     * 禅道 18.5 REST v1 `/executions/{id}/start` action 路由不存在。
     * 旧版 execution::start($executionID, $from='execution') 走 `.json` 控制器。
     */
    return this.http.legacyRequest('POST', `/execution-start-${executionId}-execution.json`, {
      data: toFormUrlEncoded(this.normalizeExecutionAction(payload) as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async closeExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.legacyRequest('POST', `/execution-close-${executionId}-execution.json`, {
      data: toFormUrlEncoded(this.normalizeExecutionAction(payload) as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async suspendExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.legacyRequest('POST', `/execution-suspend-${executionId}-execution.json`, {
      data: toFormUrlEncoded(this.normalizeExecutionAction(payload) as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async activateExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.legacyRequest('POST', `/execution-activate-${executionId}-execution.json`, {
      data: toFormUrlEncoded(this.normalizeExecutionAction(payload) as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async putoffExecution(executionId: number, payload: PutoffExecutionInput): Promise<unknown> {
    return this.http.legacyRequest('POST', `/execution-putoff-${executionId}-execution.json`, {
      data: toFormUrlEncoded(this.normalizePutoffExecution(payload) as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private normalizeExecutionUpdate(update: UpdateExecutionInput): UpdateExecutionInput {
    return this.normalizeStringFields(update as Record<string, unknown>, ['name', 'code', 'desc', 'begin', 'end', 'lifetime', 'PO', 'PM', 'QD', 'RD', 'acl'], ['teamMembers', 'whitelist']) as UpdateExecutionInput;
  }

  private normalizeOptionalText(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private normalizeExecutionBugQueryParams(params: ExecutionBugListParams): ExecutionBugListParams {
    const normalized = { ...params } as ExecutionBugListParams & Record<string, unknown>;

    for (const key of ['status', 'search', 'module'] as const) {
      const value = normalized[key];
      if (typeof value !== 'string') continue;

      const trimmed = value.trim();
      if (trimmed === '') delete normalized[key];
      else normalized[key] = trimmed;
    }

    return normalized;
  }

  private normalizeExecutionAction(payload: ExecutionActionInput): ExecutionActionInput {
    return this.normalizeStringFields(payload as Record<string, unknown>, ['comment', 'realBegan', 'realEnd']) as ExecutionActionInput;
  }

  private normalizePutoffExecution(payload: PutoffExecutionInput): PutoffExecutionInput {
    return this.normalizeStringFields(payload as unknown as Record<string, unknown>, ['comment']) as unknown as PutoffExecutionInput;
  }

  private normalizeStringFields(input: Record<string, unknown>, stringFields: string[], arrayFields: string[] = []): Record<string, unknown> {
    const normalized = { ...input };

    for (const field of stringFields) {
      const value = normalized[field];
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (trimmed === '') delete normalized[field];
      else normalized[field] = trimmed;
    }

    for (const field of arrayFields) {
      const value = normalized[field];
      if (!Array.isArray(value)) continue;
      normalized[field] = value
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item): item is string => typeof item === 'string' && item !== '');
    }

    return normalized;
  }

  private async getAllExecutionBugs(executionId: number): Promise<ZentaoBug[]> {
    const pageSize = 100;
    return fetchAllPages<ZentaoBug>({
      pageSize,
      fetchPage: async (page) => {
        const response = await this.getExecutionBugs(executionId, { page, limit: pageSize }) as { items?: ZentaoBug[]; total?: number };
        return { items: response.items ?? [], total: response.total };
      },
    });
  }

  private async getAllExecutionTasks(executionId: number): Promise<ZentaoTask[]> {
    const pageSize = 100;
    return fetchAllPages<ZentaoTask>({
      pageSize,
      fetchPage: async (page) => {
        const response = await this.http.request<ZentaoListResponse<ZentaoTask> & { tasks?: ZentaoTask[] }>('GET', `/executions/${executionId}/tasks`, {
          params: { page, limit: pageSize },
        });
        return { items: response.tasks ?? [], total: response.total };
      },
    });
  }

  private buildParticipantBugStats(bugs: ZentaoBug[], total: number, devNotResolvedToday: ZentaoBug[], userNames: Map<string, string>): ParticipantBugStats[] {
    const grouped = new Map<string, ZentaoBug[]>();
    for (const bug of bugs) {
      const owner = this.getBugOwner(bug);
      grouped.set(owner, [...(grouped.get(owner) ?? []), bug]);
    }

    return [...grouped.entries()]
      .map(([owner, items]) => {
        const reopened = items.filter(bug => Number(bug.activatedCount ?? 0) > 0).length;
        const notResolved = devNotResolvedToday.filter(bug => this.getBugOwner(bug) === owner).length;
        const ownerName = userNames.get(owner) ?? owner;
        return {
          owner,
          ownerName,
          displayName: ownerName,
          total: items.length,
          totalRate: this.percent(items.length, total),
          reopened,
          reopenedRate: this.percent(reopened, items.length),
          devNotResolvedToday: notResolved,
        };
      })
      .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName));
  }

  private getBugOwner(bug: ZentaoBug): string {
    return this.toString(bug.resolvedBy) || this.toString(bug.assignedTo) || this.toString(bug.openedBy) || '未分配';
  }

  private isDelayedBug(bug: ZentaoBug): boolean {
    const status = this.toString(bug.status).toLowerCase();
    const resolution = this.toString(bug.resolution).toLowerCase();
    return status === 'postponed' || ['postponed', 'delay', 'delayed'].includes(resolution);
  }

  private async resolveUserNames(accounts: string[]): Promise<Map<string, string>> {
    const uniqueAccounts = [...new Set(accounts.filter(account => account && account !== '未分配'))];
    const entries = await Promise.allSettled(uniqueAccounts.map(async account => {
      const user = await this.http.request('GET', `/users/${encodeURIComponent(account)}`) as Record<string, unknown>;
      return [account, this.toString(user.realname) || this.toString(user.account) || account] as const;
    }));

    const names = new Map<string, string>();
    for (const entry of entries) {
      if (entry.status === 'fulfilled') names.set(entry.value[0], entry.value[1]);
    }
    return names;
  }

  private buildDailyBugNotes(reopened: number, total: number, highReopenParticipants: string[]): string[] {
    const notes: string[] = [];
    if (total > 0 && reopened / total > 0.1) {
      notes.push(`迭代reopen率已超限，请迭代同学注意！另外，亲爱的小伙伴，你们也要注意bug修复的质量咯(${highReopenParticipants.join('，')})`);
    }
    return notes;
  }

  private buildSeveritySummary(bugs: ZentaoBug[]): SeveritySummary[] {
    const grouped = new Map<string, number>();
    for (const bug of bugs) {
      const severity = this.toString(bug.severity) || '未知';
      grouped.set(severity, (grouped.get(severity) ?? 0) + 1);
    }
    return [...grouped.entries()]
      .map(([severity, count]) => ({ severity, count, rate: this.percent(count, bugs.length) }))
      .sort((a, b) => Number(a.severity) - Number(b.severity));
  }

  private buildTaskSummary(tasks: ZentaoTask[], date: string): TaskSummary {
    const done = tasks.filter(task => ['done', 'closed'].includes(this.toString(task.status)));
    const doing = tasks.filter(task => this.toString(task.status) === 'doing');
    const wait = tasks.filter(task => this.toString(task.status) === 'wait');
    const canceled = tasks.filter(task => ['cancel', 'cancelled'].includes(this.toString(task.status)));
    const finishedToday = tasks.filter(task => toDateOnly(task.finishedDate) === date);
    const overdueUnfinished = tasks.filter(task => this.isOverdueUnfinishedTask(task, date));
    const fromBug = tasks.filter(task => Number(task.fromBug ?? 0) > 0);
    const consumed = tasks.reduce((sum, task) => sum + Number(task.consumed ?? 0), 0);
    const estimate = tasks.reduce((sum, task) => sum + Number(task.estimate ?? 0), 0);

    return {
      total: tasks.length,
      done: done.length,
      doing: doing.length,
      wait: wait.length,
      canceled: canceled.length,
      finishedToday: finishedToday.length,
      overdueUnfinished: overdueUnfinished.length,
      fromBug: fromBug.length,
      consumed,
      estimate,
      participants: this.buildTaskParticipantStats(tasks, date),
    };
  }

  private buildTaskParticipantStats(tasks: ZentaoTask[], date: string): TaskParticipantStats[] {
    const grouped = new Map<string, ZentaoTask[]>();
    for (const task of tasks) {
      const owner = this.getTaskOwner(task);
      grouped.set(owner, [...(grouped.get(owner) ?? []), task]);
    }

    return [...grouped.entries()]
      .map(([owner, items]) => ({
        owner,
        total: items.length,
        done: items.filter(task => ['done', 'closed'].includes(this.toString(task.status))).length,
        doing: items.filter(task => this.toString(task.status) === 'doing').length,
        wait: items.filter(task => this.toString(task.status) === 'wait').length,
        finishedToday: items.filter(task => toDateOnly(task.finishedDate) === date).length,
        overdueUnfinished: items.filter(task => this.isOverdueUnfinishedTask(task, date)).length,
      }))
      .sort((a, b) => b.total - a.total || a.owner.localeCompare(b.owner));
  }

  private buildTaskDetails(tasks: ZentaoTask[]): DailyTaskDetail[] {
    return tasks.map(task => ({
      id: Number(task.id),
      name: this.toString(task.name),
      status: this.toString(task.status),
      owner: this.getTaskOwner(task),
      deadline: toDateOnly(task.deadline),
      finishedDate: toDateOnly(task.finishedDate),
      consumed: Number(task.consumed ?? 0),
      estimate: Number(task.estimate ?? 0),
      fromBug: Number(task.fromBug ?? 0),
    }));
  }

  private getTaskOwner(task: ZentaoTask): string {
    return this.toString(task.finishedBy) || this.toString(task.assignedTo) || this.toString(task.openedBy) || '未分配';
  }

  private isOverdueUnfinishedTask(task: ZentaoTask, date: string): boolean {
    const status = this.toString(task.status);
    const deadline = toDateOnly(task.deadline);
    return !!deadline && deadline <= date && !['done', 'closed', 'cancel', 'cancelled'].includes(status);
  }

  private buildBugDetails(bugs: ZentaoBug[], userNames: Map<string, string>): DailyBugDetail[] {
    return bugs.map(bug => {
      const owner = this.getBugOwner(bug);
      return {
        id: Number(bug.id),
        title: this.toString(bug.title),
        status: this.toString(bug.status),
        statusName: this.toString(bug.statusName),
        severity: this.toString(bug.severity),
        pri: this.toString(bug.pri),
        owner,
        ownerName: userNames.get(owner) ?? owner,
        openedDate: toDateOnly(bug.openedDate),
        resolvedDate: toDateOnly(bug.resolvedDate),
        activatedCount: Number(bug.activatedCount ?? 0),
        activatedDate: toDateOnly(bug.activatedDate),
        resolution: this.toString(bug.resolution),
      };
    });
  }

  private formatDailyBugStatsReport(result: DailyBugStatsResult): string {
    const severityText = result.severitySummary.map(item => `S${item.severity}:${item.count}(${item.rate})`).join('，') || '无';
    const lines = [
      `${result.iterationName}：`,
      '一、摘要',
      `总bug：${result.total}，延期处理：${result.delayed}，reopen：${this.formatCountWithRateOrZero(result.reopened, result.reopenedRate)}`,
      `已关闭: ${result.closed}，已解决: ${result.resolved}，未解决: ${result.unresolved}`,
      `测试未及时关闭Bug：${result.testerNotClosed}`,
      `开发今日未及时解决bug：${result.devNotResolvedToday}`,
      `严重程度分布：${severityText}`,
      '',
      '任务统计：',
      `总任务：${result.taskSummary.total}，已完成/关闭：${result.taskSummary.done}，进行中：${result.taskSummary.doing}，未开始：${result.taskSummary.wait}，已取消：${result.taskSummary.canceled}`,
      `今日完成任务：${result.taskSummary.finishedToday}，逾期未完成任务：${result.taskSummary.overdueUnfinished}，Bug转任务：${result.taskSummary.fromBug}`,
      `任务工时：预计 ${result.taskSummary.estimate}h，已消耗 ${result.taskSummary.consumed}h`,
      '',
      '二、参与人员bug情况',
      ...result.participants.map(item => `${item.displayName}：负责bug：${this.formatCountWithRate(item.total, item.totalRate)}，reopen：${item.reopened ? this.formatCountWithRate(item.reopened, item.reopenedRate) : '无'}，今日未及时解决bug：${item.devNotResolvedToday || '无'}。${item.devNotResolvedToday ? '需关注未解决项。' : '暂无阻塞。'}`),
      '',
      '参与人员任务情况',
      ...result.taskSummary.participants.map(item => `${item.owner}：总任务：${item.total}，完成/关闭：${item.done}，进行中：${item.doing}，未开始：${item.wait}，今日完成：${item.finishedToday}，逾期未完成：${item.overdueUnfinished}`),
      '',
      '三、问题明细',
      this.formatBugDetailSection('reopen Bug', result.details.reopened),
      this.formatBugDetailSection('延期处理 Bug', result.details.delayed),
      this.formatBugDetailSection('测试未及时关闭 Bug', result.details.testerNotClosed),
      this.formatBugDetailSection('开发今日未及时解决 Bug', result.details.devNotResolvedToday),
      this.formatTaskDetailSection('今日完成任务', result.details.taskFinishedToday),
      this.formatTaskDetailSection('逾期未完成任务', result.details.taskOverdueUnfinished),
      this.formatTaskDetailSection('Bug 转任务', result.details.taskFromBug),
      '',
      '四、统计口径',
      '1. reopen：activatedCount > 0，当前无法区分是否为本日/本迭代内 reopen。',
      '2. 延期处理：status=postponed 或 resolution=postponed/delay/delayed。',
      '3. 测试未及时关闭：resolvedDate 早于统计日，且当前状态仍为 resolved。',
      '4. 开发今日未及时解决：统计日当天仍非 resolved/closed，且 openedDate 不晚于统计日。',
      '5. 负责人：优先 resolvedBy，其次 assignedTo，再次 openedBy；展示名会通过 /users/{account} 转中文姓名。',
      '6. 任务完成：任务状态为 done/closed；今日完成任务按 finishedDate 等于统计日计算。',
      '7. 逾期未完成任务：deadline 不晚于统计日，且状态不是 done/closed/cancel。',
      '8. Bug 转任务：任务 fromBug > 0；如果同一 Bug 同时出现在 Bug 和任务中，分析时应按同一事项合并看待。',
    ];

    if (result.notes.length > 0) {
      lines.push('', 'NOTE：', ...result.notes.map((note, index) => `${index + 1}. ${note}`));
    }

    return lines.join('\n');
  }

  private formatBugDetailSection(title: string, bugs: DailyBugDetail[]): string {
    if (bugs.length === 0) return `${title}：无`;
    const lines = [`${title}：${bugs.length} 个`];
    for (const bug of bugs.slice(0, 10)) {
      lines.push(`- #${bug.id} ${bug.title}（负责人：${bug.ownerName}，状态：${bug.statusName || bug.status}，S${bug.severity}/P${bug.pri}）`);
    }
    if (bugs.length > 10) lines.push(`- 还有 ${bugs.length - 10} 个未展开`);
    return lines.join('\n');
  }

  private formatTaskDetailSection(title: string, tasks: DailyTaskDetail[]): string {
    if (tasks.length === 0) return `${title}：无`;
    const lines = [`${title}：${tasks.length} 个`];
    for (const task of tasks.slice(0, 10)) {
      const fromBug = task.fromBug > 0 ? `，来源Bug：#${task.fromBug}` : '';
      lines.push(`- #${task.id} ${task.name}（负责人：${task.owner}，状态：${task.status}，截止：${task.deadline ?? '无'}${fromBug}）`);
    }
    if (tasks.length > 10) lines.push(`- 还有 ${tasks.length - 10} 个未展开`);
    return lines.join('\n');
  }

  private formatCountWithRate(count: number, rate: string): string {
    return count > 0 ? `${count}(${rate})` : '无';
  }

  private formatCountWithRateOrZero(count: number, rate: string): string {
    return count > 0 ? `${count}(${rate})` : '0';
  }

  private percent(count: number, total: number): string {
    if (total <= 0) return '0%';
    const value = (count / total) * 100;
    return `${Number(value.toFixed(2))}%`;
  }

  private resolveStatsDate(value?: string): string {
    const text = normalizeOptionalText(value);
    const lowerText = text?.toLowerCase();
    if (!text || ['today', '今天', '今日'].includes(lowerText ?? text)) return formatDate(new Date());
    if (['yesterday', '昨天', '昨日'].includes(lowerText ?? text)) return formatDate(addDays(new Date(), -1));
    const parsed = text.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
    if (!parsed) throw new Error(`无法解析统计日期: ${value}`);
    const date = makeCalendarDate(Number(parsed[1]), Number(parsed[2]), Number(parsed[3]));
    if (!date) throw new Error(`无法解析统计日期: ${value}`);
    return formatDate(date);
  }

  async confirmStoryChange(executionId: number): Promise<unknown> {
    void executionId;
    throw new Error('禅道 18.5 不支持 execution/confirmStoryChange');
  }

  async computeCfd(executionId: number): Promise<unknown> {
    /**
     * 禅道 18.5 execution::computeCFD($reload='no', $executionID=0) 接收 executionID。
     * 走 `computeCFD-yes-${executionID}.json` 触发刷新并 js::reload。
     */
    return this.http.legacyRequest('POST', `/execution-computeCFD-yes-${executionId}.json`, {
      data: toFormUrlEncoded({}),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async linkStoriesToExecution(input: { executionId: number; storyIds: number[]; productId?: number; branch?: number }): Promise<unknown> {
    if (!Array.isArray(input.storyIds) || input.storyIds.length === 0) {
      throw new Error('storyIds 至少需要 1 项');
    }
    /**
     * 禅道 18.5 execution::linkStory 模型读 `products[storyID]` 给每条 story 关联 product。
     * 单 productId 输入时，编码为每条 story 的 products[storyId] = productId。
     */
    const params = new URLSearchParams();
    for (const storyId of input.storyIds) params.append('stories[]', String(storyId));
    if (input.productId !== undefined) {
      for (const storyId of input.storyIds) {
        params.append(`products[${storyId}]`, String(input.productId));
      }
    }
    if (input.branch !== undefined) params.append('branch', String(input.branch));
    return this.http.legacyRequest('POST', `/execution-linkStory-${input.executionId}.json`, {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkStoryFromExecution(executionId: number, storyId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/execution-unlinkStory-${executionId}-${storyId}-yes.json`);
  }

  async batchUnlinkStoriesFromExecution(input: { executionId: number; storyIds: number[] }): Promise<unknown> {
    if (!Array.isArray(input.storyIds) || input.storyIds.length === 0) {
      throw new Error('storyIds 至少需要 1 项');
    }
    return this.http.legacyRequest('POST', `/execution-batchUnlinkStory-${input.executionId}.json`, {
      data: toFormUrlEncoded({ storyIdList: input.storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeExecutionStatus(input: { executionIds: number[]; status: string; projectId?: number }): Promise<unknown> {
    if (!Array.isArray(input.executionIds) || input.executionIds.length === 0) {
      throw new Error('executionIds 至少需要 1 项');
    }
    const status = this.normalizeOptionalText(input.status);
    if (!status) throw new Error('status 不能为空');
    const formData: Record<string, unknown> = { executionIdList: input.executionIds };
    /**
     * 禅道 18.5 execution::batchChangeStatus($status, $projectID=0) 第一段位是 status。
     * PATH_INFO 必传，formData 中也带 status 兼容 GET 重定向。
     */
    return this.http.legacyRequest('POST', `/execution-batchChangeStatus-${status}-${input.projectId ?? 0}.json`, {
      data: toFormUrlEncoded({ ...formData, status }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkMemberFromExecution(executionId: number, userId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/execution-unlinkMember-${executionId}-${userId}-yes.json`);
  }

  async deleteExecution(executionId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/execution-delete-${executionId}-yes.json`);
  }

  async storyEstimate(input: { executionId: number; storyId: number; accounts: string[]; estimates: number[]; average: number; round?: number }): Promise<unknown> {
    if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
      throw new Error('accounts 至少需要 1 项');
    }
    if (!Array.isArray(input.estimates) || input.estimates.length !== input.accounts.length) {
      throw new Error('estimates 必须与 accounts 等长');
    }
    if (typeof input.average !== 'number' || Number.isNaN(input.average)) {
      throw new Error('average 必须是数字');
    }
    const round = input.round ?? 0;
    /**
     * 禅道 18.5 story::saveEstimateInfo 读 `account[]` + `estimate[]` + `average`。
     * 使用 URLSearchParams 直接编码数组下标对齐 PHP $_POST。
     */
    const params = new URLSearchParams();
    for (const account of input.accounts) params.append('account[]', account);
    for (const estimate of input.estimates) params.append('estimate[]', String(estimate));
    params.append('average', String(input.average));
    return this.http.legacyRequest('POST', `/execution-storyEstimate-${input.executionId}-${input.storyId}-${round}.json`, {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async manageMembers(executionId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/execution-manageMembers-${executionId}.json`);
  }

  async addMember(input: { executionId: number; accounts: string[]; roles?: string[]; hours?: string[]; days?: string[]; limited?: string[]; realnames?: string[] }): Promise<unknown> {
    if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
      throw new Error('accounts 至少需要 1 项');
    }
    /**
     * 禅道 18.5 execution::addMember 控制器不存在。
     * 真实写入走 execution::manageMembers 模型，POST 字段是数组下标对齐 PHP $_POST：
     * accounts[] / roles[] / days[] / hours[] / limited[]（按 accounts 下标一一对应）。
     */
    const params = new URLSearchParams();
    for (const account of input.accounts) params.append('accounts[]', account);
    for (const role of input.roles ?? []) params.append('roles[]', role);
    for (const days of input.days ?? []) params.append('days[]', String(days));
    for (const hours of input.hours ?? []) params.append('hours[]', String(hours));
    for (const limited of input.limited ?? []) params.append('limited[]', limited);
    for (const realname of input.realnames ?? []) params.append('realnames[]', realname);
    return this.http.legacyRequest('POST', `/execution-manageMembers-${input.executionId}.json`, {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkBugFromExecution(_executionId: number, _bugId: number): Promise<unknown> {
    /**
     * 禅道 18.5 execution 模块无 unlinkBug 控制器，Bug 解绑通过 task::unlinkBug 或直接编辑 Bug 实现。
     * 为避免假成功，API 层显式不支持。
     */
    throw new Error('禅道 18.5 execution 模块无 unlinkBug 控制器');
  }

  async executionStoryTasks(_executionId: number, _storyId: number): Promise<unknown> {
    /**
     * 禅道 18.5 execution 模块无 storyTasks 控制器。
     * 需求下的任务列表走 `/executions/{id}/tasks?story={storyId}`。
     */
    throw new Error('禅道 18.5 execution 模块无 storyTasks 控制器，请使用 /executions/{id}/tasks?story=...');
  }

  async executionStoryKanban(executionId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/execution-storyKanban-${executionId}.json`);
  }

  async executionAll(input: { status?: string; orderBy?: string; limit?: number; productId?: number }): Promise<unknown> {
    const params = new URLSearchParams();
    const status = this.normalizeOptionalText(input.status) ?? 'undone';
    const orderBy = this.normalizeOptionalText(input.orderBy) ?? 'order_asc';
    params.set('status', status);
    params.set('orderBy', orderBy);
    if (input.productId !== undefined) params.set('productID', String(input.productId));
    if (input.limit !== undefined) params.set('recPerPage', String(input.limit));
    /**
     * 禅道 18.5 execution::all($status='undone', $orderBy='order_asc', $productID=0, ...) 路径不带 executionId。
     * 之前把 executionId 拼到 $status 段位会污染 status；改走 query 参数对齐 PHP 控制器签名。
     */
    return this.http.legacyRequest('GET', `/execution-all.json?${params.toString()}`);
  }

  async executionTrack(_executionId: number): Promise<unknown> {
    /**
     * 禅道 18.5 execution 模块无 track 控制器。
     * 执行相关的燃尽图 / 进度信息请通过 execution 详情或 task/story 维度动态拉取。
     */
    throw new Error('禅道 18.5 execution 模块无 track 控制器');
  }

  async importBugToExecution(input: { executionId: number; bugs: Array<{ bugId: number; pri: number; estimate: number; estStarted?: string; deadline?: string; assignedTo?: string }> }): Promise<unknown> {
    if (!Array.isArray(input.bugs) || input.bugs.length === 0) {
      throw new Error('bugs 至少需要 1 项');
    }
    /**
     * 禅道 18.5 execution::importBug 模型读 `import[bugID]` / `pri[bugID]` / `estimate[bugID]` /
     * `estStarted[bugID]` / `deadline[bugID]` / `assignedTo[bugID]`。
     * 没有 product/branch/keywords 这种单值字段，那种语义属于"搜索候选 Bug"而不是导入。
     */
    const params = new URLSearchParams();
    for (const bug of input.bugs) {
      params.append(`import[${bug.bugId}]`, String(bug.bugId));
      params.append(`pri[${bug.bugId}]`, String(bug.pri));
      params.append(`estimate[${bug.bugId}]`, String(bug.estimate));
      if (bug.estStarted) params.append(`estStarted[${bug.bugId}]`, bug.estStarted);
      if (bug.deadline) params.append(`deadline[${bug.bugId}]`, bug.deadline);
      if (bug.assignedTo) params.append(`assignedTo[${bug.bugId}]`, bug.assignedTo);
    }
    return this.http.legacyRequest('POST', `/execution-importBug-${input.executionId}.json`, {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async computeBurn(executionId: number): Promise<unknown> {
    void executionId;
    throw new Error('禅道 18.5 execution/computeBurn 不接收 executionId，CLI 无法安全指定执行上下文');
  }

  async computeExecutionBurn(_executionId: number, _date?: string): Promise<unknown> {
    /**
     * 禅道 18.5 execution::computeBurn($reload='no') 不接收 executionID。
     * CLI 无法通过 URL 安全指定要重算的执行上下文，与 computeBurn 一样显式不支持。
     */
    throw new Error('禅道 18.5 execution/computeBurn 不接收 executionId，CLI 无法安全指定执行上下文');
  }

  async confirmExecutionStoryChange(input: { executionId: number; storyId: number; status: string; comment?: string }): Promise<unknown> {
    void input;
    throw new Error('禅道 18.5 不支持 execution/confirmStoryChange，请使用 task/testcase 对应的 confirmStoryChange 能力');
  }

  async linkBugToExecution(_executionId: number, _bugId: number, _productId?: number): Promise<unknown> {
    /**
     * 禅道 18.5 execution 模块无 linkBug 控制器，Bug 关联到执行通过 importBug 或 convertBugToTask 实现。
     * 为避免假成功，API 层显式不支持。
     */
    throw new Error('禅道 18.5 execution 模块无 linkBug 控制器');
  }

  async linkStoryToExecutionSingle(executionId: number, storyId: number, productId?: number, branch?: number): Promise<unknown> {
    /**
     * 禅道 18.5 execution::linkStory 模型读 `products[storyID]`，没有 `/execution-linkStory-{id}-{story}.json` 这种路径。
     * 与 linkStoriesToExecution 复用同一条控制器，提交 stories[]=storyId 与 products[storyId]=productId。
     */
    const params = new URLSearchParams();
    params.append('stories[]', String(storyId));
    if (productId !== undefined) {
      params.append(`products[${storyId}]`, String(productId));
    }
    if (branch !== undefined) params.append('branch', String(branch));
    return this.http.legacyRequest('POST', `/execution-linkStory-${executionId}.json`, {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchImportBugsToExecution(_input: { executionId: number; bugIds: number[]; productId?: number }): Promise<unknown> {
    /**
     * 禅道 18.5 execution 模块无 batchImportBug 控制器。
     * 批量导入 Bug 通过 importBug 控制器按行提交（import[bugID] 数组），见 importBugToExecution。
     * 为避免假成功，API 层显式不支持。
     */
    throw new Error('禅道 18.5 execution 模块无 batchImportBug 控制器，请使用 importBugToExecution');
  }

  async addWhitelist(_input: { executionId: number; deptId?: number; copyId?: number; accounts: string[] }): Promise<unknown> {
    /**
     * 禅道 18.5 execution::addWhitelist 只 fetch personnel::addWhitelist 页面，
     * 真实写入在 personnel::addWhitelist（objectType=sprint），CLI 难以安全拼出 objectID/dept/copyID/module 段位。
     * 为避免假成功，API 层显式不支持。
     */
    throw new Error('禅道 18.5 execution/addWhitelist 不接收 POST，请使用 personnel/addWhitelist 流程');
  }

  async unbindWhitelist(id: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/execution-unbindWhitelist-${id}-yes.json`);
  }

  async fixFirst(input: { executionId: number; estimate: number; withLeft?: 'yes' | 'no' }): Promise<unknown> {
    /**
     * 禅道 18.5 execution::fixFirst 模型在空 body 下 `is_numeric($data->estimate)` 校验失败。
     * estimate 是必填数字；withLeft=yes 时用 estimate 覆盖 left，否则保留原 burn.left。
     */
    if (typeof input.estimate !== 'number' || Number.isNaN(input.estimate)) {
      throw new Error('estimate 必须是数字');
    }
    const formData: Record<string, unknown> = { estimate: input.estimate };
    if (input.withLeft) formData.withLeft = input.withLeft;
    return this.http.legacyRequest('POST', `/execution-fixFirst-${input.executionId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async updateOrder(input: { executionIds: number[]; orderBy: string }): Promise<unknown> {
    if (!Array.isArray(input.executionIds) || input.executionIds.length === 0) {
      throw new Error('executionIds 至少需要 1 项');
    }
    const orderBy = this.normalizeOptionalText(input.orderBy) ?? 'order_asc';
    /**
     * 禅道 18.5 execution::updateOrder 控制器读 `executions` 逗号字符串与 `orderBy`。
     * 不是 `id/order` 数组下标。
     */
    const formData: Record<string, unknown> = {
      executions: input.executionIds.join(','),
      orderBy,
    };
    return this.http.legacyRequest('POST', `/execution-updateOrder.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async storySort(input: { executionId: number; storyIds: number[]; orderBy: string }): Promise<unknown> {
    if (!Array.isArray(input.storyIds) || input.storyIds.length === 0) {
      throw new Error('storyIds 至少需要 1 项');
    }
    const orderBy = this.normalizeOptionalText(input.orderBy) ?? 'order_asc';
    /**
     * 禅道 18.5 execution::storySort 控制器读 `storys` 逗号字符串与 `orderBy`。
     * 不是 `id/order` 数组下标。
     */
    const formData: Record<string, unknown> = {
      storys: input.storyIds.join(','),
      orderBy,
    };
    return this.http.legacyRequest('POST', `/execution-storySort-${input.executionId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private toString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;
      if (typeof record.realname === 'string') return record.realname;
      if (typeof record.account === 'string') return record.account;
      if (typeof record.name === 'string') return record.name;
    }
    return '';
  }
}

interface ParticipantBugStats {
  owner: string;
  ownerName: string;
  displayName: string;
  total: number;
  totalRate: string;
  reopened: number;
  reopenedRate: string;
  devNotResolvedToday: number;
}

interface SeveritySummary {
  severity: string;
  count: number;
  rate: string;
}

interface DailyBugDetail {
  id: number;
  title: string;
  status: string;
  statusName: string;
  severity: string;
  pri: string;
  owner: string;
  ownerName: string;
  openedDate?: string;
  resolvedDate?: string;
  activatedCount: number;
  activatedDate?: string;
  resolution: string;
}

interface TaskSummary {
  total: number;
  done: number;
  doing: number;
  wait: number;
  canceled: number;
  finishedToday: number;
  overdueUnfinished: number;
  fromBug: number;
  consumed: number;
  estimate: number;
  participants: TaskParticipantStats[];
}

interface TaskParticipantStats {
  owner: string;
  total: number;
  done: number;
  doing: number;
  wait: number;
  finishedToday: number;
  overdueUnfinished: number;
}

interface DailyTaskDetail {
  id: number;
  name: string;
  status: string;
  owner: string;
  deadline?: string;
  finishedDate?: string;
  consumed: number;
  estimate: number;
  fromBug: number;
}

interface DailyBugStatsResult {
  iterationName: string;
  total: number;
  delayed: number;
  reopened: number;
  reopenedRate: string;
  closed: number;
  resolved: number;
  unresolved: number;
  testerNotClosed: number;
  devNotResolvedToday: number;
  participants: ParticipantBugStats[];
  taskSummary: TaskSummary;
  severitySummary: SeveritySummary[];
  details: {
    reopened: DailyBugDetail[];
    delayed: DailyBugDetail[];
    testerNotClosed: DailyBugDetail[];
    devNotResolvedToday: DailyBugDetail[];
    taskFinishedToday: DailyTaskDetail[];
    taskOverdueUnfinished: DailyTaskDetail[];
    taskFromBug: DailyTaskDetail[];
  };
  notes: string[];
}

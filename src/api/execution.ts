import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination } from '../core/pagination.js';
import type { ZentaoBug, ZentaoExecution, ZentaoListResponse, ZentaoTask } from '../types/zentao.js';

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

  async getExecutionBugs(executionId: number, params: { page?: number; limit?: number; status?: string } = {}): Promise<unknown> {
    const pagination = normalizePagination(params);
    const response = await this.http.request<ZentaoListResponse<ZentaoBug> & { bugs?: ZentaoBug[] }>('GET', `/executions/${executionId}/bugs`, {
      params: {
        ...pagination,
        status: params.status,
      },
    });
    return toServerListResult(response, ['bugs'], params);
  }

  async getExecutionDailyBugStats(executionId: number, input: ExecutionDailyBugStatsInput = {}): Promise<unknown> {
    const bugs = await this.getAllExecutionBugs(executionId);
    const tasks = await this.getAllExecutionTasks(executionId);
    const date = this.resolveStatsDate(input.date);
    const total = bugs.length;
    const reopened = bugs.filter(bug => Number(bug.activatedCount ?? 0) > 0);
    const delayed = bugs.filter(bug => this.isDelayedBug(bug));
    const closed = bugs.filter(bug => this.toString(bug.status) === 'closed');
    const resolved = bugs.filter(bug => this.toString(bug.status) === 'resolved');
    const unresolved = bugs.filter(bug => !['closed', 'resolved'].includes(this.toString(bug.status)));
    const testerNotClosed = resolved.filter(bug => this.isOnOrBefore(this.toDateOnly(bug.resolvedDate), this.formatDate(this.addDays(this.parseDate(date), -1))));
    const devNotResolvedToday = unresolved.filter(bug => this.isOnOrBefore(this.toDateOnly(bug.openedDate), date));
    const userNames = await this.resolveUserNames(bugs.map(bug => this.getBugOwner(bug)));
    const participants = this.buildParticipantBugStats(bugs, total, devNotResolvedToday, userNames);
    const highReopenParticipants = participants.filter(item => item.reopened > 0).map(item => item.displayName);
    const iterationName = input.iterationName ?? `执行 #${executionId}`;

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
        taskFinishedToday: this.buildTaskDetails(tasks.filter(task => this.toDateOnly(task.finishedDate) === date)),
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
    return this.http.request('PUT', `/executions/${executionId}`, { data: update });
  }

  async startExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/start`, { data: payload });
  }

  async closeExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/close`, { data: payload });
  }

  async suspendExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/suspend`, { data: payload });
  }

  async activateExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/activate`, { data: payload });
  }

  async putoffExecution(executionId: number, payload: PutoffExecutionInput): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/putoff`, { data: payload });
  }

  private async getAllExecutionBugs(executionId: number): Promise<ZentaoBug[]> {
    const limit = 100;
    const firstPage = await this.getExecutionBugs(executionId, { page: 1, limit }) as { items?: ZentaoBug[]; total?: number };
    const bugs = [...(firstPage.items ?? [])];
    const totalPages = Math.ceil((firstPage.total ?? bugs.length) / limit);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.getExecutionBugs(executionId, { page, limit }) as { items?: ZentaoBug[] };
      bugs.push(...(response.items ?? []));
    }

    return bugs;
  }

  private async getAllExecutionTasks(executionId: number): Promise<ZentaoTask[]> {
    const limit = 100;
    const firstPage = await this.http.request<ZentaoListResponse<ZentaoTask> & { tasks?: ZentaoTask[] }>('GET', `/executions/${executionId}/tasks`, {
      params: { page: 1, limit },
    });
    const tasks = [...(firstPage.tasks ?? [])];
    const totalPages = Math.ceil((firstPage.total ?? tasks.length) / limit);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.http.request<ZentaoListResponse<ZentaoTask> & { tasks?: ZentaoTask[] }>('GET', `/executions/${executionId}/tasks`, {
        params: { page, limit },
      });
      tasks.push(...(response.tasks ?? []));
    }

    return tasks;
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
    const finishedToday = tasks.filter(task => this.toDateOnly(task.finishedDate) === date);
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
        finishedToday: items.filter(task => this.toDateOnly(task.finishedDate) === date).length,
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
      deadline: this.toDateOnly(task.deadline),
      finishedDate: this.toDateOnly(task.finishedDate),
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
    const deadline = this.toDateOnly(task.deadline);
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
        openedDate: this.toDateOnly(bug.openedDate),
        resolvedDate: this.toDateOnly(bug.resolvedDate),
        activatedCount: Number(bug.activatedCount ?? 0),
        activatedDate: this.toDateOnly(bug.activatedDate),
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
    if (!value || ['today', '今天', '今日'].includes(value)) return this.formatDate(new Date());
    if (['yesterday', '昨天', '昨日'].includes(value)) return this.formatDate(this.addDays(new Date(), -1));
    const parsed = value.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
    if (!parsed) throw new Error(`无法解析统计日期: ${value}`);
    return this.formatDate(new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3])));
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toDateOnly(value: unknown): string | undefined {
    const text = this.toString(value);
    return text ? text.slice(0, 10) : undefined;
  }

  private isOnOrBefore(date: string | undefined, target: string): boolean {
    return !!date && date <= target;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

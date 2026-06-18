import type { BugApi } from './bug.js';
import type { TaskApi } from './task.js';
import type { ListResult } from '../core/list-result.js';
import type { ZentaoHttpClient } from '../core/http.js';
import { fetchAllPages } from '../core/pagination.js';
import type { ZentaoBug, ZentaoTask } from '../types/zentao.js';
import { addDays, formatDate, isInDateRange, normalizeOptionalText, parseCalendarDate, requireNonBlank, startOfDay } from '../utils/date.js';

function countBy<T>(items: T[], getter: (item: T) => string | number | undefined): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getter(item);
    if (key === undefined || key === '') return acc;
    const normalized = String(key);
    acc[normalized] = (acc[normalized] ?? 0) + 1;
    return acc;
  }, {});
}

export class StatisticsApi {
  constructor(
    private readonly taskApi: TaskApi,
    private readonly bugApi: BugApi,
    private readonly http: ZentaoHttpClient,
  ) {}

  async getMyTaskStatistics(): Promise<unknown> {
    const tasks = await this.getAllMyTasks();
    return {
      total: tasks.length,
      partial: false,
      byStatus: countBy(tasks, task => task.status),
      byPriority: countBy(tasks, task => task.pri as number | undefined),
      tasks: this.pickTasks(tasks),
    };
  }

  async getMyBugStatistics(productId?: number): Promise<unknown> {
    const bugs = await this.getAllMyBugs(productId);
    return {
      ...(productId ? { productId } : { scope: 'global-assigntome' }),
      total: bugs.length,
      partial: false,
      byStatus: countBy(bugs, bug => bug.status),
      bySeverity: countBy(bugs, bug => bug.severity as number | undefined),
      bugs: this.pickBugs(bugs),
    };
  }

  async getMyWeeklyActivity(input: ActivityQueryInput): Promise<unknown> {
    const account = requireNonBlank(input.account ?? this.http.username, 'account 不能为空');
    const range = this.resolveActivityRange(input);
    const response = await this.getUserDynamic(account, range.legacyPeriod, range.anchorTimestamp);
    const actions = this.extractActions(response);
    const normalizedActions = actions
      .map(action => this.normalizeAction(action))
      .filter(action => isInDateRange(action.date, range.startDate, range.endDate));
    const bugActions = normalizedActions.filter(action => action.objectType === 'bug');
    const taskActions = normalizedActions.filter(action => action.objectType === 'task');
    const comments = normalizedActions.filter(action => action.action === 'commented' || action.comment);
    const flowActions = normalizedActions.filter(action => this.isFlowAction(action));
    const resolvedBugs = bugActions.filter(action => action.action === 'resolved');
    const closedBugs = bugActions.filter(action => action.action === 'closed');
    const finishedTasks = taskActions.filter(action => ['finished', 'done', 'closed'].includes(action.action));
    const dedupedWorkItems = this.buildDedupedWorkItems(normalizedActions);

    return {
      source: 'legacy-user-dynamic',
      note: '近似读取：调用禅道旧版动态页面 JSON 获取动态原始数据，再按 originalDate/date 在客户端筛选日期范围。若旧版页面权限或 Token 不兼容，需服务端补 REST dynamic 接口。',
      account,
      query: {
        week: input.week ?? 'last',
        dateRange: input.dateRange,
        startDate: input.startDate,
        endDate: input.endDate,
        days: input.days,
      },
      resolvedDateRange: range,
      totalActions: normalizedActions.length,
      summary: {
        resolvedBugs: resolvedBugs.length,
        closedBugs: closedBugs.length,
        taskActions: taskActions.length,
        finishedTasks: finishedTasks.length,
        comments: comments.length,
        flowActions: flowActions.length,
        dedupedWorkItems: dedupedWorkItems.length,
      },
      bug: {
        resolved: this.pickActivityItems(resolvedBugs),
        closed: this.pickActivityItems(closedBugs),
        all: this.pickActivityItems(bugActions),
      },
      task: {
        finished: this.pickActivityItems(finishedTasks),
        all: this.pickActivityItems(taskActions),
      },
      comments: this.pickActivityItems(comments),
      flow: this.pickActivityItems(flowActions),
      daily: this.groupDaily(normalizedActions),
      dedupedWorkItems,
      limitations: [
        `旧版动态页按 ${range.legacyPeriod} 拉取，默认每页 50 条；客户端会再按 ${range.startDate} 到 ${range.endDate} 过滤。`,
        'bug 转任务去重会优先识别 action/detail 中的 fromBug/bug/sourceBug/parent 等字段；如果动态记录里没有来源 Bug 字段，该任务会按 task 独立计数。',
      ],
    };
  }

  private async getAllMyBugs(productId?: number): Promise<ZentaoBug[]> {
    return fetchAllPages<ZentaoBug>({
      fetchPage: (page) => this.bugApi.getMyBugs({ productId, page, limit: 100 }) as Promise<ListResult<ZentaoBug>>,
    });
  }

  private async getAllMyTasks(): Promise<ZentaoTask[]> {
    return fetchAllPages<ZentaoTask>({
      fetchPage: (page) => this.taskApi.getMyTasks({ status: 'all', page, limit: 100 }) as Promise<ListResult<ZentaoTask>>,
    });
  }

  private pickTasks(tasks: ZentaoTask[]): Array<Pick<ZentaoTask, 'id' | 'name' | 'status'>> {
    return tasks.map(task => ({ id: task.id, name: task.name, status: task.status }));
  }

  private pickBugs(bugs: ZentaoBug[]): Array<Pick<ZentaoBug, 'id' | 'title' | 'status'>> {
    return bugs.map(bug => ({ id: bug.id, title: bug.title, status: bug.status }));
  }

  private async getUserDynamic(account: string, period: string, anchorTimestamp?: number): Promise<unknown> {
    const datePart = anchorTimestamp ? String(anchorTimestamp) : '';
    if (account === this.http.username) {
      return this.http.legacyRequest('GET', `/my-dynamic-${period}-0-${datePart}-next-0.json`);
    }

    const user = await this.http.request('GET', `/users/${encodeURIComponent(account)}`);
    const userId = this.findUserId(user);
    if (!userId) throw new Error(`未能从 /users/${account} 响应中解析用户 ID，无法调用 user-dynamic 页面。`);

    return this.http.legacyRequest('GET', `/user-dynamic-${userId}-${period}-0-${datePart}-next.json`);
  }

  private resolveActivityRange(input: ActivityQueryInput): ActivityDateRange {
    const startDateText = normalizeOptionalText(input.startDate);
    const endDateText = normalizeOptionalText(input.endDate);

    if (startDateText || endDateText) {
      const start = startDateText ? parseCalendarDate(startDateText) : undefined;
      const end = endDateText ? parseCalendarDate(endDateText) : undefined;
      if (!start && startDateText) throw new Error(`无法解析开始日期: ${input.startDate}`);
      if (!end && endDateText) throw new Error(`无法解析结束日期: ${input.endDate}`);
      const startDate = formatDate(start ?? end ?? new Date());
      const endDate = formatDate(end ?? start ?? new Date());
      return this.withLegacyAnchor(this.normalizeDateRange({ label: `${startDate}..${endDate}`, startDate, endDate, legacyPeriod: 'all', source: 'explicit-date' }));
    }

    if (input.dateRange) return this.parseNaturalDateRange(input.dateRange);

    if (input.days !== undefined) {
      if (input.days < 1) throw new Error('days 必须大于 0');
      return this.rangeForRecentDays(input.days, `最近${input.days}天`);
    }

    return this.rangeForWeek(input.week ?? 'last');
  }

  private parseNaturalDateRange(text: string): ActivityDateRange {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return this.rangeForWeek('last');

    if (['last', 'lastweek', 'last week', '上周', '上一周'].includes(normalized)) return this.rangeForWeek('last');
    if (['this', 'thisweek', 'this week', '本周', '这周', '这一周'].includes(normalized)) return this.rangeForWeek('this');
    if (['today', '今天', '今日'].includes(normalized)) return this.rangeForPeriodDay('今天', new Date(), 'today');
    if (['yesterday', '昨天', '昨日'].includes(normalized)) return this.rangeForPeriodDay('昨天', addDays(new Date(), -1), 'yesterday');

    const recentDays = normalized.match(/(?:最近|近|last|past)\s*(\d+)\s*(?:天|days?|日)?/);
    if (recentDays) {
      const days = Number(recentDays[1]);
      if (days < 1) throw new Error('dateRange 中的最近天数必须大于 0');
      return this.rangeForRecentDays(days, text);
    }

    const daysAgo = normalized.match(/(\d+)\s*天前/);
    if (daysAgo) return this.rangeForPeriodDay(text, addDays(new Date(), -Number(daysAgo[1])), 'all');

    const rangeParts = text.split(/\s*(?:\.\.|~|至|到|—)\s*/).filter(Boolean);
    if (rangeParts.length === 2) {
      const start = parseCalendarDate(rangeParts[0]);
      const end = parseCalendarDate(rangeParts[1]);
      if (start && end) {
        return this.withLegacyAnchor(this.normalizeDateRange({ label: text, startDate: formatDate(start), endDate: formatDate(end), legacyPeriod: 'all', source: 'natural-range' }));
      }
    }

    const singleDate = parseCalendarDate(text);
    if (singleDate) return this.rangeForPeriodDay(text, singleDate, 'all');

    throw new Error(`无法解析日期描述: ${text}。可用示例：上周、本周、今天、昨天、最近3天、3天前、2026-05-28、2026-05-25到2026-05-29。`);
  }

  private rangeForWeek(week: 'last' | 'this'): ActivityDateRange {
    const today = new Date();
    const day = today.getDay() || 7;
    const thisMonday = startOfDay(addDays(today, 1 - day));
    const start = week === 'this' ? thisMonday : addDays(thisMonday, -7);
    const end = week === 'this' ? addDays(start, 6) : addDays(thisMonday, -1);
    return {
      label: week === 'last' ? '上周' : '本周',
      startDate: formatDate(start),
      endDate: formatDate(end),
      legacyPeriod: week === 'last' ? 'lastWeek' : 'thisWeek',
      source: 'week',
    };
  }

  private rangeForRecentDays(days: number, label: string): ActivityDateRange {
    const end = startOfDay(new Date());
    const start = addDays(end, 1 - days);
    return {
      label,
      startDate: formatDate(start),
      endDate: formatDate(end),
      legacyPeriod: days === 1 ? 'today' : days === 2 ? 'twodaysago' : days === 3 ? 'latest3days' : 'all',
      source: 'recent-days',
    };
  }

  private rangeForPeriodDay(label: string, date: Date, legacyPeriod: string): ActivityDateRange {
    const day = formatDate(date);
    const range = { label, startDate: day, endDate: day, legacyPeriod, source: 'single-day' as const };
    return legacyPeriod === 'all' ? this.withLegacyAnchor(range) : range;
  }

  private withLegacyAnchor(range: ActivityDateRange): ActivityDateRange {
    const end = parseCalendarDate(range.endDate);
    if (!end) return range;
    return { ...range, anchorTimestamp: Math.floor(addDays(end, 1).getTime() / 1000) };
  }

  private normalizeDateRange(range: ActivityDateRange): ActivityDateRange {
    if (range.startDate <= range.endDate) return range;
    return { ...range, startDate: range.endDate, endDate: range.startDate };
  }

  private findUserId(value: unknown): string | undefined {
    const records = this.collectRecords(value);
    for (const record of records) {
      const id = record.id;
      if (typeof id === 'string' || typeof id === 'number') return String(id);
    }
    return undefined;
  }

  private extractActions(value: unknown): Record<string, unknown>[] {
    const parsed = this.parsePossiblyJsonString(value);
    const records = this.collectRecords(parsed);
    const actions = records.filter(record => typeof record.objectType === 'string' && typeof record.action === 'string');
    return actions;
  }

  private parsePossiblyJsonString(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private collectRecords(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) return value.flatMap(item => this.collectRecords(item));
    if (typeof value !== 'object' || value === null) return [];

    const record = value as Record<string, unknown>;
    return [record, ...Object.values(record).flatMap(item => this.collectRecords(this.parsePossiblyJsonString(item)))];
  }

  private normalizeAction(action: Record<string, unknown>): ActivityItem {
    const originalDate = this.asString(action.originalDate) ?? this.asString(action.date) ?? '';
    return {
      id: this.asString(action.id),
      date: originalDate.slice(0, 10),
      time: this.asString(action.time) ?? originalDate.slice(11, 19),
      originalDate,
      actor: this.asString(action.actor) ?? this.asString((action.actor as Record<string, unknown> | undefined)?.account),
      objectType: (this.asString(action.objectType) ?? '').toLowerCase(),
      objectID: this.asString(action.objectID),
      objectName: this.asString(action.objectName),
      action: (this.asString(action.action) ?? '').toLowerCase(),
      actionLabel: this.asString(action.actionLabel),
      objectLabel: this.asString(action.objectLabel),
      comment: this.asString(action.comment),
      relatedBugId: this.findRelatedBugId(action),
    };
  }

  private findRelatedBugId(action: Record<string, unknown>): string | undefined {
    const candidates = ['fromBug', 'bug', 'bugID', 'sourceBug', 'sourceBugID', 'parent'];
    const records = this.collectRecords(action);
    for (const record of records) {
      for (const key of candidates) {
        const value = record[key];
        if (typeof value === 'string' || typeof value === 'number') return String(value);
      }
    }
    return undefined;
  }

  private isFlowAction(action: ActivityItem): boolean {
    return ['assigned', 'resolved', 'closed', 'activated', 'started', 'finished', 'paused', 'canceled', 'cancelled', 'edited'].includes(action.action);
  }

  private pickActivityItems(actions: ActivityItem[]): ActivityOutputItem[] {
    return actions.map(action => ({
      date: action.date,
      time: action.time,
      objectType: action.objectType,
      objectID: action.objectID,
      objectName: action.objectName,
      action: action.action,
      actionLabel: action.actionLabel,
      comment: action.comment,
    }));
  }

  private groupDaily(actions: ActivityItem[]): Record<string, { total: number; items: ActivityOutputItem[] }> {
    return actions.reduce<Record<string, { total: number; items: ActivityOutputItem[] }>>((acc, action) => {
      const date = action.date || 'unknown';
      acc[date] ??= { total: 0, items: [] };
      acc[date].total += 1;
      acc[date].items.push(...this.pickActivityItems([action]));
      return acc;
    }, {});
  }

  private buildDedupedWorkItems(actions: ActivityItem[]): Array<{ key: string; objectType: string; objectID?: string; objectName?: string; actions: number }> {
    const items = new Map<string, { key: string; objectType: string; objectID?: string; objectName?: string; actions: number }>();
    for (const action of actions.filter(item => item.objectType === 'bug' || item.objectType === 'task')) {
      const key = action.objectType === 'task' && action.relatedBugId ? `bug:${action.relatedBugId}` : `${action.objectType}:${action.objectID ?? 'unknown'}`;
      const existing = items.get(key);
      if (existing) {
        existing.actions += 1;
      } else {
        items.set(key, { key, objectType: action.objectType, objectID: action.objectID, objectName: action.objectName, actions: 1 });
      }
    }
    return [...items.values()];
  }

  private asString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return undefined;
  }
}

interface ActivityItem {
  id?: string;
  date: string;
  time?: string;
  originalDate: string;
  actor?: string;
  objectType: string;
  objectID?: string;
  objectName?: string;
  action: string;
  actionLabel?: string;
  objectLabel?: string;
  comment?: string;
  relatedBugId?: string;
}

type ActivityOutputItem = Pick<ActivityItem, 'date' | 'time' | 'objectType' | 'objectID' | 'objectName' | 'action' | 'actionLabel' | 'comment'>;

interface ActivityQueryInput {
  account?: string;
  week?: 'last' | 'this';
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
}

interface ActivityDateRange {
  label: string;
  startDate: string;
  endDate: string;
  legacyPeriod: string;
  anchorTimestamp?: number;
  source: 'week' | 'recent-days' | 'single-day' | 'explicit-date' | 'natural-range';
}

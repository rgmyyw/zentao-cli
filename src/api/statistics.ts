import type { BugApi } from './bug.js';
import type { TaskApi } from './task.js';
import type { ListResult } from '../core/list-result.js';
import type { ZentaoBug, ZentaoTask } from '../types/zentao.js';

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

  private async getAllMyBugs(productId?: number): Promise<ZentaoBug[]> {
    const limit = 100;
    const firstPage = await this.bugApi.getMyBugs({ productId, page: 1, limit }) as ListResult<ZentaoBug>;
    const bugs = [...firstPage.items];
    const total = firstPage.total ?? bugs.length;
    const totalPages = Math.ceil(total / limit);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.bugApi.getMyBugs({ productId, page, limit }) as ListResult<ZentaoBug>;
      bugs.push(...response.items);
    }

    return bugs;
  }

  private async getAllMyTasks(): Promise<ZentaoTask[]> {
    const limit = 100;
    const firstPage = await this.taskApi.getMyTasks({ status: 'all', page: 1, limit }) as ListResult<ZentaoTask>;
    const tasks = [...firstPage.items];
    const totalPages = Math.ceil((firstPage.total ?? tasks.length) / limit);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.taskApi.getMyTasks({ status: 'all', page, limit }) as ListResult<ZentaoTask>;
      tasks.push(...response.items);
    }

    return tasks;
  }

  private pickTasks(tasks: ZentaoTask[]): Array<Pick<ZentaoTask, 'id' | 'name' | 'status'>> {
    return tasks.map(task => ({ id: task.id, name: task.name, status: task.status }));
  }

  private pickBugs(bugs: ZentaoBug[]): Array<Pick<ZentaoBug, 'id' | 'title' | 'status'>> {
    return bugs.map(bug => ({ id: bug.id, title: bug.title, status: bug.status }));
  }
}

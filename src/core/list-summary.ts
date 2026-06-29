/**
 * Agent-First list summary.
 *
 * Goal: make ListResult output "consumable as-is" so the model does not
 * re-aggregate or guess fields. The summary is the "first answer" the
 * agent should reach for; the raw items remain available behind it.
 */

export interface ListSummaryItem {
  id: number | string;
  name?: string;
  /** Secondary sort key (deadline, updatedAt, createdAt, etc.). */
  sortKey?: string;
  /** Optional status snapshot for the highlight row. */
  status?: string;
}

export interface ListSummary {
  total: number;
  byStatus: Record<string, number>;
  /** Top-N items by primary sort key (deadline/updatedAt/createdAt). */
  top: ListSummaryItem[];
  /** One-sentence human/agent-readable conclusion. */
  highlight: string;
  /** Optional grouping when the items carry a categorical dimension. */
  byGroup?: Record<string, number>;
  /** The dimension used to build `byGroup`, e.g. 'product', 'project'. */
  groupKey?: string;
}

/**
 * Generic summarizer that works for any list whose items have an id and
 * optional status/name/{sortKey}/{groupKey} fields. Each project can call
 * this directly or wrap it with project-specific field mapping.
 */
export function summarizeList<
  T extends {
    id: number | string;
    name?: string;
    status?: string;
    deadline?: string;
    updatedAt?: string;
    createdAt?: string;
    productName?: string | number;
    projectName?: string | number;
    product?: string | number;
    project?: string | number;
  },
>(
  items: T[],
  options: { sortKey?: 'deadline' | 'updatedAt' | 'createdAt'; groupKey?: 'product' | 'project' | string; topN?: number } = {},
): ListSummary {
  const sortKey = options.sortKey ?? 'deadline';
  const topN = options.topN ?? 3;
  const groupKey = options.groupKey;

  const byStatus: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  const today = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    const s = item.status ?? 'unknown';
    byStatus[s] = (byStatus[s] ?? 0) + 1;

    if (groupKey) {
      const groupValue = pickGroupValue(item, groupKey);
      if (groupValue) byGroup[groupValue] = (byGroup[groupValue] ?? 0) + 1;
    }
  }

  const sortCandidates = items
    .map((item) => ({ item, sortValue: pickSortValue(item, sortKey) }))
    .filter((entry) => entry.sortValue !== undefined)
    .sort((left, right) => left.sortValue!.localeCompare(right.sortValue!));

  const top: ListSummaryItem[] = sortCandidates.slice(0, topN).map(({ item, sortValue }) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    sortKey: sortValue,
  }));

  const highlight = buildHighlight(items, byStatus, today, sortKey);

  const summary: ListSummary = { total: items.length, byStatus, top, highlight };
  if (groupKey && Object.keys(byGroup).length > 0) {
    summary.byGroup = byGroup;
    summary.groupKey = groupKey;
  }
  return summary;
}

function pickSortValue<
  T extends {
    deadline?: string;
    updatedAt?: string;
    createdAt?: string;
  },
>(item: T, key: 'deadline' | 'updatedAt' | 'createdAt'): string | undefined {
  const value = item[key];
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return value;
}

function pickGroupValue<
  T extends {
    productName?: string | number;
    projectName?: string | number;
    product?: string | number;
    project?: string | number;
  },
>(item: T, key: string): string | undefined {
  const toStringOrUndefined = (value: string | number | undefined): string | undefined => {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim();
    return s === '' ? undefined : s;
  };
  if (key === 'product') return toStringOrUndefined(item.productName ?? item.product);
  if (key === 'project') return toStringOrUndefined(item.projectName ?? item.project);
  // Fall back to dynamic key lookup for callers that map groupKey to a real field.
  const value = (item as Record<string, unknown>)[key];
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function buildHighlight<
  T extends { status?: string; deadline?: string },
>(items: T[], byStatus: Record<string, number>, today: string, sortKey: string): string {
  if (items.length === 0) return '当前无数据，可继续按其它命令补充上下文。';

  const sortedKeys = Object.entries(byStatus).sort((left, right) => right[1] - left[1]);
  const [topStatus, topCount] = sortedKeys[0] ?? [];
  const statusPart = topStatus ? `${topStatus} ${topCount}` : `共 ${items.length} 条`;

  if (sortKey === 'deadline') {
    const dueSoon = items.filter((item) => typeof item.deadline === 'string' && item.deadline <= today);
    if (dueSoon.length > 0) {
      return `共 ${items.length} 条（${statusPart}），其中 ${dueSoon.length} 条已到期或今日截止。`;
    }
  }

  return `共 ${items.length} 条（${statusPart}）。`;
}

/**
 * Marker payload shape. The presence of `__agentFirst: true` tells
 * downstream consumers (CLI, skill) that this output is already
 * processed and must not be re-aggregated.
 */
export interface AgentFirstMarker {
  __agentFirst: true;
  processed: true;
  partial: boolean;
  total: number;
}

export function makeAgentFirstMarker(partial: boolean, total: number): AgentFirstMarker {
  return { __agentFirst: true, processed: true, partial, total };
}

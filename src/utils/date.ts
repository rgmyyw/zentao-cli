/**
 * 通用日期与字符串工具。
 * 主要服务于 ExecutionApi / StatisticsApi 之类需要做本地日期解析、范围判断和
 * 字符串归一化的 API。其余 API 若用到同名语义也可复用。
 */

/** Date -> 'YYYY-MM-DD'（本地时区）。 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** date + days（可负），沿用本地时区，保留时分秒为零后的 0 点行为由调用方决定。 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** date -> 当天 00:00:00.000 本地时区。 */
export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** 任意值 -> 截前 10 字符（兼容 'YYYY-MM-DD HH:mm:ss' 这类时间戳）。 */
export function toDateOnly(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
  return text ? text.slice(0, 10) : undefined;
}

/** 字符串去两端空白，空串视为 undefined。 */
export function normalizeOptionalText(value?: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export { requireNonBlank } from '../core/validation.js';

/** 字符串日期 'YYYY-MM-DD' 范围闭区间判断。空字符串视为不在范围。 */
export function isInDateRange(date: string, startDate: string, endDate: string): boolean {
  if (!date) return false;
  return date >= startDate && date <= endDate;
}

/** date <= target（按 'YYYY-MM-DD' 字符串比较）。 */
export function isOnOrBefore(date: string | undefined, target: string): boolean {
  return !!date && date <= target;
}

/**
 * 解析 YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD / 中文年月日 等多种格式。
 * 返回 Date 一定在本地时区，校验失败的日期（如 2026-02-31）返回 undefined。
 */
export function parseCalendarDate(value: string): Date | undefined {
  const trimmed = value.trim();
  const full = trimmed.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  if (full) return makeCalendarDate(Number(full[1]), Number(full[2]), Number(full[3]));

  const monthDay = trimmed.match(/^(\d{1,2})[-/.月](\d{1,2})日?$/);
  if (monthDay) return makeCalendarDate(new Date().getFullYear(), Number(monthDay[1]), Number(monthDay[2]));

  return undefined;
}

/** 年月日构造 Date，月份 1-12，会校验日期有效性。 */
export function makeCalendarDate(year: number, month: number, day: number): Date | undefined {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return undefined;
  return date;
}

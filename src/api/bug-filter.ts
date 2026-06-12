import type { ZentaoBug } from '../types/zentao.js';

export function normalizeBugFilterText(value: string): string {
  return value.trim().toLowerCase();
}

export function bugMatchesKeyword(bug: ZentaoBug, keyword: string, fields: string[]): boolean {
  if (!keyword) return true;

  const record = bug as Record<string, unknown>;
  for (const field of fields) {
    const value = record[field];
    if (value === undefined || value === null) continue;
    if (String(value).toLowerCase().includes(keyword)) return true;
  }

  return false;
}

export function bugMatchesModuleAlias(bug: ZentaoBug, keyword: string): boolean {
  if (!keyword) return true;

  const fields = ['module', 'moduleId', 'moduleName', 'moduleTitle', 'modulePath', 'path', 'title', 'keywords', 'v1', 'v2'];
  if (bugMatchesKeyword(bug, keyword, fields)) return true;

  const record = bug as Record<string, unknown>;
  const aliasSources = fields
    .map((field) => record[field])
    .filter((value): value is string | number => value !== undefined && value !== null)
    .map((value) => String(value));

  return aliasSources.some((value) => normalizeAliasText(value).includes(keyword));
}

function normalizeAliasText(value: string): string {
  let result = '';

  for (const char of value.toLowerCase()) {
    if (/[a-z0-9]/.test(char)) {
      result += char;
      continue;
    }

    const initial = chineseInitialMap[char];
    if (initial) {
      result += initial;
    }
  }

  return result;
}

const chineseInitialMap: Record<string, string> = {
  '超': 'c',
  '管': 'g',
  '云': 'y',
  '镜': 'j',
  '助': 'z',
  '手': 's',
  '脉': 'm',
  '眺': 't',
  '警': 'j',
  '务': 'w',
  '数': 's',
  '盘': 'p',
  '析': 'x',
  '案': 'a',
  '系': 'x',
  '统': 't',
  '寻': 'x',
  '迹': 'j',
  '客': 'k',
  '户': 'h',
  '成': 'c',
  '功': 'g',
  '部': 'b',
  '服': 'f',
  '止': 'z',
  '付': 'f',
  '通': 't',
  '两': 'l',
  '卡': 'k',
  '其': 'q',
  '他': 't',
};

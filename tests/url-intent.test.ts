import { describe, expect, it } from 'vitest';
import { looksLikeUrlIntentInput, parseUrlIntent, resolveExecutableUrlIntent } from '../src/core/url-intent.js';

describe('url intent parser', () => {
  it('recognizes executable legacy urls', () => {
    const intent = parseUrlIntent('https://zentao.example.com/zentao/bug-view-84362.html?tid=1', {
      serverUrl: 'https://zentao.example.com',
    });

    expect(intent).toMatchObject({
      sourceType: 'url',
      matchedServer: true,
      routeKind: 'bug-view',
      action: 'execute',
      primaryCommand: 'getBugDetail',
      params: [{ name: 'bugId', value: 84362 }],
    });
    expect(resolveExecutableUrlIntent(intent)).toEqual({ commandName: 'getBugDetail', commandArgs: ['--bugId', '84362'] });
  });

  it('downgrades cross-host urls to explain', () => {
    const intent = parseUrlIntent('https://other.example.com/zentao/execution-task-2130.html', {
      serverUrl: 'https://zentao.example.com',
    });

    expect(intent).toMatchObject({
      matchedServer: false,
      routeKind: 'execution-task',
      action: 'explain',
      suggestedCommands: ['getExecutionDetail', 'getExecutionTaskKanban', 'getExecutionSnapshot'],
    });
  });

  it('maps program todo and projectrelease pages to executable commands', () => {
    const programIntent = parseUrlIntent('program-view-620.html');
    const todoIntent = parseUrlIntent('todo-view-2319.html');
    const projectReleaseIntent = parseUrlIntent('projectrelease-view-5648.html');

    expect(programIntent).toMatchObject({
      routeKind: 'program-view',
      action: 'execute',
      primaryCommand: 'getProgramDetail',
      params: [{ name: 'programId', value: 620 }],
    });
    expect(resolveExecutableUrlIntent(programIntent)).toEqual({ commandName: 'getProgramDetail', commandArgs: ['--programId', '620'] });

    expect(todoIntent).toMatchObject({
      routeKind: 'todo-view',
      action: 'execute',
      primaryCommand: 'getTodoDetail',
      params: [{ name: 'todoId', value: 2319 }],
    });
    expect(resolveExecutableUrlIntent(todoIntent)).toEqual({ commandName: 'getTodoDetail', commandArgs: ['--todoId', '2319'] });

    expect(projectReleaseIntent).toMatchObject({
      routeKind: 'projectrelease-view',
      action: 'execute',
      primaryCommand: 'getReleaseDetail',
      params: [{ name: 'releaseId', value: 5648 }],
    });
    expect(resolveExecutableUrlIntent(projectReleaseIntent)).toEqual({ commandName: 'getReleaseDetail', commandArgs: ['--releaseId', '5648'] });
  });

  it('keeps doc job and profile pages in explain mode', () => {
    expect(parseUrlIntent('doc-view-12.html')).toMatchObject({
      routeKind: 'doc-view',
      action: 'explain',
      suggestedCommands: [],
    });

    expect(parseUrlIntent('job-view-18.html')).toMatchObject({
      routeKind: 'job-view',
      action: 'explain',
      suggestedCommands: [],
    });

    expect(parseUrlIntent('user-profile-7.html')).toMatchObject({
      routeKind: 'user-profile',
      action: 'explain',
      suggestedCommands: [],
    });
  });

  it('treats write pages as explain only', () => {
    const intent = parseUrlIntent('https://zentao.example.com/zentao/product-edit-1.html', {
      serverUrl: 'https://zentao.example.com',
    });

    expect(intent.action).toBe('explain');
  });

  it('detects url-like inputs', () => {
    expect(looksLikeUrlIntentInput('execution-bug-2130.html')).toBe(true);
    expect(looksLikeUrlIntentInput('https://zentao.example.com/zentao/bug-view-1.html')).toBe(true);
    expect(looksLikeUrlIntentInput('getMyTasks')).toBe(false);
  });
});

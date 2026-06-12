import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli.js';
import { setApi } from '../src/core/api-provider.js';
import * as installModule from '../src/install.js';

describe('runCli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps "who am i" to the current user profile command', async () => {
    const getMyProfile = vi.fn(async () => ({
      profile: {
        account: 'me',
        realname: '李小明',
        role: { name: '研发' },
        visits: 42,
        view: {
          projects: '1,2',
          products: '10,20',
          sprints: '100,101,102',
        },
      },
    }));
    const getMyTasks = vi.fn(async () => ({
      total: 2,
      scanned: 2,
      items: [
        { id: 1, name: '开发 A', status: 'doing', productName: '产品甲', executionName: 'Sprint 1' },
        { id: 2, name: '开发 B', status: 'wait', productName: '产品乙', executionName: 'Sprint 1' },
      ],
    }));
    const getMyBugs = vi.fn(async () => ({
      total: 1,
      items: [
        { id: 3, title: '修复 C', status: 'active', productName: '产品甲', executionName: 'Sprint 2' },
      ],
    }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ user: { getMyProfile }, task: { getMyTasks }, bug: { getMyBugs } } as never);

    await runCli(['who', 'am', 'i']);

    expect(getMyProfile).toHaveBeenCalledWith();
    expect(getMyTasks).toHaveBeenCalledWith({ status: 'all', limit: 100 });
    expect(getMyBugs).toHaveBeenCalledWith({ limit: 100 });
    expect(write).toHaveBeenCalledWith(expect.stringContaining('李小明'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('你现在是 青铜 · 研发 工程师'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('账号：me'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('感谢您的第 42 次访问'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('任务：2 个'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('Bug：1 个'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('参与项目：1、2'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('等级依据：项目 2 / 产品 4 / Sprint 5'));
    expect(write.mock.calls[0]?.[0]).not.toContain('卓越');
  });

  it('maps "help who am i" to the whoami command help', async () => {
    const getMyProfile = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ user: { getMyProfile } } as never);

    await runCli(['help', 'who', 'am', 'i']);

    expect(getMyProfile).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao help whoami'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('此命令无参数。'));
  });

  it('prints top-level help for bare help command', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['help']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao CLI'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('适配版本：优先适配禅道 18.5 REST v1 API'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('常用命令：'));
  });

  it('prints command help without validating command args', async () => {
    const getExecutionDetail = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionDetail } } as never);

    await runCli(['getExecutionDetail', '--help']);

    expect(getExecutionDetail).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao getExecutionDetail'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number>'));
  });

  it('prints command help through the help command', async () => {
    const getExecutionDetail = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionDetail } } as never);

    await runCli(['help', 'getExecutionDetail']);

    expect(getExecutionDetail).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao help getExecutionDetail'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number> （必填）'));
  });

  it('prints target command help when help command also includes help flag', async () => {
    const getExecutionDetail = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionDetail } } as never);

    await runCli(['help', 'getExecutionDetail', '--help']);

    expect(getExecutionDetail).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao help getExecutionDetail'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number> （必填）'));
  });

  it('prints enum values in command help', async () => {
    const getDevelopmentContext = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ developmentContext: { getDevelopmentContext } } as never);

    await runCli(['getDevelopmentContext', '--help']);

    expect(getDevelopmentContext).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--entityType <story|bug>'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--entityId <number>'));
  });

  it('maps execution bug legacy page file names to structured commands', async () => {
    const getExecutionBugs = vi.fn(async () => ({ items: [{ id: 1 }] }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionBugs } } as never);

    await runCli(['execution-bug-2130.html']);

    expect(getExecutionBugs).toHaveBeenCalledWith(2130, { limit: 100 });
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ items: [{ id: 1 }] }, null, 2)}\n`);
  });

  it('maps full legacy page urls to detail commands', async () => {
    const getBugDetail = vi.fn(async () => ({ id: 84362 }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ bug: { getBugDetail } } as never);

    await runCli(['https://zentao.example.com/zentao/bug-view-84362.html?tid=1#app=qa']);

    expect(getBugDetail).toHaveBeenCalledWith(84362);
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ id: 84362 }, null, 2)}\n`);
  });

  it('maps windows-style legacy page paths to structured commands', async () => {
    const getBugDetail = vi.fn(async () => ({ id: 84362 }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ bug: { getBugDetail } } as never);

    await runCli(['C:\\zentao\\bug-view-84362.html']);

    expect(getBugDetail).toHaveBeenCalledWith(84362);
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ id: 84362 }, null, 2)}\n`);
  });

  it('maps legacy page shortcuts in help command', async () => {
    const getExecutionBugs = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionBugs } } as never);

    await runCli(['help', 'execution-bug-2130.html']);

    expect(getExecutionBugs).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao help getExecutionBugs'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number>'));
  });

  it('prints legacy shortcut target help when help command also includes help flag', async () => {
    const getExecutionBugs = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionBugs } } as never);

    await runCli(['help', 'execution-bug-2130.html', '--help']);

    expect(getExecutionBugs).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao help getExecutionBugs'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number>'));
  });

  it('prints builtin command help through help command', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['help', 'update']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao update'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--skip-config-check'));
  });

  it('prints version help through help command aliases', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['help', '--version']);
    await runCli(['help', '-v']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao version'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao --version'));
  });

  it('prints builtin command help through direct help flag', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['update', '--help']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao upgrade'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--cli-only'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--cli-only true|false'));
  });

  it('includes upgrade in raw builtin command listings', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['list', '--raw']);

    expect(write).toHaveBeenCalledWith('upgrade\n');
  });

  it('prints raw list output in alphabetical order', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['list', '--raw']);

    const output = write.mock.calls
      .map(([value]) => String(value).trim())
      .filter(Boolean);
    const sorted = [...output].sort((left, right) => left.localeCompare(right));
    expect(output).toEqual(sorted);
  });

  it('prints grouped command list with explanations and hints', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['list']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao 可用命令'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('开始使用：'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('whoami'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('友好展示当前禅道账号'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao list --raw'));
  });

  it('prints top-level help with inline role, key=value, and legacy shortcut examples', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['--help']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao [--role=full|dev|pm|qa] <command> [--key=value ...]'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao --role=qa getMyBugs --limit=50'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao execution-bug-2130.html'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('Node.js >= 16'));
  });

  it('supports inline role syntax before commands', async () => {
    const getMyBugs = vi.fn(async () => ({ items: [{ id: 2 }] }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ bug: { getMyBugs } } as never);

    await runCli(['--role=qa', 'getMyBugs', '--limit', '5']);

    expect(getMyBugs).toHaveBeenCalledWith({ limit: 5 });
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ items: [{ id: 2 }] }, null, 2)}\n`);
  });

  it('rejects invalid inline role syntax', async () => {
    await expect(runCli(['--role=ops', 'list'])).rejects.toThrow('无效 role: ops');
  });

  it('supports short inline role syntax before commands', async () => {
    const getMyBugs = vi.fn(async () => ({ items: [{ id: 3 }] }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ bug: { getMyBugs } } as never);

    await runCli(['-r=qa', 'getMyBugs', '--limit', '6']);

    expect(getMyBugs).toHaveBeenCalledWith({ limit: 6 });
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ items: [{ id: 3 }] }, null, 2)}\n`);
  });

  it('does not treat command arguments named like role as top-level role flags', async () => {
    const getMyBugs = vi.fn();
    setApi({ bug: { getMyBugs } } as never);

    await expect(runCli(['getMyBugs', '--role', 'qa'])).rejects.toThrow('未知参数: --role');
    expect(getMyBugs).not.toHaveBeenCalled();
  });

  it('prints command help when help flag appears with other args', async () => {
    const getExecutionDetail = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionDetail } } as never);

    await runCli(['getExecutionDetail', '--executionId', '123', '--help']);

    expect(getExecutionDetail).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao getExecutionDetail'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number>'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao getExecutionDetail [--key=value ...]'));
  });

  it('prints install help without running install when help flag is mixed with args', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const runInstallCommand = vi.spyOn(installModule, 'runInstallCommand').mockResolvedValue();

    await runCli(['install', '--cli-only', '--help']);

    expect(runInstallCommand).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao install'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--cli-only'));
  });

  it('prints top-level help when help flag is provided without target command', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['help', '--help']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao CLI'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('查看更多：'));
  });

  it('prints version command help when help flag is provided', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['version', '--help']);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao version'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao --version'));
  });

  it('rejects extra args for zero-argument builtin commands', async () => {
    await expect(runCli(['list', 'extra'])).rejects.toThrow('list 不支持额外参数: extra');
    await expect(runCli(['version', 'extra'])).rejects.toThrow('version 不支持额外参数: extra');
  });

  it('rejects extra args for zero-argument builtin help paths', async () => {
    await expect(runCli(['--help', 'extra'])).rejects.toThrow('help 不支持额外参数: extra');
    await expect(runCli(['list', 'extra', '--help'])).rejects.toThrow('list 不支持额外参数: extra');
    await expect(runCli(['version', 'extra', '--help'])).rejects.toThrow('version 不支持额外参数: extra');
  });

  it('rejects extra args after help target command', async () => {
    await expect(runCli(['help', 'getExecutionDetail', 'extra'])).rejects.toThrow('help 只支持一个命令目标，检测到多余参数: extra');
    await expect(runCli(['help', 'who', 'am', 'i', 'extra'])).rejects.toThrow('help 只支持一个命令目标，检测到多余参数: extra');
  });
});

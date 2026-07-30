import { spawn } from 'node:child_process';
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { ZentaoApi } from './api/index.js';
import { loadConfig, maskConfig, normalizeConfig, saveConfig } from './core/config.js';
import { writeUpdateCacheAfterInstall } from './update-probe.js';
import type { ZentaoConfig } from './types/common.js';

const PACKAGE_NAME = '@cloudglab/zentao-cli';
const GIT_SKILL_SOURCE = 'cloudglab/zentao-cli';
const GLOBAL_SKILL_AGENT = 'universal';

type SkillSource = 'local' | 'git' | 'npm';

interface InstallOptions {
  skillSource: SkillSource;
  skillLocalPath?: string;
  skipConfigCheck: boolean;
  cliOnly: boolean;
  skillOnly: boolean;
}

interface UninstallOptions {
  confirm: boolean;
  keepConfig: boolean;
  cliOnly: boolean;
  skillOnly: boolean;
}

export async function runInstallCommand(args: string[] = []): Promise<void> {
  const options = parseInstallOptions(args);
  await installPackageAndSkill('安装', options);
  if (options.skipConfigCheck) {
    printSuccessGuide('安装', '已跳过禅道配置校验。');
    return;
  }
  await ensureValidZentaoConfig();
  printSuccessGuide('安装', '禅道配置校验通过。');
}

export async function runUpdateCommand(args: string[] = []): Promise<void> {
  const options = parseInstallOptions(args);
  await installPackageAndSkill('更新', options);
  if (options.skipConfigCheck) {
    printSuccessGuide('更新', '已跳过禅道配置校验。');
    return;
  }
  await ensureValidZentaoConfig();
  printSuccessGuide('更新', '禅道配置校验通过。');
}

export async function runUninstallCommand(args: string[] = []): Promise<void> {
  const options = parseUninstallOptions(args);
  if (!options.confirm) {
    printUninstallPreview(options);
    return;
  }

  if (!options.cliOnly) {
    await uninstallSkill();
  }
  if (!options.skillOnly) {
    await uninstallPackage();
  }
  if (shouldRemoveConfig(options)) {
    await removeConfigFile();
  }

  process.stdout.write('\n卸载完成。\n');
}

function printSuccessGuide(action: '安装' | '更新', status: string): void {
  process.stdout.write(`\n${action}完成，${status}\n\n${renderBanner()}\n\n`);
  process.stdout.write(`写操作说明：
  写操作默认已开启。
  写命令需要加 --confirm 才会真正执行。
  如需禁用写操作，设置 ZENTAO_DISABLE_WRITE=true。

快速开始：
  zentao help                    查看帮助
  zentao list                    查看可用命令
  zentao whoami                  校验当前账号
  zentao getMyTasks --limit 10   查看我的任务
  zentao getMyBugs --limit 10    查看我的 Bug

常用配置：
  zentao update                       更新 CLI 和 Skill
  zentao install --skip-config-check  仅安装，跳过配置校验
`);
}

function renderBanner(): string {
  return [
    '     ___       ___       ___       ___       ___       ___       ___       ___       ___   ',
    '    /\\  \\     /\\  \\     /\\__\\     /\\  \\     /\\  \\     /\\  \\     /\\  \\     /\\__\\     /\\  \\  ',
    '   _\\:\\  \\   /::\\  \\   /:| _|_    \\:\\  \\   /::\\  \\   /::\\  \\   /::\\  \\   /:/  /    _\\:\\  \\ ',
    '  /::::\\__\\ /::\\:\\__\\ /::|/\\__\\   /::\\__\\ /::\\:\\__\\ /:/\\:\\__\\ /:/\\:\\__\\ /:/__/    /\\/::\\__\\',
    '  \\::;;/__/ \\:\\:\\/  / \\/|::/  /  /:/\\/__/ \\/\\::/  / \\:\\/:/  / \\:\\ \\/__/ \\:\\  \\    \\::/\\/__/',
    '   \\:\\__\\    \\:\\/  /    |:/  /   \\/__/      /:/  /   \\::/  /   \\:\\__\\    \\:\\__\\    \\:\\__\\  ',
    '    \\/__/     \\/__/     \\/__/               \\/__/     \\/__/     \\/__/     \\/__/     \\/__/ ',
  ].join('\n');
}

function createSkillAddArgs(source: string): string[] {
  return ['-y', 'skills', 'add', source, '--global', '--agent', GLOBAL_SKILL_AGENT, '--yes'];
}

function createSkillRemoveArgs(global = false): string[] {
  return ['-y', 'skills', 'remove', 'zentao-cli', '--yes', ...(global ? ['--global'] : [])];
}

function parseInstallOptions(args: string[]): InstallOptions {
  let skillSource: SkillSource = 'local';
  let skillLocalPath: string | undefined;
  let skipConfigCheck = false;
  let cliOnly = false;
  let skillOnly = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--skill-source' || arg.startsWith('--skill-source=')) {
      const value = readRequiredOptionValue(args, index, '--skill-source');
      if (value !== 'local' && value !== 'git' && value !== 'npm') {
        throw new Error('--skill-source 只支持 local、git 或 npm');
      }
      skillSource = value;
      if (arg === '--skill-source') index += 1;
      continue;
    }

    if (arg === '--skill-local-path' || arg.startsWith('--skill-local-path=')) {
      const value = readRequiredOptionValue(args, index, '--skill-local-path');
      skillLocalPath = value;
      if (arg === '--skill-local-path') index += 1;
      continue;
    }

    if (arg === '--skip-config-check' || arg.startsWith('--skip-config-check=')) {
      const parsed = readBooleanFlag(args, index, '--skip-config-check');
      skipConfigCheck = parsed.value;
      index += parsed.consumedArgs;
      continue;
    }

    if (arg === '--cli-only' || arg.startsWith('--cli-only=')) {
      const parsed = readBooleanFlag(args, index, '--cli-only');
      cliOnly = parsed.value;
      index += parsed.consumedArgs;
      continue;
    }

    if (arg === '--skill-only' || arg.startsWith('--skill-only=')) {
      const parsed = readBooleanFlag(args, index, '--skill-only');
      skillOnly = parsed.value;
      index += parsed.consumedArgs;
      continue;
    }

    throw new Error(`未知安装参数: ${arg}`);
  }

  if (cliOnly && skillOnly) {
    throw new Error('--cli-only 和 --skill-only 不能同时使用');
  }

  return { skillSource, skillLocalPath, skipConfigCheck, cliOnly, skillOnly };
}

function parseUninstallOptions(args: string[]): UninstallOptions {
  let confirm = false;
  let keepConfig = false;
  let cliOnly = false;
  let skillOnly = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--confirm' || arg.startsWith('--confirm=')) {
      const parsed = readBooleanFlag(args, index, '--confirm');
      confirm = parsed.value;
      index += parsed.consumedArgs;
      continue;
    }

    if (arg === '--keep-config' || arg.startsWith('--keep-config=')) {
      const parsed = readBooleanFlag(args, index, '--keep-config');
      keepConfig = parsed.value;
      index += parsed.consumedArgs;
      continue;
    }

    if (arg === '--cli-only' || arg.startsWith('--cli-only=')) {
      const parsed = readBooleanFlag(args, index, '--cli-only');
      cliOnly = parsed.value;
      index += parsed.consumedArgs;
      continue;
    }

    if (arg === '--skill-only' || arg.startsWith('--skill-only=')) {
      const parsed = readBooleanFlag(args, index, '--skill-only');
      skillOnly = parsed.value;
      index += parsed.consumedArgs;
      continue;
    }

    throw new Error(`未知卸载参数: ${arg}`);
  }

  if (cliOnly && skillOnly) {
    throw new Error('--cli-only 和 --skill-only 不能同时使用');
  }

  return { confirm, keepConfig, cliOnly, skillOnly };
}

function printUninstallPreview(options: UninstallOptions): void {
  const steps = [
    ...(!options.cliOnly ? ['卸载 zentao skill（项目级和全局级）'] : []),
    ...(!options.skillOnly ? ['卸载全局 CLI 包并清理 npm 残留目录'] : []),
    ...(shouldRemoveConfig(options) ? ['删除 ~/.zentao/config.json'] : ['保留 ~/.zentao/config.json']),
  ];
  process.stdout.write(`卸载预览：\n${steps.map((step) => `  - ${step}`).join('\n')}\n\n真实执行请运行：\n  zentao uninstall --confirm true\n  npx -y ${PACKAGE_NAME}@latest uninstall --confirm true\n\n可选参数：\n  --keep-config true   保留禅道配置\n  --cli-only true      只卸载 CLI\n  --skill-only true    只卸载 skill\n`);
}

function shouldRemoveConfig(options: UninstallOptions): boolean {
  return !options.keepConfig && !options.cliOnly && !options.skillOnly;
}

function readOptionValue(arg: string, optionName: string): string | undefined {
  const prefix = `${optionName}=`;
  if (!arg.startsWith(prefix)) return undefined;
  return arg.slice(prefix.length);
}

function readRequiredOptionValue(args: string[], index: number, optionName: string): string {
  const arg = args[index];
  const inlineValue = readOptionValue(arg, optionName);
  if (inlineValue !== undefined) {
    if (inlineValue.trim() === '') {
      throw createMissingOptionValueError(optionName);
    }
    return inlineValue;
  }

  const next = args[index + 1];
  if (typeof next !== 'string' || next.startsWith('--')) {
    throw createMissingOptionValueError(optionName);
  }

  return next;
}

function createMissingOptionValueError(optionName: string): Error {
  if (optionName === '--skill-local-path') {
    return new Error('--skill-local-path 需要传入本地目录路径');
  }

  return new Error(`${optionName} 需要传入参数值`);
}

function readBooleanFlag(args: string[], index: number, optionName: string): { value: boolean; consumedArgs: number } {
  const arg = args[index];
  const inlineValue = readOptionValue(arg, optionName);
  if (inlineValue !== undefined) {
    return { value: parseBooleanValue(inlineValue, optionName), consumedArgs: 0 };
  }

  const next = args[index + 1];
  if (typeof next === 'string' && !next.startsWith('--')) {
    return { value: parseBooleanValue(next, optionName), consumedArgs: 1 };
  }

  return { value: true, consumedArgs: 0 };
}

function parseBooleanValue(value: string, optionName: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  throw new Error(`${optionName} 只支持 true 或 false`);
}

async function installPackageAndSkill(action: '安装' | '更新', options: InstallOptions): Promise<void> {
  if (!options.skillOnly) {
    await cleanupGlobalPackageResidues();
    await installGlobalCli(action);
  }
  if (!options.cliOnly) {
    await installSkill(action, options);
  }
  await writeUpdateCacheAfterInstall();
}

async function installGlobalCli(action: '安装' | '更新'): Promise<void> {
  const args = ['install', '-g', `${PACKAGE_NAME}@latest`];
  try {
    await runStep(`${action} zentao CLI`, 'npm', args);
  } catch (error) {
    if (isNpmEPERMError(error)) {
      throw createEPERMError(action);
    }
    if (!isNpmDirectoryNotEmptyError(error)) {
      throw error;
    }
    process.stdout.write('\n检测到 npm 全局安装目录残留，正在清理后重试...\n');
    await cleanupGlobalPackageResidues();
    try {
      await runStep(`${action} zentao CLI`, 'npm', args);
    } catch (retryError) {
      if (isNpmEPERMError(retryError)) {
        throw createEPERMError(action);
      }
      throw retryError;
    }
  }
}

function isNpmEPERMError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'EPERM') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('EPERM') || message.toLowerCase().includes('operation not permitted');
}

function createEPERMError(action: '安装' | '更新'): Error {
  return new Error(
    `${action} zentao CLI 失败：npm 全局安装目录没有写权限（EPERM）。\n`
    + '可能原因：npm prefix 指向了 Program Files 等 Windows 受保护目录。\n'
    + '解决方法（任选其一）：\n'
    + '  1. 以管理员身份重新运行安装命令\n'
    + '  2. 将 npm prefix 改到用户可写目录后重试：\n'
    + '     PowerShell: npm config set prefix "$env:APPDATA\\npm"\n'
    + '     CMD:        npm config set prefix "%APPDATA%\\npm"\n'
    + '     Git Bash:   npm config set prefix "$APPDATA/npm"',
  );
}

function isNpmDirectoryNotEmptyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ENOTEMPTY') || message.toLowerCase().includes('directory not empty');
}

async function runNpxStepWithRetry(
  title: string,
  args: string[],
  _action: '安装' | '更新' | '卸载',
): Promise<void> {
  try {
    await runStep(title, 'npx', args);
  } catch (error) {
    if (!isNpmDirectoryNotEmptyError(error)) {
      throw error;
    }
    process.stdout.write(`\n检测到 npx 缓存目录残留，正在清理后重试 ${title}...\n`);
    await cleanupNpxResidues();
    await runStep(title, 'npx', args);
  }
}

async function installSkill(action: '安装' | '更新', options: InstallOptions): Promise<void> {
  if (options.skillLocalPath) {
    await runNpxStepWithRetry(`${action} zentao skill`, createSkillAddArgs(path.resolve(options.skillLocalPath)), action);
    return;
  }

  if (options.skillSource === 'local') {
    await installSkillFromInstalledPackage(action);
    return;
  }

  if (options.skillSource === 'git') {
    await runNpxStepWithRetry(`${action} zentao skill`, createSkillAddArgs(GIT_SKILL_SOURCE), action);
    return;
  }

  await installSkillFromNpmPackage(action);
}

async function installSkillFromInstalledPackage(action: '安装' | '更新'): Promise<void> {
  const skillPath = await getInstalledPackageSkillPath();
  try {
    await access(skillPath);
  } catch {
    throw new Error(`未找到已安装包内的 zentao skill：${skillPath}。可重试 --skill-source npm 或 --skill-source git。`);
  }

  await runNpxStepWithRetry(`${action} zentao skill`, createSkillAddArgs(skillPath), action);
}

async function getInstalledPackageSkillPath(): Promise<string> {
  const globalNodeModules = (await runCommandOutput('npm', ['root', '-g'])).trim();
  if (!globalNodeModules) {
    throw new Error('npm root -g 没有返回全局 node_modules 路径');
  }
  return path.join(globalNodeModules, PACKAGE_NAME, 'skills', 'zentao-cli');
}

async function installSkillFromNpmPackage(action: '安装' | '更新'): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zentao-cli-skill-'));
  try {
    const stdout = await runCommandOutput('npm', ['pack', `${PACKAGE_NAME}@latest`, '--pack-destination', tempDir, '--silent']);
    const lines = stdout.trim().split('\n').filter(Boolean);
    const tarballName = lines[lines.length - 1];
    if (!tarballName) {
      throw new Error('npm pack 没有返回包文件名');
    }

    const tarballPath = path.join(tempDir, tarballName);
    await runStep('解压 zentao npm 包', 'tar', ['-xzf', tarballPath, '-C', tempDir]);
    await runNpxStepWithRetry(`${action} zentao skill`, createSkillAddArgs(path.join(tempDir, 'package')), action);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function uninstallSkill(): Promise<void> {
  await runNpxStepWithRetry('卸载项目级 zentao skill', createSkillRemoveArgs(false), '卸载');
  await runNpxStepWithRetry('卸载全局级 zentao skill', createSkillRemoveArgs(true), '卸载');
}

async function uninstallPackage(): Promise<void> {
  await runStep('卸载 zentao CLI', 'npm', ['uninstall', '-g', PACKAGE_NAME]);
  await cleanupGlobalPackageResidues();
}

async function cleanupGlobalPackageResidues(): Promise<void> {
  const globalNodeModules = (await runCommandOutput('npm', ['root', '-g'])).trim();
  if (globalNodeModules) {
    await rm(path.join(globalNodeModules, PACKAGE_NAME), { recursive: true, force: true });
    const scopeDir = path.join(globalNodeModules, '@cloudglab');
    let entries: string[] = [];
    try {
      entries = await readdir(scopeDir);
    } catch {
      // scope 目录不存在时忽略
    }
    await Promise.all(entries
      .filter((entry) => entry.startsWith('.zentao-cli-'))
      .map((entry) => rm(path.join(scopeDir, entry), { recursive: true, force: true })));
  }

  await cleanupNpxResidues();
}

async function cleanupNpxResidues(): Promise<void> {
  const npxCacheDir = path.join(os.homedir(), '.npm', '_npx');
  let entries: string[] = [];
  try {
    entries = await readdir(npxCacheDir);
  } catch {
    return;
  }

  await Promise.all(entries.map(async (entry) => {
    const hashDir = path.join(npxCacheDir, entry);
    const cloudglabDir = path.join(hashDir, 'node_modules', '@cloudglab');
    let cloudglabEntries: string[] = [];
    try {
      cloudglabEntries = await readdir(cloudglabDir);
    } catch {
      return;
    }

    const hasZentaoCli = cloudglabEntries.some(
      (e) => e === 'zentao-cli' || e.startsWith('.zentao-cli-'),
    );
    if (hasZentaoCli) {
      await rm(hashDir, { recursive: true, force: true });
    }
  }));
}

async function removeConfigFile(): Promise<void> {
  await rm(path.join(os.homedir(), '.zentao', 'config.json'), { force: true });
}

async function runStep(title: string, command: string, args: string[]): Promise<void> {
  process.stdout.write(`\n${title}...\n`);
  await runCommand(command, args);
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, quoteArgsForShell(args), { shell: process.platform === 'win32' });
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(createCommandFailedError(command, args, code, stderr));
    });
  });
}

function createCommandFailedError(command: string, args: string[], code: number | null, stderr: string): Error {
  const baseMessage = `${command} ${args.join(' ')} 执行失败，退出码 ${String(code)}`;
  const tail = stderr ? `：${stderr.trim()}` : '';
  return new Error(baseMessage + tail);
}

function quoteArgsForShell(args: string[]): string[] {
  // Windows 下 spawn({ shell: true }) 会把 args 用空格拼接后交给 cmd.exe，
  // 不会自动给单个参数加引号或转义。含空格或 cmd 元字符的路径
  // （如 C:\Program Files\...）会被 cmd.exe 拆分或解释，导致命令解析错误。
  if (process.platform !== 'win32') return args;
  return args.map(quoteWindowsShellArg);
}

function quoteWindowsShellArg(arg: string): string {
  if (arg === '') return '""';
  if (!/[\s"&|<>^()%!]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

function runCommandOutput(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, quoteArgsForShell(args), { shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} 执行失败，退出码 ${String(code)}${stderr ? `：${stderr.trim()}` : ''}`));
    });
  });
}

async function ensureValidZentaoConfig(): Promise<void> {
  const { config: existing, error: loadError } = tryLoadConfig();
  if (existing && await validateConfig(existing)) {
    process.stdout.write(`\n禅道配置校验通过：${JSON.stringify(maskConfig(existing))}\n`);
    printEnvOverrideNotice();
    return;
  }

  // 非交互终端统一拦截：避免后续 promptForConfig 在无 TTY 时 hang 住。
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const reason = loadError
      ? `禅道配置文件异常：${loadError.message}`
      : existing
        ? '检测到已有禅道配置，但登录校验失败'
        : '未检测到可用禅道配置';
    throw new Error(`${reason}。当前不是交互式终端，无法输入配置。请先设置环境变量 ZENTAO_URL、ZENTAO_USERNAME、ZENTAO_PASSWORD 后重试。`);
  }

  if (existing) {
    process.stdout.write('\n检测到已有禅道配置，但登录校验失败，请重新输入。\n');
  } else if (loadError) {
    process.stdout.write(`\n检测到禅道配置文件异常：${loadError.message}\n`);
  } else {
    process.stdout.write('\n未检测到可用禅道配置，请输入配置。\n');
  }

  const config = await promptForConfig(existing ?? undefined);
  await validateConfigOrThrow(config);
  saveConfig(config);
  process.stdout.write(`已保存禅道配置：${JSON.stringify(maskConfig(config))}\n`);
  printEnvOverrideNotice();
}

function printEnvOverrideNotice(): void {
  if (!hasZentaoEnvConfig()) return;
  process.stdout.write('提示：当前 shell 存在 ZENTAO_* 环境变量，后续命令会优先使用环境变量；如果仍登录失败，请同步更新或清除这些环境变量。\n');
}

function tryLoadConfig(): { config: ZentaoConfig | null; error?: Error } {
  try {
    return { config: loadConfig() };
  } catch (error) {
    return {
      config: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

function hasZentaoEnvConfig(): boolean {
  return [
    process.env.ZENTAO_URL,
    process.env.ZENTAO_USERNAME,
    process.env.ZENTAO_ACCOUNT,
    process.env.ZENTAO_PASSWORD,
    process.env.ZENTAO_API_VERSION,
    process.env.ZENTAO_API_BASE_URL,
    process.env.ZENTAO_LEGACY_BASE_URL,
  ].some((value) => typeof value === 'string' && value.trim() !== '');
}

async function validateConfig(config: ZentaoConfig): Promise<boolean> {
  try {
    await validateConfigOrThrow(config);
    return true;
  } catch {
    return false;
  }
}

async function validateConfigOrThrow(config: ZentaoConfig): Promise<void> {
  const api = new ZentaoApi(config);
  await api.getToken();
}

async function promptForConfig(defaults?: ZentaoConfig): Promise<ZentaoConfig> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('当前不是交互式终端，无法输入配置。请先设置 ZENTAO_URL、ZENTAO_USERNAME、ZENTAO_PASSWORD 后重试。');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const url = await ask(rl, '禅道地址', defaults?.url ?? 'https://zentao.cloudglab.cn/');
    const username = await ask(rl, '禅道用户名', defaults?.username);
    const password = await askPassword(rl, defaults?.password ? '禅道密码（直接回车保留原密码）' : '禅道密码');

    return normalizeConfig({
      url,
      username,
      password: password || defaults?.password,
      apiVersion: defaults?.apiVersion,
      apiBaseUrl: defaults?.apiBaseUrl,
      legacyBaseUrl: defaults?.legacyBaseUrl,
    });
  } finally {
    rl.close();
  }
}

function ask(rl: readline.Interface, label: string, defaultValue = ''): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${label}${suffix}: `, (answer) => resolve(answer.trim() || defaultValue));
  });
}

function askPassword(rl: readline.Interface, label: string): Promise<string> {
  // 明文输入：密码可见，不做掩码隐藏。
  return ask(rl, label);
}

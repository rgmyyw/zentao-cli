import { spawn } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { ZentaoApi } from './api/index.js';
import { loadConfig, maskConfig, normalizeConfig, saveConfig } from './core/config.js';
import type { ZentaoConfig } from './types/common.js';

const PACKAGE_NAME = '@cloudglab/zentao-cli';
const GIT_SKILL_SOURCE = 'cloudglab/zentao-cli';

type SkillSource = 'local' | 'git' | 'npm';

interface InstallOptions {
  skillSource: SkillSource;
  skillLocalPath?: string;
  skipConfigCheck: boolean;
  cliOnly: boolean;
  skillOnly: boolean;
}

export async function runInstallCommand(args: string[] = []): Promise<void> {
  const options = parseInstallOptions(args);
  await installPackageAndSkill('安装', options);
  if (options.skipConfigCheck) {
    process.stdout.write('安装完成，已跳过禅道配置校验。\n');
    return;
  }
  await ensureValidZentaoConfig();
  process.stdout.write('安装完成，禅道配置校验通过。\n');
}

export async function runUpdateCommand(args: string[] = []): Promise<void> {
  const options = parseInstallOptions(args);
  await installPackageAndSkill('更新', options);
  if (options.skipConfigCheck) {
    process.stdout.write('更新完成，已跳过禅道配置校验。\n');
    return;
  }
  await ensureValidZentaoConfig();
  process.stdout.write('更新完成，禅道配置校验通过。\n');
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
    await runStep(`${action} zentao CLI`, 'npm', ['install', '-g', `${PACKAGE_NAME}@latest`]);
  }
  if (!options.cliOnly) {
    await installSkill(action, options);
  }
}

async function installSkill(action: '安装' | '更新', options: InstallOptions): Promise<void> {
  if (options.skillLocalPath) {
    await runStep(`${action} zentao skill`, 'npx', ['-y', 'skills', 'add', '-g', path.resolve(options.skillLocalPath)]);
    return;
  }

  if (options.skillSource === 'local') {
    await installSkillFromInstalledPackage(action);
    return;
  }

  if (options.skillSource === 'git') {
    await runStep(`${action} zentao skill`, 'npx', ['-y', 'skills', 'add', '-g', GIT_SKILL_SOURCE]);
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

  await runStep(`${action} zentao skill`, 'npx', ['-y', 'skills', 'add', '-g', skillPath]);
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
    const tarballName = stdout.trim().split('\n').filter(Boolean).at(-1);
    if (!tarballName) {
      throw new Error('npm pack 没有返回包文件名');
    }

    const tarballPath = path.join(tempDir, tarballName);
    await runStep('解压 zentao npm 包', 'tar', ['-xzf', tarballPath, '-C', tempDir]);
    await runStep(`${action} zentao skill`, 'npx', ['-y', 'skills', 'add', '-g', path.join(tempDir, 'package')]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runStep(title: string, command: string, args: string[]): Promise<void> {
  process.stdout.write(`\n${title}...\n`);
  await runCommand(command, args);
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} 执行失败，退出码 ${String(code)}`));
    });
  });
}

function runCommandOutput(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: process.platform === 'win32' });
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
    process.stdout.write(`\n检测到已有禅道配置，校验通过：${JSON.stringify(maskConfig(existing))}\n`);
    printWriteGuardNotice();
    printEnvOverrideNotice();
    return;
  }

  if (existing) {
    process.stdout.write('\n检测到已有禅道配置，但登录校验失败，请重新输入。\n');
  } else if (loadError) {
    process.stdout.write(`\n检测到禅道配置文件异常：${loadError.message}\n`);
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw loadError;
    }
  } else {
    process.stdout.write('\n未检测到可用禅道配置，请输入配置。\n');
  }

  const config = await promptForConfig(existing ?? undefined);
  await validateConfigOrThrow(config);
  saveConfig(config);
  process.stdout.write(`已保存禅道配置：${JSON.stringify(maskConfig(config))}\n`);
  printWriteGuardNotice();
  printEnvOverrideNotice();
}

function printWriteGuardNotice(): void {
  process.stdout.write('写操作默认支持；真实写入仍需在命令参数中传 confirm=true。如需禁用写操作，请设置 ZENTAO_DISABLE_WRITE=true。\n');
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
    const url = await ask(rl, '禅道地址', defaults?.url);
    const username = await ask(rl, '禅道用户名', defaults?.username);
    const password = await askPassword(rl, defaults?.password ? '禅道密码（直接回车保留原密码）' : '禅道密码');
    const defaultApiVersion = defaults?.apiVersion === 'legacy' ? 'v1' : defaults?.apiVersion ?? 'v1';
    const apiVersion = await ask(rl, 'API 版本', defaultApiVersion);
    const apiBaseUrl = await ask(rl, 'API 基础地址（可选，直接回车跳过）', defaults?.apiBaseUrl ?? '');
    const legacyBaseUrl = await ask(rl, '旧版页面 JSON 基础地址（可选，直接回车跳过）', defaults?.legacyBaseUrl ?? '');

    return normalizeConfig({
      url,
      username,
      password: password || defaults?.password,
      apiVersion,
      apiBaseUrl: apiBaseUrl || undefined,
      legacyBaseUrl: legacyBaseUrl || undefined,
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
  const mutableRl = rl as readline.Interface & { stdoutMuted?: boolean; _writeToOutput?: (value: string) => void };
  return new Promise((resolve) => {
    mutableRl.stdoutMuted = true;
    mutableRl.question(`${label}: `, (answer) => {
      mutableRl.stdoutMuted = false;
      process.stdout.write('\n');
      resolve(answer.trim());
    });

    if (!mutableRl._writeToOutput) return;
    const originalWrite = mutableRl._writeToOutput.bind(rl);
    mutableRl._writeToOutput = (value: string) => {
      originalWrite(mutableRl.stdoutMuted ? '*' : value);
    };
  });
}

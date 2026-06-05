import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { ZentaoApi } from './api/index.js';
import { loadConfig, maskConfig, normalizeConfig, saveConfig } from './core/config.js';
import type { ZentaoConfig } from './types/common.js';

const PACKAGE_NAME = '@cloudglab/zentao-cli';

export async function runInstallCommand(): Promise<void> {
  await installPackageAndSkill('安装');
  await ensureValidZentaoConfig();
  process.stdout.write('安装完成，禅道配置校验通过。\n');
}

export async function runUpdateCommand(): Promise<void> {
  await installPackageAndSkill('更新');
  await ensureValidZentaoConfig();
  process.stdout.write('更新完成，禅道配置校验通过。\n');
}

async function installPackageAndSkill(action: '安装' | '更新'): Promise<void> {
  await runStep(`${action} zentao CLI`, 'npm', ['install', '-g', `${PACKAGE_NAME}@latest`]);
  await runStep(`${action} zentao skill`, 'npx', ['-y', 'skills', 'add', '-g', PACKAGE_NAME]);
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

async function ensureValidZentaoConfig(): Promise<void> {
  const existing = tryLoadConfig();
  if (existing && await validateConfig(existing)) {
    process.stdout.write(`\n检测到已有禅道配置，校验通过：${JSON.stringify(maskConfig(existing))}\n`);
    return;
  }

  if (existing) {
    process.stdout.write('\n检测到已有禅道配置，但登录校验失败，请重新输入。\n');
  } else {
    process.stdout.write('\n未检测到可用禅道配置，请输入配置。\n');
  }

  const config = await promptForConfig(existing ?? undefined);
  await validateConfigOrThrow(config);
  saveConfig(config);
  process.stdout.write(`已保存禅道配置：${JSON.stringify(maskConfig(config))}\n`);
  if (hasZentaoEnvConfig()) {
    process.stdout.write('提示：当前 shell 存在 ZENTAO_* 环境变量，后续命令会优先使用环境变量；如果仍登录失败，请同步更新或清除这些环境变量。\n');
  }
}

function tryLoadConfig(): ZentaoConfig | null {
  try {
    return loadConfig();
  } catch {
    return null;
  }
}

function hasZentaoEnvConfig(): boolean {
  return Boolean(process.env.ZENTAO_URL || process.env.ZENTAO_USERNAME || process.env.ZENTAO_ACCOUNT || process.env.ZENTAO_PASSWORD || process.env.ZENTAO_API_BASE_URL);
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
    const apiVersion = await ask(rl, 'API 版本', defaults?.apiVersion ?? 'v1');
    const apiBaseUrl = await ask(rl, 'API 基础地址（可选，直接回车跳过）', defaults?.apiBaseUrl ?? '');

    return normalizeConfig({
      url,
      username,
      password: password || defaults?.password,
      apiVersion,
      apiBaseUrl: apiBaseUrl || undefined,
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

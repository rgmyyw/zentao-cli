import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { runUpdateCommand } from './install.js';
import { CLI_VERSION } from './version.js';

const PACKAGE_NAME = '@cloudglab/zentao-cli';
const CHECK_FILE = path.join(homedir(), '.zentao', 'update-check.json');
const SKIP_COMMANDS = new Set(['help', 'list', 'version', 'install', 'update', 'upgrade', '--help', '-h', '--version', '-v']);

interface UpdateCheckState {
  checkedDate?: string;
  latestVersion?: string;
  currentVersion?: string;
}

export async function runDailyUpdateProbe(commandName?: string): Promise<void> {
  if (!commandName || SKIP_COMMANDS.has(commandName)) return;
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.ZENTAO_SKIP_UPDATE_CHECK === 'true') return;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const state = await readUpdateCheckState();
    if (state.checkedDate === today) return;

    await writeUpdateCheckState({ ...state, checkedDate: today, currentVersion: CLI_VERSION });

    const latestVersion = await getLatestPackageVersion();
    await writeUpdateCheckState({ checkedDate: today, latestVersion, currentVersion: CLI_VERSION });

    if (!isNewerVersion(latestVersion, CLI_VERSION)) return;

    process.stderr.write(`检测到 zentao CLI 新版本 ${latestVersion}（当前 ${CLI_VERSION}），开始自动更新...\n`);
    await runUpdateCommand(['--skip-config-check']);
    process.stderr.write('zentao CLI 更新完成，下次命令将使用新版本。\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`zentao CLI 自动更新检查失败，已继续执行当前命令：${message}\n`);
  }
}

async function readUpdateCheckState(): Promise<UpdateCheckState> {
  try {
    return JSON.parse(await readFile(CHECK_FILE, 'utf8')) as UpdateCheckState;
  } catch {
    return {};
  }
}

async function writeUpdateCheckState(state: UpdateCheckState): Promise<void> {
  await mkdir(path.dirname(CHECK_FILE), { recursive: true, mode: 0o700 });
  await writeFile(CHECK_FILE, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

async function getLatestPackageVersion(): Promise<string> {
  const stdout = await runCommandOutput('npm', ['view', PACKAGE_NAME, 'version', '--silent']);
  const version = stdout.trim();
  if (!version) throw new Error('npm view 没有返回最新版本号');
  return version;
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

function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  const latest = parseVersion(latestVersion);
  const current = parseVersion(currentVersion);
  for (let index = 0; index < Math.max(latest.length, current.length); index += 1) {
    const latestPart = latest[index] ?? 0;
    const currentPart = current[index] ?? 0;
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  return false;
}

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/, '')
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

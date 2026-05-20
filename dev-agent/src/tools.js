import fs from 'fs';
import path from 'path';
import { execa } from 'execa';
import 'dotenv/config';
import { logger } from './logger.js';

const PROJECT_DIR = path.resolve(process.env.PROJECT_DIR || '/var/www/clipai-backend');
const PM2_SERVER = process.env.PM2_SERVER_NAME || 'moodclip-server';

const COMMAND_WHITELIST = [
  /^npm install$/,
  /^npm install .+$/,
  /^npm run build$/,
  /^npm run build:frontend$/,
  /^npm run build:server$/,
  /^pm2 restart .+$/,
  /^pm2 status$/,
];

function safePath(relativePath) {
  const resolved = path.resolve(PROJECT_DIR, relativePath);
  if (!resolved.startsWith(PROJECT_DIR)) {
    throw new Error(`Caminho fora do projeto: ${relativePath}`);
  }
  return resolved;
}

function isCommandAllowed(cmd) {
  return COMMAND_WHITELIST.some(re => re.test(cmd.trim()));
}

// --- read_file ---
export async function read_file({ path: filePath, start_line, end_line }) {
  const abs = safePath(filePath);
  if (!fs.existsSync(abs)) {
    return { error: `Arquivo não encontrado: ${filePath}` };
  }
  const raw = fs.readFileSync(abs, 'utf8');
  const lines = raw.split('\n');
  const from = start_line ? start_line - 1 : 0;
  const to = end_line ? end_line : lines.length;
  const slice = lines.slice(from, to);
  const numbered = slice.map((l, i) => `${from + i + 1}\t${l}`).join('\n');
  return { content: numbered, total_lines: lines.length };
}

// --- write_file ---
export async function write_file({ path: filePath, content }, userId) {
  const abs = safePath(filePath);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(abs)) {
    const backupPath = abs + '.bak.' + Date.now();
    fs.copyFileSync(abs, backupPath);
    logger.audit(userId, 'BACKUP', `${filePath} → ${path.basename(backupPath)}`);
  }
  fs.writeFileSync(abs, content, 'utf8');
  logger.audit(userId, 'WRITE_FILE', filePath);
  return { ok: true, path: filePath };
}

// --- list_files ---
export async function list_files({ path: dirPath, recursive = false, pattern }) {
  const abs = safePath(dirPath);
  if (!fs.existsSync(abs)) {
    return { error: `Diretório não encontrado: ${dirPath}` };
  }
  function walk(dir, depth = 0) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const result = [];
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist' || e.name === 'dist-server') continue;
      const rel = path.relative(PROJECT_DIR, path.join(dir, e.name));
      if (e.isDirectory()) {
        result.push(`📁 ${rel}/`);
        if (recursive && depth < 4) result.push(...walk(path.join(dir, e.name), depth + 1));
      } else {
        if (pattern) {
          const re = new RegExp(pattern.replace('*', '.*').replace('.', '\\.'));
          if (!re.test(e.name)) continue;
        }
        result.push(`📄 ${rel}`);
      }
    }
    return result;
  }
  const files = walk(abs);
  return { files, count: files.length };
}

// --- run_command ---
export async function run_command({ command, cwd: relativeCwd = '.' }, userId) {
  if (!isCommandAllowed(command)) {
    logger.warn(userId, 'BLOCKED_COMMAND', command);
    return { error: `Comando não permitido: "${command}". Use apenas comandos da whitelist.` };
  }
  const workdir = safePath(relativeCwd);
  logger.audit(userId, 'RUN_COMMAND', `${command} (cwd: ${relativeCwd})`);
  try {
    const [cmd, ...args] = command.split(' ');
    const result = await execa(cmd, args, { cwd: workdir, timeout: 120_000 });
    return { stdout: result.stdout, stderr: result.stderr, exit_code: result.exitCode };
  } catch (err) {
    return {
      error: err.message,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exit_code: err.exitCode ?? 1,
    };
  }
}

// --- ask_confirmation (implementado no agent.js via callback) ---
// Este módulo exporta apenas o schema; a lógica de I/O está no agent.js

// --- send_progress (implementado no agent.js via callback) ---

export { PROJECT_DIR, PM2_SERVER };

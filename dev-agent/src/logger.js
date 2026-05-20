import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', 'agent.log');

function timestamp() {
  return new Date().toISOString();
}

function write(level, userId, action, detail) {
  const line = `[${timestamp()}] [${level}] user:${userId} | ${action}${detail ? ' | ' + detail : ''}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
  if (level === 'ERROR') {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}

export const logger = {
  info: (userId, action, detail) => write('INFO', userId, action, detail),
  warn: (userId, action, detail) => write('WARN', userId, action, detail),
  error: (userId, action, detail) => write('ERROR', userId, action, detail),
  audit: (userId, action, detail) => write('AUDIT', userId, action, detail),
};

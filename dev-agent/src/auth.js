import 'dotenv/config';
import { logger } from './logger.js';

const ALLOWED_IDS = (process.env.ALLOWED_USER_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(Number);

export function isAuthorized(userId) {
  return ALLOWED_IDS.includes(userId);
}

export function requireAuth(userId) {
  if (!isAuthorized(userId)) {
    logger.warn(userId, 'UNAUTHORIZED_ACCESS', `user ${userId} not in whitelist`);
    throw new Error('Acesso não autorizado.');
  }
}

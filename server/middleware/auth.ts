import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../services/supabase.service.js';

export interface AuthRequest extends Request {
  user?: { id: string; email?: string };
}

interface JwtPayload { sub?: string; email?: string; exp?: number; }

// Cache em memória: token → { user, expiresAt }
// Evita chamar o Supabase a cada request para o mesmo token
const tokenCache = new Map<string, { user: { id: string; email?: string }; expiresAt: number }>();
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // limpa a cada 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokenCache) {
    if (val.expiresAt <= now) tokenCache.delete(key);
  }
}, CACHE_CLEANUP_INTERVAL);

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;

  if (!authHeader && !queryToken) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const token = authHeader ? authHeader.split(' ')[1] : queryToken;

  // 1. Verifica cache — token já validado recentemente, zero rede
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    return next();
  }

  // 2. Valida localmente — sem chamada de rede
  const payload = parseJwtPayload(token);
  if (payload?.sub && !isTokenExpired(payload)) {
    const user = { id: payload.sub, email: payload.email };
    // Armazena no cache até 5 min antes do exp real
    const expiresAt = payload.exp ? (payload.exp * 1000) - 5 * 60 * 1000 : Date.now() + 50 * 60 * 1000;
    tokenCache.set(token, { user, expiresAt });
    req.user = user;
    return next();
  }

  // 3. Token expirado ou malformado — tenta Supabase como último recurso
  try {
    const supabaseCheck = getSupabase().auth.getUser(token);
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    const result = await Promise.race([supabaseCheck, timeout]);

    if (result && 'data' in result && result.data.user) {
      req.user = { id: result.data.user.id, email: result.data.user.email ?? undefined };
      return next();
    }
  } catch {
    // sem acesso ao Supabase
  }

  return res.status(401).json({ error: 'Sessão inválida ou expirada' });
}

import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../services/supabase.service.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;
  
  if (!authHeader && !queryToken) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const token = authHeader ? authHeader.split(' ')[1] : queryToken;
  const supabase = getSupabase();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Erro ao validar token' });
  }
}

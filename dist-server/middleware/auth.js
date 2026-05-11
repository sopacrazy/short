import { getSupabase } from '../services/supabase.service.js';
export async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
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
    }
    catch (err) {
        return res.status(401).json({ error: 'Erro ao validar token' });
    }
}

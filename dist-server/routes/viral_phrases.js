import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getUserAIKeys } from '../services/settings.service.js';
import { generateViralPhrase } from '../services/openai.service.js';
import { getSupabase } from '../services/supabase.service.js';
const router = Router();
router.post('/generate', authMiddleware, async (req, res) => {
    const { query, category } = req.body;
    const userId = req.user.id;
    if (!query)
        return res.status(400).json({ error: 'Query é obrigatória' });
    try {
        const keys = await getUserAIKeys(userId);
        const result = await generateViralPhrase(query, keys.openai_key, category);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao gerar frase viral' });
    }
});
// Upload de imagem composta (base64) → Supabase → URL pública
router.post('/upload-image', authMiddleware, async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64)
        return res.status(400).json({ error: 'imageBase64 é obrigatório' });
    try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `viral_${req.user.id}_${Date.now()}.jpg`;
        const supabase = getSupabase();
        const { error } = await supabase.storage
            .from('videos')
            .upload(`viral/${fileName}`, buffer, { contentType: 'image/jpeg', upsert: true });
        if (error)
            throw new Error(error.message);
        const { data } = supabase.storage.from('videos').getPublicUrl(`viral/${fileName}`);
        res.json({ url: data.publicUrl });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao fazer upload' });
    }
});
// Agendar post no Instagram
router.post('/schedule', authMiddleware, async (req, res) => {
    const { imageUrl, caption, scheduledAt } = req.body;
    const userId = req.user.id;
    if (!imageUrl || !scheduledAt)
        return res.status(400).json({ error: 'imageUrl e scheduledAt são obrigatórios' });
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('viral_scheduled_posts')
            .insert({ user_id: userId, image_url: imageUrl, caption: caption ?? '', scheduled_at: scheduledAt, status: 'pending' })
            .select('id')
            .single();
        if (error)
            throw new Error(error.message);
        res.json({ id: data.id, scheduled_at: scheduledAt });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao agendar post' });
    }
});
// Listar posts agendados do usuário
router.get('/scheduled', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('viral_scheduled_posts')
            .select('*')
            .eq('user_id', req.user.id)
            .order('scheduled_at', { ascending: true });
        if (error)
            throw new Error(error.message);
        res.json(data ?? []);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao buscar agendamentos' });
    }
});
// Cancelar post agendado
router.delete('/scheduled/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('viral_scheduled_posts')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .eq('status', 'pending');
        if (error)
            throw new Error(error.message);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao cancelar' });
    }
});
export default router;

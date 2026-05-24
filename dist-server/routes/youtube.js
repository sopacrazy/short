import { Router } from 'express';
import { getAuthUrl, exchangeCodeAndStore, isConnected, uploadToYouTube, listAccounts, removeAccount } from '../services/youtube.service.js';
import { getSupabase } from '../services/supabase.service.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
// GET /api/youtube/auth — retorna a URL de autenticação OAuth do Google
router.get('/auth', authMiddleware, (req, res) => {
    const userId = req.user.id;
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ error: 'YouTube não configurado.' });
    }
    try {
        const url = getAuthUrl(userId);
        res.json({ url });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao gerar URL OAuth' });
    }
});
// GET /api/youtube/callback — recebe o código do Google e salva os tokens
router.get('/callback', async (req, res) => {
    const { code, error, state: userId } = req.query;
    const closePopup = (status) => `
    <html>
      <head><title>YouTube Auth</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;background:#0f0f0f;color:#fff">
        <p>${status === 'connected' ? '✅ Conta conectada! Esta janela vai fechar...' : '❌ Erro ao conectar. Tente novamente.'}</p>
        <script>
          window.opener?.postMessage('youtube_${status}', '*');
          setTimeout(() => window.close(), 1500);
        </script>
      </body>
    </html>`;
    if (error || !code || typeof code !== 'string' || !userId || typeof userId !== 'string') {
        return res.send(closePopup('error'));
    }
    try {
        await exchangeCodeAndStore(code, userId);
        res.send(closePopup('connected'));
    }
    catch {
        res.send(closePopup('error'));
    }
});
// GET /api/youtube/status — verifica se há pelo menos uma conta conectada
router.get('/status', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const connected = await isConnected(userId);
        res.json({ connected });
    }
    catch {
        res.json({ connected: false });
    }
});
// GET /api/youtube/accounts — lista todas as contas conectadas do usuário
router.get('/accounts', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const accounts = await listAccounts(userId);
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao listar contas' });
    }
});
// DELETE /api/youtube/accounts/:id — remove uma conta YouTube
router.delete('/accounts/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const accountId = req.params.id;
    try {
        await removeAccount(accountId, userId);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao remover conta' });
    }
});
// POST /api/youtube/upload — publica o vídeo de um projeto no YouTube
router.post('/upload', authMiddleware, async (req, res) => {
    const { projectId, scheduledAt } = req.body;
    const userId = req.user.id;
    if (!projectId)
        return res.status(400).json({ error: 'projectId é obrigatório' });
    const supabase = getSupabase();
    // Verifica se o projeto pertence ao usuário
    const { data: projectCheck } = await supabase.from('projects').select('user_id').eq('id', projectId).single();
    if (!projectCheck || projectCheck.user_id !== userId) {
        return res.status(403).json({ error: 'Não autorizado' });
    }
    // Sem timeout — upload pode demorar para arquivos grandes
    req.socket.setTimeout(0);
    // Busca metadados do projeto
    const { data: metadata, error } = await supabase
        .from('export_metadata')
        .select('video_url, video_title, description, hashtags')
        .eq('project_id', projectId)
        .single();
    if (error || !metadata) {
        return res.status(404).json({ error: 'Metadados não encontrados para este projeto' });
    }
    if (!metadata.video_url) {
        return res.status(400).json({ error: 'Vídeo ainda não renderizado.' });
    }
    // Resolve idioma, tags e conta YouTube da pasta do projeto
    const { data: project } = await supabase
        .from('projects')
        .select('folder_id')
        .eq('id', projectId)
        .single();
    let language = 'pt';
    let folderTags = [];
    let youtubeAccountId;
    if (project?.folder_id) {
        const { data: folder } = await supabase
            .from('folders')
            .select('default_language, default_youtube_tags, youtube_account_id')
            .eq('id', project.folder_id)
            .single();
        if (folder?.default_language)
            language = folder.default_language;
        if (folder?.default_youtube_tags?.length)
            folderTags = folder.default_youtube_tags;
        if (folder?.youtube_account_id)
            youtubeAccountId = folder.youtube_account_id;
    }
    try {
        const youtubeUrl = await uploadToYouTube(metadata.video_url, metadata.video_title, metadata.description, metadata.hashtags ?? [], language, folderTags, scheduledAt, youtubeAccountId, userId);
        // Extrai o video ID da URL (youtube.com/shorts/VIDEO_ID)
        const videoId = youtubeUrl.split('/').pop() ?? null;
        await supabase.from('export_metadata').update({ youtube_url: youtubeUrl }).eq('project_id', projectId);
        // Salva na tabela de agendamentos se foi agendado
        if (scheduledAt && youtubeAccountId) {
            await supabase.from('youtube_schedules').insert({
                project_id: projectId,
                user_id: userId,
                youtube_account_id: youtubeAccountId,
                title: metadata.video_title,
                scheduled_at: new Date(scheduledAt).toISOString(),
                youtube_video_id: videoId,
                youtube_url: youtubeUrl,
                status: 'pending',
            });
        }
        res.json({ youtube_url: youtubeUrl });
    }
    catch (err) {
        console.error('[YouTube Upload Error]:', err);
        const message = err instanceof Error ? err.message : 'Erro ao publicar no YouTube';
        res.status(500).json({ error: message });
    }
});
// GET /api/youtube/schedules — lista agendamentos YouTube do usuário
router.get('/schedules', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { account_id } = req.query;
    try {
        let query = getSupabase()
            .from('youtube_schedules')
            .select('*, youtube_accounts(channel_name, channel_id)')
            .eq('user_id', userId)
            .order('scheduled_at', { ascending: true });
        if (account_id)
            query = query.eq('youtube_account_id', account_id);
        const { data, error } = await query;
        if (error)
            throw new Error(error.message);
        const schedules = data ?? [];
        // Busca video_url de export_metadata pelos project_ids
        const projectIds = schedules.map((s) => s.project_id).filter(Boolean);
        const videoUrlMap = {};
        if (projectIds.length > 0) {
            const { data: metas } = await getSupabase()
                .from('export_metadata')
                .select('project_id, video_url')
                .in('project_id', projectIds);
            (metas ?? []).forEach((m) => { if (m.video_url)
                videoUrlMap[m.project_id] = m.video_url; });
        }
        res.json(schedules.map((s) => ({ ...s, video_url: videoUrlMap[s.project_id] ?? null })));
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro' });
    }
});
// DELETE /api/youtube/schedules/:id — cancela um agendamento YouTube
router.delete('/schedules/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { error } = await getSupabase()
        .from('youtube_schedules')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', userId);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
export default router;

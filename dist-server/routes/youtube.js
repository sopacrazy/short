import { Router } from 'express';
import { getAuthUrl, exchangeCodeAndStore, isConnected, uploadToYouTube } from '../services/youtube.service.js';
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
// GET /api/youtube/status — verifica se há tokens salvos
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
    // Busca metadados + idioma do projeto via pasta
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
    // Resolve idioma e tags fixas da pasta do projeto
    const { data: project } = await supabase
        .from('projects')
        .select('folder_id')
        .eq('id', projectId)
        .single();
    let language = 'pt';
    let folderTags = [];
    if (project?.folder_id) {
        const { data: folder } = await supabase
            .from('folders')
            .select('default_language, default_youtube_tags')
            .eq('id', project.folder_id)
            .single();
        if (folder?.default_language)
            language = folder.default_language;
        if (folder?.default_youtube_tags?.length)
            folderTags = folder.default_youtube_tags;
    }
    try {
        const youtubeUrl = await uploadToYouTube(metadata.video_url, metadata.video_title, metadata.description, metadata.hashtags ?? [], language, folderTags, scheduledAt, userId);
        await supabase
            .from('export_metadata')
            .update({ youtube_url: youtubeUrl })
            .eq('project_id', projectId);
        res.json({ youtube_url: youtubeUrl });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao publicar no YouTube';
        res.status(500).json({ error: message });
    }
});
export default router;

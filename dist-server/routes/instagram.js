import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { uploadReel, uploadPhoto, getInstagramStatus } from '../services/instagram.service';
import { supabase } from '../services/supabase.service';
const router = Router();
// Status da conexão
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const status = await getInstagramStatus();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Publicar Reel
router.post('/upload', authMiddleware, async (req, res) => {
    const { projectId, caption } = req.body;
    const userId = req.user.id;
    try {
        // 1. Buscar metadados de exportação para pegar o caminho do vídeo no storage
        const { data: meta, error } = await supabase
            .from('export_metadata')
            .select('*')
            .eq('project_id', projectId)
            .single();
        if (error || !meta) {
            return res.status(404).json({ error: 'O vídeo ainda não foi renderizado ou não foi encontrado' });
        }
        if (!meta.video_url) {
            return res.status(400).json({ error: 'O vídeo ainda não possui uma URL válida' });
        }
        // Gerar uma Signed URL para garantir que o Instagram consiga baixar sem erros de permissão/cache
        // O caminho no storage é extraído da URL ou reconstruído
        const storagePath = `videos/${projectId}.mp4`;
        const { data: signedData, error: signedError } = await supabase.storage
            .from('videos')
            .createSignedUrl(storagePath, 3600); // 1 hora de validade
        if (signedError || !signedData?.signedUrl) {
            console.error('[Instagram] Erro ao gerar Signed URL:', signedError);
            return res.status(500).json({ error: 'Erro ao gerar link seguro para o Instagram' });
        }
        console.log(`[Instagram] Usando Signed URL para upload: ${signedData.signedUrl}`);
        // 2. Upload para o Instagram usando a URL assinada
        const result = await uploadReel(signedData.signedUrl, caption || meta.video_title);
        // 3. Atualizar metadados com o link do Instagram
        await supabase
            .from('export_metadata')
            .update({
            instagram_url: result.url
        })
            .eq('project_id', projectId);
        res.json({ instagram_url: result.url });
    }
    catch (error) {
        console.error('[Instagram Route Error]', error);
        res.status(500).json({ error: error.message });
    }
});
// Publicar imagem (post de feed)
router.post('/upload-photo', authMiddleware, async (req, res) => {
    const { imageUrl, caption } = req.body;
    if (!imageUrl)
        return res.status(400).json({ error: 'imageUrl é obrigatório' });
    try {
        const result = await uploadPhoto(imageUrl, caption ?? '');
        res.json({ instagram_url: result.url });
    }
    catch (error) {
        console.error('[Instagram Route Error - Photo]', error);
        res.status(500).json({ error: error.message });
    }
});
export default router;

import { Router } from 'express';
import { supabase } from '../services/supabase.service.js';
import { generateImage } from '../services/flux.service.js';
import { getUserAIKeys } from '../services/settings.service.js';
import fetch from 'node-fetch';
const router = Router({ mergeParams: true });
const delay = (ms) => new Promise(r => setTimeout(r, ms));
// Função para baixar do Replicate e subir para o Supabase Storage
async function saveToSupabase(url, projectId, sceneId) {
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
        const buffer = await response.buffer();
        const storagePath = `scenes/${projectId}/${sceneId}_${Date.now()}.png`;
        // Upload para o bucket 'audio' (usado como bucket geral de assets)
        const { error: uploadError } = await supabase.storage
            .from('audio')
            .upload(storagePath, buffer, {
            contentType: 'image/png',
            upsert: true
        });
        if (uploadError)
            throw uploadError;
        // Pega a URL pública
        const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(storagePath);
        return publicUrl;
    }
    catch (err) {
        console.error('[Storage] Erro ao salvar no Supabase:', err);
        throw err;
    }
}
async function generateWithRetry(prompt, style, maxRetries = 4, apiKey) {
    let lastError = new Error('Erro desconhecido');
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const img = await generateImage(prompt, style, apiKey);
            return img.image_url;
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) {
                let waitMs = 4000 * attempt;
                if (lastError.message.includes('429'))
                    waitMs = 12000;
                await delay(waitMs);
            }
        }
    }
    throw lastError;
}
// POST /api/projects/:projectId/images — fluxo SSE
router.post('/', async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { visual_style = 'cinematic' } = req.body;
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
    if (!project)
        return res.status(403).json({ error: 'Não autorizado' });
    const { data: scenes, error: scenesError } = await supabase.from('scenes').select('*').eq('project_id', projectId).order('scene_number');
    if (scenesError || !scenes?.length)
        return res.status(404).json({ error: 'Cenas não encontradas' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    await supabase.from('projects').update({ status: 'generating_images' }).eq('id', projectId);
    for (let idx = 0; idx < scenes.length; idx++) {
        const scene = scenes[idx];
        send({ type: 'generating', scene_number: scene.scene_number, completed: idx, total: scenes.length });
        try {
            const keys = await getUserAIKeys(userId);
            const tempUrl = await generateWithRetry(scene.image_prompt, visual_style, 4, keys.replicate_token);
            // Salva no Supabase Storage
            const finalUrl = await saveToSupabase(tempUrl, projectId, scene.id);
            await supabase.from('scenes').update({ image_url: finalUrl }).eq('id', scene.id);
            // Atualiza miniatura do projeto
            if (scene.scene_number === 1) {
                await supabase.from('projects').update({ thumbnail_url: finalUrl }).eq('id', projectId);
            }
            send({ type: 'scene_done', scene_number: scene.scene_number, image_url: finalUrl, scene_id: scene.id, completed: idx + 1, total: scenes.length });
        }
        catch (err) {
            send({ type: 'scene_error', scene_number: scene.scene_number, error: String(err) });
        }
        if (idx < scenes.length - 1)
            await delay(10000);
    }
    await supabase.from('projects').update({ status: 'images_ready' }).eq('id', projectId);
    send({ type: 'completed' });
    res.end();
});
// POST /api/projects/:projectId/images/:sceneId — regenerar individual
router.post('/:sceneId', async (req, res) => {
    const { projectId, sceneId } = req.params;
    const userId = req.user.id;
    const { visual_style = 'cinematic' } = req.body;
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
    if (!project)
        return res.status(403).json({ error: 'Não autorizado' });
    const { data: scene } = await supabase.from('scenes').select('*').eq('id', sceneId).single();
    if (!scene)
        return res.status(404).json({ error: 'Cena não encontrada' });
    try {
        const keys = await getUserAIKeys(userId);
        const tempUrl = await generateWithRetry(scene.image_prompt, visual_style, 4, keys.replicate_token);
        const finalUrl = await saveToSupabase(tempUrl, projectId, sceneId);
        const { data: updated } = await supabase.from('scenes').update({ image_url: finalUrl }).eq('id', sceneId).select().single();
        if (scene.scene_number === 1) {
            await supabase.from('projects').update({ thumbnail_url: finalUrl }).eq('id', projectId);
        }
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: String(err) });
    }
});
// POST /api/projects/:projectId/images/:sceneId/upload — substituir imagem por upload manual
router.post('/:sceneId/upload', async (req, res) => {
    const { projectId, sceneId } = req.params;
    const userId = req.user.id;
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64)
        return res.status(400).json({ error: 'imageBase64 é obrigatório' });
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
    if (!project)
        return res.status(403).json({ error: 'Não autorizado' });
    const { data: scene } = await supabase.from('scenes').select('*').eq('id', sceneId).single();
    if (!scene)
        return res.status(404).json({ error: 'Cena não encontrada' });
    try {
        const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
        const buffer = Buffer.from(imageBase64, 'base64');
        const storagePath = `scenes/${projectId}/${sceneId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from('audio')
            .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
        if (uploadError)
            throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(storagePath);
        const { data: updated } = await supabase.from('scenes').update({ image_url: publicUrl }).eq('id', sceneId).select().single();
        if (scene.scene_number === 1) {
            await supabase.from('projects').update({ thumbnail_url: publicUrl }).eq('id', projectId);
        }
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: String(err) });
    }
});
export default router;

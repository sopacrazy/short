import { Router } from 'express';
import { supabase } from '../services/supabase.service.js';
import { generateImage } from '../services/flux.service.js';

import { getUserAIKeys } from '../services/settings.service.js';

const router = Router({ mergeParams: true });

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Tenta gerar imagem com até MAX_RETRIES tentativas, respeitando retry_after de 429
async function generateWithRetry(
  prompt: string,
  style: string,
  maxRetries = 4,
  apiKey?: string | null
): Promise<string> {
  let lastError: Error = new Error('Erro desconhecido');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const img = await generateImage(prompt, style, apiKey);
      return img.image_url;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('throttled');
      console.warn(`[Images] Tentativa ${attempt}/${maxRetries} falhou${is429 ? ' (rate limit)' : ''}: ${msg}`);
      if (attempt < maxRetries) {
        // Para 429 extrai retry_after ou usa 12s; para outros erros usa backoff progressivo
        let waitMs = 4000 * attempt;
        if (is429) {
          const match = msg.match(/"retry_after":(\d+)/);
          const retryAfter = match ? parseInt(match[1], 10) : 12;
          waitMs = Math.max(retryAfter * 1000 + 500, 12000);
          console.warn(`[Images] Rate limit — aguardando ${waitMs / 1000}s antes de tentar novamente`);
        }
        await delay(waitMs);
      }
    }
  }
  throw lastError;
}

// POST /api/projects/:projectId/images — gera imagens em SSE (stream por cena)
router.post('/', async (req: any, res) => {
  const { projectId } = req.params as { projectId: string };
  const userId = req.user.id;
  const { visual_style = 'cinematic' } = req.body as { visual_style?: string };

  // Verifica se o projeto pertence ao usuário
  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
  if (!project) return res.status(403).json({ error: 'Não autorizado' });

  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_number');

  if (scenesError || !scenes?.length) {
    return res.status(404).json({ error: 'Cenas não encontradas. Gere o roteiro primeiro.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (data: object) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  await supabase
    .from('projects')
    .update({ status: 'generating_images', updated_at: new Date().toISOString() })
    .eq('id', projectId);

  const total = scenes.length;
  const results: Array<{ scene_number: number; image_url: string | null; error?: string }> = [];

  send({ type: 'started', total, message: `Gerando ${total} imagens com Flux AI...` });

  for (let idx = 0; idx < scenes.length; idx++) {
    const scene = scenes[idx];

    send({
      type: 'generating',
      scene_number: scene.scene_number,
      completed: idx,
      total,
      message: `Cena ${scene.scene_number} de ${total} — enviando para Flux AI...`,
    });

    try {
      const keys = await getUserAIKeys(userId);
      const imageUrl = await generateWithRetry(scene.image_prompt, visual_style, 4, keys.replicate_token);

      await supabase
        .from('scenes')
        .update({ image_url: imageUrl })
        .eq('id', scene.id);

      results.push({ scene_number: scene.scene_number, image_url: imageUrl });

      send({
        type: 'scene_done',
        scene_number: scene.scene_number,
        image_url: imageUrl,
        scene_id: scene.id,
        completed: idx + 1,
        total,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      console.error(`[Images] Cena ${scene.scene_number} falhou após todas as tentativas: ${message}`);
      results.push({ scene_number: scene.scene_number, image_url: null, error: message });

      send({
        type: 'scene_error',
        scene_number: scene.scene_number,
        error: message,
        completed: idx + 1,
        total,
      });
    }

    // 10s entre cenas — Replicate limita a 6 req/min (1 por 10s) com saldo < $5
    if (idx < scenes.length - 1) await delay(10000);
  }

  const allSucceeded = results.every((r) => r.image_url !== null);
  const succeeded = results.filter(r => r.image_url).length;

  await supabase
    .from('projects')
    .update({
      status: allSucceeded ? 'images_ready' : (succeeded > 0 ? 'images_ready' : 'error'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  send({ type: 'completed', results, success: allSucceeded, succeeded, total });
  res.end();
});

// POST /api/projects/:projectId/images/:sceneId — regenerar imagem de uma cena
router.post('/:sceneId', async (req: any, res) => {
  const { projectId, sceneId } = req.params as { projectId: string; sceneId: string };
  const userId = req.user.id;
  const { visual_style = 'cinematic' } = req.body as { visual_style?: string };

  // Verifica se o projeto pertence ao usuário
  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
  if (!project) return res.status(403).json({ error: 'Não autorizado' });

  const { data: scene, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', sceneId)
    .single();

  if (error || !scene) return res.status(404).json({ error: 'Cena não encontrada' });

  try {
    const keys = await getUserAIKeys(userId);
    const imageUrl = await generateWithRetry(scene.image_prompt, visual_style, 4, keys.replicate_token);

    const { data: updated, error: updateError } = await supabase
      .from('scenes')
      .update({ image_url: imageUrl })
      .eq('id', sceneId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);
    return res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem';
    return res.status(500).json({ error: message });
  }
});

// POST /api/projects/:projectId/images/:sceneId/upload — upload de imagem manual para uma cena
router.post('/:sceneId/upload', async (req: any, res) => {
  const { projectId, sceneId } = req.params as { projectId: string; sceneId: string };
  const userId = req.user.id;
  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };

  // Verifica se o projeto pertence ao usuário
  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
  if (!project) return res.status(403).json({ error: 'Não autorizado' });

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'Imagem não fornecida' });
  }

  try {
    const ext = mimeType.split('/')[1] || 'jpg';
    const buffer = Buffer.from(imageBase64, 'base64');
    const storagePath = `scenes/${projectId}/${sceneId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('audio') // Usando bucket existente para simplificar
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(storagePath);
    const imageUrl = urlData.publicUrl;

    const { data: updated, error: updateError } = await supabase
      .from('scenes')
      .update({ image_url: imageUrl })
      .eq('id', sceneId)
      .select()
      .single();

    if (updateError) throw updateError;
    return res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao subir imagem';
    return res.status(500).json({ error: message });
  }
});

export default router;

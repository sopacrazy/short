import { Router } from 'express';
import { supabase } from '../services/supabase.service.js';
import { generateNarration, listVoices } from '../services/elevenlabs.service.js';

import { getUserAIKeys } from '../services/settings.service.js';

const router = Router({ mergeParams: true });

// GET /api/voices — listar vozes disponíveis
router.get('/voices', async (req: any, res) => {
  const userId = req.user.id;
  try {
    const keys = await getUserAIKeys(userId);
    const voices = await listVoices(keys.elevenlabs_key);
    return res.json(voices);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar vozes';
    return res.status(500).json({ error: message });
  }
});

// POST /api/projects/:projectId/narration — gerar narração
router.post('/', async (req: any, res) => {
  const { projectId } = req.params as { projectId: string };
  const userId = req.user.id;
  const { voice_id, speed = 1.0 } = req.body as { voice_id?: string; speed?: number };

  // Verifica se o projeto pertence ao usuário
  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
  if (!project) return res.status(403).json({ error: 'Não autorizado' });

  // Busca o roteiro completo
  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .select('hook, body, cta')
    .eq('project_id', projectId)
    .single();

  if (scriptError || !script) {
    return res.status(404).json({ error: 'Roteiro não encontrado. Gere o roteiro primeiro.' });
  }

  const fullText = `${script.hook}\n\n${script.body}\n\n${script.cta}`;

  await supabase
    .from('projects')
    .update({ status: 'generating_narration', updated_at: new Date().toISOString() })
    .eq('id', projectId);

  try {
    const keys = await getUserAIKeys(userId);
    const { audio: audioBuffer, alignment } = await generateNarration(fullText, voice_id, speed, keys.elevenlabs_key);

    // Upload do áudio para o Supabase Storage
    const fileName = `narrations/${projectId}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName);
    const audioUrl = urlData.publicUrl;

    // Salva no banco
    const { data: narration, error: narrationError } = await supabase
      .from('narrations')
      .upsert({
        project_id: projectId,
        audio_url: audioUrl,
        voice_id: voice_id ?? 'default',
        script_text: fullText,
        timestamps: alignment
      })
      .select()
      .single();

    if (narrationError) throw new Error(narrationError.message);

    await supabase
      .from('projects')
      .update({ status: 'narration_ready', updated_at: new Date().toISOString() })
      .eq('id', projectId);

    return res.json(narration);
  } catch (err) {
    await supabase
      .from('projects')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', projectId);

    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return res.status(500).json({ error: message });
  }
});

export default router;

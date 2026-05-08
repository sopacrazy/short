import { Router } from 'express';
import { supabase } from '../services/supabase.service.js';
import { generateScript } from '../services/openai.service.js';
import type { GenerateScriptRequest } from '../types/index.js';

const router = Router({ mergeParams: true });

// POST /api/projects/:projectId/script — gerar roteiro com IA
router.post('/', async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const {
    topic,
    niche = 'curiosidades',
    duration_target = 45,
    voice_tone = 'dramático e envolvente',
    narration_speed = 'moderado',
    previous_hook,
    previous_title,
  } = req.body as GenerateScriptRequest & { topic: string; previous_hook?: string; previous_title?: string };

  if (!topic) return res.status(400).json({ error: 'topic é obrigatório' });

  // Atualiza status
  await supabase
    .from('projects')
    .update({ status: 'generating_script', updated_at: new Date().toISOString() })
    .eq('id', projectId);

  try {
    const result = await generateScript(topic, niche, duration_target, voice_tone, narration_speed, previous_hook, previous_title);

    // Salva script
    const { data: scriptData, error: scriptError } = await supabase
      .from('scripts')
      .upsert({
        project_id: projectId,
        title: result.script.title,
        hook: result.script.hook,
        body: result.script.body,
        cta: result.script.cta,
        duration_seconds: result.script.duration_seconds,
        voice_tone: result.script.voice_tone,
        narration_speed: result.script.narration_speed,
      }, { onConflict: 'project_id' })
      .select()
      .single();

    if (scriptError) throw new Error(scriptError.message);

    // Remove cenas anteriores e insere novas
    await supabase.from('scenes').delete().eq('project_id', projectId);
    const { data: scenesData, error: scenesError } = await supabase
      .from('scenes')
      .insert(
        result.scenes.map((s) => ({
          project_id: projectId,
          scene_number: s.scene_number,
          description: s.description,
          image_prompt: s.image_prompt,
          duration_seconds: s.duration_seconds,
        }))
      )
      .select();

    if (scenesError) throw new Error(scenesError.message);

    // Salva/atualiza metadata de exportação
    await supabase.from('export_metadata').upsert({
      project_id: projectId,
      video_title: result.metadata.video_title,
      description: result.metadata.description,
      hashtags: result.metadata.hashtags,
    });

    // Atualiza status e título do projeto
    await supabase
      .from('projects')
      .update({
        title: result.script.title,
        status: 'script_ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return res.json({
      script: scriptData,
      scenes: scenesData,
      metadata: result.metadata,
    });
  } catch (err) {
    await supabase
      .from('projects')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', projectId);

    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return res.status(500).json({ error: message });
  }
});

// PATCH /api/projects/:projectId/script — atualizar roteiro manualmente
router.patch('/', async (req, res) => {
  const { projectId } = req.params as { projectId: string };
  const updates = req.body as Partial<{ title: string; hook: string; body: string; cta: string }>;

  const { data, error } = await supabase
    .from('scripts')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;

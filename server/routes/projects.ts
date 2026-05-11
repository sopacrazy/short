import { Router } from 'express';
import { supabase } from '../services/supabase.service.js';
import { generateThumbnailPrompt } from '../services/openai.service.js';
import { generateImage } from '../services/flux.service.js';
import type { Project } from '../types/index.js';

import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/projects — listar projetos (opcionalmente filtrado por folder_id)
router.get('/', authMiddleware, async (req: any, res) => {
  const { folder_id } = req.query as { folder_id?: string };
  const userId = req.user.id;
  
  let query = supabase
    .from('projects')
    .select('*, export_metadata(youtube_url, instagram_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (folder_id === 'none') query = query.is('folder_id', null);
  else if (folder_id) query = query.eq('folder_id', folder_id);
  
  const { data, error } = await query;

  if (error) {
    console.error('[Projects API] Erro na query:', error);
    return res.status(500).json({ error: error.message });
  }
  
  if (!data?.length) return res.json([]);

  // Busca a primeira cena com imagem de cada projeto para usar como thumbnail
  const { data: scenes } = await supabase
    .from('scenes')
    .select('project_id, image_url')
    .in('project_id', data.map((p: { id: string }) => p.id))
    .not('image_url', 'is', null)
    .order('scene_number');

  const thumbnailMap: Record<string, string> = {};
  for (const s of scenes ?? []) {
    if (!thumbnailMap[s.project_id]) thumbnailMap[s.project_id] = s.image_url;
  }

  return res.json(data.map((p: any) => ({
    ...p,
    youtube_url: p.export_metadata?.youtube_url ?? null,
    instagram_url: p.export_metadata?.instagram_url ?? null,
    thumbnail_url: thumbnailMap[p.id as string] ?? null,
    export_metadata: undefined, // remove o objeto aninhado
  })));
});

// GET /api/projects/:id — buscar projeto com script, cenas, narração e metadata
router.get('/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [projectRes, scriptRes, scenesRes, narrationRes, metadataRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).eq('user_id', userId).single(),
    supabase.from('scripts').select('*').eq('project_id', id).single(),
    supabase.from('scenes').select('*').eq('project_id', id).order('scene_number'),
    supabase.from('narrations').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('export_metadata').select('*').eq('project_id', id).single(),
  ]);

  if (projectRes.error) return res.status(404).json({ error: 'Projeto não encontrado' });

  return res.json({
    project: projectRes.data,
    script: scriptRes.data ?? null,
    scenes: scenesRes.data ?? [],
    narration: narrationRes.data ?? null,
    metadata: metadataRes.data ?? null,
  });
});

// POST /api/projects — criar novo projeto
router.post('/', authMiddleware, async (req: any, res) => {
  const { topic, niche } = req.body as Partial<Project & { niche: string }>;
  const userId = req.user.id;
  if (!topic) return res.status(400).json({ error: 'topic é obrigatório' });

  const { data, error } = await supabase
    .from('projects')
    .insert({ topic, niche: niche ?? null, status: 'draft', user_id: userId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/projects/:id/folder — mover projeto para uma pasta
router.patch('/:id/folder', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { folder_id } = req.body as { folder_id: string | null };
  const { data, error } = await supabase
    .from('projects')
    .update({ folder_id: folder_id ?? null })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PATCH /api/projects/:id/status — atualizar status
router.patch('/:id/status', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { status } = req.body as { status: string };

  const { data, error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/projects/:id/endcard — faz upload de imagem de end card
router.post('/:id/endcard', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };

  // Verifica se o projeto pertence ao usuário
  const { data: projectCheck } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', userId).single();
  if (!projectCheck) return res.status(403).json({ error: 'Não autorizado' });

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 e mimeType são obrigatórios' });
  }

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const buffer = Buffer.from(imageBase64, 'base64');
  const storagePath = `endcard/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(storagePath);
  const url = urlData.publicUrl;

  // Salva URL no export_metadata (cria ou atualiza)
  await supabase
    .from('export_metadata')
    .update({ end_card_url: url })
    .eq('project_id', id);

  return res.json({ url });
});

import { getUserAIKeys } from '../services/settings.service.js';

// POST /api/projects/:id/thumbnail — gera thumbnail personalizada com Flux
router.post('/:id/thumbnail', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [projectRes, scriptRes, metadataRes] = await Promise.all([
    supabase.from('projects').select('topic, niche, user_id').eq('id', id).eq('user_id', userId).single(),
    supabase.from('scripts').select('title, hook').eq('project_id', id).single(),
    supabase.from('export_metadata').select('id').eq('project_id', id).maybeSingle(),
  ]);

  if (projectRes.error || !projectRes.data) return res.status(404).json({ error: 'Projeto não encontrado' });

  const title  = scriptRes.data?.title ?? projectRes.data?.topic ?? 'video';
  const niche  = projectRes.data?.niche ?? 'curiosidades';
  const hook   = scriptRes.data?.hook ?? title;

  try {
    const keys = await getUserAIKeys(userId);
    const imagePrompt = await generateThumbnailPrompt(title, niche, hook, keys.openai_key);
    const finalPrompt = `${imagePrompt}, photorealistic, hyperdetailed, no AI artifacts, no illustration, no CGI, vertical 9:16 portrait`;

    const { image_url } = await generateImage(finalPrompt, 'cinematic', keys.replicate_token);

    if (metadataRes.data) {
      await supabase
        .from('export_metadata')
        .update({ thumbnail_url: image_url })
        .eq('project_id', id);
    } else {
      await supabase
        .from('export_metadata')
        .insert({ project_id: id, thumbnail_url: image_url });
    }

    return res.json({ thumbnail_url: image_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar thumbnail';
    return res.status(500).json({ error: message });
  }
});

// POST /api/projects/:id/soundtrack — salva trilha sonora
router.post('/:id/soundtrack', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { soundtrack_url, music_volume } = req.body as { soundtrack_url: string; music_volume?: number };

  // Verifica propriedade
  const { data: projectCheck } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', userId).single();
  if (!projectCheck) return res.status(403).json({ error: 'Não autorizado' });

  const { error } = await supabase
    .from('export_metadata')
    .update({ soundtrack_url, music_volume: music_volume ?? 0.15 })
    .eq('project_id', id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// DELETE /api/projects/:id — apaga projeto e limpa storage
router.delete('/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  console.log(`[Delete] Tentativa de exclusão: Projeto ${id} pelo usuário ${userId}`);

  // Verifica se o projeto pertence ao usuário - usa query simples para evitar PGRST116
  const { data: projects, error: checkError } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', id);
  
  if (checkError) {
    console.error(`[Delete] Erro ao buscar projeto ${id}:`, checkError);
    return res.status(500).json({ error: 'Erro interno ao validar projeto' });
  }

  if (!projects || projects.length === 0) {
    console.warn(`[Delete] Projeto ${id} não encontrado na tabela 'projects'.`);
    return res.status(404).json({ error: 'Projeto não encontrado ou já excluído' });
  }

  const project = projects[0];

  if (project.user_id !== userId) {
    console.error(`[Delete] BLOQUEADO: Projeto pertence a ${project.user_id}, mas requisitante é ${userId}`);
    return res.status(403).json({ error: 'Você não tem permissão para excluir este projeto' });
  }

  // Limpa arquivos de storage (ignora erros — arquivo pode não existir)
  await Promise.allSettled([
    supabase.storage.from('videos').remove([`videos/${id}.mp4`]),
    supabase.storage.from('audio').remove([`audio/${id}.mp3`]),
    supabase.storage.from('audio').remove([`endcard/${id}.jpg`]),
    supabase.storage.from('audio').remove([`endcard/${id}.png`]),
    supabase.storage.from('audio').remove([`endcard/${id}.webp`]),
  ]);

  // FK CASCADE apaga scripts, scenes, narrations, export_metadata automaticamente
  const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;

import { Router } from 'express';
import { supabase } from '../services/supabase.service.js';

const router = Router();

router.get('/', async (req: any, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

router.get('/:id', async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  return res.json(data);
});

router.post('/', async (req: any, res) => {
  const { name, emoji = '📁', color = '#7B61FF', default_voice_id, default_language, default_youtube_tags } =
    req.body as { name?: string; emoji?: string; color?: string; default_voice_id?: string | null; default_language?: string; default_youtube_tags?: string[] };
  const userId = req.user.id;
  if (!name?.trim()) return res.status(400).json({ error: 'name é obrigatório' });

  const full = { 
    name: name.trim(), 
    emoji, 
    color, 
    user_id: userId,
    default_voice_id: default_voice_id ?? null, 
    default_language: default_language ?? 'pt', 
    default_youtube_tags: default_youtube_tags ?? [] 
  };
  let result = await supabase.from('folders').insert(full).select().single();
  if (result.error) return res.status(500).json({ error: result.error.message });
  return res.status(201).json(result.data);
});

router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updates = req.body as Record<string, unknown>;

  let result = await supabase.from('folders').update(updates).eq('id', id).eq('user_id', userId).select().single();
  if (result.error) return res.status(500).json({ error: result.error.message });
  return res.json(result.data);
});

router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { error } = await supabase.from('folders').delete().eq('id', id).eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;

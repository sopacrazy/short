import { Router } from 'express';
import { supabase } from '../services/supabase.service.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  return res.json(data);
});

router.post('/', async (req, res) => {
  const { name, emoji = '📁', color = '#7B61FF', default_voice_id, default_language } =
    req.body as { name?: string; emoji?: string; color?: string; default_voice_id?: string | null; default_language?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'name é obrigatório' });

  // Tenta inserir com colunas de voz/idioma; faz fallback sem elas se a migration ainda não foi rodada
  const full = { name: name.trim(), emoji, color, default_voice_id: default_voice_id ?? null, default_language: default_language ?? 'pt' };
  let result = await supabase.from('folders').insert(full).select().single();
  if (result.error) {
    result = await supabase.from('folders').insert({ name: name.trim(), emoji, color }).select().single();
  }
  if (result.error) return res.status(500).json({ error: result.error.message });
  return res.status(201).json(result.data);
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body as Record<string, unknown>;

  // Tenta atualizar com todos os campos; se falhar (colunas ainda não existem), tenta só com os campos base
  let result = await supabase.from('folders').update(updates).eq('id', id).select().single();
  if (result.error) {
    const { default_voice_id: _v, default_language: _l, ...base } = updates;
    result = await supabase.from('folders').update(base).eq('id', id).select().single();
  }
  if (result.error) return res.status(500).json({ error: result.error.message });
  return res.json(result.data);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;

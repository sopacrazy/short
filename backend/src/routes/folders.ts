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

router.post('/', async (req, res) => {
  const { name, emoji = '📁', color = '#7B61FF' } = req.body as { name?: string; emoji?: string; color?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'name é obrigatório' });
  const { data, error } = await supabase
    .from('folders')
    .insert({ name: name.trim(), emoji, color })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body as Record<string, unknown>;
  const { data, error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { generateCuriosityPost, generateCuriositySuggestions, generateAdvancedPostImage } from '../services/curiosity_post.service.js';
import { generateImage } from '../services/flux.service.js';
import { getUserAIKeys } from '../services/settings.service.js';
import { supabase } from '../services/supabase.service.js';

const router = Router();

router.post('/generate', authMiddleware, async (req: any, res) => {
  const { curiosity } = req.body;
  const userId = req.user.id;

  if (!curiosity || typeof curiosity !== 'string' || !curiosity.trim()) {
    return res.status(400).json({ error: 'O campo curiosity é obrigatório' });
  }

  try {
    const { language = 'pt' } = req.body;
    const keys = await getUserAIKeys(userId);
    const post = await generateCuriosityPost(curiosity.trim(), keys.openai_key, language);
    res.json(post);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar post';
    res.status(500).json({ error: message });
  }
});

router.post('/image', authMiddleware, async (req: any, res) => {
  const { prompt } = req.body;
  const userId = req.user.id;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'O campo prompt é obrigatório' });
  }

  try {
    const keys = await getUserAIKeys(userId);
    const result = await generateImage(prompt, 'cinematic', keys.replicate_token, '1:1');
    res.json({ url: result.image_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem';
    res.status(500).json({ error: message });
  }
});

router.post('/advanced-image', authMiddleware, async (req: any, res) => {
  const { title_white, title_yellow, description, image_prompt } = req.body;
  const userId = req.user.id;

  if (!title_white || !title_yellow || !description || !image_prompt) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  try {
    const keys = await getUserAIKeys(userId);
    const dataUrl = await generateAdvancedPostImage(
      title_white, title_yellow, description, image_prompt, keys.openai_key,
    );

    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `curiosity_adv_${userId}_${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(`curiosity/${fileName}`, buffer, { contentType: 'image/png', upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = supabase.storage
      .from('videos')
      .getPublicUrl(`curiosity/${fileName}`);
    if (!publicData?.publicUrl) throw new Error('Não foi possível gerar URL para a imagem');

    res.json({ url: publicData.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem avançada';
    res.status(500).json({ error: message });
  }
});

router.post('/suggestions', authMiddleware, async (req: any, res) => {
  const { query, count = 5 } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'O campo query é obrigatório' });
  }
  try {
    const keys = await getUserAIKeys(req.user.id);
    const suggestions = await generateCuriositySuggestions(query.trim(), count, keys.openai_key);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao gerar sugestões' });
  }
});

// Upload de imagem composta (base64) → Supabase storage → URL pública
router.post('/upload-composed', authMiddleware, async (req: any, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 é obrigatório' });
  }
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `curiosity_${req.user.id}_${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(`curiosity/${fileName}`, buffer, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const storagePath = `curiosity/${fileName}`;
    const { data: publicData } = supabase.storage
      .from('videos')
      .getPublicUrl(storagePath);

    if (!publicData?.publicUrl) throw new Error('Não foi possível gerar URL para a imagem');

    res.json({ url: publicData.publicUrl, path: storagePath });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro no upload' });
  }
});

export default router;

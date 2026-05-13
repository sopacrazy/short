import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getUserAIKeys } from '../services/settings.service.js';
import { generateViralPhrase } from '../services/openai.service.js';

const router = Router();

router.post('/generate', authMiddleware, async (req: any, res) => {
  const { query } = req.body;
  const userId = req.user.id;

  if (!query) return res.status(400).json({ error: 'Query é obrigatória' });

  try {
    const keys = await getUserAIKeys(userId);
    const result = await generateViralPhrase(query, keys.openai_key);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar frase viral';
    res.status(500).json({ error: message });
  }
});

export default router;

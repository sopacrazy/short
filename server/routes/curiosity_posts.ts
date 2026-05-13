import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createCuriosityPost,
  updateCuriosityPost,
  listCuriosityPosts,
  deleteCuriosityPost,
  PostStatus,
} from '../services/curiosity_posts.service.js';

const router = Router();

// Listar posts (com filtro opcional de status)
router.get('/', authMiddleware, async (req: any, res) => {
  const { status } = req.query;
  try {
    const posts = await listCuriosityPosts(req.user.id, status as PostStatus | undefined);
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Criar post (rascunho automático)
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const post = await createCuriosityPost(req.user.id, req.body);
    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar post (agendar, cancelar, etc.)
router.patch('/:id', authMiddleware, async (req: any, res) => {
  try {
    const post = await updateCuriosityPost(req.params.id, req.user.id, req.body);
    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Apagar post
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    await deleteCuriosityPost(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

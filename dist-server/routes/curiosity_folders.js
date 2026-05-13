import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { listFolders, createFolder, updateFolder, deleteFolder, } from '../services/curiosity_folders.service.js';
const router = Router();
router.get('/', authMiddleware, async (req, res) => {
    try {
        const folders = await listFolders(req.user.id);
        res.json(folders);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro' });
    }
});
router.post('/', authMiddleware, async (req, res) => {
    const { name, emoji = '📁', language = 'pt', logo_data = null } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name é obrigatório' });
    try {
        const folder = await createFolder(req.user.id, name, emoji, language, logo_data);
        res.json(folder);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro' });
    }
});
router.patch('/:id', authMiddleware, async (req, res) => {
    const { name, emoji, language, logo_data } = req.body;
    try {
        const folder = await updateFolder(req.user.id, req.params.id, { name, emoji, language, logo_data });
        res.json(folder);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro' });
    }
});
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await deleteFolder(req.user.id, req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erro' });
    }
});
export default router;

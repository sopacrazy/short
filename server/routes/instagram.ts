import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getAuthUrl,
  exchangeCodeAndStore,
  getInstagramStatus,
  getInstagramAccounts,
  disconnectAccount,
  uploadReel,
  uploadPhoto,
  scheduleReel,
} from '../services/instagram.service.js';
import { getSupabase } from '../services/supabase.service.js';

const router = Router();

// GET /api/instagram/auth
router.get('/auth', authMiddleware, (req: any, res) => {
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
    return res.status(503).json({ error: 'Instagram OAuth não configurado no servidor.' });
  }
  try {
    const url = getAuthUrl(req.user.id);
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/callback
router.get('/callback', async (req, res) => {
  const { code, error, state: userId } = req.query;

  const closePopup = (status: 'connected' | 'error', message = '') => `
    <html>
      <head><title>Instagram Auth</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;background:#0f0f0f;color:#fff">
        <p style="font-size:18px">${status === 'connected' ? '✅ Instagram conectado! Esta janela vai fechar...' : `❌ ${message || 'Erro ao conectar. Tente novamente.'}`}</p>
        <script>
          window.opener?.postMessage('instagram_${status}', '*');
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
    </html>`;

  if (error || !code || typeof code !== 'string' || !userId || typeof userId !== 'string') {
    return res.send(closePopup('error', 'Autorização cancelada ou inválida.'));
  }

  try {
    await exchangeCodeAndStore(code, userId);
    res.send(closePopup('connected'));
  } catch (err: any) {
    console.error('[Instagram Callback Error]', err.message);
    res.send(closePopup('error', err.message));
  }
});

// GET /api/instagram/status
router.get('/status', authMiddleware, async (req: any, res) => {
  try {
    const status = await getInstagramStatus(req.user.id);
    res.json(status);
  } catch {
    res.json({ connected: false });
  }
});

// GET /api/instagram/accounts
router.get('/accounts', authMiddleware, async (req: any, res) => {
  try {
    const accounts = await getInstagramAccounts(req.user.id);
    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/instagram/accounts/:id
router.delete('/accounts/:id', authMiddleware, async (req: any, res) => {
  try {
    await disconnectAccount(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instagram/upload — publica Reel de um projeto
router.post('/upload', authMiddleware, async (req: any, res) => {
  const { projectId, caption, instagram_account_id } = req.body;
  const userId = req.user.id;

  if (!projectId) return res.status(400).json({ error: 'projectId é obrigatório' });

  try {
    const supabase = getSupabase();
    const { data: meta, error } = await supabase
      .from('export_metadata')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error || !meta?.video_url) {
      return res.status(404).json({ error: 'Vídeo não encontrado ou ainda não renderizado' });
    }

    const storagePath = `videos/${projectId}.mp4`;
    const { data: publicData } = getSupabase().storage.from('videos').getPublicUrl(storagePath);
    const videoUrl = publicData?.publicUrl ?? meta.video_url;

    const result = await uploadReel(videoUrl, caption || meta.video_title, userId, instagram_account_id);

    await supabase
      .from('export_metadata')
      .update({ instagram_url: result.url })
      .eq('project_id', projectId);

    res.json({ instagram_url: result.url });
  } catch (err: any) {
    console.error('[Instagram Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instagram/upload-photo
router.post('/upload-photo', authMiddleware, async (req: any, res) => {
  const { imageUrl, caption, instagram_account_id } = req.body;
  const userId = req.user.id;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl é obrigatório' });
  try {
    const result = await uploadPhoto(imageUrl, caption ?? '', userId, instagram_account_id);
    res.json({ instagram_url: result.url });
  } catch (err: any) {
    console.error('[Instagram Route Error - Photo]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/schedules
router.get('/schedules', authMiddleware, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const { data, error } = await getSupabase()
      .from('scheduled_reels')
      .select('*, instagram_accounts(username)')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    const rows = (data ?? []).map((r: any) => ({
      ...r,
      instagram_username: r.instagram_accounts?.username ?? null,
    }));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/instagram/schedules/:id
router.delete('/schedules/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  try {
    const { error } = await getSupabase()
      .from('scheduled_reels')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/instagram/schedules/:id
router.patch('/schedules/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { scheduledAt } = req.body;
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt é obrigatório' });
  try {
    const { error } = await getSupabase()
      .from('scheduled_reels')
      .update({ scheduled_at: scheduledAt, status: 'pending' })
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instagram/schedule-reel
router.post('/schedule-reel', authMiddleware, async (req: any, res) => {
  const { projectId, caption, scheduledAt, instagram_account_id } = req.body;
  const userId = req.user.id;
  if (!projectId || !scheduledAt) return res.status(400).json({ error: 'projectId e scheduledAt são obrigatórios' });

  try {
    const supabase = getSupabase();
    const { data: meta, error } = await supabase
      .from('export_metadata')
      .select('video_url, video_title')
      .eq('project_id', projectId)
      .single();

    if (error || !meta?.video_url) return res.status(404).json({ error: 'Vídeo não encontrado ou ainda não renderizado' });

    const storagePath = `videos/${projectId}.mp4`;
    const { data: publicData } = supabase.storage.from('videos').getPublicUrl(storagePath);
    const videoUrl = publicData?.publicUrl ?? meta.video_url;

    await scheduleReel(userId, videoUrl, caption || meta.video_title, scheduledAt, instagram_account_id);
    res.json({ ok: true, scheduledAt });
  } catch (err: any) {
    console.error('[Instagram Schedule Reel Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

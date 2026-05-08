import { Router } from 'express';
import { enqueueRender, subscribeToRender, getQueueStatus } from '../queue/render.queue.js';
import { supabase } from '../services/supabase.service.js';

const router = Router({ mergeParams: true });

// POST /api/projects/:projectId/render — enfileira renderização
router.post('/', async (req, res) => {
  const { projectId } = req.params as { projectId: string };

  const { data: project, error } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();

  if (error || !project) return res.status(404).json({ error: 'Projeto não encontrado' });

  if (project.status === 'rendering') {
    return res.status(409).json({ error: 'Projeto já está sendo renderizado' });
  }

  if (project.status === 'completed') {
    const { data: meta } = await supabase
      .from('export_metadata')
      .select('video_url')
      .eq('project_id', projectId)
      .single();

    if (meta?.video_url) {
      return res.json({ message: 'Vídeo já renderizado', videoUrl: meta.video_url });
    }
  }

  enqueueRender(projectId);

  return res.json({
    message: 'Renderização adicionada à fila',
    queue: getQueueStatus(),
  });
});

// GET /api/projects/:projectId/render/status — status via SSE (Server-Sent Events)
router.get('/status', (req, res) => {
  const { projectId } = req.params as { projectId: string };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Envia status atual imediatamente
  supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single()
    .then(({ data }) => {
      if (data) send({ type: 'current_status', status: data.status });
    });

  const unsubscribe = subscribeToRender(projectId, (event) => {
    send(event);
    // Fecha a conexão SSE quando renderização terminar ou der erro
    if (event.type === 'completed' || event.type === 'error') {
      setTimeout(() => res.end(), 500);
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// GET /api/render/queue — status geral da fila
router.get('/queue', (_req, res) => {
  res.json(getQueueStatus());
});

export default router;

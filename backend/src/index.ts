import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Carrega .env local (dev). Em produção as vars vêm do dashboard do Vercel.
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';

import projectsRouter from './routes/projects.js';
import { generateThemeSuggestions } from './services/openai.service.js';
import scriptsRouter from './routes/scripts.js';
import narrationRouter from './routes/narration.js';
import imagesRouter from './routes/images.js';
import renderRouter from './routes/render.js';
import { listVoices } from './services/elevenlabs.service.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN,
      supabase: !!process.env.SUPABASE_URL,
    },
  });
});

app.get('/api/voices', async (_req, res) => {
  try {
    const voices = await listVoices();
    res.json(voices);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro';
    res.status(500).json({ error: message });
  }
});

app.post('/api/topics/suggestions', async (req, res) => {
  const { query, count = 5 } = req.body as { query?: string; count?: number };
  if (!query) return res.status(400).json({ error: 'query é obrigatório' });
  try {
    const themes = await generateThemeSuggestions(query, count);
    return res.json(themes);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro';
    return res.status(500).json({ error: message });
  }
});

app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/script', scriptsRouter);
app.use('/api/projects/:projectId/narration', narrationRouter);
app.use('/api/projects/:projectId/images', imagesRouter);
app.use('/api/projects/:projectId/render', renderRouter);
app.use('/api/render', renderRouter);

// Em desenvolvimento local inicia o servidor. No Vercel exporta o app.
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🚀 AstraShorts Backend rodando em http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    console.log('   Serviços configurados:');
    console.log(`   ${process.env.OPENAI_API_KEY      ? '✅' : '❌'} OpenAI`);
    console.log(`   ${process.env.ELEVENLABS_API_KEY  ? '✅' : '❌'} ElevenLabs`);
    console.log(`   ${process.env.REPLICATE_API_TOKEN ? '✅' : '❌'} Replicate (Flux)`);
    console.log(`   ${process.env.SUPABASE_URL        ? '✅' : '❌'} Supabase\n`);
  });
}

export default app;

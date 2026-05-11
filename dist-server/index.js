import 'dotenv/config';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// Carrega .env local (dev). Em produção as vars vêm do dashboard do Vercel.
const __dirname = dirname(fileURLToPath(import.meta.url));
import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects.js';
import { generateThemeSuggestions } from './services/openai.service.js';
import scriptsRouter from './routes/scripts.js';
import narrationRouter from './routes/narration.js';
import imagesRouter from './routes/images.js';
import renderRouter from './routes/render.js';
import foldersRouter from './routes/folders.js';
import youtubeRouter from './routes/youtube.js';
import { listVoices } from './services/elevenlabs.service.js';
import { authMiddleware } from './middleware/auth.js';
import { existsSync, mkdirSync } from 'fs';
const app = express();
const PORT = Number(process.env.PORT ?? 3001);
// Garante que a pasta de saídas existe
const outputsDir = join(__dirname, '../outputs');
if (!existsSync(outputsDir))
    mkdirSync(outputsDir, { recursive: true });
app.use('/outputs', express.static(outputsDir));
app.use(express.static(join(__dirname, '../public')));
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost'];
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.some(o => origin.startsWith(o)))
            return cb(null, true);
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
            youtube: !!process.env.GOOGLE_CLIENT_ID,
        },
    });
});
import { getUserAIKeys } from './services/settings.service.js';
app.get('/api/voices', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const keys = await getUserAIKeys(userId);
        const voices = await listVoices(keys.elevenlabs_key);
        res.json(voices);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erro';
        res.status(500).json({ error: message });
    }
});
app.post('/api/topics/suggestions', authMiddleware, async (req, res) => {
    const { query, count = 5 } = req.body;
    const userId = req.user.id;
    if (!query)
        return res.status(400).json({ error: 'query é obrigatório' });
    try {
        const keys = await getUserAIKeys(userId);
        const themes = await generateThemeSuggestions(query, count, keys.openai_key);
        return res.json(themes);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erro';
        return res.status(500).json({ error: message });
    }
});
app.use('/api/folders', authMiddleware, foldersRouter);
app.use('/api/youtube', youtubeRouter);
// Servir a trilha sonora padrão da raiz
app.get('/api/static/suspense.mp3', (req, res) => {
    const filePath = join(__dirname, '../suspense.mp3');
    res.sendFile(filePath);
});
// Proxy para áudio (contornar 403/CORS de bancos de música)
app.get('/api/proxy/audio', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string')
        return res.status(400).send('URL necessária');
    try {
        // Adiciona User-Agent para o Pixabay não bloquear o servidor
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://pixabay.com/'
            }
        });
        if (!response.ok)
            throw new Error(`Falha ao buscar áudio (${response.status}): ${response.statusText}`);
        res.setHeader('Content-Type', response.headers.get('Content-Type') || 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        // Converte para buffer e envia
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    }
    catch (err) {
        console.error('Erro no proxy de áudio:', err);
        res.status(500).json({ error: 'Erro ao processar áudio', message: err instanceof Error ? err.message : String(err) });
    }
});
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/script', authMiddleware, scriptsRouter);
app.use('/api/projects/:projectId/narration', authMiddleware, narrationRouter);
app.use('/api/projects/:projectId/images', authMiddleware, imagesRouter);
app.use('/api/projects/:projectId/render', authMiddleware, renderRouter);
app.use('/api/render', authMiddleware, renderRouter);
// Em desenvolvimento local inicia o servidor. No Vercel exporta o app.
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`\n🚀 Clipai Backend rodando em http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health\n`);
        console.log('   Serviços configurados:');
        console.log(`   ${process.env.OPENAI_API_KEY ? '✅' : '❌'} OpenAI`);
        console.log(`   ${process.env.ELEVENLABS_API_KEY ? '✅' : '❌'} ElevenLabs`);
        console.log(`   ${process.env.REPLICATE_API_TOKEN ? '✅' : '❌'} Replicate (Flux)`);
        console.log(`   ${process.env.SUPABASE_URL ? '✅' : '❌'} Supabase\n`);
    });
}
export default app;

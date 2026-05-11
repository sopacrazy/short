import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { supabase } from '../services/supabase.service.js';
import type { SceneData } from '../remotion/VideoComposition.js';

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache do bundle para não rebuildar a cada renderização
let _bundleUrl: string | null = null;

async function getBundle(): Promise<string> {
  if (_bundleUrl) return _bundleUrl;

  console.log('[Render] Criando bundle Remotion (primeira vez ~30s)...');
  const entryPoint = resolve(__dirname, '../remotion/index.ts');

  _bundleUrl = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  console.log('[Render] Bundle criado:', _bundleUrl);
  return _bundleUrl;
}

function detectFfmpeg(): string {
  // Usa o ffmpeg que o próprio Remotion já tem instalado
  // __dirname: server/workers
  const remotionFf = resolve(__dirname, '../../node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
  if (existsSync(remotionFf)) return remotionFf;

  // Tenta também no root direto caso o __dirname varie em prod
  const rootFf = resolve(process.cwd(), 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
  if (existsSync(rootFf)) return rootFf;

  // Linux / macOS
  const unix = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
  const found = unix.find(existsSync);
  if (found) return found;

  return 'ffmpeg'; // fallback ao PATH
}

// Mede duração real do áudio via ffmpeg stderr (funciona com URLs HTTP)
async function getAudioDuration(audioUrl: string, ffmpegBin: string): Promise<number | null> {
  try {
    // ffmpeg -i sem output sai com código 1, mas imprime duração no stderr
    const result = await execAsync(`"${ffmpegBin}" -i "${audioUrl}"`)
      .catch((e: { stderr?: string }) => e);
    const output = (result as { stderr?: string }).stderr ?? '';
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (!match) return null;
    const seconds = +match[1] * 3600 + +match[2] * 60 + +match[3];
    return seconds > 0.5 ? seconds : null;
  } catch {
    return null;
  }
}

function detectChrome(): string | undefined {
  if (process.env.CHROME_EXECUTABLE) return process.env.CHROME_EXECUTABLE;

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  return candidates.find(existsSync);
}

export async function renderVideo(
  projectId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  // 1. Busca dados completos do projeto
  const [projectRes, scriptRes, scenesRes, narrationRes, metadataRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('scripts').select('*').eq('project_id', projectId).single(),
    supabase.from('scenes').select('*').eq('project_id', projectId).order('scene_number'),
    supabase
      .from('narrations')
      .select('audio_url, timestamps')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('export_metadata')
      .select('end_card_url, soundtrack_url, music_volume')
      .eq('project_id', projectId)
      .maybeSingle(),
  ]);

  if (projectRes.error) throw new Error('Projeto não encontrado');
  if (!scriptRes.data) throw new Error('Roteiro não encontrado — gere o roteiro primeiro');
  if (!scenesRes.data?.length) throw new Error('Cenas não encontradas — gere o roteiro primeiro');

  const script = scriptRes.data;
  const scenes = scenesRes.data;
  const audioUrl = narrationRes.data?.audio_url ?? null;
  let timestamps = narrationRes.data?.timestamps ?? null;
  if (typeof timestamps === 'string') {
    try {
      timestamps = JSON.parse(timestamps);
    } catch {
      timestamps = null;
    }
  }
  const meta = metadataRes.data as { end_card_url?: string; soundtrack_url?: string; music_volume?: number } | null;
  const endCardUrl = meta?.end_card_url ?? null;
  let backgroundMusicUrl = meta?.soundtrack_url ?? null;
  const musicVolume = meta?.music_volume ?? 0.22;

  // Garante URL absoluta para trilhas locais
  if (backgroundMusicUrl && backgroundMusicUrl.startsWith('/api')) {
    backgroundMusicUrl = `http://localhost:3001${backgroundMusicUrl}`;
  }

  // Mede duração real do áudio para sincronizar as cenas
  const ffmpegBin = detectFfmpeg();
  let audioDuration = script.duration_seconds as number;
  if (audioUrl) {
    const measured = await getAudioDuration(audioUrl, ffmpegBin);
    if (measured) {
      audioDuration = measured;
      console.log(`[Render] Duração REAL do áudio: ${measured.toFixed(2)}s (Sync OK)`);
    } else {
      console.warn(`[Render] FALHA ao medir áudio. Usando estimativa: ${audioDuration}s. Sync pode falhar.`);
    }
  }

  // Redistribui duração das cenas proporcionalmente à duração real do áudio
  const totalGptDuration = scenes.reduce((sum: number, s: { duration_seconds: number }) => sum + s.duration_seconds, 0);
  const sceneData: SceneData[] = scenes.map((s) => ({
    imageUrl:
      s.image_url ??
      'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1080&h=1920&fit=crop',
    description: s.description,
    durationSeconds: (s.duration_seconds / totalGptDuration) * audioDuration,
  }));

  // Quebra o roteiro em linhas curtas (fallback caso timestamps falhe)
  const scriptLines = buildCaptionLines(
    `${script.hook} ${script.body} ${script.cta}`,
    audioDuration
  );

  // 2. Atualiza status
  await supabase
    .from('projects')
    .update({ status: 'rendering', updated_at: new Date().toISOString() })
    .eq('id', projectId);

  // 3. Bundle + render
  const serveUrl = await getBundle();

  const fps = 30;
  const END_CARD_SECONDS = endCardUrl ? 5 : 0;
  const SAFETY_BUFFER = 2.5; // Margem de segurança para não cortar o final
  const durationInFrames = Math.round((audioDuration + END_CARD_SECONDS + SAFETY_BUFFER) * fps);
  const outputPath = resolve(tmpdir(), `astrashorts-${projectId}.mp4`);

  console.log(`[Render] Renderizando ${audioDuration.toFixed(1)}s @ ${fps}fps → ${outputPath}`);

  const browserExecutable = detectChrome();
  if (!browserExecutable) {
    throw new Error(
      'Chrome não encontrado. Instale o Google Chrome ou defina CHROME_EXECUTABLE no .env'
    );
  }

  const composition = await selectComposition({
    serveUrl,
    id: 'AstraShort',
    inputProps: {
      scenes: sceneData,
      scriptLines,
      audioUrl,
      durationSeconds: audioDuration,
      endCardUrl,
      timestamps,
      backgroundMusicUrl,
      musicVolume,
    },
    puppeteerInstance: undefined,
    browserExecutable,
  });

  // Usa duração calculada do áudio real — calculateMetadata em Root.tsx garante que composition.durationInFrames já está correto
  const actualDuration = durationInFrames;

  await renderMedia({
    composition: { ...composition, durationInFrames: actualDuration },
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    browserExecutable,
    inputProps: {
      scenes: sceneData,
      scriptLines,
      audioUrl,
      durationSeconds: audioDuration,
      endCardUrl,
      timestamps,
      backgroundMusicUrl,
      musicVolume,
    },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 5 === 0) {
        console.log(`[Render] ${pct}% concluído`);
        onProgress?.(pct);
      }
    },
    videoBitrate: '4M',         // ~30MB por minuto — bom para web
    encodingMaxRate: '6M',      // limita picos para streaming suave
    encodingBufferSize: '8M',
    chromiumOptions: {
      disableWebSecurity: true, // necessário para carregar imagens de URLs externas
    },
    timeoutInMilliseconds: 10 * 60 * 1000, // 10 minutos
  });

  console.log('[Render] Renderização concluída. Aplicando faststart...');

  // 4. Aplica -movflags +faststart: move o moov atom para o início do arquivo
  // Isso permite que o browser comece a reproduzir sem baixar o vídeo inteiro
  const faststartPath = outputPath.replace('.mp4', '-web.mp4');
  try {
    await execAsync(`"${ffmpegBin}" -y -i "${outputPath}" -c copy -movflags +faststart "${faststartPath}"`);
    await unlink(outputPath).catch(() => {});
    console.log('[Render] Faststart aplicado com sucesso');
  } catch (e) {
    console.warn('[Render] Faststart falhou, copiando original:', (e as Error).message);
    const { copyFile } = await import('fs/promises');
    await copyFile(outputPath, faststartPath);
    await unlink(outputPath).catch(() => {});
  }

  console.log('[Render] Upload para Supabase Storage...');

  // 5. Upload para Supabase Storage
  const videoBuffer = await readFile(faststartPath);
  const storagePath = `videos/${projectId}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(storagePath, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from('videos').getPublicUrl(storagePath);
  const videoUrl = urlData.publicUrl;

  // Remove arquivo temporário faststart
  await unlink(faststartPath).catch(() => {});

  // 5. Salva URL do vídeo e atualiza status
  await Promise.all([
    supabase
      .from('export_metadata')
      .update({ video_url: videoUrl })
      .eq('project_id', projectId),
    supabase
      .from('projects')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', projectId),
  ]);

  console.log(`[Render] ✅ Vídeo disponível em: ${videoUrl}`);
  return videoUrl;
}

// Divide o roteiro em frases curtas para as legendas (máx 5 palavras por linha)
function buildCaptionLines(text: string, durationSeconds: number): string[] {
  const WORDS_PER_LINE = 4;
  const words = text
    .replace(/["""]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const lines: string[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_LINE) {
    lines.push(words.slice(i, i + WORDS_PER_LINE).join(' '));
  }

  // Garante pelo menos 1 linha por segundo de vídeo
  const maxLines = Math.floor(durationSeconds * 1.5);
  return lines.slice(0, maxLines);
}

import type { Voice } from '../types/index.js';

const BASE_URL = 'https://api.elevenlabs.io/v1';

function headers() {
  return {
    'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    'Content-Type': 'application/json',
  };
}

// Voz padrão em pt-BR — substitua por uma voice_id real do painel ElevenLabs
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam (pt-BR compatível)

export async function listVoices(): Promise<Voice[]> {
  if (!process.env.ELEVENLABS_API_KEY) {
    return [];
  }

  const res = await fetch(`${BASE_URL}/voices`, { headers: headers() });
  if (!res.ok) throw new Error(`ElevenLabs listVoices error: ${res.status}`);

  const data = (await res.json()) as { voices: Array<{ voice_id: string; name: string; description?: string; preview_url?: string }> };
  return data.voices.map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    description: v.description ?? '',
    preview_url: v.preview_url ?? null,
  }));
}

export async function generateNarration(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
  speed: number = 1.0
): Promise<Buffer> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY não configurada. Adicione ao arquivo .env.');
  }

  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS error ${res.status}: ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

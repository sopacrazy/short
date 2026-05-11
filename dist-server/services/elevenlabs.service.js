const BASE_URL = 'https://api.elevenlabs.io/v1';
function headers(apiKey) {
    return {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
    };
}
// Voz padrão em pt-BR — substitua por uma voice_id real do painel ElevenLabs
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam (pt-BR compatível)
export async function listVoices(apiKey) {
    if (!apiKey)
        return [];
    const res = await fetch(`${BASE_URL}/voices`, { headers: headers(apiKey) });
    if (!res.ok)
        throw new Error(`ElevenLabs listVoices error: ${res.status}`);
    const data = (await res.json());
    return data.voices.map((v) => ({
        voice_id: v.voice_id,
        name: v.name,
        description: v.description ?? '',
        preview_url: v.preview_url ?? null,
    }));
}
export async function generateNarration(text, voiceId = DEFAULT_VOICE_ID, speed = 1.0, apiKey) {
    if (!apiKey)
        throw new Error('Configuração ausente: ElevenLabs API Key não encontrada para este usuário.');
    const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}/with-timestamps`, {
        method: 'POST',
        headers: headers(apiKey),
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
    const data = await res.json();
    const audioBuffer = Buffer.from(data.audio_base64, 'base64');
    return { audio: audioBuffer, alignment: data.alignment };
}

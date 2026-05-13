import Replicate from 'replicate';
const FLUX_MODEL = 'black-forest-labs/flux-1.1-pro';
let _client = null;
function getClient() {
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error('REPLICATE_API_TOKEN não configurada. Adicione ao arquivo .env.\n' +
            'Obtenha em: https://replicate.com/account/api-tokens');
    }
    if (!_client) {
        _client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    }
    return _client;
}
export async function generateImage(prompt, visualStyle = 'cinematic', apiKey, aspectRatio = '9:16') {
    if (!apiKey)
        throw new Error('Configuração ausente: Replicate API Token não encontrado para este usuário.');
    const client = new Replicate({ auth: apiKey });
    const styleHint = STYLE_HINTS[visualStyle] ?? STYLE_HINTS['cinematic'];
    const fullPrompt = `${prompt}, ${styleHint}, no text, no watermarks, no AI artifacts`;
    const output = await client.run(FLUX_MODEL, {
        input: {
            prompt: fullPrompt,
            aspect_ratio: aspectRatio,
            output_format: 'webp',
            output_quality: 90,
            safety_tolerance: 5,
            // prompt_upsampling: false — NÃO usar: reescreve o prompt e gera imagens erradas
            seed: Math.floor(Math.random() * 2147483647), // seed aleatório garante imagens únicas
        },
    });
    let imageUrl;
    if (typeof output === 'string') {
        imageUrl = output;
    }
    else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        imageUrl = typeof first === 'string' ? first : String(first);
    }
    else if (output && typeof output.url === 'function') {
        imageUrl = output.url();
    }
    else {
        throw new Error(`Formato de resposta inesperado do Replicate: ${JSON.stringify(output)}`);
    }
    return { image_url: imageUrl };
}
const STYLE_HINTS = {
    cinematic: 'shot on ARRI Alexa, RAW photo, photojournalism, natural light, shallow depth of field, film grain, ultra-sharp, hyperrealistic',
    cyberpunk: 'RAW photo, neon-lit urban night scene, wet streets reflection, photorealistic, shot on Sony A7IV',
    illustration: 'vibrant 2D digital illustration, bold colors, modern flat art, clean lines',
    realistic: 'RAW photo, shot on Canon EOS R5 85mm f/1.4, natural lighting, ultra-sharp focus, hyperrealistic, photojournalism',
};

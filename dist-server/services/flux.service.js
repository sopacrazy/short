import Replicate from "replicate";
const FLUX_MODEL = "black-forest-labs/flux-1.1-pro";
let _client = null;
function getClient() {
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN não configurada. Adicione ao arquivo .env.\n" +
            "Obtenha em: https://replicate.com/account/api-tokens");
    }
    if (!_client) {
        _client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    }
    return _client;
}
export async function generateImage(prompt, visualStyle = "cinematic", apiKey, aspectRatio = "9:16") {
    if (!apiKey)
        throw new Error("Configuração ausente: Replicate API Token não encontrado para este usuário.");
    const client = new Replicate({ auth: apiKey });
    const styleHint = STYLE_HINTS[visualStyle] ?? STYLE_HINTS["cinematic"];
    const fullPrompt = `${prompt}, ${styleHint}, no text, no watermarks, no AI artifacts`;
    const output = await client.run(FLUX_MODEL, {
        input: {
            prompt: fullPrompt,
            aspect_ratio: aspectRatio,
            output_format: "webp",
            output_quality: 90,
            safety_tolerance: 5,
            // prompt_upsampling: false — NÃO usar: reescreve o prompt e gera imagens erradas
            seed: Math.floor(Math.random() * 2147483647), // seed aleatório garante imagens únicas
        },
    });
    let imageUrl;
    if (typeof output === "string") {
        imageUrl = output;
    }
    else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        imageUrl = typeof first === "string" ? first : String(first);
    }
    else if (output &&
        typeof output.url === "function") {
        imageUrl = output.url();
    }
    else {
        throw new Error(`Formato de resposta inesperado do Replicate: ${JSON.stringify(output)}`);
    }
    return { image_url: imageUrl };
}
// ─── STYLE_HINTS ─────────────────────────────────────────────────────────────
// Cada estilo é um sufixo que reforça o mood/técnica sem reescrever o prompt
// principal gerado pelo GPT. O GPT já embute câmera, lente e iluminação no
// image_prompt — o style hint serve como camada extra de ancoragem visual.
// ─────────────────────────────────────────────────────────────────────────────
const STYLE_HINTS = {
    // ── Conteúdo real / documental ────────────────────────────────────────────
    // Natureza e animais: máximo realismo zoológico, sem estilização
    wildlife: "wildlife documentary photography, BBC Earth / National Geographic style, " +
        "Canon EOS R5 600mm telephoto lens, natural habitat, scientifically accurate species appearance, " +
        "no anthropomorphization, no fantasy coloring, hyperrealistic",
    // Eventos históricos, personagens e lugares do passado
    historical: "historical documentary photography, period-accurate reconstruction, " +
        "archival footage aesthetic, muted desaturated tones, photojournalism, " +
        "Canon F-1 film grain texture, no modern elements, hyperrealistic",
    // Ciência, medicina, tecnologia, fatos verificáveis
    documentary: "editorial documentary photography, National Geographic / BBC editorial style, " +
        "RAW photo, DSLR, natural soft light, no digital enhancement artifacts, hyperrealistic",
    // ── Conteúdo com dramatismo / short viral ─────────────────────────────────
    // Padrão para shorts virais com histórias reais que precisam de impacto visual
    cinematic: "shot on ARRI Alexa, RAW photo, photojournalism, natural light, " +
        "shallow depth of field, film grain, ultra-sharp, hyperrealistic",
    // Cenas noturnas urbanas, mistério, tecnologia noir
    cyberpunk: "RAW photo, neon-lit urban night scene, wet streets reflection, " +
        "photorealistic, shot on Sony A7IV",
    // ── Conteúdo de ficção / criativo ─────────────────────────────────────────
    // Ficção, fantasia, conteúdo especulativo
    illustration: "vibrant 2D digital illustration, bold colors, modern flat art, clean lines",
    // Fotografia de retrato / lifestyle
    realistic: "RAW photo, shot on Canon EOS R5 85mm f/1.4, natural lighting, " +
        "ultra-sharp focus, hyperrealistic, photojournalism",
    // ── Nichos específicos ────────────────────────────────────────────────────
    // Oceanos, vida marinha, subaquático
    underwater: "underwater photography, Sony A7IV with underwater housing, " +
        "natural filtered ocean light, scientifically accurate marine life, " +
        "no color grading distortion, hyperrealistic",
    // Espaço, astronomia, cosmos
    space: "NASA-quality astrophotography, scientifically accurate celestial bodies, " +
        "deep space photography, no fantasy nebula coloring, hyperrealistic",
    // Medicina / corpo humano / saúde
    medical: "medical editorial photography, clinical lighting, " +
        "scientifically accurate anatomy, no illustration, hyperrealistic",
};
// ─── Exporta o mapa para o openai_service poder sugerir o estilo correto ─────
export { STYLE_HINTS };

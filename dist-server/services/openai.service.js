import OpenAI from 'openai';
const MODEL = 'gpt-4o';
const LANGUAGE_NAMES = {
    'pt': 'Português (Brasil)',
    'pt-PT': 'Português (Portugal)',
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'ja': '日本語',
    'ko': '한국어',
    'zh': '中文',
    'ar': 'العربية',
};
export async function generateScript(topic, niche = 'curiosidades', durationTarget = 45, voiceTone = 'dramático e envolvente', narrationSpeed = 'moderado', previousHook, previousTitle, language = 'pt', apiKey) {
    if (!apiKey)
        throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
    const client = new OpenAI({ apiKey });
    const variationSeed = Math.floor(Math.random() * 999999);
    const HOOK_TYPES = [
        'pergunta retórica que desafia o espectador (ex: "Você está fazendo X errado?")',
        'fato chocante com número específico (ex: "95% das pessoas não sabe que...")',
        'afirmação controversa e polêmica (ex: "X que você conhece é uma mentira")',
        'cenário imersivo que coloca o espectador dentro da cena (ex: "Imagine acordar e descobrir...")',
        'contradição paradoxal (ex: "Quanto mais você faz X, pior fica Y")',
        'revelação de segredo exclusivo (ex: "O que [especialistas/governo/empresas] escondem sobre...")',
        'desafio direto ao espectador (ex: "Aposto que você não sabia disso sobre...")',
        'história pessoal em 1ª pessoa no presente (ex: "Estou olhando para X e não consigo acreditar...")',
    ];
    const hookType = HOOK_TYPES[variationSeed % HOOK_TYPES.length];
    let avoidBlock = '';
    if (previousHook || previousTitle) {
        const hookList = previousHook
            ? previousHook.split(' | ').map((h, i) => `  ${i + 1}. "${h.trim()}"`).join('\n')
            : '';
        avoidBlock = `\n\n🚫 GANCHOS JÁ USADOS — PROIBIDO repetir qualquer um destes ou variações similares:\n${hookList}\n${previousTitle ? `Último título: "${previousTitle}"\n` : ''}→ Use um ÂNGULO COMPLETAMENTE DIFERENTE.`;
    }
    const langName = LANGUAGE_NAMES[language] ?? language;
    const langInstruction = language === 'pt'
        ? ''
        : `\n🌐 IDIOMA OBRIGATÓRIO: Gere TODO o texto (title, hook, body, cta, narration_text, description, hashtags) em **${langName}**. EXCEÇÃO: image_prompt SEMPRE em inglês.\n`;
    const prompt = `Você é um especialista em criação de conteúdo viral para YouTube Shorts, TikTok e Instagram Reels.
${langInstruction}
IMPORTANTE: Gere um roteiro 100% ORIGINAL e ÚNICO.
Seed de variação: #${variationSeed}
Tipo de gancho obrigatório desta versão: ${hookType}${avoidBlock}

TEMA: "${topic}" | Nicho: ${niche} | Duração: ${durationTarget}s | Tom: ${voiceTone} | Velocidade: ${narrationSpeed}

═══ PROCESSO OBRIGATÓRIO — siga esta ordem ═══

PASSO 1 — Escreva o roteiro completo como narração contínua (hook + desenvolvimento + CTA).
PASSO 2 — Divida essa narração em 4 a 6 segmentos sequenciais. Cada segmento = uma cena.
  • Os segmentos juntos devem formar o roteiro completo sem cortes ou repetições.
  • Cada segmento deve ter entre 2 e 4 frases (o suficiente para ~8–12s de narração).
PASSO 3 — Para cada segmento, crie um image_prompt em inglês que ilustre EXATAMENTE o fato/momento sendo narrado naquele trecho. A imagem deve ser uma FOTOGRAFIA REAL do conteúdo narrado, não uma ilustração genérica.

═══ REGRAS DO IMAGE_PROMPT ═══
• Sempre em inglês
• Fotorrealismo: "RAW photo", "DSLR photo", "photojournalism" — NÃO arte digital ou CGI
• Especifique câmera/lente: "shot on Canon EOS R5 85mm f/1.4", "Sony A7IV 35mm f/1.8"
• Iluminação natural: "golden hour light", "natural window light", "overcast daylight"
• A imagem deve mostrar EXATAMENTE o sujeito narrado — se fala de polvo gigante, mostre polvo; se fala de submarino, mostre submarino; se fala de cientista, mostre cientista no ato
• NUNCA gere "close-up de olhos", "pessoa olhando para a câmera" ou metáforas abstratas — sempre o objeto/animal/lugar/evento real
• Cena 1 (gancho): close dramático, composição impactante — a imagem mais forte de todas
• Última cena (CTA — "Inscreva-se", "Curta", "Siga" etc.): NÃO ilustre a frase do CTA; mostre o TEMA CENTRAL do vídeo em seu momento mais dramático e impactante
• Termine com: "photorealistic, hyperdetailed, no AI artifacts, no illustration, no CGI, vertical 9:16 portrait"

Responda EXCLUSIVAMENTE com JSON puro (sem markdown):
• Termine com: "photorealistic, hyperdetailed, no AI artifacts, no illustration, no CGI, vertical 9:16 portrait"`;
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'system',
                content: `Você é um roteirista especializado em vídeos curtos e virais (Shorts/TikTok).
Sua tarefa é criar um roteiro baseado em um tópico fornecido pelo usuário.

REGRAS CRÍTICAS PARA O METADATA:
- TÍTULO: Deve ser um GATILHO DE CURIOSIDADE absoluto. Use frases incompletas, perguntas intrigantes ou fatos inacreditáveis. Exemplos: "O segredo que...", "Você não vai acreditar no...", "Por que ninguém fala sobre...".
- DESCRIÇÃO: Deve ter no MÁXIMO 2 LINHAS. Seja direto e use um "call to action" simples.
- HASHTAGS: Gere 5-8 hashtags virais relacionadas.

REGRAS PARA O ROTEIRO:
- O roteiro deve ter entre 45 e 60 segundos de duração total.
- Divida o roteiro em cenas (objetos no JSON).
- Cada cena deve ter:
  1. "description": O texto curto e impactante que será falado (narração).
  2. "image_prompt": Um prompt detalhado e visual para gerar uma imagem cinematográfica realista daquela cena.
  3. "duration_seconds": A duração estimada daquela cena (2 a 6 segundos).

O retorno DEVE ser EXCLUSIVAMENTE um JSON válido no seguinte formato:
{
  "script": {
    "title": "Título Curioso",
    "hook": "Frase de impacto inicial",
    "body": "Corpo do roteiro",
    "cta": "Chamada para ação final",
    "voice_tone": "narrative",
    "narration_speed": "1.0"
  },
  "metadata": {
    "video_title": "Título com Gatilho Mental",
    "description": "Descrição de no máximo duas linhas.",
    "hashtags": ["tag1", "tag2"]
  },
  "scenes": [
    { "scene_number": 1, "description": "...", "image_prompt": "...", "duration_seconds": 4 },
    ...
  ]
}`
            },
            { role: 'user', content: prompt }
        ],
        temperature: 1.0,
        response_format: { type: 'json_object' },
    });
    const raw = JSON.parse(response.choices[0].message.content);
    const scriptData = raw.script || raw;
    const metaData = raw.metadata || raw;
    // Palavras por segundo por velocidade de narração (português ElevenLabs)
    const WPS = { lento: 2.2, moderado: 2.7, rápido: 3.3 };
    const wps = WPS[narrationSpeed] ?? 2.7;
    const scenes = raw.scenes.map((s, i) => {
        const narrationText = String(s.description || s.narration_text || '');
        const wordCount = narrationText.trim().split(/\s+/).filter(Boolean).length;
        // Duração calculada do texto narrado — mínimo 3s, máximo 15s por cena
        const duration = Math.min(15, Math.max(3, Math.round(wordCount / wps)));
        return {
            id: '',
            project_id: '',
            scene_number: Number(s.scene_number ?? i + 1),
            description: narrationText, // usa narration_text como description para referência
            image_prompt: String(s.image_prompt),
            image_url: null,
            duration_seconds: duration,
            created_at: new Date().toISOString(),
        };
    });
    // Normaliza soma das cenas para bater com duration_target
    const totalCalc = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
    if (totalCalc > 0) {
        const factor = durationTarget / totalCalc;
        scenes.forEach(s => {
            s.duration_seconds = Math.max(3, Math.round(s.duration_seconds * factor));
        });
    }
    return {
        script: {
            id: '',
            project_id: '',
            title: scriptData.title,
            hook: scriptData.hook,
            body: scriptData.body,
            cta: scriptData.cta,
            duration_seconds: durationTarget,
            voice_tone: scriptData.voice_tone || voiceTone,
            narration_speed: scriptData.narration_speed || narrationSpeed,
            created_at: new Date().toISOString(),
        },
        scenes,
        metadata: {
            video_title: metaData.video_title,
            description: metaData.description,
            hashtags: metaData.hashtags,
        },
    };
}
export async function regenerateScript(topic, _previousTitle, niche = 'curiosidades', apiKey) {
    return generateScript(topic, niche, 45, 'dramático e envolvente', 'moderado', undefined, undefined, 'pt', apiKey);
}
export async function generateThemeSuggestions(query, count = 5, apiKey) {
    if (!apiKey)
        throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
    const client = new OpenAI({ apiKey });
    const seed = Math.floor(Math.random() * 99999);
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{
                role: 'user',
                content: `Gere exatamente ${count} ideias DIFERENTES e ESPECÍFICAS de vídeos virais para YouTube Shorts sobre: "${query}".
Seed de variação: #${seed}

Regras:
- Cada título deve focar em um ASPECTO DIFERENTE do tema (não repita ângulos)
- Títulos específicos e intrigantes — nunca genéricos
- Misture ângulos: curiosidade, medo, admiração, polêmica, segredo revelado

Responda APENAS com JSON puro (sem markdown):
{"themes":[{"title":"...","description":"...","emoji":"...","niche":"...","hook":"..."}]}

Campos:
- title: título viral do vídeo (máx 60 chars)
- description: 1 frase descrevendo o conteúdo específico
- emoji: 1 emoji relevante ao conteúdo
- niche: uma das categorias: curiosidades, ciência, mistério, natureza, história, tecnologia, saúde
- hook: frase mais impactante do vídeo (1 linha)`,
            }],
        temperature: 1.0,
        response_format: { type: 'json_object' },
    });
    const raw = JSON.parse(response.choices[0].message.content);
    return raw.themes.slice(0, count);
}
export async function generateThumbnailPrompt(title, niche, hook, apiKey) {
    if (!apiKey)
        throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{
                role: 'user',
                content: `You are an expert at writing Flux image generation prompts for YouTube Shorts thumbnails.

Create ONE detailed image prompt for a vertical thumbnail (9:16) for this video:
- Title: "${title}"
- Niche: ${niche}
- Hook: "${hook}"

Rules:
- Photorealistic DSLR photo, specify camera and lens
- The most dramatic/shocking visual moment related to the topic
- High contrast, vibrant colors, cinematic composition
- The main subject must fill the frame and be unmistakably about the topic
- No text, no UI elements, no watermarks
- Dramatic natural or studio lighting
- Ultra-sharp, hyperdetailed

Reply with ONLY the image prompt — no explanations, no markdown.`,
            }],
        temperature: 0.8,
        max_tokens: 180,
    });
    return response.choices[0].message.content?.trim() ?? title;
}
export async function generateTopicSuggestions(niche, apiKey) {
    if (!apiKey)
        throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'user',
                content: `Sugira 6 ideias de temas virais para YouTube Shorts no nicho de "${niche}".
Responda apenas com JSON: { "suggestions": ["tema 1", "tema 2", ...] }`,
            },
        ],
        temperature: 0.9,
        response_format: { type: 'json_object' },
    });
    const raw = JSON.parse(response.choices[0].message.content);
    return raw.suggestions;
}
export async function generateViralPhrase(query, apiKey) {
    if (!apiKey)
        throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'system',
                content: `Você é uma IA especializada em criar posts virais para redes sociais.
O usuário irá informar uma categoria, tema ou sentimento, e você deve criar automaticamente uma composição profissional para Instagram, TikTok, Facebook, Pinterest e Shorts.

OBJETIVO:
Gerar uma imagem emocional e altamente compartilhável com texto impactante integrado ao visual.

REGRAS IMPORTANTES:
* O conteúdo deve ser visualmente cinematográfico e emocional.
* A imagem precisa combinar perfeitamente com o tema solicitado.
* O texto deve ser curto, forte e fácil de ler.
* O design deve parecer profissional e moderno.
* O fundo deve ter espaço para leitura do texto.
* Adicione um degradê preto suave na parte inferior da imagem para destacar a escrita.
* O texto principal deve ficar centralizado ou levemente abaixo.
* Use iluminação dramática e composição cinematográfica.
* O visual deve parecer conteúdo viral premium de redes sociais.

Responda EXCLUSIVAMENTE com JSON puro:
{
  "categoria": "...",
  "tema_visual": "...",
  "texto_pre_titulo": "...", 
  "palavra_chave": "...",
  "texto_pos_titulo": "...",
  "referencia": "...",
  "estilo_fonte": "...",
  "cores": "...",
  "prompt": "..."
}

REGRAS CRÍTICAS DE CAMPOS:
- 'prompt': Deve ser APENAS a descrição visual para a IA de imagem (Flux). NÃO mencione textos, frases, fontes ou degradês no prompt. A imagem deve ser "limpa" para que possamos colocar o texto por cima.
- 'referencia': Deve ser curto (ex: 'Salmos 37:5', 'Marcus Aurelius', 'Sabedoria Antiga').
- 'palavra_chave': Apenas UMA palavra principal para destaque máximo.`
            },
            { role: 'user', content: query }
        ],
        temperature: 1.0,
        response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
}

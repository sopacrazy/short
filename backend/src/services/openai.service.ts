import OpenAI from 'openai';
import type { GenerateScriptResponse } from '../types/index.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'gpt-4o';

const LANGUAGE_NAMES: Record<string, string> = {
  'pt':    'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  'en':    'English',
  'es':    'Español',
  'fr':    'Français',
  'de':    'Deutsch',
  'it':    'Italiano',
  'ja':    '日本語',
  'ko':    '한국어',
  'zh':    '中文',
  'ar':    'العربية',
};

export async function generateScript(
  topic: string,
  niche: string = 'curiosidades',
  durationTarget: number = 45,
  voiceTone: string = 'dramático e envolvente',
  narrationSpeed: string = 'moderado',
  previousHook?: string,
  previousTitle?: string,
  language: string = 'pt',
): Promise<GenerateScriptResponse> {
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

{
  "title": "título viral SEO (máx 80 chars)",
  "hook": "gancho — primeiras frases da narração (as mais impactantes)",
  "body": "desenvolvimento — frases do meio da narração",
  "cta": "call to action — últimas frases da narração",
  "duration_seconds": ${durationTarget},
  "voice_tone": "${voiceTone}",
  "narration_speed": "${narrationSpeed}",
  "scenes": [
    {
      "scene_number": 1,
      "narration_text": "trecho exato da narração que será falado durante esta cena",
      "description": "descrição visual resumida do que acontece",
      "image_prompt": "RAW photo, shot on Canon EOS R5 85mm f/1.4, [cena que ilustra EXATAMENTE o narration_text], natural light, photojournalistic, photorealistic, hyperdetailed, no AI artifacts, no illustration, no CGI, vertical 9:16 portrait",
      "duration_seconds": 8
    }
  ],
  "video_title": "título YouTube com emoji",
  "description": "descrição SEO 150-200 palavras",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"]
}`;


  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 1.0,
    response_format: { type: 'json_object' },
  });

  const raw = JSON.parse(response.choices[0].message.content!);

  // Palavras por segundo por velocidade de narração (português ElevenLabs)
  const WPS: Record<string, number> = { lento: 2.2, moderado: 2.7, rápido: 3.3 };
  const wps = WPS[narrationSpeed] ?? 2.7;

  const scenes = (raw.scenes as Record<string, unknown>[]).map((s, i) => {
    const narrationText = String(s.narration_text ?? s.description ?? '');
    const wordCount = narrationText.trim().split(/\s+/).filter(Boolean).length;
    // Duração calculada do texto narrado — mínimo 3s, máximo 15s por cena
    const duration = Math.min(15, Math.max(3, Math.round(wordCount / wps)));
    return {
      id: '',
      project_id: '',
      scene_number: Number(s.scene_number ?? i + 1),
      description: narrationText,   // usa narration_text como description para referência
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
      title: raw.title,
      hook: raw.hook,
      body: raw.body,
      cta: raw.cta,
      duration_seconds: raw.duration_seconds,
      voice_tone: raw.voice_tone,
      narration_speed: raw.narration_speed,
      created_at: new Date().toISOString(),
    },
    scenes,
    metadata: {
      video_title: raw.video_title,
      description: raw.description,
      hashtags: raw.hashtags,
    },
  };
}

export async function regenerateScript(
  topic: string,
  _previousTitle: string,
  niche: string = 'curiosidades'
): Promise<GenerateScriptResponse> {
  return generateScript(topic, niche);
}

export interface ThemeSuggestion {
  title: string;
  description: string;
  emoji: string;
  niche: string;
  hook: string;
}

export async function generateThemeSuggestions(query: string, count = 5): Promise<ThemeSuggestion[]> {
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
  const raw = JSON.parse(response.choices[0].message.content!);
  return (raw.themes as ThemeSuggestion[]).slice(0, count);
}

export async function generateThumbnailPrompt(
  title: string,
  niche: string,
  hook: string,
): Promise<string> {
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

export async function generateTopicSuggestions(niche: string): Promise<string[]> {
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

  const raw = JSON.parse(response.choices[0].message.content!);
  return raw.suggestions as string[];
}

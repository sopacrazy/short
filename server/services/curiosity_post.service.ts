import OpenAI from 'openai';

export interface CuriosityPostResult {
  title_white: string;
  title_yellow: string;
  description: string;
  cta: string;
  caption: string;
  hashtags: string[];
  image_prompt: string;
}

const LANG_NAMES: Record<string, string> = {
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
};

export interface CuriositySuggestion {
  title: string;
  description: string;
  emoji: string;
  niche: string;
}

export async function generateCuriositySuggestions(
  query: string,
  count: number = 5,
  apiKey?: string | null,
): Promise<CuriositySuggestion[]> {
  if (!apiKey) throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 1.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em conteúdo viral de curiosidades para Instagram e TikTok.

Dado um tema, gere ${count} curiosidades DIFERENTES, cada uma sendo um fato chocante, surpreendente ou perturbador sobre o tema — no estilo viral do canal "El Sabiondo".

Cada curiosidade deve:
- Ser um fato real e verificável
- Ser curta e impactante (máx 10 palavras)
- Despertar surpresa ou choque imediato
- Ter potencial viral alto

Responda APENAS com JSON puro:
{
  "suggestions": [
    {
      "title": "Fato chocante curto sobre o tema",
      "description": "Uma frase complementar que amplia o impacto do fato.",
      "emoji": "🔥",
      "niche": "nicho em uma palavra (espaço, animais, ciência, etc.)"
    }
  ]
}`,
      },
      { role: 'user', content: `Tema: ${query}` },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content!) as { suggestions: CuriositySuggestion[] };
  return parsed.suggestions ?? [];
}

export async function generateAdvancedPostImage(
  titleWhite: string,
  titleYellow: string,
  description: string,
  imagePrompt: string,
  apiKey?: string | null,
): Promise<string> {
  if (!apiKey) throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
  const client = new OpenAI({ apiKey });

  const descClean = description.replace(/\[([^\]]+)\]/g, '$1');

  const prompt = `Ultra cinematic Instagram post (portrait 9:16 format), viral curiosity post style, premium documentary aesthetic. Stop-the-scroll visual impact.

VISUAL SUBJECT (render this scene realistically):
${imagePrompt}

TYPOGRAPHY — embed EXACTLY this text in the image:
• TOP CENTER: small branded logo text "El Sabiondo!" in compact elegant style
• MAIN HEADLINE (VERY large bold cinematic brush/grunge font, ALL CAPS, centered):
  Line 1 in pure WHITE: "${titleWhite}"
  Line 2 in VIBRANT YELLOW: "${titleYellow}"
• SUBTITLE (small clean text near bottom): "${descClean}"

DESIGN SPECS:
- Dark moody background, dramatic cinematic lighting
- Hero subject centered with depth-of-field background blur
- Dark gradient overlay on lower 60% for text legibility
- Headline fills ~80% of image width — VERY large and bold
- Brush/grunge cinematic typography — bold, aggressive, viral
- Yellow text: bright saturated (#FFB800)
- White text: pure bright white with strong shadow
- Minimal composition, zero visual clutter
- Premium social media aesthetic, stop-the-scroll design
- Photorealistic ultra-detailed 4K quality
- Moody atmospheric lighting with soft glow on subject

CRITICAL: NO brand logos, NO platform symbols, NO watermarks, NO Netflix, NO streaming service icons anywhere in the image.`;

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1536',
    quality: 'high',
  } as any);

  const b64 = (response.data?.[0] as any)?.b64_json;
  if (!b64) throw new Error('gpt-image-1 não retornou imagem');
  return `data:image/png;base64,${b64}`;
}

export async function generateCuriosityPost(
  curiosity: string,
  apiKey?: string | null,
  language: string = 'pt',
): Promise<CuriosityPostResult> {
  if (!apiKey) throw new Error('Configuração ausente: OpenAI API Key não encontrada para este usuário.');
  const client = new OpenAI({ apiKey });

  const langName = LANG_NAMES[language] ?? language;
  const isNonPt = language !== 'pt';

  // Bloco de idioma vai no INÍCIO do system prompt para máxima prioridade
  const langHeader = isNonPt
    ? `⚠️ LANGUAGE RULE — HIGHEST PRIORITY ⚠️
ALL output fields (title_white, title_yellow, description, cta, caption, hashtags) MUST be written EXCLUSIVELY in ${langName}.
DO NOT use Portuguese. DO NOT mix languages. The input curiosity may be in Portuguese — IGNORE its language and write your output in ${langName}.
image_prompt must always be in English.
──────────────────────────────────\n\n`
    : '';

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 1.0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${langHeader}You are an AI expert in creating viral curiosity posts for Instagram, TikTok and Reels.${isNonPt ? ` You write ALL text fields exclusively in ${langName}. Never use Portuguese.` : ''}

Your mission: turn any curiosity, fact, discovery, mystery, technology or news into highly viral, shareable content that triggers surprise, shock, curiosity and the urge to share.

──────────────────────────────────
CONTENT RULES
──────────────────────────────────

HEADLINE (title_white + title_yellow):
• Split into TWO UPPERCASE lines that together form an extremely eye-catching headline
• title_white = neutral setup that creates tension
• title_yellow = the explosive fact, must end with "!" or "..."
• Must make the scroll stop immediately

Headline examples (style reference only — translate to target language):
  "THERE IS A PLANET" / "WHERE IT RAINS GLASS..."
  "THE OCEAN HAS A SOUND" / "NO ONE CAN EXPLAIN!"
  "THIS AI LEARNED" / "TO LIE ON ITS OWN!"
  "THERE IS AN ISLAND" / "FORBIDDEN TO HUMANS!"

DESCRIPTION:
• Ultra short (1-2 lines), simple, modern and impactful
• Wrap the 1-2 most shocking words/data in [brackets] for visual highlight
• Goal: amplify the shock of the headline

CTA:
• One short question that triggers comments and shares
• Must be personal, challenging or scary
• End with an emoji

CAPTION:
• Full Instagram caption (2-3 short paragraphs)
• Moderate emojis, modern language
• Do NOT repeat the CTA at the end — the CTA is a separate field
• Encourage saving and sharing

IMAGE PROMPT:
• CRITICAL: The image MUST visually represent the EXACT specific fact — NOT a generic portrait of the subject
• If the fact involves a physical state (e.g., "cockroach lives without head" → show a HEADLESS cockroach; "flamingo drinks boiling water" → show it drinking FROM BOILING STEAMING WATER; "planet rains glass" → show glass shards raining)
• NEVER generate just "a cockroach", "a flamingo", "a planet" — ALWAYS show the specific scenario
• Describe the scene explicitly: what the subject IS DOING, its physical state, the environment, what is visible
• Ultra cinematic, photorealistic, dramatic lighting, 4K ultra detailed
• NO text, NO letters, NO logo in the image

──────────────────────────────────
OUTPUT — PURE JSON
──────────────────────────────────
{
  "title_white": "SETUP LINE IN UPPERCASE",
  "title_yellow": "SHOCK LINE WITH IMPACT!",
  "description": "Short sentence with [shocking data] and [impactful number] if any.",
  "cta": "Short question that triggers comments 👀",
  "caption": "Full Instagram caption. 2-3 paragraphs. Ends with the CTA.",
  "hashtags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "image_prompt": "Ultra cinematic macro shot of [subject IN THE EXACT PHYSICAL STATE or PERFORMING THE EXACT ACTION from the curiosity — e.g. headless cockroach still walking, flamingo drinking from boiling steaming volcanic spring], [environment details], dramatic lighting, 4K ultra detailed, photorealistic, no text, no watermark"
}

FINAL RULES:
- title_white and title_yellow: ALWAYS uppercase
- hashtags: exactly 10, mix of target language + English, WITHOUT the # character
- image_prompt: ALWAYS in English, NEVER mention text or letters
- ALL text fields (title_white, title_yellow, description, cta, caption): write in ${isNonPt ? langName : 'Portuguese (Brazil)'}`,
      },
      { role: 'user', content: language !== 'pt' ? `[IDIOMA: ${langName}]\n${curiosity}` : curiosity },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content!) as CuriosityPostResult;

  if (!parsed.title_white || !parsed.title_yellow || !parsed.description || !parsed.cta || !parsed.caption || !Array.isArray(parsed.hashtags) || !parsed.image_prompt) {
    throw new Error('Resposta da IA incompleta');
  }

  return parsed;
}

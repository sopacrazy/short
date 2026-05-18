import OpenAI from "openai";
import type { GenerateScriptResponse } from "../types/index.js";

const MODEL = "gpt-4o";

const LANGUAGE_NAMES: Record<string, string> = {
  pt: "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ar: "العربية",
};

// ─── NOVO: tipo de conteúdo para distinguir real vs ficção ───────────────────
export type ContentType = "real" | "fiction";

// Mapa de nicho → estilo visual padrão para o Flux
const NICHE_VISUAL_STYLE: Record<string, string> = {
  natureza: "wildlife",
  animais: "wildlife",
  história: "historical",
  ciência: "documentary",
  curiosidades: "documentary",
  mistério: "cinematic",
  tecnologia: "cinematic",
  saúde: "documentary",
  ficção: "cinematic",
};

export async function generateScript(
  topic: string,
  niche: string = "curiosidades",
  durationTarget: number = 45,
  voiceTone: string = "dramático e envolvente",
  narrationSpeed: string = "moderado",
  previousHook?: string,
  previousTitle?: string,
  language: string = "pt",
  apiKey?: string | null,
  // ─── NOVO parâmetro ───────────────────────────────────────────────────────
  contentType: ContentType = "real",
): Promise<GenerateScriptResponse> {
  if (!apiKey)
    throw new Error(
      "Configuração ausente: OpenAI API Key não encontrada para este usuário.",
    );
  const client = new OpenAI({ apiKey });
  const variationSeed = Math.floor(Math.random() * 999999);

  // Hooks para conteúdo REAL: sem 1ª pessoa, sem "estou no local", tom documental
  const HOOK_TYPES_REAL = [
    'pergunta retórica que desafia o espectador (ex: "Você sabia que isso realmente aconteceu?")',
    'fato chocante com número específico (ex: "95% das pessoas não sabe que...")',
    'afirmação controversa e polêmica (ex: "X que você conhece é uma mentira")',
    'revelação de segredo exclusivo (ex: "O que a história oficial esconde sobre...")',
    'desafio direto ao espectador (ex: "Aposto que você não sabia disso sobre...")',
    'dado real impactante com contexto (ex: "Em [ano], algo aconteceu que mudou tudo sobre [tema]...")',
    'comparação surpreendente entre realidade e senso comum (ex: "Todo mundo pensa X, mas a ciência prova Y")',
    'abertura com o desfecho mais chocante do evento (ex: "Em [data], [sujeito] [fez X] — e ninguém acreditou")',
  ];

  // Hooks para FICÇÃO: pode usar 1ª pessoa, imersão total, cenários imaginativos
  const HOOK_TYPES_FICTION = [
    'pergunta retórica que desafia o espectador (ex: "Você está fazendo X errado?")',
    'fato chocante com número específico (ex: "95% das pessoas não sabe que...")',
    'afirmação controversa e polêmica (ex: "X que você conhece é uma mentira")',
    'cenário imersivo que coloca o espectador dentro da cena (ex: "Imagine acordar e descobrir...")',
    'contradição paradoxal (ex: "Quanto mais você faz X, pior fica Y")',
    'revelação de segredo exclusivo (ex: "O que [especialistas/governo/empresas] escondem sobre...")',
    'desafio direto ao espectador (ex: "Aposto que você não sabia disso sobre...")',
    'história pessoal em 1ª pessoa no presente (ex: "Estou olhando para X e não consigo acreditar...")',
  ];

  const HOOK_TYPES =
    contentType === "real" ? HOOK_TYPES_REAL : HOOK_TYPES_FICTION;
  const hookType = HOOK_TYPES[variationSeed % HOOK_TYPES.length];

  let avoidBlock = "";
  if (previousHook || previousTitle) {
    const hookList = previousHook
      ? previousHook
          .split(" | ")
          .map((h, i) => `  ${i + 1}. "${h.trim()}"`)
          .join("\n")
      : "";
    avoidBlock = `\n\n🚫 GANCHOS JÁ USADOS — PROIBIDO repetir qualquer um destes ou variações similares:\n${hookList}\n${previousTitle ? `Último título: "${previousTitle}"\n` : ""}→ Use um ÂNGULO COMPLETAMENTE DIFERENTE.`;
  }

  const langName = LANGUAGE_NAMES[language] ?? language;
  const langInstruction =
    language === "pt"
      ? ""
      : `\n🌐 IDIOMA OBRIGATÓRIO: Gere TODO o texto (title, hook, body, cta, narration_text, description, hashtags) em **${langName}**. EXCEÇÃO: image_prompt SEMPRE em inglês.\n`;

  // ─── NOVO: bloco de instrução adaptado ao tipo de conteúdo ────────────────
  const contentTypeBlock =
    contentType === "real"
      ? `
═══ TIPO DE CONTEÚDO: HISTÓRIA / FATO REAL ═══

Este vídeo trata de um evento, fato ou ser documentado do mundo real.
REGRAS DE FIDELIDADE OBRIGATÓRIAS para o roteiro e os image_prompts:

1. PRECISÃO FACTUAL: Narre apenas o que é verificável. Não invente detalhes, datas ou números. Se não souber um detalhe exato, omita — nunca fabrique.

2. ANCORAGEM GEOGRÁFICA E HISTÓRICA: Se o tema envolve um lugar real (ex: Oceano Índico, Rio de Janeiro, Chernobyl), cite o nome real no roteiro E no image_prompt. Se envolve um evento real (ex: naufrágio do Titanic, erupção do Vesúvio), descreva o cenário real daquele momento histórico.

3. ANIMAIS — FIDELIDADE ZOOLÓGICA ABSOLUTA:
   • Sempre use o nome científico entre parênteses no image_prompt.
   • Descreva a aparência REAL da espécie: coloração exata, morfologia, tamanho proporcional.
   • NUNCA interprete o nome popular de forma literal ou criativa.
   • Exemplos CORRETOS:
     - "tiger shark" → "a tiger shark (Galeocerdo cuvier), grey-brown torpedo-shaped body with faint dark vertical stripes along the flanks, blunt snout, large pectoral fins, swimming in open blue ocean water"
     - "mantis shrimp" → "a mantis shrimp (Odontodactylus scyllarus), vivid multicolored crustacean with peacock-like iridescent greens, blues and reds, compound eyes, on coral reef substrate"
     - "blue-ringed octopus" → "a blue-ringed octopus (Hapalochlaena lunulata), small tan-brown octopus with glowing iridescent blue rings on skin, sitting on rocky seafloor"
   • Exemplos PROIBIDOS: "shark with tiger stripes and orange fur", "shrimp shaped like a mantis insect"
   • Adicione sempre: "wildlife documentary photography, BBC Earth / National Geographic style"

4. PESSOAS REAIS E HISTÓRICAS:
   • NUNCA peça o rosto de uma pessoa específica — modelos de imagem não conseguem reproduzir fielmente.
   • Descreva o contexto: época, vestuário, postura, ambiente. Ex: "a naval officer in early 20th century British military uniform, standing on the deck of a large steam ship, stern expression, overcast Atlantic sky"
   • Para personagens históricos: "a figure in [época] [nacionalidade] attire, [contexto da cena], [iluminação]"

5. VOZ DA NARRAÇÃO — DOCUMENTÁRIO, NUNCA 1ª PESSOA:
   • O roteiro é narrado em 3ª pessoa, como um documentário ou jornalismo — NUNCA como se o narrador estivesse presente na cena.
   • PROIBIDO: "Estou olhando para...", "Estou aqui no local...", "Vejo à minha frente...", "Estou dentro do submarino..."
   • CORRETO: "Em [ano], [sujeito] [verbo]...", "O que aconteceu foi...", "Os registros mostram que...", "A [data], [local], [evento]..."
   • O narrador é onisciente e distante — conta o fato, não o vive.

6. ESTILO VISUAL PARA CONTEÚDO REAL:
   • Use: "RAW photo", "photojournalism", "historical documentary photography", "archival footage aesthetic"
   • Para natureza: "wildlife documentary, BBC Earth, shot on Canon EOS R5 600mm telephoto"
   • Para história: "period-accurate reconstruction, historical documentary style, muted tones"
   • Para ciência/tecnologia: "scientific photography, National Geographic editorial style"
   • NUNCA use "cinematic CGI", "digital art", "illustration" para conteúdo real.
`
      : `
═══ TIPO DE CONTEÚDO: FICÇÃO / FANTASIA ═══

Este vídeo trata de conteúdo fictício, especulativo ou de entretenimento criativo.
REGRAS PARA FICÇÃO:
• Estilo visual pode ser cinematográfico, CGI ou ilustrativo conforme o tema pede.
• Criatividade e dramatismo visuais são bem-vindos.
• Ainda proibido: "close-up de olhos genérico", "pessoa olhando para câmera" sem contexto.
• Seja específico na cena: o que está acontecendo, onde, com quem/o quê.
`;

  // ─── NOVO: âncora visual unificada — garante coerência entre todas as cenas ─
  const visualAnchorBlock = `
═══ ÂNCORA VISUAL DO VÍDEO (OBRIGATÓRIO) ═══

Antes de escrever qualquer image_prompt, defina UMA linha de estilo visual que será aplicada a TODAS as cenas:
  "visual_style_anchor": "[câmera/lente] [paleta de luz] [mood geral]"
  Exemplo: "Sony A7IV 35mm f/1.8, warm golden hour tones, naturalistic shallow depth of field"
  Exemplo: "Canon EOS R5 600mm telephoto, blue-hour overcast light, wildlife documentary mood"

Aplique exatamente esse estilo em todos os image_prompts. O espectador deve sentir que todas as imagens pertencem ao mesmo vídeo.
`;

  const prompt = `Você é um especialista em criação de conteúdo viral para YouTube Shorts, TikTok e Instagram Reels.
${langInstruction}
IMPORTANTE: Gere um roteiro 100% ORIGINAL e ÚNICO.
Seed de variação: #${variationSeed}
Tipo de gancho obrigatório desta versão: ${hookType}${avoidBlock}

TEMA: "${topic}" | Nicho: ${niche} | Duração: ${durationTarget}s | Tom: ${voiceTone} | Velocidade: ${narrationSpeed}
${contentTypeBlock}
${visualAnchorBlock}
═══ FILOSOFIA OBRIGATÓRIA — LEIA COM ATENÇÃO ═══

O vídeo deve ENTREGAR A CURIOSIDADE COMPLETA dentro dos ${durationTarget} segundos.
O espectador assiste ao vídeo e SAI SABENDO A RESPOSTA — não fica com um cliffhanger.
Não use frases como "descubra mais inscrevendo-se" ANTES de revelar o fato.
O CTA de inscrição aparece APENAS NA ÚLTIMA CENA, DEPOIS que tudo já foi explicado.

Estrutura obrigatória das cenas:
  CENA 1 — Gancho: frase de impacto que apresenta a curiosidade (tipo: ${hookType})
  CENAS 2 a N-1 — Desenvolvimento: explica o fato completo, com detalhes reais e concretos. A resposta deve estar aqui.
  ÚLTIMA CENA — CTA breve: "Curta e siga para mais curiosidades como essa." (3-5 segundos)

═══ PROCESSO OBRIGATÓRIO — siga esta ordem ═══

PASSO 1 — Escreva o roteiro completo como narração contínua:
  • Gancho (5-8s): apresenta a curiosidade de forma impactante
  • Desenvolvimento (25-35s): explica o fato inteiro — quem, o quê, quando, como, por quê. Inclui o detalhe mais surpreendente. A revelação acontece AQUI.
  • CTA (3-5s): convida a seguir/curtir. Nada de "descubra depois" — o conteúdo já foi entregue.
PASSO 2 — Divida essa narração em 4 a 6 segmentos sequenciais. Cada segmento = uma cena.
  • Os segmentos juntos devem formar o roteiro completo sem cortes ou repetições.
  • Cada cena de desenvolvimento (não gancho, não CTA) deve ter 1 a 3 frases diretas.
PASSO 3 — Para cada segmento, crie um image_prompt em inglês que ilustre EXATAMENTE o fato/momento sendo narrado naquele trecho. Aplique o visual_style_anchor definido acima em todas as cenas.

═══ REGRAS DO IMAGE_PROMPT ═══
• Sempre em inglês
• ${
    contentType === "real"
      ? 'Fotorrealismo OBRIGATÓRIO: "RAW photo", "DSLR photo", "photojournalism", "documentary photography" — NUNCA arte digital, CGI ou ilustração'
      : "Estilo visual coerente com o tema: fotorrealismo, CGI cinematográfico ou ilustração conforme o que servir melhor à cena"
  }
• Especifique câmera/lente: "shot on Canon EOS R5 85mm f/1.4", "Sony A7IV 35mm f/1.8", "600mm telephoto" (para fauna/natureza)
• Iluminação natural e coerente com o visual_style_anchor: "golden hour light", "natural window light", "overcast daylight", "blue hour"
• A imagem deve mostrar EXATAMENTE o sujeito narrado — se fala de polvo gigante, mostre polvo; se fala de submarino, mostre submarino; se fala de cientista, mostre cientista no ato
• NUNCA gere "close-up de olhos", "pessoa olhando para a câmera" sem contexto dramático ou metáforas abstratas — sempre o objeto/animal/lugar/evento real
• ANIMAIS: obrigatoriamente nome científico + morfologia real + "wildlife documentary style" (ver regras acima)
• PESSOAS REAIS: descreva contexto, época e ambiente — nunca peça um rosto específico (ver regras acima)
• LUGARES REAIS: cite o nome real do local quando for relevante para a história
• Cena 1 (gancho): a imagem mais impactante do tema — preferencialmente o objeto/lugar/animal/evento real em seu momento mais dramático (wide shot, close-up ou detalhe, conforme o que for mais revelador para ESSE tema específico)
• Última cena (CTA): reutilize o mesmo enquadramento/tema da cena mais forte do vídeo — NÃO crie uma imagem nova para o CTA, mostre o TEMA CENTRAL em seu momento mais memorável
• Termine com: "photorealistic, hyperdetailed, no AI artifacts, no illustration, no CGI, vertical 9:16 portrait"

Responda EXCLUSIVAMENTE com JSON puro (sem markdown).`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Você é um roteirista especializado em vídeos curtos e virais (Shorts/TikTok/Reels).
Sua missão é criar roteiros que ENTREGAM a curiosidade completa dentro do vídeo — sem cliffhangers, sem "descubra inscrevendo-se" antes da revelação.

REGRAS CRÍTICAS PARA O METADATA:
- TÍTULO: Gatilho de curiosidade que promete uma resposta que o vídeo DE FATO entrega. Ex: "O sobrevivente do Titanic que ninguém conhece", "Por que os golfinhos fazem isso?", "O truque que salvou 200 vidas".
- DESCRIÇÃO: Máximo 2 linhas. Reforce o fato mais surpreendente que o vídeo revela.
- HASHTAGS: 5 a 8 hashtags virais relacionadas.

REGRAS PARA O ROTEIRO:
- Duração total: 40 a 50 segundos.
- O conteúdo principal (a resposta à curiosidade) deve estar nas cenas intermediárias.
- A última cena é um CTA breve (3-5s) de "Curta e siga" — sem prometer revelar algo depois.
- Cada cena deve ter:
  1. "description": texto exato da narração daquela cena (direto, sem rodeios).
  2. "image_prompt": prompt visual detalhado em inglês para gerar imagem fotorrealista. DEVE incluir o visual_style_anchor definido no início do JSON.
  3. "duration_seconds": duração estimada em segundos (3 a 10s por cena).

REGRA CRÍTICA — ANIMAIS NO IMAGE_PROMPT:
Quando qualquer cena envolver um animal, o image_prompt DEVE:
1. Incluir o nome científico entre parênteses
2. Descrever exatamente como o animal É na natureza (cor real, tamanho, morfologia)
3. NUNCA interpretar o nome popular de forma literal ou criativa
4. Incluir "wildlife documentary, BBC Earth / National Geographic photography style"
Exemplos obrigatórios:
  - "tiger shark" → "a tiger shark (Galeocerdo cuvier), grey-brown body with faint dark stripes along flanks, blunt snout, swimming in open ocean, wildlife documentary style"
  - "mantis shrimp" → "a mantis shrimp (Odontodactylus scyllarus), vivid iridescent crustacean with compound eyes, on coral reef"
  - "flying fox" → "a large fruit bat (Pteropus vampyrus) hanging from a tree branch, dark brown fur, leathery wings folded, tropical forest canopy"

REGRA CRÍTICA — PESSOAS REAIS NO IMAGE_PROMPT:
NUNCA peça o rosto de uma pessoa nomeada específica — descreva somente época, vestuário e contexto ambiental.

REGRA CRÍTICA — CONSISTÊNCIA VISUAL:
O campo "visual_style_anchor" no JSON deve ser definido UMA VEZ e aplicado em TODOS os image_prompts das cenas. Todas as cenas devem parecer do mesmo vídeo: mesma câmera/lente, mesma paleta de luz, mesmo mood.

O retorno DEVE ser EXCLUSIVAMENTE um JSON válido no seguinte formato:
{
  "visual_style_anchor": "Sony A7IV 35mm f/1.8, warm golden tones, naturalistic shallow DOF",
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
    { "scene_number": 1, "description": "...", "image_prompt": "...", "duration_seconds": 5 },
    ...
  ]
}`,
      },
      { role: "user", content: prompt },
    ],
    // ─── NOVO: temperature reduzida para conteúdo real — menos alucinações ──
    temperature: contentType === "real" ? 0.75 : 1.0,
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(response.choices[0].message.content!);
  const scriptData = raw.script || raw;
  const metaData = raw.metadata || raw;

  // Palavras por segundo por velocidade de narração (português ElevenLabs)
  const WPS: Record<string, number> = {
    lento: 2.2,
    moderado: 2.7,
    rápido: 3.3,
  };
  const wps = WPS[narrationSpeed] ?? 2.7;

  const scenes = (raw.scenes as any[]).map((s, i) => {
    const narrationText = String(s.description || s.narration_text || "");
    const wordCount = narrationText.trim().split(/\s+/).filter(Boolean).length;
    // Duração calculada do texto narrado — mínimo 3s, máximo 15s por cena
    const duration = Math.min(15, Math.max(3, Math.round(wordCount / wps)));
    return {
      id: "",
      project_id: "",
      scene_number: Number(s.scene_number ?? i + 1),
      description: narrationText,
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
    scenes.forEach((s) => {
      s.duration_seconds = Math.max(3, Math.round(s.duration_seconds * factor));
    });
  }

  return {
    script: {
      id: "",
      project_id: "",
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

export async function regenerateScript(
  topic: string,
  _previousTitle: string,
  niche: string = "curiosidades",
  apiKey?: string | null,
  contentType: ContentType = "real",
): Promise<GenerateScriptResponse> {
  return generateScript(
    topic,
    niche,
    45,
    "dramático e envolvente",
    "moderado",
    undefined,
    undefined,
    "pt",
    apiKey,
    contentType,
  );
}

export interface ThemeSuggestion {
  title: string;
  description: string;
  emoji: string;
  niche: string;
  hook: string;
}

export async function generateThemeSuggestions(
  query: string,
  count = 5,
  apiKey?: string | null,
): Promise<ThemeSuggestion[]> {
  if (!apiKey)
    throw new Error(
      "Configuração ausente: OpenAI API Key não encontrada para este usuário.",
    );
  const client = new OpenAI({ apiKey });
  const seed = Math.floor(Math.random() * 99999);
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
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
      },
    ],
    temperature: 1.0,
    response_format: { type: "json_object" },
  });
  const raw = JSON.parse(response.choices[0].message.content!);
  return (raw.themes as ThemeSuggestion[]).slice(0, count);
}

export async function generateThumbnailPrompt(
  title: string,
  niche: string,
  hook: string,
  apiKey?: string | null,
  // ─── NOVO: herda contentType para aplicar as mesmas regras de fidelidade ──
  contentType: ContentType = "real",
): Promise<string> {
  if (!apiKey)
    throw new Error(
      "Configuração ausente: OpenAI API Key não encontrada para este usuário.",
    );
  const client = new OpenAI({ apiKey });

  // Determina estilo visual pelo nicho
  const visualStyle = NICHE_VISUAL_STYLE[niche] ?? "documentary";

  const fidelityRules =
    contentType === "real"
      ? `FIDELITY RULES (this is real/factual content — strictly follow):
- If the subject is an animal: include scientific name in parentheses, describe real morphology and coloration, add "wildlife documentary style, BBC Earth / National Geographic photography"
- If the subject involves a real place: name it explicitly in the prompt
- If historical figures are involved: describe era, clothing, setting — never request a specific named face
- Visual style must be: photojournalism, documentary photography, archival — NEVER CGI or digital art
- Style hint for this niche (${niche}): ${visualStyle}`
      : `STYLE RULES (fictional/creative content):
- Cinematic and dramatic visuals are encouraged
- CGI and creative compositions are allowed
- Stay specific to the scene — no generic abstract imagery`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: `You are an expert at writing Flux image generation prompts for YouTube Shorts thumbnails.

Create ONE detailed image prompt for a vertical thumbnail (9:16) for this video:
- Title: "${title}"
- Niche: ${niche}
- Hook: "${hook}"
- Content type: ${contentType}

${fidelityRules}

General rules:
- Photorealistic DSLR photo, specify camera and lens appropriate for the niche
- The single most dramatic/shocking visual moment directly related to the REAL subject of this video
- The main subject must fill the frame and be unmistakably identifiable
- No text, no UI elements, no watermarks
- Natural lighting matching the subject's real environment
- Ultra-sharp, hyperdetailed
- End with: "photorealistic, hyperdetailed, no AI artifacts, vertical 9:16 portrait"

Reply with ONLY the image prompt — no explanations, no markdown.`,
      },
    ],
    temperature: contentType === "real" ? 0.7 : 0.85,
    max_tokens: 220,
  });
  return response.choices[0].message.content?.trim() ?? title;
}

export async function generateTopicSuggestions(
  niche: string,
  apiKey?: string | null,
): Promise<string[]> {
  if (!apiKey)
    throw new Error(
      "Configuração ausente: OpenAI API Key não encontrada para este usuário.",
    );
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: `Sugira 6 ideias de temas virais para YouTube Shorts no nicho de "${niche}".
Responda apenas com JSON: { "suggestions": ["tema 1", "tema 2", ...] }`,
      },
    ],
    temperature: 0.9,
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(response.choices[0].message.content!);
  return raw.suggestions as string[];
}

export async function generateViralPhrase(
  query: string,
  apiKey?: string | null,
  category?: string,
) {
  if (!apiKey)
    throw new Error(
      "Configuração ausente: OpenAI API Key não encontrada para este usuário.",
    );
  const client = new OpenAI({ apiKey });

  if (category === "taescrito") {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Você é o criador do @taescrito.ai — conta de Instagram brasileira que viraliza com frases que todo mundo pensa mas ninguém fala. Tom: vizinho de bairro que fala a verdade na cara dura.

IDENTIDADE:
Humor pesado, regional, cultural. Brasileiro médio: paga boleto, toma cerveja, apanha do ex, segura o trampo, apoia o time na derrota. Linguagem de rua, não de livro. Quanto mais específico e cotidiano, melhor.

REFERÊNCIAS CULTURAIS BRASILEIRAS PARA USAR:
- Cotidiano: PIX, iFood, Uber, 99, Nubank, conta de luz, boleto, vaquinha, pagamento mínimo do cartão
- Relacionamento BR: "deixa no visto", "vou indo", "a gente se fala", sumir, "to ocupado", ghosting na versão BR
- Regional: nordestino que veio pra São Paulo, fila do INSS, fila do banco Bradesco, churrasco de domingo, festa junina, carnaval que não vai, São João, vaquejada, funk, sertanejo
- Cultura pop BR: BBB, Faustão, Ratinho, Domingão, novela das 9, Palmeiras, Flamengo, "é nóis", "misericórdia", "aí sim"
- Trabalho BR: CLT, PJ, MEI, 13º que some, férias que nunca chegam, reunião que podia ser e-mail, WhatsApp do chefe fora do horário
- Religião/crenças: "Deus vai prover", vela para santo, promessa, culpa católica, pastores do Instagram
- Família BR: pai que não aparece, mãe que alimenta todo mundo, tio que fala de política no almoço, vó que força comida

TAMANHO DA FRASE — REGRA MAIS IMPORTANTE:
Máximo 2 frases curtas. A força está na brevidade.
Ideal: 1 frase completa de impacto OU 2 frases curtas onde a segunda é a virada.
NUNCA mais de 25 palavras no total.

REGRA DE COERÊNCIA ABSOLUTA:
Cada frase precisa fazer sentido completo por si só. Leia em voz alta — se não ficou claro o humor ou a situação, refaça. A piada precisa se entender sem contexto adicional.

ESTRUTURA (escolha a mais impactante para o tema):
1. PANCADA ÚNICA: Uma frase completa que resume tudo com humor. Ex: "Tá foda, mas estou de pé."
2. SETUP + VIRADA: "[Situação cotidiana completa]. [Conclusão inesperada completa]." — ambas as frases precisam ser completas e coerentes entre si.
3. COMPARAÇÃO COMPLETA: "[X] é igual [Y brasileiro]: [detalhe específico que fecha a comparação]."
4. CONFISSÃO DIRETA: Uma admissão crua que qualquer brasileiro entende de primeira leitura.
5. IRONIA COMPLETA: Observação sobre costume brasileiro com setup e punch claros.

EXEMPLOS DO NÍVEL EXIGIDO — NOTE QUE TODAS FAZEM SENTIDO COMPLETO:
"Tá foda, mas estou de pé."
"Paguei só o mínimo do cartão. Tô me financiando com juros."
"Meu ex sumiu igual internet da Oi: sem aviso e com cobrança no final."
"WhatsApp do chefe às 23h num domingo. Isso deveria ser crime."
"Mandei 'já tô chegando' do sofá. Sou brasileiro."
"Torci pra reunião ser cancelada. Isso é maturidade profissional."
"Todo churrasco tem aquele que não trouxe nada mas foi o primeiro no prato."
"A tia perguntou quando caso. Ainda tô pagando o cartão do último namoro."
"Fiz promessa pro santo e esqueci. No amor faço igual."
"No nordeste não termina relacionamento, dá um tempo. Que dura três anos."

PROIBIDO:
- Qualquer coisa que soe motivacional, filosófica ou de livro de autoajuda
- Palavras como: maturidade, resiliência, jornada, processo, evolução (no sentido motivacional)
- Frases que poderiam estar num calendário de escritório
- Mais de 2 frases ou mais de 20 palavras
- Emojis no campo "frase"
- Linguagem formal ou culta demais
- INVENTAR palavras que não existem no português brasileiro — use apenas palavras reais e corretas
- Gírias que não existem (ex: "gine", "mife", palavras inventadas) — se usar gíria, use apenas gírias reais conhecidas

OBRIGATÓRIO:
- Português brasileiro coloquial, com gíria se couber
- Referência a algo que TODO brasileiro reconhece instantaneamente
- A pessoa precisa rir e mandar pro grupo do WhatsApp na mesma hora

Responda EXCLUSIVAMENTE com JSON puro:
{
  "categoria": "taescrito.ai",
  "frase": "...",
  "caption": "legenda completa do post com quebras de linha, CTA e 3 pontos antes das hashtags",
  "hashtags": ["taescritoai", "frasesbrasileiras", ...mais 6 relevantes ao tema],
  "tema_visual": "descrição curta da cena",
  "prompt": "descrição visual para IA de imagem"
}

REGRAS DO CAPTION:
- Começa com a frase em destaque
- Linha em branco
- 1 pergunta de engajamento curta e direta (ex: "Quantas vezes você viveu isso?")
- Linha em branco
- CTA forte: "Salva e manda pra quem precisa ler." ou "Marca quem vai se identificar." ou "Comenta com 1 palavra."
- Linha com apenas "."
- Linha com apenas "."
- Linha com apenas "."
(as hashtags vão separadas no campo hashtags)

REGRA CRÍTICA: "prompt" é APENAS visual para IA de imagem. Sem texto. Cenas brasileiras urbanas/noturnas, bar, rua molhada, luz de neon, cinematográfico.`,
        },
        {
          role: "user",
          content: `Tema: ${query}. Gere uma frase CURTA (máx 2 linhas, máx 20 palavras) no estilo @taescrito.ai. Simples, direta e impactante como "Tá foda, mas estou de pé." NÃO seja genérico. Seja específico e cortante.`,
        },
      ],
      temperature: 0.95,
      response_format: { type: "json_object" },
    });
    return JSON.parse(response.choices[0].message.content!);
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
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
- 'palavra_chave': Apenas UMA palavra principal para destaque máximo.`,
      },
      { role: "user", content: query },
    ],
    temperature: 1.0,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content!);
}

export async function translateTexts(
  texts: string[],
  targetLang = "Português (Brasil)",
  apiKey?: string | null,
): Promise<string[]> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API Key não configurada");
  const client = new OpenAI({ apiKey: key });

  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Você é um tradutor. Traduza cada linha numerada para ${targetLang}. Retorne SOMENTE as linhas numeradas traduzidas, no mesmo formato, sem explicações.`,
      },
      { role: "user", content: numbered },
    ],
    temperature: 0.3,
  });

  const lines = (response.choices[0].message.content ?? "")
    .split("\n")
    .filter((l) => l.trim());
  return lines.map((l) => l.replace(/^\d+\.\s*/, "").trim());
}

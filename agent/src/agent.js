import Anthropic from '@anthropic-ai/sdk';
import { fetchContext } from './context.js';
import { toolDefinitions, executeTool } from './tools.js';
import 'dotenv/config';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';
const MAX_HISTORY = 40; // 20 trocas (user + assistant cada)
const MAX_TOOL_LOOPS = 5;

// Histórico por usuário Telegram: Map<userId, Message[]>
export const history = new Map();

function serializeList(items) {
  return items.map(p =>
    `• ${p.horario} | ${p.plataforma} | ${p.canal} | ${p.titulo} [${p.status}]${p.id ? ` id:${p.id}` : ''}`
  ).join('\n');
}

function buildSystemPrompt(ctx) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const canais = ctx.canais.map(c => `${c.plataforma}:${c.nome}${c.id ? `(id:${c.id})` : ''}`).join(', ');

  return `Você é assistente de gestão do Moodclip. Responda SEMPRE em português, de forma curta e direta.

AGORA: ${now}
CANAIS: ${canais}

HOJE (${ctx.hoje.length}):
${ctx.hoje.length ? serializeList(ctx.hoje) : 'nenhuma'}

PENDENTES 7 DIAS (${ctx.pendentes.length}):
${ctx.pendentes.length ? serializeList(ctx.pendentes) : 'nenhuma'}

ÚLTIMAS PUBLICADAS (${ctx.recentes.length}):
${ctx.recentes.length ? serializeList(ctx.recentes.slice(0, 5)) : 'nenhuma'}

FORMATO DAS RESPOSTAS:
- Nunca use tabelas markdown
- Para listas de publicações: agrupe por horário, uma linha por horário
  Exemplo: "🕐 *12:00* — Curiosity 51, El Sabiondo, Curiosity 51 BR"
- Máximo 8 linhas para resumos
- Use negrito só em horários e totais
- Emojis: ▶️ YouTube  📸 Instagram  ⏳ pendente  ✅ publicado  ❌ falhou

REGRAS:
- Antes de criar_agendamento_youtube ou atualizar_status, confirme com o usuário
- Nunca invente dados fora do contexto ou resultado das ferramentas
- Para ações irreversíveis, peça confirmação explícita`;
}

export async function processMessage(userId, userText) {
  // Garante histórico do usuário
  if (!history.has(userId)) history.set(userId, []);
  const userHistory = history.get(userId);

  // Adiciona mensagem do usuário ao histórico
  userHistory.push({ role: 'user', content: userText });

  try {
    // Busca contexto atualizado do banco
    const ctx = await fetchContext();
    const systemPrompt = buildSystemPrompt(ctx);

    // Mantém janela de histórico
    const messages = userHistory.slice(-MAX_HISTORY);

    // Loop do agente (suporte a múltiplas chamadas de ferramentas)
    let response = null;
    let loopMessages = [...messages];
    let loops = 0;

    while (loops < MAX_TOOL_LOOPS) {
      loops++;
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        tools: toolDefinitions,
        messages: loopMessages,
      });

      // Se parou por end_turn ou max_tokens — resposta final
      if (response.stop_reason !== 'tool_use') break;

      // Executa todas as ferramentas solicitadas
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        console.log(`[tool] → ${block.name}`, JSON.stringify(block.input));
        const result = await executeTool(block.name, block.input);
        console.log(`[tool] ← ${block.name}`, JSON.stringify(result).slice(0, 200));
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      // Adiciona resposta do assistente + resultados das ferramentas ao loop
      loopMessages = [
        ...loopMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    }

    // Extrai texto da resposta final
    const assistantText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim() || 'Não consegui processar sua solicitação.';

    // Salva no histórico (só texto, sem blocos de ferramentas)
    userHistory.push({ role: 'assistant', content: assistantText });

    // Mantém janela de MAX_HISTORY
    while (userHistory.length > MAX_HISTORY) userHistory.shift();

    return assistantText;

  } catch (err) {
    console.error('[agent]', err.message);
    // Remove a mensagem do usuário que falhou para não corromper o histórico
    userHistory.pop();
    return 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.';
  }
}

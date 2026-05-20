import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import { toolSchemas } from './toolSchemas.js';
import { read_file, write_file, list_files, run_command } from './tools.js';
import { logger } from './logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_ITERATIONS = 15;
const MAX_TOOL_RESULT_CHARS = 8000;

// Haiku: só ferramentas de leitura
const EXPLORE_TOOLS = toolSchemas.filter(t => ['read_file', 'list_files', 'send_progress'].includes(t.name));

// Sonnet: só ferramentas de escrita/execução
const EXECUTE_TOOLS = toolSchemas.filter(t => ['write_file', 'run_command', 'ask_confirmation', 'send_progress'].includes(t.name));

const HAIKU_SYSTEM = `Você analisa uma tarefa e gera um plano de mudança. Você tem NO MÁXIMO 3 leituras de arquivo.

## Sequência obrigatória (exatamente assim)
1. Leia PROJECT_MAP.md (1 leitura)
2. Leia APENAS a seção do arquivo indicada no mapa com start_line/end_line (1 leitura, máx 80 linhas)
3. Se precisar de mais contexto: mais 1 leitura (máx 80 linhas)
4. GERE O PLANO IMEDIATAMENTE — não faça mais nenhuma leitura

## IMPORTANTE
- O Sonnet vai ler o arquivo completo antes de editar — você NÃO precisa ler tudo
- Descreva claramente O QUE mudar e ONDE, com base no que leu
- Responda SOMENTE com JSON (sem markdown, sem texto extra):

{
  "summary": "resumo do que precisa ser feito",
  "files": [
    {
      "path": "caminho/do/arquivo",
      "section": "trecho exato do código atual que deve ser alterado",
      "change": "descrição detalhada + novo código completo para substituir"
    }
  ],
  "build_needed": true,
  "deploy_needed": false
}

## Contexto do projeto
- Projeto: /var/www/clipai-backend (Express + TypeScript)
- Frontend React: src/components/ e src/lib/
- Backend TypeScript: server/
- Build frontend: npm run build:frontend → dist/
- Build backend: npm run build:server → dist-server/
- PM2: moodclip-server (backend), moodclip-agent`;

const SONNET_SYSTEM = `Você executa planos de código. Seja direto: leia → edite → build.

## Sequência exata para cada arquivo do plano
1. read_file no arquivo alvo (conteúdo completo)
2. write_file no mesmo path com o conteúdo modificado (aplique o "change" do plano)
3. Repita para cada arquivo do plano
4. Se build_needed=true: npm run build:frontend (src/) ou npm run build:server (server/)
5. Se build falhar: reporte o erro e pare
6. Se deploy_needed=true: ask_confirmation → pm2 restart moodclip-server

## Regras
- Leia APENAS os arquivos listados no plano
- Escreva o arquivo COMPLETO modificado (não apenas o trecho)
- Aplique SOMENTE a mudança descrita no plano — não adicione imports, libs ou código extra
- Use APENAS libs que já existem nos imports do arquivo lido
- NUNCA crie arquivos auxiliares (_patch, _helper, etc.)

## PROIBIDO antes de escrever
git diff / git status / git log / npm run lint / npx tsc / npm run build / pm2 status

## Deploy frontend
src/ alterado → npm run build:frontend → dist/ atualizado sem restart PM2

## Após concluir
Se criou/alterou componente: atualize PROJECT_MAP.md

## Resposta final: 3 linhas máximo`;

async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('rate_limit');
      if (is429 && attempt < maxRetries) {
        const wait = attempt * 15000;
        logger.warn('system', 'RATE_LIMIT_RETRY', `attempt ${attempt}, waiting ${wait / 1000}s`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

function truncateToolResult(content) {
  if (content.length <= MAX_TOOL_RESULT_CHARS) return content;
  const half = Math.floor(MAX_TOOL_RESULT_CHARS / 2);
  return content.slice(0, half) + '\n...[truncado]...\n' + content.slice(-half);
}

async function runLoop({ model, systemPrompt, tools, messages, userId, onSendMessage, onAskConfirmation, maxIterations }) {
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    logger.info(userId, `LOOP_ITERATION[${model}]`, String(iterations));

    const response = await callWithRetry(() => client.messages.create({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      tools,
      messages,
    }));

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return { done: true, text: textBlock?.text ?? '', messages };
    }

    if (response.stop_reason === 'max_tokens') {
      messages.push({ role: 'user', content: [{ type: 'text', text: 'Continue.' }] });
      continue;
    }

    if (response.stop_reason !== 'tool_use') {
      logger.warn(userId, 'UNEXPECTED_STOP', response.stop_reason);
      break;
    }

    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = [];

    for (const block of toolUseBlocks) {
      const { id, name, input } = block;
      logger.audit(userId, `TOOL_CALL:${name}`, JSON.stringify(input).slice(0, 200));

      let result;
      try {
        if (name === 'read_file') result = await read_file(input);
        else if (name === 'write_file') result = await write_file(input, userId);
        else if (name === 'list_files') result = await list_files(input);
        else if (name === 'run_command') result = await run_command(input, userId);
        else if (name === 'ask_confirmation') {
          const confirmed = await onAskConfirmation(input.question);
          result = { confirmed, answer: confirmed ? 'sim' : 'não' };
          logger.audit(userId, 'CONFIRMATION', `answer=${confirmed}`);
        } else if (name === 'send_progress') {
          await onSendMessage(input.message);
          result = { ok: true };
        } else {
          result = { error: `Ferramenta desconhecida: ${name}` };
        }
      } catch (err) {
        logger.error(userId, `TOOL_ERROR:${name}`, err.message);
        result = { error: err.message };
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: id,
        content: truncateToolResult(JSON.stringify(result)),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { done: false, text: '', messages };
}

export async function runAgent({ userId, userMessage, conversationHistory, onSendMessage, onAskConfirmation }) {
  logger.info(userId, 'AGENT_START', userMessage.slice(0, 120));

  // ── FASE 1: Haiku analisa e planeja ──────────────────────────────────
  await onSendMessage('🔍 Analisando o projeto...');

  const haikusMessages = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let haiku = await runLoop({
    model: 'claude-haiku-4-5-20251001',
    systemPrompt: HAIKU_SYSTEM,
    tools: EXPLORE_TOOLS,
    messages: haikusMessages,
    userId,
    onSendMessage,
    onAskConfirmation,
    maxIterations: 6,
  });

  // Se atingiu o limite sem retornar plano, usa conversa limpa para forçar o JSON
  if (!haiku.done || !haiku.text) {
    logger.warn(userId, 'HAIKU_FORCE_PLAN', 'forcing plan output with clean context');
    haiku = await runLoop({
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: HAIKU_SYSTEM,
      tools: [],
      messages: [
        {
          role: 'user',
          content: `Tarefa: "${userMessage}"\n\nGere o plano JSON para esta tarefa. Use o conhecimento do PROJECT_MAP.md. Responda APENAS com o JSON, sem markdown.`,
        },
      ],
      userId,
      onSendMessage,
      onAskConfirmation,
      maxIterations: 2,
    });
  }

  if (!haiku.text) {
    logger.warn(userId, 'HAIKU_FAILED', 'no plan returned');
    return { reply: '❌ Não consegui analisar o projeto. Tente reformular a tarefa com mais detalhes.', updatedHistory: conversationHistory };
  }

  // Extrai o JSON do plano
  let plan;
  try {
    const jsonMatch = haiku.text.match(/\{[\s\S]*\}/);
    plan = JSON.parse(jsonMatch?.[0] ?? haiku.text);
  } catch {
    logger.warn(userId, 'HAIKU_PLAN_PARSE_ERROR', haiku.text.slice(0, 200));
    return { reply: '❌ Erro ao interpretar o plano de análise. Tente reformular a tarefa.', updatedHistory: conversationHistory };
  }

  const fileCount = plan.files?.length ?? 0;
  logger.info(userId, 'HAIKU_PLAN', `files:${fileCount} build:${plan.build_needed}`);

  if (fileCount === 0) {
    logger.warn(userId, 'EMPTY_PLAN', 'no files to change');
    return {
      reply: plan.summary ?? 'Análise concluída: nenhuma alteração identificada. Reformule a tarefa com mais detalhes sobre o que está faltando.',
      updatedHistory: conversationHistory,
    };
  }

  await onSendMessage(`📋 Plano pronto — ${fileCount} arquivo(s) para alterar`);

  // ── FASE 2: Sonnet executa o plano ───────────────────────────────────
  await onSendMessage('⚙️ Executando alterações...');

  const planText = JSON.stringify(plan, null, 2);
  const sonnetMessages = [
    {
      role: 'user',
      content: `Tarefa original: "${userMessage}"\n\nPlano de execução:\n${planText}\n\nExecute o plano agora.`,
    },
  ];

  const sonnet = await runLoop({
    model: 'claude-sonnet-4-6',
    systemPrompt: SONNET_SYSTEM,
    tools: EXECUTE_TOOLS,
    messages: sonnetMessages,
    userId,
    onSendMessage,
    onAskConfirmation,
    maxIterations: MAX_ITERATIONS,
  });

  const finalReply = sonnet.text || '✅ Alterações concluídas.';
  logger.info(userId, 'AGENT_END', 'done');

  // Salva no histórico apenas a tarefa + resposta final (sem os detalhes de ferramentas)
  const updatedHistory = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: finalReply },
  ].slice(-10);

  return { reply: finalReply, updatedHistory };
}

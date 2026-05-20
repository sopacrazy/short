export const toolSchemas = [
  {
    name: 'read_file',
    description: 'Lê o conteúdo de um arquivo no projeto. Retorna o texto completo com números de linha.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Caminho relativo ao PROJECT_DIR. Ex: server/routes/youtube.ts',
        },
        start_line: {
          type: 'number',
          description: 'Linha inicial (1-based). Opcional.',
        },
        end_line: {
          type: 'number',
          description: 'Linha final (1-based). Opcional.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Escreve ou substitui o conteúdo de um arquivo. Cria backup automático antes de sobrescrever. Use para criar novos arquivos ou editar existentes.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Caminho relativo ao PROJECT_DIR.',
        },
        content: {
          type: 'string',
          description: 'Conteúdo completo do arquivo.',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'Lista arquivos e diretórios dentro do projeto.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Caminho relativo ao PROJECT_DIR. Use "." para raiz.',
        },
        recursive: {
          type: 'boolean',
          description: 'Se true, lista recursivamente. Default: false.',
        },
        pattern: {
          type: 'string',
          description: 'Filtro de extensão/nome. Ex: "*.ts", "*.js"',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Executa um comando whitelistado no servidor. Comandos permitidos: npm install, npm run build, npm run build:frontend, npm run build:server, pm2 restart <name>, pm2 status.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Comando a executar (deve estar na whitelist).',
        },
        cwd: {
          type: 'string',
          description: 'Diretório de trabalho relativo ao PROJECT_DIR. Default: "."',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'ask_confirmation',
    description: 'Envia uma pergunta ao usuário e aguarda resposta sim/não. Use SEMPRE antes de fazer deploy, restart de serviço ou operação destrutiva.',
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Pergunta clara descrevendo a ação que será executada.',
        },
      },
      required: ['question'],
    },
  },
  {
    name: 'send_progress',
    description: 'Envia mensagem de progresso ao usuário sem interromper o loop. Use para informar etapas concluídas.',
    input_schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Mensagem de progresso (curta, 1-2 linhas).',
        },
      },
      required: ['message'],
    },
  },
];

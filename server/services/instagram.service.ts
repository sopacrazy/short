import fetch from 'node-fetch';

export async function uploadReel(videoUrl: string, caption: string) {
  const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN?.replace(/\s/g, '');
  const USER_ID = process.env.INSTAGRAM_USER_ID?.replace(/\s/g, '');
  const VERSION = 'v22.0';

  if (!ACCESS_TOKEN || !USER_ID) {
    throw new Error('Configuração do Instagram ausente (Token ou User ID)');
  }

  console.log(`[Instagram] Iniciando upload de Reel: ${videoUrl}`);
  console.log(`[Instagram] DEBUG: Token Length: ${ACCESS_TOKEN.length}`);
  console.log(`[Instagram] DEBUG: Token Stringified: ${JSON.stringify(ACCESS_TOKEN)}`);

  // Passo 1: Criar o Container de Mídia
  const containerUrl = `https://graph.instagram.com/${VERSION}/${USER_ID}/media`;
  const containerRes = await fetch(containerUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption
    })
  });

  const containerData = (await containerRes.json()) as any;

  if (!containerRes.ok || !containerData.id) {
    console.error('[Instagram] Erro ao criar container:', containerData);
    throw new Error(containerData.error?.message || 'Erro ao criar container no Instagram');
  }

  const containerId = containerData.id;
  console.log(`[Instagram] Container criado: ${containerId}. Aguardando processamento...`);

  // Passo 2: Polling para verificar se o vídeo está pronto (FINISHED)
  let status = 'IN_PROGRESS';
  let attempts = 0;
  const maxAttempts = 30; 

  while (status !== 'FINISHED' && attempts < maxAttempts) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 10000));

    const statusUrl = `https://graph.instagram.com/${VERSION}/${containerId}?fields=status_code,status,error_message`;
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    const statusData = (await statusRes.json()) as any;

    status = statusData.status_code;
    console.log(`[Instagram] Status do container ${containerId}: ${status} (Tentativa ${attempts})`);

    if (status === 'ERROR') {
      console.error('[Instagram] Erro detalhado no processamento:', statusData);
      throw new Error(statusData.error_message || 'O Instagram não conseguiu processar o vídeo. Verifique o formato/duração.');
    }
  }

  if (status !== 'FINISHED') {
    throw new Error('Tempo esgotado aguardando o processamento do Instagram.');
  }

  // Passo 3: Publicar o Container
  console.log(`[Instagram] Publicando container: ${containerId}`);
  const publishUrl = `https://graph.instagram.com/${VERSION}/${USER_ID}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      creation_id: containerId
    })
  });

  const publishData = (await publishRes.json()) as any;

  if (!publishRes.ok || !publishData.id) {
    console.error('[Instagram] Erro ao publicar:', publishData);
    throw new Error(publishData.error?.message || 'Erro ao publicar Reel');
  }

  console.log(`[Instagram] Reel publicado com sucesso! ID: ${publishData.id}`);
  
  return {
    id: publishData.id,
    url: `https://www.instagram.com/reels/${publishData.id}/`
  };
}

export async function getInstagramStatus() {
  const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN?.replace(/\s/g, '');
  const USER_ID = process.env.INSTAGRAM_USER_ID?.replace(/\s/g, '');
  
  return {
    connected: !!ACCESS_TOKEN && !!USER_ID,
    username: 'el_sabiondco'
  };
}

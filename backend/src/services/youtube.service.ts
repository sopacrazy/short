import { google } from 'googleapis';
import { Readable } from 'stream';
import { getSupabase } from './supabase.service.js';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_ROW_ID = 1;

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

export function getAuthUrl(): string {
  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function exchangeCodeAndStore(code: string): Promise<void> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  const { error } = await getSupabase()
    .from('youtube_tokens')
    .upsert({
      id: TOKEN_ROW_ID,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw new Error(`Erro ao salvar tokens: ${error.message}`);
}

export async function isConnected(): Promise<boolean> {
  const { data } = await getSupabase()
    .from('youtube_tokens')
    .select('id')
    .eq('id', TOKEN_ROW_ID)
    .single();
  return !!data;
}

async function getAuthenticatedClient() {
  const { data, error } = await getSupabase()
    .from('youtube_tokens')
    .select('*')
    .eq('id', TOKEN_ROW_ID)
    .single();

  if (error || !data) {
    throw new Error('YouTube não conectado. Faça a autenticação primeiro.');
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date,
  });

  // Renova token se expirar nos próximos 5 minutos
  if (data.expiry_date && Date.now() > Number(data.expiry_date) - 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken();
    await getSupabase()
      .from('youtube_tokens')
      .update({
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', TOKEN_ROW_ID);
    client.setCredentials(credentials);
  }

  return client;
}

export async function uploadToYouTube(
  videoUrl: string,
  title: string,
  description: string,
  hashtags: string[],
  language = 'pt',
  channelTags: string[] = [],
  scheduledAt?: string,
): Promise<string> {
  const auth = await getAuthenticatedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok || !videoRes.body) {
    throw new Error(`Falha ao baixar vídeo do Supabase (${videoRes.status})`);
  }

  const projectTags = hashtags.map(t => t.replace(/^#/, ''));
  const cleanChannelTags = channelTags.map(t => t.replace(/^#/, ''));
  // Tags finais: tags fixas do canal + tags do projeto + Shorts (sem duplicatas)
  const allTags = [...new Set([...cleanChannelTags, ...projectTags, 'Shorts'])];
  const fullDescription = `${description}\n\n${projectTags.map(t => `#${t}`).join(' ')}\n\n#Shorts`;

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: fullDescription,
        tags: allTags,
        categoryId: '24',
        defaultLanguage: language,
        defaultAudioLanguage: language,
      },
      status: {
        privacyStatus: scheduledAt ? 'private' : 'public',
        ...(scheduledAt ? { publishAt: scheduledAt } : {}),
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: Readable.fromWeb(videoRes.body as Parameters<typeof Readable.fromWeb>[0]),
    },
  });

  const videoId = response.data.id;
  if (!videoId) throw new Error('YouTube não retornou o ID do vídeo');
  return `https://youtube.com/shorts/${videoId}`;
}

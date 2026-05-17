import { google } from 'googleapis';
import { Readable } from 'stream';
import { getSupabase } from './supabase.service.js';
const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
];
function createOAuthClient() {
    return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}
export function getAuthUrl(userId) {
    return createOAuthClient().generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        state: userId,
    });
}
export async function exchangeCodeAndStore(code, userId) {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    // Busca info do canal para exibir nome amigável
    let channelName = null;
    let channelId = null;
    try {
        const youtube = google.youtube({ version: 'v3', auth: client });
        const { data } = await youtube.channels.list({ part: ['snippet'], mine: true });
        const ch = data.items?.[0];
        if (ch) {
            channelName = ch.snippet?.title ?? null;
            channelId = ch.id ?? null;
        }
    }
    catch {
        // não bloqueia o fluxo se não conseguir o nome
    }
    const { error } = await getSupabase()
        .from('youtube_accounts')
        .insert({
        user_id: userId,
        channel_name: channelName,
        channel_id: channelId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expiry_date: tokens.expiry_date ?? null,
        updated_at: new Date().toISOString(),
    });
    if (error)
        throw new Error(`Erro ao salvar conta YouTube: ${error.message}`);
}
export async function listAccounts(userId) {
    const { data, error } = await getSupabase()
        .from('youtube_accounts')
        .select('id, user_id, channel_name, channel_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data ?? [];
}
export async function removeAccount(accountId, userId) {
    const { error } = await getSupabase()
        .from('youtube_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', userId);
    if (error)
        throw new Error(error.message);
}
export async function isConnected(userId) {
    const { data } = await getSupabase()
        .from('youtube_accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
    return !!data;
}
async function getAuthenticatedClient(accountId) {
    const { data, error } = await getSupabase()
        .from('youtube_accounts')
        .select('*')
        .eq('id', accountId)
        .single();
    if (error || !data) {
        throw new Error('Conta YouTube não encontrada. Configure a conta da pasta primeiro.');
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
            .from('youtube_accounts')
            .update({
            access_token: credentials.access_token,
            expiry_date: credentials.expiry_date ?? null,
            updated_at: new Date().toISOString(),
        })
            .eq('id', accountId);
        client.setCredentials(credentials);
    }
    return client;
}
export async function uploadToYouTube(videoUrl, title, description, hashtags, language = 'pt', channelTags = [], scheduledAt, accountId, userId) {
    if (!accountId && !userId)
        throw new Error('accountId ou userId é necessário para upload');
    let auth;
    if (accountId) {
        auth = await getAuthenticatedClient(accountId);
    }
    else {
        // fallback: usa qualquer conta do usuário (compatibilidade)
        const { data } = await getSupabase()
            .from('youtube_accounts')
            .select('id')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();
        if (!data)
            throw new Error('Nenhuma conta YouTube conectada.');
        auth = await getAuthenticatedClient(data.id);
    }
    const youtube = google.youtube({ version: 'v3', auth });
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok || !videoRes.body) {
        throw new Error(`Falha ao baixar vídeo do Supabase (${videoRes.status})`);
    }
    const projectTags = hashtags.map(t => t.replace(/^#/, ''));
    const cleanChannelTags = channelTags.map(t => t.replace(/^#/, ''));
    const allTags = [...new Set([...cleanChannelTags, ...projectTags, 'Shorts'])];
    const fullDescription = `${description}\n\n${projectTags.map(t => `#${t}`).join(' ')}\n\n#Shorts`;
    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
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
            body: Readable.from(buffer),
        },
    });
    const videoId = response.data.id;
    if (!videoId)
        throw new Error('YouTube não retornou o ID do vídeo');
    return `https://youtube.com/shorts/${videoId}`;
}

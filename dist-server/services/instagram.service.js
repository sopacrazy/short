import fetch from 'node-fetch';
import { getSupabase } from './supabase.service.js';
const IG_VERSION = 'v22.0';
// ─── OAuth (Instagram Business Login) ───────────────────────────────────────
export function getAuthUrl(userId) {
    const appId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    if (!appId || !redirectUri)
        throw new Error('INSTAGRAM_APP_ID ou INSTAGRAM_REDIRECT_URI não configurados');
    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_messages',
        response_type: 'code',
        state: userId,
        force_reauth: 'true',
        enable_fb_login: '0',
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
}
export async function exchangeCodeAndStore(code, userId) {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    if (!appId || !appSecret || !redirectUri)
        throw new Error('Variáveis INSTAGRAM_* não configuradas');
    // 1. Troca código por token de curta duração
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code,
        }),
    });
    const shortData = (await shortRes.json());
    if (!shortData.access_token)
        throw new Error(shortData.error_message || shortData.error?.message || 'Falha ao obter token do Instagram');
    const shortToken = shortData.access_token;
    // 2. Troca por token de longa duração (60 dias)
    const longRes = await fetch(`https://graph.instagram.com/access_token?` +
        new URLSearchParams({
            grant_type: 'ig_exchange_token',
            client_secret: appSecret,
            access_token: shortToken,
        }));
    const longData = (await longRes.json());
    if (!longData.access_token)
        throw new Error(longData.error?.message || 'Falha ao obter token de longa duração');
    const longToken = longData.access_token;
    const expiresIn = longData.expires_in ?? 60 * 24 * 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    // 3. Busca username e ID real via /me
    const profileRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/me?fields=id,username,account_type&access_token=${longToken}`);
    const profileData = (await profileRes.json());
    const instagramUsername = profileData.username ?? '';
    const instagramUserId = profileData.id ?? String(shortData.user_id);
    // 4. Verifica se já existe conta com este instagram_user_id para este usuário
    const { data: existing } = await getSupabase()
        .from('instagram_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('instagram_user_id', instagramUserId)
        .single();
    if (existing) {
        // Atualiza token da conta existente
        const { error } = await getSupabase()
            .from('instagram_accounts')
            .update({
            access_token: longToken,
            username: instagramUsername,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
        })
            .eq('id', existing.id);
        if (error)
            throw new Error(`Erro ao atualizar token: ${error.message}`);
    }
    else {
        // Insere nova conta
        const { error } = await getSupabase()
            .from('instagram_accounts')
            .insert({
            user_id: userId,
            access_token: longToken,
            instagram_user_id: instagramUserId,
            username: instagramUsername,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
        });
        if (error)
            throw new Error(`Erro ao salvar conta: ${error.message}`);
    }
}
export async function getInstagramAccounts(userId) {
    const { data, error } = await getSupabase()
        .from('instagram_accounts')
        .select('id, username, instagram_user_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data ?? [];
}
export async function getInstagramStatus(userId) {
    const { data } = await getSupabase()
        .from('instagram_accounts')
        .select('username')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1);
    if (!data || data.length === 0)
        return { connected: false };
    return { connected: true, username: data[0].username ?? undefined };
}
export async function disconnectAccount(accountId, userId) {
    await getSupabase()
        .from('instagram_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', userId);
}
export async function scheduleReel(userId, videoUrl, caption, scheduledAt, accountId) {
    const { error } = await getSupabase()
        .from('scheduled_reels')
        .insert({
        user_id: userId,
        video_url: videoUrl,
        caption,
        scheduled_at: scheduledAt,
        status: 'pending',
        instagram_account_id: accountId ?? null,
    });
    if (error)
        throw new Error(`Erro ao agendar Reel: ${error.message}`);
}
// ─── Helper interno ───────────────────────────────────────────────────────────
async function getTokenForAccount(accountId, userId) {
    const { data, error } = await getSupabase()
        .from('instagram_accounts')
        .select('access_token, instagram_user_id, expires_at')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();
    if (error || !data)
        throw new Error('Conta Instagram não encontrada.');
    if (data.expires_at) {
        const daysLeft = (new Date(data.expires_at).getTime() - Date.now()) / (1000 * 3600 * 24);
        if (daysLeft < 7)
            console.warn(`[Instagram] Token expira em ${daysLeft.toFixed(0)} dias.`);
    }
    return { token: data.access_token, igUserId: data.instagram_user_id };
}
async function getFirstTokenForUser(userId) {
    const { data, error } = await getSupabase()
        .from('instagram_accounts')
        .select('access_token, instagram_user_id, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
    if (error || !data)
        throw new Error('Instagram não conectado. Faça a autenticação primeiro.');
    return { token: data.access_token, igUserId: data.instagram_user_id };
}
// ─── Publicação ──────────────────────────────────────────────────────────────
export async function uploadReel(videoUrl, caption, userId, accountId) {
    const { token, igUserId } = accountId
        ? await getTokenForAccount(accountId, userId)
        : await getFirstTokenForUser(userId);
    console.log(`[Instagram] Iniciando upload de Reel. igUserId=${igUserId} videoUrl=${videoUrl}`);
    const meRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/me?fields=id,username,account_type&access_token=${token}`);
    const meData = (await meRes.json());
    console.log(`[Instagram] Token info:`, JSON.stringify(meData));
    const containerRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption }),
    });
    const containerData = (await containerRes.json());
    console.log(`[Instagram] Container response (${containerRes.status}):`, JSON.stringify(containerData));
    if (!containerRes.ok || !containerData.id)
        throw new Error(containerData.error?.message || 'Erro ao criar container no Instagram');
    const containerId = containerData.id;
    console.log(`[Instagram] Container criado: ${containerId}. Aguardando...`);
    let status = 'IN_PROGRESS';
    let attempts = 0;
    while (status !== 'FINISHED' && attempts < 30) {
        attempts++;
        await new Promise(r => setTimeout(r, 10000));
        const statusRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/${containerId}?fields=status_code,status,error_message`, { headers: { 'Authorization': `Bearer ${token}` } });
        const statusData = (await statusRes.json());
        status = statusData.status_code;
        console.log(`[Instagram] Status: ${status} (tentativa ${attempts})`);
        if (status === 'ERROR')
            throw new Error(statusData.error_message || 'Erro ao processar vídeo no Instagram');
    }
    if (status !== 'FINISHED')
        throw new Error('Tempo esgotado aguardando processamento do Instagram');
    const publishRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ creation_id: containerId }),
    });
    const publishData = (await publishRes.json());
    if (!publishRes.ok || !publishData.id)
        throw new Error(publishData.error?.message || 'Erro ao publicar Reel');
    console.log(`[Instagram] Reel publicado! ID: ${publishData.id}`);
    return { id: publishData.id, url: `https://www.instagram.com/reels/${publishData.id}/` };
}
export async function uploadPhoto(imageUrl, caption, userId, accountId) {
    const { token, igUserId } = accountId
        ? await getTokenForAccount(accountId, userId)
        : await getFirstTokenForUser(userId);
    console.log(`[Instagram] Postando imagem: ${imageUrl}`);
    const containerRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ image_url: imageUrl, caption }),
    });
    const containerData = (await containerRes.json());
    if (!containerRes.ok || !containerData.id)
        throw new Error(containerData.error?.message || 'Erro ao criar container');
    const containerId = containerData.id;
    let status = 'IN_PROGRESS';
    let attempts = 0;
    while (status !== 'FINISHED' && attempts < 15) {
        attempts++;
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/${containerId}?fields=status_code,status,error_message`, { headers: { 'Authorization': `Bearer ${token}` } });
        const statusData = (await statusRes.json());
        status = statusData.status_code;
        if (status === 'ERROR')
            throw new Error(statusData.error_message || 'Erro ao processar imagem no Instagram');
    }
    if (status !== 'FINISHED')
        throw new Error('Tempo esgotado aguardando processamento da imagem');
    const publishRes = await fetch(`https://graph.instagram.com/${IG_VERSION}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ creation_id: containerId }),
    });
    const publishData = (await publishRes.json());
    if (!publishRes.ok || !publishData.id)
        throw new Error(publishData.error?.message || 'Erro ao publicar imagem');
    console.log(`[Instagram] Imagem publicada! ID: ${publishData.id}`);
    return { id: publishData.id, url: `https://www.instagram.com/p/${publishData.id}/` };
}

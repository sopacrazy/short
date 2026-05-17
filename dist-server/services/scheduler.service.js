import { getScheduledPostsDue, updateCuriosityPost, getComposedImagePublicUrl } from './curiosity_posts.service.js';
import { uploadPhoto, uploadReel } from './instagram.service.js';
import { getSupabase } from './supabase.service.js';
let schedulerTimer = null;
export function startScheduler() {
    if (schedulerTimer)
        return;
    schedulerTimer = setInterval(runScheduledPublications, 60_000);
    console.log('[Scheduler] Iniciado — verificando agendamentos a cada 60s');
}
export function stopScheduler() {
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }
}
async function runScheduledPublications() {
    try {
        const [posts, viralPosts, reels] = await Promise.all([
            getScheduledPostsDue(),
            getViralScheduledPostsDue(),
            getScheduledReelsDue(),
        ]);
        for (const post of posts)
            await publishScheduledPost(post);
        for (const post of viralPosts)
            await publishViralScheduledPost(post);
        for (const reel of reels)
            await publishScheduledReel(reel);
    }
    catch (err) {
        console.error('[Scheduler] Erro ao verificar fila:', err);
    }
}
async function getViralScheduledPostsDue() {
    const { data } = await getSupabase()
        .from('viral_scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString());
    return data ?? [];
}
async function publishViralScheduledPost(post) {
    try {
        const result = await uploadPhoto(post.image_url, post.caption ?? '', post.user_id);
        await getSupabase()
            .from('viral_scheduled_posts')
            .update({ status: 'published', instagram_post_url: result.url, published_at: new Date().toISOString() })
            .eq('id', post.id);
        console.log(`[Scheduler] Viral post ${post.id} publicado: ${result.url}`);
    }
    catch (err) {
        await getSupabase()
            .from('viral_scheduled_posts')
            .update({ status: 'failed', error_message: err.message })
            .eq('id', post.id);
        console.error(`[Scheduler] Falha no viral post ${post.id}:`, err.message);
    }
}
async function getScheduledReelsDue() {
    const { data } = await getSupabase()
        .from('scheduled_reels')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString());
    return data ?? [];
}
async function publishScheduledReel(reel) {
    try {
        const result = await uploadReel(reel.video_url, reel.caption ?? '', reel.user_id);
        await getSupabase()
            .from('scheduled_reels')
            .update({ status: 'published', instagram_url: result.url, published_at: new Date().toISOString() })
            .eq('id', reel.id);
        console.log(`[Scheduler] Reel agendado ${reel.id} publicado: ${result.url}`);
    }
    catch (err) {
        await getSupabase()
            .from('scheduled_reels')
            .update({ status: 'failed', error_message: err.message })
            .eq('id', reel.id);
        console.error(`[Scheduler] Falha no reel agendado ${reel.id}:`, err.message);
    }
}
async function publishScheduledPost(post) {
    try {
        if (!post.composed_image_path)
            throw new Error('Post sem imagem composta salva');
        const imageUrl = await getComposedImagePublicUrl(post.composed_image_path);
        const hashtagStr = post.hashtags.map(h => `#${h}`).join(' ');
        const caption = [post.caption, post.cta, hashtagStr].filter(Boolean).join('\n\n');
        const result = await uploadPhoto(imageUrl, caption, post.user_id);
        await updateCuriosityPost(post.id, post.user_id, {
            status: 'published',
            published_at: new Date().toISOString(),
            instagram_post_id: result.id,
            instagram_post_url: result.url,
        });
        console.log(`[Scheduler] Post ${post.id} publicado: ${result.url}`);
    }
    catch (err) {
        console.error(`[Scheduler] Falha ao publicar post ${post.id}:`, err.message);
        await updateCuriosityPost(post.id, post.user_id, {
            status: 'failed',
            error_message: err.message,
        });
    }
}

import { getScheduledPostsDue, updateCuriosityPost, getComposedImagePublicUrl } from './curiosity_posts.service.js';
import { uploadPhoto } from './instagram.service.js';
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
        const posts = await getScheduledPostsDue();
        if (posts.length === 0)
            return;
        console.log(`[Scheduler] ${posts.length} post(s) para publicar`);
        for (const post of posts) {
            await publishScheduledPost(post);
        }
    }
    catch (err) {
        console.error('[Scheduler] Erro ao verificar fila:', err);
    }
}
async function publishScheduledPost(post) {
    try {
        if (!post.composed_image_path)
            throw new Error('Post sem imagem composta salva');
        const imageUrl = await getComposedImagePublicUrl(post.composed_image_path);
        const hashtagStr = post.hashtags.map(h => `#${h}`).join(' ');
        const caption = [post.caption, post.cta, hashtagStr].filter(Boolean).join('\n\n');
        const result = await uploadPhoto(imageUrl, caption);
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

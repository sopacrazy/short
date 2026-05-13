import { supabase } from './supabase.service.js';
export async function createCuriosityPost(userId, data) {
    const { data: post, error } = await supabase
        .from('curiosity_posts')
        .insert({ ...data, user_id: userId, status: data.status ?? 'draft' })
        .select()
        .single();
    if (error)
        throw new Error(error.message);
    return post;
}
export async function updateCuriosityPost(id, userId, data) {
    const { data: post, error } = await supabase
        .from('curiosity_posts')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error)
        throw new Error(error.message);
    return post;
}
export async function listCuriosityPosts(userId, status) {
    let query = supabase
        .from('curiosity_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (status)
        query = query.eq('status', status);
    const { data, error } = await query;
    if (error)
        throw new Error(error.message);
    return data ?? [];
}
export async function deleteCuriosityPost(id, userId) {
    const { error } = await supabase
        .from('curiosity_posts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error)
        throw new Error(error.message);
}
// Busca posts agendados cujo horário já chegou
export async function getScheduledPostsDue() {
    const { data, error } = await supabase
        .from('curiosity_posts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());
    if (error)
        throw new Error(error.message);
    return data ?? [];
}
export async function getComposedImagePublicUrl(path) {
    const { data } = supabase.storage.from('videos').getPublicUrl(path);
    if (!data?.publicUrl)
        throw new Error('Não foi possível gerar URL da imagem agendada');
    return data.publicUrl;
}
